import { useCallback, useEffect, useMemo, useState } from 'react';

import type { AiEmployeeInstance, AiEmployeeTemplate } from '@/lib/api/hatch';
import { listAiEmployeeInstances, listAiEmployeeTemplates } from '@/lib/api/hatch';
import type { PersonaId } from '@/lib/ai/aiPersonas';

export type AiPersona = {
  template: AiEmployeeTemplate;
  instance?: AiEmployeeInstance;
};

function normalizePersonaKey(key: string): PersonaId {
  // Convert camelCase / PascalCase template keys into the snake_case persona ids used in the UI.
  const snake = key
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[-\s]+/g, '_')
    .toLowerCase();
  return snake as PersonaId;
}

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
      instances.map((instance) => [normalizePersonaKey(instance.template.key), instance])
    );

    return templates.map((template) => ({
      template: { ...template, key: normalizePersonaKey(template.key) },
      instance: instanceByTemplate.get(normalizePersonaKey(template.key))
    }));
  }, [instances, templates]);

  return { instances, templates, personas, loading, error, refresh };
}
