import { IsEnum, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

import { LeadGenLandingPageStatus } from '@hatch/db';

export class CreateLeadGenLandingPageDto {
  @IsString()
  @MaxLength(100)
  slug!: string;

  @IsString()
  @MaxLength(200)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  campaignId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  listingId?: string;

  @IsObject()
  layout!: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  formSchema?: Record<string, unknown>;

  @IsOptional()
  @IsEnum(LeadGenLandingPageStatus)
  status?: LeadGenLandingPageStatus;
}

export class UpdateLeadGenLandingPageDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  seoTitle?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  seoDescription?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  campaignId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(128)
  listingId?: string | null;

  @IsOptional()
  @IsObject()
  layout?: Record<string, unknown>;

  @IsOptional()
  @IsObject()
  formSchema?: Record<string, unknown> | null;

  @IsOptional()
  @IsEnum(LeadGenLandingPageStatus)
  status?: LeadGenLandingPageStatus;
}

