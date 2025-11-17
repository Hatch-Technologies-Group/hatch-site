type GroundingSnippet = {
  id?: string;
  content: string;
  score?: number;
  meta?: Record<string, unknown> | null;
};

type SelectionMeta = {
  text?: string;
  meta?: Record<string, unknown>;
};

type Ctx = {
  tenantId: string;
  page?: string;
  entityType?: string;
  entityId?: string;
  filters?: Record<string, unknown>;
  selection?: SelectionMeta;
  grounding?: { snippets?: GroundingSnippet[] };
  version?: string;
  analytics?: {
    heroMetrics?: Array<{ label: string; value: string }>;
    snapshot?: Array<{ label: string; value: string; caption?: string }>;
    pipeline?: {
      name?: string;
      stageCount?: number;
      totalLeads?: number;
      idleLeads?: number;
      stageSummary?: Array<{ name: string; leadCount: number }>;
    };
  };
};

export function buildSystemPrompt(ctx: Ctx) {
  const lines: string[] = [
    `You are Hatch Copilot (prompt ${ctx.version ?? 'v1'}). Be upbeat, encouraging, and extremely concise—sound like a supportive teammate.`,
    'Respond using plain text bullet points (prefix with "-") and avoid Markdown bold/italics.',
    'Start with a quick upbeat acknowledgement (e.g., "Great question!"), then give at most 3 friendly action bullets. Do not add closing pep-talk lines (no "You got this" or similar).',
    'If drafting outreach, return subject, HTML, and plain text.'
  ];

  const ctxBits = [
    ctx.page ? `Page: ${ctx.page}` : null,
    ctx.entityType && ctx.entityId ? `Focus: ${ctx.entityType} id=${ctx.entityId}` : null,
    ctx.filters ? `Filters: ${JSON.stringify(ctx.filters)}` : null,
    ctx.selection?.meta ? `Selection meta: ${JSON.stringify(ctx.selection.meta)}` : null,
    ctx.selection?.text ? `Highlighted: ${ctx.selection.text.slice(0, 600)}` : null
  ].filter(Boolean);

  if (ctxBits.length) {
    lines.push('Context:', ctxBits.join('\n'));
  } else {
    lines.push('Context: none');
  }

  if (ctx.grounding?.snippets?.length) {
    const joined = ctx.grounding.snippets
      .map((snippet, index) => `#${index + 1}: ${snippet.content}`)
      .join('\n');
    lines.push('Grounding snippets (use these facts as truth):', joined);
  }

  if (ctx.analytics?.heroMetrics?.length) {
    const heroLine = ctx.analytics.heroMetrics
      .map((metric) => `${metric.label}: ${metric.value}`)
      .join(' | ');
    lines.push('Key pipeline KPIs:', heroLine);
  }

  if (ctx.analytics?.snapshot?.length) {
    const snapshotLine = ctx.analytics.snapshot
      .map((card) => `${card.label}: ${card.value}${card.caption ? ` (${card.caption})` : ''}`)
      .join(' | ');
    lines.push('CRM snapshot:', snapshotLine);
  }

  if (ctx.analytics?.pipeline) {
    const details: string[] = [];
    if (ctx.analytics.pipeline.name) {
      details.push(`Pipeline: ${ctx.analytics.pipeline.name}`);
    }
    if (typeof ctx.analytics.pipeline.stageCount === 'number') {
      details.push(`Stages: ${ctx.analytics.pipeline.stageCount}`);
    }
    if (typeof ctx.analytics.pipeline.totalLeads === 'number') {
      details.push(`Total leads: ${ctx.analytics.pipeline.totalLeads}`);
    }
    if (typeof ctx.analytics.pipeline.idleLeads === 'number') {
      details.push(`Idle leads: ${ctx.analytics.pipeline.idleLeads}`);
    }
    if (details.length) {
      lines.push(details.join(' | '));
    }
    if (ctx.analytics.pipeline.stageSummary?.length) {
      const summaryLine = ctx.analytics.pipeline.stageSummary
        .map((stage) => `${stage.name}: ${stage.leadCount}`)
        .join(' | ');
      lines.push('Stage load:', summaryLine);
    }
  }

  return lines.join('\n\n');
}
