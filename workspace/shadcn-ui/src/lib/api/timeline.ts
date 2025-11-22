import { apiClient } from './client'

export async function fetchTimeline(orgId: string, entityType: string, entityId: string) {
  const res = await apiClient.get(`/organizations/${orgId}/timeline/${entityType}/${entityId}`)
  return res.data as { entityId: string; entityType: string; timeline: Array<{ ts: string; source: string; eventType: string; summary: string; metadata?: any }> }
}

export async function summarizeTimeline(orgId: string, entityType: string, entityId: string) {
  const res = await apiClient.post(`/organizations/${orgId}/timeline/${entityType}/${entityId}/summary`)
  return res.data as { summary: string; structured?: any }
}
