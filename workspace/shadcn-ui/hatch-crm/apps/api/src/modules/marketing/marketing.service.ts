import { Injectable } from '@nestjs/common';
import { MarketingCampaignStatus, OutreachChannel, type MarketingCampaign } from '@prisma/client';

import type { PersonaId } from '@/modules/ai/personas/ai-personas.types';
import { PrismaService } from '@/modules/prisma/prisma.service';

import { CreateMarketingCampaignDto } from './dto/create-marketing-campaign.dto';
import { GenerateDraftDto } from './dto/generate-draft.dto';

type CampaignFilter = 'all' | 'draft' | 'scheduled' | 'sent';

const PERSONA_GREETINGS: Record<PersonaId, string> = {
  hatch_assistant: 'Hatch here —',
  agent_copilot: 'Echo here —',
  lead_nurse: 'Lumen here —',
  listing_concierge: 'Haven here —',
  market_analyst: 'Atlas checking in —',
  transaction_coordinator: 'Nova here —'
};

const PERSONA_TONES: Record<PersonaId, string> = {
  hatch_assistant: 'concise',
  agent_copilot: 'steady',
  lead_nurse: 'warm',
  listing_concierge: 'polished',
  market_analyst: 'analytical',
  transaction_coordinator: 'precise'
};

const PERSONA_CLOSINGS: Record<PersonaId, string> = {
  hatch_assistant: 'I can loop in the right teammate if you need more.',
  agent_copilot: 'Let me know what support you need.',
  lead_nurse: 'Let’s get you back on track.',
  listing_concierge: 'Excited to share more details.',
  market_analyst: 'Reach out if you want a deeper read.',
  transaction_coordinator: 'Here if you need a hand with next steps.'
};

const SUBJECT_FALLBACKS: Record<PersonaId, string> = {
  hatch_assistant: 'Quick brokerage rundown for you',
  agent_copilot: 'Here’s what to focus on next',
  lead_nurse: 'Let’s reconnect this week',
  listing_concierge: 'New listing intel for you',
  market_analyst: 'Market signal you should see',
  transaction_coordinator: 'Key timeline check-in'
};

@Injectable()
export class MarketingService {
  constructor(private readonly prisma: PrismaService) {}

  async listCampaigns(tenantId: string, filter?: CampaignFilter) {
    const normalizedFilter = filter ?? 'all';
    const campaigns = await this.prisma.marketingCampaign.findMany({
      where: {
        tenantId,
        ...(normalizedFilter === 'all'
          ? {}
          : { status: normalizedFilter.toUpperCase() as MarketingCampaignStatus })
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      campaigns: campaigns.map((campaign) => this.toResponse(campaign))
    };
  }

  async createCampaign(tenantId: string, createdById: string | null, dto: CreateMarketingCampaignDto) {
    const status = (dto.status ?? 'scheduled').toUpperCase() as MarketingCampaignStatus;
    const channel = (dto.channel ?? 'EMAIL').toUpperCase() as OutreachChannel;
    const now = new Date();
    const campaign = await this.prisma.marketingCampaign.create({
      data: {
        tenantId,
        createdById,
        personaId: dto.personaId,
        name: dto.name?.trim() || dto.subject,
        subject: dto.subject,
        body: dto.body,
        channel,
        audienceKey: dto.audienceKey,
        audienceLabel: dto.audienceLabel ?? dto.audienceKey,
        callToAction: dto.callToAction,
        recipientsCount: dto.recipientsCount ?? 0,
        status,
        scheduledAt: status === MarketingCampaignStatus.SCHEDULED ? now : null,
        sentAt: status === MarketingCampaignStatus.SENT ? now : null
      }
    });

    return {
      campaign: this.toResponse(campaign)
    };
  }

  async generateDraft(dto: GenerateDraftDto) {
    const subject = this.normalizeSubject(dto);
    const body = this.buildDraftBody(dto);

    return {
      draft: {
        personaId: dto.personaId,
        subject,
        body
      }
    };
  }

  private normalizeSubject(dto: GenerateDraftDto) {
    if (dto.subject?.trim()) {
      return dto.subject.trim();
    }
    if (dto.callToAction?.trim() && dto.audience?.trim()) {
      return `${dto.callToAction.trim()} for ${dto.audience.trim()}`;
    }
    if (dto.callToAction?.trim()) {
      return dto.callToAction.trim();
    }
    return SUBJECT_FALLBACKS[dto.personaId];
  }

  private buildDraftBody({ personaId, audience, callToAction, brief }: GenerateDraftDto) {
    const greeting = PERSONA_GREETINGS[personaId];
    const tone = PERSONA_TONES[personaId];
    const closing = PERSONA_CLOSINGS[personaId];
    const audienceLine = audience ? `Hi ${audience},` : 'Hi there,';
    const ctaLine = callToAction
      ? `**Next step:** ${callToAction.trim()}`
      : 'If this sounds interesting, let me know and I can send over next steps.';
    const briefLine = brief?.trim() ?? 'Here’s a quick update that should be helpful as you plan your move.';

    return [
      `${greeting} I drafted this in a ${tone} tone.`,
      '',
      audienceLine,
      '',
      briefLine,
      '',
      ctaLine,
      '',
      'Best,',
      'Your Hatch AI team',
      '',
      closing
    ].join('\n');
  }

  private toResponse(campaign: MarketingCampaign) {
    return {
      id: campaign.id,
      tenantId: campaign.tenantId,
      personaId: campaign.personaId,
      name: campaign.name,
      subject: campaign.subject,
      body: campaign.body,
      channel: campaign.channel,
      audienceKey: campaign.audienceKey,
      audienceLabel: campaign.audienceLabel,
      callToAction: campaign.callToAction,
      recipientsCount: campaign.recipientsCount,
      status: campaign.status.toLowerCase() as 'draft' | 'scheduled' | 'sent' | 'failed',
      scheduledAt: campaign.scheduledAt?.toISOString() ?? null,
      sentAt: campaign.sentAt?.toISOString() ?? null,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString()
    };
  }
}
