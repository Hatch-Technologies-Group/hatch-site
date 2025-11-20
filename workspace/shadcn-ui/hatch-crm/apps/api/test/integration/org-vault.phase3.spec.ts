import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 3 — Org Vault', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let seedTenantId: string;
  let seedOrgId: string;
  let brokerAuth: string;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    seedTenantId = tenant.id;
    seedOrgId = tenant.organizationId;
    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign({ sub: 'user-broker', tenantId: seedTenantId, orgId: seedOrgId, roles: ['broker'], role: 'BROKER' }, secret, { expiresIn: '2h' })}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const withBroker = (r: request.Test) => r.set('Authorization', brokerAuth).set('x-tenant-id', seedTenantId).set('x-org-id', seedOrgId);

  it('broker can create folder and see it listed', async () => {
    // Create a new org for isolation
    const orgRes = await withBroker(request(app.getHttpServer()).post('/organizations')).send({ name: `Vault Org ${Date.now()}` }).expect(201);
    const orgId = orgRes.body.id as string;

    const folder = await withBroker(request(app.getHttpServer()).post(`/organizations/${orgId}/vault/folders`)).send({ name: 'Contracts' }).expect(201);
    expect(folder.body.name).toBe('Contracts');

    const list = await withBroker(request(app.getHttpServer()).get(`/organizations/${orgId}/vault/folders`)).expect(200);
    const names = (list.body.folders ?? []).map((f: any) => f.name);
    expect(names).toContain('Contracts');
  });

  it('agent can upload file metadata and see it', async () => {
    // Create org and invite agent
    const orgRes = await withBroker(request(app.getHttpServer()).post('/organizations')).send({ name: `Vault Org Agent ${Date.now()}` }).expect(201);
    const orgId = orgRes.body.id as string;
    const email = `vault_agent_${Date.now()}@example.com`;
    const invite = await withBroker(request(app.getHttpServer()).post(`/organizations/${orgId}/invites`)).send({ email }).expect(201);
    const token = invite.body.token as string;

    const accept = await request(app.getHttpServer())
      .post('/agent-invites/accept')
      .set('x-tenant-id', seedTenantId)
      .set('x-org-id', orgId)
      .send({ token, password: 'Password!234', firstName: 'Vault', lastName: 'Agent' })
      .expect(201);

    const agentAuth = `Bearer ${accept.body.accessToken}`;
    const withAgent = (r: request.Test) => r.set('Authorization', agentAuth).set('x-tenant-id', seedTenantId).set('x-org-id', orgId);

    const file = await withAgent(request(app.getHttpServer()).post(`/organizations/${orgId}/vault/files`))
      .send({
        name: 'Standard Purchase Contract',
        category: 'CONTRACT_TEMPLATE',
        storageKey: `test/contracts/${Date.now()}-standard.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: 12345
      })
      .expect(201);

    expect(file.body.name).toBe('Standard Purchase Contract');
    expect(file.body.category).toBe('CONTRACT_TEMPLATE');

    const list = await withAgent(request(app.getHttpServer()).get(`/organizations/${orgId}/vault/folders`)).expect(200);
    const fileNames = (list.body.files ?? []).map((f: any) => f.name);
    expect(fileNames).toContain('Standard Purchase Contract');
  });
});

