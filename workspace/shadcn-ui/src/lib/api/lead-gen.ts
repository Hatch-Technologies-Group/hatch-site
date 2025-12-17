import { API_BASE_URL, apiFetch } from '@/lib/api/hatch';

export type LeadGenChannel = 'PAID_SOCIAL' | 'PAID_SEARCH' | 'SEO' | 'OUTBOUND' | 'DIRECT' | 'OTHER';
export type LeadGenObjective = 'LEADS' | 'TRAFFIC' | 'CONVERSIONS';
export type LeadGenCampaignStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ARCHIVED';
export type LeadGenLandingPageStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type LeadGenAudienceStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type LeadGenConversionEventType =
  | 'LEAD_CREATED'
  | 'LEAD_CONTACTED'
  | 'LEAD_QUALIFIED'
  | 'APPOINTMENT_SET'
  | 'OPPORTUNITY_CREATED'
  | 'DEAL_UNDER_CONTRACT'
  | 'DEAL_CLOSED';

export type LeadGenCampaign = {
  id: string;
  organizationId: string;
  tenantId: string | null;
  createdByUserId: string | null;
  name: string;
  slug: string | null;
  channel: LeadGenChannel;
  objective: LeadGenObjective;
  status: LeadGenCampaignStatus;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  startAt: string | null;
  endAt: string | null;
  dailyBudgetCents: number | null;
  totalBudgetCents: number | null;
  currency: string;
  targeting: Record<string, unknown> | null;
  creativeBrief: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadGenCampaignMetrics = {
  campaignId: string;
  spendCents: number;
  leadsCreated: number;
  qualified: number;
  appointments: number;
  costPerLeadCents: number | null;
};

export type LeadGenLandingPage = {
  id: string;
  organizationId: string;
  tenantId: string | null;
  campaignId: string | null;
  listingId: string | null;
  createdByUserId: string | null;
  slug: string;
  status: LeadGenLandingPageStatus;
  title: string;
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  layout: Record<string, unknown>;
  formSchema: Record<string, unknown> | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadGenAudience = {
  id: string;
  tenantId: string;
  name: string;
  status: LeadGenAudienceStatus;
  definition: Record<string, unknown>;
  lastComputedAt: string | null;
  lastCount: number | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadGenAudienceSnapshot = {
  id: string;
  audienceId: string;
  computedAt: string;
  memberCount: number;
  exportFormat: string;
  storageKey: string | null;
  metadata: Record<string, unknown> | null;
};

export type LeadGenConversionEvent = {
  id: string;
  organizationId: string;
  tenantId: string | null;
  personId: string | null;
  leadId: string | null;
  campaignId: string | null;
  landingPageId: string | null;
  exportBatchId: string | null;
  eventType: LeadGenConversionEventType;
  occurredAt: string;
  valueCents: number | null;
  currency: string;
  attribution: Record<string, unknown> | null;
  exportStatus: string;
  exportedAt: string | null;
  createdAt: string;
};

export type LeadGenContext = {
  orgId: string;
  userId?: string | null;
  tenantId?: string | null;
  role?: string | null;
};

const DEFAULT_TENANT_ID = import.meta.env.VITE_TENANT_ID || 'tenant-hatch';

const buildCtxHeaders = (ctx: LeadGenContext): HeadersInit => ({
  'x-org-id': ctx.orgId,
  'x-tenant-id': ctx.tenantId ?? DEFAULT_TENANT_ID,
  'x-user-id': ctx.userId ?? 'user-broker',
  'x-user-role': (ctx.role ?? 'BROKER').toUpperCase()
});

async function apiFetchText(path: string, options: RequestInit = {}): Promise<string> {
  const sanitizedPath = path.replace(/^\/+/, '');
  const url = API_BASE_URL.startsWith('http') ? new URL(sanitizedPath, API_BASE_URL).toString() : `${API_BASE_URL}${sanitizedPath}`;
  const response = await fetch(url, { ...options, credentials: 'include' });
  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(text || response.statusText);
  }
  return response.text();
}

export async function listLeadGenCampaigns(ctx: LeadGenContext): Promise<LeadGenCampaign[]> {
  return apiFetch<LeadGenCampaign[]>('lead-gen/campaigns', { headers: buildCtxHeaders(ctx) });
}

export async function createLeadGenCampaign(ctx: LeadGenContext, payload: Partial<LeadGenCampaign>): Promise<LeadGenCampaign> {
  return apiFetch<LeadGenCampaign>('lead-gen/campaigns', { method: 'POST', body: payload, headers: buildCtxHeaders(ctx) });
}

export async function upsertLeadGenCampaignSpend(
  ctx: LeadGenContext,
  campaignId: string,
  payload: { date: string; amountCents: number; currency?: string; source?: string }
) {
  return apiFetch(`lead-gen/campaigns/${campaignId}/spend`, { method: 'POST', body: payload, headers: buildCtxHeaders(ctx) });
}

export async function getLeadGenCampaignMetrics(ctx: LeadGenContext, campaignId: string): Promise<LeadGenCampaignMetrics> {
  return apiFetch<LeadGenCampaignMetrics>(`lead-gen/campaigns/${campaignId}/metrics`, { headers: buildCtxHeaders(ctx) });
}

export async function listLeadGenLandingPages(ctx: LeadGenContext): Promise<LeadGenLandingPage[]> {
  return apiFetch<LeadGenLandingPage[]>('lead-gen/landing-pages', { headers: buildCtxHeaders(ctx) });
}

export async function createLeadGenLandingPage(ctx: LeadGenContext, payload: Partial<LeadGenLandingPage>): Promise<LeadGenLandingPage> {
  return apiFetch<LeadGenLandingPage>('lead-gen/landing-pages', { method: 'POST', body: payload, headers: buildCtxHeaders(ctx) });
}

export async function publishLeadGenLandingPage(ctx: LeadGenContext, id: string): Promise<LeadGenLandingPage> {
  return apiFetch<LeadGenLandingPage>(`lead-gen/landing-pages/${id}/publish`, { method: 'POST', headers: buildCtxHeaders(ctx) });
}

export async function unpublishLeadGenLandingPage(ctx: LeadGenContext, id: string): Promise<LeadGenLandingPage> {
  return apiFetch<LeadGenLandingPage>(`lead-gen/landing-pages/${id}/unpublish`, { method: 'POST', headers: buildCtxHeaders(ctx) });
}

export async function listLeadGenAudiences(ctx: LeadGenContext): Promise<LeadGenAudience[]> {
  return apiFetch<LeadGenAudience[]>('lead-gen/audiences', { headers: buildCtxHeaders(ctx) });
}

export async function createLeadGenAudience(ctx: LeadGenContext, payload: Partial<LeadGenAudience>): Promise<LeadGenAudience> {
  return apiFetch<LeadGenAudience>('lead-gen/audiences', { method: 'POST', body: payload, headers: buildCtxHeaders(ctx) });
}

export async function computeLeadGenAudience(ctx: LeadGenContext, id: string): Promise<LeadGenAudienceSnapshot> {
  return apiFetch<LeadGenAudienceSnapshot>(`lead-gen/audiences/${id}/compute`, { method: 'POST', body: {}, headers: buildCtxHeaders(ctx) });
}

export async function listLeadGenAudienceSnapshots(ctx: LeadGenContext, id: string): Promise<LeadGenAudienceSnapshot[]> {
  return apiFetch<LeadGenAudienceSnapshot[]>(`lead-gen/audiences/${id}/snapshots`, { headers: buildCtxHeaders(ctx) });
}

export async function exportLeadGenAudienceCsv(ctx: LeadGenContext, audienceId: string, snapshotId?: string | null): Promise<string> {
  const qs = snapshotId ? `?snapshotId=${encodeURIComponent(snapshotId)}` : '';
  return apiFetchText(`lead-gen/audiences/${audienceId}/export${qs}`, { method: 'GET', headers: buildCtxHeaders(ctx) });
}

export async function listLeadGenConversions(
  ctx: LeadGenContext,
  params: { campaignId?: string; landingPageId?: string; eventType?: string; from?: string; to?: string } = {}
): Promise<LeadGenConversionEvent[]> {
  const qs = new URLSearchParams();
  if (params.campaignId) qs.set('campaignId', params.campaignId);
  if (params.landingPageId) qs.set('landingPageId', params.landingPageId);
  if (params.eventType) qs.set('eventType', params.eventType);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const query = qs.toString();
  return apiFetch<LeadGenConversionEvent[]>(query ? `lead-gen/conversions?${query}` : 'lead-gen/conversions', {
    headers: buildCtxHeaders(ctx)
  });
}

export async function exportLeadGenConversionsCsv(
  ctx: LeadGenContext,
  payload: { destination?: string; campaignId?: string; from?: string; to?: string; format?: string; dryRun?: boolean }
): Promise<string> {
  return apiFetchText('lead-gen/exports/conversions', {
    method: 'POST',
    headers: { ...buildCtxHeaders(ctx), 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

