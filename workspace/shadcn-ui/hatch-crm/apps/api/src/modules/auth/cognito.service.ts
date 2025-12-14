import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicKey, type KeyObject } from 'crypto';
import * as jwt from 'jsonwebtoken';

interface CognitoConfig {
  domain: string;
  clientId: string;
  clientSecret?: string;
  callbackUrl: string;
  userPoolId?: string;
  scopes: string;
  jwksCacheTtlMs: number;
}

type CognitoState = {
  inviteToken?: string;
  redirectTo?: string;
};

type CognitoJwk = {
  kid: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
  [key: string]: unknown;
};

type CognitoJwks = {
  keys: CognitoJwk[];
};

type CognitoTokenResponse = {
  access_token?: string;
  id_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

@Injectable()
export class CognitoService {
  private readonly logger = new Logger(CognitoService.name);
  private readonly config: CognitoConfig;

  private jwksCache: {
    expiresAt: number;
    keysByKid: Map<string, CognitoJwk>;
  } | null = null;

  private jwksFetchPromise: Promise<Map<string, CognitoJwk>> | null = null;

  constructor(private readonly configService: ConfigService) {
    const domain = this.normalizeCognitoDomain(this.configService.get<string>('COGNITO_DOMAIN') ?? '');
    const clientId = this.configService.get<string>('COGNITO_CLIENT_ID') ?? '';
    const clientSecret = this.configService.get<string>('COGNITO_CLIENT_SECRET') ?? undefined;
    const userPoolId = this.configService.get<string>('COGNITO_USER_POOL_ID') ?? undefined;

    const callbackUrl =
      this.configService.get<string>('COGNITO_CALLBACK_URL') ??
      this.deriveCallbackUrl(this.configService.get<string>('COGNITO_REDIRECT_URI') ?? '');

    const scopes = this.configService.get<string>('COGNITO_SCOPES') ?? 'openid email';
    const jwksCacheTtlMs = Number(this.configService.get<string>('COGNITO_JWKS_CACHE_TTL_MS') ?? 60 * 60 * 1000);

    this.config = {
      domain,
      clientId,
      clientSecret,
      callbackUrl,
      userPoolId,
      scopes,
      jwksCacheTtlMs: Number.isFinite(jwksCacheTtlMs) && jwksCacheTtlMs > 0 ? jwksCacheTtlMs : 60 * 60 * 1000
    };

    if (!this.config.domain || !this.config.clientId || !this.config.callbackUrl) {
      this.logger.warn('Cognito not fully configured. Agent invites will not work properly.');
    }
  }

  /**
   * Generate Cognito signup URL with invite token embedded as state parameter
   * The state parameter will be returned to us after successful signup
   */
  generateSignupUrl(inviteToken: string, email?: string, redirectTo?: string): string {
    const state = this.encodeState({ inviteToken, redirectTo });
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: this.config.scopes,
      redirect_uri: this.config.callbackUrl,
      state
    });

    // Pre-fill email if provided
    if (email) {
      params.append('login_hint', email);
    }

    return `${this.config.domain}/signup?${params.toString()}`;
  }

  /**
   * Generate Cognito login URL for existing users
   */
  generateLoginUrl(redirectTo?: string): string {
    const state = this.encodeState({ redirectTo });
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      scope: this.config.scopes,
      redirect_uri: this.config.callbackUrl,
      state
    });

    return `${this.config.domain}/login?${params.toString()}`;
  }

  /**
   * Decode state parameter from Cognito callback
   * Returns the invite token that was embedded during signup
   */
  decodeState(state: string): CognitoState {
    return this.decodeStateInternal(state);
  }

  async exchangeCodeForTokens(code: string): Promise<{
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
    tokenType?: string;
  } | null> {
    if (!this.isConfigured()) {
      this.logger.warn('Cognito token exchange requested but Cognito is not configured');
      return null;
    }

    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      code,
      redirect_uri: this.config.callbackUrl
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded'
    };

    if (this.config.clientSecret) {
      const basic = Buffer.from(`${this.config.clientId}:${this.config.clientSecret}`).toString('base64');
      headers.Authorization = `Basic ${basic}`;
    }

    try {
      const response = await fetch(`${this.config.domain}/oauth2/token`, {
        method: 'POST',
        headers,
        body
      });

      const payloadText = await response.text();
      if (!response.ok) {
        const errorFields = this.safeParseJson(payloadText);
        const errorDescription =
          errorFields && typeof errorFields === 'object'
            ? {
                error: (errorFields as any).error,
                error_description: (errorFields as any).error_description
              }
            : null;
        this.logger.error(`Cognito token exchange failed (${response.status})`, errorDescription ?? payloadText);
        return null;
      }

      const tokenResponse = this.safeParseJson(payloadText) as CognitoTokenResponse | null;
      if (!tokenResponse) {
        this.logger.error('Cognito token exchange returned invalid JSON');
        return null;
      }

      return {
        idToken: tokenResponse.id_token,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        expiresIn: tokenResponse.expires_in,
        tokenType: tokenResponse.token_type
      };
    } catch (error) {
      this.logger.error('Cognito token exchange failed', error);
      return null;
    }
  }

  /**
   * Verify Cognito JWT token
   * Returns user info from the token
   *
   * This method verifies the token signature using the User Pool JWKS and validates issuer/audience.
   * If `COGNITO_USER_POOL_ID` is missing, it falls back to an unsafe decode (development only).
   */
  async verifyToken(idToken: string): Promise<{ sub: string; email: string } | null> {
    if (!idToken) {
      return null;
    }

    if (!this.config.userPoolId) {
      this.logger.warn('COGNITO_USER_POOL_ID missing; cannot verify Cognito JWT signature');
      return this.decodeTokenPayloadUnsafe(idToken);
    }

    try {
      const decodedHeader = jwt.decode(idToken, { complete: true }) as jwt.Jwt | null;
      const kid = decodedHeader?.header?.kid;
      if (!kid) {
        this.logger.warn('Cognito token missing kid header');
        return null;
      }

      const publicKey = await this.getSigningKey(kid);

      const verified = jwt.verify(idToken, publicKey, {
        algorithms: ['RS256'],
        issuer: this.getIssuer(),
        audience: this.config.clientId
      }) as jwt.JwtPayload;

      const tokenUse = typeof verified?.token_use === 'string' ? verified.token_use : null;
      if (tokenUse && tokenUse !== 'id') {
        this.logger.warn(`Cognito token_use mismatch: expected id, got ${tokenUse}`);
        return null;
      }

      const sub = typeof verified?.sub === 'string' ? verified.sub : null;
      const email =
        typeof verified?.email === 'string'
          ? verified.email
          : typeof verified?.['cognito:username'] === 'string'
            ? (verified['cognito:username'] as string)
            : null;

      if (!sub || !email) {
        this.logger.warn('Cognito token missing required claims');
        return null;
      }

      return { sub, email };
    } catch (error) {
      this.logger.error('Failed to verify Cognito token', error);
      return null;
    }
  }

  isConfigured(): boolean {
    return !!(this.config.domain && this.config.clientId && this.config.callbackUrl);
  }

  private normalizeCognitoDomain(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

    try {
      const url = new URL(withProtocol);
      return url.origin.replace(/\/+$/, '');
    } catch {
      return trimmed.replace(/\/+$/, '');
    }
  }

  private deriveCallbackUrl(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    try {
      const url = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
      const path = url.pathname.replace(/\/+$/, '');

      if (path.endsWith('/api/v1/auth/cognito/callback')) {
        return url.toString();
      }

      if (path.endsWith('/api/v1')) {
        url.pathname = `${path}/auth/cognito/callback`;
        return url.toString();
      }

      if (path.includes('/api/v1/')) {
        // Some deployments might pass a full API base URL; preserve up to `/api/v1`.
        const apiIndex = path.indexOf('/api/v1');
        url.pathname = `${path.slice(0, apiIndex + '/api/v1'.length)}/auth/cognito/callback`;
        return url.toString();
      }

      url.pathname = `${path || ''}/api/v1/auth/cognito/callback`.replace(/\/{2,}/g, '/');
      return url.toString();
    } catch {
      return trimmed;
    }
  }

  private encodeState(state: CognitoState): string {
    const payload: CognitoState = {};
    if (state.inviteToken) payload.inviteToken = state.inviteToken;
    if (state.redirectTo) payload.redirectTo = state.redirectTo;

    try {
      return Buffer.from(JSON.stringify(payload)).toString('base64url');
    } catch (error) {
      this.logger.error('Failed to encode Cognito state', error);
      return '';
    }
  }

  private decodeStateInternal(state: string): CognitoState {
    const decode = (encoding: BufferEncoding) => Buffer.from(state, encoding).toString('utf-8');

    const decoded =
      (() => {
        try {
          return decode('base64url');
        } catch {
          try {
            return decode('base64');
          } catch {
            return null;
          }
        }
      })() ?? null;

    if (!decoded) {
      return {};
    }

    const parsed = this.safeParseJson(decoded);
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }

    const inviteToken = typeof (parsed as any).inviteToken === 'string' ? (parsed as any).inviteToken : undefined;
    const redirectTo = typeof (parsed as any).redirectTo === 'string' ? (parsed as any).redirectTo : undefined;

    return { inviteToken, redirectTo };
  }

  private safeParseJson(value: string): unknown | null {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  private decodeTokenPayloadUnsafe(idToken: string): { sub: string; email: string } | null {
    try {
      const payload = jwt.decode(idToken) as jwt.JwtPayload | null;
      if (!payload) {
        return null;
      }

      const sub = typeof payload.sub === 'string' ? payload.sub : null;
      const email =
        typeof payload.email === 'string'
          ? payload.email
          : typeof payload['cognito:username'] === 'string'
            ? (payload['cognito:username'] as string)
            : null;

      if (!sub || !email) {
        return null;
      }

      return { sub, email };
    } catch (error) {
      this.logger.error('Failed to decode Cognito token', error);
      return null;
    }
  }

  private getIssuer(): string {
    if (!this.config.userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID not configured');
    }

    const region = this.config.userPoolId.split('_')[0];
    return `https://cognito-idp.${region}.amazonaws.com/${this.config.userPoolId}`;
  }

  private async getJwks(): Promise<Map<string, CognitoJwk>> {
    const now = Date.now();
    if (this.jwksCache && now < this.jwksCache.expiresAt) {
      return this.jwksCache.keysByKid;
    }

    if (this.jwksFetchPromise) {
      return this.jwksFetchPromise;
    }

    this.jwksFetchPromise = (async () => {
      const jwksUrl = `${this.getIssuer()}/.well-known/jwks.json`;
      const response = await fetch(jwksUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch Cognito JWKS (${response.status})`);
      }

      const payload = (await response.json()) as CognitoJwks;
      const keysByKid = new Map<string, CognitoJwk>();
      for (const key of payload.keys ?? []) {
        if (key?.kid) {
          keysByKid.set(key.kid, key);
        }
      }

      this.jwksCache = {
        expiresAt: Date.now() + this.config.jwksCacheTtlMs,
        keysByKid
      };
      return keysByKid;
    })();

    try {
      return await this.jwksFetchPromise;
    } finally {
      this.jwksFetchPromise = null;
    }
  }

  private async getSigningKey(kid: string): Promise<KeyObject> {
    const jwks = await this.getJwks();
    const jwk = jwks.get(kid);
    if (!jwk) {
      throw new Error('Unknown Cognito signing key');
    }
    return createPublicKey({ key: jwk as any, format: 'jwk' });
  }
}
