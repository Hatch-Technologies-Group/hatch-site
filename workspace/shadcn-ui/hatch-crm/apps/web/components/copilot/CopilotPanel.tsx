"use client";

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { chatAiEmployee, type AiEmployeeAction } from '@/lib/api/ai-employees';
import type { AiPersona } from '@/hooks/use-ai-employees';

type CopilotMessage =
  | { id: string; role: 'user'; content: string }
  | { id: string; role: 'assistant'; content: string; actions?: AiEmployeeAction[] };

type CopilotPanelProps = {
  persona: AiPersona;
  context?: Record<string, unknown>;
};

export function CopilotPanel({ persona, context }: CopilotPanelProps) {
  const [messages, setMessages] = useState<CopilotMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages([]);
    setInput('');
    setError(null);
  }, [persona.template.id, persona.instance?.id]);

  const instance = persona.instance;

  const { channel, contextType, contextId } = useMemo(() => {
    const getString = (key: string) => {
      if (!context) return undefined;
      const value = (context as Record<string, unknown>)[key];
      return typeof value === 'string' ? value : undefined;
    };
    return {
      channel: getString('channel') ?? 'web_chat',
      contextType: getString('contextType') ?? getString('page'),
      contextId: getString('contextId') ?? getString('entityId')
    };
  }, [context]);

  const send = async () => {
    if (!instance) return;
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setError(null);
    const userMessage: CopilotMessage = { id: crypto.randomUUID(), role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setSending(true);

    try {
      const response = await chatAiEmployee(instance.id, {
        message: text,
        channel,
        contextType,
        contextId
      });
      const assistantMessage: CopilotMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.reply,
        actions: response.actions
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to contact AI employee.';
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${message}` }
      ]);
      setError(message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200">
      <PanelHeader persona={persona} channel={channel} />

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <p className="text-xs text-slate-500">
            Ask {persona.template.displayName.split('—')[0] ?? 'this employee'} to summarize leads,
            generate marketing copy, or draft follow-ups.
          </p>
        ) : (
          messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))
        )}
      </div>

      {error && (
        <div className="px-3 pb-1 text-xs text-red-600">
          {error}
        </div>
      )}

      <FooterInput
        persona={persona}
        disabled={!instance || sending}
        input={input}
        onInputChange={setInput}
        onSend={() => void send()}
        sending={sending}
      />
    </div>
  );
}

function PanelHeader({ persona, channel }: { persona: AiPersona; channel: string }) {
  if (!persona.instance) {
    return (
      <div className="border-b px-4 py-3 text-xs text-slate-500">
        <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
          {persona.template.key}
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          {persona.template.displayName}
        </p>
        <p className="text-[11px] text-amber-600">
          This persona isn’t enabled for this tenant yet.
        </p>
      </div>
    );
  }

  const instance = persona.instance;

  return (
    <div className="border-b px-4 py-3 text-xs">
      <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
        {persona.template.key}
      </p>
      <div className="flex items-center justify-between text-slate-600">
        <div>
          <p className="text-sm font-semibold text-slate-900">{persona.template.displayName}</p>
          <p className="text-[11px] text-slate-500">
            Mode: {instance.autoMode} · Assigned to {instance.userId ? 'you' : 'workspace'}
          </p>
        </div>
        <span className="rounded-full border border-slate-200 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-500">
          {channel}
        </span>
      </div>
    </div>
  );
}

function FooterInput(props: {
  persona: AiPersona;
  disabled: boolean;
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
}) {
  const { persona, disabled, input, onInputChange, onSend, sending } = props;
  const placeholder = persona.instance
    ? `Chat with ${persona.template.displayName}…`
    : `${persona.template.displayName} is disabled for this tenant.`;

  return (
    <div className="flex gap-2 border-t p-2">
      <input
        className="flex-1 rounded-xl border px-3 py-2 text-sm outline-none focus:border-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50"
        placeholder={placeholder}
        value={input}
        onChange={(event) => onInputChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onSend();
          }
        }}
        disabled={disabled}
      />
      <button
        type="button"
        className="flex items-center justify-center rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        onClick={onSend}
        disabled={disabled || !input.trim()}
      >
        {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send
      </button>
    </div>
  );
}

function MessageBubble({ message }: { message: CopilotMessage }) {
  return (
    <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
          message.role === 'user'
            ? 'bg-blue-600 text-white'
            : 'bg-slate-100 text-slate-900'
        }`}
      >
        <p>{message.content}</p>
        {message.role === 'assistant' && message.actions && message.actions.length > 0 && (
          <div className="mt-2 space-y-1 text-xs text-slate-600">
            {message.actions.map((action) => {
              const status = (action.status ?? '').toLowerCase();
              const waitingApproval =
                action.requiresApproval && (status === 'proposed' || status === 'requires-approval');
              return (
                <div
                  key={action.id}
                  className="rounded-xl border border-slate-200 bg-white/70 p-2 text-left"
                >
                  <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
                    <span className="text-slate-700">{action.actionType}</span>
                    <InlineStatus status={action.status} />
                  </div>
                  {status === 'executed' && (
                    <p className="text-[11px] text-emerald-600">Completed successfully.</p>
                  )}
                  {status === 'failed' && action.errorMessage && (
                    <p className="text-[11px] text-red-600">{action.errorMessage}</p>
                  )}
                  {waitingApproval && (
                    <p className="text-[11px] text-amber-600">
                      Requires approval before executing.
                    </p>
                  )}
                  {action.payload && (
                    <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-slate-950/5 p-2 text-[11px] text-slate-500">
                      {JSON.stringify(action.payload, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function InlineStatus({ status }: { status: string }) {
  const normalized = (status ?? '').toLowerCase();
  const variants: Record<string, { label: string; className: string }> = {
    executed: { label: 'Executed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    failed: { label: 'Failed', className: 'bg-red-50 text-red-600 border-red-200' },
    approved: { label: 'Approved', className: 'bg-blue-50 text-blue-700 border-blue-200' },
    rejected: { label: 'Rejected', className: 'bg-red-50 text-red-600 border-red-200' },
    'requires-approval': {
      label: 'Needs approval',
      className: 'bg-amber-50 text-amber-700 border-amber-200'
    },
    proposed: { label: 'Proposed', className: 'bg-slate-200 text-slate-700 border-slate-300' }
  };
  const variant = variants[normalized] ?? {
    label: status,
    className: 'bg-slate-200 text-slate-700 border-slate-300'
  };
  return (
    <span className={`ml-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${variant.className}`}>
      {variant.label}
    </span>
  );
}
