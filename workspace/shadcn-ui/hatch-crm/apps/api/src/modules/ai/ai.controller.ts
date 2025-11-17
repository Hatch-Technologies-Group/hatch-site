import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';

import { AiConfig } from '@/config/ai.config';
import { getAiMetrics } from '@/modules/ai/interceptors/ai-circuit.interceptor';
import { AiService } from './ai.service';
import { AiEmailDraftService } from './ai-email.service';
import type { PersonaId } from './personas/ai-personas.types';
import {
  AUDIENCE_SEGMENT_KEYS,
  type AudienceSegmentKey
} from './ai-email.types';
import { resolveRequestContext } from '@/modules/common';
import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

class AiEmailDraftDto {
  @IsIn(['agent_copilot', 'lead_nurse', 'listing_concierge', 'market_analyst', 'transaction_coordinator'])
  personaId!: PersonaId;

  @IsIn(['segment', 'singleLead'])
  contextType!: 'segment' | 'singleLead';

  @ValidateIf((dto) => dto.contextType === 'segment')
  @IsIn(AUDIENCE_SEGMENT_KEYS)
  segmentKey?: AudienceSegmentKey;

  @ValidateIf((dto) => dto.contextType === 'singleLead')
  @IsString()
  leadId?: string;

  @IsOptional()
  @IsString()
  prompt?: string;
}

@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiService,
    private readonly emailDrafts: AiEmailDraftService
  ) {}

  @Get('health')
  health() {
    const status = this.ai.getProviderStatus();
    return {
      ok: true,
      provider: status.provider,
      hasKey: status.isConfigured,
      model: AiConfig.model,
      timeoutMs: AiConfig.timeoutMs,
      metrics: getAiMetrics()
    };
  }

  @Post('email-draft')
  @UseGuards(JwtAuthGuard)
  async draftEmail(@Body() dto: AiEmailDraftDto, @Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    return this.emailDrafts.draftEmail({
      tenantId: ctx.tenantId,
      personaId: dto.personaId,
      contextType: dto.contextType,
      segmentKey: dto.segmentKey,
      leadId: dto.leadId,
      prompt: dto.prompt
    });
  }
}
