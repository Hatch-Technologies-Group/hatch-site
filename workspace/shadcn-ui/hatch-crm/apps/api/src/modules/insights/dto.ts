import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ArrayMaxSize
} from 'class-validator';

export const INSIGHTS_ACTIVITY_FILTERS = ['ACTIVE_TODAY', 'INACTIVE_7D', 'BREACHED_SLA'] as const;
export type InsightsActivityFilter = (typeof INSIGHTS_ACTIVITY_FILTERS)[number];

export class GetInsightsQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Explicit tenant override. Defaults to request context tenant.' })
  tenantId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Filter insights to a single agent/owner.' })
  ownerId?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Restrict data to a specific team.' })
  teamId?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @Transform(({ value }) => {
    if (!value) return undefined;
    if (Array.isArray(value)) return value.map(String);
    return String(value)
      .split(',')
      .map((stage) => stage.trim())
      .filter(Boolean);
  })
  @ApiPropertyOptional({ type: [String], description: 'Restrict data to specific stage IDs.' })
  stage?: string[];

  @IsOptional()
  @IsString()
  @Matches(/^[A-D]$/i, { message: 'tier must be one of A, B, C, D' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @ApiPropertyOptional({ description: 'Lead score tier (A/B/C/D).' })
  tier?: string;

  @IsOptional()
  @IsString()
  @IsIn(INSIGHTS_ACTIVITY_FILTERS, { message: `activity must be one of: ${INSIGHTS_ACTIVITY_FILTERS.join(', ')}` })
  @Transform(({ value }) => (typeof value === 'string' ? value.toUpperCase() : value))
  @ApiPropertyOptional({ enum: INSIGHTS_ACTIVITY_FILTERS, description: 'Pre-built activity segmentation.' })
  activity?: InsightsActivityFilter;

  @IsOptional()
  @IsString()
  @Matches(/^\d+d$/i, { message: 'period must be expressed as <number>d (e.g. 7d, 30d)' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase() : value))
  @ApiPropertyOptional({ description: 'Rolling window to evaluate (e.g. 7d, 14d, 30d).' })
  period?: string;

  @IsOptional()
  @IsInt()
  @Min(3)
  @Max(90)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @ApiPropertyOptional({ description: 'Days of inactivity before a lead is surfaced in the re-engagement queue.' })
  dormantDays?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ description: 'Apply filters from a saved view.' })
  viewId?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(200)
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @ApiPropertyOptional({ description: 'Page size for feed/queues (default 50).' })
  limit?: number;
}

export class FilterOptionDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  label!: string;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiPropertyOptional()
  meta?: Record<string, unknown>;
}

export class HeatmapCellDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty({ description: 'How many total leads are represented by this cell.' })
  leads!: number;

  @ApiProperty({ description: 'Leads with at least one touchpoint in the selected period.' })
  engaged!: number;

  @ApiProperty({ description: 'Aggregate touchpoint volume across those leads.' })
  touchpoints!: number;

  @ApiProperty({ description: '0-1 engagement intensity used by the UI heatmap.' })
  intensity!: number;
}

export class StageBottleneckDto {
  @ApiProperty()
  stageId!: string;

  @ApiProperty()
  stageName!: string;

  @ApiProperty({ description: 'Average time spent in this stage (hours).' })
  avgTimeHours!: number | null;

  @ApiProperty({ description: 'Forward conversion rate out of this stage.' })
  conversionRate!: number | null;

  @ApiProperty({ description: 'Number of leads currently stalled beyond the alert threshold.' })
  stalled!: number;

  @ApiProperty({ description: 'Average number of touchpoints logged during the selected period.' })
  touchpointsPerLead!: number;
}

export class AgentPerformanceDto {
  @ApiProperty()
  agentId!: string;

  @ApiProperty()
  agentName!: string;

  @ApiPropertyOptional()
  avatarUrl?: string | null;

  @ApiProperty()
  activeLeads!: number;

  @ApiProperty()
  touchpoints!: number;

  @ApiProperty()
  slaBreaches!: number;

  @ApiProperty({ description: 'Average first-response time in minutes.' })
  avgResponseMinutes!: number | null;

  @ApiProperty({ description: 'Conversion rate to the target stage for the selected window.' })
  conversionRate!: number | null;
}

export class ActivityFeedEntryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  type!: string;

  @ApiProperty()
  occurredAt!: string;

  @ApiProperty()
  leadId!: string;

  @ApiProperty()
  leadName!: string;

  @ApiPropertyOptional()
  ownerName?: string | null;

  @ApiPropertyOptional()
  summary?: string | null;

  @ApiPropertyOptional()
  metadata?: Record<string, unknown>;
}

export class ReengagementLeadDto {
  @ApiProperty()
  leadId!: string;

  @ApiProperty()
  leadName!: string;

  @ApiPropertyOptional()
  stageId?: string | null;

  @ApiPropertyOptional()
  stageName?: string | null;

  @ApiPropertyOptional()
  ownerName?: string | null;

  @ApiProperty()
  daysDormant!: number;

  @ApiPropertyOptional()
  lastActivityAt?: string | null;
}

export class TrendCardDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  value!: string;

  @ApiPropertyOptional()
  deltaLabel?: string | null;

  @ApiPropertyOptional()
  trend?: number | null;
}

export class CopilotInsightDto {
  @ApiProperty()
  message!: string;
}

export class InsightsSummaryDto {
  @ApiProperty({ description: 'Total number of leads represented in this response.' })
  activeLeads!: number;

  @ApiProperty({ description: 'Average time in stage (hours).' })
  avgStageTimeHours!: number | null;

  @ApiProperty({ description: 'Overall conversion percentage (0-1).' })
  conversionPct!: number | null;

  @ApiPropertyOptional({
    description: 'Week-over-week delta comparisons.',
    type: 'object',
    properties: {
      conversionPct: { type: 'number', nullable: true }
    }
  })
  deltaWoW?: { conversionPct?: number | null } | null;
}

export class HeatmapEntryDto {
  @ApiProperty()
  stage!: string;

  @ApiProperty({ description: 'Engaged leads count.' })
  engaged!: number;

  @ApiProperty({ description: 'Inactive leads count.' })
  inactive!: number;
}

export class QueueBreachEntryDto {
  @ApiProperty()
  leadId!: string;

  @ApiProperty()
  leadName!: string;

  @ApiPropertyOptional()
  ownerName?: string | null;

  @ApiProperty({ description: 'Minutes beyond SLA target.' })
  minutesOver!: number;

  @ApiPropertyOptional({ description: 'Human readable bucket when minutes exceed the threshold.' })
  minutesOverLabel?: string | null;
}

export class InsightsQueuesDto {
  @ApiProperty({ type: [ReengagementLeadDto] })
  reengage!: ReengagementLeadDto[];

  @ApiProperty({ type: [QueueBreachEntryDto] })
  breaches!: QueueBreachEntryDto[];
}

export class FiltersPayloadDto {
  @ApiProperty({ type: [FilterOptionDto] })
  owners!: FilterOptionDto[];

  @ApiProperty({ type: [FilterOptionDto] })
  tiers!: FilterOptionDto[];

  @ApiProperty({ type: [FilterOptionDto] })
  activities!: FilterOptionDto[];

  @ApiProperty({ type: [FilterOptionDto] })
  savedViews!: FilterOptionDto[];
}

export class EngagementHeatmapDto {
  @ApiProperty({ type: [HeatmapCellDto] })
  byStage!: HeatmapCellDto[];

  @ApiProperty({ type: [HeatmapCellDto] })
  byOwner!: HeatmapCellDto[];

  @ApiProperty({ type: [HeatmapCellDto] })
  byTier!: HeatmapCellDto[];
}

export class ClientInsightsResponseDto {
  @ApiProperty({
    description: 'Resolved period metadata',
    type: 'object',
    properties: {
      label: { type: 'string' },
      days: { type: 'number' },
      start: { type: 'string', format: 'date-time' },
      end: { type: 'string', format: 'date-time' }
    }
  })
  period!: { label: string; days: number; start: string; end: string };

  @ApiProperty({ description: 'Payload version for clients to coordinate breaking changes.' })
  v!: number;

  @ApiProperty({ type: InsightsSummaryDto })
  summary!: InsightsSummaryDto;

  @ApiPropertyOptional({ description: 'ISO timestamp representing when the data was last refreshed.' })
  dataAge?: string | null;

  @ApiProperty({ type: FiltersPayloadDto })
  filters!: FiltersPayloadDto;

  @ApiProperty({ type: [HeatmapEntryDto] })
  heatmap!: HeatmapEntryDto[];

  @ApiProperty({ type: [StageBottleneckDto] })
  bottlenecks!: StageBottleneckDto[];

  @ApiProperty({ type: [AgentPerformanceDto] })
  leaderboard!: AgentPerformanceDto[];

  @ApiProperty({ type: [ActivityFeedEntryDto] })
  feed!: ActivityFeedEntryDto[];
  @ApiProperty({ type: [ActivityFeedEntryDto], required: false })
  activityFeed?: ActivityFeedEntryDto[];

  @ApiProperty({ type: [ReengagementLeadDto] })
  reengagementQueue!: ReengagementLeadDto[];

  @ApiProperty({ type: InsightsQueuesDto })
  queues!: InsightsQueuesDto;

  @ApiProperty({ type: [TrendCardDto] })
  trendCards!: TrendCardDto[];

  @ApiProperty({ type: [CopilotInsightDto] })
  copilotInsights!: CopilotInsightDto[];

  @ApiProperty({ type: EngagementHeatmapDto, required: false })
  engagement?: EngagementHeatmapDto;
}
