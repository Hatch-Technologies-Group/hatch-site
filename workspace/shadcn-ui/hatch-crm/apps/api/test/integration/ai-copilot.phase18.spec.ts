import jwt from 'jsonwebtoken';
import request from 'supertest';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';
import { AiService } from '@/modules/ai/ai.service';

describeIf(RUN_INTEGRATION)('Phase 18 — AI Copilot', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let server: any;
  let prisma: import('@hatch/db').PrismaClient;
  let tenantId: string;
  let orgId: string;
  let jwtSecret: string;
  let agentAuth: string;
  let agentProfileId: string;
  let aiSpy: jest.SpyInstance;

  beforeAll(async () => {
    app = await setupTestApp();
    server = app.getHttpServer();
    prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    orgId = tenant.organizationId;
    jwtSecret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';

    const agentUser = await prisma.user.create({
      data: {
        organizationId: orgId,
        tenantId,
        email: `agent-${Date.now()}@example.com`,
        firstName: 'Agent',
        lastName: 'Copilot',
        role: 'AGENT',
        status: 'active'
      }
    });

    await prisma.userOrgMembership.create({
      data: {
        userId: agentUser.id,
        orgId
      }
    });

    const agentProfile = await prisma.agentProfile.create({
      data: {
        organizationId: orgId,
        userId: agentUser.id,
        title: 'Advisor'
      }
    });
    agentProfileId = agentProfile.id;

    agentAuth = `Bearer ${jwt.sign(
      { sub: agentUser.id, tenantId, orgId, roles: ['agent'], role: 'AGENT' },
      jwtSecret,
      { expiresIn: '2h' }
    )}`;

    await prisma.lead.create({
      data: {
        organizationId: orgId,
        agentProfileId,
        status: 'NEW',
        name: 'Jane Lead'
      }
    });

    await prisma.agentWorkflowTask.create({
      data: {
        organizationId: orgId,
        agentProfileId,
        type: 'ONBOARDING',
        title: 'Finish disclosure packet'
      }
    });

    await prisma.orgListing.create({
      data: {
        organizationId: orgId,
        agentProfileId,
        addressLine1: '10 Ocean Dr',
        city: 'Naples',
        state: 'FL',
        postalCode: '34102',
        createdByUserId: agentUser.id
      }
    });

    await prisma.orgTransaction.create({
      data: {
        organizationId: orgId,
        agentProfileId,
        createdByUserId: agentUser.id,
        buyerName: 'Buyer One'
      }
    });

    const aiService = app.get(AiService);
    aiSpy = jest.spyOn(aiService, 'runStructuredChat').mockResolvedValue({
      text: JSON.stringify({
        title: 'Your day',
        summary: 'Call Jane and finish paperwork.',
        actions: [
          {
            title: 'Call Jane Lead',
            description: 'Follow up on yesterday',
            priority: 1
          }
        ]
      })
    });
  });

  afterAll(async () => {
    aiSpy?.mockRestore();
    await app?.close();
  });

  it('creates daily briefing and manages actions', async () => {
    const briefing = await request(server)
      .post(`/organizations/${orgId}/ai-copilot/daily-briefing`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ date: new Date().toISOString() })
      .expect(201);

    expect(briefing.body.insight.title).toContain('day');
    expect(briefing.body.actions).toHaveLength(1);

    const actionsResponse = await request(server)
      .get(`/organizations/${orgId}/ai-copilot/actions`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(200);

    expect(actionsResponse.body.length).toBeGreaterThan(0);
    const actionId = actionsResponse.body[0].id as string;

    await request(server)
      .patch(`/organizations/${orgId}/ai-copilot/actions/${actionId}/status`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ status: 'COMPLETED' })
      .expect(200);

    const actionRecord = await prisma.aiCopilotActionRecommendation.findUnique({ where: { id: actionId } });
    expect(actionRecord?.status).toBe('COMPLETED');
    expect(actionRecord?.completedAt).not.toBeNull();
  });
});
