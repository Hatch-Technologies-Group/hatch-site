import { CanActivate, ExecutionContext, Injectable, Type, mixin } from '@nestjs/common';

export function RolesGuard(...allowedRoles: string[]): Type<CanActivate> {
  const normalizedAllowed = allowedRoles.map((role) => role.toLowerCase());
  @Injectable()
  class RolesGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext) {
      if (!normalizedAllowed.length) {
        return true;
      }
      const request = context.switchToHttp().getRequest();
      const roles: string[] = Array.isArray(request?.user?.roles) ? request.user.roles : [];
      return roles.some((role) => normalizedAllowed.includes((role ?? '').toString().toLowerCase()));
    }
  }

  return mixin(RolesGuardMixin);
}
