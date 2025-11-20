import jwt from 'jsonwebtoken';
import request from 'supertest';

import { AnalyticsGranularity } from '@hatch/db';

import { RUN_INTEGRATION, describeIf } from '../helpers/cond';
import { setupTestApp } from '../setupTestApp';
import { ReportingService } from '@/modules/reporting/reporting.service';

const DAY_MS = 24 * 60 * 60 * 1000;

describeIf(RUN_INTEGRATION)('Phase 19 — Reporting & Analytics Suite', () => {
  let app: Awaited<ReturnType<typeof setupTestApp>>;
  let server: any;
  let prisma: import('@hatch/db').PrismaClient;
  let tenantId: string;
  let orgId: string;
  let brokerAuth: string;
  let agentProfileId: string;
  let reportingService: ReportingService;

  beforeAll(async () => {
    app = await setupTestApp();
    server = app.getHttpServer();
    prisma = (app as any).prisma as import('@hatch/db').PrismaClient;
    reportingService = app.get(ReportingService);

    const tenant = await prisma.tenant.findFirstOrThrow();
    tenantId = tenant.id;
    orgId = tenant.organizationId;

    const secret = process.env.JWT_ACCESS_SECRET ?? process.env.API_JWT_SECRET ?? 'dev-secret';
    brokerAuth = `Bearer ${jwt.sign(
      { sub: 'user-broker', tenantId, orgId, roles: ['broker'], role: 'BROKER' },
      secret,
      { expiresIn: '2h' }
    )}`;

    const agentUser = await prisma.user.create({
      data: {
        organizationId: orgId,
        tenantId,
        email: `agent-analytics-${Date.now()}@example.com`,
        firstName: 'Agent',
        lastName: 'Analytics',
        role: 'AGENT'
      }
    });

    await prisma.userOrgMembership.create({
      data: {
        userId: agentUser.id,
        orgId
      }
    });

    const agentProfile = await prisma.agentProfile.create({
      data: {
        organizationId: orgId,
        userId: agentUser.id,
        title: 'Advisor'
      }
    });
    agentProfileId = agentProfile.id;

    const listing = await prisma.orgListing.create({
      data: {
        organizationId: orgId,
        agentProfileId,
        addressLine1: '100 Main St',
        city: 'Naples',
        state: 'FL',
        postalCode: '34102',
        listPrice: 450000,
        createdByUserId: agentUser.id
      }
    });

    const leads = await Promise.all(
      [
        { status: 'NEW', name: 'New Lead' },
        { status: 'CONTACTED', name: 'Contacted Lead' },
        { status: 'QUALIFIED', name: 'Qualified Lead' },
        { status: 'UNDER_CONTRACT', name: 'UC Lead' },
        { status: 'CLOSED', name: 'Closed Lead' }
      ].map((lead) =>
        prisma.lead.create({
          data: {
            organizationId: orgId,
            agentProfileId,
            status: lead.status as any,
            name: lead.name
          }
        })
      )
    );

    await prisma.offerIntent.create({
      data: {
        organizationId: orgId,
        listingId: listing.id,
        leadId: leads[0].id,
        status: 'SUBMITTED'
      }
    });

    await prisma.offerIntent.create({
      data: {
        organizationId: orgId,
        listingId: listing.id,
        leadId: leads[1].id,
        status: 'UNDER_REVIEW'
      }
    });

    await prisma.offerIntent.create({
      data: {
        organizationId: orgId,
        listingId: listing.id,
        leadId: leads[2].id,
        status: 'ACCEPTED'
      }
    });

    await prisma.offerIntent.create({
      data: {
        organizationId: orgId,
        listingId: listing.id,
        leadId: leads[3].id,
        status: 'DECLINED'
      }
    });

    const closedTransaction = await prisma.orgTransaction.create({
      data: {
        organizationId: orgId,
        listingId: listing.id,
        agentProfileId,
        status: 'CLOSED',
        closingDate: new Date(),
        createdByUserId: agentUser.id
      }
    });

    const property = await prisma.rentalProperty.create({
      data: {
        organizationId: orgId,
        addressLine1: '222 Ocean Blvd',
        city: 'Naples',
        state: 'FL',
        postalCode: '34102'
      }
    });

    const unit = await prisma.rentalUnit.create({
      data: {
        propertyId: property.id,
        name: 'Unit 1'
      }
    });

    await prisma.rentalLease.create({
      data: {
        organizationId: orgId,
        unitId: unit.id,
        tenantName: 'Tenant One',
        startDate: new Date(Date.now() - DAY_MS * 2),
        endDate: new Date(Date.now() + DAY_MS * 30),
        rentAmount: 4000,
        transactionId: closedTransaction.id
      }
    });

    const consumer = await prisma.user.create({
      data: {
        organizationId: orgId,
        tenantId,
        email: `consumer-${Date.now()}@example.com`,
        firstName: 'Consumer',
        lastName: 'Analytics',
        role: 'CONSUMER'
      }
    });

    await prisma.userOrgMembership.create({
      data: {
        userId: consumer.id,
        orgId
      }
    });

    const searchIndex = await prisma.listingSearchIndex.create({
      data: {
        organizationId: orgId,
        addressLine1: '55 Harbor Dr',
        city: 'Naples',
        state: 'FL',
        postalCode: '34102',
        searchText: '55 Harbor'
      }
    });

    await prisma.savedListing.create({
      data: {
        organizationId: orgId,
        consumerId: consumer.id,
        searchIndexId: searchIndex.id
      }
    });

    await prisma.savedSearch.create({
      data: {
        organizationId: orgId,
        consumerId: consumer.id,
        name: 'Beach Homes',
        criteria: { city: 'Naples' }
      }
    });

    await prisma.aiCopilotActionRecommendation.create({
      data: {
        organizationId: orgId,
        agentProfileId,
        title: 'Follow up with leads',
        status: 'SUGGESTED'
      }
    });

    await prisma.aiCopilotActionRecommendation.create({
      data: {
        organizationId: orgId,
        agentProfileId,
        title: 'Send listing docs',
        status: 'ACCEPTED'
      }
    });

    await prisma.aiCopilotActionRecommendation.create({
      data: {
        organizationId: orgId,
        agentProfileId,
        title: 'Close deal',
        status: 'COMPLETED'
      }
    });
  });

  afterAll(async () => {
    await app?.close();
  });

  const withBroker = (req: request.Test) =>
    req.set('Authorization', brokerAuth).set('x-tenant-id', tenantId).set('x-org-id', orgId);

  it('computes daily snapshots for orgs and agents', async () => {
    const snapshotDate = new Date();
    await reportingService.computeDailyAnalyticsForOrg(orgId, snapshotDate);
    const dayKey = new Date(Date.UTC(snapshotDate.getUTCFullYear(), snapshotDate.getUTCMonth(), snapshotDate.getUTCDate()));

    const orgDaily = await prisma.orgDailyAnalytics.findUnique({
      where: {
        organizationId_date_granularity: {
          organizationId: orgId,
          date: dayKey,
          granularity: AnalyticsGranularity.DAILY
        }
      }
    });

    expect(orgDaily).toBeTruthy();
    expect(orgDaily?.leadsNewCount).toBe(5);
    expect(orgDaily?.leadsQualifiedCount).toBe(1);
    expect(orgDaily?.offerIntentsSubmittedCount).toBe(2);
    expect(orgDaily?.offerIntentsAcceptedCount).toBe(1);
    expect(orgDaily?.offerIntentsDeclinedCount).toBe(1);
    expect(orgDaily?.transactionsClosedCount).toBe(1);
    expect(orgDaily?.transactionsClosedVolume).toBe(450000);
    expect(orgDaily?.activeLeasesCount).toBe(1);
    expect(orgDaily?.pmIncomeEstimate).toBe(4000);
    expect(orgDaily?.savedListingsCount).toBeGreaterThanOrEqual(1);
    expect(orgDaily?.savedSearchesCount).toBeGreaterThanOrEqual(1);
    expect(orgDaily?.copilotActionsSuggestedCount).toBe(2);
    expect(orgDaily?.copilotActionsCompletedCount).toBe(1);

    const agentDaily = await prisma.agentDailyAnalytics.findUnique({
      where: {
        organizationId_agentProfileId_date_granularity: {
          organizationId: orgId,
          agentProfileId,
          date: dayKey,
          granularity: AnalyticsGranularity.DAILY
        }
      }
    });

    expect(agentDaily).toBeTruthy();
    expect(agentDaily?.leadsNewCount).toBe(5);
    expect(agentDaily?.transactionsClosedCount).toBe(1);
    expect(agentDaily?.transactionsClosedVolume).toBe(450000);
    expect(agentDaily?.offerIntentsSubmittedCount).toBe(2);
    expect(agentDaily?.copilotActionsCompletedCount).toBe(1);
  });

  it('returns analytics via the reporting API', async () => {
    await withBroker(request(server).get(`/organizations/${orgId}/reporting/org-daily`)).expect(200);
  });
});
