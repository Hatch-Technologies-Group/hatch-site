import { apiClient } from './client'

type ScopeParams = { officeId?: string; teamId?: string }

export async function globalSearch(orgId: string, query: string, scope?: ScopeParams) {
  const response = await apiClient.get(`/organizations/${orgId}/search`, {
    params: {
      q: query,
      officeId: scope?.officeId,
      teamId: scope?.teamId
    }
  })
  return response.data
}

export async function globalSearchAI(orgId: string, query: string, scope?: ScopeParams) {
  const response = await apiClient.post(`/organizations/${orgId}/search/ai`, {
    query,
    officeId: scope?.officeId,
    teamId: scope?.teamId
  })
  return response.data
}
