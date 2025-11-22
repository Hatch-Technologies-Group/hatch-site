export type ChatMessageDto = {
  id: string
  role: string
  content: string
  metadata?: Record<string, unknown> | null
  createdAt: Date
}

export type ChatSessionDto = {
  id: string
  title?: string | null
  createdAt: Date
  updatedAt: Date
}
