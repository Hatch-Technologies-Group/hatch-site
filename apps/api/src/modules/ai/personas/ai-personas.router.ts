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
    const payload = {
      currentPersonaId,
      message,
      personas: PERSONAS.map((persona) => ({
        id: persona.id,
        name: persona.name,
        specialty: persona.specialty
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
}
