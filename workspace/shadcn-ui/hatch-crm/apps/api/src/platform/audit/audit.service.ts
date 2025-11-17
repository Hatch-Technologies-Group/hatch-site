import { Injectable } from '@nestjs/common';

import { AuditAction, Prisma } from '@hatch/db';

import { PrismaService } from '../../modules/prisma/prisma.service';

export interface AuditLogInput {
  orgId: string;
  actorId?: string | null;
  object?: string | null;
  recordId?: string | null;
  action: AuditAction;
  diff?: Prisma.InputJsonValue | null;
  ip?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogInput): Promise<void> {
    try {
      // Proactively null the actorId if it does not exist to avoid noisy FK errors in logs
      let actorId: string | null = entry.actorId ?? null;
      if (actorId) {
        const exists = await this.prisma.user.findUnique({ where: { id: actorId }, select: { id: true } });
        if (!exists) {
          actorId = null;
        }
      }

      await this.prisma.auditEvent.create({
        data: {
          orgId: entry.orgId,
          actorId,
          object: entry.object ?? null,
          recordId: entry.recordId ?? null,
          action: entry.action,
          diff: entry.diff ?? undefined,
          ip: entry.ip ?? null,
          userAgent: entry.userAgent ?? null
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003' &&
        entry.actorId
      ) {
        await this.prisma.auditEvent.create({
          data: {
            orgId: entry.orgId,
            actorId: null,
            object: entry.object ?? null,
            recordId: entry.recordId ?? null,
            action: entry.action,
            diff: entry.diff ?? undefined,
            ip: entry.ip ?? null,
            userAgent: entry.userAgent ?? null
          }
        });
        return;
      }
      throw error;
    }
  }
}
