import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { UserRole } from '@hatch/db';

import { resolveRequestContext } from './request-context';

@Injectable()
export class OrgAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    const ctx = resolveRequestContext(request);

    if (ctx.role === UserRole.BROKER) {
      return true;
    }

    throw new ForbiddenException('Org admin access required');
  }
}
