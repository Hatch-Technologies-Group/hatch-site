"use client";

import * as React from 'react';
import { X } from 'lucide-react';

import { PersonaSelector } from './PersonaSelector';
import { AgentChatWindow } from './AgentChatWindow';
import type { PersonaId } from '@/lib/ai/aiPersonas';

export type AgentCopilotMessage = { id: string; role: 'user' | 'assistant'; content: string };

type AgentCopilotModalProps = {
  open: boolean;
  onClose: () => void;
  activePersonaId: PersonaId;
  setActivePersonaId: (id: PersonaId) => void;
  messages: AgentCopilotMessage[];
  onSendMessage: (text: string, personaId: PersonaId) => void;
};

export function AgentCopilotModal({
  open,
  onClose,
  activePersonaId,
  setActivePersonaId,
  messages,
  onSendMessage
}: AgentCopilotModalProps) {
  const [input, setInput] = React.useState('');

  React.useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    onSendMessage(text.trim(), activePersonaId);
    setInput('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div className="pointer-events-none flex w-full justify-center px-4 pb-6" onClick={(event) => event.stopPropagation()}>
        <div className="pointer-events-auto flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <div className="flex flex-col">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Agent Copilot</span>
              <span className="text-sm text-muted-foreground">Workspace · tenant scoped</span>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-muted"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-1 flex-col gap-4 overflow-auto px-4 py-3">
            <PersonaSelector activeId={activePersonaId} onSelect={setActivePersonaId} />

            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              {['New leads today', 'Overdue follow-ups', 'Draft emails pending'].map((label) => (
                <div key={label} className="rounded-xl border px-3 py-2">
                  <div className="text-[10px] text-muted-foreground">{label.toUpperCase()}</div>
                  <div className="text-sm font-semibold">—</div>
                </div>
              ))}
            </div>

            <AgentChatWindow
              activePersonaId={activePersonaId}
              messages={messages}
              input={input}
              setInput={setInput}
              onSend={handleSend}
            />
          </div>

          <div className="border-t px-4 py-2 text-[11px] text-muted-foreground">
            Agent Copilot may make mistakes. Verify important details before acting.
          </div>
        </div>
      </div>
    </div>
  );
}
