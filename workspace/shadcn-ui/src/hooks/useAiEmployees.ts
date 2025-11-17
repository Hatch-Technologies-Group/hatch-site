import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AiEmployeeInstance, AiEmployeeTemplate } from '@/lib/api/hatch';
import { listAiEmployeeInstances, listAiEmployeeTemplates } from '@/lib/api/hatch';

export type AiPersona = {
  template: AiEmployeeTemplate;
  instance?: AiEmployeeInstance;
};

export function useAiEmployees() {
  const [instances, setInstances] = useState<AiEmployeeInstance[]>([]);
  const [templates, setTemplates] = useState<AiEmployeeTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [instanceData, templateData] = await Promise.all([
        listAiEmployeeInstances(),
        listAiEmployeeTemplates()
      ]);
      setInstances(instanceData);
      setTemplates(templateData);
    } catch (err) {
      console.error('Failed to load AI employees', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI employees');
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

  return { instances, templates, personas, loading, error, refresh };
}
