import { apiFetch } from './api';

export interface ListingSearchResult {
  id: string;
  listingId?: string | null;
  mlsNumber?: string | null;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string | null;
  propertyType?: string | null;
  listPrice?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  isRental: boolean;
}

export interface SearchResponse {
  items: ListingSearchResult[];
  total: number;
  limit: number;
  offset: number;
}

export type SearchListingsParams = {
  query?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  minPrice?: number;
  maxPrice?: number;
  minBedrooms?: number;
  maxBedrooms?: number;
  minBathrooms?: number;
  maxBathrooms?: number;
  propertyType?: string;
  isRental?: boolean;
  limit?: number;
  offset?: number;
};

export type SearchHit = {
  object: string;
  id: string;
  title: string;
  subtitle?: string | null;
  snippet?: string | null;
  score: number;
  updatedAt: string;
};

export type GlobalSearchResponse = {
  items: SearchHit[];
  nextCursor: string | null;
  facets: {
    byType: Record<string, number>;
  };
};

export type GlobalSearchParams = {
  q: string;
  types?: string[];
  ownerId?: string;
  stage?: string;
  status?: string;
  limit?: number;
  cursor?: string | null;
  signal?: AbortSignal;
};

const buildQuery = (params: Record<string, string | number | undefined | (string | number)[]>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        search.append(key, String(entry));
      });
      return;
    }
    search.append(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export async function searchListings(orgId: string, params: SearchListingsParams = {}): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    searchParams.append(key, String(value));
  });

  const query = searchParams.toString();
  const path = query.length > 0 ? `organizations/${orgId}/mls/search?${query}` : `organizations/${orgId}/mls/search`;
  return apiFetch<SearchResponse>(path);
}

export async function searchApi(params: GlobalSearchParams): Promise<GlobalSearchResponse> {
  if (!params.q?.trim()) {
    return { items: [], nextCursor: null, facets: { byType: {} } };
  }

  const query = buildQuery({
    q: params.q,
    ownerId: params.ownerId,
    stage: params.stage,
    status: params.status,
    limit: params.limit,
    cursor: params.cursor ?? undefined,
    ...(params.types?.length ? { types: params.types } : {})
  });

  const response = await apiFetch<{ items: SearchHit[]; nextCursor?: string | null; facets?: { byType: Record<string, number> } }>(
    `search${query}`,
    { signal: params.signal }
  );

  return {
    items: response.items ?? [],
    nextCursor: response.nextCursor ?? null,
    facets: response.facets ?? { byType: {} }
  };
}
