import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 12 — Leads & consumer portal', () => {
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

  const createListing = async (orgId: string, agentProfileId?: string | null) => {
    const payload: Record<string, unknown> = {
      addressLine1: '500 Portal Way',
      city: 'Miami',
      state: 'FL',
      postalCode: '33101',
      listPrice: 550000
    };
    if (agentProfileId) {
      payload.agentProfileId = agentProfileId;
    }
    const res = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/listings`))
      .send(payload)
      .expect(201);
    return res.body;
  };

  const registerConsumer = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/register-consumer')
      .send({ firstName: 'Portal', lastName: 'User', email, password: 'Password!234' })
      .expect(201);
    return res.body.accessToken as string;
  };

  const acceptAgentInvite = async (orgId: string, email: string) => {
    const invite = await withBroker(orgId, request(app.getHttpServer()).post(`/organizations/${orgId}/invites`))
      .send({ email })
      .expect(201);
    await request(app.getHttpServer())
      .post('/agent-invites/accept')
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ token: invite.body.token, password: 'Password!234', firstName: 'Agent', lastName: 'Lead' })
      .expect(201);
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const agentUser = await prisma.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const agentProfile = await prisma.agentProfile.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgId, userId: agentUser.id } }
    });
    return { agentUser, agentProfile };
  };

  it('creates a lead from the public portal endpoint', async () => {
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const orgId = await createOrg(`Portal Org ${Date.now()}`);
    const listing = await createListing(orgId);

    const res = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/leads/public`)
      .send({ listingId: listing.id, name: 'Portal Buyer', email: 'buyer@example.com', message: 'Interested' })
      .expect(201);

    expect(res.body.organizationId).toBe(orgId);
    expect(res.body.listingId).toBe(listing.id);
    expect(res.body.consumerId).toBeNull();

    const leadInDb = await prisma.lead.findUniqueOrThrow({ where: { id: res.body.id } });
    expect(leadInDb.source).toBe('LISTING_INQUIRY');
  });

  it('creates a lead for an authenticated consumer', async () => {
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const orgId = await createOrg(`Portal Auth Org ${Date.now()}`);
    const listing = await createListing(orgId);
    const email = `consumer_${Date.now()}@example.com`;
    const accessToken = await registerConsumer(email);

    const leadRes = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/leads`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ listingId: listing.id, message: 'Schedule a tour' })
      .expect(201);

    expect(leadRes.body.consumerId).toBeDefined();
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadRes.body.id } });
    expect(lead.email).toBe(email.toLowerCase());
  });

  it('lists leads and allows brokers to update status and assignment', async () => {
    const prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    const orgId = await createOrg(`Lead Routing Org ${Date.now()}`);
    const { agentUser, agentProfile } = await acceptAgentInvite(orgId, `agent_${Date.now()}@example.com`);
    const listing = await createListing(orgId, agentProfile.id);

    await request(app.getHttpServer())
      .post(`/organizations/${orgId}/leads/public`)
      .send({ listingId: listing.id, name: 'Assigned Lead', email: 'assigned@example.com' })
      .expect(201);
    await request(app.getHttpServer())
      .post(`/organizations/${orgId}/leads/public`)
      .send({ name: 'Unassigned Lead', email: 'unassigned@example.com' })
      .expect(201);

    const brokerList = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/leads`)).expect(200);
    expect(brokerList.body.length).toBeGreaterThanOrEqual(2);

    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    const agentAuth = `Bearer ${jwt.sign(
      { sub: agentUser.id, tenantId, orgId, roles: ['agent'], role: 'AGENT' },
      secret,
      { expiresIn: '2h' }
    )}`;
    const agentList = await request(app.getHttpServer())
      .get(`/organizations/${orgId}/leads`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(200);
    expect(agentList.body.length).toBe(1);

    const leadId = brokerList.body.find((lead: any) => lead.status === 'NEW').id as string;

    await withBroker(orgId, request(app.getHttpServer()).patch(`/organizations/${orgId}/leads/${leadId}/status`))
      .send({ status: 'QUALIFIED', agentProfileId: agentProfile.id })
      .expect(200);

    const updated = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    expect(updated.status).toBe('QUALIFIED');
    expect(updated.agentProfileId).toBe(agentProfile.id);

    const randomAuth = `Bearer ${jwt.sign({ sub: 'random-user', tenantId, orgId, roles: ['agent'], role: 'AGENT' }, secret, {
      expiresIn: '1h'
    })}`;
    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/leads/${leadId}/status`)
      .set('Authorization', randomAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ status: 'CLOSED' })
      .expect(403);
  });

  it('includes lead statistics in mission control overview', async () => {
    const orgId = await createOrg(`Lead Metrics Org ${Date.now()}`);
    const listing = await createListing(orgId);

    const leadA = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/leads/public`)
      .send({ listingId: listing.id, name: 'Lead A', email: 'a@example.com' })
      .expect(201);
    const leadB = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/leads/public`)
      .send({ name: 'Lead B', email: 'b@example.com' })
      .expect(201);

    await withBroker(orgId, request(app.getHttpServer()).patch(`/organizations/${orgId}/leads/${leadA.body.id}/status`))
      .send({ status: 'CONTACTED' })
      .expect(200);
    await withBroker(orgId, request(app.getHttpServer()).patch(`/organizations/${orgId}/leads/${leadB.body.id}/status`))
      .send({ status: 'APPOINTMENT_SET' })
      .expect(200);

    const overview = await withBroker(orgId, request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)).expect(200);
    expect(overview.body.leadStats.totalLeads).toBeGreaterThanOrEqual(2);
    expect(overview.body.leadStats.contactedLeads).toBeGreaterThanOrEqual(1);
    expect(overview.body.leadStats.appointmentsSet).toBeGreaterThanOrEqual(1);
  });
});
