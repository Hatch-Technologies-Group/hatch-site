import { apiFetch } from '../api';
import type { OrgListingContactType } from './org-listing-contacts';

export type ContactOrgListingRecord = {
  id: string;
  listingId: string;
  personId: string;
  type: OrgListingContactType;
  createdAt: string;
  updatedAt: string;
  listing?: {
    id: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    status?: string;
    listPrice?: number | null;
    agentProfile?: {
      id: string;
      user?: { firstName?: string | null; lastName?: string | null; email?: string | null } | null;
    } | null;
  };
};

export async function listContactOrgListings(
  contactId: string,
  params: { tenantId?: string; type?: OrgListingContactType } = {}
): Promise<ContactOrgListingRecord[]> {
  const search = new URLSearchParams();
  if (params.tenantId) search.set('tenantId', params.tenantId);
  if (params.type) search.set('type', params.type);
  const query = search.toString();
  const path = query ? `contacts/${contactId}/org-listings?${query}` : `contacts/${contactId}/org-listings`;
  const rows = await apiFetch<ContactOrgListingRecord[]>(path);
  return rows ?? [];
}

export async function attachContactOrgListing(
  contactId: string,
  payload: { tenantId?: string; orgListingId: string; type: OrgListingContactType }
): Promise<ContactOrgListingRecord> {
  const search = new URLSearchParams();
  if (payload.tenantId) search.set('tenantId', payload.tenantId);
  const query = search.toString();
  const path = query ? `contacts/${contactId}/org-listings?${query}` : `contacts/${contactId}/org-listings`;
  return apiFetch<ContactOrgListingRecord>(path, {
    method: 'POST',
    body: JSON.stringify({ orgListingId: payload.orgListingId, type: payload.type })
  });
}

export async function detachContactOrgListing(
  contactId: string,
  orgListingId: string,
  params: { tenantId?: string; type?: OrgListingContactType } = {}
): Promise<{ deleted: number }> {
  const search = new URLSearchParams();
  if (params.tenantId) search.set('tenantId', params.tenantId);
  if (params.type) search.set('type', params.type);
  const query = search.toString();
  const path = query
    ? `contacts/${contactId}/org-listings/${orgListingId}?${query}`
    : `contacts/${contactId}/org-listings/${orgListingId}`;
  return apiFetch<{ deleted: number }>(path, { method: 'DELETE' });
}

