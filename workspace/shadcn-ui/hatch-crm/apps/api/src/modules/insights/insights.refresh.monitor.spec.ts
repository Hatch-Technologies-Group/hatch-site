import { InsightsRefreshQueueMonitor } from './insights.refresh.monitor';
import type { InsightsService } from './insights.service';
import { insightsRefreshQueue } from '../../jobs/insights-refresh.job';

const mockOn = jest.fn();
const mockClose = jest.fn().mockResolvedValue(undefined);

jest.mock('../../jobs/insights-refresh.job', () => ({
  INSIGHTS_REFRESH_QUEUE: 'insights.refresh',
  queueConnection: {},
  insightsRefreshQueue: {
    getJob: jest.fn()
  }
}));

jest.mock('bullmq', () => ({
  QueueEvents: jest.fn().mockImplementation(() => ({
    on: mockOn,
    close: mockClose
  }))
}));

describe('InsightsRefreshQueueMonitor', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOn.mockClear();
  });

  it('purges tenant cache on completed refresh events', async () => {
    const insights = {
      purgeTenantCache: jest.fn()
    } as unknown as InsightsService;
    (insightsRefreshQueue.getJob as jest.Mock).mockResolvedValue({
      data: { tenantId: 'tenant-z' },
      attemptsMade: 2
    });

    const monitor = new InsightsRefreshQueueMonitor(insights);
    const completedHandler = mockOn.mock.calls.find(([event]) => event === 'completed')?.[1];
    expect(completedHandler).toBeDefined();

    await completedHandler?.({ jobId: 'job-1' });

    expect(insightsRefreshQueue.getJob).toHaveBeenCalledWith('job-1');
    expect(insights.purgeTenantCache).toHaveBeenCalledTimes(1);
    expect(insights.purgeTenantCache).toHaveBeenCalledWith('tenant-z');

    await monitor.onModuleDestroy();
    expect(mockClose).toHaveBeenCalled();
  });
});
