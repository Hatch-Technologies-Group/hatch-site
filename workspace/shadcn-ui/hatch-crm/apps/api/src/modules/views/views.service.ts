import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { ViewPreset } from '@prisma/client';

import { AuditAction, Prisma } from '@hatch/db';

import { PrismaService } from '@/shared/prisma.service';
import { AuditService } from '@/platform/audit/audit.service';
import { ViewDto } from './dto/view.dto';

@Injectable()
export class ViewsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  list(brokerageId: string): Promise<ViewPreset[]> {
    const scopedId = brokerageId?.trim();
    const where: Prisma.ViewPresetWhereInput =
      scopedId && scopedId.length > 0
        ? {
            OR: [{ brokerageId: scopedId }, { tenantId: scopedId }]
          }
        : {};
    return this.prisma.viewPreset.findMany({ where });
  }

  async create(dto: ViewDto): Promise<ViewPreset> {
    const scopedId = dto.brokerageId?.trim() ?? dto.brokerageId;
    const data = {
      ...dto,
      brokerageId: scopedId,
      tenantId: scopedId
    };
    const created = await this.prisma.viewPreset.create({ data: data as any });
    const orgScope = created.brokerageId ?? ((created as unknown as { tenantId?: string }).tenantId ?? 'unknown');
    await this.audit.log({
      orgId: orgScope ?? 'unknown',
      recordId: created.id,
      object: 'view_preset',
      action: AuditAction.CREATE,
      diff: { after: created }
    });
    return created;
  }

  async update(id: string, dto: Partial<ViewDto>): Promise<ViewPreset> {
    const before = await this.prisma.viewPreset.findUnique({ where: { id } });
    const scopedId = dto.brokerageId?.trim();
    const payload = {
      ...dto,
      ...(scopedId ? { brokerageId: scopedId, tenantId: scopedId } : {})
    };
    const after = await this.prisma.viewPreset.update({ where: { id }, data: payload as any });
    await this.audit.log({
      orgId:
        after.brokerageId ??
        ((after as unknown as { tenantId?: string }).tenantId ?? 'unknown'),
      recordId: after.id,
      object: 'view_preset',
      action: AuditAction.UPDATE,
      diff: { before, after }
    });
    return after;
  }

  async setDefault(id: string, role: string): Promise<{ ok: true } | null> {
    const view = await this.prisma.viewPreset.findUnique({ where: { id } });
    if (!view) {
      return null;
    }

    const scopeId =
      view.brokerageId ??
      ((view as unknown as { tenantId?: string }).tenantId ?? null);
    const scopeFilter =
      scopeId && scopeId.length > 0
        ? { OR: [{ brokerageId: scopeId }, { tenantId: scopeId }] }
        : undefined;

    await this.prisma.$transaction([
      this.prisma.viewPreset.updateMany({
        where: {
          ...(scopeFilter ?? {}),
          roles: { has: role }
        },
        data: { isDefault: false }
      }),
      this.prisma.viewPreset.update({ where: { id }, data: { isDefault: true } })
    ]);

    await this.audit.log({
      orgId: scopeId ?? 'unknown',
      recordId: id,
      object: 'view_preset',
      action: AuditAction.UPDATE,
      diff: { role }
    });
    return { ok: true };
  }

  async share(id: string): Promise<{ token: string }> {
    const token = randomUUID();
    const view = await this.prisma.viewPreset.findUnique({ where: { id } });
    if (!view) {
      throw new BadRequestException('View not found');
    }
    const scopeId =
      view.brokerageId ??
      ((view as unknown as { tenantId?: string }).tenantId ?? null);
    const share = await this.prisma.viewPresetShareToken.create({
      data: {
        viewPresetId: id,
        token
      }
    });
    await this.audit.log({
      orgId: scopeId ?? 'unknown',
      recordId: id,
      object: 'view_preset_share',
      action: AuditAction.SHARE,
      diff: { token: share.token }
    });
    return { token: share.token };
  }
}
