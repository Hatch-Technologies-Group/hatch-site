import { IsOptional, IsString } from 'class-validator';

import type { PersonaId } from '@/modules/ai/personas/ai-personas.types';

export class GenerateDraftDto {
  @IsString()
  personaId!: PersonaId;

  @IsOptional()
  @IsString()
  audience?: string;

  @IsOptional()
  @IsString()
  callToAction?: string;

  @IsOptional()
  @IsString()
  subject?: string;

  @IsOptional()
  @IsString()
  brief?: string;
}
