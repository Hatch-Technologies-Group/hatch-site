import { Injectable, Logger } from '@nestjs/common';
import { AuditActionType } from '@hatch/db';

import { PrismaService } from '@/modules/prisma/prisma.service';

export type AuditLogParams = {
  organizationId: string;
  userId?: string | null;
  actionType: AuditActionType | string;
  summary: string;
  metadata?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type AuditLogFilters = {
  userId?: string;
  actionType?: AuditActionType | string;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: AuditLogParams) {
    try {
      return await this.prisma.orgAuditLog.create({
        data: {
          organizationId: params.organizationId,
          userId: params.userId ?? null,
          actionType: (params.actionType as AuditActionType) ?? AuditActionType.OTHER,
          summary: params.summary,
          metadata: params.metadata ?? undefined,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null
        }
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${params.summary}`, error instanceof Error ? error.stack : error);
      return null;
    }
  }

  async listForOrganization(orgId: string, limit = 50, cursor?: string, filters?: AuditLogFilters) {
    const safeLimit = Math.min(Math.max(limit ?? 50, 1), 200);
    const where: Record<string, any> = { organizationId: orgId };
    if (filters?.userId) {
      where.userId = filters.userId;
    }
    if (filters?.actionType) {
      where.actionType = filters.actionType;
    }

    return this.prisma.orgAuditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined
    });
  }
}
