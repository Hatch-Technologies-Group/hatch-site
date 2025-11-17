import { Injectable, Logger } from '@nestjs/common';

import { AiConfig } from '@/config/ai.config';
import { SemanticSearchService } from '@/modules/search/semantic.service';
import { LLMClient } from '@/shared/ai/llm.client';

type DraftResult = {
  subject: string;
  html: string;
  text: string;
  grounding: Array<{ content: string; score?: number }>;
};

@Injectable()
export class OutreachAIService {
  private readonly log = new Logger(OutreachAIService.name);
  private readonly llm: LLMClient;

  constructor(private readonly semantic: SemanticSearchService) {
    this.llm = new LLMClient();
  }

  async draftForLead(tenantId: string, leadId: string): Promise<DraftResult> {
    const items = await this.semantic.search({
      tenantId,
      query: 'lead summary + intent + buying signals',
      entityType: 'lead',
      entityId: leadId,
      limit: 5
    });

    const snippets = items.map((item) => item.content).join('\n');
    const system = [
      'You are Hatch Outreach Brain.',
      'Write high-converting, empathetic emails for real estate leads.',
      'Use only the provided facts. Do not invent details.',
      '',
      'Facts:',
      snippets || '(no extra facts)'
    ].join('\n');
    const user = 'Draft the next outreach email (subject + HTML + plain text) for this lead.';

    this.log.debug(`Drafting outreach for lead=${leadId}`);
    const raw = await this.generateDraft(system, user);

    const parsed = parseDraft(raw);

    return {
      subject: parsed.subject,
      html: parsed.html,
      text: parsed.text,
      grounding: items.map((item) => ({ content: item.content, score: item.score }))
    };
  }

  private async generateDraft(system: string, user: string): Promise<string> {
    const fallback = this.buildFallbackDraft(user);
    if (!this.llm.isConfigured()) {
      return fallback;
    }

    try {
      const completion = await this.llm.createChatCompletion({
        model: AiConfig.model,
        temperature: 0.4,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      });
      return completion ?? fallback;
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'unknown error';
      this.log.warn(`LLM outreach draft failed: ${detail}`);
      return fallback;
    }
  }

  private buildFallbackDraft(prompt: string): string {
    return [
      'Subject: Follow up about your home search',
      '',
      'HTML:',
      `<p>Hi there — following up on your home search.</p><p>${prompt}</p>`,
      '',
      'Text:',
      `Hi there — following up on your home search.\n\n${prompt}`
    ].join('\n');
  }
}

function parseDraft(raw: string): { subject: string; html: string; text: string } {
  const subjectMatch = raw.match(/Subject:\s*(.+)/i);
  const htmlMatch = raw.match(/HTML:\s*([\s\S]*?)\nText:/i);
  const textMatch = raw.match(/Text:\s*([\s\S]*)$/i);

  const subject = subjectMatch?.[1]?.trim() || 'Follow up from Hatch';
  const html = htmlMatch?.[1]?.trim() || `<p>${subject}</p>`;
  const text = textMatch?.[1]?.trim() || subject;

  return { subject, html, text };
}
