import { apiFetch } from './api';

export async function listSavedListings(orgId: string) {
  return apiFetch<any[]>(`organizations/${orgId}/consumer/saved-listings`);
}

export async function saveListing(orgId: string, searchIndexId: string) {
  return apiFetch(`organizations/${orgId}/consumer/saved-listings`, {
    method: 'POST',
    body: { searchIndexId }
  });
}

export async function removeSavedListing(orgId: string, searchIndexId: string) {
  return apiFetch(`organizations/${orgId}/consumer/saved-listings/${searchIndexId}`, {
    method: 'DELETE'
  });
}

export async function listSavedSearches(orgId: string) {
  return apiFetch<any[]>(`organizations/${orgId}/consumer/saved-searches`);
}

export async function createSavedSearch(orgId: string, payload: Record<string, unknown>) {
  return apiFetch(`organizations/${orgId}/consumer/saved-searches`, {
    method: 'POST',
    body: payload
  });
}

export async function updateSavedSearch(orgId: string, id: string, payload: Record<string, unknown>) {
  return apiFetch(`organizations/${orgId}/consumer/saved-searches/${id}`, {
    method: 'PATCH',
    body: payload
  });
}

export async function deleteSavedSearch(orgId: string, id: string) {
  return apiFetch(`organizations/${orgId}/consumer/saved-searches/${id}`, {
    method: 'DELETE'
  });
}
