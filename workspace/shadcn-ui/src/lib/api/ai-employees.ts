import { apiFetch } from '@/lib/api/hatch';

export type AiPersonaConfig = {
  id: string;
  name: string;
  description: string;
  model: string;
  temperature: number;
  tools: string[];
  collectors: string[];
};

export type AiPersonaRunResult = {
  persona: AiPersonaConfig;
  context: Record<string, unknown>;
  input?: Record<string, unknown> | null;
  rawText: string | null;
  structured?: Record<string, unknown>;
};

export async function fetchAiPersonas(orgId: string) {
  return apiFetch<AiPersonaConfig[]>(`organizations/${orgId}/ai-employees/personas`);
}

export async function runAiPersona(orgId: string, personaId: string, body?: Record<string, unknown>) {
  return apiFetch<AiPersonaRunResult>(`organizations/${orgId}/ai-employees/${personaId}/run`, {
    method: 'POST',
    body: JSON.stringify(body ?? {})
  });
}
