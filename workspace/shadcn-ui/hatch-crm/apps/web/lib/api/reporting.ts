import { apiFetch } from './api';
import { ApiError } from './errors';

export interface MetricsPoint {
  date: string;
  valueNum: number | null;
  valueJson: Record<string, unknown> | null;
}

export type OrgDailyAnalyticsPoint = {
  id: string;
  organizationId: string;
  date: string;
  granularity: string;
  leadsNewCount: number;
  leadsContactedCount: number;
  leadsQualifiedCount: number;
  leadsUnderContractCount: number;
  leadsClosedCount: number;
  offerIntentsSubmittedCount: number;
  offerIntentsAcceptedCount: number;
  offerIntentsDeclinedCount: number;
  transactionsClosedCount: number;
  transactionsClosedVolume: number;
  averageDaysOnMarket: number;
  activeLeasesCount: number;
  pmIncomeEstimate: number;
  savedListingsCount: number;
  savedSearchesCount: number;
  copilotActionsSuggestedCount: number;
  copilotActionsCompletedCount: number;
  createdAt: string;
};

export type AgentDailyAnalyticsPoint = {
  id: string;
  organizationId: string;
  agentProfileId: string;
  date: string;
  granularity: string;
  leadsNewCount: number;
  leadsContactedCount: number;
  leadsQualifiedCount: number;
  leadsUnderContractCount: number;
  leadsClosedCount: number;
  offerIntentsSubmittedCount: number;
  offerIntentsAcceptedCount: number;
  transactionsClosedCount: number;
  transactionsClosedVolume: number;
  activeLeasesCount: number;
  copilotActionsSuggestedCount: number;
  copilotActionsCompletedCount: number;
  createdAt: string;
};

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export async function getMetricsSeries(
  key: string,
  params: { from?: string; to?: string } = {}
): Promise<MetricsPoint[]> {
  const query = buildQuery({ key, ...params, granularity: 'daily' });
  try {
    return await apiFetch<MetricsPoint[]>(`reporting/metrics${query}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function recomputeMetrics(
  keys?: string[],
  params: { from?: string; to?: string } = {}
): Promise<void> {
  try {
    await apiFetch('reporting/recompute', {
      method: 'POST',
      body: JSON.stringify({
        ...(keys && keys.length > 0 ? { keys } : {}),
        ...params
      })
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return;
    }
    throw error;
  }
}

type AnalyticsRange = { startDate?: string; endDate?: string };

export async function fetchOrgDailyAnalytics(
  orgId: string,
  params: AnalyticsRange = {}
): Promise<OrgDailyAnalyticsPoint[]> {
  const query = buildQuery(params ?? {});
  return apiFetch<OrgDailyAnalyticsPoint[]>(`organizations/${orgId}/reporting/org-daily${query}`);
}

export async function fetchAgentDailyAnalytics(
  orgId: string,
  agentProfileId: string,
  params: AnalyticsRange = {}
): Promise<AgentDailyAnalyticsPoint[]> {
  const query = buildQuery({ ...(params ?? {}), agentProfileId });
  return apiFetch<AgentDailyAnalyticsPoint[]>(`organizations/${orgId}/reporting/agent-daily${query}`);
}
