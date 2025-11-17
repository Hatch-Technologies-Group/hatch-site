import { BadRequestException, Injectable, Logger } from '@nestjs/common';

import {
  LeadHistoryEventType,
  LeadScoreTier,
  Prisma,
  SavedViewScope
} from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import type { RequestContext } from '../common/request-context';
import {
  ActivityFeedEntryDto,
  AgentPerformanceDto,
  ClientInsightsResponseDto,
  FilterOptionDto,
  GetInsightsQueryDto,
  HeatmapCellDto,
  HeatmapEntryDto,
  INSIGHTS_ACTIVITY_FILTERS,
  InsightsActivityFilter,
  InsightsQueuesDto,
  InsightsSummaryDto,
  QueueBreachEntryDto,
  ReengagementLeadDto,
  StageBottleneckDto,
  TrendCardDto
} from './dto';

const HOURS_IN_DAY = 24;
const MS_IN_HOUR = 1000 * 60 * 60;
const MS_IN_MINUTE = 1000 * 60;
const CACHE_TTL_MS = 60 * 1000;

export const INSIGHTS_RESPONSE_VERSION = 1;

interface PeriodWindow {
  label: string;
  days: number;
  start: Date;
  end: Date;
}

interface LeadBasics {
  id: string;
  firstName: string;
  lastName: string;
  ownerId: string | null;
  ownerName: string | null;
  ownerAvatar: string | null;
  stageId: string | null;
  stageName: string | null;
  stageOrder: number | null;
  scoreTier: LeadScoreTier | null;
  stageEnteredAt: Date | null;
  lastActivityAt: Date | null;
}

interface AnalyticsRow {
  tenantId: string;
  personId: string;
  touchpoints1d: number;
  touchpoints7d: number;
  touchpoints14d: number;
  touchpoints30d: number;
  touchpoints60d: number;
  lastTouchpointAt: Date | null;
  stageMovesTotal: number;
  stageMovesForward: number;
  avgStageDurationMs: number | null;
  slaBreaches: number;
  avgResponseMs: number | null;
  bucketStart?: Date | null;
  bucketEnd?: Date | null;
  stageKey?: string | null;
}

interface StageMoveEvent {
  personId: string;
  occurredAt: Date;
  fromStageId: string | null;
  toStageId: string | null;
  fromStageName: string | null;
  toStageName: string | null;
  durationMs: number | null;
}

interface StageMeta {
  id: string;
  name: string;
  order: number | null;
}

interface CacheEntry {
  expiresAt: number;
  payload: ClientInsightsResponseDto;
  tenantId: string;
}

interface CacheKeyInput {
  tenantId: string;
  ownerId?: string;
  teamId?: string;
  stageIds?: string[];
  tier?: string;
  activity?: string;
  period: PeriodWindow;
  viewId?: string;
  dormantDays: number;
  limit: number;
  version: number;
}

export const buildInsightsCacheKey = (input: CacheKeyInput): string => {
  return JSON.stringify({
    tenantId: input.tenantId,
    ownerId: input.ownerId ?? null,
    teamId: input.teamId ?? null,
    stageIds: input.stageIds ? [...input.stageIds].sort() : null,
    tier: input.tier ?? null,
    activity: input.activity ?? null,
    period: {
      start: input.period.start.toISOString(),
      end: input.period.end.toISOString()
    },
    viewId: input.viewId ?? null,
    dormantDays: input.dormantDays,
    limit: input.limit,
    version: input.version
  });
};

@Injectable()
export class InsightsService {
  private readonly responseCache = new Map<string, CacheEntry>();
  private readonly cacheIndex = new Map<string, Set<string>>();
  private readonly logger = new Logger(InsightsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getInsights(ctx: RequestContext, query: GetInsightsQueryDto): Promise<ClientInsightsResponseDto> {
    const tenantId = query.tenantId ?? ctx.tenantId;
    if (!tenantId) {
      throw new BadRequestException('tenantId could not be resolved from the request');
    }

    const period = this.resolvePeriod(query.period);
    const requestStart = Date.now();
    const dormantDays = query.dormantDays ?? Math.max(7, Math.min(30, period.days));
    const limit = query.limit ?? 50;

    const savedViewFilters = query.viewId
      ? await this.resolveSavedViewFilters(ctx, query.viewId)
      : { ownerId: undefined, tier: undefined, stageIds: undefined, teamId: undefined };
    const ownerFilter = query.ownerId ?? savedViewFilters.ownerId;
    const tierFilter = query.tier ?? savedViewFilters.tier;
    const stageFilter = query.stage?.length ? query.stage : savedViewFilters.stageIds;
    const teamFilter = query.teamId ?? savedViewFilters.teamId;
    if (teamFilter && !query.teamId) {
      query.teamId = teamFilter;
    }

    const cacheKey = buildInsightsCacheKey({
      tenantId,
      ownerId: ownerFilter,
      teamId: teamFilter,
      stageIds: stageFilter,
      tier: tierFilter,
      activity: query.activity,
      period,
      viewId: query.viewId,
      dormantDays,
      limit,
      version: INSIGHTS_RESPONSE_VERSION
    });

    const cached = this.getCachedResponse(cacheKey);
    if (cached) {
      this.logMetric(`metric=insights.query.cache_hit tenant=${tenantId} value=1`);
      this.logMetric(`metric=insights.query.latency_ms tenant=${tenantId} value=${Date.now() - requestStart}`);
      return cached;
    }
    this.logMetric(`metric=insights.query.cache_hit tenant=${tenantId} value=0`);

    const personFilter = this.buildLeadFilter({
      tenantId,
      ownerId: ownerFilter,
      tier: tierFilter,
      stageIds: stageFilter,
      activity: query.activity,
      period
    });

    const leads = await this.prisma.person.findMany({
      where: personFilter,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        ownerId: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true
          }
        },
        stageId: true,
        stageEnteredAt: true,
        lastActivityAt: true,
        scoreTier: true,
        pipelineStage: {
          select: {
            id: true,
            name: true,
            order: true
          }
        }
      }
    });

    if (leads.length === 0) {
      const filters = await this.buildFiltersPayload(ctx, tenantId, [], dormantDays);
      const emptyResponse: ClientInsightsResponseDto = {
        v: INSIGHTS_RESPONSE_VERSION,
        period: this.periodPayload(period),
        summary: {
          activeLeads: 0,
          avgStageTimeHours: null,
          conversionPct: null,
          deltaWoW: null
        },
        filters,
        heatmap: [],
        bottlenecks: [],
        leaderboard: [],
        feed: [],
        reengagementQueue: [],
        queues: { reengage: [], breaches: [] },
        trendCards: [],
        copilotInsights: [],
        engagement: { byStage: [], byOwner: [], byTier: [] },
        activityFeed: [],
        dataAge: null
      };
      this.cacheResponse(cacheKey, tenantId, emptyResponse);
      return emptyResponse;
    }

    const leadIds = leads.map((lead) => lead.id);
    const stageIds = new Set<string>();
    const leadMap = new Map<string, LeadBasics>();

    for (const lead of leads) {
      if (lead.stageId) {
        stageIds.add(lead.stageId);
      }

      leadMap.set(lead.id, {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        ownerId: lead.ownerId,
        ownerName: lead.owner
          ? `${lead.owner.firstName} ${lead.owner.lastName}`.trim()
          : null,
        ownerAvatar: lead.owner?.avatarUrl ?? null,
        stageId: lead.stageId,
        stageName: lead.pipelineStage?.name ?? null,
        stageOrder: lead.pipelineStage?.order ?? null,
        scoreTier: lead.scoreTier ?? null,
        stageEnteredAt: lead.stageEnteredAt,
        lastActivityAt: lead.lastActivityAt
      });
    }

    const [
      analyticsRowsRaw,
      stageMoveEventsRaw,
      touchpointsRaw,
      toursRaw,
      savedViews
    ] = await Promise.all([
      this.prisma.leadAnalyticsView.findMany({
        where: { tenantId, personId: { in: leadIds } }
      }),
      this.loadStageMoves(tenantId, leadIds, period),
      this.prisma.leadTouchpoint.findMany({
        where: {
          tenantId,
          personId: { in: leadIds },
          occurredAt: { gte: period.start }
        },
        select: {
          id: true,
          personId: true,
          occurredAt: true,
          type: true,
          channel: true,
          summary: true,
          metadata: true,
          user: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { occurredAt: 'desc' },
        take: limit
      }),
      this.prisma.tour.findMany({
        where: {
          tenantId,
          personId: { in: leadIds },
          OR: [
            { createdAt: { gte: period.start } },
            { updatedAt: { gte: period.start } },
            { startAt: { gte: period.start } }
          ]
        },
        select: {
          id: true,
          personId: true,
          status: true,
          startAt: true,
          createdAt: true,
          updatedAt: true,
          agent: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: { startAt: 'desc' },
        take: Math.min(limit, 100)
      }),
      this.prisma.savedView.findMany({
        where: {
          tenantId,
          OR: [
            { scope: SavedViewScope.ORGANIZATION },
            { scope: SavedViewScope.TEAM, teamId: { in: ctx.teamIds } },
            { scope: SavedViewScope.PRIVATE, userId: ctx.userId }
          ]
        },
        orderBy: { updatedAt: 'desc' },
        take: 30
      })
    ]);

    const analyticsMap = new Map<string, AnalyticsRow>();
    let newestBucketEnd: Date | null = null;
    for (const row of analyticsRowsRaw) {
      analyticsMap.set(row.personId, {
        tenantId: row.tenantId,
        personId: row.personId,
        touchpoints1d: row.touchpoints1d ?? 0,
        touchpoints7d: row.touchpoints7d ?? 0,
        touchpoints14d: row.touchpoints14d ?? 0,
        touchpoints30d: row.touchpoints30d ?? 0,
        touchpoints60d: row.touchpoints60d ?? 0,
        lastTouchpointAt: row.lastTouchpointAt ?? null,
        stageMovesTotal: row.stageMovesTotal ?? 0,
        stageMovesForward: row.stageMovesForward ?? 0,
        avgStageDurationMs: row.avgStageDurationMs ? Number(row.avgStageDurationMs) : null,
        slaBreaches: row.slaBreaches ?? 0,
        avgResponseMs: row.avgResponseMs ? Number(row.avgResponseMs) : null,
        bucketStart: row.bucketStart ?? null,
        bucketEnd: row.bucketEnd ?? null,
        stageKey: row.stageKey ?? null
      });
      if (row.bucketEnd) {
        const bucketEndDate = row.bucketEnd instanceof Date ? row.bucketEnd : new Date(row.bucketEnd as unknown as string);
        if (!newestBucketEnd || bucketEndDate > newestBucketEnd) {
          newestBucketEnd = bucketEndDate;
        }
      }
    }

    const stageMoveEvents = stageMoveEventsRaw.map((event) => {
      if (event.fromStageId) {
        stageIds.add(event.fromStageId);
      }
      if (event.toStageId) {
        stageIds.add(event.toStageId);
      }
      return event;
    });

    const extraStageIds = Array.from(stageIds).filter(
      (id) => !this.stageKnownInLeadMap(id, leadMap)
    );
    const extraStages = extraStageIds.length
      ? await this.prisma.stage.findMany({
          where: { id: { in: extraStageIds } },
          select: { id: true, name: true, order: true }
        })
      : [];

    const stageMetaMap = new Map<string, StageMeta>();
    for (const lead of leadMap.values()) {
      if (lead.stageId && !stageMetaMap.has(lead.stageId)) {
        stageMetaMap.set(lead.stageId, {
          id: lead.stageId,
          name: lead.stageName ?? 'Unassigned',
          order: lead.stageOrder ?? null
        });
      }
    }
    for (const stage of extraStages) {
      if (!stageMetaMap.has(stage.id)) {
        stageMetaMap.set(stage.id, {
          id: stage.id,
          name: stage.name,
          order: stage.order ?? null
        });
      }
    }

    const engagementData = this.computeEngagement(leads, analyticsMap, period);
    const bottlenecksData = this.computeStageBottlenecks({
      leads: leadMap,
      analytics: analyticsMap,
      stageMeta: stageMetaMap,
      stageMoves: stageMoveEvents,
      period,
      dormantDays
    });
    const leaderboardData = this.computeAgentLeaderboard({
      leads: leadMap,
      analytics: analyticsMap,
      stageMoves: stageMoveEvents,
      period
    });
    const activityFeed = this.composeActivityFeed({
      leads: leadMap,
      stageMoves: stageMoveEvents,
      touchpoints: touchpointsRaw,
      tours: toursRaw,
      limit
    });
    const reengagementQueue = this.computeReengagementQueue({
      leads: leadMap,
      analytics: analyticsMap,
      stageMeta: stageMetaMap,
      dormantDays
    });
    const trendCards = this.buildTrendCards({
      engagement: engagementData.matrices,
      leaderboard: leaderboardData.leaderboard,
      reengagementQueue,
      period
    });
    const copilotInsights = this.buildCopilotInsights({
      bottlenecks: bottlenecksData.list,
      leaderboard: leaderboardData.leaderboard,
      reengagementQueue,
      period
    });
    const filters = await this.buildFiltersPayload(ctx, tenantId, savedViews, dormantDays, leadMap, analyticsMap);

    const dataAge = newestBucketEnd ? newestBucketEnd.toISOString() : null;

    const summary = this.buildSummary({
      activeLeads: leadMap.size,
      bottleneckTotals: bottlenecksData.aggregates,
      leaderboardTotals: leaderboardData.totals
    });

    const queues: InsightsQueuesDto = {
      reengage: reengagementQueue.slice(0, limit),
      breaches: this.computeBreachQueue({
        analytics: analyticsMap,
        leads: leadMap,
        limit
      })
    };

    const response: ClientInsightsResponseDto = {
      v: INSIGHTS_RESPONSE_VERSION,
      period: this.periodPayload(period),
      summary,
      filters,
      heatmap: engagementData.stageHeatmap,
      bottlenecks: bottlenecksData.list,
      leaderboard: leaderboardData.leaderboard,
      feed: activityFeed,
      reengagementQueue: reengagementQueue.slice(0, limit),
      queues,
      trendCards,
      copilotInsights,
      engagement: engagementData.matrices,
      activityFeed,
      dataAge
    };

    this.cacheResponse(cacheKey, tenantId, response);
    this.logMetric(`metric=insights.query.latency_ms tenant=${tenantId} value=${Date.now() - requestStart}`);
    return response;
  }

  private resolvePeriod(raw?: string): PeriodWindow {
    const now = new Date();
    if (!raw) {
      const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
      return {
        label: '7 days',
        days: 7,
        start,
        end: now
      };
    }

    const match = /^(\d+)d$/i.exec(raw.trim());
    if (!match) {
      throw new BadRequestException('period must follow the pattern <number>d (e.g. 7d)');
    }
    const parsedDays = Number.parseInt(match[1], 10);
    if (!Number.isFinite(parsedDays) || parsedDays <= 0) {
      throw new BadRequestException('period must be a positive integer of days');
    }
    const safeDays = Math.min(90, parsedDays);
    const start = new Date(now.getTime() - (safeDays - 1) * 24 * 60 * 60 * 1000);
    return {
      label: `${safeDays} days`,
      days: safeDays,
      start,
      end: now
    };
  }

  private periodPayload(period: PeriodWindow) {
    return {
      label: period.label,
      days: period.days,
      start: period.start.toISOString(),
      end: period.end.toISOString()
    };
  }

  private stageKnownInLeadMap(stageId: string, leadMap: Map<string, LeadBasics>) {
    for (const lead of leadMap.values()) {
      if (lead.stageId === stageId) {
        return true;
      }
    }
    return false;
  }

  private buildLeadFilter(params: {
    tenantId: string;
    ownerId?: string;
    tier?: string;
    stageIds?: string[];
    activity?: InsightsActivityFilter;
    period: PeriodWindow;
  }): Prisma.PersonWhereInput {
    const base: Prisma.PersonWhereInput = {
      tenantId: params.tenantId,
      deletedAt: null
    };

    if (params.ownerId) {
      base.ownerId = params.ownerId;
    }
    if (params.tier) {
      const upperTier = params.tier.toUpperCase() as keyof typeof LeadScoreTier;
      if ((LeadScoreTier as Record<string, LeadScoreTier>)[upperTier]) {
        base.scoreTier = LeadScoreTier[upperTier];
      }
    }
    if (params.stageIds && params.stageIds.length > 0) {
      base.stageId = { in: params.stageIds };
    }

    if (!params.activity) {
      return base;
    }

    const now = new Date();
    switch (params.activity) {
      case 'ACTIVE_TODAY': {
        const startOfDay = new Date(now);
        startOfDay.setUTCHours(0, 0, 0, 0);
        base.lastActivityAt = { gte: startOfDay };
        break;
      }
      case 'INACTIVE_7D': {
        const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        base.OR = [{ lastActivityAt: null }, { lastActivityAt: { lt: cutoff } }];
        break;
      }
      case 'BREACHED_SLA':
        // Cannot directly express in Person filter; handled later.
        break;
      default:
        if (!INSIGHTS_ACTIVITY_FILTERS.includes(params.activity)) {
          throw new BadRequestException(`Unknown activity filter: ${params.activity}`);
        }
    }

    return base;
  }

  private async resolveSavedViewFilters(
    ctx: RequestContext,
    viewId: string
  ): Promise<{ ownerId?: string; tier?: string; stageIds?: string[]; teamId?: string }> {
    const view = await this.prisma.savedView.findUnique({
      where: { id: viewId }
    });
    if (!view) {
      return {};
    }

    const accessible =
      view.scope === SavedViewScope.ORGANIZATION ||
      (view.scope === SavedViewScope.PRIVATE && view.userId === ctx.userId) ||
      (view.scope === SavedViewScope.TEAM && view.teamId && ctx.teamIds.includes(view.teamId));

    if (!accessible) {
      return {};
    }

    const filters = (view.filters ?? {}) as Record<string, unknown>;
    const ownerId =
      typeof filters.ownerId === 'string'
        ? filters.ownerId
        : Array.isArray(filters.ownerIds) && filters.ownerIds.length === 1
          ? String(filters.ownerIds[0])
          : undefined;
    const tier =
      typeof filters.tier === 'string'
        ? filters.tier
        : Array.isArray(filters.tiers) && filters.tiers.length === 1
          ? String(filters.tiers[0])
          : undefined;
    const stageIds = Array.isArray(filters.stageIds)
      ? filters.stageIds.map((stage) => String(stage)).filter(Boolean)
      : undefined;

    const queryBlock = (view.query ?? null) as Record<string, unknown> | null;
    const queryOwner =
      typeof queryBlock?.ownerId === 'string'
        ? queryBlock.ownerId
        : Array.isArray(queryBlock?.ownerIds) && queryBlock?.ownerIds.length === 1
          ? String(queryBlock.ownerIds[0])
          : undefined;
    const queryTier =
      typeof queryBlock?.tier === 'string'
        ? queryBlock.tier
        : Array.isArray(queryBlock?.tierIds) && queryBlock.tierIds.length === 1
          ? String(queryBlock.tierIds[0])
          : undefined;
    const queryStages = Array.isArray(queryBlock?.stageIds)
      ? (queryBlock.stageIds as unknown[]).map((stage) => String(stage)).filter(Boolean)
      : undefined;

    const dedupe = (list?: string[] | undefined) => (list ? Array.from(new Set(list)) : undefined);

    return {
      ownerId: ownerId ?? queryOwner,
      tier: tier ?? queryTier,
      stageIds: dedupe(stageIds ?? queryStages),
      teamId: typeof queryBlock?.teamId === 'string' ? queryBlock.teamId : undefined
    };
  }

  private async loadStageMoves(
    tenantId: string,
    leadIds: string[],
    period: PeriodWindow
  ): Promise<StageMoveEvent[]> {
    const events = await this.prisma.leadHistory.findMany({
      where: {
        tenantId,
        personId: { in: leadIds },
        eventType: LeadHistoryEventType.STAGE_MOVED,
        occurredAt: {
          gte: period.start,
          lte: period.end
        }
      },
      select: {
        personId: true,
        occurredAt: true,
        payload: true
      },
      orderBy: { occurredAt: 'desc' },
      take: 500
    });

    return events.map((event) => {
      const payload = (event.payload ?? {}) as Record<string, unknown>;
      const fromStageId = this.resolveStageId(payload, 'from');
      const toStageId = this.resolveStageId(payload, 'to');
      const fromStageName = this.resolveStageName(payload, 'from');
      const toStageName = this.resolveStageName(payload, 'to');
      const durationMs = this.resolveDurationMs(payload);

      return {
        personId: event.personId,
        occurredAt: event.occurredAt,
        fromStageId,
        toStageId,
        fromStageName,
        toStageName,
        durationMs
      };
    });
  }

  private resolveStageId(payload: Record<string, unknown>, prefix: 'from' | 'to'): string | null {
    const direct = payload[`${prefix}StageId`];
    if (typeof direct === 'string' && direct.trim().length > 0) {
      return direct;
    }
    const nested = payload[`${prefix}Stage`];
    if (nested && typeof nested === 'object' && nested !== null) {
      const candidate = (nested as Record<string, unknown>).id;
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }
    return null;
  }

  private resolveStageName(payload: Record<string, unknown>, prefix: 'from' | 'to'): string | null {
    const direct = payload[`${prefix}StageName`];
    if (typeof direct === 'string') {
      return direct;
    }
    const nested = payload[`${prefix}Stage`];
    if (nested && typeof nested === 'object' && nested !== null) {
      const candidate = (nested as Record<string, unknown>).name;
      if (typeof candidate === 'string') {
        return candidate;
      }
    }
    return null;
  }

  private resolveDurationMs(payload: Record<string, unknown>): number | null {
    const candidates = [
      payload.durationMs,
      payload.stageDurationMs,
      payload.timeInStageMs,
      payload.timeMs,
      payload.durationSeconds ? Number(payload.durationSeconds) * 1000 : null,
      payload.timeInStageSeconds ? Number(payload.timeInStageSeconds) * 1000 : null
    ].filter((value) => value !== undefined && value !== null);

    for (const candidate of candidates) {
      const asNumber = Number(candidate);
      if (Number.isFinite(asNumber) && asNumber >= 0) {
        return asNumber;
      }
    }
    return null;
  }

  private computeEngagement(
    leads: Array<{
      id: string;
      ownerId: string | null;
      scoreTier: LeadScoreTier | null;
      stageId: string | null;
      pipelineStage: { name: string | null } | null;
    }>,
    analytics: Map<string, AnalyticsRow>,
    period: PeriodWindow
  ): {
    matrices: { byStage: HeatmapCellDto[]; byOwner: HeatmapCellDto[]; byTier: HeatmapCellDto[] };
    stageHeatmap: HeatmapEntryDto[];
    totals: { leads: number; engaged: number; touchpoints: number };
  } {
    const stageAggregates = new Map<string, { label: string; leads: number; engaged: number; touchpoints: number }>();
    const ownerAggregates = new Map<string, { label: string; leads: number; engaged: number; touchpoints: number }>();
    const tierAggregates = new Map<string, { label: string; leads: number; engaged: number; touchpoints: number }>();
    let totalLeads = 0;
    let totalEngaged = 0;
    let totalTouchpoints = 0;

    for (const lead of leads) {
      const analyticsRow = analytics.get(lead.id);
      const touchpoints = analyticsRow ? this.resolveTouchpointsForPeriod(analyticsRow, period.days) : 0;
      const engaged = touchpoints > 0 ? 1 : 0;
      totalLeads += 1;
      totalEngaged += engaged;
      totalTouchpoints += touchpoints;

      const stageKey = lead.stageId ?? 'unassigned';
      const stageEntry = stageAggregates.get(stageKey) ?? {
        label: lead.pipelineStage?.name ?? 'Unassigned',
        leads: 0,
        engaged: 0,
        touchpoints: 0
      };
      stageEntry.leads += 1;
      stageEntry.engaged += engaged;
      stageEntry.touchpoints += touchpoints;
      stageAggregates.set(stageKey, stageEntry);

      const ownerKey = lead.ownerId ?? 'unowned';
      const ownerEntry = ownerAggregates.get(ownerKey) ?? {
        label: ownerKey === 'unowned' ? 'Unassigned' : 'Owner',
        leads: 0,
        engaged: 0,
        touchpoints: 0
      };
      ownerEntry.leads += 1;
      ownerEntry.engaged += engaged;
      ownerEntry.touchpoints += touchpoints;
      ownerAggregates.set(ownerKey, ownerEntry);

      const tierKey = lead.scoreTier ?? 'UNKNOWN';
      const tierEntry = tierAggregates.get(tierKey) ?? {
        label: tierKey === 'UNKNOWN' ? 'Unscored' : `Tier ${tierKey}`,
        leads: 0,
        engaged: 0,
        touchpoints: 0
      };
      tierEntry.leads += 1;
      tierEntry.engaged += engaged;
      tierEntry.touchpoints += touchpoints;
      tierAggregates.set(tierKey, tierEntry);
    }

    const toCells = (entries: Map<string, { label: string; leads: number; engaged: number; touchpoints: number }>) =>
      Array.from(entries.entries()).map<HeatmapCellDto>(([key, value]) => ({
        key,
        label: value.label,
        leads: value.leads,
        engaged: value.engaged,
        touchpoints: value.touchpoints,
        intensity: value.leads > 0 ? Math.min(1, value.engaged / value.leads) : 0
      }));

    const stageHeatmap: HeatmapEntryDto[] = Array.from(stageAggregates.entries()).map(([_, value]) => ({
      stage: value.label,
      engaged: value.engaged,
      inactive: Math.max(0, value.leads - value.engaged)
    }));

    return {
      matrices: {
        byStage: toCells(stageAggregates).sort((a, b) => a.label.localeCompare(b.label)),
        byOwner: toCells(ownerAggregates).sort((a, b) => b.engaged - a.engaged),
        byTier: toCells(tierAggregates).sort((a, b) => a.label.localeCompare(b.label))
      },
      stageHeatmap: stageHeatmap.sort((a, b) => b.engaged - a.engaged),
      totals: {
        leads: totalLeads,
        engaged: totalEngaged,
        touchpoints: totalTouchpoints
      }
    };
  }

  private resolveTouchpointsForPeriod(row: AnalyticsRow, days: number): number {
    if (days <= 1) return row.touchpoints1d ?? 0;
    if (days <= 7) return row.touchpoints7d ?? 0;
    if (days <= 14) return row.touchpoints14d ?? 0;
    if (days <= 30) return row.touchpoints30d ?? 0;
    return row.touchpoints60d ?? 0;
  }

  private computeStageBottlenecks(params: {
    leads: Map<string, LeadBasics>;
    analytics: Map<string, AnalyticsRow>;
    stageMeta: Map<string, StageMeta>;
    stageMoves: StageMoveEvent[];
    period: PeriodWindow;
    dormantDays: number;
  }): { list: StageBottleneckDto[]; aggregates: { totalDurationMs: number; durationSamples: number; forwardTransitions: number; transitionsOut: number } } {
    const stageStats = new Map<
      string,
      {
        stageId: string;
        stageName: string;
        order: number | null;
        leads: number;
        stalled: number;
        touchpoints: number;
        engagedLeads: number;
        transitionsOut: number;
        forwardTransitions: number;
        totalDurationMs: number;
        durationSamples: number;
      }
    >();

    const stallThresholdMs = params.dormantDays * HOURS_IN_DAY * MS_IN_HOUR;
    const now = new Date();
    let totalDurationMs = 0;
    let durationSamples = 0;
    let forwardTransitions = 0;
    let transitionsOut = 0;

    for (const lead of params.leads.values()) {
      const stageId = lead.stageId ?? 'unassigned';
      const stageMeta = params.stageMeta.get(stageId) ?? {
        id: stageId,
        name: lead.stageName ?? 'Unassigned',
        order: lead.stageOrder ?? null
      };
      const analyticsRow = params.analytics.get(lead.id);
      const touchpoints = analyticsRow ? this.resolveTouchpointsForPeriod(analyticsRow, params.period.days) : 0;
      const engaged = touchpoints > 0 ? 1 : 0;

      const entry = stageStats.get(stageId) ?? {
        stageId,
        stageName: stageMeta.name,
        order: stageMeta.order ?? null,
        leads: 0,
        stalled: 0,
        touchpoints: 0,
        engagedLeads: 0,
        transitionsOut: 0,
        forwardTransitions: 0,
        totalDurationMs: 0,
        durationSamples: 0
      };

      entry.leads += 1;
      entry.touchpoints += touchpoints;
      entry.engagedLeads += engaged;

      if (lead.stageEnteredAt) {
        const elapsed = now.getTime() - lead.stageEnteredAt.getTime();
        if (elapsed >= stallThresholdMs) {
          entry.stalled += 1;
        }
      }

      stageStats.set(stageId, entry);
    }

    for (const move of params.stageMoves) {
      if (!move.fromStageId) {
        continue;
      }
      const stageMeta = params.stageMeta.get(move.fromStageId) ?? {
        id: move.fromStageId,
        name: move.fromStageName ?? 'Stage',
        order: null
      };
      const entry = stageStats.get(move.fromStageId) ?? {
        stageId: move.fromStageId,
        stageName: stageMeta.name,
        order: stageMeta.order,
        leads: 0,
        stalled: 0,
        touchpoints: 0,
        engagedLeads: 0,
        transitionsOut: 0,
        forwardTransitions: 0,
        totalDurationMs: 0,
        durationSamples: 0
      };

      entry.transitionsOut += 1;
      if (move.durationMs) {
        entry.totalDurationMs += move.durationMs;
        entry.durationSamples += 1;
        totalDurationMs += move.durationMs;
        durationSamples += 1;
      }

      if (move.toStageId) {
        const fromOrder = entry.order ?? null;
        const toStageMeta = params.stageMeta.get(move.toStageId);
        const toOrder = toStageMeta?.order ?? null;
        if (fromOrder !== null && toOrder !== null && toOrder > fromOrder) {
          entry.forwardTransitions += 1;
          forwardTransitions += 1;
        } else if (!toStageMeta && move.toStageName) {
          entry.forwardTransitions += 1;
          forwardTransitions += 1;
        }
      }

      transitionsOut += 1;
      stageStats.set(move.fromStageId, entry);
    }

    const result: StageBottleneckDto[] = [];

    for (const entry of stageStats.values()) {
      const avgTimeHours =
        entry.durationSamples > 0 ? Number((entry.totalDurationMs / entry.durationSamples) / MS_IN_HOUR) : null;
      const conversionRate =
        entry.transitionsOut > 0 ? Number(entry.forwardTransitions / entry.transitionsOut) : null;
      const touchpointsPerLead = entry.leads > 0 ? entry.touchpoints / entry.leads : 0;

      result.push({
        stageId: entry.stageId,
        stageName: entry.stageName,
        avgTimeHours: avgTimeHours !== null ? Number(avgTimeHours.toFixed(2)) : null,
        conversionRate: conversionRate !== null ? Number(conversionRate.toFixed(3)) : null,
        stalled: entry.stalled,
        touchpointsPerLead: Number(touchpointsPerLead.toFixed(2))
      });
    }

    return {
      list: result.sort((a, b) => {
        if (a.conversionRate === null && b.conversionRate === null) return b.stalled - a.stalled;
        if (a.conversionRate === null) return 1;
        if (b.conversionRate === null) return -1;
        return a.conversionRate - b.conversionRate;
      }),
      aggregates: {
        totalDurationMs,
        durationSamples,
        forwardTransitions,
        transitionsOut
      }
    };
  }

  private computeAgentLeaderboard(params: {
    leads: Map<string, LeadBasics>;
    analytics: Map<string, AnalyticsRow>;
    stageMoves: StageMoveEvent[];
    period: PeriodWindow;
  }): { leaderboard: AgentPerformanceDto[]; totals: { conversions: number; conversionAttempts: number; slaBreaches: number } } {
    const agentStats = new Map<
      string,
      {
        agentId: string;
        agentName: string;
        avatarUrl: string | null;
        leads: number;
        touchpoints: number;
        slaBreaches: number;
        responseSumMs: number;
        responseSamples: number;
        conversionAttempts: number;
        conversions: number;
      }
    >();

    for (const lead of params.leads.values()) {
      if (!lead.ownerId) {
        continue;
      }

      const analyticsRow = params.analytics.get(lead.id);
      const touchpoints = analyticsRow ? this.resolveTouchpointsForPeriod(analyticsRow, params.period.days) : 0;
      const responseMs = analyticsRow?.avgResponseMs ?? null;
      const slaBreaches = analyticsRow?.slaBreaches ?? 0;

      const entry = agentStats.get(lead.ownerId) ?? {
        agentId: lead.ownerId,
        agentName: lead.ownerName ?? 'Assigned Agent',
        avatarUrl: lead.ownerAvatar ?? null,
        leads: 0,
        touchpoints: 0,
        slaBreaches: 0,
        responseSumMs: 0,
        responseSamples: 0,
        conversionAttempts: 0,
        conversions: 0
      };

      entry.leads += 1;
      entry.touchpoints += touchpoints;
      entry.slaBreaches += slaBreaches;
      if (responseMs && Number.isFinite(responseMs)) {
        entry.responseSumMs += responseMs;
        entry.responseSamples += 1;
      }

      agentStats.set(lead.ownerId, entry);
    }

    for (const move of params.stageMoves) {
      const lead = params.leads.get(move.personId);
      if (!lead || !lead.ownerId) continue;
      const entry = agentStats.get(lead.ownerId);
      if (!entry) continue;

      entry.conversionAttempts += 1;

      const movedToClosed = move.toStageName ? move.toStageName.toLowerCase().includes('closed') : false;

      if (move.fromStageId && move.toStageId) {
        const fromOrder = lead.stageId === move.fromStageId ? lead.stageOrder ?? null : null;
        const destination = params.leads.get(move.personId);
        const toOrder =
          move.toStageId && destination?.stageId === move.toStageId
            ? destination.stageOrder ?? null
            : null;

        if ((fromOrder !== null && toOrder !== null && toOrder > fromOrder) || movedToClosed) {
          entry.conversions += 1;
        }
      } else if (movedToClosed) {
        entry.conversions += 1;
      }
    }

    const leaderboard: AgentPerformanceDto[] = [];
    let totalConversions = 0;
    let totalConversionAttempts = 0;
    let totalBreaches = 0;

    for (const entry of agentStats.values()) {
      const avgResponseMinutes =
        entry.responseSamples > 0 ? Number((entry.responseSumMs / entry.responseSamples) / MS_IN_MINUTE) : null;
      const conversionRate =
        entry.conversionAttempts > 0 ? Number((entry.conversions / entry.conversionAttempts).toFixed(3)) : null;

      leaderboard.push({
        agentId: entry.agentId,
        agentName: entry.agentName,
        avatarUrl: entry.avatarUrl,
        activeLeads: entry.leads,
        touchpoints: entry.touchpoints,
        slaBreaches: entry.slaBreaches,
        avgResponseMinutes: avgResponseMinutes !== null ? Number(avgResponseMinutes.toFixed(1)) : null,
        conversionRate
      });

      totalConversions += entry.conversions;
      totalConversionAttempts += entry.conversionAttempts;
      totalBreaches += entry.slaBreaches;
    }

    return {
      leaderboard: leaderboard.sort((a, b) => {
        if (a.touchpoints === b.touchpoints) {
          return (a.avgResponseMinutes ?? Infinity) - (b.avgResponseMinutes ?? Infinity);
        }
        return b.touchpoints - a.touchpoints;
      }),
      totals: {
        conversions: totalConversions,
        conversionAttempts: totalConversionAttempts,
        slaBreaches: totalBreaches
      }
    };
  }

  private composeActivityFeed(params: {
    leads: Map<string, LeadBasics>;
    stageMoves: StageMoveEvent[];
    touchpoints: Array<{
      id: string;
      personId: string;
      occurredAt: Date;
      type: string;
      channel: string | null;
      summary: string | null;
      metadata: Prisma.JsonValue | null;
      user: { firstName: string | null; lastName: string | null } | null;
    }>;
    tours: Array<{
      id: string;
      personId: string;
      status: string;
      startAt: Date;
      createdAt: Date;
      updatedAt: Date;
      agent: { firstName: string | null; lastName: string | null } | null;
    }>;
    limit: number;
  }): ActivityFeedEntryDto[] {
    const feed: ActivityFeedEntryDto[] = [];

    for (const move of params.stageMoves) {
      const lead = params.leads.get(move.personId);
      if (!lead) continue;

      feed.push({
        id: `stage-${move.personId}-${move.occurredAt.getTime()}`,
        type: 'STAGE_MOVED',
        occurredAt: move.occurredAt.toISOString(),
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`.trim(),
        ownerName: lead.ownerName,
        summary: `${move.fromStageName ?? 'Stage'} → ${move.toStageName ?? 'Stage'}`,
        metadata: move.durationMs
          ? {
              timeInStageHours: Number((move.durationMs / MS_IN_HOUR).toFixed(2))
            }
          : undefined
      });
    }

    for (const touchpoint of params.touchpoints) {
      const lead = params.leads.get(touchpoint.personId);
      if (!lead) continue;

      feed.push({
        id: `touchpoint-${touchpoint.id}`,
        type: 'TOUCHPOINT',
        occurredAt: touchpoint.occurredAt.toISOString(),
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`.trim(),
        ownerName: lead.ownerName,
        summary:
          touchpoint.summary ??
          `${touchpoint.type} via ${touchpoint.channel ?? 'channel'} by ${touchpoint.user ? `${touchpoint.user.firstName ?? ''} ${touchpoint.user.lastName ?? ''}`.trim() : 'team'}`,
        metadata: touchpoint.metadata as Record<string, unknown> | undefined
      });
    }

    for (const tour of params.tours) {
      const lead = params.leads.get(tour.personId);
      if (!lead) continue;

      feed.push({
        id: `tour-${tour.id}`,
        type: 'TOUR',
        occurredAt: tour.updatedAt?.toISOString() ?? tour.createdAt.toISOString(),
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`.trim(),
        ownerName: lead.ownerName,
        summary: `Tour ${tour.status.toLowerCase()} for ${tour.startAt.toLocaleString()}`,
        metadata: tour.agent
          ? {
              agent: `${tour.agent.firstName ?? ''} ${tour.agent.lastName ?? ''}`.trim()
            }
          : undefined
      });
    }

    return feed
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, params.limit);
  }

  private buildSummary(params: {
    activeLeads: number;
    bottleneckTotals: { totalDurationMs: number; durationSamples: number };
    leaderboardTotals: { conversions: number; conversionAttempts: number; slaBreaches: number };
  }): InsightsSummaryDto {
    const avgStageTimeHours =
      params.bottleneckTotals.durationSamples > 0
        ? (params.bottleneckTotals.totalDurationMs / params.bottleneckTotals.durationSamples) / MS_IN_HOUR
        : null;
    const conversionPct =
      params.leaderboardTotals.conversionAttempts > 0
        ? Number((params.leaderboardTotals.conversions / params.leaderboardTotals.conversionAttempts).toFixed(3))
        : null;

    return {
      activeLeads: params.activeLeads,
      avgStageTimeHours: avgStageTimeHours !== null ? Number(avgStageTimeHours.toFixed(2)) : null,
      conversionPct,
      deltaWoW: { conversionPct: null }
    };
  }

  private computeBreachQueue(params: {
    analytics: Map<string, AnalyticsRow>;
    leads: Map<string, LeadBasics>;
    limit: number;
  }): QueueBreachEntryDto[] {
    const breaches: QueueBreachEntryDto[] = [];

    const capMinutes = 30 * 24 * 60; // 30 days

    for (const row of params.analytics.values()) {
      if (row.slaBreaches <= 0) continue;
      const lead = params.leads.get(row.personId);
      if (!lead) continue;

      const minutes =
        row.avgResponseMs && row.avgResponseMs > 0
          ? Math.max(0, Math.round(row.avgResponseMs / MS_IN_MINUTE))
          : null;
      let label: string | null = null;
      let minutesOver = minutes ?? 0;
      if (minutes === null) {
        label = 'No response';
        minutesOver = 0;
      } else if (minutes > capMinutes) {
        label = '>30d';
        minutesOver = capMinutes;
      }
      breaches.push({
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`.trim(),
        ownerName: lead.ownerName,
        minutesOver,
        minutesOverLabel: label
      });
    }

    return breaches.sort((a, b) => b.minutesOver - a.minutesOver).slice(0, params.limit);
  }

  private getCachedResponse(key: string): ClientInsightsResponseDto | null {
    const cached = this.responseCache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.payload;
    }
    if (cached) {
      this.unregisterCacheKey(cached.tenantId, key);
      this.responseCache.delete(key);
    }
    return null;
  }

  private cacheResponse(key: string, tenantId: string, payload: ClientInsightsResponseDto) {
    this.responseCache.set(key, {
      expiresAt: Date.now() + CACHE_TTL_MS,
      payload,
      tenantId
    });
    this.registerCacheKey(tenantId, key);
  }

  private registerCacheKey(tenantId: string, key: string) {
    const entry = this.cacheIndex.get(tenantId) ?? new Set<string>();
    entry.add(key);
    this.cacheIndex.set(tenantId, entry);
  }

  private unregisterCacheKey(tenantId: string, key: string) {
    const entry = this.cacheIndex.get(tenantId);
    if (!entry) {
      return;
    }
    entry.delete(key);
    if (entry.size === 0) {
      this.cacheIndex.delete(tenantId);
    }
  }

  purgeTenantCache(tenantId: string) {
    const keys = this.cacheIndex.get(tenantId);
    if (!keys) {
      return;
    }
    let evicted = 0;
    for (const key of keys) {
      if (this.responseCache.delete(key)) {
        evicted += 1;
      }
    }
    this.cacheIndex.delete(tenantId);
    this.logMetric(`metric=insights.cache.evictions tenant=${tenantId} value=${evicted}`);
  }

  private computeReengagementQueue(params: {
    leads: Map<string, LeadBasics>;
    analytics: Map<string, AnalyticsRow>;
    stageMeta: Map<string, StageMeta>;
    dormantDays: number;
  }): ReengagementLeadDto[] {
    const cutoff = new Date(Date.now() - params.dormantDays * HOURS_IN_DAY * MS_IN_HOUR);
    const queue: ReengagementLeadDto[] = [];

    for (const lead of params.leads.values()) {
      const analyticsRow = params.analytics.get(lead.id);
      const lastTouchpoint = analyticsRow?.lastTouchpointAt ?? null;
      const lastActivity = lead.lastActivityAt ?? lastTouchpoint ?? lead.stageEnteredAt ?? null;

      if (lastActivity && lastActivity > cutoff) {
        continue;
      }

      const oldestReference = lastActivity ?? new Date(0);
      const daysDormant = Math.max(0, Math.floor((Date.now() - oldestReference.getTime()) / (24 * 60 * 60 * 1000)));
      const stage = lead.stageId ? params.stageMeta.get(lead.stageId) : undefined;

      queue.push({
        leadId: lead.id,
        leadName: `${lead.firstName} ${lead.lastName}`.trim(),
        ownerName: lead.ownerName,
        stageId: stage?.id ?? null,
        stageName: stage?.name ?? lead.stageName ?? null,
        daysDormant,
        lastActivityAt: lastActivity ? lastActivity.toISOString() : null
      });
    }

    return queue.sort((a, b) => b.daysDormant - a.daysDormant).slice(0, 50);
  }

  private buildTrendCards(params: {
    engagement: { byStage: HeatmapCellDto[]; byOwner: HeatmapCellDto[]; byTier: HeatmapCellDto[] };
    leaderboard: AgentPerformanceDto[];
    reengagementQueue: ReengagementLeadDto[];
    period: PeriodWindow;
  }): TrendCardDto[] {
    const totalLeads = params.engagement.byStage.reduce((sum, stage) => sum + stage.leads, 0);
    const engagedLeads = params.engagement.byStage.reduce((sum, stage) => sum + stage.engaged, 0);
    const idleCount = totalLeads - engagedLeads;
    const touchpointsTotal = params.engagement.byStage.reduce((sum, stage) => sum + stage.touchpoints, 0);
    const avgTouches = totalLeads > 0 ? touchpointsTotal / totalLeads : 0;
    const bestResponder = params.leaderboard.find((agent) => agent.avgResponseMinutes !== null);

    const cards: TrendCardDto[] = [
      {
        key: 'attention',
        label: 'Need Attention',
        value: idleCount.toString(),
        deltaLabel:
          totalLeads > 0
            ? `${Math.round((idleCount / totalLeads) * 100)}% of pipeline idle`
            : 'No active leads',
        trend: totalLeads > 0 ? Number((engagedLeads / totalLeads).toFixed(3)) : null
      },
      {
        key: 'touchpoints',
        label: 'Touches Logged',
        value: touchpointsTotal.toString(),
        deltaLabel: `${avgTouches.toFixed(1)} touches per lead`,
        trend: touchpointsTotal
      }
    ];

    cards.push({
      key: 'response',
      label: 'Avg Response',
      value: bestResponder?.avgResponseMinutes !== null && bestResponder?.avgResponseMinutes !== undefined
        ? `${bestResponder.avgResponseMinutes.toFixed(1)}m`
        : '—',
      deltaLabel: `${bestResponder ? bestResponder.agentName : 'Team'} fastest responder`,
      trend: bestResponder?.slaBreaches ? -bestResponder.slaBreaches : null
    });

    cards.push({
      key: 'dormant',
      label: 'Dormant Leads',
      value: params.reengagementQueue.length.toString(),
      deltaLabel:
        params.reengagementQueue.length > 0
          ? `${params.reengagementQueue[0].leadName} idle ${params.reengagementQueue[0].daysDormant}d`
          : 'All leads touched recently',
      trend: params.reengagementQueue.length
    });

    return cards;
  }

  private buildCopilotInsights(params: {
    bottlenecks: StageBottleneckDto[];
    leaderboard: AgentPerformanceDto[];
    reengagementQueue: ReengagementLeadDto[];
    period: PeriodWindow;
  }): Array<{ message: string }> {
    const insights: Array<{ message: string }> = [];

    const healthiestStage = params.bottlenecks
      .filter((stage) => stage.conversionRate !== null)
      .sort((a, b) => (b.conversionRate ?? 0) - (a.conversionRate ?? 0))[0];
    if (healthiestStage && healthiestStage.conversionRate !== null) {
      insights.push({
        message: `Top conversion this ${params.period.label} is ${healthiestStage.stageName} at ${(healthiestStage.conversionRate * 100).toFixed(1)}%.`
      });
    }

    if (params.reengagementQueue.length > 0) {
      const dormantShowing = params.reengagementQueue.find(
        (lead) => lead.stageName && lead.stageName.toLowerCase().includes('show')
      );
      const focusLead = dormantShowing ?? params.reengagementQueue[0];
      insights.push({
        message: `You have ${params.reengagementQueue.length} leads overdue for follow-up; ${focusLead.leadName} has been quiet for ${focusLead.daysDormant} days.`
      });
    }

    const fastestAgent = params.leaderboard
      .filter((agent) => agent.avgResponseMinutes !== null)
      .sort((a, b) => (a.avgResponseMinutes ?? Infinity) - (b.avgResponseMinutes ?? Infinity))[0];
    if (fastestAgent && fastestAgent.avgResponseMinutes !== null) {
      insights.push({
        message: `${fastestAgent.agentName} leads response speed at ${fastestAgent.avgResponseMinutes.toFixed(1)} minutes on average.`
      });
    }

    return insights;
  }

  private async buildFiltersPayload(
    ctx: RequestContext,
    tenantId: string,
    savedViews: Array<{
      id: string;
      name: string;
      scope: SavedViewScope;
      userId: string;
      teamId: string | null;
    }>,
    dormantDays: number,
    leadMap?: Map<string, LeadBasics>,
    analytics?: Map<string, AnalyticsRow>
  ): Promise<{
    owners: FilterOptionDto[];
    tiers: FilterOptionDto[];
    activities: FilterOptionDto[];
    savedViews: FilterOptionDto[];
  }> {
    const owners = leadMap
      ? Array.from(
          Array.from(leadMap.values())
            .reduce((acc, lead) => {
              if (!lead.ownerId) return acc;
              if (!acc.has(lead.ownerId)) {
                acc.set(lead.ownerId, {
                  id: lead.ownerId,
                  label: lead.ownerName ?? 'Owner',
                  avatarUrl: lead.ownerAvatar
                });
              }
              return acc;
            }, new Map<string, { id: string; label: string; avatarUrl: string | null }>())
            .values()
        ).map<FilterOptionDto>((owner) => ({
          id: owner.id,
          label: owner.label,
          avatarUrl: owner.avatarUrl
        }))
      : [];

    if (owners.length === 0) {
      const possibleOwners = await this.prisma.user.findMany({
        where: { tenantId },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        take: 20
      });
      owners.push(
        ...possibleOwners.map<FilterOptionDto>((user) => ({
          id: user.id,
          label: `${user.firstName} ${user.lastName}`.trim(),
          avatarUrl: user.avatarUrl ?? undefined
        }))
      );
    }

    const tierOptions: FilterOptionDto[] = ['A', 'B', 'C', 'D'].map((tier) => ({
      id: tier,
      label: `Tier ${tier}`
    }));

    const activityOptions: FilterOptionDto[] = [
      { id: 'ACTIVE_TODAY', label: 'Active Today' },
      { id: 'INACTIVE_7D', label: 'Inactive 7+ Days' },
      { id: 'BREACHED_SLA', label: 'Breached SLA' }
    ];

    const savedViewOptions: FilterOptionDto[] = savedViews.map((view) => ({
      id: view.id,
      label: view.name,
      meta: {
        scope: view.scope,
        ownedByUser: view.userId === ctx.userId,
        teamId: view.teamId
      }
    }));

    if (savedViewOptions.length === 0) {
      const fallback = await this.prisma.savedView.findMany({
        where: { tenantId, scope: SavedViewScope.ORGANIZATION },
        take: 5
      });
      savedViewOptions.push(
        ...fallback.map((view) => ({
          id: view.id,
          label: view.name,
          meta: { scope: view.scope }
        }))
      );
    }

    return {
      owners,
      tiers: tierOptions,
      activities: activityOptions,
      savedViews: savedViewOptions
    };
  }

  private logMetric(message: string) {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    this.logger.verbose(message);
  }
}
