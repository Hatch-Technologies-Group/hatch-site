import { apiFetch } from '@/lib/api/hatch';

export interface OrgListingAgent {
  id: string;
  user?: {
    firstName?: string | null;
    lastName?: string | null;
    email?: string | null;
  } | null;
}

export interface OrgListingRecord {
  id: string;
  status: string;
  agentProfileId?: string | null;
  mlsNumber?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  listPrice?: number | null;
  propertyType?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  expiresAt?: string | null;
  agentProfile?: OrgListingAgent | null;
}

export const fetchOrgListings = async (orgId: string): Promise<OrgListingRecord[]> => {
  const listings = await apiFetch<OrgListingRecord[]>(`organizations/${orgId}/listings`);
  return listings ?? [];
};
