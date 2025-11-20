"use client";

import * as React from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

import { PERSONAS, type PersonaId } from '@/lib/ai/aiPersonas';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export type HatchAIMessage = { id: string; role: 'user' | 'assistant'; content: string };

type HatchAIWidgetProps = {
  onSend: (payload: { text: string; personaId: PersonaId; history: HatchAIMessage[] }) => Promise<{
    activePersonaId: PersonaId;
    replies: HatchAIMessage[];
  }>;
};

// Thinking Indicator Component
const ThinkingIndicator: React.FC<{ isThinking: boolean }> = ({ isThinking }) => {
  if (!isThinking) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-2 mt-1">
      {/* Optional: AI Avatar Pulse */}
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
        <div className="h-5 w-5 rounded-full bg-primary/80 animate-pulse" />
      </div>

      {/* Thinking Dots */}
      <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce" />
        </div>
        <span className="text-xs text-muted-foreground/80">Thinking...</span>
      </div>
    </div>
  );
};

export function HatchAIWidget({ onSend }: HatchAIWidgetProps) {
  const [open, setOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(true);
  const [activePersonaId, setActivePersonaId] = React.useState<PersonaId>('agent_copilot');
  const [messages, setMessages] = React.useState<HatchAIMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [sending, setSending] = React.useState(false);

  const persona = PERSONAS.find((entry) => entry.id === activePersonaId) ?? PERSONAS[0];

  const handleSend = async () => {
    const text = input.trim();
    if (!text || sending) return;

    const userMessage: HatchAIMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    const history = [...messages, userMessage];

    setMessages(history);
    setInput('');
    setSending(true);
    try {
      const response = await onSend({
        text,
        personaId: activePersonaId,
        history
      });
      setActivePersonaId(response.activePersonaId);
      setMessages((prev) => [...prev, ...response.replies]);
    } catch (error) {
      console.error(error);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: 'Sorry — something went wrong talking to your AI coworker.' }
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-12 items-center gap-2 rounded-full bg-[#1F5FFF] px-4 text-sm font-medium text-white shadow-lg hover:shadow-xl"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-lg">🤖</span>
        <span>Ask Hatch AI</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end">
      <div className="w-[360px] overflow-hidden rounded-2xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full text-base"
              style={{ background: 'linear-gradient(135deg, rgba(31,95,255,0.16), rgba(76,201,240,0.14))' }}
            >
              {persona.avatarEmoji}
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold">New chat · {persona.shortName}</span>
              <span className="text-[11px] text-muted-foreground">{persona.tagline}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button type="button" className="rounded-full p-1 hover:bg-muted" onClick={() => setExpanded((value) => !value)}>
              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </button>
            <button type="button" className="rounded-full p-1 hover:bg-muted" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {expanded && (
          <>
            <div className="flex gap-2 overflow-x-auto px-3 pt-2 pb-1">
              {PERSONAS.map((entry) => {
                const isActive = entry.id === activePersonaId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setActivePersonaId(entry.id)}
                    className={`flex items-center gap-2 rounded-full border px-2 py-1 text-[11px] transition ${
                      isActive ? 'border-transparent text-slate-900' : 'border-border text-muted-foreground'
                    }`}
                    style={{ backgroundColor: isActive ? entry.avatarBg : 'transparent' }}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-xs" style={{ backgroundColor: entry.avatarBg }}>
                      {entry.avatarEmoji}
                    </span>
                    <span className="truncate">{entry.shortName}</span>
                  </button>
                );
              })}
            </div>

            <div className="max-h-[260px] space-y-2 overflow-y-auto px-3 py-2 text-[13px]">
              {messages.length === 0 ? (
                <div className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground">
                  Ask {persona.shortName} anything about {persona.tagline.toLowerCase()} &mdash; or pick one of the starter prompts below.
                </div>
              ) : (
                messages.map((message) => (
                  <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3 py-1.5 text-[13px] ${
                        message.role === 'user' ? 'bg-[#1F5FFF] text-white' : 'bg-muted'
                      }`}
                    >
                      {message.content}
                    </div>
                  </div>
                ))
              )}
              {/* Thinking indicator while waiting for AI */}
              <ThinkingIndicator isThinking={sending} />
            </div>

            <div className="flex flex-wrap gap-1 px-3 pb-2">
              {persona.examples.map((example) => (
                <button
                  key={example}
                  type="button"
                  onClick={() => setInput(example)}
                  className="rounded-full border border-dashed px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="border-t px-3 py-2">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={persona.placeholder}
                  rows={1}
                  className="min-h-[38px] max-h-[96px] resize-none text-[13px]"
                />
                <Button size="sm" disabled={!input.trim() || sending} onClick={() => void handleSend()}>
                  {sending ? '…' : 'Send'}
                </Button>
              </div>
              <p className="mt-1 text-[10px] text-muted-foreground">Hatch AI may make mistakes. Check important details before you act.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
