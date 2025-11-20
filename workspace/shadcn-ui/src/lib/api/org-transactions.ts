import { apiFetch } from '@/lib/api/hatch';

export interface OrgTransactionRecord {
  id: string;
  status: string;
  listingId?: string | null;
  agentProfileId?: string | null;
  buyerName?: string | null;
  sellerName?: string | null;
  contractSignedAt?: string | null;
  inspectionDate?: string | null;
  financingDate?: string | null;
  closingDate?: string | null;
  isCompliant?: boolean;
  requiresAction?: boolean;
  listing?: {
    id: string;
    addressLine1?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    listPrice?: number | null;
  } | null;
  agentProfile?: {
    id: string;
    user?: {
      firstName?: string | null;
      lastName?: string | null;
      email?: string | null;
    } | null;
  } | null;
}

export const fetchOrgTransactions = async (orgId: string): Promise<OrgTransactionRecord[]> => {
  const transactions = await apiFetch<OrgTransactionRecord[]>(`organizations/${orgId}/transactions`);
  return transactions ?? [];
};
