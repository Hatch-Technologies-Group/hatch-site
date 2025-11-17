import { Injectable } from '@nestjs/common';

import { AiService } from '../ai.service';
import { PERSONAS, ROUTER_SYSTEM_PROMPT } from './ai-personas.config';
import type { PersonaId } from './ai-personas.types';

type RouterResult = {
  targetPersonaId: PersonaId;
  reason?: string | null;
};

@Injectable()
export class AiPersonaRouterService {
  constructor(private readonly ai: AiService) {}

  async routeMessage(currentPersonaId: PersonaId, message: string): Promise<RouterResult> {
    // Lightweight keyword routing to avoid extra turns for obvious intents
    const quick = this.quickRoute(currentPersonaId, message);
    if (quick) {
      return quick;
    }

    const payload = {
      currentPersonaId,
      message,
      personas: PERSONAS.map((persona) => ({
        id: persona.id,
        name: persona.name,
        specialty: persona.tagline
      }))
    };

    const response = await this.ai.runStructuredChat({
      systemPrompt: ROUTER_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: JSON.stringify(payload) }],
      responseFormat: 'json_object',
      temperature: 0
    });

    if (!response.text) {
      return { targetPersonaId: currentPersonaId, reason: null };
    }

    try {
      const parsed = JSON.parse(response.text) as Partial<RouterResult>;
      const targetId = (parsed.targetPersonaId as PersonaId | undefined) ?? currentPersonaId;
      return {
        targetPersonaId: targetId,
        reason: parsed.reason ?? null
      };
    } catch {
      return { targetPersonaId: currentPersonaId, reason: null };
    }
  }

  private quickRoute(currentPersonaId: PersonaId, message: string): RouterResult | null {
    const text = (message || '').toLowerCase();

    const hasAny = (needles: string[]) => needles.some((w) => text.includes(w));

    if (hasAny(['email', 'follow up', 'follow-up', 'followup', 'nurture', 'drip', 'draft', 'rewrite', 'send'])) {
      return { targetPersonaId: 'lead_nurse', reason: 'outreach/email intent detected' };
    }

    if (hasAny(['listing', 'description', 'marketing', 'copy', 'feature', 'social'])) {
      return { targetPersonaId: 'listing_concierge', reason: 'listing/marketing intent detected' };
    }

    if (hasAny(['pricing', 'price', 'comps', 'valuation', 'market', 'trend'])) {
      return { targetPersonaId: 'market_analyst', reason: 'pricing/market intent detected' };
    }

    if (hasAny(['checklist', 'dates', 'deadline', 'contingency', 'contingencies', 'closing', 'contract'])) {
      return { targetPersonaId: 'transaction_coordinator', reason: 'transaction intent detected' };
    }

    if (hasAny(['prioritize', 'plan', 'summary', 'summarize', 'briefing'])) {
      return { targetPersonaId: 'agent_copilot', reason: 'planning/summary intent detected' };
    }

    // Default: no quick route; use LLM router
    return null;
  }
}
