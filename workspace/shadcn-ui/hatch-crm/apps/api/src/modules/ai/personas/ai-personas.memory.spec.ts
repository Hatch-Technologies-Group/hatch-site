import { PERSONAS } from './ai-personas.config';
import { loadAiMemories, recordAiMemory } from './ai-personas.memory';
import type { PersonaId } from './ai-personas.types';

type MemoryRow = {
  tenantId: string;
  personaId: PersonaId;
  label: string;
  details: string;
  createdAt: Date;
};

type MockStore = Map<string, MemoryRow[]>;

const buildStoreKey = (tenantId: string, personaId: PersonaId) => `${tenantId}:${personaId}`;

const createMockPrisma = () => {
  const store: MockStore = new Map();
  let counter = 0;

  return {
    prisma: {
      aiMemory: {
        create: jest.fn(async ({ data }: { data: Omit<MemoryRow, 'createdAt'> }) => {
          const row: MemoryRow = {
            ...data,
            createdAt: new Date(Date.UTC(2025, 0, counter++ + 1))
          };
          const key = buildStoreKey(row.tenantId, row.personaId);
          const existing = store.get(key) ?? [];
          existing.push(row);
          store.set(key, existing);
          return row;
        }),
        findMany: jest.fn(async ({ where, take }: { where: { tenantId: string; personaId: PersonaId }; take?: number }) => {
          const key = buildStoreKey(where.tenantId, where.personaId);
          const rows = store.get(key) ?? [];
          const sorted = [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
          return sorted.slice(0, take ?? sorted.length);
        })
      }
    },
    store
  };
};

describe('ai-personas.memory helpers', () => {
  it('records and surfaces compact past notes for each persona', async () => {
    const { prisma } = createMockPrisma();
    const tenantId = 'tenant-test';
    const personas: PersonaId[] = [
      'agent_copilot',
      'lead_nurse',
      'listing_concierge',
      'market_analyst',
      'transaction_coordinator'
    ];

    for (const personaId of personas) {
      await recordAiMemory(prisma as any, {
        tenantId,
        personaId: 'agent_copilot',
        authorPersonaId: personaId,
        label: `${personaId} label`,
        prompt: `Prompt for ${personaId}`,
        reply: `Reply for ${personaId}`
      });
    }

    const personaNameById = new Map(PERSONAS.map((persona) => [persona.id, persona.name]));
    const notes = await loadAiMemories(prisma as any, { tenantId, personaId: 'agent_copilot', limit: 10 });
    for (const personaId of personas) {
      const personaLabel = personaNameById.get(personaId) ?? 'Echo';
      expect(notes).toContain(`(${personaLabel})`);
      expect(notes).toContain(`${personaId} label`);
      expect(notes).toMatch(new RegExp(`Prompt: Prompt for ${personaId}`));
      expect(notes).toMatch(new RegExp(`Reply: Reply for ${personaId}`));
    }
  });

  it('returns NO_PAST_NOTES when store is empty', async () => {
    const prisma = {
      aiMemory: {
        findMany: jest.fn().mockResolvedValue([])
      }
    };

    const notes = await loadAiMemories(prisma as any, { tenantId: 'tenant-empty', personaId: 'agent_copilot' });
    expect(notes).toBe('NO_PAST_NOTES');
  });
});
