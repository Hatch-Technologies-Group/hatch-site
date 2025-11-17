import type { PersonaMemoryLog } from '@/lib/api/hatch';
import { PERSONAS } from './aiPersonas';

type ToastPayload =
  | {
      title: string;
      description: string;
    }
  | null;

export function buildMemoryToastPayload(memoryLog?: PersonaMemoryLog | null): ToastPayload {
  if (!memoryLog) {
    return null;
  }
  const personaName = PERSONAS.find((persona) => persona.id === memoryLog.personaId)?.name ?? 'Echo';
  return {
    title: 'Saved to Past Notes',
    description: `${personaName} logged "${memoryLog.label}".`
  };
}
