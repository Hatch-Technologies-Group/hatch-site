import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

import { AiConfig } from '@/config/ai.config';
import { PrismaService } from '@/modules/prisma/prisma.service';

type DraftPurpose = 'intro' | 'tour' | 'price_drop' | 'checkin';

interface DraftMessageInput {
  contactId: string;
  purpose: DraftPurpose;
  context?: unknown;
}

interface DraftMessageResult {
  text: string;
}

@Injectable()
export class AiService {
  private readonly client: OpenAI | null;
  private readonly log = new Logger(AiService.name);

  constructor(private readonly db: PrismaService) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.client = null;
      this.log.warn('OPENAI_API_KEY missing; falling back to heuristic drafts.');
    }
  }

  async draftMessage({ contactId, purpose, context }: DraftMessageInput): Promise<DraftMessageResult> {
    const [contactName, favorite] = await Promise.all([
      this.lookupContactName(contactId),
      this.lookupLastFavorite(contactId)
    ]);

    if (!this.client) {
      return { text: buildFallbackDraft(contactName, purpose, context) };
    }

    const prompt = buildPrompt({ contactName, purpose, favorite, context });

    const startedAt = Date.now();
    const response = await this.withRetries(() =>
      this.client!.responses.create(
        {
          model: AiConfig.model,
          input: prompt,
          max_output_tokens: 220,
          temperature: AiConfig.temperature
        },
        { timeout: AiConfig.timeoutMs }
      )
    );
    const durationMs = Date.now() - startedAt;
    this.safeLogCost({ model: AiConfig.model, ms: durationMs });

    const text = response ? extractResponseText(response) : undefined;
    const draft = text ?? buildFallbackDraft(contactName, purpose, context);
    const trimmed = draft.length > 320 ? `${draft.slice(0, 317)}…` : draft;
    return { text: trimmed };
  }

  private async withRetries<T>(fn: () => Promise<T>, maxAttempts = 2): Promise<T | null> {
    let attempt = 0;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempt += 1;
        if (attempt >= maxAttempts) {
          break;
        }
        this.log.warn('OpenAI draft call failed; retrying…');
        await new Promise((resolve) => setTimeout(resolve, 300 + Math.random() * 400));
      }
    }

    if (lastError instanceof Error) {
      this.log.error(`OpenAI draft call failed after ${maxAttempts} attempts: ${lastError.message}`);
    } else if (lastError) {
      this.log.error('OpenAI draft call failed after retries.');
    }

    return null;
  }

  private safeLogCost(meta: { model: string; ms: number }) {
    this.log.debug(`AI draft model=${meta.model} ms=${meta.ms}`);
  }

  private async lookupContactName(contactId: string): Promise<string> {
    const contact = await this.db.person.findUnique({
      where: { id: contactId },
      select: { firstName: true, lastName: true }
    });

    const parts = [contact?.firstName, contact?.lastName].filter(Boolean);
    const joined = parts.length > 0 ? parts.join(' ') : 'there';
    return joined.length > 40 ? joined.slice(0, 40) : joined;
  }

  private async lookupLastFavorite(contactId: string) {
    const rows = await this.db.$queryRawUnsafe<
      Array<{ mlsId: string; address: string | null; price: number | null }>
    >(
      `
        SELECT a.meta->>'mlsId' AS "mlsId",
               p.address_line1 AS address,
               p.price
        FROM activity a
        JOIN property p ON p.mls_id = a.meta->>'mlsId'
        WHERE a.contact_id = $1
          AND a.type = 'PropertyFavorited'
        ORDER BY a.ts DESC
        LIMIT 1
      `,
      contactId
    );

    return rows[0];
  }
}

type PromptParams = {
  contactName: string;
  purpose: DraftPurpose;
  favorite?: { mlsId: string; address: string | null; price: number | null };
  context?: unknown;
};

function buildPrompt({ contactName, purpose, favorite, context }: PromptParams): string {
  const contextRecord = (context && typeof context === 'object' ? (context as Record<string, unknown>) : {}) ?? {};
  const quietHours = Boolean(contextRecord.quietHours);

  let contextLine = '';
  if (context !== undefined) {
    try {
      contextLine = `Context: ${JSON.stringify(context).slice(0, 600)}`;
    } catch {
      contextLine = 'Context provided but could not be serialised.';
    }
  }

  const lines = [
    'You write short, friendly, compliant real-estate outreach messages.',
    'Return exactly one SMS-ready text under 300 characters.',
    'Include an opt-out hint: "Reply STOP to opt out".',
    'Avoid high-pressure language; keep it helpful and specific.',
    quietHours ? 'Recipient may be in quiet hours — acknowledge timing politely if relevant.' : '',
    `Recipient: ${contactName}. Purpose: ${purpose}.`,
    favorite ? `Last favorite: ${favorite.address ?? 'Unknown address'} at ${formatPrice(favorite.price)} (MLS ${favorite.mlsId}).` : '',
    contextLine
  ];

  return lines.filter(Boolean).join('\n');
}

function extractResponseText(response: unknown): string | undefined {
  if (!response) {
    return undefined;
  }

  const outputText = (response as { output_text?: unknown })?.output_text;
  if (typeof outputText === 'string' && outputText.trim().length > 0) {
    return outputText.trim();
  }

  const items = (response as { output?: Array<{ content?: Array<Record<string, unknown>> }> }).output;
  if (!Array.isArray(items)) {
    return undefined;
  }

  const chunks: string[] = [];
  for (const item of items) {
    if (!Array.isArray(item?.content)) continue;
    for (const content of item.content) {
      const value = (content as { text?: { value?: unknown } })?.text?.value;
      if (typeof value === 'string' && value.trim().length > 0) {
        chunks.push(value.trim());
      }
    }
  }

  const combined = chunks.join('\n').trim();
  return combined.length > 0 ? combined : undefined;
}

function buildFallbackDraft(name: string, purpose: DraftPurpose, context?: unknown): string {
  const intro = `Hi ${name},`;
  const purposeLine = resolvePurposeLine(purpose, context);
  return `${intro} ${purposeLine} Reply STOP to opt out.`;
}

function resolvePurposeLine(purpose: DraftPurpose, context?: unknown): string {
  const ctx = (typeof context === 'object' && context !== null ? context : {}) as Record<string, unknown>;
  const lastMlsId = typeof ctx.lastMlsId === 'string' ? ctx.lastMlsId : undefined;

  switch (purpose) {
    case 'intro':
      return 'thanks again for connecting — excited to learn more about what you are looking for.';
    case 'tour':
      return 'happy to line up a tour when it works for you.';
    case 'price_drop':
      return lastMlsId
        ? `just saw a price adjustment on MLS ${lastMlsId} and thought of you.`
        : 'just spotted a price adjustment that might be a fit.';
    case 'checkin':
    default:
      return lastMlsId
        ? `checking in to see what you thought about MLS ${lastMlsId} or if anything new caught your eye.`
        : 'checking in to see if any new homes have caught your eye or if I can pull fresh options.';
  }
}

function formatPrice(value: number | null): string {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return 'N/A';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(value);
}
