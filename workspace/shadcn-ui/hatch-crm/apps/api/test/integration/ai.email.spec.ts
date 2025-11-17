import request from 'supertest';
import jwt from 'jsonwebtoken';
import { ConsentChannel, ConsentScope, ConsentStatus, PersonStage } from '@hatch/db';

import { describeIf, RUN_INTEGRATION } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';

describeIf(RUN_INTEGRATION)('AI email composer endpoints', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let tenantId: string;
  let organizationId: string;
  let authHeader: string;

  beforeAll(async () => {
    app = await setupTestApp();
    const prisma = (app as any).prisma;

    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    organizationId = tenant.organizationId;

    const hotLeadBase = {
      tenantId,
      organizationId,
      firstName: 'AI',
      lastName: 'Recipient',
      stage: PersonStage.ACTIVE,
      lastActivityAt: new Date(),
      primaryEmail: 'ai-hot-lead@example.com',
      tags: ['hot'],
      source: 'integration-test'
    };

    const personOne = await prisma.person.upsert({
      where: { id: 'ai-segment-hot-1' },
      update: {
        stage: PersonStage.ACTIVE,
        lastActivityAt: new Date(),
        primaryEmail: 'ai-hot-lead@example.com'
      },
      create: {
        id: 'ai-segment-hot-1',
        ...hotLeadBase
      }
    });

    const personTwo = await prisma.person.upsert({
      where: { id: 'ai-segment-hot-2' },
      update: {
        stage: PersonStage.ACTIVE,
        lastActivityAt: new Date(),
        primaryEmail: 'ai-hot-lead-2@example.com'
      },
      create: {
        id: 'ai-segment-hot-2',
        ...hotLeadBase,
        primaryEmail: 'ai-hot-lead-2@example.com'
      }
    });

    await prisma.consent.upsert({
      where: { id: 'ai-consent-1' },
      update: {
        status: ConsentStatus.GRANTED
      },
      create: {
        id: 'ai-consent-1',
        tenantId,
        personId: personOne.id,
        channel: ConsentChannel.EMAIL,
        scope: ConsentScope.PROMOTIONAL,
        status: ConsentStatus.GRANTED,
        verbatimText: 'test opt-in',
        source: 'integration-test'
      }
    });

    await prisma.consent.upsert({
      where: { id: 'ai-consent-2' },
      update: {
        status: ConsentStatus.GRANTED
      },
      create: {
        id: 'ai-consent-2',
        tenantId,
        personId: personTwo.id,
        channel: ConsentChannel.EMAIL,
        scope: ConsentScope.PROMOTIONAL,
        status: ConsentStatus.GRANTED,
        verbatimText: 'test opt-in',
        source: 'integration-test'
      }
    });

    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    const token = jwt.sign(
      { sub: 'user-broker', tenantId, orgId: organizationId, role: 'AGENT' },
      secret,
      { expiresIn: '12h' }
    );
    authHeader = `Bearer ${token}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  const client = () =>
    request(app.getHttpServer())
      .set('Authorization', authHeader)
      .set('x-tenant-id', tenantId)
      .set('x-org-id', organizationId)
      .set('x-user-id', 'user-broker')
      .set('x-user-role', 'BROKER');

  it('creates an AI email draft for hot leads', async () => {
    const response = await client()
      .post('/ai/email-draft')
      .send({
        personaId: 'lead_nurse',
        contextType: 'segment',
        segmentKey: 'all_hot_leads',
        prompt: 'Remind them about upcoming tours.'
      })
      .expect(201);

    expect(typeof response.body.subject).toBe('string');
    expect(response.body.subject.length).toBeGreaterThan(0);
    expect(typeof response.body.html).toBe('string');
    expect(response.body.html.length).toBeGreaterThan(0);
  });

  it('sends a preview email to the hot-lead segment', async () => {
    const response = await client()
      .post('/email/send')
      .send({
        personaId: 'lead_nurse',
        subject: 'Integration test email',
        html: '<p>Test body</p>',
        segmentKey: 'all_hot_leads'
      })
      .expect(201);

    expect(response.body).toMatchObject({ success: true });
    expect(response.body.campaign).toBeDefined();
    expect(response.body.campaign.subject).toBe('Integration test email');

    const campaignsResponse = await client()
      .get('/marketing/campaigns')
      .expect(200);

    expect(campaignsResponse.body.campaigns[0].subject).toBe('Integration test email');
  });
});
