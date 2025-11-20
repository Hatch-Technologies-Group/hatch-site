import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 15 — Accounting backbone & QuickBooks integration', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let tenantId: string;
  let seedOrgId: string;
  let brokerAuth: string;
  let brokerUserId: string;
  let jwtSecret: string;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    seedOrgId = tenant.organizationId;
    const brokerUser = await prisma.user.findFirstOrThrow({ where: { role: 'BROKER' } });
    brokerUserId = brokerUser.id;
    jwtSecret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign(
      { sub: brokerUserId, tenantId, orgId: seedOrgId, roles: ['broker'], role: 'BROKER' },
      jwtSecret,
      { expiresIn: '2h' }
    )}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const prisma = () => (app as any).prisma as import('@hatch/db').PrismaClient;
  const server = () => app.getHttpServer();

  const withBroker = (orgId: string, req: request.Test) =>
    req.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  const createOrg = async (name: string) => {
    const slug = `acct-${Date.now()}`;
    const org = await prisma().organization.create({
      data: {
        name,
        slug,
        createdByUserId: brokerUserId
      }
    });
    await prisma().userOrgMembership.upsert({
      where: { userId_orgId: { userId: brokerUserId, orgId: org.id } },
      update: {},
      create: { userId: brokerUserId, orgId: org.id }
    });
    return org.id;
  };

  const createListing = async (orgId: string) => {
    return prisma().orgListing.create({
      data: {
        organizationId: orgId,
        addressLine1: '500 Market St',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94105',
        listPrice: 750000,
        createdByUserId: brokerUserId
      }
    });
  };

  const createTransaction = async (orgId: string, listingId: string) => {
    return prisma().orgTransaction.create({
      data: {
        organizationId: orgId,
        listingId,
        status: 'CLOSED',
        closingDate: new Date(),
        buyerName: 'Buyer One',
        sellerName: 'Seller One',
        createdByUserId: brokerUserId
      }
    });
  };

  const createRentalProperty = async (orgId: string) => {
    const res = await withBroker(
      orgId,
      request(server()).post(`/organizations/${orgId}/rentals/properties`)
    )
      .send({
        addressLine1: '44 Ocean Dr',
        city: 'Miami',
        state: 'FL',
        postalCode: '33139',
        propertyType: 'CONDO',
        unitName: 'Unit 4'
      })
      .expect(201);
    return res.body as { id: string };
  };

  const createRentalLease = async (orgId: string, unitId: string) => {
    const payload = {
      unitId,
      tenancyType: 'ANNUAL',
      tenantName: 'PM Resident',
      tenantContact: 'pm-resident@example.com',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
      rentAmount: 5400,
      requiresTaxFiling: false
    };
    const res = await withBroker(
      orgId,
      request(server()).post(`/organizations/${orgId}/rentals/leases`)
    )
      .send(payload)
      .expect(201);
    return res.body as { id: string };
  };

  it('connects QuickBooks config, syncs records, lists queue, and surfaces metrics', async () => {
    const orgId = await createOrg(`Accounting Org ${Date.now()}`);

    await withBroker(
      orgId,
      request(server()).post(`/organizations/${orgId}/accounting/connect`)
    )
      .send({ provider: 'QUICKBOOKS', realmId: 'test-realm' })
      .expect(201);

    const listing = await createListing(orgId);
    const transaction = await createTransaction(orgId, listing.id);

    await withBroker(
      orgId,
      request(server()).post(`/organizations/${orgId}/accounting/sync-transaction`)
    )
      .send({ transactionId: transaction.id })
      .expect(201);

    const property = await createRentalProperty(orgId);
    const unit = await prisma().rentalUnit.findFirstOrThrow({ where: { propertyId: property.id } });
    const lease = await createRentalLease(orgId, unit.id);

    await withBroker(
      orgId,
      request(server()).post(`/organizations/${orgId}/accounting/sync-lease`)
    )
      .send({ leaseId: lease.id })
      .expect(201);

    const syncStatusRes = await withBroker(
      orgId,
      request(server()).get(`/organizations/${orgId}/accounting/sync-status`)
    ).expect(200);
    expect(syncStatusRes.body.transactions.length).toBeGreaterThanOrEqual(1);
    expect(syncStatusRes.body.rentalLeases.length).toBeGreaterThanOrEqual(1);
    expect(syncStatusRes.body.transactions[0].syncStatus).toBe('SYNCED');
    expect(syncStatusRes.body.rentalLeases[0].syncStatus).toBe('SYNCED');

    const overview = await withBroker(
      orgId,
      request(server()).get(`/organizations/${orgId}/mission-control/overview`)
    ).expect(200);
    expect(overview.body.financialStats.transactionsSyncedCount).toBeGreaterThanOrEqual(1);
    expect(overview.body.financialStats.rentalLeasesSyncedCount).toBeGreaterThanOrEqual(1);
    expect(overview.body.financialStats.estimatedGci).toBeGreaterThan(0);
    expect(overview.body.financialStats.estimatedPmIncome).toBeGreaterThan(0);
  });
});
