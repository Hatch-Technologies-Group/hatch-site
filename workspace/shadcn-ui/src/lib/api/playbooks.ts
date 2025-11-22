import { apiClient } from './client'

export type Playbook = {
  id: string
  name: string
  description?: string | null
  enabled: boolean
  triggers: any[]
  actions: any[]
}

export async function listPlaybooks(orgId: string) {
  const res = await apiClient.get(`/organizations/${orgId}/playbooks`)
  return res.data as Playbook[]
}

export async function getPlaybook(orgId: string, playbookId: string) {
  const res = await apiClient.get(`/organizations/${orgId}/playbooks/${playbookId}`)
  return res.data as Playbook
}

export async function savePlaybook(orgId: string, playbookId: string, payload: Partial<Playbook>) {
  const res = await apiClient.patch(`/organizations/${orgId}/playbooks/${playbookId}`, payload)
  return res.data as Playbook
}

export async function createPlaybook(orgId: string, payload: Partial<Playbook>) {
  const res = await apiClient.post(`/organizations/${orgId}/playbooks`, payload)
  return res.data as Playbook
}

export async function togglePlaybook(orgId: string, playbookId: string, enabled: boolean) {
  const res = await apiClient.patch(`/organizations/${orgId}/playbooks/${playbookId}/toggle`, { enabled })
  return res.data
}

export async function listPlaybookRuns(orgId: string, playbookId: string) {
  const res = await apiClient.get(`/organizations/${orgId}/playbooks/${playbookId}/runs`)
  return res.data as Array<{
    id: string
    triggerType: string
    actionSummary?: string | null
    success: boolean
    errorMessage?: string | null
    startedAt: string
    finishedAt?: string | null
  }>
}
