import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { IsArray, IsBoolean, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { resolveRequestContext } from '@/modules/common';

import { AiPersonasService } from './ai-personas.service';
import type { PersonaId } from './ai-personas.types';

class PersonaChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  content!: string;
}

class PersonaChatDto {
  @IsString()
  text!: string;

  @IsIn([
    'hatch_assistant',
    'agent_copilot',
    'lead_nurse',
    'listing_concierge',
    'market_analyst',
    'transaction_coordinator'
  ])
  currentPersonaId!: PersonaId;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonaChatMessageDto)
  history?: PersonaChatMessageDto[];

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  forceCurrentPersona?: boolean;
}

@Controller('ai/personas')
@UseGuards(JwtAuthGuard)
export class AiPersonasController {
  constructor(private readonly personas: AiPersonasService) {}

  @Post('chat')
  async chat(@Body() dto: PersonaChatDto, @Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    const text = dto.text?.toLowerCase() ?? '';
    const forceHatch =
      ['form', 'forms', 'contract', 'contracts', 'document', 'documents', 'paperwork'].some((kw) =>
        text.includes(kw)
      ) || text.includes('naples') || text.includes('florida') || /\bfl\b/.test(text);
    const currentPersonaId = forceHatch ? 'hatch_assistant' : dto.currentPersonaId;
    const forceCurrentPersona = forceHatch ? true : dto.forceCurrentPersona ?? false;
    return this.personas.handleChatMessage({
      tenantId: ctx.tenantId,
      text: dto.text,
      currentPersonaId,
      history: dto.history ?? [],
      forceCurrentPersona
    });
  }
}
