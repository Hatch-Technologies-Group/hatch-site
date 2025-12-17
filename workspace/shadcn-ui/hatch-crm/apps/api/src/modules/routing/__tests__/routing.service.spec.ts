import type { OutboxService } from '../../outbox/outbox.service';
import { RoutingService } from '../routing.service';

const ROUTING_MODE_SCORE_AND_ASSIGN = 'SCORE_AND_ASSIGN';
const SLA_FIRST_TOUCH = 'FIRST_TOUCH';
const SLA_KEPT_APPOINTMENT = 'KEPT_APPOINTMENT';

const createMockPrisma = () => {
  const prisma: any = {
    tenant: { findUniqueOrThrow: jest.fn() },
    routingRule: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    consent: { findMany: jest.fn() },
    customFieldValue: { findMany: jest.fn().mockResolvedValue([]) },
    tour: { groupBy: jest.fn() },
    assignment: { create: jest.fn() },
    leadSlaTimer: { createMany: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    leadRouteEvent: { create: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<any>) => fn(prisma));
  return prisma;
};

const mockOutbox = { enqueue: jest.fn() } as unknown as OutboxService;

describe('RoutingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('assigns lead, logs decision, and schedules SLA timers', async () => {
    const prisma = createMockPrisma();
    prisma.tenant.findUniqueOrThrow.mockResolvedValue({
      id: 'tenant',
      timezone: 'America/New_York',
      quietHoursStart: 21,
      quietHoursEnd: 8,
      tenDlcReady: true,
    });
    prisma.routingRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        tenantId: 'tenant',
        name: 'Score Assign',
        priority: 1,
        mode: ROUTING_MODE_SCORE_AND_ASSIGN,
        enabled: true,
        conditions: {},
        targets: [{ type: 'AGENT', id: 'agent-a' }, { type: 'AGENT', id: 'agent-b' }],
        fallback: { teamId: 'pond-team' },
        slaFirstTouchMinutes: 45,
        slaKeptAppointmentMinutes: 1440,
      },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'agent-a',
        firstName: 'A',
        lastName: 'Agent',
        tours: [],
        memberships: [{ teamId: 'team-1' }],
      },
      {
        id: 'agent-b',
        firstName: 'B',
        lastName: 'Agent',
        tours: [],
        memberships: [{ teamId: 'team-1' }],
      },
    ]);
    prisma.tour.groupBy.mockResolvedValue([
      { agentId: 'agent-a', status: 'KEPT', _count: { _all: 5 } },
      { agentId: 'agent-a', status: 'CONFIRMED', _count: { _all: 5 } },
    ]);
    prisma.consent.findMany.mockResolvedValue([
      {
        id: 'consent-1',
        channel: 'SMS',
        status: 'GRANTED',
      },
    ]);
    prisma.leadRouteEvent.create.mockResolvedValue({
      id: 'event-1',
      tenantId: 'tenant',
      leadId: 'lead-1',
      createdAt: new Date(),
    });

    const service = new RoutingService(prisma as any, mockOutbox);

    const result = await service.assign({
      tenantId: 'tenant',
      person: {
        id: 'lead-1',
        tenantId: 'tenant',
        organizationId: 'org',
        firstName: 'Lead',
        lastName: 'One',
        buyerRepStatus: 'ACTIVE',
        source: 'PORTAL',
      } as any,
      listing: {
        id: 'listing-1',
        price: 750000,
        city: 'Miami',
        state: 'FL',
        postalCode: '33101',
      },
    });

    expect(result.selectedAgents).toHaveLength(1);
    expect(prisma.assignment.create).toHaveBeenCalled();
    expect(prisma.leadRouteEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          matchedRuleId: 'rule-1',
          candidates: expect.any(Object),
          fallbackUsed: false,
        }),
      }),
    );
    expect(prisma.leadSlaTimer.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({ type: SLA_FIRST_TOUCH }),
          expect.objectContaining({ type: SLA_KEPT_APPOINTMENT }),
        ]),
      }),
    );
    expect(mockOutbox.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'lead-routing.assigned' }),
    );
  });

  it('processes SLA breaches and routes to pond', async () => {
    const prisma = createMockPrisma();
    prisma.leadSlaTimer.findMany.mockResolvedValue([
      {
        id: 'timer-1',
        tenantId: 'tenant',
        leadId: 'lead-1',
        ruleId: 'rule-1',
        type: SLA_FIRST_TOUCH,
        status: 'PENDING',
        dueAt: new Date(Date.now() - 60_000),
        assignedAgentId: 'agent-a',
        rule: {
          id: 'rule-1',
          tenantId: 'tenant',
          fallback: { teamId: 'pond-team' },
        },
      },
    ]);
    prisma.leadRouteEvent.updateMany.mockResolvedValue({ count: 1 });

    const service = new RoutingService(prisma as any, mockOutbox);
    const result = await service.processSlaTimers('tenant');

    expect(result.processed).toBe(1);
    expect(prisma.leadSlaTimer.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'BREACHED' }) }),
    );
    expect(prisma.assignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ teamId: 'pond-team' }),
      }),
    );
    expect(mockOutbox.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({ eventType: 'lead-routing.sla.breached' }),
    );
  });

  it('relaxes agent filters when enabled', async () => {
    const prisma = createMockPrisma();
    prisma.tenant.findUniqueOrThrow.mockResolvedValue({
      id: 'tenant',
      timezone: 'America/New_York',
      quietHoursStart: 21,
      quietHoursEnd: 8,
      tenDlcReady: true,
    });
    prisma.routingRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        tenantId: 'tenant',
        name: 'Senior Luxury Leads',
        priority: 1,
        mode: ROUTING_MODE_SCORE_AND_ASSIGN,
        enabled: true,
        conditions: {},
        targets: [
          {
            type: 'TEAM',
            id: 'team-1',
            agentFilter: { tags: { include: ['luxury'] } },
          },
        ],
        fallback: { teamId: 'pond-team', relaxAgentFilters: true },
        slaFirstTouchMinutes: null,
        slaKeptAppointmentMinutes: null,
      },
    ]);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'agent-a',
        firstName: 'A',
        lastName: 'Agent',
        tours: [],
        memberships: [{ teamId: 'team-1' }],
        agentProfilesForOrgs: [],
      },
    ]);
    prisma.tour.groupBy.mockResolvedValue([]);
    prisma.consent.findMany.mockResolvedValue([
      {
        id: 'consent-1',
        channel: 'SMS',
        status: 'GRANTED',
      },
    ]);
    prisma.leadRouteEvent.create.mockResolvedValue({
      id: 'event-1',
      tenantId: 'tenant',
      leadId: 'lead-1',
      createdAt: new Date(),
    });

    const service = new RoutingService(prisma as any, mockOutbox);

    const result = await service.assign({
      tenantId: 'tenant',
      person: {
        id: 'lead-1',
        tenantId: 'tenant',
        organizationId: 'org',
        firstName: 'Lead',
        lastName: 'One',
        buyerRepStatus: 'ACTIVE',
        source: 'PORTAL',
        tags: [],
      } as any,
      listing: {
        id: 'listing-1',
        price: 750000,
        city: 'Miami',
        state: 'FL',
        postalCode: '33101',
      },
    });

    expect(result.selectedAgents).toHaveLength(1);
    expect(result.reasonCodes).toEqual(expect.arrayContaining(['RELAXED_AGENT_FILTERS']));
    expect(prisma.assignment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ agentId: 'agent-a' }),
      }),
    );
    expect(prisma.leadRouteEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          fallbackUsed: false,
        }),
      }),
    );
  });
});
