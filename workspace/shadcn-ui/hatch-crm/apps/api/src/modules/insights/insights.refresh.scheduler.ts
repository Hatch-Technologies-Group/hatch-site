import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { PrismaService } from '../prisma/prisma.service';
import { enqueueInsightsRefresh } from '../../jobs/insights-refresh.job';
import { InsightsService } from './insights.service';

@Injectable()
export class InsightsRefreshScheduler {
  private readonly logger = new Logger(InsightsRefreshScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService
  ) {}

  @Cron('*/5 * * * *', { timeZone: 'UTC' })
  async runIntervalRefresh() {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true }
    });

    await Promise.all(
      tenants.map(async (tenant) => {
        try {
          await enqueueInsightsRefresh(tenant.id);
          this.insights.purgeTenantCache(tenant.id);
        } catch (error) {
          this.logger.warn(
            `Unable to enqueue insights refresh for tenant ${tenant.id}: ${
              error instanceof Error ? error.message : error
            }`
          );
        }
      })
    );
  }
}
