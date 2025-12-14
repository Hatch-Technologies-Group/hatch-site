import { apiFetch } from '@/lib/api/hatch'

export type AgentPortalConfig = {
  organizationId: string
  allowedPaths: string[]
  landingPath: string | null
  createdAt: string | null
  updatedAt: string | null
  isDefault: boolean
}

export async function fetchAgentPortalConfig(orgId: string) {
  return apiFetch<AgentPortalConfig>(`organizations/${orgId}/agent-portal-config`)
}

export async function updateAgentPortalConfig(
  orgId: string,
  payload: { allowedPaths: string[]; landingPath?: string | null }
) {
  return apiFetch<AgentPortalConfig>(`organizations/${orgId}/agent-portal-config`, {
    method: 'PUT',
    body: payload
  })
}

