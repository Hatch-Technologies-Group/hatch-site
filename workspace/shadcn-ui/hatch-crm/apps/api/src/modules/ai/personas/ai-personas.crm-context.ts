import type { Prisma } from '@prisma/client';

import type { PrismaService } from '@/modules/prisma/prisma.service';

const CRM_CONTEXT_LIMIT = 8000;

type LeadWithNotes = Prisma.PersonGetPayload<{
  select: {
    id: true;
    firstName: true;
    lastName: true;
    primaryEmail: true;
    primaryPhone: true;
    stage: true;
    leadScore: true;
    lastActivityAt: true;
    createdAt: true;
    source: true;
    leadNotes: {
      orderBy: { createdAt: 'desc' };
      take: 3;
      select: { body: true };
    };
  };
}>;

type RawLead = {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  stage: string | null;
  leadScore: number | null;
  lastContactAt: Date | null;
  createdAt: Date;
  source: string | null;
  notes: string | null;
};

type ScoredLead = RawLead & {
  priorityScore: number;
  priorityReasons: string[];
};

function scoreLead(lead: RawLead, now: Date): ScoredLead {
  const reasons: string[] = [];
  let score = 0;

  const baseScore = lead.leadScore ?? 0;
  score += baseScore;

  const daysSinceCreated = (now.getTime() - lead.createdAt.getTime()) / (1000 * 60 * 60 * 24);

  let daysSinceContact = daysSinceCreated;
  if (lead.lastContactAt) {
    daysSinceContact = (now.getTime() - lead.lastContactAt.getTime()) / (1000 * 60 * 60 * 24);
  }

  const stage = (lead.stage ?? '').toUpperCase();
  if (stage.includes('HOT') || stage.includes('ACTIVE')) {
    score += 20;
    reasons.push('Active / hot stage');
  } else if (stage.includes('WARM')) {
    score += 10;
    reasons.push('Warm stage');
  }

  if (daysSinceCreated <= 2) {
    score += 15;
    reasons.push('Very new lead');
  } else if (daysSinceCreated <= 7) {
    score += 8;
    reasons.push('New this week');
  }

  if (daysSinceContact >= 7 && baseScore >= 50) {
    score += 12;
    reasons.push('High score but no recent contact');
  } else if (daysSinceContact >= 14) {
    score += 8;
    reasons.push('No contact for 2+ weeks');
  }

  const source = (lead.source ?? '').toLowerCase();
  if (source.includes('referral')) {
    score += 10;
    reasons.push('Referral lead');
  } else if (source.includes('portal') || source.includes('zillow')) {
    score += 5;
    reasons.push('Portal lead');
  }

  if (lead.notes && /(ready|urgent|move soon|offer)/i.test(lead.notes)) {
    score += 10;
    reasons.push('Notes indicate high intent');
  }

  return {
    ...lead,
    priorityScore: score,
    priorityReasons: reasons
  };
}

export async function buildEchoCrmContext(
  prisma: PrismaService,
  tenantId: string | undefined
): Promise<string> {
  if (!tenantId) {
    return 'NO_CRM_DATA';
  }

  const leads = await prisma.person.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [
      { leadScore: 'desc' },
      { lastActivityAt: 'asc' }
    ],
    take: 50,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      primaryEmail: true,
      primaryPhone: true,
      stage: true,
      leadScore: true,
      lastActivityAt: true,
      createdAt: true,
      source: true,
      leadNotes: {
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { body: true }
      }
    }
  });

  if (!leads.length) {
    return 'NO_CRM_DATA';
  }

  const rawLeads: RawLead[] = leads.map(mapLeadForScoring);
  const now = new Date();
  const scoredLeads: ScoredLead[] = rawLeads.map((lead) => scoreLead(lead, now));

  scoredLeads.sort((a, b) => b.priorityScore - a.priorityScore);

  const payload = {
    generatedAt: now.toISOString(),
    leads: scoredLeads.map((lead) => ({
      id: lead.id,
      name: lead.fullName,
      stage: lead.stage,
      leadScore: lead.leadScore,
      priorityScore: lead.priorityScore,
      lastContactAt: lead.lastContactAt,
      createdAt: lead.createdAt,
      source: lead.source,
      priorityReasons: lead.priorityReasons,
      notesPreview: lead.notes?.slice(0, 160) ?? null
    }))
  };

  return JSON.stringify(payload, null, 2).slice(0, CRM_CONTEXT_LIMIT);
}

function mapLeadForScoring(lead: LeadWithNotes): RawLead {
  const fullName = `${lead.firstName ?? ''} ${lead.lastName ?? ''}`.trim();
  const notes = lead.leadNotes.map((note) => note.body).join(' ').trim();

  return {
    id: lead.id,
    fullName: fullName || null,
    email: lead.primaryEmail ?? null,
    phone: lead.primaryPhone ?? null,
    stage: lead.stage ?? null,
    leadScore: lead.leadScore ?? null,
    lastContactAt: lead.lastActivityAt ?? null,
    createdAt: lead.createdAt,
    source: lead.source ?? null,
    notes: notes || null
  };
}
