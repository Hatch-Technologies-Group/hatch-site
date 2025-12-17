import { apiFetch } from './api';

export type RoutingMode = 'FIRST_MATCH' | 'SCORE_AND_ASSIGN';

export interface RoutingRule {
  id: string;
  tenantId: string;
  name: string;
  priority: number;
  mode: RoutingMode;
  enabled: boolean;
  conditions?: Record<string, unknown> | null;
  targets?: Record<string, unknown>[];
  fallback?: Record<string, unknown> | null;
  slaFirstTouchMinutes?: number | null;
  slaKeptAppointmentMinutes?: number | null;
  updatedAt: string;
  createdAt: string;
}

export interface ListRoutingRulesParams {
  tenantId?: string;
  cursor?: string | null;
  limit?: number;
  signal?: AbortSignal;
  q?: string;
  mode?: RoutingMode;
}

export interface RoutingRuleListResponse {
  items: RoutingRule[];
  nextCursor: string | null;
}

export interface RoutingRuleDraftRequest {
  tenantId?: string;
  prompt: string;
  mode?: RoutingMode;
  defaultTeamId?: string;
  fallbackTeamId?: string;
  relaxAgentFilters?: boolean;
}

export interface RoutingRuleDraft {
  name: string;
  priority: number;
  mode: RoutingMode;
  enabled: boolean;
  conditions?: Record<string, unknown> | null;
  targets: Record<string, unknown>[];
  fallback?: Record<string, unknown> | null;
  slaFirstTouchMinutes?: number | null;
  slaKeptAppointmentMinutes?: number | null;
  warnings?: string[];
}

export interface CreateRoutingRulePayload {
  tenantId?: string;
  name: string;
  priority: number;
  mode: RoutingMode;
  enabled?: boolean;
  conditions?: Record<string, unknown> | null;
  targets: Record<string, unknown>[];
  fallback?: Record<string, unknown> | null;
  slaFirstTouchMinutes?: number | null;
  slaKeptAppointmentMinutes?: number | null;
}

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    search.set(key, String(value));
  });

  const query = search.toString();
  return query ? `?${query}` : '';
};

export async function listRoutingRules(
  params: ListRoutingRulesParams = {}
): Promise<RoutingRuleListResponse> {
  const query = buildQuery({
    tenantId: params.tenantId,
    cursor: params.cursor ?? undefined,
    limit: params.limit,
    q: params.q,
    mode: params.mode
  });

  const response = await apiFetch<RoutingRuleListResponse>(
    `routing/rules${query}`,
    { signal: params.signal }
  );

  return {
    items: response.items ?? [],
    nextCursor: response.nextCursor ?? null
  };
}

export async function draftRoutingRule(params: RoutingRuleDraftRequest): Promise<RoutingRuleDraft> {
  const query = buildQuery({ tenantId: params.tenantId });
  return apiFetch<RoutingRuleDraft>(`routing/rules/draft${query}`, {
    method: 'POST',
    body: {
      prompt: params.prompt,
      ...(params.mode ? { mode: params.mode } : {}),
      ...(params.defaultTeamId ? { defaultTeamId: params.defaultTeamId } : {}),
      ...(params.fallbackTeamId ? { fallbackTeamId: params.fallbackTeamId } : {}),
      ...(params.relaxAgentFilters !== undefined ? { relaxAgentFilters: params.relaxAgentFilters } : {})
    }
  });
}

export async function createRoutingRule(payload: CreateRoutingRulePayload): Promise<RoutingRule> {
  const query = buildQuery({ tenantId: payload.tenantId });
  return apiFetch<RoutingRule>(`routing/rules${query}`, {
    method: 'POST',
    body: {
      name: payload.name,
      priority: payload.priority,
      mode: payload.mode,
      enabled: payload.enabled ?? true,
      conditions: payload.conditions ?? {},
      targets: payload.targets,
      fallback: payload.fallback ?? null,
      ...(payload.slaFirstTouchMinutes !== undefined ? { slaFirstTouchMinutes: payload.slaFirstTouchMinutes } : {}),
      ...(payload.slaKeptAppointmentMinutes !== undefined ? { slaKeptAppointmentMinutes: payload.slaKeptAppointmentMinutes } : {})
    }
  });
}
