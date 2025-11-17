import { Transform } from 'class-transformer';
import { ArrayNotEmpty, IsArray, IsEmail, IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

import type { PersonaId } from '@/modules/ai/personas/ai-personas.types';
import { AUDIENCE_SEGMENT_KEYS, type AudienceSegmentKey } from '@/modules/ai/ai-email.types';

const PERSONA_IDS: PersonaId[] = [
  'agent_copilot',
  'lead_nurse',
  'listing_concierge',
  'market_analyst',
  'transaction_coordinator'
];

const normalizeRecipients = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => (typeof entry === 'string' ? entry.split(',') : []))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
};

export class SendEmailDto {
  @ValidateIf((dto) => !dto.segmentKey)
  @Transform(({ value }) => normalizeRecipients(value))
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  to?: string[];

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  subject!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  html?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsIn(PERSONA_IDS)
  personaId?: PersonaId;

  @ValidateIf((dto) => !dto.to?.length)
  @IsIn(AUDIENCE_SEGMENT_KEYS)
  segmentKey?: AudienceSegmentKey;
}
