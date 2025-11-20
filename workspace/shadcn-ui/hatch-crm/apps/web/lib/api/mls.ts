import { apiFetch } from './api';

export type MlsProviderOption = 'STELLAR' | 'NABOR' | 'MATRIX' | 'GENERIC';

export interface MlsConfig {
  organizationId: string;
  provider: MlsProviderOption;
  officeCode?: string | null;
  brokerId?: string | null;
  boardName?: string | null;
  boardUrl?: string | null;
  enabled: boolean;
  lastFullSyncAt?: string | null;
  lastIncrementalSyncAt?: string | null;
}

export async function fetchMlsConfig(orgId: string) {
  return apiFetch<MlsConfig | null>(`organizations/${orgId}/mls/config`);
}

export async function updateMlsConfig(orgId: string, payload: Partial<MlsConfig>) {
  return apiFetch<MlsConfig>(`organizations/${orgId}/mls/configure`, {
    method: 'POST',
    body: payload
  });
}
