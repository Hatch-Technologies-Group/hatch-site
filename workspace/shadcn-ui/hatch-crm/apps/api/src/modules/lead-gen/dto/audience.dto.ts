import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import { LeadGenAudienceStatus } from '@hatch/db';

export class CreateLeadGenAudienceDto {
  @IsString()
  @MaxLength(200)
  name!: string;

  /**
   * Audience definition DSL.
   * Example:
   * {
   *   "filters": { "tagsAny": ["seller"], "scoreTierIn": ["A","B"], "hasEmail": true }
   * }
   */
  @IsObject()
  definition!: Record<string, unknown>;

  @IsOptional()
  @IsEnum(LeadGenAudienceStatus)
  status?: LeadGenAudienceStatus;
}

export class UpdateLeadGenAudienceDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsObject()
  definition?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(LeadGenAudienceStatus)
  status?: LeadGenAudienceStatus;
}

export class ComputeLeadGenAudienceDto {
  @IsOptional()
  @IsString()
  @MaxLength(32)
  exportFormat?: string;
}

