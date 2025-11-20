import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 6 — Mission Control', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let tenantId: string;
  let seedOrgId: string;
  let brokerAuth: string;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    seedOrgId = tenant.organizationId;
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign({ sub: 'user-broker', tenantId, orgId: seedOrgId, roles: ['broker'], role: 'BROKER' }, secret, { expiresIn: '2h' })}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const withBroker = (orgId: string, req: request.Test) =>
    req.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  const acceptInvite = async (orgId: string, email: string) => {
    const invite = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/invites`)
    )
      .send({ email })
      .expect(201);
    const token = invite.body.token as string;
    return request(app.getHttpServer())
      .post('/agent-invites/accept')
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ token, password: 'Password!234', firstName: 'Agent', lastName: 'Mission' })
      .expect(201);
  };

  const createOrg = async (name: string) => {
    const res = await withBroker(
      seedOrgId,
      request(app.getHttpServer()).post('/organizations')
    )
      .send({ name })
      .expect(201);
    return res.body.id as string;
  };

  const setupScenario = async () => {
    const orgId = await createOrg(`Mission Org ${Date.now()}`);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentEmails = [`mc_agent1_${Date.now()}@example.com`, `mc_agent2_${Date.now()}@example.com`];
    for (const email of agentEmails) {
      await acceptInvite(orgId, email);
    }
    const agents = await prisma.user.findMany({ where: { email: { in: agentEmails.map((e) => e.toLowerCase()) } } });

    await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({ userId: agents[0].id, licenseNumber: 'LIC-001', tags: ['mentor'] })
      .expect(201);
    const profileTwo = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({ userId: agents[1].id, licenseNumber: 'LIC-002', tags: ['watch'] })
      .expect(201);

    await withBroker(orgId, request(app.getHttpServer()).patch(`/organizations/${orgId}/agents/profile/${profileTwo.body.id}/compliance`))
      .send({ isCompliant: false, requiresAction: true, riskLevel: 'HIGH', ceHoursRequired: 24, ceHoursCompleted: 12 })
      .expect(200);

    const prismaService = prisma;
    for (const cat of ['CONTRACT_TEMPLATE', 'MARKETING']) {
      const fileObject = await prismaService.fileObject.create({
        data: {
          orgId,
          ownerId: agents[0].id,
          fileName: `${cat}.pdf`,
          byteSize: 123,
          storageKey: `org/${orgId}/${cat}`
        }
      });
      await prismaService.orgFile.create({
        data: {
          orgId,
          folderId: null,
          name: `${cat} Doc`,
          category: cat as any,
          fileId: fileObject.id,
          uploadedByUserId: agents[0].id
        }
      });
    }

    const channel = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/comms/channels`))
      .send({ name: 'general' })
      .expect(201);
    await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/comms/messages`))
      .send({ conversationId: channel.body.id, content: 'Mission kickoff' })
      .expect(201);

    return { orgId, agents, profileTwoId: profileTwo.body.id };
  };

  it('returns overview with aggregated metrics', async () => {
    const { orgId } = await setupScenario();
    const response = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)).expect(200);
    expect(response.body.organizationId).toBe(orgId);
    expect(response.body.totalAgents).toBeGreaterThanOrEqual(2);
    expect(response.body.vaultFileCounts.total).toBeGreaterThanOrEqual(2);
    expect(response.body.comms.channels).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(response.body.recentEvents)).toBe(true);
    expect(response.body.aiCompliance).toBeDefined();
    expect(response.body.aiCompliance.evaluationsLast30Days).toBeGreaterThanOrEqual(0);
  });

  it('lists agents for dashboard and shows compliance summary', async () => {
    const { orgId } = await setupScenario();
    const agentsRes = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/agents`)).expect(200);
    expect(Array.isArray(agentsRes.body)).toBe(true);
    expect(agentsRes.body.length).toBeGreaterThanOrEqual(2);
    expect(agentsRes.body[0]).toHaveProperty('openComplianceIssues');

    const complianceRes = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/compliance`)).expect(200);
    expect(complianceRes.body.organizationId).toBe(orgId);
    expect(complianceRes.body.totalAgents).toBeGreaterThanOrEqual(2);
    expect(complianceRes.body.nonCompliantAgents).toBeGreaterThanOrEqual(1);
  });

  it('blocks non-brokers from mission control endpoints', async () => {
    const { orgId, agents } = await setupScenario();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const membership = await prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId: agents[0].id, orgId } }
    });
    expect(membership).toBeTruthy();

    const agentToken = `Bearer ${jwt.sign({ sub: agents[0].id, tenantId, orgId, roles: ['agent'], role: 'AGENT' }, process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret', { expiresIn: '1h' })}`;

    await request(app.getHttpServer())
      .get(`/organizations/${orgId}/mission-control/overview`)
      .set('Authorization', agentToken)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(403);
  });
});
