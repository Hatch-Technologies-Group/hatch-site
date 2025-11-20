import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 16 — MLS integration & search', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let server: any;
  let tenantId: string;
  let orgId: string;
  let brokerAuth: string;
  let jwtSecret: string;
  const listingPayload = {
    mlsNumber: `MLS-${Date.now()}`,
    mlsProvider: 'GENERIC',
    addressLine1: '123 Main St',
    city: 'Naples',
    state: 'FL',
    postalCode: '34102',
    country: 'US',
    propertyType: 'RESIDENTIAL',
    listPrice: 500000,
    bedrooms: 3,
    bathrooms: 2,
    squareFeet: 1800,
    isActive: true,
    isRental: false
  };

  beforeAll(async () => {
    app = await setupTestApp();
    server = app.getHttpServer();
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    orgId = tenant.organizationId;
    const brokerUser = await prisma.user.findFirstOrThrow({ where: { role: 'BROKER' } });
    jwtSecret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign(
      { sub: brokerUser.id, tenantId, orgId, roles: ['broker'], role: 'BROKER' },
      jwtSecret,
      { expiresIn: '2h' }
    )}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const withBroker = (req: request.Test) =>
    req.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  it('allows a broker to configure MLS feed options and fetch the config', async () => {
    const configureResponse = await withBroker(request(server).post(`/organizations/${orgId}/mls/configure`))
      .send({
        provider: 'GENERIC',
        officeCode: 'OFF-123',
        brokerId: 'BRK-900',
        boardName: 'Test Board',
        boardUrl: 'https://example-mls.test'
      })
      .expect(201);

    expect(configureResponse.body.organizationId).toBe(orgId);
    expect(configureResponse.body.officeCode).toBe('OFF-123');

    const configResponse = await withBroker(request(server).get(`/organizations/${orgId}/mls/config`)).expect(200);
    expect(configResponse.body.organizationId).toBe(orgId);
    expect(configResponse.body.boardName).toBe('Test Board');
  });

  it('ingests listings into the search index and surfaces them in results', async () => {
    await withBroker(request(server).post(`/organizations/${orgId}/mls/ingest`))
      .send(listingPayload)
      .expect(201);

    const response = await request(server)
      .get(`/organizations/${orgId}/mls/search`)
      .query({ query: 'Naples' })
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(response.body.total).toBeGreaterThan(0);
    expect(response.body.items.some((item: any) => item.mlsNumber === listingPayload.mlsNumber)).toBe(true);
  });
});
