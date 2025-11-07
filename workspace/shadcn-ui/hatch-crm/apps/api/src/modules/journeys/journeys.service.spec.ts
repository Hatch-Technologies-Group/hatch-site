import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { JourneysService } from './journeys.service';

describe('JourneysService', () => {
  let service: JourneysService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      journey: { findFirst: jest.fn().mockResolvedValue({ id: 'journey', tenantId: 'tenant-a', isActive: true }) },
      person: { findUnique: jest.fn().mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-a' }) },
      journeySimulation: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn()
      },
      leadHistory: {
        create: jest.fn()
      }
    };

    service = new JourneysService(prisma);
  });

  it('throws Forbidden when trying to start a journey for a lead in another tenant', async () => {
    prisma.person.findUnique.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-b' });

    await expect(
      service.startForLead({
        tenantId: 'tenant-a',
        leadId: 'lead-1',
        templateId: 'journey'
      })
    ).rejects.toThrow(ForbiddenException);
  });

  it('throws NotFound when journey template does not exist', async () => {
    prisma.journey.findFirst.mockResolvedValue(null);
    prisma.person.findUnique.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-a' });

    await expect(
      service.startForLead({
        tenantId: 'tenant-a',
        leadId: 'lead-1',
        templateId: 'journey'
      })
    ).rejects.toThrow(NotFoundException);
  });

  it('skips creating a duplicate simulation when one already exists', async () => {
    prisma.journeySimulation.findUnique.mockResolvedValueOnce({ id: 'existing' });

    const result = await service.startForLead({
      tenantId: 'tenant-a',
      leadId: 'lead-1',
      templateId: 'journey',
      actorId: 'user-1',
      source: 'insights'
    });

    expect(result).toEqual({ status: 'skipped' });
    expect(prisma.journeySimulation.create).not.toHaveBeenCalled();
    expect(prisma.leadHistory.create).not.toHaveBeenCalled();
  });
});
