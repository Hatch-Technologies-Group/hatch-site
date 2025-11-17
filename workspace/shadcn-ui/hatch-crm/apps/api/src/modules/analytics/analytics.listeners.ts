import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Prisma } from '@hatch/db';

import { PrismaService } from '@/modules/prisma/prisma.service';
import type { ClientAnalyticsEventPayload } from './types';

@Injectable()
export class AnalyticsListeners {
  private readonly logger = new Logger('Analytics');

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('pipeline.published')
  onPipelinePublished(payload: Record<string, unknown>) {
    this.logger.log(`pipeline.published ${JSON.stringify(payload)}`);
  }

  @OnEvent('consumerPortal.config.saved')
  onConsumerConfigSaved(payload: Record<string, unknown>) {
    this.logger.log(`consumerPortal.config.saved ${JSON.stringify(payload)}`);
  }

  @OnEvent('pipeline.migration.run')
  onMigrationRun(payload: Record<string, unknown>) {
    this.logger.log(`pipeline.migration.run ${JSON.stringify(payload)}`);
  }

  @OnEvent('pipeline.migration.failed')
  onMigrationFailed(payload: Record<string, unknown>) {
    this.logger.error(`pipeline.migration.failed ${JSON.stringify(payload)}`);
  }

  @OnEvent('client.analytics.event')
  async onClientAnalyticsEvent(payload: ClientAnalyticsEventPayload) {
    const occurredAt = payload.timestamp ? new Date(payload.timestamp) : new Date(payload.receivedAt);
    try {
      await this.prisma.clientAnalyticsEvent.create({
        data: {
          tenantId: payload.tenantId,
          userId: payload.userId,
          name: payload.name,
          category: payload.category,
          properties: payload.properties ? (payload.properties as Prisma.InputJsonValue) : Prisma.JsonNull,
          sourceIp: payload.ipAddress,
          userAgent: payload.userAgent,
          occurredAt,
          receivedAt: new Date(payload.receivedAt)
        }
      });
      this.logger.debug(`client.analytics.event persisted ${payload.name} (${payload.tenantId})`);
    } catch (error) {
      this.logger.error(`client.analytics.event failed ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
