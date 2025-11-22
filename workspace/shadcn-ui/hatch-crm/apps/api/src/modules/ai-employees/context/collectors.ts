import { differenceInCalendarDays } from 'date-fns';

import { PrismaService } from '@/modules/prisma/prisma.service';

export type ContextCollectorName =
  | 'orgSummary'
  | 'orgRiskSnapshot'
  | 'agentContext'
  | 'agentPipelineSnapshot'
  | 'agentPerformanceSnapshot'
  | 'listingContext'
  | 'listingSummary'
  | 'transactionContext'
  | 'transactionSummary'
  | 'documentComplianceSummary'
  | 'timelineForTransaction'
  | 'performanceSummary'
  | 'leadContext'
  | 'timelineForLead'
  | 'rentalContext';

type CollectorParams = {
  organizationId: string;
  userId?: string;
  agentProfileId?: string;
  leadId?: string;
  listingId?: string;
  transactionId?: string;
  leaseId?: string;
};

export class AiContextCollectors {
  constructor(private readonly prisma: PrismaService) {}

  async collect(name: ContextCollectorName, params: CollectorParams) {
    switch (name) {
      case 'orgSummary':
        return this.collectOrgSummary(params.organizationId);
      case 'orgRiskSnapshot':
        return this.collectOrgRiskSnapshot(params.organizationId);
      case 'agentContext':
        if (!params.agentProfileId) return null;
        return this.collectAgentContext(params.organizationId, params.agentProfileId);
      case 'agentPipelineSnapshot':
        if (!params.agentProfileId) return null;
        return this.collectAgentPipelineSnapshot(params.organizationId, params.agentProfileId);
      case 'agentPerformanceSnapshot':
        if (!params.agentProfileId) return null;
        return this.collectAgentPerformanceSnapshot(params.organizationId, params.agentProfileId);
      case 'leadContext':
        if (!params.leadId) return null;
        return this.collectLeadContext(params.organizationId, params.leadId);
      case 'timelineForLead':
        if (!params.leadId) return [];
        return this.collectTimelineForLead(params.organizationId, params.leadId);
      case 'listingContext':
        if (!params.listingId) return null;
        return this.collectListingContext(params.organizationId, params.listingId);
      case 'listingSummary':
        if (!params.organizationId) return null;
        return this.collectListingSummary(params.organizationId);
      case 'transactionContext':
        if (!params.transactionId) return null;
        return this.collectTransactionContext(params.organizationId, params.transactionId);
      case 'transactionSummary':
        if (!params.transactionId) return null;
        return this.collectTransactionSummary(params.organizationId, params.transactionId);
      case 'documentComplianceSummary':
        if (!params.transactionId) return null;
        return this.collectDocumentCompliance(params.organizationId, params.transactionId);
      case 'timelineForTransaction':
        if (!params.transactionId) return null;
        return this.collectTimelineForTransaction(params.organizationId, params.transactionId);
      case 'performanceSummary':
        if (!params.organizationId) return null;
        return this.collectPerformanceSummary(params.organizationId, params.transactionId);
      case 'rentalContext':
        if (!params.leaseId) return null;
        return this.collectRentalContext(params.organizationId, params.leaseId);
      default:
        return null;
    }
  }

  private async collectOrgSummary(orgId: string) {
    const [agents, leads, listings, transactions] = await this.prisma.$transaction([
      this.prisma.agentProfile.count({ where: { organizationId: orgId } }),
      this.prisma.lead.count({ where: { organizationId: orgId } }),
      this.prisma.orgListing.count({ where: { organizationId: orgId } }),
      this.prisma.orgTransaction.count({ where: { organizationId: orgId } })
    ]);

    return {
      type: 'orgSummary',
      agentsCount: agents,
      leadsCount: leads,
      listingsCount: listings,
      transactionsCount: transactions
    };
  }

  private async collectOrgRiskSnapshot(orgId: string) {
    const [nonCompliantAgents, highRiskAgents] = await this.prisma.$transaction([
      this.prisma.agentProfile.count({
        where: { organizationId: orgId, isCompliant: false }
      }),
      this.prisma.agentProfile.count({
        where: { organizationId: orgId, riskLevel: 'HIGH' as any }
      })
    ]);

    return {
      type: 'orgRiskSnapshot',
      nonCompliantAgents,
      highRiskAgents
    };
  }

  private async collectAgentContext(orgId: string, agentProfileId: string) {
    const [agent, leads, tasks] = await this.prisma.$transaction([
      this.prisma.agentProfile.findUnique({ where: { id: agentProfileId } }),
      this.prisma.lead.findMany({
        where: { organizationId: orgId, agentProfileId },
        orderBy: { createdAt: 'desc' },
        take: 25
      }),
      this.prisma.agentWorkflowTask.findMany({
        where: {
          organizationId: orgId,
          agentProfileId,
          status: { in: ['PENDING', 'IN_PROGRESS'] as any }
        },
        orderBy: { createdAt: 'asc' },
        take: 25
      })
    ]);

    return {
      type: 'agentContext',
      agent,
      leads,
      tasks
    };
  }

  private async collectAgentPipelineSnapshot(orgId: string, agentProfileId: string) {
    const [activeListings, upcomingClosings] = await this.prisma.$transaction([
      this.prisma.orgListing.findMany({
        where: {
          organizationId: orgId,
          agentProfileId,
          status: { in: ['ACTIVE', 'PENDING'] as any }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      }),
      this.prisma.orgTransaction.findMany({
        where: {
          organizationId: orgId,
          agentProfileId,
          status: { in: ['UNDER_CONTRACT', 'CONTINGENT'] as any }
        },
        orderBy: { closingDate: 'asc' },
        take: 20
      })
    ]);

    return {
      type: 'agentPipelineSnapshot',
      activeListings,
      upcomingClosings
    };
  }

  private async collectAgentPerformanceSnapshot(orgId: string, agentProfileId: string) {
    const [closedTransactions, openTransactions] = await this.prisma.$transaction([
      this.prisma.orgTransaction.count({
        where: { organizationId: orgId, agentProfileId, status: 'CLOSED' as any }
      }),
      this.prisma.orgTransaction.count({
        where: { organizationId: orgId, agentProfileId, status: { in: ['UNDER_CONTRACT', 'CONTINGENT'] as any } }
      })
    ]);

    return {
      type: 'agentPerformanceSnapshot',
      closedTransactions,
      openTransactions,
      openTasks: 0
    };
  }

  private async collectLeadContext(orgId: string, leadId: string) {
    const lead = await this.prisma.lead.findFirst({
      where: { id: leadId, organizationId: orgId },
      include: {
        agentProfile: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } }
        },
        listing: true
      }
    });
    if (!lead) return null;

    const tasks = await this.prisma.leadTask.findMany({
      where: { personId: leadId },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { id: true, title: true, status: true, dueAt: true, createdAt: true }
    });

    return {
      type: 'leadContext',
      lead,
      tasks
    };
  }

  private async collectTimelineForLead(orgId: string, leadId: string) {
    const [notes, touchpoints] = await this.prisma.$transaction([
      this.prisma.leadNote.findMany({
        where: { personId: leadId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, body: true, createdAt: true, userId: true }
      }),
      this.prisma.leadTouchpoint.findMany({
        where: { personId: leadId },
        orderBy: { occurredAt: 'desc' },
        take: 10,
        select: { id: true, type: true, channel: true, summary: true, occurredAt: true }
      })
    ]);

    return {
      type: 'timelineForLead',
      notes,
      touchpoints
    };
  }

  private async collectListingContext(orgId: string, listingId: string) {
    const listing = await this.prisma.orgListing.findFirst({
      where: { id: listingId, organizationId: orgId },
      include: {
        agentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        office: true
      }
    });
    if (!listing) return null;
    const documents = await this.prisma.orgFile.findMany({
      where: { orgId, listingId },
      select: { id: true, name: true, documentType: true, complianceStatus: true, updatedAt: true }
    });
    return {
      type: 'listingContext',
      listing,
      documents
    };
  }

  private async collectListingSummary(orgId: string) {
    const [active, pending, closed] = await this.prisma.$transaction([
      this.prisma.orgListing.count({ where: { organizationId: orgId, status: 'ACTIVE' as any } }),
      this.prisma.orgListing.count({ where: { organizationId: orgId, status: 'PENDING' as any } }),
      this.prisma.orgListing.count({ where: { organizationId: orgId, status: 'CLOSED' as any } })
    ]);
    return { type: 'listingSummary', active, pending, closed };
  }

  private async collectTransactionContext(orgId: string, transactionId: string) {
    const transaction = await this.prisma.orgTransaction.findFirst({
      where: { id: transactionId, organizationId: orgId },
      include: {
        listing: true,
        agentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        office: true
      }
    });
    if (!transaction) return null;
    const documents = await this.prisma.orgFile.findMany({
      where: { orgId, transactionId },
      select: { id: true, name: true, documentType: true, complianceStatus: true, updatedAt: true }
    });
    return {
      type: 'transactionContext',
      transaction,
      documents
    };
  }

  private async collectTransactionSummary(orgId: string, transactionId: string) {
    const transaction = await this.prisma.orgTransaction.findFirst({
      where: { id: transactionId, organizationId: orgId },
      include: {
        listing: true,
        agentProfile: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } }
        }
      }
    });
    if (!transaction) return null;

    const pendingTasks = await this.prisma.agentWorkflowTask.count({
      where: {
        organizationId: orgId,
        transactionId,
        status: { in: ['PENDING', 'IN_PROGRESS'] as any }
      }
    });

    const closingInDays =
      transaction.closingDate !== null ? differenceInCalendarDays(new Date(transaction.closingDate), new Date()) : null;

    return {
      type: 'transactionSummary',
      transaction,
      pendingTasks,
      closingInDays,
      requiresAttention: Boolean(transaction.requiresAction || transaction.isCompliant === false || (closingInDays !== null && closingInDays <= 7))
    };
  }

  private async collectDocumentCompliance(orgId: string, transactionId: string) {
    const docs = await this.prisma.orgFile.findMany({
      where: { orgId, transactionId },
      select: {
        id: true,
        name: true,
        documentType: true,
        complianceStatus: true,
        reviewStatus: true,
        updatedAt: true
      },
      orderBy: { updatedAt: 'desc' },
      take: 25
    });

    const complianceSummary = docs.reduce(
      (acc, doc) => {
        acc.byCompliance[doc.complianceStatus as string] = (acc.byCompliance[doc.complianceStatus as string] ?? 0) + 1;
        acc.byReview[doc.reviewStatus as string] = (acc.byReview[doc.reviewStatus as string] ?? 0) + 1;
        return acc;
      },
      { byCompliance: {} as Record<string, number>, byReview: {} as Record<string, number> }
    );

    return {
      type: 'documentComplianceSummary',
      total: docs.length,
      complianceSummary,
      recent: docs.slice(0, 5)
    };
  }

  private async collectTimelineForTransaction(orgId: string, transactionId: string) {
    const [tasks, docs] = await this.prisma.$transaction([
      this.prisma.agentWorkflowTask.findMany({
        where: { organizationId: orgId, transactionId },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          title: true,
          status: true,
          dueAt: true,
          createdAt: true,
          completedAt: true
        }
      }),
      this.prisma.orgFile.findMany({
        where: { orgId, transactionId },
        orderBy: { updatedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          documentType: true,
          complianceStatus: true,
          reviewStatus: true,
          updatedAt: true
        }
      })
    ]);

    return {
      type: 'timelineForTransaction',
      tasks,
      documents: docs
    };
  }

  private async collectPerformanceSummary(orgId: string, transactionId?: string) {
    const [openTasks, flaggedTransactions] = await this.prisma.$transaction([
      this.prisma.agentWorkflowTask.count({
        where: {
          organizationId: orgId,
          status: { in: ['PENDING', 'IN_PROGRESS'] as any },
          transactionId: transactionId ?? undefined
        }
      }),
      this.prisma.orgTransaction.count({
        where: {
          organizationId: orgId,
          OR: [
            { requiresAction: true },
            { isCompliant: false },
            { closingDate: { lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7) } }
          ],
          id: transactionId ? { equals: transactionId } : undefined
        }
      })
    ]);

    return {
      type: 'performanceSummary',
      openTasks,
      flaggedTransactions
    };
  }

  private async collectRentalContext(orgId: string, leaseId: string) {
    const lease = await this.prisma.rentalLease.findFirst({
      where: { id: leaseId, organizationId: orgId },
      include: {
        unit: {
          include: {
            property: true
          }
        },
        transaction: true,
        office: true
      }
    });
    if (!lease) return null;
    const documents = await this.prisma.orgFile.findMany({
      where: { orgId, leaseId },
      select: { id: true, name: true, documentType: true, complianceStatus: true, updatedAt: true }
    });
    return {
      type: 'rentalContext',
      lease,
      documents
    };
  }
}
