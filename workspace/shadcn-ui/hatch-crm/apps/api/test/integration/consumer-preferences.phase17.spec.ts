import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';
import { ConsumerPreferencesService } from '../../src/modules/consumer-preferences/consumer-preferences.service';

describeIf(RUN_INTEGRATION)('Phase 17 — Consumer preferences', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let server: any;
  let tenantId: string;
  let orgId: string;
  let jwtSecret: string;
  let brokerAuth: string;
  let consumerUser: import('@hatch/db').User;
  let consumerAuth: string;
  let prisma: import('@hatch/db').PrismaClient;
  let listingIndexId: string;

  const withBroker = (req: request.Test) => req.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);
  const withConsumer = (req: request.Test) => req.set('Authorization', consumerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  beforeAll(async () => {
    app = await setupTestApp();
    server = app.getHttpServer();
    prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    orgId = tenant.organizationId;
    jwtSecret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    const broker = await prisma.user.findFirstOrThrow({ where: { role: 'BROKER' } });
    brokerAuth = `Bearer ${jwt.sign(
      { sub: broker.id, orgId, tenantId, roles: ['broker'], role: 'BROKER' },
      jwtSecret,
      { expiresIn: '2h' }
    )}`;

    consumerUser =
      (await prisma.user.findFirst({ where: { role: 'CONSUMER' } })) ??
      (await prisma.user.create({
        data: {
          organizationId: orgId,
          tenantId,
          email: `consumer-${Date.now()}@example.com`,
          firstName: 'Portal',
          lastName: 'User',
          role: 'CONSUMER',
          passwordHash: null
        }
      }));
    consumerAuth = `Bearer ${jwt.sign(
      { sub: consumerUser.id, orgId, tenantId, roles: ['consumer'], role: 'CONSUMER' },
      jwtSecret,
      { expiresIn: '2h' }
    )}`;

    const listing = await prisma.listingSearchIndex.create({
      data: {
        organizationId: orgId,
        addressLine1: '123 Portal Ave',
        city: 'Naples',
        state: 'FL',
        postalCode: '34102',
        country: 'US',
        propertyType: 'RESIDENTIAL',
        listPrice: 550000,
        bedrooms: 3,
        bathrooms: 2,
        squareFeet: 1700,
        isActive: true,
        isRental: false,
        searchText: '123 portal ave naples fl 34102 residential'
      }
    });
    listingIndexId = listing.id;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects non-consumer saved listing access', async () => {
    await withBroker(request(server).post(`/organizations/${orgId}/consumer/saved-listings`))
      .send({ searchIndexId: listingIndexId })
      .expect(403);
  });

  it('consumer can manage saved listings and searches', async () => {
    await withConsumer(request(server).post(`/organizations/${orgId}/consumer/saved-listings`))
      .send({ searchIndexId: listingIndexId })
      .expect(201);

    const savedHomes = await withConsumer(request(server).get(`/organizations/${orgId}/consumer/saved-listings`)).expect(200);
    expect(savedHomes.body).toHaveLength(1);

    await withConsumer(request(server).delete(`/organizations/${orgId}/consumer/saved-listings/${listingIndexId}`)).expect(200);

    const createResponse = await withConsumer(request(server).post(`/organizations/${orgId}/consumer/saved-searches`))
      .send({
        name: 'Naples under 600k',
        criteria: { city: 'Naples', maxPrice: 600000 },
        frequency: 'DAILY'
      })
      .expect(201);

    const savedSearchId = createResponse.body.id as string;

    await withConsumer(request(server).patch(`/organizations/${orgId}/consumer/saved-searches/${savedSearchId}`))
      .send({ alertsEnabled: false })
      .expect(200);

    const searches = await withConsumer(request(server).get(`/organizations/${orgId}/consumer/saved-searches`)).expect(200);
    expect(searches.body).toHaveLength(1);

    await withConsumer(request(server).delete(`/organizations/${orgId}/consumer/saved-searches/${savedSearchId}`)).expect(200);
  });

  it('runs saved search alerts', async () => {
    const savedSearch = await prisma.savedSearch.create({
      data: {
        organizationId: orgId,
        consumerId: consumerUser.id,
        name: 'Naples alerts',
        criteria: { city: 'Naples' },
        alertsEnabled: true,
        frequency: 'INSTANT'
      }
    });

    const service = app.get(ConsumerPreferencesService);
    const result = await service.runSavedSearchAlertsForOrg(orgId, new Date());
    expect(result.results.some((entry) => entry.savedSearchId === savedSearch.id)).toBe(true);
    const events = await prisma.savedSearchAlertEvent.findMany({ where: { savedSearchId: savedSearch.id } });
    expect(events.length).toBeGreaterThan(0);
  });
});
