'use client';

import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

import {
  useAiEmployees,
  useAiActions,
  chatWithAiEmployee,
  approveAiAction,
  rejectAiAction,
  AiEmployeeInstance,
  AiEmployeeAction,
  AiEmployeeCard,
  AiActionTray
} from '@/lib/api/aiEmployees';

type ChatMessage = {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  createdAt: Date;
};

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

export function AiEmployeeChatPanel(props: {
  token: string;
  employee: AiEmployeeInstance | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { token, employee, open, onOpenChange } = props;
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState('');
  const [isSending, setIsSending] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    setMessages([]);
    setInput('');
  }, [employee?.id]);

  React.useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  if (!employee) return null;

  const tmpl = employee.template;

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !token || isSending) return;

    const userMessage: ChatMessage = {
      id: uuid(),
      sender: 'user',
      text: input.trim(),
      createdAt: new Date()
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsSending(true);

    try {
      const resp = await chatWithAiEmployee(token, employee.id, userMessage.text, 'web_chat');
      const aiText = typeof resp.reply === 'string' ? resp.reply : JSON.stringify(resp.reply);
      const aiMessage: ChatMessage = {
        id: uuid(),
        sender: 'ai',
        text: aiText,
        createdAt: new Date()
      };
      setMessages((prev) => [...prev, aiMessage]);
    } catch (err) {
      console.error('AI chat failed', err);
      setMessages((prev) => [
        ...prev,
        {
          id: uuid(),
          sender: 'ai',
          text: "Sorry, I couldn’t process that message. Please try again.",
          createdAt: new Date()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex w-full max-w-xl flex-col gap-4">
        <SheetHeader>
          <SheetTitle>{tmpl.displayName}</SheetTitle>
          <SheetDescription>{tmpl.description}</SheetDescription>
        </SheetHeader>

        <Separator />

        <div className="flex flex-1 flex-col gap-3">
          <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-md border bg-muted/40 p-3">
            {messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Start a conversation with{' '}
                <span className="font-semibold">{tmpl.defaultSettings.name}</span>.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {messages.map((m) => (
                  <div key={m.id} className={cn('flex', m.sender === 'user' ? 'justify-end' : 'justify-start')}>
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        m.sender === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background text-foreground shadow-sm'
                      )}
                    >
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="flex flex-col gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Ask ${tmpl.defaultSettings.name} anything about your leads, listings, or day...`}
              className="min-h-[80px]"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                Messages may create AI-proposed actions. Review them in the approval tray.
              </p>
              <Button type="submit" disabled={isSending || !input.trim()}>
                {isSending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function AiTeamDashboard(props: { token: string }) {
  const { token } = props;
  const employees = useAiEmployees(token);
  const [selectedEmployee, setSelectedEmployee] = React.useState<AiEmployeeInstance | null>(null);
  const [chatOpen, setChatOpen] = React.useState(false);

  function openChat(emp: AiEmployeeInstance) {
    setSelectedEmployee(emp);
    setChatOpen(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">AI Team</h1>
        <p className="text-sm text-muted-foreground">
          Virtual employees that help with leads, listings, transactions, and daily focus.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {employees.map((inst) => (
          <Card
            key={inst.id}
            className="flex flex-col justify-between transition hover:border-primary"
            onClick={() => openChat(inst)}
          >
            <CardHeader>
              <AiEmployeeCard instance={inst} />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs uppercase tracking-wide text-muted-foreground">
                <span>Mode: {inst.autoMode}</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={(e) => {
                    e.stopPropagation();
                    openChat(inst);
                  }}
                >
                  Open Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {employees.length === 0 && (
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle>No AI employees found</CardTitle>
              <CardDescription>
                Make sure the AI employee seed ran for this tenant before using the dashboard.
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      <AiEmployeeChatPanel token={token} employee={selectedEmployee} open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}

export function AiApprovalTrayPanel(props: { token: string }) {
  const { token } = props;
  const [refreshFlag, setRefreshFlag] = React.useState(0);
  const actions = useAiActions(token, refreshFlag);

  async function handleApprove(id: string) {
    try {
      await approveAiAction(token, id);
      setRefreshFlag((n) => n + 1);
    } catch (err) {
      console.error('Failed to approve action', err);
    }
  }

  async function handleReject(id: string) {
    try {
      await rejectAiAction(token, id);
      setRefreshFlag((n) => n + 1);
    } catch (err) {
      console.error('Failed to reject action', err);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Proposed Actions</CardTitle>
        <CardDescription>
          Review and approve actions created by Lead Nurse, Listing Concierge, Transaction Coordinator, or Agent Copilot.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[360px] w-full pr-2">
          {actions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No pending actions. When AI proposes tasks or drafts, they’ll appear here.
            </p>
          ) : (
            <AiActionTray actions={actions} onApprove={handleApprove} onReject={handleReject} />
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
