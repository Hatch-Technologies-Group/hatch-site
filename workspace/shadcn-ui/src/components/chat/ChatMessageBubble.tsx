import React from 'react'
import type { ChatMessage } from '@/lib/api/chat'

type Props = { message: ChatMessage }

export const ChatMessageBubble: React.FC<Props> = ({ message }) => {
  const isUser = message.role === 'user'
  const isAssistant = message.role === 'assistant'
  const bg = isUser ? 'bg-blue-600 text-white' : isAssistant ? 'bg-muted' : 'bg-secondary'
  const align = isUser ? 'items-end' : 'items-start'
  const bubbleAlign = isUser ? 'ml-auto' : 'mr-auto'
  const actions = Array.isArray((message as any)?.metadata?.actions)
    ? ((message as any).metadata.actions as any[])
    : []

  return (
    <div className={`flex ${align} my-1`}>
      <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${bg} ${bubbleAlign}`}>
        {message.content}
        {isAssistant && actions.length > 0 && (
          <div className="mt-2 space-y-2 text-xs">
            {actions.map((action, idx) => {
              const key = `${message.id}-action-${idx}`
              const status = (action as any)?.status as string | undefined
              const summary = (action as any)?.summary as string | undefined
              const params = (action as any)?.params as Record<string, unknown> | undefined
              const error = (action as any)?.error as string | undefined
              const showParams =
                params && typeof params === 'object' && !Array.isArray(params) && Object.keys(params).length > 0
              return (
                <div
                  key={key}
                  className="rounded-md border border-border/60 bg-background/70 px-3 py-2 text-left text-[12px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-foreground">
                      {formatActionType((action as any)?.type as string | undefined)}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  {summary && <p className="mt-1 text-[11px] text-muted-foreground">{summary}</p>}
                  {error && <p className="mt-1 text-[11px] text-red-500">Error: {error}</p>}
                  {showParams && (
                    <pre className="mt-2 max-h-32 overflow-auto rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                      {JSON.stringify(params, null, 2)}
                    </pre>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function formatActionType(type?: string) {
  if (!type) return 'Action'
  return type
    .toString()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null
  const normalized = status.toLowerCase()
  const variants: Record<string, { label: string; className: string }> = {
    executed: { label: 'Executed', className: 'bg-emerald-100 text-emerald-700 border border-emerald-300' },
    failed: { label: 'Failed', className: 'bg-red-100 text-red-700 border border-red-300' }
  }
  const variant = variants[normalized] ?? {
    label: status,
    className: 'bg-muted text-foreground border border-border/70'
  }
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${variant.className}`}>
      {variant.label}
    </span>
  )
}
