import { Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

import { toOptionalBoolean, toOptionalStringArray } from '../../common';

export type ContactListSort = 'updatedAt:desc' | 'updatedAt:asc' | 'score:desc' | 'score:asc';

export class ContactListQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsString()
  teamId?: string;

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsString({ each: true })
  status?: string[];

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsString({ each: true })
  source?: string[];

  @IsOptional()
  @Transform(({ value }) => toOptionalStringArray(value))
  @IsEnum(['sms', 'email', 'call'], { each: true })
  consent?: Array<'sms' | 'email' | 'call'>;

  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  dncBlocked?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  minScore?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(0)
  @Max(3650)
  maxAgeDays?: number;

  @IsOptional()
  @IsEnum(['updatedAt:desc', 'updatedAt:asc', 'score:desc', 'score:asc'])
  sort?: ContactListSort;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsNumber()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsString()
  savedViewId?: string;
}
