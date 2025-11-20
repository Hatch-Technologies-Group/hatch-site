import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 9 — AI Broker Assistant & Compliance', () => {
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
    const res = await withBroker(
      seedOrgId,
      request(app.getHttpServer()).post('/organizations')
    )
      .send({ name })
      .expect(201);
    return res.body.id as string;
  };

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
      .send({ token, password: 'Password!234', firstName: 'AI', lastName: 'Agent' })
      .expect(201);
  };

  const createAgentProfile = async (orgId: string, userId: string) =>
    withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({ userId })
      .expect(201);

  const createOrgFile = async (orgId: string, ownerId: string, label: string, category: string = 'COMPLIANCE') => {
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const fileObject = await prisma.fileObject.create({
      data: {
        orgId,
        ownerId,
        fileName: `${label}.pdf`,
        byteSize: 256,
        storageKey: `org/${orgId}/${Date.now()}-${label}`
      }
    });
    const file = await prisma.orgFile.create({
      data: {
        orgId,
        name: `${label} File`,
        description: 'AI reference doc',
        category: category as any,
        fileId: fileObject.id,
        uploadedByUserId: ownerId
      }
    });
    return file;
  };

  const createListing = async (orgId: string, agentProfileId?: string) => {
    const res = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/listings`)
    )
      .send({
        agentProfileId,
        addressLine1: '500 AI Way',
        city: 'Miami',
        state: 'FL',
        postalCode: '33101',
        listPrice: 750000
      })
      .expect(201);
    return res.body.id as string;
  };

  const createTransaction = async (orgId: string, listingId?: string, agentProfileId?: string) => {
    const res = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/transactions`)
    )
      .send({
        listingId,
        agentProfileId,
        buyerName: 'AI Buyer',
        sellerName: 'AI Seller'
      })
      .expect(201);
    return res.body.id as string;
  };

  it('answers broker assistant questions with org context', async () => {
    const orgId = await createOrg(`AI Broker Org ${Date.now()}`);
    const email = `ai_broker_${Date.now()}@example.com`;
    await acceptInvite(orgId, email);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    await createAgentProfile(orgId, agentUser.id);
    await createOrgFile(orgId, agentUser.id, 'Policies', 'COMPLIANCE');

    const askRes = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/ai-broker/ask`)
    )
      .send({ question: 'What documents do I need for a new listing?', contextType: 'GENERAL' })
      .expect(200);
    expect(typeof askRes.body.answer).toBe('string');
    expect(askRes.body.answer.length).toBeGreaterThan(0);
  });

  it('evaluates listing compliance and logs events', async () => {
    const orgId = await createOrg(`AI Listing Org ${Date.now()}`);
    const email = `ai_listing_${Date.now()}@example.com`;
    await acceptInvite(orgId, email);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const profile = await createAgentProfile(orgId, agentUser.id);
    const listingId = await createListing(orgId, profile.body.id);
    await createOrgFile(orgId, agentUser.id, 'Listing Agreement', 'CONTRACT_TEMPLATE');

    const evalRes = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/ai-broker/evaluate-compliance`)
    )
      .send({ targetType: 'LISTING', listingId })
      .expect(200);
    expect(['LOW', 'MEDIUM', 'HIGH']).toContain(evalRes.body.riskLevel);
    expect(Array.isArray(evalRes.body.issues)).toBe(true);

    const events = await prisma.orgEvent.findMany({
      where: { organizationId: orgId, type: 'ORG_LISTING_EVALUATED' }
    });
    expect(events.length).toBeGreaterThan(0);
  });

  it('evaluates transaction compliance and updates flags', async () => {
    const orgId = await createOrg(`AI Transaction Org ${Date.now()}`);
    const email = `ai_txn_${Date.now()}@example.com`;
    await acceptInvite(orgId, email);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const profile = await createAgentProfile(orgId, agentUser.id);
    const listingId = await createListing(orgId, profile.body.id);
    const transactionId = await createTransaction(orgId, listingId, profile.body.id);

    await createOrgFile(orgId, agentUser.id, 'Contract Checklist', 'COMPLIANCE');

    const evalRes = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/ai-broker/evaluate-compliance`)
    )
      .send({ targetType: 'TRANSACTION', transactionId })
      .expect(200);
    expect(evalRes.body).toHaveProperty('issues');

    const transaction = await prisma.orgTransaction.findUniqueOrThrow({ where: { id: transactionId } });
    expect(transaction.requiresAction).toBeDefined();
  });

  it('enforces membership and broker role', async () => {
    const orgId = await createOrg(`AI Guard Org ${Date.now()}`);
    const outsider = `Bearer ${jwt.sign(
      { sub: 'outsider', tenantId, orgId: 'no-org', roles: ['agent'], role: 'AGENT' },
      process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret',
      { expiresIn: '1h' }
    )}`;

    await request(app.getHttpServer())
      .post(`/organizations/${orgId}/ai-broker/ask`)
      .set('Authorization', outsider)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ question: 'test' })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/organizations/${orgId}/ai-broker/evaluate-compliance`)
      .set('Authorization', outsider)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ targetType: 'LISTING', listingId: 'fake' })
      .expect(403);
  });

  it('surfaces AI compliance metrics in mission control', async () => {
    const orgId = await createOrg(`AI Metrics Org ${Date.now()}`);
    const email = `ai_metrics_${Date.now()}@example.com`;
    await acceptInvite(orgId, email);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const profile = await createAgentProfile(orgId, agentUser.id);
    const listingId = await createListing(orgId, profile.body.id);
    const transactionId = await createTransaction(orgId, listingId, profile.body.id);

    await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/ai-broker/evaluate-compliance`)
    )
      .send({ targetType: 'LISTING', listingId })
      .expect(200);

    await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/ai-broker/evaluate-compliance`)
    )
      .send({ targetType: 'TRANSACTION', transactionId })
      .expect(200);

    const overview = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)
    ).expect(200);
    expect(overview.body.aiCompliance.evaluationsLast30Days).toBeGreaterThanOrEqual(2);
  });
});
