import { useCallback, useEffect, useState } from 'react';

import {
  listAiEmployeeActions,
  approveAiEmployeeAction,
  rejectAiEmployeeAction,
  type AiEmployeeAction
} from '@/lib/api/hatch';

function upsertAction(list: AiEmployeeAction[], next: AiEmployeeAction): AiEmployeeAction[] {
  const index = list.findIndex((item) => item.id === next.id);
  if (index === -1) {
    return [...list, next];
  }
  const copy = [...list];
  copy[index] = next;
  return copy;
}

export function useAiActions() {
  const [actions, setActions] = useState<AiEmployeeAction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAiEmployeeActions();
      setActions(data);
    } catch (err) {
      console.error('Failed to load AI actions', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI actions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = useCallback(
    async (actionId: string) => {
      const updated = await approveAiEmployeeAction(actionId);
      setActions((prev) => upsertAction(prev, updated as AiEmployeeAction));
      return updated as AiEmployeeAction;
    },
    []
  );

  const reject = useCallback(
    async (actionId: string, note?: string) => {
      const updated = await rejectAiEmployeeAction(actionId, note);
      setActions((prev) => upsertAction(prev, updated as AiEmployeeAction));
      return updated as AiEmployeeAction;
    },
    []
  );

  return {
    actions,
    loading,
    error,
    refresh,
    approveAction: approve,
    rejectAction: reject
  };
}
