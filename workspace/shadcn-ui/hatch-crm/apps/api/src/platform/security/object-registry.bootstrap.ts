import { ObjectRegistry } from './object-registry';
import { PrismaService } from '../../modules/prisma/prisma.service';

type ModelCandidates = string | string[];

const resolveCandidate = (prisma: PrismaService, candidates: string[]): any => {
  for (const candidate of candidates) {
    const client = (prisma as unknown as Record<string, any>)[candidate];
    if (client?.findUnique) {
      return client;
    }
  }
  return null;
};

const register = (key: string, models: ModelCandidates) => {
  const candidates = Array.isArray(models) ? models : [models];
  ObjectRegistry.register(key, {
    loadRecordCtx: async (prisma: PrismaService, id: string) => {
      const client = resolveCandidate(prisma, candidates);
      if (!client) {
        return null;
      }
      const row = await client.findUnique({
        where: { id }
      });
      if (!row) {
        return null;
      }
      const orgId =
        row.orgId ??
        row.organizationId ??
        row.tenantId ??
        row.org_id ??
        row.organization_id ??
        row.tenant_id ??
        null;
      const ownerId = row.ownerId ?? row.owner_id ?? null;
      return orgId ? { orgId, ownerId } : null;
    }
  });
};

export function bootstrapObjectRegistry() {
  register('accounts', ['account', 'organization']);
  register('contacts', ['person']);
  register('opportunities', ['opportunity', 'deal']);
  register('leads', ['person']);
  register('cases', ['case']);
  register('products', ['product']);
  register('quotes', ['quote']);
  register('orders', ['order']);
  register('tasks', ['leadTask']);
  register('events', ['calendarEvent', 'event']);
  register('re_listings', ['listing']);
  register('re_properties', ['property']);
  register('re_offers', ['reOffer', 'offer']);
  register('re_transactions', ['reTransaction', 'deal']);
  register('files', ['fileObject']);
  register('deal_desk_requests', ['dealDeskRequest']);
  register('commission_plans', ['orgCommissionPlan']);
  register('payouts', ['payout']);
  register('metrics_daily', ['metricsDaily']);
  register('metrics_runs', ['metricsRun']);
  register('cases', ['case']);
  register('search', ['person']);
  register('ai_employees', ['aiEmployeeInstance']);
  register('ai_actions', ['aiProposedAction']);

  ObjectRegistry.register('lead_gen', {
    loadRecordCtx: async (prisma: PrismaService, id: string) => {
      const campaign = await prisma.leadGenCampaign.findUnique({
        where: { id },
        select: { organizationId: true, createdByUserId: true }
      });
      if (campaign) {
        return { orgId: campaign.organizationId, ownerId: campaign.createdByUserId ?? null };
      }

      const landingPage = await prisma.leadGenLandingPage.findUnique({
        where: { id },
        select: { organizationId: true, createdByUserId: true }
      });
      if (landingPage) {
        return { orgId: landingPage.organizationId, ownerId: landingPage.createdByUserId ?? null };
      }

      const exportBatch = await prisma.leadGenExportBatch.findUnique({
        where: { id },
        select: { organizationId: true, requestedByUserId: true }
      });
      if (exportBatch) {
        return { orgId: exportBatch.organizationId, ownerId: exportBatch.requestedByUserId ?? null };
      }

      const conversion = await prisma.leadGenConversionEvent.findUnique({
        where: { id },
        select: { organizationId: true }
      });
      if (conversion) {
        return { orgId: conversion.organizationId, ownerId: null };
      }

      const audience = await prisma.leadGenAudience.findUnique({
        where: { id },
        select: { tenantId: true }
      });
      if (audience) {
        const tenant = await prisma.tenant.findUnique({
          where: { id: audience.tenantId },
          select: { organizationId: true }
        });
        return tenant?.organizationId ? { orgId: tenant.organizationId, ownerId: null } : null;
      }

      return null;
    }
  });
}
