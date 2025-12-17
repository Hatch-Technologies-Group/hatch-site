'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import {
  createRoutingRule,
  draftRoutingRule,
  type RoutingMode,
  type RoutingRuleDraft
} from '@/lib/api/routing';

type RoutingRuleCreateSheetProps = {
  tenantId: string;
  disabled?: boolean;
  onCreated?: () => void;
};

type JsonParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

const parseJson = <T,>(value: string, label: string): JsonParseResult<T> => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { ok: false, error: `${label} is empty` };
  }
  try {
    return { ok: true, value: JSON.parse(trimmed) as T };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    return { ok: false, error: `${label} is invalid JSON (${message})` };
  }
};

const stringifyJson = (value: unknown, fallback: string) => {
  if (value === undefined) return fallback;
  if (value === null) return 'null';
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return fallback;
  }
};

export function RoutingRuleCreateSheet({ tenantId, disabled, onCreated }: RoutingRuleCreateSheetProps) {
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'ai' | 'manual'>('ai');

  const [prompt, setPrompt] = useState('');
  const [forcedMode, setForcedMode] = useState<RoutingMode | ''>('');
  const [relaxAgentFilters, setRelaxAgentFilters] = useState(false);

  const [name, setName] = useState('New routing rule');
  const [priority, setPriority] = useState('0');
  const [mode, setMode] = useState<RoutingMode>('SCORE_AND_ASSIGN');
  const [enabled, setEnabled] = useState(true);
  const [slaFirstTouchMinutes, setSlaFirstTouchMinutes] = useState('');
  const [slaKeptAppointmentMinutes, setSlaKeptAppointmentMinutes] = useState('');
  const [conditionsJson, setConditionsJson] = useState('{}');
  const [targetsJson, setTargetsJson] = useState('[]');
  const [fallbackJson, setFallbackJson] = useState('null');

  const resetForm = useCallback(() => {
    setTab('ai');
    setPrompt('');
    setForcedMode('');
    setRelaxAgentFilters(false);
    setName('New routing rule');
    setPriority('0');
    setMode('SCORE_AND_ASSIGN');
    setEnabled(true);
    setSlaFirstTouchMinutes('');
    setSlaKeptAppointmentMinutes('');
    setConditionsJson('{}');
    setTargetsJson('[]');
    setFallbackJson('null');
  }, []);

  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, resetForm]);

  const applyDraft = useCallback((draft: RoutingRuleDraft) => {
    setName(draft.name ?? 'New routing rule');
    setPriority(String(draft.priority ?? 0));
    setMode(draft.mode ?? 'SCORE_AND_ASSIGN');
    setEnabled(Boolean(draft.enabled));
    setSlaFirstTouchMinutes(draft.slaFirstTouchMinutes ? String(draft.slaFirstTouchMinutes) : '');
    setSlaKeptAppointmentMinutes(draft.slaKeptAppointmentMinutes ? String(draft.slaKeptAppointmentMinutes) : '');
    setConditionsJson(stringifyJson(draft.conditions ?? {}, '{}'));
    setTargetsJson(stringifyJson(draft.targets ?? [], '[]'));
    setFallbackJson(stringifyJson(draft.fallback ?? null, 'null'));
  }, []);

  const draftMutation = useMutation({
    mutationFn: () =>
      draftRoutingRule({
        tenantId,
        prompt,
        ...(forcedMode ? { mode: forcedMode } : {}),
        relaxAgentFilters
      }),
    onSuccess: (draft) => {
      applyDraft(draft);
      if (draft.warnings && draft.warnings.length > 0) {
        toast({
          title: 'Draft generated with warnings',
          description: draft.warnings.join(' ')
        });
      } else {
        toast({ title: 'Draft generated', description: 'Review and save when ready.' });
      }
      setTab('manual');
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Draft failed',
        description: error instanceof Error ? error.message : 'Unable to generate a routing draft.'
      })
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const parsedPriority = Number(priority);
      if (!Number.isFinite(parsedPriority)) {
        throw new Error('Priority must be a number.');
      }

      const parsedConditions =
        conditionsJson.trim().length === 0 ? { ok: true as const, value: {} } : parseJson<Record<string, unknown>>(conditionsJson, 'Conditions');
      if (!parsedConditions.ok) {
        throw new Error(parsedConditions.error);
      }

      const parsedTargets = parseJson<Array<Record<string, unknown>>>(targetsJson, 'Targets');
      if (!parsedTargets.ok) {
        throw new Error(parsedTargets.error);
      }
      if (!Array.isArray(parsedTargets.value) || parsedTargets.value.length === 0) {
        throw new Error('Targets must be a non-empty JSON array.');
      }

      let parsedFallback: Record<string, unknown> | null = null;
      const fallbackTrimmed = fallbackJson.trim();
      if (fallbackTrimmed && fallbackTrimmed !== 'null') {
        const fallbackResult = parseJson<Record<string, unknown>>(fallbackJson, 'Fallback');
        if (!fallbackResult.ok) {
          throw new Error(fallbackResult.error);
        }
        parsedFallback = fallbackResult.value;
      }

      const slaFirst =
        slaFirstTouchMinutes.trim().length === 0 ? undefined : Number(slaFirstTouchMinutes);
      const slaKept =
        slaKeptAppointmentMinutes.trim().length === 0 ? undefined : Number(slaKeptAppointmentMinutes);

      if (slaFirst !== undefined && !Number.isFinite(slaFirst)) {
        throw new Error('First-touch SLA must be a number (minutes).');
      }
      if (slaKept !== undefined && !Number.isFinite(slaKept)) {
        throw new Error('Kept appointment SLA must be a number (minutes).');
      }

      return createRoutingRule({
        tenantId,
        name: name.trim().length > 0 ? name.trim() : 'New routing rule',
        priority: Math.round(parsedPriority),
        mode,
        enabled,
        conditions: parsedConditions.value,
        targets: parsedTargets.value,
        fallback: parsedFallback,
        ...(slaFirst !== undefined ? { slaFirstTouchMinutes: Math.round(slaFirst) } : {}),
        ...(slaKept !== undefined ? { slaKeptAppointmentMinutes: Math.round(slaKept) } : {})
      });
    },
    onSuccess: () => {
      toast({ title: 'Rule created', description: 'Routing rule is now available.' });
      setOpen(false);
      onCreated?.();
    },
    onError: (error) =>
      toast({
        variant: 'destructive',
        title: 'Create failed',
        description: error instanceof Error ? error.message : 'Unable to create routing rule.'
      })
  });

  const createDisabled = useMemo(() => disabled || createMutation.isPending, [disabled, createMutation.isPending]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button onClick={() => setOpen(true)} disabled={disabled}>
        New rule
      </Button>
      <SheetContent side="right" className="flex w-full flex-col gap-6 overflow-y-auto sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>New routing rule</SheetTitle>
          <SheetDescription>Draft with AI, review the JSON, and save.</SheetDescription>
        </SheetHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as 'ai' | 'manual')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai">AI draft</TabsTrigger>
            <TabsTrigger value="manual">Edit</TabsTrigger>
          </TabsList>
          <TabsContent value="ai" className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt</label>
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder='e.g. "Route leads over $500k, age 65+, hispanic, to Spanish-speaking luxury closers."'
                className="min-h-[120px]"
                disabled={draftMutation.isPending}
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Force mode</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={forcedMode}
                  onChange={(event) => setForcedMode(event.target.value as RoutingMode | '')}
                  disabled={draftMutation.isPending}
                >
                  <option value="">Auto</option>
                  <option value="SCORE_AND_ASSIGN">Score &amp; assign</option>
                  <option value="FIRST_MATCH">First match</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Relaxed filter</label>
                <label className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={relaxAgentFilters}
                    onChange={(event) => setRelaxAgentFilters(event.target.checked)}
                    disabled={draftMutation.isPending}
                  />
                  <span>Allow fallback to ignore strict specialist filters</span>
                </label>
              </div>
            </div>

            <Button
              onClick={() => draftMutation.mutate()}
              disabled={draftMutation.isPending || prompt.trim().length === 0}
            >
              {draftMutation.isPending ? 'Generating…' : 'Generate draft'}
            </Button>
          </TabsContent>

          <TabsContent value="manual" className="space-y-3">
            <p className="text-sm text-slate-500">
              Edit the rule config directly. Targets are required; fallback is optional.
            </p>
          </TabsContent>
        </Tabs>

        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} disabled={createDisabled} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Priority</label>
                <Input
                  value={priority}
                  onChange={(event) => setPriority(event.target.value)}
                  disabled={createDisabled}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Mode</label>
                <select
                  className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm"
                  value={mode}
                  onChange={(event) => setMode(event.target.value as RoutingMode)}
                  disabled={createDisabled}
                >
                  <option value="SCORE_AND_ASSIGN">Score &amp; assign</option>
                  <option value="FIRST_MATCH">First match</option>
                </select>
              </div>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              disabled={createDisabled}
            />
            Enabled
          </label>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">First-touch SLA (minutes)</label>
              <Input
                value={slaFirstTouchMinutes}
                onChange={(event) => setSlaFirstTouchMinutes(event.target.value)}
                placeholder="e.g. 30"
                disabled={createDisabled}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kept appt SLA (minutes)</label>
              <Input
                value={slaKeptAppointmentMinutes}
                onChange={(event) => setSlaKeptAppointmentMinutes(event.target.value)}
                placeholder="e.g. 1440"
                disabled={createDisabled}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Conditions (JSON)</label>
            <Textarea
              value={conditionsJson}
              onChange={(event) => setConditionsJson(event.target.value)}
              className="min-h-[140px] font-mono text-xs"
              disabled={createDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Targets (JSON array)</label>
            <Textarea
              value={targetsJson}
              onChange={(event) => setTargetsJson(event.target.value)}
              className="min-h-[140px] font-mono text-xs"
              disabled={createDisabled}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Fallback (JSON or null)</label>
            <Textarea
              value={fallbackJson}
              onChange={(event) => setFallbackJson(event.target.value)}
              className="min-h-[90px] font-mono text-xs"
              disabled={createDisabled}
            />
          </div>
        </div>

        <SheetFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={createDisabled}>
            Cancel
          </Button>
          <Button onClick={() => createMutation.mutate()} disabled={createDisabled}>
            {createMutation.isPending ? 'Saving…' : 'Save rule'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

