import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { AiService } from './ai.service';
import { PERSONAS } from './personas/ai-personas.config';
import type { PersonaId } from './personas/ai-personas.types';
import {
  AUDIENCE_SEGMENTS,
  type AudienceSegmentKey
} from './ai-email.types';

type DraftContextType = 'segment' | 'singleLead';

export type AiEmailDraftInput = {
  tenantId: string;
  personaId: PersonaId;
  contextType: DraftContextType;
  segmentKey?: AudienceSegmentKey;
  leadId?: string;
  prompt?: string;
};

type LeadSnapshot = {
  name: string;
  stage: string;
  tags: string[];
  source?: string | null;
  lastActivityAt?: Date | null;
  preferredChannels: string[];
  primaryEmail?: string | null;
  primaryPhone?: string | null;
};

@Injectable()
export class AiEmailDraftService {
  private readonly logger = new Logger(AiEmailDraftService.name);

  constructor(
    private readonly ai: AiService,
    private readonly prisma: PrismaService
  ) {}

  async draftEmail(input: AiEmailDraftInput): Promise<{ subject: string; html: string }> {
    const persona =
      PERSONAS.find((candidate) => candidate.id === input.personaId) ?? PERSONAS.find((candidate) => candidate.id === 'lead_nurse') ?? PERSONAS[0];

    const [audienceSummary, leadSnapshot] = await Promise.all([
      this.buildAudienceSummary(input.contextType, input.segmentKey),
      input.contextType === 'singleLead' && input.leadId
        ? this.loadLeadSnapshot(input.tenantId, input.leadId)
        : null
    ]);

    const systemPrompt = this.buildSystemPrompt({
      personaName: persona.name,
      personaSpecialty: persona.specialty ?? 'Real estate AI assistant',
      audienceSummary,
      leadSnapshot
    });

    const userPrompt = this.buildUserPrompt({
      personaName: persona.name,
      audienceSummary,
      prompt: input.prompt,
      leadSnapshot
    });

    const response = await this.ai.runStructuredChat({
      systemPrompt,
      responseFormat: 'json_object',
      temperature: 0.65,
      messages: [{ role: 'user', content: userPrompt }]
    });

    return this.parseResponse(response.text, {
      personaName: persona.name,
      prompt: input.prompt,
      audienceSummary,
      leadSnapshot
    });
  }

  private async loadLeadSnapshot(tenantId: string, leadId: string): Promise<LeadSnapshot | null> {
    const lead = await this.prisma.person.findFirst({
      where: { id: leadId, tenantId },
      select: {
        firstName: true,
        lastName: true,
        stage: true,
        tags: true,
        source: true,
        lastActivityAt: true,
        preferredChannels: true,
        primaryEmail: true,
        primaryPhone: true
      }
    });

    if (!lead) {
      return null;
    }

    const name = [lead.firstName, lead.lastName].filter(Boolean).join(' ').trim() || 'Unknown lead';
    return {
      name,
      stage: lead.stage,
      tags: lead.tags ?? [],
      source: lead.source,
      lastActivityAt: lead.lastActivityAt,
      preferredChannels: lead.preferredChannels ?? [],
      primaryEmail: lead.primaryEmail,
      primaryPhone: lead.primaryPhone
    };
  }

  private async buildAudienceSummary(
    contextType: DraftContextType,
    segmentKey?: AudienceSegmentKey
  ): Promise<string> {
    if (contextType === 'segment') {
      const segment = (segmentKey && AUDIENCE_SEGMENTS[segmentKey]) ?? AUDIENCE_SEGMENTS.all_hot_leads;
      return `${segment.label} — ${segment.description}. Guidance: ${segment.guidance}`;
    }

    return 'Single lead follow-up — personalize with the provided lead snapshot.';
  }

  private buildSystemPrompt(input: {
    personaName: string;
    personaSpecialty: string;
    audienceSummary: string;
    leadSnapshot: LeadSnapshot | null;
  }): string {
    const lines: string[] = [
      `You are ${input.personaName}, a Hatch AI persona specializing in ${input.personaSpecialty}.`,
      'Write a ready-to-send email draft for the described audience.',
      'Always respond with STRICT JSON: {"subject": "<string>", "html": "<html string>"}',
      'Rules:',
      '- Subject must be under 90 characters.',
      '- Keep the email under 220 words.',
      '- Use simple HTML tags (<p>, <strong>, <ul>, <li>) and avoid Markdown.',
      '- Never wrap the JSON in backticks or a code block.',
      '- Ensure the email sounds like a human wrote it.'
    ];

    lines.push('', `Audience context: ${input.audienceSummary}`);

    if (input.leadSnapshot) {
      const lead = input.leadSnapshot;
      const leadLines = [
        `Lead name: ${lead.name}`,
        `Stage: ${lead.stage}`,
        lead.tags.length ? `Tags: ${lead.tags.join(', ')}` : null,
        lead.source ? `Source: ${lead.source}` : null,
        lead.lastActivityAt ? `Last activity: ${lead.lastActivityAt.toISOString()}` : null,
        lead.preferredChannels.length ? `Preferred channels: ${lead.preferredChannels.join(', ')}` : null,
        lead.primaryEmail ? `Email: ${lead.primaryEmail}` : null,
        lead.primaryPhone ? `Phone: ${lead.primaryPhone}` : null
      ]
        .filter(Boolean)
        .join('\n');
      lines.push('', 'Lead snapshot:', leadLines);
    }

    return lines.join('\n');
  }

  private buildUserPrompt(input: {
    personaName: string;
    audienceSummary: string;
    prompt?: string;
    leadSnapshot: LeadSnapshot | null;
  }): string {
    const lines: string[] = [
      `Persona: ${input.personaName}`,
      `Audience: ${input.audienceSummary}`,
      input.leadSnapshot ? `Lead snapshot already provided above.` : 'No single-lead metadata available.'
    ];

    if (input.prompt && input.prompt.trim().length > 0) {
      lines.push('', `Broker direction: ${input.prompt.trim()}`);
    } else {
      lines.push('', 'Broker direction: Draft something useful and action-oriented for this audience.');
    }

    lines.push('', 'Return a helpful subject + HTML body following the JSON contract.');
    return lines.join('\n');
  }

  private parseResponse(
    text: string | null,
    context: {
      personaName: string;
      prompt?: string;
      audienceSummary: string;
      leadSnapshot: LeadSnapshot | null;
    }
  ): { subject: string; html: string } {
    const fallback = this.buildFallbackDraft(context);

    if (!text) {
      return fallback;
    }

    const normalized = this.stripCodeFences(text.trim());

    try {
      const parsed = JSON.parse(normalized) as { subject?: string; html?: string };
      const subject = typeof parsed.subject === 'string' && parsed.subject.trim().length > 0 ? parsed.subject.trim() : fallback.subject;
      const html = this.normalizeHtml(typeof parsed.html === 'string' ? parsed.html : '');
      return { subject, html: html || fallback.html };
    } catch (error) {
      this.logger.warn(`Failed to parse AI email draft JSON: ${(error as Error).message}`);
      return fallback;
    }
  }

  private buildFallbackDraft(context: {
    personaName: string;
    prompt?: string;
    audienceSummary: string;
    leadSnapshot: LeadSnapshot | null;
  }): { subject: string; html: string } {
    const subject = context.prompt?.trim()
      ? `${context.personaName}: ${context.prompt.trim().slice(0, 72)}`
      : `${context.personaName} – quick check-in`;

    const leadName = context.leadSnapshot?.name ?? 'there';
    const intro = context.leadSnapshot ? `Hi ${leadName},` : 'Hi there,';
    const body = context.prompt?.trim()
      ? context.prompt.trim()
      : `Wanted to share something helpful for ${context.audienceSummary.toLowerCase()}.`;

    const html = [`<p>${intro}</p>`, `<p>${body}</p>`, `<p>— ${context.personaName}</p>`].join('\n');
    return { subject, html };
  }

  private stripCodeFences(value: string): string {
    if (!value.startsWith('```')) {
      return value;
    }
    return value.replace(/```json|```/gi, '').trim();
  }

  private normalizeHtml(value: string): string {
    if (!value.trim()) {
      return '';
    }
    const containsHtml = /<\/?[a-z][^>]*>/i.test(value);
    if (containsHtml) {
      return value.trim();
    }
    // Treat plain text as paragraphs.
    return value
      .split(/\n{2,}/)
      .map((segment) => segment.trim())
      .filter(Boolean)
      .map((segment) => `<p>${segment}</p>`)
      .join('\n');
  }
}
