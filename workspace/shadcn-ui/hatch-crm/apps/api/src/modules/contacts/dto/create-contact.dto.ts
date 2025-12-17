import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsIn,
  IsObject,
  IsOptional,
  IsPhoneNumber,
  IsString,
  ValidateIf,
  ValidateNested
} from 'class-validator';

import { ConsentChannel, ConsentScope, PersonStage } from '@hatch/db';

const CONTACT_SOURCE_OPTIONS = ['manual', 'csv_import', 'portal', 'open_house', 'api', 'referral'] as const;

export type ContactSource = (typeof CONTACT_SOURCE_OPTIONS)[number];

export class ConsentEvidenceDto {
  @IsEnum(ConsentChannel, { message: 'Invalid channel' })
  channel!: ConsentChannel;

  @IsEnum(ConsentScope)
  scope!: ConsentScope;

  @IsString()
  verbatimText!: string;

  @IsString()
  source!: string;

  @IsOptional()
  @IsISO8601()
  capturedAt?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  userAgent?: string;

  @IsOptional()
  @IsString()
  evidenceUri?: string;
}

export class CreateContactDto {
  @IsString()
  tenantId!: string;

  @IsString()
  organizationId!: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @ValidateIf((dto) => !dto.lastName)
  @IsString()
  firstName?: string;

  @ValidateIf((dto) => !dto.firstName)
  @IsString()
  lastName?: string;

  @ValidateIf((dto) => !dto.primaryPhone)
  @IsEmail({}, { message: 'Invalid primary email' })
  @Transform(({ value }) => (typeof value === 'string' ? value.toLowerCase().trim() : value))
  primaryEmail?: string;

  @ValidateIf((dto) => !dto.primaryEmail)
  @IsPhoneNumber('US')
  primaryPhone?: string;

  @IsOptional()
  @IsEnum(PersonStage)
  stage?: PersonStage;

  @IsOptional()
  @IsArray()
  @IsEmail({}, { each: true })
  @Transform(({ value }) => (Array.isArray(value) ? value.map((email: string) => email.toLowerCase().trim()) : value))
  secondaryEmails?: string[];

  @IsOptional()
  @IsArray()
  @IsPhoneNumber('US', { each: true })
  secondaryPhones?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsIn(CONTACT_SOURCE_OPTIONS)
  source?: ContactSource;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  doNotContact?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  customFields?: Record<string, unknown>;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ConsentEvidenceDto)
  consents?: ConsentEvidenceDto[];
}
