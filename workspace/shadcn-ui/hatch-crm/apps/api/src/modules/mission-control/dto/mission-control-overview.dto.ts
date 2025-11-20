export class MissionControlMlsStatsDto {
  totalIndexed = 0;
  activeForSale = 0;
  activeRentals = 0;
  lastFullSyncAt?: string | null;
  lastIncrementalSyncAt?: string | null;
  provider?: string | null;
  boardName?: string | null;
}

export class MissionControlSavedSearchStatsDto {
  totalSavedSearches = 0;
  alertsEnabledCount = 0;
  dailyCount = 0;
  weeklyCount = 0;
}

export class MissionControlFavoriteStatsDto {
  totalSavedListings = 0;
}

export class MissionControlOverviewDto {
  organizationId!: string;

  totalAgents = 0;
  activeAgents = 0;
  nonCompliantAgents = 0;
  highRiskAgents = 0;

  pendingInvites = 0;

  vaultFileCounts: {
    total: number;
    byCategory: Record<string, number>;
  } = { total: 0, byCategory: {} };

  comms: {
    channels: number;
    directConversations: number;
    messagesLast7Days: number;
  } = { channels: 0, directConversations: 0, messagesLast7Days: 0 };

  training: {
    totalModules: number;
    requiredModules: number;
    totalAssignments: number;
    completedAssignments: number;
  } = { totalModules: 0, requiredModules: 0, totalAssignments: 0, completedAssignments: 0 };

  listings: {
    total: number;
    active: number;
    pendingApproval: number;
    expiringSoon: number;
  } = { total: 0, active: 0, pendingApproval: 0, expiringSoon: 0 };

  transactions: {
    total: number;
    underContract: number;
    closingsNext30Days: number;
    nonCompliant: number;
  } = { total: 0, underContract: 0, closingsNext30Days: 0, nonCompliant: 0 };

  onboarding: {
    agentsInOnboarding: number;
    totalOnboardingTasksOpen: number;
    totalOnboardingTasksCompleted: number;
  } = { agentsInOnboarding: 0, totalOnboardingTasksOpen: 0, totalOnboardingTasksCompleted: 0 };

  offboarding: {
    agentsInOffboarding: number;
    totalOffboardingTasksOpen: number;
  } = { agentsInOffboarding: 0, totalOffboardingTasksOpen: 0 };

  aiCompliance: {
    evaluationsLast30Days: number;
    highRiskListings: number;
    highRiskTransactions: number;
  } = { evaluationsLast30Days: 0, highRiskListings: 0, highRiskTransactions: 0 };

  leadStats: {
    totalLeads: number;
    newLeads: number;
    contactedLeads: number;
    qualifiedLeads: number;
    unqualifiedLeads: number;
    appointmentsSet: number;
  } = {
    totalLeads: 0,
    newLeads: 0,
    contactedLeads: 0,
    qualifiedLeads: 0,
    unqualifiedLeads: 0,
    appointmentsSet: 0
  };

  loiStats: {
    totalOfferIntents: number;
    submittedOfferIntents: number;
    underReviewOfferIntents: number;
    acceptedOfferIntents: number;
    declinedOfferIntents: number;
  } = {
    totalOfferIntents: 0,
    submittedOfferIntents: 0,
    underReviewOfferIntents: 0,
    acceptedOfferIntents: 0,
    declinedOfferIntents: 0
  };

  rentalStats: {
    propertiesUnderManagement: number;
    activeLeases: number;
    seasonalLeases: number;
    upcomingTaxDueCount: number;
    overdueTaxCount: number;
  } = {
    propertiesUnderManagement: 0,
    activeLeases: 0,
    seasonalLeases: 0,
    upcomingTaxDueCount: 0,
    overdueTaxCount: 0
  };

  financialStats: {
    transactionsSyncedCount: number;
    transactionsSyncFailedCount: number;
    rentalLeasesSyncedCount: number;
    rentalLeasesSyncFailedCount: number;
    estimatedGci?: number;
    estimatedPmIncome?: number;
  } = {
    transactionsSyncedCount: 0,
    transactionsSyncFailedCount: 0,
    rentalLeasesSyncedCount: 0,
    rentalLeasesSyncFailedCount: 0,
    estimatedGci: 0,
    estimatedPmIncome: 0
  };

  mlsStats: MissionControlMlsStatsDto = new MissionControlMlsStatsDto();
  savedSearchStats: MissionControlSavedSearchStatsDto = new MissionControlSavedSearchStatsDto();
  favoritesStats: MissionControlFavoriteStatsDto = new MissionControlFavoriteStatsDto();

  recentEvents: Array<{
    id: string;
    type: string;
    message?: string | null;
    createdAt: string;
  }> = [];
}

export class MissionControlAgentRowDto {
  agentProfileId!: string;
  userId!: string;
  name!: string;
  email!: string;
  riskLevel!: string;
  riskScore!: number;
  isCompliant!: boolean;
  requiresAction!: boolean;
  ceHoursRequired?: number | null;
  ceHoursCompleted?: number | null;
  memberships!: Array<{ type: string; name: string; status: string }>;
  trainingAssigned = 0;
  trainingCompleted = 0;
  requiredTrainingAssigned = 0;
  requiredTrainingCompleted = 0;
  listingCount = 0;
  activeListingCount = 0;
  transactionCount = 0;
  nonCompliantTransactionCount = 0;
  openComplianceIssues = 0;
  lastComplianceEvaluationAt?: string;
  lifecycleStage!: string;
  onboardingTasksOpenCount = 0;
  onboardingTasksCompletedCount = 0;
  offboardingTasksOpenCount = 0;
  assignedLeadsCount = 0;
  newLeadsCount = 0;
  qualifiedLeadsCount = 0;
  offerIntentCount = 0;
  acceptedOfferIntentCount = 0;
}

export class MissionControlComplianceSummaryDto {
  organizationId!: string;
  totalAgents = 0;
  compliantAgents = 0;
  nonCompliantAgents = 0;
  highRiskAgents = 0;
  ceExpiringSoon = 0;
  expiredMemberships = 0;
}
