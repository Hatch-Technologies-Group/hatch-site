import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { QueueEvents } from 'bullmq';

import {
  INSIGHTS_REFRESH_QUEUE,
  queueConnection,
  insightsRefreshQueue
} from '../../jobs/insights-refresh.job';
import { InsightsService } from './insights.service';

const bullmqDisabled =
  process.env.DISABLE_BULLMQ === 'true' ||
  (process.env.NODE_ENV === 'test' && process.env.DISABLE_BULLMQ !== 'false');

@Injectable()
export class InsightsRefreshQueueMonitor implements OnModuleDestroy {
  private readonly events?: QueueEvents;

  constructor(private readonly insights: InsightsService) {
    if (bullmqDisabled) {
      return;
    }

    this.events = new QueueEvents(INSIGHTS_REFRESH_QUEUE, {
      connection: queueConnection
    });

    this.events.on('completed', ({ jobId }) => this.handleCompleted(jobId));
  }

  async onModuleDestroy() {
    await this.events?.close();
  }

  private async handleCompleted(jobId?: string | number) {
    if (!jobId) return;
    const job = await insightsRefreshQueue.getJob(String(jobId));
    const tenantId = (job as any)?.data?.tenantId as string | undefined;
    if (tenantId) {
      this.insights.purgeTenantCache(tenantId);
    }
  }
}
