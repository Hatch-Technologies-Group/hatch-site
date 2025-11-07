import { apiFetch } from './api';
import { ApiError } from './errors';

export interface MetricsPoint {
  date: string;
  valueNum: number | null;
  valueJson: Record<string, unknown> | null;
}

const buildQuery = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
};

export async function getMetricsSeries(
  key: string,
  params: { from?: string; to?: string } = {}
): Promise<MetricsPoint[]> {
  const query = buildQuery({ key, ...params, granularity: 'daily' });
  try {
    return await apiFetch<MetricsPoint[]>(`reporting/metrics${query}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return [];
    }
    throw error;
  }
}

export async function recomputeMetrics(
  keys?: string[],
  params: { from?: string; to?: string } = {}
): Promise<void> {
  try {
    await apiFetch('reporting/recompute', {
      method: 'POST',
      body: JSON.stringify({
        ...(keys && keys.length > 0 ? { keys } : {}),
        ...params
      })
    });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return;
    }
    throw error;
  }
}
