import { CanActivate, ExecutionContext, Injectable, Type, mixin } from '@nestjs/common';

export function RolesGuard(...allowedRoles: string[]): Type<CanActivate> {
  @Injectable()
  class RolesGuardMixin implements CanActivate {
    canActivate(context: ExecutionContext) {
      if (!allowedRoles.length) {
        return true;
      }
      const request = context.switchToHttp().getRequest();
      const roles: string[] = Array.isArray(request?.user?.roles) ? request.user.roles : [];
      return roles.some((role) => allowedRoles.includes(role));
    }
  }

  return mixin(RolesGuardMixin);
}
