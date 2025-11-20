import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 1 — Broker invites', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let tenantId: string;
  let orgId: string;
  let brokerAuth: string;
  let agentAuth: string;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    orgId = tenant.organizationId;
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign({ sub: 'user-broker', tenantId, orgId, roles: ['broker'], role: 'BROKER' }, secret, { expiresIn: '2h' })}`;
    agentAuth = `Bearer ${jwt.sign({ sub: 'user-agent', tenantId, orgId, roles: ['agent'], role: 'AGENT' }, secret, { expiresIn: '2h' })}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const withAuth = (auth: string, r: request.Test) =>
    r.set('Authorization', auth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  it('broker can create and list invites', async () => {
    const email = `agent_${Date.now()}@example.com`;
    const create = await withAuth(
      brokerAuth,
      request(app.getHttpServer()).post(`/organizations/${orgId}/invites`)
    )
      .send({ email })
      .expect(201);
    expect(create.body.email).toBe(email.toLowerCase());
    expect(create.body.status).toBe('PENDING');
    expect(typeof create.body.token).toBe('string');

    const list = await withAuth(
      brokerAuth,
      request(app.getHttpServer()).get(`/organizations/${orgId}/invites`)
    ).expect(200);
    const emails = (list.body ?? []).map((i: any) => i.email);
    expect(emails).toContain(email.toLowerCase());
  });

  it('non-broker cannot create invites', async () => {
    const email = `agent2_${Date.now()}@example.com`;
    await withAuth(
      agentAuth,
      request(app.getHttpServer()).post(`/organizations/${orgId}/invites`)
    )
      .send({ email })
      .expect(403);
  });
});
