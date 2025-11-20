import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 8 — Transactions backbone', () => {
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
    const res = await withBroker(seedOrgId, request(app.getHttpServer()).post('/organizations'))
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
      .send({ token, password: 'Password!234', firstName: 'Txn', lastName: 'Agent' })
      .expect(201);
  };

  const createAgentProfile = (orgId: string, userId: string) =>
    withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/agents/profile`))
      .send({ userId })
      .expect(201);

  const createOrgFile = async (orgId: string, ownerId: string, label: string) => {
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const fileObject = await prisma.fileObject.create({
      data: {
        orgId,
        ownerId,
        fileName: `${label}.pdf`,
        storageKey: `org/${orgId}/${Date.now()}-${label}`,
        byteSize: 456
      }
    });
    return prisma.orgFile.create({
      data: {
        orgId,
        name: `${label} Doc`,
        category: 'CONTRACT_TEMPLATE',
        fileId: fileObject.id,
        uploadedByUserId: ownerId
      }
    });
  };

  const createListing = async (orgId: string, agentToken: string, agentProfileId?: string) => {
    const res = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/listings`)
      .set('Authorization', agentToken)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({
        agentProfileId,
        addressLine1: '111 Ocean Dr',
        city: 'Miami Beach',
        state: 'FL',
        postalCode: '33139'
      })
      .expect(201);
    return res.body.id as string;
  };

  it('tracks transaction lifecycle and surfaces mission control metrics', async () => {
    const orgId = await createOrg(`Transactions Org ${Date.now()}`);
    const agentEmail = `txn_agent_${Date.now()}@example.com`;
    await acceptInvite(orgId, agentEmail);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: agentEmail.toLowerCase() } });
    const profileRes = await createAgentProfile(orgId, agentUser.id);
    const agentProfileId = profileRes.body.id as string;

    const agentToken = `Bearer ${jwt.sign(
      { sub: agentUser.id, tenantId, orgId, roles: ['agent'], role: 'AGENT' },
      process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret',
      { expiresIn: '1h' }
    )}`;

    const listingId = await createListing(orgId, agentToken, agentProfileId);

    const transaction = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/transactions`)
    )
      .send({
        listingId,
        agentProfileId,
        buyerName: 'Buyer One',
        sellerName: 'Seller One',
        contractSignedAt: new Date().toISOString()
      })
      .expect(201);
    const transactionId = transaction.body.id as string;

    await withBroker(orgId, request(app.getHttpServer()).patch(`/organizations/${orgId}/transactions/${transactionId}`))
      .send({ status: 'UNDER_CONTRACT', isCompliant: false, requiresAction: true, complianceNotes: 'Missing addendum' })
      .expect(200);

    const agentUpdate = await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/transactions/${transactionId}`)
      .set('Authorization', agentToken)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ inspectionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() })
      .expect(200);
    expect(agentUpdate.body.inspectionDate).toBeTruthy();

    const orgFile = await createOrgFile(orgId, agentUser.id, 'executed-contract');
    await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/transactions/${transactionId}/documents`)
    )
      .send({ orgFileId: orgFile.id, type: 'EXECUTED_CONTRACT' })
      .expect(201);

    const overview = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)
    ).expect(200);
    expect(overview.body.transactions.total).toBeGreaterThanOrEqual(1);
    expect(overview.body.transactions.nonCompliant).toBeGreaterThanOrEqual(1);

    const agents = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/agents`)
    ).expect(200);
    const row = agents.body.find((entry: any) => entry.agentProfileId === agentProfileId);
    expect(row.transactionCount).toBeGreaterThanOrEqual(1);
    expect(row.nonCompliantTransactionCount).toBeGreaterThanOrEqual(1);
  });

  it('blocks non-members from updating transactions', async () => {
    const orgId = await createOrg(`Transactions Guard Org ${Date.now()}`);
    const transaction = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/transactions`)
    )
      .send({ buyerName: 'Guard Buyer' })
      .expect(201);
    const outsider = `Bearer ${jwt.sign(
      { sub: 'outsider', tenantId, orgId: 'other-org', roles: ['agent'], role: 'AGENT' },
      process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret',
      { expiresIn: '1h' }
    )}`;

    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/transactions/${transaction.body.id}`)
      .set('Authorization', outsider)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ buyerName: 'Hacker' })
      .expect(403);
  });
});
