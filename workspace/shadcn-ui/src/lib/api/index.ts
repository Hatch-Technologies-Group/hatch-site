import { apiClient, buildHeaders } from './client'

export async function reindexEntity(entityType: 'client' | 'lead', entityId: string) {
  const res = await apiClient.post(`/index/entity`, { entityType, entityId }, { headers: buildHeaders() })
  return res.data as { ok: boolean; queued: { entityType: string; entityId: string } }
}
