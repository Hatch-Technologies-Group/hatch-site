import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 14 — Rentals & PM backbone', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let tenantId: string;
  let seedOrgId: string;
  let brokerAuth: string;
  let jwtSecret: string;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    seedOrgId = tenant.organizationId;
    jwtSecret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign(
      { sub: 'seed-broker', tenantId, orgId: seedOrgId, roles: ['broker'], role: 'BROKER' },
      jwtSecret,
      { expiresIn: '2h' }
    )}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const prisma = () => (app as any).prisma as import('@hatch/db').PrismaClient;

  const withBroker = (orgId: string, req: request.Test) =>
    req.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  const createOrg = async (name: string) => {
    const res = await withBroker(seedOrgId, request(app.getHttpServer()).post('/organizations'))
      .send({ name })
      .expect(201);
    return res.body.id as string;
  };

  const createRentalProperty = async (orgId: string) => {
    const res = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/rentals/properties`)
    )
      .send({
        addressLine1: '200 Ocean Dr',
        city: 'Miami',
        state: 'FL',
        postalCode: '33139',
        propertyType: 'CONDO',
        unitName: 'Unit 1A',
        bedrooms: 2,
        bathrooms: 2
      })
      .expect(201);
    return res.body as { id: string };
  };

  const createLease = async (orgId: string, unitId: string) => {
    const payload = {
      unitId,
      tenancyType: 'SEASONAL',
      tenantName: 'Seasonal Guest',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      rentAmount: 7500,
      requiresTaxFiling: true
    };
    const res = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/rentals/leases`)
    )
      .send(payload)
      .expect(201);
    return res.body as { id: string };
  };

  it('creates a rental property and default unit', async () => {
    const orgId = await createOrg(`Rentals Org ${Date.now()}`);
    const property = await createRentalProperty(orgId);

    const propertyInDb = await prisma().rentalProperty.findUniqueOrThrow({
      where: { id: property.id },
      include: { units: true }
    });
    expect(propertyInDb.organizationId).toBe(orgId);
    expect(propertyInDb.units.length).toBeGreaterThan(0);
  });

  it('creates a seasonal lease and auto generates tax schedule', async () => {
    const orgId = await createOrg(`Rentals Lease Org ${Date.now()}`);
    const property = await createRentalProperty(orgId);
    const unit = await prisma().rentalUnit.findFirstOrThrow({ where: { propertyId: property.id } });

    const lease = await createLease(orgId, unit.id);

    const schedules = await prisma().rentalTaxSchedule.findMany({ where: { leaseId: lease.id } });
    expect(schedules.length).toBeGreaterThan(0);
    expect(schedules[0].status).toBe('PENDING');
  });

  it('updates tax schedules and lease compliance', async () => {
    const orgId = await createOrg(`Rentals Tax Org ${Date.now()}`);
    const property = await createRentalProperty(orgId);
    const unit = await prisma().rentalUnit.findFirstOrThrow({ where: { propertyId: property.id } });
    const lease = await createLease(orgId, unit.id);
    const tax = await prisma().rentalTaxSchedule.findFirstOrThrow({ where: { leaseId: lease.id } });

    await withBroker(
      orgId,
      request(app.getHttpServer()).patch(`/organizations/${orgId}/rentals/taxes/${tax.id}`)
    )
      .send({ status: 'PAID', paidDate: new Date().toISOString() })
      .expect(200);

    const updated = await prisma().rentalTaxSchedule.findUniqueOrThrow({ where: { id: tax.id } });
    expect(updated.status).toBe('PAID');
    const leaseRecord = await prisma().rentalLease.findUniqueOrThrow({ where: { id: lease.id } });
    expect(leaseRecord.isCompliant).toBe(true);
  });

  it('surfaces rental metrics in mission control overview', async () => {
    const orgId = await createOrg(`Rentals Metrics Org ${Date.now()}`);
    const property = await createRentalProperty(orgId);
    const unit = await prisma().rentalUnit.findFirstOrThrow({ where: { propertyId: property.id } });
    const lease = await createLease(orgId, unit.id);
    await prisma().rentalTaxSchedule.updateMany({
      where: { leaseId: lease.id },
      data: { status: 'OVERDUE' }
    });

    const overview = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)
    ).expect(200);
    expect(overview.body.rentalStats.propertiesUnderManagement).toBeGreaterThanOrEqual(1);
    expect(overview.body.rentalStats.activeLeases).toBeGreaterThanOrEqual(1);
    expect(overview.body.rentalStats.overdueTaxCount).toBeGreaterThanOrEqual(1);
  });
});
