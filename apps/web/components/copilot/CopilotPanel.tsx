"use client";

import { useEffect, useRef, useState } from 'react';

import {
  streamCopilotChat,
  type CopilotCitation,
  type CopilotSnippet
} from '@/lib/ai-client';

type CopilotMessage = { role: 'user' | 'assistant'; content: string };

type CopilotPanelProps = {
  threadId?: string;
  context?: Record<string, unknown>;
};

export function CopilotPanel({ threadId, context }: CopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const appendAssistantDraft = (draft: string) => {
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.role === 'assistant') {
        const next = [...prev];
        next[next.length - 1] = { role: 'assistant', content: draft };
        return next;
      }
      return [...prev, { role: 'assistant', content: draft }];
    });
  };

  const broadcastSnippets = (snippets?: CopilotSnippet[]) => {
    window.dispatchEvent(
      new CustomEvent<CopilotSnippet[]>('copilot:snippets', { detail: snippets ?? [] })
    );
  };

  const broadcastCitations = (citations?: CopilotCitation[]) => {
    window.dispatchEvent(
      new CustomEvent<CopilotCitation[]>('copilot:citations', { detail: citations ?? [] })
    );
  };

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    setInput('');
    const userMessage: CopilotMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setStreaming(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    let assistantDraft = '';

    try {
      for await (const evt of streamCopilotChat(
        {
          threadId,
          messages: nextMessages,
          context
        },
        { signal: controller.signal }
      )) {
        if (evt.type === 'delta') {
          assistantDraft += evt.delta;
          appendAssistantDraft(assistantDraft);
        } else if (evt.type === 'done') {
          appendAssistantDraft(assistantDraft);
          broadcastSnippets(evt.snippets);
          broadcastCitations(evt.citations);
        } else if (evt.type === 'error') {
          setMessages((prev) => [
            ...prev,
            {
              role: 'assistant',
              content: `Error: ${evt.error}`
            }
          ]);
        }
      }
    } finally {
      setStreaming(false);
    }
  };

  useEffect(() => () => abortRef.current?.abort(), []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((message, index) => (
          <div key={`${message.role}-${index}`} className={message.role === 'user' ? 'text-right' : 'text-left'}>
            <span
              className={`inline-block rounded-2xl px-3 py-2 text-sm ${
                message.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {message.content}
            </span>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-t p-2">
        <input
          className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-primary"
          placeholder={streaming ? 'Streaming…' : 'Ask Hatch Copilot…'}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              send();
            }
          }}
          disabled={streaming}
        />
        <button
          type="button"
          className="rounded-xl bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
          onClick={send}
          disabled={streaming || !input.trim()}
        >
          Send
        </button>
      </div>
    </div>
  );
}
