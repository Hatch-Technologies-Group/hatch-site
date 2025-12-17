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

export type LeadGenCampaignMetrics = {
  campaignId: string;
  spendCents: number;
  leadsCreated: number;
  qualified: number;
  appointments: number;
  costPerLeadCents: number | null;
};

