import { apiFetch } from './api';

export interface RentalUnitRecord {
  id: string;
  name?: string | null;
  status: string;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  leases?: Array<{
    id: string;
    tenantName: string;
    startDate: string;
    endDate: string;
  }>;
}

export interface RentalPropertyRecord {
  id: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string | null;
  propertyType: string;
  status: string;
  ownerName?: string | null;
  ownerContact?: string | null;
  units: RentalUnitRecord[];
}

export interface RentalTaxScheduleRecord {
  id: string;
  periodLabel: string;
  dueDate: string;
  amountDue?: number | null;
  status: string;
  paidDate?: string | null;
  notes?: string | null;
}

export interface RentalLeaseRecord {
  id: string;
  tenancyType: string;
  tenantName: string;
  tenantContact?: string | null;
  startDate: string;
  endDate: string;
  rentAmount?: number | null;
  requiresTaxFiling: boolean;
  isCompliant: boolean;
  unit: {
    id: string;
    name?: string | null;
    property: {
      id: string;
      addressLine1: string;
      city: string;
      state: string;
    };
  };
  taxSchedule: RentalTaxScheduleRecord[];
}

export async function fetchRentalProperties(orgId: string) {
  const records = await apiFetch<RentalPropertyRecord[]>(`organizations/${orgId}/rentals/properties`);
  return records ?? [];
}

export async function fetchRentalLeases(orgId: string) {
  const records = await apiFetch<RentalLeaseRecord[]>(`organizations/${orgId}/rentals/leases`);
  return records ?? [];
}

export async function updateRentalTaxSchedule(
  orgId: string,
  taxScheduleId: string,
  payload: { status?: string; paidDate?: string | null; notes?: string | null }
) {
  return apiFetch<RentalTaxScheduleRecord>(`organizations/${orgId}/rentals/taxes/${taxScheduleId}`, {
    method: 'PATCH',
    body: payload
  });
}
