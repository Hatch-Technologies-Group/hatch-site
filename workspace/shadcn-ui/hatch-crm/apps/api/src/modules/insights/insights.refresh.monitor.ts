import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { QueueEvents } from 'bullmq';

import {
  INSIGHTS_REFRESH_QUEUE,
  insightsRefreshQueue,
  queueConnection
} from '../../jobs/insights-refresh.job';
import { InsightsService } from './insights.service';

@Injectable()
export class InsightsRefreshQueueMonitor implements OnModuleDestroy {
  private readonly logger = new Logger(InsightsRefreshQueueMonitor.name);
  private readonly events = new QueueEvents(INSIGHTS_REFRESH_QUEUE, {
    connection: queueConnection
  });

  constructor(private readonly insights: InsightsService) {
    this.events.on('completed', (event) => {
      this.handleCompleted(event).catch((error) =>
        this.logger.error('Failed to handle insights refresh completion', error as Error)
      );
    });
  }

  private async handleCompleted(event: { jobId: string | undefined }) {
    if (!event.jobId) return;
    const job = await insightsRefreshQueue.getJob(event.jobId);
    const tenantId = job?.data?.tenantId as string | undefined;
    if (tenantId) {
      this.insights.purgeTenantCache(tenantId);
    }
  }

  async onModuleDestroy() {
    await this.events.close();
  }
}
