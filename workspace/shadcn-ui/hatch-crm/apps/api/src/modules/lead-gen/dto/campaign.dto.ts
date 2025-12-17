import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min
} from 'class-validator';

import { LeadGenCampaignStatus, LeadGenChannel, LeadGenObjective } from '@hatch/db';

export class CreateLeadGenCampaignDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsEnum(LeadGenChannel)
  channel?: LeadGenChannel;

  @IsOptional()
  @IsEnum(LeadGenObjective)
  objective?: LeadGenObjective;

  @IsOptional()
  @IsEnum(LeadGenCampaignStatus)
  status?: LeadGenCampaignStatus;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmCampaign?: string;

  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsOptional()
  @IsISO8601()
  endAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dailyBudgetCents?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalBudgetCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsObject()
  targeting?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  creativeBrief?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;
}

export class UpdateLeadGenCampaignDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsEnum(LeadGenChannel)
  channel?: LeadGenChannel;

  @IsOptional()
  @IsEnum(LeadGenObjective)
  objective?: LeadGenObjective;

  @IsOptional()
  @IsEnum(LeadGenCampaignStatus)
  status?: LeadGenCampaignStatus;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmSource?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmMedium?: string;

  @IsOptional()
  @IsString()
  @MaxLength(256)
  utmCampaign?: string;

  @IsOptional()
  @IsISO8601()
  startAt?: string | null;

  @IsOptional()
  @IsISO8601()
  endAt?: string | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  dailyBudgetCents?: number | null;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  totalBudgetCents?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsObject()
  targeting?: Record<string, unknown> | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  creativeBrief?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string | null;
}

export class UpsertLeadGenCampaignSpendDto {
  /**
   * Prefer YYYY-MM-DD (date-only) for predictable rollups.
   */
  @IsString()
  @MaxLength(32)
  date!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  amountCents!: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  source?: string;
}

