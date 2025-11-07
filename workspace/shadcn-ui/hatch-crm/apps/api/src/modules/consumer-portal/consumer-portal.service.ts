import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ConsumerPortalConfig, ViewPreset } from '@prisma/client';

import { AuditAction } from '@hatch/db';

import { PrismaService } from '@/shared/prisma.service';
import { AuditService } from '@/platform/audit/audit.service';
import { AnalyticsService } from '@/modules/analytics/analytics.service';
import type { ConsumerPortalConfigDto } from './dto/config.dto';

const toJson = (value: unknown): Prisma.InputJsonValue => value as Prisma.InputJsonValue;
const toNullableJson = (value: unknown): Prisma.InputJsonValue | Prisma.JsonNullValueInput =>
  value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);

@Injectable()
export class ConsumerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService
  ) {}

  async get(brokerageId: string): Promise<ConsumerPortalConfig | null> {
    const tenantId = brokerageId;
    return this.prisma.consumerPortalConfig.findUnique({ where: { tenantId } });
  }

  async put(brokerageId: string, dto: ConsumerPortalConfigDto): Promise<ConsumerPortalConfig> {
    const resolvedBrokerageId = dto?.brokerageId ?? brokerageId;
    const tenantId = resolvedBrokerageId;
    const before = await this.prisma.consumerPortalConfig.findUnique({ where: { tenantId } });

    const createData: Prisma.ConsumerPortalConfigUncheckedCreateInput = {
      tenantId,
      brokerageId: resolvedBrokerageId,
      modules: toJson(dto.modules ?? {}),
      fields: toNullableJson(dto.fields ?? null),
      viewPresetId: dto.viewPresetId ?? null,
      permissions: toNullableJson(dto.permissions ?? null),
      branding: toNullableJson(dto.branding ?? null)
    };

    const updateData: Prisma.ConsumerPortalConfigUncheckedUpdateInput = {
      brokerageId: resolvedBrokerageId,
      modules: toJson(dto.modules ?? {}),
      fields: dto.fields !== undefined ? toNullableJson(dto.fields) : undefined,
      viewPresetId: dto.viewPresetId !== undefined ? dto.viewPresetId : undefined,
      permissions: dto.permissions !== undefined ? toNullableJson(dto.permissions) : undefined,
      branding: dto.branding !== undefined ? toNullableJson(dto.branding) : undefined
    };

    const after = await this.prisma.consumerPortalConfig.upsert({
      where: { tenantId },
      create: createData,
      update: updateData
    });

    await this.audit.log({
      orgId: resolvedBrokerageId,
      recordId: after.id,
      object: 'consumer_portal_config',
      action: AuditAction.UPDATE,
      diff: {
        before,
        after
      }
    });

    this.analytics.emit('consumerPortal.config.saved', {
      brokerageId: resolvedBrokerageId,
      viewPresetId: dto.viewPresetId ?? null
    });

    return after;
  }

  async resolveSharedView(token: string): Promise<ViewPreset | null> {
    const share = await this.prisma.viewPresetShareToken.findUnique({ where: { token } });
    if (!share) {
      return null;
    }
    return this.prisma.viewPreset.findUnique({ where: { id: share.viewPresetId } });
  }
}
