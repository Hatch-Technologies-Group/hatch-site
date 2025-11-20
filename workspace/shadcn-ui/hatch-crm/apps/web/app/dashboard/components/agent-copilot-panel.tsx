'use client';

import { useEffect, useState } from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopilotAction, fetchDailyBriefing, updateCopilotActionStatus } from '@/lib/api/ai-copilot';
import { useOrgId } from '@/lib/hooks/useOrgId';

export function AgentCopilotPanel() {
  const orgId = useOrgId();
  const [insight, setInsight] = useState<{ title: string; summary: string } | null>(null);
  const [actions, setActions] = useState<CopilotAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    fetchDailyBriefing(orgId)
      .then((payload) => {
        setInsight(payload.insight);
        setActions(payload.actions ?? []);
      })
      .catch((err) => {
        console.error(err);
        setError('Unable to load copilot briefing.');
      })
      .finally(() => setLoading(false));
  }, [orgId]);

  async function handleStatus(actionId: string, status: string) {
    if (!orgId) return;
    setUpdatingId(actionId);
    try {
      const updated = await updateCopilotActionStatus(orgId, actionId, status);
      setActions((prev) => prev.map((action) => (action.id === updated.id ? updated : action)));
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  }

  if (!orgId) {
    return null;
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-base font-semibold">AI Copilot</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {loading && <p className="text-muted-foreground">Generating your briefing…</p>}
        {error ? <p className="text-rose-600">{error}</p> : null}
        {!loading && !error && insight ? (
          <div className="space-y-2">
            <p className="font-semibold">{insight.title}</p>
            <p className="text-muted-foreground whitespace-pre-line">{insight.summary}</p>
          </div>
        ) : null}
        {!loading && actions.length > 0 ? (
          <div className="space-y-3">
            {actions.map((action) => (
              <div key={action.id} className="rounded border p-3">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{action.title}</span>
                  <Badge variant="outline">{action.status}</Badge>
                  {action.priority != null ? <Badge variant="outline">P{action.priority}</Badge> : null}
                </div>
                {action.description ? (
                  <p className="mt-1 text-xs text-muted-foreground">{action.description}</p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {action.status !== 'ACCEPTED' && (
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs"
                      variant="outline"
                      disabled={updatingId === action.id}
                      onClick={() => handleStatus(action.id, 'ACCEPTED')}
                    >
                      Accept
                    </Button>
                  )}
                  {action.status !== 'DISMISSED' && (
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs"
                      variant="ghost"
                      disabled={updatingId === action.id}
                      onClick={() => handleStatus(action.id, 'DISMISSED')}
                    >
                      Dismiss
                    </Button>
                  )}
                  {action.status !== 'COMPLETED' && (
                    <Button
                      size="sm"
                      className="h-7 px-3 text-xs"
                      disabled={updatingId === action.id}
                      onClick={() => handleStatus(action.id, 'COMPLETED')}
                    >
                      Complete
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : null}
        {!loading && !error && actions.length === 0 ? (
          <p className="text-xs text-muted-foreground">No AI suggestions yet. Check back soon!</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
