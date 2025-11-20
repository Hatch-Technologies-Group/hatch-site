import { Injectable } from '@nestjs/common';
import { OrgEventType } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrgEventsService {
  constructor(private readonly prisma: PrismaService) {}

  async logOrgEvent(params: {
    organizationId: string;
    tenantId?: string | null;
    actorId?: string | null;
    type: OrgEventType;
    message?: string;
    payload?: Record<string, unknown>;
  }) {
    const { organizationId, tenantId, actorId, type, message, payload } = params;
    return this.prisma.orgEvent.create({
      data: {
        organizationId,
        tenantId: tenantId ?? null,
        actorId: actorId ?? null,
        type,
        message,
        payload: (payload as any) ?? undefined
      }
    });
  }

  async listOrgEventsForBroker(orgId: string, limit = 50) {
    return this.prisma.orgEvent.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }
}

