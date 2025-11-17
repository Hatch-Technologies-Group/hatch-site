import { buildInsightsCacheKey, INSIGHTS_RESPONSE_VERSION, InsightsService } from './insights.service';

const period = {
  label: '7 days',
  days: 7,
  start: new Date('2025-01-01T00:00:00.000Z'),
  end: new Date('2025-01-07T23:59:59.000Z')
};

const baseInput = {
  tenantId: 'tenant-1',
  period,
  dormantDays: 7,
  limit: 50,
  version: INSIGHTS_RESPONSE_VERSION
};

describe('buildInsightsCacheKey', () => {
  it('produces identical keys regardless of stage order', () => {
    const a = buildInsightsCacheKey({
      ...baseInput,
      stageIds: ['stage-b', 'stage-a']
    });
    const b = buildInsightsCacheKey({
      ...baseInput,
      stageIds: ['stage-a', 'stage-b']
    });
    expect(a).toEqual(b);
  });

  it('differentiates cache entries when the limit changes', () => {
    const a = buildInsightsCacheKey({ ...baseInput, limit: 50 });
    const b = buildInsightsCacheKey({ ...baseInput, limit: 100 });
    expect(a).not.toEqual(b);
  });
});

describe('purgeTenantCache', () => {
  it('evicts cached payloads and logs eviction metrics', () => {
    const service = new InsightsService({} as any);
    const payload = { v: 1 } as any;
    (service as any).cacheResponse('key-a', 'tenant-1', payload);
    (service as any).cacheResponse('key-b', 'tenant-1', payload);
    const logSpy = jest.spyOn(service as any, 'logMetric').mockImplementation(() => undefined);

    service.purgeTenantCache('tenant-1');

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('metric=insights.cache.evictions tenant=tenant-1 value=2')
    );
    expect((service as any).responseCache.size).toBe(0);
    logSpy.mockRestore();
  });
});
