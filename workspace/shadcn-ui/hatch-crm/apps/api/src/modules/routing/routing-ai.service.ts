import { Injectable, Logger } from '@nestjs/common';
import { RoutingMode, UserRole } from '@hatch/db';
import { leadRoutingRuleConfigSchema } from '@hatch/shared';

import { AiService } from '@/modules/ai/ai.service';
import { PrismaService } from '@/modules/prisma/prisma.service';

const ROUTING_RULE_DRAFT_SYSTEM_PROMPT = `
You generate lead routing rule drafts for a real-estate CRM.

Return ONLY a JSON object with these top-level fields:
- name (string)
- priority (number)
- mode ("FIRST_MATCH" | "SCORE_AND_ASSIGN")
- enabled (boolean)
- conditions (object)
- targets (array)
- fallback (object|null)
- slaFirstTouchMinutes (number|null)
- slaKeptAppointmentMinutes (number|null)

Rule shapes:

conditions keys:
- geography: { includeStates?: string[], includeCities?: string[], includePostalCodes?: string[], excludeStates?: string[], excludeCities?: string[], excludePostalCodes?: string[] }
- priceBand: { min?: number, max?: number, currency?: string }
- sources: { include?: string[], exclude?: string[] }
- consent: { sms?: "OPTIONAL"|"GRANTED"|"NOT_REVOKED", email?: "OPTIONAL"|"GRANTED"|"NOT_REVOKED" }
- buyerRep: "ANY" | "REQUIRED_ACTIVE" | "PROHIBIT_ACTIVE"
- timeWindows: [{ timezone: string, start: "HH:MM", end: "HH:MM", days?: number[] }]
- demographics: { minAge?: number, maxAge?: number, tags?: { include?: string[], exclude?: string[], match?: "ANY"|"ALL" }, languages?: { include?: string[], exclude?: string[], match?: "ANY"|"ALL" }, ethnicities?: { include?: string[], exclude?: string[], match?: "ANY"|"ALL" } }
- customFields: [{ key: string, operator: "EQUALS"|"NOT_EQUALS"|"IN"|"NOT_IN"|"GT"|"GTE"|"LT"|"LTE"|"CONTAINS"|"NOT_CONTAINS"|"EXISTS"|"NOT_EXISTS", value?: any }]

targets items are one of:
- { type: "AGENT", id: string, label?: string, agentFilter?: { tags?: { include?: string[], exclude?: string[], match?: "ANY"|"ALL" }, languages?: { include?: string[], exclude?: string[], match?: "ANY"|"ALL" }, specialties?: { include?: string[], exclude?: string[], match?: "ANY"|"ALL" }, minKeptApptRate?: number, minCapacityRemaining?: number } }
- { type: "TEAM", id: string, strategy?: "BEST_FIT"|"ROUND_ROBIN", includeRoles?: string[], agentFilter?: { ...same as above } }
- { type: "POND", id: string, label?: string }

fallback is either null or:
- { teamId: string, label?: string, escalationChannels?: ("EMAIL"|"SMS"|"IN_APP")[], relaxAgentFilters?: boolean }

Guidance:
- Prefer TEAM targets unless a specific agent is explicitly requested.
- If the prompt describes "specialists", encode that under target.agentFilter (use match:"ALL" when multiple required traits exist).
- If you cannot choose a target from the available ids, use defaultTeamId.
- Keep SLAs null unless explicitly requested.
- Do not enable relaxAgentFilters unless the user explicitly requests relaxed routing.
`.trim();

const parseCommaSeparated = (value: string | null | undefined) =>
  (value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);

const normalizeTokens = (value: unknown) => {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => (typeof entry === 'string' ? [entry.trim()] : [])).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }
  return [];
};

const normalizeLowerUnique = (values: string[]) =>
  Array.from(new Set(values.map((entry) => entry.trim().toLowerCase()).filter(Boolean)));

const extractMoneyFloor = (prompt: string): number | null => {
  const match = prompt.match(/\$?\s*([\d,.]+)\s*(k|m)?/i);
  if (!match) return null;
  const raw = match[1]?.replace(/,/g, '') ?? '';
  const base = Number(raw);
  if (!Number.isFinite(base)) return null;
  const suffix = (match[2] ?? '').toLowerCase();
  const multiplier = suffix === 'm' ? 1_000_000 : suffix === 'k' ? 1_000 : 1;
  return Math.round(base * multiplier);
};

const extractMinAge = (prompt: string): number | null => {
  const match = prompt.match(/(?:over|older than|age)\s+(\d{1,3})/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
};

@Injectable()
export class RoutingAiService {
  private readonly logger = new Logger(RoutingAiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: AiService
  ) {}

  async draftRule(params: {
    tenantId: string;
    prompt: string;
    mode?: RoutingMode;
    defaultTeamId?: string;
    fallbackTeamId?: string;
    relaxAgentFilters?: boolean;
  }) {
    const [teams, agents] = await Promise.all([
      this.prisma.team.findMany({
        where: { tenantId: params.tenantId },
        select: { id: true, name: true }
      }),
      this.prisma.user.findMany({
        where: {
          tenantId: params.tenantId,
          role: { in: [UserRole.AGENT, UserRole.TEAM_LEAD] }
        },
        include: {
          memberships: true,
          agentProfilesForOrgs: true
        }
      })
    ]);

    const defaultTeamId =
      params.defaultTeamId ??
      teams[0]?.id ??
      null;
    const fallbackTeamId = params.fallbackTeamId ?? defaultTeamId;

    const agentSummaries = agents.map((agent) => {
      const profile =
        agent.agentProfilesForOrgs?.find((candidate) => candidate.organizationId === agent.organizationId) ??
        agent.agentProfilesForOrgs?.[0] ??
        null;
      const metadata = (profile?.metadata ?? {}) as Record<string, unknown>;
      const routingProfile = (metadata as any).routingProfile ?? (metadata as any).routing ?? {};
      const tags = normalizeLowerUnique([
        ...parseCommaSeparated(profile?.tags ?? null),
        ...normalizeTokens((routingProfile as any).tags)
      ]);
      const specialties = normalizeLowerUnique(normalizeTokens((routingProfile as any).specialties));
      const languages = normalizeLowerUnique(normalizeTokens((routingProfile as any).languages));

      return {
        id: agent.id,
        name: `${agent.firstName ?? ''} ${agent.lastName ?? ''}`.trim(),
        teamIds: agent.memberships?.map((membership) => membership.teamId).filter(Boolean) ?? [],
        tags,
        specialties,
        languages
      };
    });

    const payload = {
      prompt: params.prompt,
      defaultTeamId,
      fallbackTeamId,
      availableTeams: teams,
      availableAgents: agentSummaries
    };

    const warnings: string[] = [];

    const draft = await this.buildDraftWithFallback({
      payload,
      fallback: () => this.buildHeuristicDraft(params.prompt, defaultTeamId, fallbackTeamId, params.mode)
    });

    const normalized = this.normalizeDraft(draft, {
      defaultTeamId,
      fallbackTeamId,
      forcedMode: params.mode,
      relaxAgentFilters: params.relaxAgentFilters
    });

    try {
      const config = leadRoutingRuleConfigSchema.parse({
        conditions: normalized.conditions ?? {},
        targets: normalized.targets ?? [],
        fallback: normalized.fallback ?? null
      });

      return {
        ...normalized,
        conditions: config.conditions,
        targets: config.targets as unknown as Record<string, unknown>[],
        fallback: config.fallback ?? null,
        warnings: warnings.length ? warnings : undefined
      };
    } catch (error) {
      this.logger.warn('AI routing draft failed schema validation; returning heuristic draft.', error as Error);
      const heuristic = this.buildHeuristicDraft(params.prompt, defaultTeamId, fallbackTeamId, params.mode);
      return { ...heuristic, warnings: ['AI draft did not validate; used heuristic fallback instead.'] };
    }
  }

  private async buildDraftWithFallback(params: { payload: unknown; fallback: () => any }) {
    try {
      const response = await this.ai.runStructuredChat({
        systemPrompt: ROUTING_RULE_DRAFT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: JSON.stringify(params.payload) }],
        responseFormat: 'json_object',
        temperature: 0
      });

      if (!response.text) {
        return params.fallback();
      }

      const parsed = JSON.parse(response.text) as Record<string, unknown>;
      if (!parsed || typeof parsed !== 'object') {
        return params.fallback();
      }

      return parsed;
    } catch {
      return params.fallback();
    }
  }

  private normalizeDraft(
    draft: Record<string, unknown>,
    options: {
      defaultTeamId: string | null;
      fallbackTeamId: string | null;
      forcedMode?: RoutingMode;
      relaxAgentFilters?: boolean;
    }
  ) {
    const mode =
      (options.forcedMode as RoutingMode | undefined) ??
      (typeof draft.mode === 'string' ? (draft.mode as RoutingMode) : RoutingMode.SCORE_AND_ASSIGN);

    const enabled = typeof draft.enabled === 'boolean' ? draft.enabled : true;
    const priority = typeof draft.priority === 'number' && Number.isFinite(draft.priority) ? Math.round(draft.priority) : 0;
    const name =
      typeof draft.name === 'string' && draft.name.trim().length > 0
        ? draft.name.trim()
        : 'AI Routing Rule';

    const targets = Array.isArray(draft.targets) ? (draft.targets as Record<string, unknown>[]) : [];

    const fallback = draft.fallback && typeof draft.fallback === 'object' ? (draft.fallback as Record<string, unknown>) : null;

    const slaFirstTouchMinutes =
      typeof draft.slaFirstTouchMinutes === 'number' && Number.isFinite(draft.slaFirstTouchMinutes)
        ? Math.round(draft.slaFirstTouchMinutes)
        : null;
    const slaKeptAppointmentMinutes =
      typeof draft.slaKeptAppointmentMinutes === 'number' && Number.isFinite(draft.slaKeptAppointmentMinutes)
        ? Math.round(draft.slaKeptAppointmentMinutes)
        : null;

    const normalizedTargets =
      targets.length > 0
        ? targets
        : options.defaultTeamId
          ? [{ type: 'TEAM', id: options.defaultTeamId, strategy: 'BEST_FIT' }]
          : options.fallbackTeamId
            ? [{ type: 'POND', id: options.fallbackTeamId }]
            : [];

    let normalizedFallback =
      fallback ??
      (options.fallbackTeamId ? { teamId: options.fallbackTeamId } : null);

    if (options.relaxAgentFilters !== undefined) {
      if (normalizedFallback) {
        normalizedFallback = {
          ...normalizedFallback,
          relaxAgentFilters: options.relaxAgentFilters
        };
      } else if (options.fallbackTeamId) {
        normalizedFallback = { teamId: options.fallbackTeamId, relaxAgentFilters: options.relaxAgentFilters };
      }
    }

    return {
      name,
      priority,
      mode,
      enabled,
      conditions: (draft.conditions ?? {}) as Record<string, unknown>,
      targets: normalizedTargets,
      fallback: normalizedFallback,
      slaFirstTouchMinutes,
      slaKeptAppointmentMinutes
    };
  }

  private buildHeuristicDraft(prompt: string, defaultTeamId: string | null, fallbackTeamId: string | null, mode?: RoutingMode) {
    const lower = prompt.toLowerCase();
    const priceMin = extractMoneyFloor(prompt);
    const ageMin = extractMinAge(prompt);
    const wantsHispanic = lower.includes('hispanic') || lower.includes('latino') || lower.includes('latina');
    const wantsSpanish = lower.includes('spanish') || lower.includes('español') || lower.includes('espanol');

    const conditions: Record<string, unknown> = {};
    if (priceMin) {
      conditions.priceBand = { min: priceMin };
    }
    if (ageMin || wantsHispanic || wantsSpanish) {
      conditions.demographics = {
        ...(ageMin ? { minAge: ageMin } : {}),
        ...(wantsHispanic ? { ethnicities: { include: ['hispanic'], match: 'ANY' } } : {}),
        ...(wantsSpanish ? { languages: { include: ['spanish'], match: 'ANY' } } : {})
      };
    }

    const tagIncludes = normalizeLowerUnique([
      ...(priceMin ? ['luxury'] : []),
      ...(ageMin ? ['senior'] : []),
      ...(wantsHispanic ? ['hispanic'] : []),
      ...(wantsSpanish ? ['spanish'] : [])
    ]);

    const agentFilter =
      tagIncludes.length > 0
        ? {
            tags: { include: tagIncludes, match: 'ALL' }
          }
        : undefined;

    const targets =
      defaultTeamId
        ? [{ type: 'TEAM', id: defaultTeamId, strategy: 'BEST_FIT', ...(agentFilter ? { agentFilter } : {}) }]
        : fallbackTeamId
          ? [{ type: 'POND', id: fallbackTeamId }]
          : [];

    return {
      name: 'AI Routing Rule',
      priority: 0,
      mode: mode ?? RoutingMode.SCORE_AND_ASSIGN,
      enabled: true,
      conditions,
      targets,
      fallback: fallbackTeamId ? { teamId: fallbackTeamId } : null,
      slaFirstTouchMinutes: null,
      slaKeptAppointmentMinutes: null
    };
  }
}
