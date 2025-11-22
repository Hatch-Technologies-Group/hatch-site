import { apiClient } from './client'

export type ChatSession = {
  id: string
  title?: string | null
  createdAt: string
  updatedAt: string
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  metadata?: any
  createdAt: string
}

export async function listChatSessions(orgId: string): Promise<ChatSession[]> {
  const res = await apiClient.get(`/organizations/${orgId}/chat/sessions`)
  return res.data
}

export async function createChatSession(orgId: string, title?: string): Promise<ChatSession> {
  const res = await apiClient.post(`/organizations/${orgId}/chat/sessions`, { title })
  return res.data
}

export async function getChatSessionMessages(
  orgId: string,
  sessionId: string
): Promise<ChatMessage[]> {
  const res = await apiClient.get(`/organizations/${orgId}/chat/sessions/${sessionId}`)
  return res.data
}

export async function sendChatMessage(
  orgId: string,
  sessionId: string,
  content: string
): Promise<{ messages: ChatMessage[] }> {
  const res = await apiClient.post(`/organizations/${orgId}/chat/sessions/${sessionId}/messages`, {
    content
  })
  return res.data
}
