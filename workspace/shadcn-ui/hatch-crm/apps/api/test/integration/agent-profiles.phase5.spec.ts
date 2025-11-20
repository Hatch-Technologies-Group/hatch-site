import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 5 — Agent profiles & compliance', () => {
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

  const brokerHeaders = (orgId: string) => ({
    Authorization: brokerAuth,
    'x-tenant-id': tenantId,
    'x-org-id': orgId
  });

  const withBroker = (orgId: string, req: request.Test) =>
    req.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  const acceptInvite = async (orgId: string, email: string) => {
    const invite = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/invites`))
      .send({ email })
      .expect(201);
    const token = invite.body.token as string;
    const res = await request(app.getHttpServer())
      .post('/agent-invites/accept')
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ token, password: 'Password!234', firstName: 'Agent', lastName: 'Test' })
      .expect(201);
    return res;
  };

  it('broker can upsert agent profile and list agents', async () => {
    const orgRes = await withBroker(seedOrgId, request(app.getHttpServer()).post('/organizations')).send({ name: `Agent Org ${Date.now()}` }).expect(201);
    const orgId = orgRes.body.id as string;

    const email = `agent_profile_${Date.now()}@example.com`;
    await acceptInvite(orgId, email);

    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });

    await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({
        userId: agentUser.id,
        licenseNumber: 'LIC-123',
        licenseState: 'FL',
        tags: ['luxury']
      })
      .expect(201);

    const list = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/agents`)).expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    const match = list.body.find((p: any) => p.userId === agentUser.id);
    expect(match).toBeDefined();
    expect(match.licenseNumber).toBe('LIC-123');
  });

  it('broker updates compliance and risk summary', async () => {
    const orgRes = await withBroker(seedOrgId, request(app.getHttpServer()).post('/organizations')).send({ name: `Agent Org Compliance ${Date.now()}` }).expect(201);
    const orgId = orgRes.body.id as string;

    const email = `agent_compliance_${Date.now()}@example.com`;
    await acceptInvite(orgId, email);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });

    const createRes = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({ userId: agentUser.id })
      .expect(201);
    const profileId = createRes.body.id as string;

    const update = await withBroker(orgId, request(app.getHttpServer()).patch(`/organizations/${orgId}/agents/profile/${profileId}/compliance`))
      .send({
        isCompliant: false,
        requiresAction: true,
        riskLevel: 'HIGH',
        riskScore: 85,
        ceHoursRequired: 24,
        ceHoursCompleted: 12
      })
      .expect(200);

    expect(update.body.isCompliant).toBe(false);
    expect(update.body.riskLevel).toBe('HIGH');
    expect(update.body.ceHoursCompleted).toBe(12);
  });

  it('agent can view own profile but not others; non-broker cannot write', async () => {
    const orgRes = await withBroker(seedOrgId, request(app.getHttpServer()).post('/organizations')).send({ name: `Agent Org Visibility ${Date.now()}` }).expect(201);
    const orgId = orgRes.body.id as string;

    const emailA = `agent_a_${Date.now()}@example.com`;
    const acceptA = await acceptInvite(orgId, emailA);
    const emailB = `agent_b_${Date.now()}@example.com`;
    await acceptInvite(orgId, emailB);

    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentA = await prisma.user.findUniqueOrThrow({ where: { email: emailA.toLowerCase() } });
    const agentB = await prisma.user.findUniqueOrThrow({ where: { email: emailB.toLowerCase() } });

    const profileA = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({ userId: agentA.id })
      .expect(201);
    const profileB = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({ userId: agentB.id })
      .expect(201);

    const agentAuth = `Bearer ${acceptA.body.accessToken}`;
    const withAgent = (req: request.Test) => req.set('Authorization', agentAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

    await withAgent(request(app.getHttpServer()).get(`/organizations/${orgId}/agents/profile/${profileA.body.id}`)).expect(200);
    await withAgent(request(app.getHttpServer()).get(`/organizations/${orgId}/agents/profile/${profileB.body.id}`)).expect(403);
    await withAgent(request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`)).send({ userId: agentA.id }).expect(403);
  });
});

