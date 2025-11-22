import { apiFetch } from '@/lib/api/hatch';

export type MlsSyncStatus = 'PENDING' | 'RUNNING' | 'SUCCESS' | 'FAILED';

export type MlsSyncRun = {
  id: string;
  organizationId: string;
  provider: string;
  startedAt: string;
  finishedAt?: string | null;
  status: MlsSyncStatus;
  totalFetched: number;
  totalUpserted: number;
  totalFailed: number;
  errorMessage?: string | null;
};

const buildQuery = (limit?: number) => {
  const params = new URLSearchParams();
  if (limit) {
    params.set('limit', `${limit}`);
  }
  const query = params.toString();
  return query ? `?${query}` : '';
};

export async function fetchMlsSyncRuns(orgId: string, limit?: number) {
  const query = buildQuery(limit);
  return apiFetch<MlsSyncRun[]>(`organizations/${orgId}/mls/sync-runs${query}`);
}

export async function triggerMlsSync(orgId: string) {
  return apiFetch<MlsSyncRun>(`organizations/${orgId}/mls/sync`, {
    method: 'POST'
  });
}
