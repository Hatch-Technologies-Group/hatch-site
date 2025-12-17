import { apiFetch } from '../api';

export type OrgListingContactType = 'SENT' | 'BUYING' | 'SELLING';

export type OrgListingContactPerson = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  primaryPhone: string | null;
};

export type OrgListingContactRecord = {
  id: string;
  listingId: string;
  personId: string;
  type: OrgListingContactType;
  createdAt: string;
  updatedAt: string;
  person?: OrgListingContactPerson | null;
};

export async function listOrgListingContacts(
  orgId: string,
  listingId: string,
  params: { type?: OrgListingContactType } = {}
): Promise<OrgListingContactRecord[]> {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  const query = search.toString();
  const path = query
    ? `organizations/${orgId}/listings/${listingId}/contacts?${query}`
    : `organizations/${orgId}/listings/${listingId}/contacts`;
  const rows = await apiFetch<OrgListingContactRecord[]>(path);
  return rows ?? [];
}

export async function attachOrgListingContact(
  orgId: string,
  listingId: string,
  payload: { personId: string; type: OrgListingContactType }
): Promise<OrgListingContactRecord> {
  return apiFetch<OrgListingContactRecord>(`organizations/${orgId}/listings/${listingId}/contacts`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function detachOrgListingContact(
  orgId: string,
  listingId: string,
  personId: string,
  params: { type?: OrgListingContactType } = {}
): Promise<{ deleted: number }> {
  const search = new URLSearchParams();
  if (params.type) search.set('type', params.type);
  const query = search.toString();
  const path = query
    ? `organizations/${orgId}/listings/${listingId}/contacts/${personId}?${query}`
    : `organizations/${orgId}/listings/${listingId}/contacts/${personId}`;
  return apiFetch<{ deleted: number }>(path, {
    method: 'DELETE'
  });
}

