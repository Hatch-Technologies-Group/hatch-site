import { useEffect, useState } from 'react'
import {
  listChatSessions,
  createChatSession,
  getChatSessionMessages,
  sendChatMessage,
  type ChatSession,
  type ChatMessage
} from '@/lib/api/chat'
import { useAuth } from '@/contexts/AuthContext'

export function useChat() {
  const { activeOrgId } = useAuth()
  const orgId = activeOrgId
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orgId) return
    setLoadingSessions(true)
    listChatSessions(orgId)
      .then((list) => {
        setSessions(list)
        if (!currentSessionId && list.length > 0) {
          setCurrentSessionId(list[0].id)
        }
      })
      .catch(() => setError('Failed to load chat sessions.'))
      .finally(() => setLoadingSessions(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgId])

  useEffect(() => {
    if (!orgId || !currentSessionId) {
      setMessages([])
      return
    }
    setLoadingMessages(true)
    getChatSessionMessages(orgId, currentSessionId)
      .then(setMessages)
      .catch(() => setError('Failed to load messages.'))
      .finally(() => setLoadingMessages(false))
  }, [orgId, currentSessionId])

  async function startNewSession(initialTitle?: string, initialMessage?: string) {
      if (!orgId) return
      try {
        const session = await createChatSession(orgId, initialTitle)
        setSessions((prev) => [session, ...prev])
        setCurrentSessionId(session.id)
        if (initialMessage) {
          await sendMessage(initialMessage)
        }
      } catch (err) {
        setError('Failed to create session.')
      }
  }

  async function sendMessage(content: string) {
    if (!orgId) return
    if (!currentSessionId) {
      await startNewSession(undefined, content)
      return
    }
    setSending(true)
    setError(null)
    try {
      const { messages: updated } = await sendChatMessage(orgId, currentSessionId, content)
      setMessages(updated)
    } catch (err) {
      setError('Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  function selectSession(id: string) {
    setCurrentSessionId(id)
  }

  return {
    sessions,
    currentSessionId,
    messages,
    loadingSessions,
    loadingMessages,
    sending,
    error,
    sendMessage,
    startNewSession,
    selectSession,
    setError
  }
}
