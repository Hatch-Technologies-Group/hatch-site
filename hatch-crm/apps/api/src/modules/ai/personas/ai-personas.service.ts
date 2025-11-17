import { Injectable } from '@nestjs/common';

import { AiService } from '../ai.service';
import { PERSONAS, HANDOFF_TEMPLATE } from './ai-personas.config';
import { buildSystemPromptForPersona } from './ai-personas.prompts';
import { AiPersonaRouterService } from './ai-personas.router';
import type { PersonaChatMessage, PersonaChatResponse, PersonaId } from './ai-personas.types';

type ChatHistory = PersonaChatMessage[];

@Injectable()
export class AiPersonasService {
  constructor(
    private readonly ai: AiService,
    private readonly router: AiPersonaRouterService
  ) {}

  async handleChatMessage(input: {
    tenantId: string;
    text: string;
    currentPersonaId: PersonaId;
    history: ChatHistory;
  }): Promise<PersonaChatResponse> {
    const { text, currentPersonaId, history } = input;
    const routing = await this.router.routeMessage(currentPersonaId, text);
    const persona = PERSONAS.find((candidate) => candidate.id === routing.targetPersonaId) ?? PERSONAS[0];

    const prompt = buildSystemPromptForPersona(persona);
    const messages = history.slice(-10); // keep recent context small
    const reply = await this.ai.runStructuredChat({
      systemPrompt: prompt,
      messages: [...messages, { role: 'user', content: text }]
    });

    const assistantContent = reply.text ?? 'I need a moment to think about that.';
    const responseMessages: PersonaChatMessage[] = [];

    if (currentPersonaId !== persona.id) {
      const fromPersona = PERSONAS.find((p) => p.id === currentPersonaId);
      const handoff = HANDOFF_TEMPLATE(fromPersona?.name ?? 'Agent Copilot', persona.name);
      responseMessages.push({ role: 'assistant', content: handoff });
    }

    responseMessages.push({ role: 'assistant', content: assistantContent });

    return {
      activePersonaId: persona.id,
      reason: routing.reason,
      messages: responseMessages
    };
  }
}
