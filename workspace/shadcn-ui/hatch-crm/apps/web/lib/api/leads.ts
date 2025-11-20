import { apiFetch } from './api';

export interface LeadRecord {
  id: string;
  status: string;
  source: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  message?: string | null;
  desiredMoveIn?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  agentProfileId?: string | null;
  listing?: {
    id: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    listPrice?: number | null;
    bedrooms?: number | null;
    bathrooms?: number | null;
  } | null;
  agentProfile?: {
    id: string;
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  } | null;
  createdAt: string;
}

export interface CreateLeadPayload {
  listingId?: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  desiredMoveIn?: string;
  budgetMin?: number;
  budgetMax?: number;
  bedrooms?: number;
  bathrooms?: number;
}

export async function createPublicLead(orgId: string, payload: CreateLeadPayload): Promise<LeadRecord> {
  return apiFetch<LeadRecord>(`organizations/${orgId}/leads/public`, {
    method: 'POST',
    body: payload
  });
}

export async function createAuthenticatedLead(orgId: string, payload: CreateLeadPayload): Promise<LeadRecord> {
  return apiFetch<LeadRecord>(`organizations/${orgId}/leads`, {
    method: 'POST',
    body: payload
  });
}

export async function fetchLeads(orgId: string, status?: string): Promise<LeadRecord[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const leads = await apiFetch<LeadRecord[]>(`organizations/${orgId}/leads${query}`);
  return leads ?? [];
}

export async function updateLeadStatus(
  orgId: string,
  leadId: string,
  payload: { status: string; agentProfileId?: string | null }
): Promise<LeadRecord> {
  return apiFetch<LeadRecord>(`organizations/${orgId}/leads/${leadId}/status`, {
    method: 'PATCH',
    body: payload
  });
}
