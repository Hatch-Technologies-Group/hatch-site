import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

import type { PersonaId } from '@/modules/ai/personas/ai-personas.types';

const CHANNEL_VALUES = ['EMAIL', 'SMS'] as const;
export type ChannelDto = (typeof CHANNEL_VALUES)[number];

const STATUS_VALUES = ['draft', 'scheduled', 'sent', 'failed', 'DRAFT', 'SCHEDULED', 'SENT', 'FAILED'] as const;
export type StatusDto = (typeof STATUS_VALUES)[number];

export class CreateMarketingCampaignDto {
  @IsString()
  @IsNotEmpty()
  personaId!: PersonaId;

  @IsString()
  @IsNotEmpty()
  subject!: string;

  @IsString()
  @IsNotEmpty()
  body!: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  audienceKey?: string;

  @IsOptional()
  @IsString()
  audienceLabel?: string;

  @IsOptional()
  @IsString()
  callToAction?: string;

  @IsOptional()
  @IsEnum(CHANNEL_VALUES)
  channel?: ChannelDto;

  @IsOptional()
  @IsEnum(STATUS_VALUES)
  status?: StatusDto;

  @IsOptional()
  @IsInt()
  @Min(0)
  recipientsCount?: number;
}
