import { apiFetch } from '@/lib/api';

import type {
  LeadGenAudience,
  LeadGenAudienceSnapshot,
  LeadGenCampaign,
  LeadGenCampaignMetrics,
  LeadGenConversionEvent,
  LeadGenLandingPage
} from '@/lib/lead-gen/types';

export async function listLeadGenCampaigns(): Promise<LeadGenCampaign[]> {
  return apiFetch<LeadGenCampaign[]>('lead-gen/campaigns');
}

export async function createLeadGenCampaign(payload: Partial<LeadGenCampaign>): Promise<LeadGenCampaign> {
  return apiFetch<LeadGenCampaign>('lead-gen/campaigns', { method: 'POST', body: payload });
}

export async function updateLeadGenCampaign(id: string, payload: Partial<LeadGenCampaign>): Promise<LeadGenCampaign> {
  return apiFetch<LeadGenCampaign>(`lead-gen/campaigns/${id}`, { method: 'PATCH', body: payload });
}

export async function upsertLeadGenCampaignSpend(
  id: string,
  payload: { date: string; amountCents: number; currency?: string; source?: string }
): Promise<any> {
  return apiFetch<any>(`lead-gen/campaigns/${id}/spend`, { method: 'POST', body: payload });
}

export async function getLeadGenCampaignMetrics(id: string): Promise<LeadGenCampaignMetrics> {
  return apiFetch<LeadGenCampaignMetrics>(`lead-gen/campaigns/${id}/metrics`);
}

export async function listLeadGenLandingPages(): Promise<LeadGenLandingPage[]> {
  return apiFetch<LeadGenLandingPage[]>('lead-gen/landing-pages');
}

export async function createLeadGenLandingPage(payload: Partial<LeadGenLandingPage>): Promise<LeadGenLandingPage> {
  return apiFetch<LeadGenLandingPage>('lead-gen/landing-pages', { method: 'POST', body: payload });
}

export async function updateLeadGenLandingPage(id: string, payload: Partial<LeadGenLandingPage>): Promise<LeadGenLandingPage> {
  return apiFetch<LeadGenLandingPage>(`lead-gen/landing-pages/${id}`, { method: 'PATCH', body: payload });
}

export async function publishLeadGenLandingPage(id: string): Promise<LeadGenLandingPage> {
  return apiFetch<LeadGenLandingPage>(`lead-gen/landing-pages/${id}/publish`, { method: 'POST' });
}

export async function unpublishLeadGenLandingPage(id: string): Promise<LeadGenLandingPage> {
  return apiFetch<LeadGenLandingPage>(`lead-gen/landing-pages/${id}/unpublish`, { method: 'POST' });
}

export async function listLeadGenAudiences(): Promise<LeadGenAudience[]> {
  return apiFetch<LeadGenAudience[]>('lead-gen/audiences');
}

export async function createLeadGenAudience(payload: Partial<LeadGenAudience>): Promise<LeadGenAudience> {
  return apiFetch<LeadGenAudience>('lead-gen/audiences', { method: 'POST', body: payload });
}

export async function updateLeadGenAudience(id: string, payload: Partial<LeadGenAudience>): Promise<LeadGenAudience> {
  return apiFetch<LeadGenAudience>(`lead-gen/audiences/${id}`, { method: 'PATCH', body: payload });
}

export async function computeLeadGenAudience(id: string): Promise<LeadGenAudienceSnapshot> {
  return apiFetch<LeadGenAudienceSnapshot>(`lead-gen/audiences/${id}/compute`, { method: 'POST', body: {} });
}

export async function listLeadGenAudienceSnapshots(id: string): Promise<LeadGenAudienceSnapshot[]> {
  return apiFetch<LeadGenAudienceSnapshot[]>(`lead-gen/audiences/${id}/snapshots`);
}

export async function listLeadGenConversions(params: {
  campaignId?: string;
  landingPageId?: string;
  eventType?: string;
  from?: string;
  to?: string;
} = {}): Promise<LeadGenConversionEvent[]> {
  const qs = new URLSearchParams();
  if (params.campaignId) qs.set('campaignId', params.campaignId);
  if (params.landingPageId) qs.set('landingPageId', params.landingPageId);
  if (params.eventType) qs.set('eventType', params.eventType);
  if (params.from) qs.set('from', params.from);
  if (params.to) qs.set('to', params.to);
  const query = qs.toString();
  return apiFetch<LeadGenConversionEvent[]>(query ? `lead-gen/conversions?${query}` : 'lead-gen/conversions');
}

