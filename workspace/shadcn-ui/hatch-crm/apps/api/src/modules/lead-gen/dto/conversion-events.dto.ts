import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

import { LeadGenConversionEventType } from '@hatch/db';

export class RecordLeadGenConversionEventDto {
  @IsEnum(LeadGenConversionEventType)
  eventType!: LeadGenConversionEventType;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  leadId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  personId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  campaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  landingPageId?: string;

  @IsOptional()
  @IsISO8601()
  occurredAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000_000_000)
  valueCents?: number;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  currency?: string;
}

export class ListLeadGenConversionEventsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  campaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  landingPageId?: string;

  @IsOptional()
  @IsEnum(LeadGenConversionEventType)
  eventType?: LeadGenConversionEventType;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;
}

export class ExportLeadGenConversionsDto {
  @IsOptional()
  @IsString()
  @MaxLength(128)
  destination?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  campaignId?: string;

  @IsOptional()
  @IsISO8601()
  from?: string;

  @IsOptional()
  @IsISO8601()
  to?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  format?: string;

  @IsOptional()
  dryRun?: boolean;
}

