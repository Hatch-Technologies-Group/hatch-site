import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 2 — Org events', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let tenantId: string;
  let orgId: string;
  let brokerAuth: string;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    orgId = tenant.organizationId;

    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign({ sub: 'user-broker', tenantId, orgId, roles: ['broker'], role: 'BROKER' }, secret, { expiresIn: '2h' })}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const withBroker = (r: request.Test) => r.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  it('logs ORG_CREATED when creating an organization', async () => {
    const name = `Event Org ${Date.now()}`;
    const create = await withBroker(request(app.getHttpServer()).post('/organizations')).send({ name }).expect(201);
    const newOrgId = create.body.id as string;

    const events = await withBroker(request(app.getHttpServer()).get(`/organizations/${newOrgId}/events`)).expect(200);
    const types = (events.body ?? []).map((e: any) => e.type);
    expect(types).toContain('ORG_CREATED');
  });

  it('logs AGENT_INVITE_CREATED and AGENT_INVITE_ACCEPTED', async () => {
    const name = `Invite Org ${Date.now()}`;
    const create = await withBroker(request(app.getHttpServer()).post('/organizations')).send({ name }).expect(201);
    const newOrgId = create.body.id as string;

    const email = `inv_${Date.now()}@example.com`;
    const invite = await withBroker(request(app.getHttpServer()).post(`/organizations/${newOrgId}/invites`)).send({ email }).expect(201);
    const token = invite.body.token as string;

    await request(app.getHttpServer())
      .post('/agent-invites/accept')
      .set('x-tenant-id', tenantId)
      .set('x-org-id', newOrgId)
      .send({ token, password: 'Password!234', firstName: 'Foo', lastName: 'Bar' })
      .expect(201);

    const events = await withBroker(request(app.getHttpServer()).get(`/organizations/${newOrgId}/events`)).expect(200);
    const types = (events.body ?? []).map((e: any) => e.type);
    expect(types).toContain('AGENT_INVITE_CREATED');
    expect(types).toContain('AGENT_INVITE_ACCEPTED');
  });
});

