import { PERSONAS } from './ai-personas.config';
import { buildSystemPromptForPersona } from './ai-personas.prompts';
import type { PersonaConfig } from './ai-personas.types';

const getPersona = (id: string): PersonaConfig => {
  const persona = PERSONAS.find((candidate) => candidate.id === id);
  if (!persona) {
    throw new Error(`Persona ${id} not found in config`);
  }
  return persona;
};

describe('buildSystemPromptForPersona memory integration', () => {
  it('includes CRM data and past notes for Echo', () => {
    const persona = getPersona('agent_copilot');
    const crmContext = '- Lead: Jane Doe | Score A';
    const memoryContext = '- [2025-01-01T00:00:00.000Z] Echo prioritized work: Example';
    const prompt = buildSystemPromptForPersona(persona, { crmContext, memoryContext });

    expect(prompt).toContain('CRM DATA:');
    expect(prompt).toContain(crmContext);
    expect(prompt).toContain('PAST NOTES:');
    expect(prompt).toContain(memoryContext);
  });

  it.each([
    ['lead_nurse', 'PAST OUTREACH NOTES:'],
    ['listing_concierge', 'PAST LISTING NOTES:'],
    ['market_analyst', 'PAST MARKET NOTES:'],
    ['transaction_coordinator', 'PAST TRANSACTION NOTES:']
  ])('includes shared memory block for %s', (personaId, blockLabel) => {
    const persona = getPersona(personaId);
    const memoryContext = '- [2025-02-01T00:00:00.000Z] Stored insight';
    const prompt = buildSystemPromptForPersona(persona, { memoryContext });

    expect(prompt).toContain(blockLabel);
    expect(prompt).toContain(memoryContext);
  });
});
