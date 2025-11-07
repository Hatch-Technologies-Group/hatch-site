import { InsightsRefreshListener } from './insights.refresh.listener';
import type { InsightsService } from './insights.service';
import { enqueueInsightsRefresh } from '../../jobs/insights-refresh.job';

jest.mock('../../jobs/insights-refresh.job', () => ({
  enqueueInsightsRefresh: jest.fn()
}));

describe('InsightsRefreshListener', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('debounces multiple lead and touchpoint events within the window', async () => {
    (enqueueInsightsRefresh as jest.Mock)
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Job already exists'));

    const insights = {
      purgeTenantCache: jest.fn()
    } as unknown as InsightsService;
    const listener = new InsightsRefreshListener(insights);

    await listener.handleLeadMoved({ tenantId: 'tenant-55', leadId: 'lead-a' });
    await listener.handleTouchpointCreated({ tenantId: 'tenant-55', leadId: 'lead-a' });

    expect(enqueueInsightsRefresh).toHaveBeenCalledTimes(2);
    expect(enqueueInsightsRefresh).toHaveBeenNthCalledWith(1, 'tenant-55', 60_000);
    expect(enqueueInsightsRefresh).toHaveBeenNthCalledWith(2, 'tenant-55', 60_000);
    expect(insights.purgeTenantCache).toHaveBeenCalledTimes(1);
    expect(insights.purgeTenantCache).toHaveBeenCalledWith('tenant-55');
  });
});
