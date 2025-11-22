import { apiClient } from './client'

export async function generatePlaybookFromNaturalLanguage(orgId: string, text: string) {
  const res = await apiClient.post(`/organizations/${orgId}/playbooks/ai/generate`, { text })
  return res.data
}
