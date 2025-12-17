import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { enqueueInsightsRefresh } from '../../jobs/insights-refresh.job';
import { InsightsService } from './insights.service';

@Injectable()
export class InsightsRefreshScheduler {
  constructor(
    private readonly prisma: PrismaService,
    private readonly insights: InsightsService
  ) {}

  async runIntervalRefresh(): Promise<void> {
    const tenants = await this.prisma.tenant.findMany({
      select: { id: true }
    });

    await Promise.all(
      tenants.map(async ({ id }) => {
        this.insights.purgeTenantCache(id);
        await enqueueInsightsRefresh(id);
      })
    );
  }
}

