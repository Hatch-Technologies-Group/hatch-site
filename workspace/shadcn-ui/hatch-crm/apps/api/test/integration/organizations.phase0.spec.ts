import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 0 — Organizations', () => {
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
    const sign = (payload: Record<string, unknown>) =>
      `Bearer ${jwt.sign({ ...payload }, secret, { expiresIn: '2h' })}`;

    brokerAuth = sign({ sub: 'user-broker', tenantId, orgId, roles: ['broker'], role: 'BROKER' });
    agentAuth = sign({ sub: 'user-agent', tenantId, orgId, roles: ['agent'], role: 'AGENT' });
  });

  afterAll(async () => {
    await app?.close();
  });

  const withAuth = (auth: string, r: request.Test) =>
    r.set('Authorization', auth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  it('allows a broker to create an organization and lists it under /my', async () => {
    const name = `Test Org ${Date.now()}`;
    const res = await withAuth(brokerAuth, request(app.getHttpServer()).post('/organizations'))
      .send({ name })
      .expect(201);
    expect(res.body).toMatchObject({ name });

    const list = await withAuth(brokerAuth, request(app.getHttpServer()).get('/organizations/my')).expect(200);
    const names: string[] = (list.body ?? []).map((o: any) => o.name);
    expect(names).toContain(name);
  });

  it('rejects non-brokers from creating organizations', async () => {
    await withAuth(agentAuth, request(app.getHttpServer()).post('/organizations'))
      .send({ name: 'Nope Org' })
      .expect(403);
  });
});
