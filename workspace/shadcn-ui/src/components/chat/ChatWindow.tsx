import React, { useEffect, useRef, useState } from 'react'
import { useChat } from '@/hooks/useChat'
import { ChatMessageBubble } from './ChatMessageBubble'

type Props = {
  open: boolean
  onClose: () => void
  initialPrompt?: string
}

export const ChatWindow: React.FC<Props> = ({ open, onClose, initialPrompt }) => {
  const {
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
  } = useChat()

  const [input, setInput] = useState('')
  const messagesRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    if (initialPrompt) setInput(initialPrompt)
  }, [open, initialPrompt, setError])

  useEffect(() => {
    if (messagesRef.current) {
      messagesRef.current.scrollTop = messagesRef.current.scrollHeight
    }
  }, [messages, sending])

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    await sendMessage(input.trim())
    setInput('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end pointer-events-none">
      <div className="absolute inset-0 bg-black/30 pointer-events-auto" onClick={onClose} />
      <div className="relative z-50 m-4 w-full max-w-lg rounded-lg border bg-background shadow-lg flex flex-col pointer-events-auto">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
              H
            </div>
            <div className="text-sm font-semibold">Ask Hatch</div>
          </div>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Esc
          </button>
        </div>

        <div className="flex flex-1 min-h-[250px]">
          <div className="w-40 border-r flex flex-col text-xs">
            <div className="flex items-center justify-between px-2 py-1 border-b">
              <span className="font-semibold">Sessions</span>
              <button
                className="text-[10px] text-blue-600 hover:underline"
                onClick={() => startNewSession('New chat')}
              >
                New
              </button>
            </div>
            <div className="flex-1 overflow-auto">
              {loadingSessions && <div className="px-2 py-1 text-muted-foreground">Loading…</div>}
              {!loadingSessions && sessions.length === 0 && (
                <div className="px-2 py-2 text-muted-foreground">No chats yet.</div>
              )}
              {sessions.map((s) => {
                const active = s.id === currentSessionId
                return (
                  <button
                    key={s.id}
                    className={`w-full text-left px-2 py-1 truncate text-[11px] ${
                      active ? 'bg-muted font-semibold' : 'hover:bg-muted/60'
                    }`}
                    onClick={() => selectSession(s.id)}
                  >
                    {s.title || 'Chat'} · {new Date(s.updatedAt).toLocaleDateString()}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 flex flex-col">
            <div ref={messagesRef} className="flex-1 overflow-auto px-3 py-2 text-xs">
              {loadingMessages && <div className="text-muted-foreground text-sm">Loading…</div>}
              {!loadingMessages && messages.length === 0 && (
                <div className="text-muted-foreground text-sm">
                  Ask Hatch anything about your brokerage, listings, leads, or transactions.
                </div>
              )}
              {messages.map((m) => (
                <ChatMessageBubble key={m.id} message={m} />
              ))}
              {sending && <div className="text-muted-foreground text-xs mt-2">Hatch is thinking…</div>}
            </div>
            {error && <div className="px-3 py-1 text-xs text-red-500 border-t">{error}</div>}
            <form onSubmit={handleSubmit} className="border-t px-3 py-2">
              <textarea
                rows={2}
                className="w-full resize-none text-sm bg-background border rounded px-2 py-1 focus:outline-none focus:ring"
                placeholder="Ask Hatch anything…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e as any)
                  }
                }}
              />
              <div className="mt-1 flex justify-between items-center text-[10px] text-muted-foreground">
                <span>Enter to send · Shift+Enter for newline</span>
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-blue-600 text-white text-[11px] hover:bg-blue-700 disabled:opacity-50"
                  disabled={!input.trim() || sending}
                >
                  Send
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
