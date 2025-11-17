import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AiEmployeeInstance, AiEmployeeTemplate } from '@/lib/api/ai-employees';
import {
  AiEmployeesDisabledError,
  listAiEmployeeInstances,
  listAiEmployeeTemplates
} from '@/lib/api/ai-employees';

export type AiPersona = {
  template: AiEmployeeTemplate;
  instance?: AiEmployeeInstance;
};

export function useAiEmployees() {
  const [templates, setTemplates] = useState<AiEmployeeTemplate[]>([]);
  const [instances, setInstances] = useState<AiEmployeeInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [disabled, setDisabled] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDisabled(false);
    try {
      const [templateData, instanceData] = await Promise.all([
        listAiEmployeeTemplates(),
        listAiEmployeeInstances()
      ]);
      setTemplates(templateData);
      setInstances(instanceData);
    } catch (err) {
      console.error('Failed to load AI employees', err);
      if (err instanceof AiEmployeesDisabledError) {
        setDisabled(true);
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Failed to load AI employees');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const personas = useMemo<AiPersona[]>(() => {
    const instanceByTemplate = new Map(
      instances.map((instance) => [instance.template.key, instance])
    );
    return templates.map((template) => ({
      template,
      instance: instanceByTemplate.get(template.key)
    }));
  }, [instances, templates]);

  return { templates, instances, personas, loading, error, refresh, disabled };
}
