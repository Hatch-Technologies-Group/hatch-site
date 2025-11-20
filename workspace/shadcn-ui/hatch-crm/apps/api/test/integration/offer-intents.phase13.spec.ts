import request from 'supertest';
import jwt from 'jsonwebtoken';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('Phase 13 — Offer intents & messaging bridge backbone', () => {
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
    const res = await withBroker(
      seedOrgId,
      request(app.getHttpServer()).post('/organizations')
    )
      .send({ name })
      .expect(201);
    return res.body.id as string;
  };

  const createListing = async (orgId: string, agentProfileId?: string | null) => {
    const payload: Record<string, unknown> = {
      addressLine1: '400 Offer Way',
      city: 'Miami',
      state: 'FL',
      postalCode: '33101',
      listPrice: 600000
    };
    if (agentProfileId) {
      payload.agentProfileId = agentProfileId;
    }
    const res = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/listings`)
    )
      .send(payload)
      .expect(201);
    return res.body;
  };

  const registerConsumer = async (email: string) => {
    const res = await request(app.getHttpServer())
      .post('/auth/register-consumer')
      .send({ firstName: 'Portal', lastName: 'Buyer', email, password: 'Password!234' })
      .expect(201);
    return res.body.accessToken as string;
  };

  const acceptAgentInvite = async (orgId: string, email: string) => {
    const invite = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/invites`)
    )
      .send({ email })
      .expect(201);
    await request(app.getHttpServer())
      .post('/agent-invites/accept')
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ token: invite.body.token, password: 'Password!234', firstName: 'Agent', lastName: 'Offer' })
      .expect(201);
    const prismaClient = prisma();
    const agentUser = await prismaClient.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    const agentProfile = await prismaClient.agentProfile.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId: orgId, userId: agentUser.id } }
    });
    const agentAuth = `Bearer ${jwt.sign(
      { sub: agentUser.id, tenantId, orgId, roles: ['agent'], role: 'AGENT' },
      jwtSecret,
      { expiresIn: '2h' }
    )}`;
    return { agentUser, agentProfile, agentAuth };
  };

  it('creates a public offer intent, lead, and org event', async () => {
    const orgId = await createOrg(`Offer Org ${Date.now()}`);
    const listing = await createListing(orgId);

    const response = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/offer-intents/public`)
      .send({
        listingId: listing.id,
        offeredPrice: 475000,
        financingType: 'CASH',
        comments: 'Interested buyer ready to submit LOI'
      })
      .expect(201);

    expect(response.body.status).toBe('SUBMITTED');
    const prismaClient = prisma();
    const offer = await prismaClient.offerIntent.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(offer.organizationId).toBe(orgId);
    expect(offer.leadId).toBeTruthy();
    expect(offer.consumerId).toBeNull();

    const lead = await prismaClient.lead.findUniqueOrThrow({ where: { id: offer.leadId! } });
    expect(lead.source).toBe('LOI_SUBMISSION');

    const event = await prismaClient.orgEvent.findFirst({
      where: { organizationId: orgId, type: 'ORG_OFFER_INTENT_CREATED' },
      orderBy: { createdAt: 'desc' }
    });
    expect((event?.payload as any)?.offerIntentId).toBe(offer.id);
  });

  it('creates authenticated offer intents tied to the consumer lead', async () => {
    const orgId = await createOrg(`Offer Auth Org ${Date.now()}`);
    const listing = await createListing(orgId);
    const email = `consumer_${Date.now()}@example.com`;
    const accessToken = await registerConsumer(email);

    const response = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/offer-intents`)
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ listingId: listing.id, offeredPrice: 525000, closingTimeline: '45 days' })
      .expect(201);

    const prismaClient = prisma();
    const consumer = await prismaClient.user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
    expect(response.body.consumerId).toBe(consumer.id);

    const offer = await prismaClient.offerIntent.findUniqueOrThrow({ where: { id: response.body.id } });
    expect(offer.status).toBe('SUBMITTED');
    expect(offer.leadId).toBeTruthy();
    const lead = await prismaClient.lead.findUniqueOrThrow({ where: { id: offer.leadId! } });
    expect(lead.consumerId).toBe(consumer.id);
  });

  it('allows brokers and agents to list LOIs and update statuses with permissions', async () => {
    const orgId = await createOrg(`Offer Workflow Org ${Date.now()}`);
    const { agentProfile, agentAuth } = await acceptAgentInvite(orgId, `agent_loi_${Date.now()}@example.com`);
    const listingAssigned = await createListing(orgId, agentProfile.id);
    const listingOther = await createListing(orgId);

    const assignedOffer = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/offer-intents/public`)
      .send({ listingId: listingAssigned.id })
      .expect(201);
    const otherOffer = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/offer-intents/public`)
      .send({ listingId: listingOther.id })
      .expect(201);

    const brokerList = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/offer-intents`)
    ).expect(200);
    expect(brokerList.body.length).toBeGreaterThanOrEqual(2);

    const agentList = await request(app.getHttpServer())
      .get(`/organizations/${orgId}/offer-intents`)
      .set('Authorization', agentAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .expect(200);
    expect(agentList.body).toHaveLength(1);
    expect(agentList.body[0].id).toBe(assignedOffer.body.id);

    const transaction = await withBroker(
      orgId,
      request(app.getHttpServer()).post(`/organizations/${orgId}/transactions`)
    )
      .send({ listingId: listingAssigned.id, agentProfileId: agentProfile.id, buyerName: 'Buyer Offer' })
      .expect(201);

    await withBroker(
      orgId,
      request(app.getHttpServer()).patch(`/organizations/${orgId}/offer-intents/${assignedOffer.body.id}/status`)
    )
      .send({ status: 'ACCEPTED', transactionId: transaction.body.id })
      .expect(200);

    const prismaClient = prisma();
    const updated = await prismaClient.offerIntent.findUniqueOrThrow({
      where: { id: assignedOffer.body.id }
    });
    expect(updated.status).toBe('ACCEPTED');
    expect(updated.transactionId).toBe(transaction.body.id);

    const outsiderAuth = `Bearer ${jwt.sign(
      { sub: 'outsider-agent', tenantId, orgId: 'other-org', roles: ['agent'], role: 'AGENT' },
      jwtSecret,
      { expiresIn: '1h' }
    )}`;

    await request(app.getHttpServer())
      .patch(`/organizations/${orgId}/offer-intents/${otherOffer.body.id}/status`)
      .set('Authorization', outsiderAuth)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', orgId)
      .send({ status: 'DECLINED' })
      .expect(403);
  });

  it('surfaces LOI metrics inside mission control overview and agent rows', async () => {
    const orgId = await createOrg(`Offer Metrics Org ${Date.now()}`);
    const { agentProfile } = await acceptAgentInvite(orgId, `agent_metrics_${Date.now()}@example.com`);
    const listing = await createListing(orgId, agentProfile.id);

    const offerSubmitted = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/offer-intents/public`)
      .send({ listingId: listing.id })
      .expect(201);
    const offerUnderReview = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/offer-intents/public`)
      .send({ listingId: listing.id })
      .expect(201);
    const offerAccepted = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/offer-intents/public`)
      .send({ listingId: listing.id })
      .expect(201);
    const offerDeclined = await request(app.getHttpServer())
      .post(`/organizations/${orgId}/offer-intents/public`)
      .send({ listingId: listing.id })
      .expect(201);

    const updateStatus = (offerId: string, status: string) =>
      withBroker(
        orgId,
        request(app.getHttpServer()).patch(`/organizations/${orgId}/offer-intents/${offerId}/status`)
      )
        .send({ status })
        .expect(200);

    await updateStatus(offerUnderReview.body.id, 'UNDER_REVIEW');
    await updateStatus(offerAccepted.body.id, 'ACCEPTED');
    await updateStatus(offerDeclined.body.id, 'DECLINED');

    const overview = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/overview`)
    ).expect(200);
    expect(overview.body.loiStats.totalOfferIntents).toBeGreaterThanOrEqual(4);
    expect(overview.body.loiStats.submittedOfferIntents).toBeGreaterThanOrEqual(1);
    expect(overview.body.loiStats.underReviewOfferIntents).toBeGreaterThanOrEqual(1);
    expect(overview.body.loiStats.acceptedOfferIntents).toBeGreaterThanOrEqual(1);
    expect(overview.body.loiStats.declinedOfferIntents).toBeGreaterThanOrEqual(1);

    const agents = await withBroker(
      orgId,
      request(app.getHttpServer()).get(`/organizations/${orgId}/mission-control/agents`)
    ).expect(200);
    const row = agents.body.find((entry: any) => entry.agentProfileId === agentProfile.id);
    expect(row.offerIntentCount).toBeGreaterThanOrEqual(4);
    expect(row.acceptedOfferIntentCount).toBeGreaterThanOrEqual(1);
  });
});
