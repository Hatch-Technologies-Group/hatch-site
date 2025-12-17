import { TrackingService } from '../tracking.service';

describe('TrackingService', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-01T12:00:00.000Z'));
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('creates events and recomputes rollups for leads', async () => {
    const prisma: any = {
      tenant: { findFirst: jest.fn() },
      person: { findFirst: jest.fn(), update: jest.fn() },
      event: { create: jest.fn(), count: jest.fn() },
      leadActivityRollup: { findUnique: jest.fn(), upsert: jest.fn() }
    };

    prisma.tenant.findFirst.mockResolvedValue({ id: 'tenant-1' });
    prisma.person.findFirst.mockResolvedValue({
      id: 'person-1',
      tenantId: 'tenant-1',
      pipelineStage: { order: 0 },
      leadFit: null,
      lastActivityAt: null
    });
    prisma.leadActivityRollup.findUnique.mockResolvedValue(null);
    prisma.event.create.mockResolvedValue({ id: 'evt-1' });
    prisma.event.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.leadActivityRollup.upsert.mockResolvedValue({
      id: 'rollup-1',
      tenantId: 'tenant-1',
      personId: 'person-1',
      last7dListingViews: 2,
      last7dSessions: 1,
      lastTouchpointAt: null
    });

    const service = new TrackingService(prisma);

    const result = await service.trackEvent(
      {
        orgId: 'org-1',
        name: 'listing.viewed',
        anonymousId: 'anon-1',
        personId: 'person-1',
        timestamp: new Date().toISOString()
      } as any,
      { ip: '127.0.0.1', headers: { 'user-agent': 'jest' } } as any
    );

    expect(result).toEqual({ status: 'ok', eventId: 'evt-1' });
    expect(prisma.event.create).toHaveBeenCalled();
    expect(prisma.event.count).toHaveBeenCalledTimes(2);
    expect(prisma.leadActivityRollup.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ last7dListingViews: 2, last7dSessions: 1 })
      })
    );
    expect(prisma.person.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          leadScore: 73,
          scoreTier: 'B'
        })
      })
    );
  });
});

