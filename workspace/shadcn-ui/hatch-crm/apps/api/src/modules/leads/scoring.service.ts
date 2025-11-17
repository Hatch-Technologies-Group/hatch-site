import { Injectable } from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { SemanticSearchService } from '@/modules/search/semantic.service';

type RuleFactors = {
  sourceQuality: number;
  activity: number;
  recency: number;
};

type RagFactors = {
  positiveSignals: string[];
  negativeSignals: string[];
};

type ScoreResult = {
  score: number;
  factors: {
    rules: RuleFactors;
    rag: RagFactors;
  };
};

@Injectable()
export class LeadScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly semantic: SemanticSearchService
  ) {}

  async scoreLead(tenantId: string, leadId: string): Promise<ScoreResult> {
    const lead = await this.prisma.person.findUnique({
      where: { id: leadId },
      include: {
        activityRollup: true
      }
    });

    if (!lead || lead.tenantId !== tenantId) {
      throw new Error('Lead not found');
    }

    const rules: RuleFactors = {
      sourceQuality: this.sourceQuality(lead.source),
      activity: this.activityScore(lead),
      recency: this.recencyScore(lead.lastActivityAt ?? lead.activityRollup?.lastTouchpointAt ?? null)
    };

    const baseScore = this.weightedSum(rules, {
      sourceQuality: 0.4,
      activity: 0.4,
      recency: 0.2
    });

    const ragSnippets = await this.semantic.search({
      tenantId,
      query: 'lead intent + buying signals + urgency',
      entityType: 'lead',
      entityId: leadId,
      limit: 10
    });

    const rag = this.extractRagFactors(ragSnippets.map((snippet) => snippet.content ?? ''));
    const ragBoost = this.ragBoostScore(rag);
    const finalScore = Math.max(0, Math.min(100, baseScore + ragBoost));

    const factors = { rules, rag };

    await this.prisma.leadScoreV2.upsert({
      where: { leadId },
      update: { tenantId, score: finalScore, factors },
      create: { leadId, tenantId, score: finalScore, factors }
    });

    return { score: finalScore, factors };
  }

  private weightedSum(values: RuleFactors, weights: Record<keyof RuleFactors, number>) {
    return (Object.keys(values) as Array<keyof RuleFactors>).reduce(
      (total, key) => total + values[key] * (weights[key] ?? 0),
      0
    );
  }

  private sourceQuality(source?: string | null) {
    if (!source) return 5;
    const value = source.toLowerCase();
    if (/(zillow|realtor|portal)/.test(value)) return 10;
    if (/(referral|repeat|sphere)/.test(value)) return 9;
    if (/(paid|listicle)/.test(value)) return 7;
    return 6;
  }

  private activityScore(lead: {
    activityRollup?: {
      last7dSessions: number;
      last7dListingViews: number;
      lastReplyAt?: Date | null;
      lastEmailOpenAt?: Date | null;
      lastTouchpointAt?: Date | null;
    } | null;
  }) {
    const rollup = lead.activityRollup;
    if (!rollup) return 4;

    const sessions = rollup.last7dSessions ?? 0;
    const views = rollup.last7dListingViews ?? 0;
    const replied = rollup.lastReplyAt ? 1 : 0;
    const opened = rollup.lastEmailOpenAt ? 1 : 0;
    const touched = rollup.lastTouchpointAt ? 1 : 0;

    const raw = sessions * 0.6 + views * 0.4 + (replied + opened + touched) * 3;
    return Math.min(10, Number(raw.toFixed(2)));
  }

  private recencyScore(lastInteraction: Date | string | null) {
    if (!lastInteraction) return 3;
    const ts = new Date(lastInteraction).getTime();
    const days = (Date.now() - ts) / (1000 * 60 * 60 * 24);
    if (days <= 1) return 10;
    if (days <= 3) return 8;
    if (days <= 7) return 6;
    if (days <= 14) return 4;
    return 2;
  }

  private extractRagFactors(snippets: string[]): RagFactors {
    const positiveSignals: string[] = [];
    const negativeSignals: string[] = [];

    for (const snippet of snippets) {
      const text = (snippet ?? '').trim();
      if (!text) continue;
      const normalized = text.length > 240 ? `${text.slice(0, 237)}…` : text;

      if (/pre[-\s]?approved|pre[-\s]?qualified|ready to move|tour|offer/i.test(text)) {
        positiveSignals.push(normalized);
      }

      if (/not interested|stop calling|do not contact|no longer looking/i.test(text)) {
        negativeSignals.push(normalized);
      }
    }

    return { positiveSignals, negativeSignals };
  }

  private ragBoostScore(rag: RagFactors) {
    const boost = rag.positiveSignals.length * 6 - rag.negativeSignals.length * 10;
    return Math.max(-30, Math.min(30, boost));
  }
}
