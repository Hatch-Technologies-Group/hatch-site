import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { enqueueInsightsRefresh } from '../../jobs/insights-refresh.job';
import { InsightsService } from './insights.service';

type LeadMovedPayload = {
  tenantId: string;
  leadId: string;
  fromStageId?: string | null;
  toStageId?: string | null;
};

type TouchpointCreatedPayload = {
  tenantId: string;
  leadId: string;
};

@Injectable()
export class InsightsRefreshListener {
  private readonly logger = new Logger(InsightsRefreshListener.name);
  private readonly logsMuted = process.env.NODE_ENV === 'test';

  constructor(private readonly insights: InsightsService) {}

  @OnEvent('lead.moved', { async: true })
  async handleLeadMoved(payload: LeadMovedPayload) {
    if (!payload?.tenantId) return;
    await this.enqueue(payload.tenantId, 'lead.moved');
  }

  @OnEvent('touchpoint.created', { async: true })
  async handleTouchpointCreated(payload: TouchpointCreatedPayload) {
    if (!payload?.tenantId) return;
    await this.enqueue(payload.tenantId, 'touchpoint.created');
  }

  private async enqueue(tenantId: string, source: string) {
    try {
      await enqueueInsightsRefresh(tenantId, 60_000);
      this.insights.purgeTenantCache(tenantId);
    } catch (error) {
      if (!this.logsMuted) {
        this.logger.warn(
          `Failed to enqueue insights refresh for ${tenantId} via ${source}: ${
            error instanceof Error ? error.message : error
          }`
        );
      }
    }
  }
}
