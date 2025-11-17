import { apiFetch } from './api';

export type SearchHit = {
  object: string;
  id: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  score: number;
  updatedAt: string;
};

export type SearchResponse = {
  items: SearchHit[];
  nextCursor?: string | null;
  facets: { byType: Record<string, number> };
};

export interface SearchParams {
  q: string;
  types?: string[];
  ownerId?: string;
  stage?: string;
  status?: string;
  cursor?: string;
  limit?: number;
  signal?: AbortSignal;
}

const buildQuery = (params: SearchParams) => {
  const search = new URLSearchParams();
  search.set('q', params.q);
  if (params.types?.length) {
    params.types.forEach((type) => {
      if (type) {
        search.append('types', type);
      }
    });
  }
  if (params.ownerId) search.set('ownerId', params.ownerId);
  if (params.stage) search.set('stage', params.stage);
  if (params.status) search.set('status', params.status);
  if (params.cursor) search.set('cursor', params.cursor);
  if (params.limit) search.set('limit', String(params.limit));

  const query = search.toString();
  return query ? `?${query}` : '';
};

export async function searchApi(params: SearchParams): Promise<SearchResponse> {
  const query = buildQuery(params);
  const response = await apiFetch<SearchResponse>(`search${query}`, {
    signal: params.signal
  });

  return {
    items: response.items ?? [],
    nextCursor: response.nextCursor ?? null,
    facets: response.facets ?? { byType: {} }
  };
}

export type SemanticSearchItem = {
  id: string;
  content: string;
  score: number;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown> | null;
};

export type SemanticSearchResponse = {
  items: SemanticSearchItem[];
};

export async function semanticSearch(
  q: string,
  entityType?: string,
  entityId?: string,
  limit = 5
): Promise<SemanticSearchResponse> {
  const params = new URLSearchParams();
  params.set('q', q);
  if (entityType) params.set('entityType', entityType);
  if (entityId) params.set('entityId', entityId);
  params.set('limit', String(limit));

  return apiFetch<SemanticSearchResponse>(`v1/search/semantic?${params.toString()}`);
}
