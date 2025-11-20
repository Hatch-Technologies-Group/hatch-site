import { Controller, Get, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { UserRole } from '@hatch/db';

import { resolveRequestContext } from '../common/request-context';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class SessionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  async getSession(@Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);

    const orgId = ctx.orgId ?? ctx.tenantId;
    const [user, tenant] = await Promise.all([
      this.prisma.user.findFirst({
        where: { id: ctx.userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true
        }
      }),
      this.prisma.tenant.findUnique({
        where: { id: ctx.tenantId },
        select: {
          id: true,
          name: true,
          slug: true
        }
      })
    ]);

    const email = user?.email ?? 'broker@hatchcrm.test';
    const firstName = user?.firstName ?? 'Dev';
    const lastName = user?.lastName ?? 'User';

    const membershipRole =
      ctx.role === UserRole.BROKER || ctx.role === UserRole.TEAM_LEAD ? 'BROKER_OWNER' : 'AGENT';

    return {
      user: {
        id: user?.id ?? ctx.userId,
        email,
        globalRole: 'USER'
      },
      profile: {
        first_name: firstName,
        last_name: lastName,
        email,
        fallback: !user
      },
      memberships: [
        {
          id: `${ctx.tenantId}-membership`,
          org_id: orgId,
          role: membershipRole,
          status: 'active',
          can_manage_billing: membershipRole === 'BROKER_OWNER',
          metadata: null,
          org: tenant
            ? {
                id: orgId,
                name: tenant.name,
                type: 'BROKERAGE',
                status: 'active',
                billing_email: email,
                stripe_customer_id: null,
                grace_period_ends_at: null,
                metadata: { slug: tenant.slug }
              }
            : {
                id: orgId,
                name: 'Hatch Brokerage',
                type: 'BROKERAGE',
                status: 'active',
                billing_email: email,
                stripe_customer_id: null,
                grace_period_ends_at: null,
                metadata: null
              }
        }
      ],
      activeOrgId: orgId,
      policies: []
    };
  }
}
