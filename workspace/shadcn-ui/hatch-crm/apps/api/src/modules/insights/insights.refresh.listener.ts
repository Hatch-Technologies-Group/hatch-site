import { Injectable } from '@nestjs/common';

import { enqueueInsightsRefresh } from '../../jobs/insights-refresh.job';
import { InsightsService } from './insights.service';

type LeadEventPayload = {
  tenantId: string;
  leadId: string;
};

const DEBOUNCE_MS = 60_000;

@Injectable()
export class InsightsRefreshListener {
  constructor(private readonly insights: InsightsService) {}

  async handleLeadMoved(payload: LeadEventPayload): Promise<void> {
    await this.enqueue(payload.tenantId);
  }

  async handleTouchpointCreated(payload: LeadEventPayload): Promise<void> {
    await this.enqueue(payload.tenantId);
  }

  private async enqueue(tenantId: string): Promise<void> {
    try {
      await enqueueInsightsRefresh(tenantId, DEBOUNCE_MS);
      this.insights.purgeTenantCache(tenantId);
    } catch {
      // Debounce collisions are expected (job already exists); ignore.
    }
  }
}

