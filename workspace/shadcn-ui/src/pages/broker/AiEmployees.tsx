import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState } from '@/components/ui/error-state';
import { useAuth } from '@/contexts/AuthContext';
import {
  AiPersonaConfig,
  AiPersonaRunResult,
  fetchAiPersonas,
  runAiPersona
} from '@/lib/api/ai-employees';

const DEFAULT_ORG_ID = import.meta.env.VITE_ORG_ID ?? 'org-hatch';

export default function BrokerAiEmployeesPage() {
  const { activeOrgId } = useAuth();
  const orgId = activeOrgId ?? DEFAULT_ORG_ID;

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai-employees', orgId],
    queryFn: () => fetchAiPersonas(orgId),
    enabled: Boolean(orgId)
  });

  if (!orgId) {
    return <ErrorState message="Select an organization to view AI employees." />;
  }

  if (isLoading) {
    return <LoadingState message="Loading AI employees..." />;
  }

  if (error) {
    return (
      <div className="p-6">
        <ErrorState message="Unable to load AI employees." />
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="p-6">
        <ErrorState message="No AI personas are configured yet." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Mission Control</p>
        <h1 className="text-2xl font-semibold text-slate-900">AI Employees</h1>
        <p className="text-sm text-slate-500">
          Review configured AI personas, their context collectors, and run test outputs on-demand.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((persona) => (
          <PersonaCard key={persona.id} persona={persona} orgId={orgId} />
        ))}
      </div>
    </div>
  );
}

function PersonaCard({ persona, orgId }: { persona: AiPersonaConfig; orgId: string }) {
  const [state, setState] = useState<{
    loading: boolean;
    error?: string | null;
    result?: AiPersonaRunResult | null;
  }>({ loading: false });

  const handleRun = async () => {
    setState({ loading: true });
    try {
      const response = await runAiPersona(orgId, persona.id, {});
      setState({ loading: false, result: response });
    } catch (err) {
      setState({ loading: false, error: err instanceof Error ? err.message : 'Unable to run persona.' });
    }
  };

  return (
    <Card className="flex h-full flex-col gap-3 rounded-2xl border border-slate-200 p-4 shadow-sm">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">{persona.name}</h3>
        <p className="text-sm text-slate-500">{persona.description}</p>
      </div>
      <div className="text-xs text-slate-600">
        <div>Model: {persona.model}</div>
        <div>Temperature: {persona.temperature}</div>
        <div className="mt-1">
          Tools:{' '}
          {persona.tools.length > 0 ? (
            persona.tools.map((tool) => (
              <Badge key={`${persona.id}-${tool}`} variant="outline" className="mr-1 text-[10px] uppercase">
                {tool}
              </Badge>
            ))
          ) : (
            <span>None</span>
          )}
        </div>
        <div className="mt-1">
          Context:{' '}
          {persona.collectors.length > 0 ? (
            persona.collectors.join(', ')
          ) : (
            <span>Standard org context</span>
          )}
        </div>
      </div>
      <Button size="sm" onClick={handleRun} disabled={state.loading}>
        {state.loading ? 'Running…' : 'Test run'}
      </Button>
      {state.error ? (
        <ErrorState className="py-2 text-xs" message={state.error} />
      ) : state.loading ? (
        <LoadingState className="py-2 text-xs" message="AI is preparing a response..." />
      ) : state.result ? (
        <pre className="max-h-40 overflow-auto rounded bg-slate-50 p-2 text-[11px] text-slate-700">
          {JSON.stringify(state.result.structured ?? state.result.rawText ?? {}, null, 2)}
        </pre>
      ) : null}
    </Card>
  );
}
