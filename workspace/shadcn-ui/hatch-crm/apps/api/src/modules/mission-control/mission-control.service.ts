import { ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { LeadStatus, OfferIntentStatus, Prisma } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import {
  MissionControlAgentRowDto,
  MissionControlComplianceSummaryDto,
  MissionControlOverviewDto
} from './dto/mission-control-overview.dto';

const DAYS_7_MS = 7 * 24 * 60 * 60 * 1000;
const CE_EXPIRING_THRESHOLD_DAYS = 30;
const DAYS_30_MS = 30 * 24 * 60 * 60 * 1000;
const LISTING_EXPIRING_THRESHOLD_MS = 30 * 24 * 60 * 60 * 1000;

@Injectable()
export class MissionControlService {
  private readonly logger = new Logger(MissionControlService.name);
  private readonly skipMembershipCheck = process.env.DISABLE_PERMISSIONS_GUARD === 'true';

  constructor(private readonly prisma: PrismaService) {}

  private isMissingTableError(error: unknown) {
    return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021';
  }

  private async optionalQuery<T>(query: () => Promise<T>, fallback: T, context: string): Promise<T> {
    try {
      return await query();
    } catch (error) {
      if (this.isMissingTableError(error)) {
        this.logger.warn(`mission-control optional query skipped: ${context}`);
        return fallback;
      }
      throw error;
    }
  }

  private async assertBrokerInOrg(userId: string, orgId: string) {
    if (this.skipMembershipCheck) {
      return;
    }
    const membership = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { user: { select: { role: true } } }
    });
    if (!membership || membership.user?.role !== 'BROKER') {
      throw new ForbiddenException('Broker access required');
    }
  }

  async getOrgOverview(orgId: string, brokerUserId: string) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    const overview = new MissionControlOverviewDto();
    overview.organizationId = orgId;

    const listingExpiringThreshold = new Date(Date.now() + LISTING_EXPIRING_THRESHOLD_MS);
    const aiWindowStart = new Date(Date.now() - DAYS_30_MS);
    const now = new Date();
    const rentalTaxWindowEnd = new Date(now.getTime() + DAYS_30_MS);

    const [
      agentsSummary,
      pendingInvites,
      vaultSummary,
      channelsCount,
      directCount,
      messages7d,
      events,
      totalModules,
      requiredModules,
      totalAssignments,
      completedAssignments,
      totalListings,
      activeListings,
      pendingApprovalListings,
      expiringListings,
      totalTransactions,
      underContractTransactions,
      closingsNext30Days,
      nonCompliantTransactions,
      aiEvaluationEvents,
      agentsInOnboardingCount,
      agentsInOffboardingCount,
      onboardingTasksOpenCount,
      onboardingTasksCompletedCount,
      offboardingTasksOpenCount,
      leadStatusGroups,
      loiStatusGroups,
      offerIntentAssignments,
      rentalPropertiesManaged,
      activeRentalLeases,
      seasonalRentalLeases,
      upcomingTaxDueCount,
      overdueTaxCount,
      transactionsSyncedCount,
      transactionsSyncFailedCount,
      rentalLeasesSyncedCount,
      rentalLeasesSyncFailedCount,
      mlsConfig,
      totalIndexedListings,
      activeForSaleListings,
      activeRentalListings,
      savedSearchAggregates,
      savedListingCount,
      closedTransactionsForGci,
      activeLeaseRentAggregate
    ] = await Promise.all([
      this.prisma.agentProfile.groupBy({
        by: ['isCompliant', 'requiresAction', 'riskLevel'],
        where: { organizationId: orgId },
        _count: { _all: true }
      }),
      this.prisma.agentInvite.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      this.prisma.orgFile.groupBy({
        by: ['category'],
        where: { orgId: orgId },
        _count: { _all: true }
      }),
      this.prisma.orgConversation.count({ where: { organizationId: orgId, type: 'CHANNEL' } }),
      this.prisma.orgConversation.count({ where: { organizationId: orgId, type: 'DIRECT' } }),
      this.prisma.orgMessage.count({ where: { organizationId: orgId, createdAt: { gte: new Date(Date.now() - DAYS_7_MS) } } }),
      this.prisma.orgEvent.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 20
      }),
      this.prisma.agentTrainingModule.count({ where: { organizationId: orgId } }),
      this.prisma.agentTrainingModule.count({ where: { organizationId: orgId, required: true } }),
      this.prisma.agentTrainingProgress.count({ where: { agentProfile: { organizationId: orgId } } }),
      this.prisma.agentTrainingProgress.count({
        where: { agentProfile: { organizationId: orgId }, status: 'COMPLETED' }
      }),
      this.prisma.orgListing.count({ where: { organizationId: orgId } }),
      this.prisma.orgListing.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      this.prisma.orgListing.count({ where: { organizationId: orgId, status: 'PENDING_BROKER_APPROVAL' } }),
      this.prisma.orgListing.count({
        where: {
          organizationId: orgId,
          status: 'ACTIVE',
          expiresAt: { not: null, lte: listingExpiringThreshold }
        }
      }),
      this.prisma.orgTransaction.count({ where: { organizationId: orgId } }),
      this.prisma.orgTransaction.count({
        where: { organizationId: orgId, status: { in: ['UNDER_CONTRACT', 'CONTINGENT'] } }
      }),
      this.prisma.orgTransaction.count({
        where: {
          organizationId: orgId,
          closingDate: { not: null, gte: new Date(), lte: listingExpiringThreshold }
        }
      }),
      this.prisma.orgTransaction.count({
        where: {
          organizationId: orgId,
          OR: [{ isCompliant: false }, { requiresAction: true }]
        }
      }),
      this.prisma.orgEvent.findMany({
        where: {
          organizationId: orgId,
          type: { in: ['ORG_LISTING_EVALUATED', 'ORG_TRANSACTION_EVALUATED'] },
          createdAt: { gte: aiWindowStart }
        },
        select: { type: true, payload: true }
      }),
      this.prisma.agentProfile.count({
        where: { organizationId: orgId, lifecycleStage: 'ONBOARDING' }
      }),
      this.prisma.agentProfile.count({
        where: { organizationId: orgId, lifecycleStage: 'OFFBOARDING' }
      }),
      this.prisma.agentWorkflowTask.count({
        where: {
          organizationId: orgId,
          type: 'ONBOARDING',
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      }),
      this.prisma.agentWorkflowTask.count({
        where: {
          organizationId: orgId,
          type: 'ONBOARDING',
          status: 'COMPLETED'
        }
      }),
      this.prisma.agentWorkflowTask.count({
        where: {
          organizationId: orgId,
          type: 'OFFBOARDING',
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        }
      }),
      this.prisma.lead.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { _all: true }
      }),
      this.prisma.offerIntent.groupBy({
        by: ['status'],
        where: { organizationId: orgId },
        _count: { _all: true }
      }),
      this.prisma.offerIntent.findMany({
        where: { organizationId: orgId },
        select: {
          status: true,
          listing: { select: { agentProfileId: true } }
        }
      }),
      this.prisma.rentalProperty.count({
        where: {
          organizationId: orgId,
          status: { in: ['UNDER_MGMT', 'ACTIVE'] }
        }
      }),
      this.prisma.rentalLease.count({
        where: {
          organizationId: orgId,
          endDate: { gte: now }
        }
      }),
      this.prisma.rentalLease.count({
        where: {
          organizationId: orgId,
          tenancyType: 'SEASONAL',
          endDate: { gte: now }
        }
      }),
      this.prisma.rentalTaxSchedule.count({
        where: {
          lease: { organizationId: orgId },
          status: 'PENDING',
          dueDate: { gte: now, lte: rentalTaxWindowEnd }
        }
      }),
      this.prisma.rentalTaxSchedule.count({
        where: {
          lease: { organizationId: orgId },
          status: 'OVERDUE'
        }
      }),
      this.prisma.transactionAccountingRecord.count({
        where: { organizationId: orgId, syncStatus: 'SYNCED' }
      }),
      this.prisma.transactionAccountingRecord.count({
        where: { organizationId: orgId, syncStatus: 'FAILED' }
      }),
      this.prisma.rentalLeaseAccountingRecord.count({
        where: { organizationId: orgId, syncStatus: 'SYNCED' }
      }),
      this.prisma.rentalLeaseAccountingRecord.count({
        where: { organizationId: orgId, syncStatus: 'FAILED' }
      }),
      this.optionalQuery(
        () => this.prisma.mlsFeedConfig.findUnique({ where: { organizationId: orgId } }),
        null,
        'mlsFeedConfig'
      ),
      this.optionalQuery(
        () => this.prisma.listingSearchIndex.count({ where: { organizationId: orgId } }),
        0,
        'listingSearchIndex.total'
      ),
      this.optionalQuery(
        () =>
          this.prisma.listingSearchIndex.count({
            where: { organizationId: orgId, isActive: true, isRental: false }
          }),
        0,
        'listingSearchIndex.activeForSale'
      ),
      this.optionalQuery(
        () =>
          this.prisma.listingSearchIndex.count({
            where: { organizationId: orgId, isActive: true, isRental: true }
          }),
        0,
        'listingSearchIndex.activeRentals'
      ),
      this.optionalQuery(
        () =>
          this.prisma.savedSearch.groupBy({
            by: ['frequency', 'alertsEnabled'],
            where: { organizationId: orgId },
            _count: { _all: true }
          }),
        [] as Prisma.SavedSearchGroupByOutputType[],
        'savedSearch.groupBy'
      ),
      this.optionalQuery(
        () => this.prisma.savedListing.count({ where: { organizationId: orgId } }),
        0,
        'savedListing.count'
      ),
      this.prisma.orgTransaction.findMany({
        where: { organizationId: orgId, status: 'CLOSED' },
        select: {
          id: true,
          listing: {
            select: { listPrice: true }
          }
        }
      }),
      this.prisma.rentalLease.aggregate({
        where: {
          organizationId: orgId,
          endDate: { gte: now },
          rentAmount: { not: null }
        },
        _sum: { rentAmount: true }
      })
    ]);

    const totalAgents = await this.prisma.agentProfile.count({ where: { organizationId: orgId } });
    overview.totalAgents = totalAgents;
    overview.pendingInvites = pendingInvites;
    overview.comms.channels = channelsCount;
    overview.comms.directConversations = directCount;
    overview.comms.messagesLast7Days = messages7d;
    overview.training = {
      totalModules,
      requiredModules,
      totalAssignments,
      completedAssignments
    };
    overview.listings = {
      total: totalListings,
      active: activeListings,
      pendingApproval: pendingApprovalListings,
      expiringSoon: expiringListings
    };
    overview.transactions = {
      total: totalTransactions,
      underContract: underContractTransactions,
      closingsNext30Days,
      nonCompliant: nonCompliantTransactions
    };
    overview.onboarding = {
      agentsInOnboarding: agentsInOnboardingCount,
      totalOnboardingTasksOpen: onboardingTasksOpenCount,
      totalOnboardingTasksCompleted: onboardingTasksCompletedCount
    };
    overview.offboarding = {
      agentsInOffboarding: agentsInOffboardingCount,
      totalOffboardingTasksOpen: offboardingTasksOpenCount
    };
    const leadStatusMap = new Map<string, number>();
    for (const group of leadStatusGroups) {
      leadStatusMap.set(group.status, group._count._all);
    }
    const getLeadStatusCount = (status: LeadStatus) => leadStatusMap.get(status) ?? 0;
    const totalLeadsCount = Array.from(leadStatusMap.values()).reduce((sum, value) => sum + value, 0);
    overview.leadStats = {
      totalLeads: totalLeadsCount,
      newLeads: getLeadStatusCount(LeadStatus.NEW),
      contactedLeads: getLeadStatusCount(LeadStatus.CONTACTED),
      qualifiedLeads: getLeadStatusCount(LeadStatus.QUALIFIED),
      unqualifiedLeads: getLeadStatusCount(LeadStatus.UNQUALIFIED),
      appointmentsSet: getLeadStatusCount(LeadStatus.APPOINTMENT_SET)
    };
    const loiStatusMap = new Map<string, number>();
    for (const group of loiStatusGroups) {
      loiStatusMap.set(group.status, group._count._all);
    }
    const getLoiStatusCount = (status: OfferIntentStatus) => loiStatusMap.get(status) ?? 0;
    const totalOfferIntents = Array.from(loiStatusMap.values()).reduce((sum, value) => sum + value, 0);
    overview.loiStats = {
      totalOfferIntents,
      submittedOfferIntents: getLoiStatusCount(OfferIntentStatus.SUBMITTED),
      underReviewOfferIntents: getLoiStatusCount(OfferIntentStatus.UNDER_REVIEW),
      acceptedOfferIntents: getLoiStatusCount(OfferIntentStatus.ACCEPTED),
      declinedOfferIntents: getLoiStatusCount(OfferIntentStatus.DECLINED)
    };
    overview.rentalStats = {
      propertiesUnderManagement: rentalPropertiesManaged,
      activeLeases: activeRentalLeases,
      seasonalLeases: seasonalRentalLeases,
      upcomingTaxDueCount,
      overdueTaxCount
    };
    const estimatedGci = closedTransactionsForGci.reduce((sum, txn) => {
      return sum + (txn.listing?.listPrice ?? 0);
    }, 0);
    const estimatedPmIncome = Number(activeLeaseRentAggregate._sum.rentAmount ?? 0);
    overview.financialStats = {
      transactionsSyncedCount,
      transactionsSyncFailedCount,
      rentalLeasesSyncedCount,
      rentalLeasesSyncFailedCount,
      estimatedGci,
      estimatedPmIncome
    };
    overview.mlsStats = {
      totalIndexed: totalIndexedListings,
      activeForSale: activeForSaleListings,
      activeRentals: activeRentalListings,
      lastFullSyncAt: mlsConfig?.lastFullSyncAt?.toISOString() ?? null,
      lastIncrementalSyncAt: mlsConfig?.lastIncrementalSyncAt?.toISOString() ?? null,
      provider: mlsConfig?.provider ?? null,
      boardName: mlsConfig?.boardName ?? null
    };
    let totalSavedSearches = 0;
    let alertsEnabledCount = 0;
    let dailyCount = 0;
    let weeklyCount = 0;
    for (const row of savedSearchAggregates) {
      const count = row._count._all;
      totalSavedSearches += count;
      if (row.alertsEnabled) alertsEnabledCount += count;
      if (row.frequency === 'DAILY') dailyCount += count;
      if (row.frequency === 'WEEKLY') weeklyCount += count;
    }
    overview.savedSearchStats = {
      totalSavedSearches,
      alertsEnabledCount,
      dailyCount,
      weeklyCount
    };
    overview.favoritesStats = {
      totalSavedListings: savedListingCount
    };
    const aiCompliance = {
      evaluationsLast30Days: aiEvaluationEvents.length,
      highRiskListings: 0,
      highRiskTransactions: 0
    };
    for (const event of aiEvaluationEvents) {
      const riskLevel = (event.payload as any)?.riskLevel;
      if (riskLevel === 'HIGH') {
        if (event.type === 'ORG_LISTING_EVALUATED') {
          aiCompliance.highRiskListings += 1;
        } else if (event.type === 'ORG_TRANSACTION_EVALUATED') {
          aiCompliance.highRiskTransactions += 1;
        }
      }
    }
    overview.aiCompliance = aiCompliance;

    const byCategory: Record<string, number> = {};
    let totalFiles = 0;
    for (const group of vaultSummary) {
      byCategory[group.category] = group._count._all;
      totalFiles += group._count._all;
    }
    overview.vaultFileCounts = { total: totalFiles, byCategory };

    let active = 0;
    let nonCompliant = 0;
    let highRisk = 0;
    for (const summary of agentsSummary) {
      const count = summary._count._all;
      if (!summary.isCompliant) {
        nonCompliant += count;
      }
      if (!summary.requiresAction && summary.isCompliant) {
        active += count;
      }
      if (summary.riskLevel === 'HIGH') {
        highRisk += count;
      }
    }
    overview.activeAgents = active;
    overview.nonCompliantAgents = nonCompliant;
    overview.highRiskAgents = highRisk;

    overview.recentEvents = events.map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      createdAt: event.createdAt.toISOString()
    }));

    return overview;
  }

  async getAgentsDashboard(orgId: string, brokerUserId: string) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    const aiWindowStart = new Date(Date.now() - DAYS_30_MS);
    const [
      profiles,
      listingCounts,
      activeListingCounts,
      transactionCounts,
      nonCompliantTransactions,
      complianceEvents,
      workflowTaskGroups,
      leadAssignmentGroups,
      offerIntentAssignments
    ] = await Promise.all([
      this.prisma.agentProfile.findMany({
        where: { organizationId: orgId },
        orderBy: { updatedAt: 'desc' },
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          memberships: true,
          trainingProgress: { include: { module: true } }
        }
      }),
      this.prisma.orgListing.groupBy({
        by: ['agentProfileId'],
        where: { organizationId: orgId, agentProfileId: { not: null } },
        _count: { _all: true }
      }),
      this.prisma.orgListing.groupBy({
        by: ['agentProfileId'],
        where: {
          organizationId: orgId,
          agentProfileId: { not: null },
          status: 'ACTIVE'
        },
        _count: { _all: true }
      }),
      this.prisma.orgTransaction.groupBy({
        by: ['agentProfileId'],
        where: { organizationId: orgId, agentProfileId: { not: null } },
        _count: { _all: true }
      }),
      this.prisma.orgTransaction.groupBy({
        by: ['agentProfileId'],
        where: {
          organizationId: orgId,
          agentProfileId: { not: null },
          OR: [{ isCompliant: false }, { requiresAction: true }]
        },
        _count: { _all: true }
      }),
      this.prisma.orgEvent.findMany({
        where: {
          organizationId: orgId,
          type: { in: ['ORG_LISTING_EVALUATED', 'ORG_TRANSACTION_EVALUATED'] },
          createdAt: { gte: aiWindowStart }
        },
        select: { payload: true, createdAt: true }
      }),
      this.prisma.agentWorkflowTask.groupBy({
        by: ['agentProfileId', 'type', 'status'],
        where: { organizationId: orgId },
        _count: { _all: true }
      }),
      this.prisma.lead.groupBy({
        by: ['agentProfileId', 'status'],
        where: { organizationId: orgId, agentProfileId: { not: null } },
        _count: { _all: true }
      }),
      this.prisma.offerIntent.findMany({
        where: { organizationId: orgId },
        select: {
          status: true,
          listing: { select: { agentProfileId: true } }
        }
      })
    ]);

    const toMap = (groups: Array<{ agentProfileId: string | null; _count: { _all: number } }>) => {
      const map = new Map<string, number>();
      for (const group of groups) {
        if (group.agentProfileId) {
          map.set(group.agentProfileId, group._count._all);
        }
      }
      return map;
    };

    const listingCountMap = toMap(listingCounts);
    const activeListingCountMap = toMap(activeListingCounts);
    const transactionCountMap = toMap(transactionCounts);
    const nonCompliantTransactionMap = toMap(nonCompliantTransactions);

    const complianceMap = new Map<
      string,
      { openIssues: number; lastEvaluation?: Date }
    >();
    for (const event of complianceEvents) {
      const payload = event.payload as any;
      const agentProfileId: string | undefined = payload?.agentProfileId ?? undefined;
      if (!agentProfileId) continue;
      const entry = complianceMap.get(agentProfileId) ?? { openIssues: 0 };
      const issuesCount = typeof payload?.issuesCount === 'number' ? payload.issuesCount : 1;
      const riskLevel = payload?.riskLevel;
      if (riskLevel && riskLevel !== 'LOW') {
        entry.openIssues += Math.max(1, issuesCount);
      }
      if (!entry.lastEvaluation || entry.lastEvaluation < event.createdAt) {
        entry.lastEvaluation = event.createdAt;
      }
      complianceMap.set(agentProfileId, entry);
    }

    const workflowStats = new Map<
      string,
      { onboardingOpen: number; onboardingCompleted: number; offboardingOpen: number }
    >();
    for (const group of workflowTaskGroups) {
      if (!group.agentProfileId) continue;
      const entry =
        workflowStats.get(group.agentProfileId) ?? { onboardingOpen: 0, onboardingCompleted: 0, offboardingOpen: 0 };
      if (group.type === 'ONBOARDING') {
        if (group.status === 'COMPLETED') {
          entry.onboardingCompleted += group._count._all;
        } else if (['PENDING', 'IN_PROGRESS'].includes(group.status)) {
          entry.onboardingOpen += group._count._all;
        }
      } else if (group.type === 'OFFBOARDING' && ['PENDING', 'IN_PROGRESS'].includes(group.status)) {
        entry.offboardingOpen += group._count._all;
      }
      workflowStats.set(group.agentProfileId, entry);
    }

    const leadAssignmentStats = new Map<
      string,
      { total: number; new: number; qualified: number }
    >();
    for (const group of leadAssignmentGroups) {
      if (!group.agentProfileId) continue;
      const entry = leadAssignmentStats.get(group.agentProfileId) ?? { total: 0, new: 0, qualified: 0 };
      entry.total += group._count._all;
      if (group.status === LeadStatus.NEW) {
        entry.new += group._count._all;
      }
      if (group.status === LeadStatus.QUALIFIED) {
        entry.qualified += group._count._all;
      }
      leadAssignmentStats.set(group.agentProfileId, entry);
    }

    const offerIntentStats = new Map<
      string,
      { total: number; accepted: number }
    >();
    for (const intent of offerIntentAssignments) {
      const agentProfileId = intent.listing?.agentProfileId ?? null;
      if (!agentProfileId) continue;
      const entry = offerIntentStats.get(agentProfileId) ?? { total: 0, accepted: 0 };
      entry.total += 1;
      if (intent.status === OfferIntentStatus.ACCEPTED) {
        entry.accepted += 1;
      }
      offerIntentStats.set(agentProfileId, entry);
    }

    const rows: MissionControlAgentRowDto[] = profiles.map((profile) => {
      const complianceMeta = complianceMap.get(profile.id);
      const workflow = workflowStats.get(profile.id) ?? {
        onboardingOpen: 0,
        onboardingCompleted: 0,
        offboardingOpen: 0
      };
      const leadStats = leadAssignmentStats.get(profile.id) ?? {
        total: 0,
        new: 0,
        qualified: 0
      };
      const loiStats = offerIntentStats.get(profile.id) ?? { total: 0, accepted: 0 };
      return {
        agentProfileId: profile.id,
        userId: profile.userId,
        name: `${profile.user.firstName} ${profile.user.lastName}`.trim(),
        email: profile.user.email,
        riskLevel: profile.riskLevel,
      riskScore: profile.riskScore,
      isCompliant: profile.isCompliant,
      requiresAction: profile.requiresAction,
      ceHoursRequired: profile.ceHoursRequired,
      ceHoursCompleted: profile.ceHoursCompleted,
      memberships: profile.memberships.map((m) => ({ type: m.type, name: m.name, status: m.status })),
      trainingAssigned: profile.trainingProgress.length,
      trainingCompleted: profile.trainingProgress.filter((p) => p.status === 'COMPLETED').length,
      requiredTrainingAssigned: profile.trainingProgress.filter((p) => p.module.required).length,
      requiredTrainingCompleted: profile.trainingProgress.filter(
        (p) => p.module.required && p.status === 'COMPLETED'
      ).length,
        listingCount: listingCountMap.get(profile.id) ?? 0,
        activeListingCount: activeListingCountMap.get(profile.id) ?? 0,
        transactionCount: transactionCountMap.get(profile.id) ?? 0,
        nonCompliantTransactionCount: nonCompliantTransactionMap.get(profile.id) ?? 0,
        openComplianceIssues: complianceMeta?.openIssues ?? 0,
        lastComplianceEvaluationAt: complianceMeta?.lastEvaluation?.toISOString(),
        lifecycleStage: profile.lifecycleStage,
        onboardingTasksOpenCount: workflow.onboardingOpen,
        onboardingTasksCompletedCount: workflow.onboardingCompleted,
        offboardingTasksOpenCount: workflow.offboardingOpen,
        assignedLeadsCount: leadStats.total,
        newLeadsCount: leadStats.new,
        qualifiedLeadsCount: leadStats.qualified,
        offerIntentCount: loiStats.total,
        acceptedOfferIntentCount: loiStats.accepted
      };
    });

    return rows;
  }

  async getComplianceSummary(orgId: string, brokerUserId: string) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    const summary = new MissionControlComplianceSummaryDto();
    summary.organizationId = orgId;

    const [profiles, expiredMemberships] = await Promise.all([
      this.prisma.agentProfile.findMany({ where: { organizationId: orgId } }),
      this.prisma.agentMembership.count({ where: { agentProfile: { organizationId: orgId }, status: 'EXPIRED' } })
    ]);

    summary.totalAgents = profiles.length;
    const now = new Date();
    const ceThreshold = new Date(now.getTime() + CE_EXPIRING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000);
    for (const profile of profiles) {
      if (profile.isCompliant) summary.compliantAgents += 1;
      else summary.nonCompliantAgents += 1;
      if (profile.riskLevel === 'HIGH') summary.highRiskAgents += 1;
      if (profile.ceCycleEndAt && profile.ceCycleEndAt <= ceThreshold) {
        summary.ceExpiringSoon += 1;
      }
    }
    summary.expiredMemberships = expiredMemberships;
    return summary;
  }

  async getActivityFeed(orgId: string, brokerUserId: string) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    const events = await this.prisma.orgEvent.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50
    });
    return events.map((event) => ({
      id: event.id,
      type: event.type,
      message: event.message,
      createdAt: event.createdAt.toISOString()
    }));
  }
}
