import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest<TUser = any>(err: unknown, user: TUser, _info: unknown, context: ExecutionContext): TUser {
    if (user) {
      return user;
    }

    const request = context.switchToHttp().getRequest();
    const isDevBypassEnabled =
      process.env.NODE_ENV !== 'production' &&
      (process.env.DISABLE_PERMISSIONS_GUARD ?? 'true').toLowerCase() === 'true';

    if (isDevBypassEnabled) {
      // In dev, fall back to a synthetic user so local frontends without JWTs don't get 403s.
      const fallbackUserId = process.env.DEFAULT_USER_ID ?? 'user-agent';
      const fallbackOrgId =
        request?.headers?.['x-org-id'] ??
        process.env.DEFAULT_ORG_ID ??
        process.env.DEFAULT_TENANT_ID ??
        'org-hatch';
      const fallbackTenantId =
        request?.headers?.['x-tenant-id'] ?? process.env.DEFAULT_TENANT_ID ?? fallbackOrgId;

      const headerRole = request?.headers?.['x-user-role'];
      const roles = Array.isArray(headerRole)
        ? headerRole.filter(Boolean).map((role) => role.toString().toLowerCase())
        : [headerRole ?? 'broker'].map((role) => role.toString().toLowerCase());

      return {
        sub: fallbackUserId,
        userId: fallbackUserId,
        orgId: fallbackOrgId,
        tenantId: fallbackTenantId,
        roles
      } as unknown as TUser;
    }

    throw (err as Error) || new UnauthorizedException();
  }
}
