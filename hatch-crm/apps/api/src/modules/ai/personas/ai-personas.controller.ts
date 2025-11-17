import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { IsArray, IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

import { resolveRequestContext } from '@/modules/common';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

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

  @IsIn(['agent_copilot', 'lead_nurse', 'listing_concierge', 'market_analyst', 'transaction_coordinator'])
  currentPersonaId!: PersonaId;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PersonaChatMessageDto)
  history?: PersonaChatMessageDto[];
}

@Controller('ai/personas')
@UseGuards(JwtAuthGuard)
export class AiPersonasController {
  constructor(private readonly personas: AiPersonasService) {}

  @Post('chat')
  async chat(@Body() dto: PersonaChatDto, @Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    return this.personas.handleChatMessage({
      tenantId: ctx.tenantId,
      text: dto.text,
      currentPersonaId: dto.currentPersonaId,
      history: dto.history ?? []
    });
  }
}
