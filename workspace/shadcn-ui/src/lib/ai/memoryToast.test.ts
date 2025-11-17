import { describe, expect, it } from 'vitest';

import type { PersonaMemoryLog } from '@/lib/api/hatch';
import { buildMemoryToastPayload } from './memoryToast';

describe('buildMemoryToastPayload', () => {
  it('returns null when memory log is missing', () => {
    expect(buildMemoryToastPayload(undefined)).toBeNull();
    expect(buildMemoryToastPayload(null)).toBeNull();
  });

  it('formats toast copy for known personas', () => {
    const payload = buildMemoryToastPayload({
      personaId: 'lead_nurse',
      label: 'Nurture follow-up drafted'
    });

    expect(payload?.title).toBe('Saved to Past Notes');
    expect(payload?.description).toContain('Lumen');
    expect(payload?.description).toContain('Nurture follow-up drafted');
  });

  it('falls back to Echo when persona is unknown', () => {
    const payload = buildMemoryToastPayload({
      personaId: 'unknown_persona' as PersonaMemoryLog['personaId'],
      label: 'Fallback memory'
    });

    expect(payload?.description).toContain('Echo');
    expect(payload?.description).toContain('Fallback memory');
  });
});
