import { InsightsRefreshScheduler } from './insights.refresh.scheduler';
import type { PrismaService } from '../prisma/prisma.service';
import type { InsightsService } from './insights.service';
import { enqueueInsightsRefresh } from '../../jobs/insights-refresh.job';

jest.mock('../../jobs/insights-refresh.job', () => ({
  enqueueInsightsRefresh: jest.fn()
}));

describe('InsightsRefreshScheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('enqueues refresh jobs and purges tenant caches on the scheduled run', async () => {
    const prisma = {
      tenant: {
        findMany: jest.fn().mockResolvedValue([{ id: 'tenant-a' }, { id: 'tenant-b' }])
      }
    } as unknown as PrismaService;
    const insights = {
      purgeTenantCache: jest.fn()
    } as unknown as InsightsService;
    const scheduler = new InsightsRefreshScheduler(prisma, insights);

    await scheduler.runIntervalRefresh();

    expect(enqueueInsightsRefresh).toHaveBeenCalledTimes(2);
    expect(enqueueInsightsRefresh).toHaveBeenCalledWith('tenant-a');
    expect(enqueueInsightsRefresh).toHaveBeenCalledWith('tenant-b');
    expect(insights.purgeTenantCache).toHaveBeenCalledTimes(2);
    expect(insights.purgeTenantCache).toHaveBeenCalledWith('tenant-a');
    expect(insights.purgeTenantCache).toHaveBeenCalledWith('tenant-b');
  });
});
