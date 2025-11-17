import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { UserRole } from '@hatch/db';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { AiEmployeesService } from './ai-employees.service';
import { AI_EMPLOYEES_QUEUE, AI_EMPLOYEE_JOBS } from './ai-employees.queue';

type LeadNurseJobPayload = { tenantId: string; orgId?: string | null; leadId: string };
type ListingConciergeJobPayload = { tenantId: string; orgId?: string | null; listingId: string };
type TransactionCoordinatorJobPayload = {
  tenantId: string;
  orgId?: string | null;
  transactionId: string;
  milestoneName: string;
  completed?: boolean;
};
type AgentCopilotDailySummaryPayload = { tenantId?: string };

@Processor(AI_EMPLOYEES_QUEUE)
export class AiEmployeesProcessor extends WorkerHost {
  private readonly logger = new Logger(AiEmployeesProcessor.name);

  constructor(
    private readonly service: AiEmployeesService,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async process(job: Job<Record<string, unknown>>) {
    switch (job.name) {
      case AI_EMPLOYEE_JOBS.LEAD_NURSE_NEW_LEAD:
        await this.handleNewLead(job.data as LeadNurseJobPayload);
        break;
      case AI_EMPLOYEE_JOBS.LISTING_CONCIERGE_NEW_LISTING:
        await this.handleNewListing(job.data as ListingConciergeJobPayload);
        break;
      case AI_EMPLOYEE_JOBS.TRANSACTION_COORDINATOR_MILESTONE:
        await this.handleTransactionMilestone(job.data as TransactionCoordinatorJobPayload);
        break;
      case AI_EMPLOYEE_JOBS.AGENT_COPILOT_DAILY_SUMMARY:
        await this.handleAgentCopilotDaily(job.data as AgentCopilotDailySummaryPayload);
        break;
      default:
        this.logger.warn(`Received unknown AI employee job: ${job.name}`);
    }
  }

  private async handleNewLead({ tenantId, leadId, orgId }: LeadNurseJobPayload) {
    const instances = await this.prisma.aiEmployeeInstance.findMany({
      where: {
        tenantId,
        status: 'active',
        template: { key: 'lead_nurse', isActive: true }
      },
      include: { template: true }
    });

    if (!instances.length) {
      return;
    }

    await Promise.all(
      instances.map((instance) =>
        this.service.sendMessage({
          tenantId,
          orgId: orgId ?? tenantId,
          employeeInstanceId: instance.id,
          userId: instance.userId ?? 'system',
          actorRole: instance.userId ? undefined : UserRole.BROKER,
          channel: 'event:new_lead',
          contextType: 'lead',
          contextId: leadId,
          message:
            `A new lead (id: ${leadId}) has been created. Analyze this lead using the CRM context and propose an optimal outreach sequence.` +
            ' Prioritize tasks and, if allowed, draft first-touch copy.'
        })
      )
    );
  }

  private async handleNewListing({ tenantId, listingId, orgId }: ListingConciergeJobPayload) {
    const listing = await this.prisma.listing.findFirst({
      where: { id: listingId, tenantId },
      select: {
        id: true,
        addressLine1: true,
        city: true,
        state: true,
        price: true,
        mlsId: true
      }
    });
    if (!listing) {
      return;
    }

    const instances = await this.prisma.aiEmployeeInstance.findMany({
      where: {
        tenantId,
        status: 'active',
        template: { key: 'listing_concierge', isActive: true }
      },
      include: { template: true }
    });

    if (!instances.length) {
      return;
    }

    const address = [listing.addressLine1, listing.city, listing.state?.toUpperCase()].filter(Boolean).join(', ');
    const priceText = listing.price ? `List price: $${Number(listing.price).toLocaleString()}.` : '';

    await Promise.all(
      instances.map((instance) =>
        this.service.sendMessage({
          tenantId,
          orgId: orgId ?? tenantId,
          employeeInstanceId: instance.id,
          userId: instance.userId ?? 'system',
          actorRole: instance.userId ? undefined : UserRole.BROKER,
          channel: 'event:new_listing',
          contextType: 'listing',
          contextId: listing.id,
          message: `A listing (${listing.id}) at ${address} just became active. ${priceText} Draft an on-brand MLS description plus a short email + social caption to announce it.`
        })
      )
    );
  }

  private async handleTransactionMilestone({
    tenantId,
    transactionId,
    milestoneName,
    completed,
    orgId
  }: TransactionCoordinatorJobPayload) {
    const transaction = await this.prisma.deal.findFirst({
      where: { id: transactionId, tenantId },
      select: { id: true, stage: true }
    });
    if (!transaction) {
      return;
    }

    const instances = await this.prisma.aiEmployeeInstance.findMany({
      where: {
        tenantId,
        status: 'active',
        template: { key: 'transaction_coordinator', isActive: true }
      },
      include: { template: true }
    });

    if (!instances.length) {
      return;
    }

    const statusText = completed ? 'was completed' : 'needs attention';

    await Promise.all(
      instances.map((instance) =>
        this.service.sendMessage({
          tenantId,
          orgId: orgId ?? tenantId,
          employeeInstanceId: instance.id,
          userId: instance.userId ?? 'system',
          actorRole: instance.userId ? undefined : UserRole.BROKER,
          channel: 'event:transaction_milestone',
          contextType: 'transaction',
          contextId: transaction.id,
          message: `Milestone "${milestoneName}" on transaction ${transaction.id} ${statusText}. Summarize blockers and outline next actions.`
        })
      )
    );
  }

  private async handleAgentCopilotDaily({ tenantId: tenantFilter }: AgentCopilotDailySummaryPayload) {
    const instances = await this.prisma.aiEmployeeInstance.findMany({
      where: {
        status: 'active',
        template: { key: 'agent_copilot', isActive: true },
        ...(tenantFilter ? { tenantId: tenantFilter } : {})
      },
      include: { template: true }
    });

    if (!instances.length) {
      return;
    }

    const today = new Date();
    const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    const tenantIds = Array.from(new Set(instances.map((instance) => instance.tenantId)));
    const tenants = await this.prisma.tenant.findMany({
      where: { id: { in: tenantIds } },
      select: { id: true, organizationId: true }
    });
    const orgByTenant = new Map(tenants.map((tenant) => [tenant.id, tenant.organizationId]));

    await Promise.all(
      instances.map((instance) =>
        this.service.sendMessage({
          tenantId: instance.tenantId,
          orgId: orgByTenant.get(instance.tenantId) ?? instance.tenantId,
          employeeInstanceId: instance.id,
          userId: instance.userId ?? 'system',
          actorRole: instance.userId ? undefined : UserRole.AGENT,
          channel: 'event:agent_daily_summary',
          contextType: 'pipeline',
          contextId: instance.userId ?? undefined,
          message: `Provide a daily briefing for ${dateLabel}. Highlight overdue tasks, hot leads, and three concrete follow-ups to tackle right now.`
        })
      )
    );
  }
}
