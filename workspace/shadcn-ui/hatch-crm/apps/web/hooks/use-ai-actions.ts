import { useCallback, useEffect, useState } from 'react';

import {
  listAiEmployeeActions,
  approveAiEmployeeAction,
  rejectAiEmployeeAction,
  type AiEmployeeAction,
  AiEmployeesDisabledError
} from '@/lib/api/ai-employees';

function upsert(list: AiEmployeeAction[], next: AiEmployeeAction): AiEmployeeAction[] {
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
  const [disabled, setDisabled] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDisabled(false);
    try {
      const data = await listAiEmployeeActions();
      setActions(data);
    } catch (err) {
      console.error('Failed to load AI actions', err);
      if (err instanceof AiEmployeesDisabledError) {
        setDisabled(true);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load AI actions');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const approve = useCallback(async (actionId: string) => {
    const updated = (await approveAiEmployeeAction(actionId)) as AiEmployeeAction;
    setActions((prev) => upsert(prev, updated));
    return updated;
  }, []);

  const reject = useCallback(async (actionId: string, note?: string) => {
    const updated = (await rejectAiEmployeeAction(actionId, note)) as AiEmployeeAction;
    setActions((prev) => upsert(prev, updated));
    return updated;
  }, []);

  return {
    actions,
    loading,
    error,
    refresh,
    approveAction: approve,
    rejectAction: reject,
    disabled
  };
}
