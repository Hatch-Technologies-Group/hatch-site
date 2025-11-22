import { apiClient } from './client'

export type AgentPerformanceSnapshot = {
  id: string
  organizationId: string
  agentProfileId: string
  leadsWorked: number
  leadsConverted: number
  avgResponseTimeSec: number
  tasksCompleted: number
  tasksOverdue: number
  documentsIssues: number
  compliantDocs: number
  listingsActive: number
  transactionsActive: number
  activityScore: number
  performanceScore: number
  responsivenessScore: number
  periodStart: string
  periodEnd: string
  createdAt: string
}

export async function fetchAgentPerformance(orgId: string) {
  const res = await apiClient.get(`/organizations/${orgId}/agent-performance/latest`)
  return res.data as AgentPerformanceSnapshot[]
}

export async function fetchAgentPerformanceDetail(orgId: string, agentProfileId: string) {
  const res = await apiClient.get(`/organizations/${orgId}/agent-performance`, {
    params: { agentProfileId },
  })
  return res.data as AgentPerformanceSnapshot[]
}

export async function generateAgentPerformance(orgId: string) {
  const res = await apiClient.post(`/organizations/${orgId}/agent-performance/generate`)
  return res.data
}
