import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 11 — Onboarding & Offboarding Automation', () => {
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
    brokerAuth = `Bearer ${jwt.sign(
      { sub: 'user-broker', tenantId, orgId: seedOrgId, roles: ['broker'], role: 'BROKER' },
      secret,
      { expiresIn: '2h' }
    )}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const withBroker = (orgId: string, req: request.Test) =>
    req.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  const createOrg = async (name: string) => {
    const res = await withBroker(seedOrgId, request(app.getHttpServer()).post('/organizations')).send({ name }).expect(201);
    return res.body.id as string;
  };

  const createTemplate = async (
    orgId: string,
    payload: {
      type: 'ONBOARDING' | 'OFFBOARDING';
      name: string;
      isDefault?: boolean;
      tasks?: Array<{ title: string; description?: string; assignedToRole?: string }>;
    }
  ) => {
    const res = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/onboarding/workflow-templates`)
    ).send({
      description: `${payload.name} description`,
      tasks: payload.tasks ?? [{ title: 'Welcome packet' }],
      ...payload
    });

    if (res.status !== 201) {
      throw new Error(`Failed to create template: ${JSON.stringify(res.body)}`);
    }
    return res.body;
  };

  const acceptInvite = async (orgId: string, email: string) => {
    const invite = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/invites`)
    )
      .send({ email })
      .expect(201);
    const acceptRes = await request(app.getHttpServer())
      .post('/agent-invites/accept')
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ token: invite.body.token, password: 'Password!234', firstName: 'Agent', lastName: 'Workflow' })
      .expect(201);

    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const user = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const agentProfile = await prisma.agentProfile.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgId, userId: user.id } }
    });
    return { user, agentProfile, accessToken: acceptRes.body.accessToken as string };
  };

  it('allows brokers to create onboarding workflow templates', async () => {
    const orgId = await createOrg(`Onboarding Template Org ${Date.now()}`);
    const templateResponse = await createTemplate(orgId, {
      type: 'ONBOARDING',
      name: 'Default Onboarding',
      isDefault: true,
      tasks: [
        { title: 'Upload license' },
        { title: 'Complete compliance training', assignedToRole: 'AGENT' }
      ]
    });

    expect(templateResponse.id).toBeDefined();
    expect(Array.isArray(templateResponse.tasks)).toBe(true);
    expect(templateResponse.tasks).toHaveLength(2);

    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const template = await prisma.orgWorkflowTemplate.findUniqueOrThrow({ where: { id: templateResponse.id } });
    expect(template.organizationId).toBe(orgId);
    expect(template.type).toBe('ONBOARDING');
  });

  it('auto-generates onboarding tasks when an invite is accepted', async () => {
    const orgId = await createOrg(`Auto Onboarding Org ${Date.now()}`);
    await createTemplate(orgId, { type: 'ONBOARDING', name: 'Auto Default', isDefault: true });
    const agentEmail = `auto_onboarding_${Date.now()}@example.com`;
    const { agentProfile } = await acceptInvite(orgId, agentEmail);

    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tasks = await prisma.agentWorkflowTask.findMany({ where: { agentProfileId: agentProfile.id, type: 'ONBOARDING' } });
    expect(tasks.length).toBeGreaterThan(0);

    const refreshedProfile = await prisma.agentProfile.findUniqueOrThrow({ where: { id: agentProfile.id } });
    expect(refreshedProfile.lifecycleStage).toBe('ONBOARDING');
  });

  it('supports manual task generation and agent task updates', async () => {
    const orgId = await createOrg(`Manual Generation Org ${Date.now()}`);
    const template = await createTemplate(orgId, {
      type: 'ONBOARDING',
      name: 'Manual Default',
      isDefault: true,
      tasks: [{ title: 'Upload W9' }]
    });
    const agentEmail = `manual_onboarding_${Date.now()}@example.com`;
    const { agentProfile, user, accessToken } = await acceptInvite(orgId, agentEmail);

    await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/onboarding/generate`))
      .send({ agentProfileId: agentProfile.id, workflowTemplateId: template.id })
      .expect(201);

    const agentAuth = `Bearer ${accessToken}`;
    const tasksRes = await request(app.getHttpServer())
      .get(`/organizations/${orgId}/onboarding/agents/${agentProfile.id}/tasks`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(200);

    expect(Array.isArray(tasksRes.body)).toBe(true);
    expect(tasksRes.body.length).toBeGreaterThan(0);
    const taskId = tasksRes.body[0].id as string;

    const updateRes = await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/onboarding/tasks/${taskId}/status`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ status: 'COMPLETED' })
      .expect(200);
    expect(updateRes.body.status).toBe('COMPLETED');
    expect(updateRes.body.completedByUserId).toBe(user.id);

    const otherAgentEmail = `other_agent_${Date.now()}@example.com`;
    const { accessToken: otherToken } = await acceptInvite(orgId, otherAgentEmail);
    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/onboarding/tasks/${taskId}/status`)
      .set('Authorization', `Bearer ${otherToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ status: 'COMPLETED' })
      .expect(403);
  });

  it('exposes onboarding/offboarding metrics through mission control', async () => {
    const orgId = await createOrg(`Mission Control Org ${Date.now()}`);
    await createTemplate(orgId, { type: 'ONBOARDING', name: 'MC Onboarding', isDefault: true });
    await createTemplate(orgId, { type: 'OFFBOARDING', name: 'MC Offboarding', isDefault: true, tasks: [{ title: 'Revoke access' }] });
    const { agentProfile, accessToken } = await acceptInvite(orgId, `mc_agent_${Date.now()}@example.com`);

    await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/onboarding/generate`))
      .send({ agentProfileId: agentProfile.id })
      .expect(201);

    const onboardingOverview = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)
    ).expect(200);
    expect(onboardingOverview.body.onboarding.totalOnboardingTasksOpen).toBeGreaterThanOrEqual(1);

    await withBroker(
      orgId,
      request(app.getHttpServer()).patch(`/organizations/${orgId}/agents/profile/${agentProfile.id}/compliance`)
    )
      .send({ ceHoursRequired: 24, ceHoursCompleted: 4, requiresAction: true })
      .expect(200);

    const overviewRes = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)
    ).expect(200);

    expect(overviewRes.body.offboarding.agentsInOffboarding).toBeGreaterThanOrEqual(1);
    expect(overviewRes.body.offboarding.totalOffboardingTasksOpen).toBeGreaterThanOrEqual(1);

    const agentsRes = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/agents`)
    ).expect(200);
    const targetAgent = agentsRes.body.find((row: any) => row.agentProfileId === agentProfile.id);
    expect(targetAgent).toBeDefined();
    expect(targetAgent.lifecycleStage).toBe('OFFBOARDING');
    expect(targetAgent.offboardingTasksOpenCount).toBeGreaterThanOrEqual(1);

    await request(app.getHttpServer())
      .get(`/organizations/${orgId}/onboarding/agents/${agentProfile.id}/tasks`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(200);
  });
});
