import { apiFetch } from './api';

export interface OrgListingAgent {
  id: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export interface OrgListingSummary {
  id: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string | null;
  listPrice?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  propertyType?: string | null;
  agentProfile?: OrgListingAgent | null;
}

export interface OrgListingRecord extends OrgListingSummary {
  status: string;
  mlsNumber?: string | null;
  brokerApproved?: boolean;
  brokerApprovedAt?: string | null;
  listedAt?: string | null;
  expiresAt?: string | null;
  documents?: Array<{
    id: string;
    type?: string | null;
    orgFile?: {
      id: string;
      name?: string | null;
      fileName?: string | null;
    } | null;
  }>;
}

export interface OrgListingDetail extends OrgListingSummary {
  documents?: Array<{ id: string; orgFileId: string }>;
}

export async function fetchOrgListings(orgId: string): Promise<OrgListingRecord[]> {
  const listings = await apiFetch<OrgListingRecord[]>(`organizations/${orgId}/listings`);
  return listings ?? [];
}

export async function fetchPublicListings(orgId: string): Promise<OrgListingSummary[]> {
  const listings = await apiFetch<OrgListingSummary[]>(`organizations/${orgId}/listings/public`);
  return listings ?? [];
}

export async function fetchPublicListing(orgId: string, listingId: string): Promise<OrgListingDetail> {
  return apiFetch<OrgListingDetail>(`organizations/${orgId}/listings/public/${listingId}`);
}
