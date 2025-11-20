import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 4 — Org Comms', () => {
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

  it('broker can create a channel and send a message', async () => {
    const orgRes = await withBroker(request(app.getHttpServer()).post('/organizations')).send({ name: `Comms Org ${Date.now()}` }).expect(201);
    const newOrgId = orgRes.body.id as string;

    const channel = await withBroker(request(app.getHttpServer()).post(`/organizations/${newOrgId}/comms/channels`)).send({ name: 'general' }).expect(201);
    const convId = channel.body.id as string;

    const sent = await withBroker(request(app.getHttpServer()).post(`/organizations/${newOrgId}/comms/messages`)).send({ conversationId: convId, content: 'Hello team!' }).expect(201);
    expect(sent.body.content).toBe('Hello team!');

    const list = await withBroker(request(app.getHttpServer()).get(`/organizations/${newOrgId}/comms/conversations/${convId}/messages`)).expect(200);
    const contents = (list.body ?? []).map((m: any) => m.content);
    expect(contents).toContain('Hello team!');
  });
});

