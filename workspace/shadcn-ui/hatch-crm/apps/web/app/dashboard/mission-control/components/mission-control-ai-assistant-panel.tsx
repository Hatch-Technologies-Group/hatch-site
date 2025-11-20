"use client";

import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Sparkles } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { askAiBroker, AiAnswer } from '@/lib/api/mission-control';

type MissionControlAiAssistantPanelProps = {
  orgId: string;
};

export function MissionControlAiAssistantPanel({ orgId }: MissionControlAiAssistantPanelProps) {
  const [question, setQuestion] = useState('');
  const [contextType, setContextType] = useState<'GENERAL' | 'LISTING' | 'TRANSACTION' | 'TRAINING' | 'COMPLIANCE'>(
    'GENERAL'
  );
  const [listingId, setListingId] = useState('');
  const [transactionId, setTransactionId] = useState('');
  const [answer, setAnswer] = useState<AiAnswer | null>(null);

  const { mutateAsync, isPending } = useMutation({
    mutationFn: () =>
      askAiBroker(orgId, {
        question,
        contextType,
        listingId: listingId || undefined,
        transactionId: transactionId || undefined
      }),
    onSuccess: (response) => {
      setAnswer(response);
    }
  });

  const handleAsk = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim()) return;
    await mutateAsync();
  };

  return (
    <Card className="flex h-full flex-col rounded-2xl border border-slate-100 bg-slate-950/95 p-4 text-white shadow-lg" data-testid="mission-control-ai">
      <div className="flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-amber-300" />
        <div>
          <h3 className="text-lg font-semibold">AI Broker Assistant</h3>
          <p className="text-sm text-slate-300">Ask compliance, training, or workflow questions</p>
        </div>
      </div>

      <form onSubmit={handleAsk} className="mt-4 flex flex-col gap-3">
        <Textarea
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="What documents do I need before activating a listing?"
          className="min-h-[100px] border-slate-800 bg-slate-900 text-white placeholder:text-slate-500"
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            className="rounded-md border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-white sm:w-48"
            value={contextType}
            onChange={(event) => setContextType(event.target.value as typeof contextType)}
          >
            <option value="GENERAL">General</option>
            <option value="LISTING">Listing</option>
            <option value="TRANSACTION">Transaction</option>
            <option value="TRAINING">Training</option>
            <option value="COMPLIANCE">Compliance</option>
          </select>
          <Input
            value={listingId}
            onChange={(event) => setListingId(event.target.value)}
            placeholder="Listing ID (optional)"
            className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500"
          />
          <Input
            value={transactionId}
            onChange={(event) => setTransactionId(event.target.value)}
            placeholder="Transaction ID (optional)"
            className="border-slate-800 bg-slate-900 text-white placeholder:text-slate-500"
          />
        </div>
        <Button type="submit" variant="secondary" className="self-start" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Thinking
            </>
          ) : (
            'Ask Hatch'
          )}
        </Button>
      </form>

      {answer ? (
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <p className="text-sm text-slate-300">Suggested guidance</p>
          <p className="mt-2 text-base text-white">{answer.answer}</p>
          {answer.suggestions && answer.suggestions.length > 0 ? (
            <ul className="mt-3 list-disc pl-4 text-sm text-slate-300">
              {answer.suggestions.map((suggestion, index) => (
                <li key={`${suggestion}-${index}`}>{suggestion}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}
