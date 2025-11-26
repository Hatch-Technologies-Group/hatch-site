import { apiFetch } from './hatch';
import { ApiError } from './errors';

export interface OfferIntentPayload {
  listingId: string;
  offeredPrice?: number;
  financingType?: string;
  closingTimeline?: string;
  contingencies?: string;
  comments?: string;
}

export interface OfferIntentRecord {
  id: string;
  status: string;
  listingId: string;
  offeredPrice?: number | null;
  financingType?: string | null;
  closingTimeline?: string | null;
  contingencies?: string | null;
  comments?: string | null;
  createdAt: string;
  transactionId?: string | null;
  listing?: {
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
    agentProfileId?: string | null;
  } | null;
  consumer?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
  lead?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

export async function createPublicOfferIntent(orgId: string, payload: OfferIntentPayload) {
  return apiFetch<OfferIntentRecord>(`organizations/${orgId}/offer-intents/public`, {
    method: 'POST',
    body: payload
  });
}

export async function createAuthenticatedOfferIntent(orgId: string, payload: OfferIntentPayload) {
  return apiFetch<OfferIntentRecord>(`organizations/${orgId}/offer-intents`, {
    method: 'POST',
    body: payload
  });
}

export async function fetchOfferIntents(orgId: string, params?: { status?: string; listingId?: string }) {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.listingId) query.set('listingId', params.listingId);
  const qs = query.toString();
  const url = `organizations/${orgId}/offer-intents${qs ? `?${qs}` : ''}`;
  try {
    const records = await apiFetch<OfferIntentRecord[]>(url);
    return records ?? [];
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      // Offer intents not available in this environment; treat as empty list.
      return [];
    }
    throw error;
  }
}

export async function updateOfferIntentStatus(
  orgId: string,
  offerIntentId: string,
  payload: { status: string; transactionId?: string | null }
) {
  return apiFetch<OfferIntentRecord>(`organizations/${orgId}/offer-intents/${offerIntentId}/status`, {
    method: 'PATCH',
    body: payload
  });
}
