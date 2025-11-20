import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 7 — Training & Knowledge Checks', () => {
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

  const createOrg = async (name: string) => {
    const res = await withBroker(seedOrgId, request(app.getHttpServer()).post('/organizations'))
      .send({ name })
      .expect(201);
    return res.body.id as string;
  };

  const acceptInvite = async (orgId: string, email: string) => {
    const invite = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/invites`))
      .send({ email })
      .expect(201);
    const token = invite.body.token as string;
    return request(app.getHttpServer())
      .post('/agent-invites/accept')
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ token, password: 'Password!234', firstName: 'Agent', lastName: 'Training' })
      .expect(201);
  };

  const createAgentProfile = async (orgId: string, userId: string) =>
    withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({ userId })
      .expect(201);

  it('allows broker to create and list training modules', async () => {
    const orgId = await createOrg(`Training Org ${Date.now()}`);
    await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/training/modules`))
      .send({ title: 'MLS Basics', description: 'Intro course', required: true, estimatedMinutes: 45 })
      .expect(201);

    const list = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/training/modules`)).expect(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body[0].title).toBe('MLS Basics');
    expect(list.body[0].required).toBe(true);
  });

  it('allows broker to assign modules to an agent and agent can update progress', async () => {
    const orgId = await createOrg(`Training Assign Org ${Date.now()}`);
    const moduleRes = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/training/modules`))
      .send({ title: 'Compliance 101', required: true })
      .expect(201);
    const moduleId = moduleRes.body.id as string;

    const agentEmail = `training_agent_${Date.now()}@example.com`;
    await acceptInvite(orgId, agentEmail);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: agentEmail.toLowerCase() } });
    const profileRes = await createAgentProfile(orgId, agentUser.id);
    const agentProfileId = profileRes.body.id as string;

    const assignRes = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/training/assign`))
      .send({ agentProfileId, moduleIds: [moduleId] })
      .expect(201);
    expect(assignRes.body[0].module.title).toBe('Compliance 101');

    const agentAuth = `Bearer ${jwt.sign({ sub: agentUser.id, tenantId, orgId, roles: ['agent'], role: 'AGENT' }, process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret', { expiresIn: '1h' })}`;

    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/training/agents/${agentProfileId}/modules/${moduleId}`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ status: 'COMPLETED', score: 90, notes: 'Done' })
      .expect(200);

    const progress = await request(app.getHttpServer())
      .get(`/organizations/${orgId}/training/agents/${agentProfileId}/progress`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(200);
    expect(progress.body[0].status).toBe('COMPLETED');
    expect(progress.body[0].score).toBe(90);
  });

  it('enforces visibility rules on training progress', async () => {
    const orgId = await createOrg(`Training Visibility Org ${Date.now()}`);
    const moduleRes = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/training/modules`))
      .send({ title: 'Ethics' })
      .expect(201);
    const moduleId = moduleRes.body.id as string;

    const emailA = `agentA_${Date.now()}@example.com`;
    const emailB = `agentB_${Date.now()}@example.com`;
    const acceptA = await acceptInvite(orgId, emailA);
    await acceptInvite(orgId, emailB);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentA = await prisma.user.findUniqueOrThrow({ where: { email: emailA.toLowerCase() } });
    const agentB = await prisma.user.findUniqueOrThrow({ where: { email: emailB.toLowerCase() } });
    const profileA = await createAgentProfile(orgId, agentA.id);
    const profileB = await createAgentProfile(orgId, agentB.id);

    await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/training/assign`))
      .send({ agentProfileId: profileA.body.id, moduleIds: [moduleId] })
      .expect(201);

    const agentAToken = `Bearer ${jwt.sign({ sub: agentA.id, tenantId, orgId, roles: ['agent'], role: 'AGENT' }, process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret', { expiresIn: '1h' })}`;
    const agentBToken = `Bearer ${jwt.sign({ sub: agentB.id, tenantId, orgId, roles: ['agent'], role: 'AGENT' }, process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret', { expiresIn: '1h' })}`;

    await request(app.getHttpServer())
      .get(`/organizations/${orgId}/training/agents/${profileA.body.id}/progress`)
      .set('Authorization', agentAToken)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/organizations/${orgId}/training/agents/${profileA.body.id}/progress`)
      .set('Authorization', agentBToken)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(403);

    await request(app.getHttpServer())
      .post(`/organizations/${orgId}/training/assign`)
      .set('Authorization', agentAToken)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ agentProfileId: profileB.body.id, moduleIds: [moduleId] })
      .expect(403);
  });

  it('surfaces training metrics in Mission Control', async () => {
    const orgId = await createOrg(`Training MC Org ${Date.now()}`);
    const moduleOne = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/training/modules`))
      .send({ title: 'DBPR Basics', required: true })
      .expect(201);
    const moduleTwo = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/training/modules`))
      .send({ title: 'Rental Contracts', required: false })
      .expect(201);

    const email = `mc_training_agent_${Date.now()}@example.com`;
    const acceptRes = await acceptInvite(orgId, email);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const profileRes = await createAgentProfile(orgId, agentUser.id);
    const agentProfileId = profileRes.body.id as string;

    await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/training/assign`))
      .send({ agentProfileId, moduleIds: [moduleOne.body.id, moduleTwo.body.id] })
      .expect(201);

    const agentToken = `Bearer ${jwt.sign({ sub: agentUser.id, tenantId, orgId, roles: ['agent'], role: 'AGENT' }, process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret', { expiresIn: '1h' })}`;
    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/training/agents/${agentProfileId}/modules/${moduleOne.body.id}`)
      .set('Authorization', agentToken)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ status: 'COMPLETED' })
      .expect(200);

    const overview = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)).expect(200);
    expect(overview.body.training.totalModules).toBeGreaterThanOrEqual(2);
    expect(overview.body.training.completedAssignments).toBeGreaterThanOrEqual(1);

    const agentsDashboard = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/agents`)).expect(200);
    const row = agentsDashboard.body.find((entry: any) => entry.agentProfileId === agentProfileId);
    expect(row.trainingAssigned).toBe(2);
    expect(row.trainingCompleted).toBeGreaterThanOrEqual(1);
    expect(row.requiredTrainingCompleted).toBeGreaterThanOrEqual(1);
  });
});

