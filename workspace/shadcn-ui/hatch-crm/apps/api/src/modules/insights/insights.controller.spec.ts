import { BadRequestException } from '@nestjs/common';

import { InsightsController } from './insights.controller';
import type { InsightsService } from './insights.service';
import type { GetInsightsQueryDto } from './dto';

describe('InsightsController', () => {
  let controller: InsightsController;
  let service: { getInsights: jest.Mock };

  beforeEach(() => {
    service = {
      getInsights: jest.fn().mockResolvedValue({})
    };
    controller = new InsightsController(service as unknown as InsightsService);
  });

  it('throws when x-tenant-id header is missing', async () => {
    const reply = { header: jest.fn() } as any;
    await expect(
      controller.getInsights({ headers: {} } as any, {} as GetInsightsQueryDto, reply)
    ).rejects.toThrow(BadRequestException);
  });

  it('always enforces the tenant from headers even if query overrides it', async () => {
    const req = {
      headers: {
        'x-tenant-id': 'tenant-alpha',
        'x-user-id': 'user-123',
        'x-user-role': 'BROKER'
      }
    } as any;
    const query = { tenantId: 'tenant-beta', ownerId: 'owner-999' } as GetInsightsQueryDto;

    const reply = { header: jest.fn() } as any;
    await controller.getInsights(req, query, reply);

    expect(service.getInsights).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: 'tenant-alpha' }),
      expect.objectContaining({ tenantId: 'tenant-alpha', ownerId: 'owner-999' })
    );
  });

  it('sets insight headers for fresh payloads', async () => {
    const now = new Date();
    service.getInsights.mockResolvedValue({
      v: 3,
      dataAge: now.toISOString()
    });

    const req = {
      headers: {
        'x-tenant-id': 'tenant-123',
        'x-user-id': 'user-123',
        'x-user-role': 'BROKER'
      }
    } as any;
    const reply = { header: jest.fn() } as any;

    await controller.getInsights(req, {} as GetInsightsQueryDto, reply);

    expect(reply.header).toHaveBeenCalledWith('X-Insights-Version', '3');
    expect(reply.header).toHaveBeenCalledWith('X-Insights-DataAge', now.toISOString());
    expect(reply.header).toHaveBeenCalledWith('X-Insights-Stale', 'false');
  });

  it('marks responses as stale when data age is older than 10 minutes', async () => {
    const oldDate = new Date(Date.now() - 11 * 60 * 1000);
    service.getInsights.mockResolvedValue({
      v: 1,
      dataAge: oldDate.toISOString()
    });

    const req = {
      headers: {
        'x-tenant-id': 'tenant-abc',
        'x-user-id': 'user-123',
        'x-user-role': 'BROKER'
      }
    } as any;
    const reply = { header: jest.fn() } as any;

    await controller.getInsights(req, {} as GetInsightsQueryDto, reply);

    expect(reply.header).toHaveBeenCalledWith('X-Insights-Version', '1');
    expect(reply.header).toHaveBeenCalledWith('X-Insights-DataAge', oldDate.toISOString());
    expect(reply.header).toHaveBeenCalledWith('X-Insights-Stale', 'true');
  });
});
