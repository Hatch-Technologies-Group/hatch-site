import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

type JwtPayload = {
  sub?: string;
  userId?: string;
  tenantId?: string;
  tid?: string;
  tenant_id?: string;
  [key: string]: unknown;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret'
    });
  }

  async validate(payload: JwtPayload) {
    const tenantId = payload.tenantId ?? payload.tid ?? payload.tenant_id;
    const userId = payload.sub ?? payload.userId ?? payload['id'];

    return {
      ...payload,
      tenantId,
      userId
    };
  }
}
