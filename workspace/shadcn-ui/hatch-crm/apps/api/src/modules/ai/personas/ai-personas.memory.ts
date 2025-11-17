import type { PrismaService } from '@/modules/prisma/prisma.service';

import { PERSONAS } from './ai-personas.config';
import type { PersonaId } from './ai-personas.types';

const PERSONA_NAME_BY_ID = new Map(PERSONAS.map((persona) => [persona.id, persona.name]));

type SerializedMemory = {
  authorPersonaId?: PersonaId;
  prompt?: string;
  reply?: string;
};

export async function recordAiMemory(
  prisma: PrismaService,
  params: {
    tenantId: string;
    personaId: PersonaId;
    authorPersonaId: PersonaId;
    label: string;
    prompt: string;
    reply: string;
  }
) {
  const { tenantId, personaId, authorPersonaId, label, prompt, reply } = params;
  try {
    const payload: SerializedMemory = {
      authorPersonaId,
      prompt: truncateForMemory(prompt, 200),
      reply: truncateForMemory(reply, 260)
    };

    await prisma.aiMemory.create({
      data: {
        tenantId,
        personaId,
        label,
        details: JSON.stringify(payload)
      }
    });
  } catch (error) {
    console.error('Failed to record AI memory', error);
  }
}

export async function loadAiMemories(
  prisma: PrismaService,
  params: { tenantId: string; personaId: PersonaId; limit?: number }
): Promise<string> {
  const { tenantId, personaId, limit = 15 } = params;
  const memories = await prisma.aiMemory.findMany({
    where: { tenantId, personaId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });

  if (!memories.length) {
    return 'NO_PAST_NOTES';
  }

  const compact = memories
    .map((memory) => formatMemoryLine(memory))
    .join('\n');

  return compact.slice(0, 4000);
}

type MemoryRecord = {
  label: string;
  details: string;
  createdAt: Date;
};

function formatMemoryLine(memory: MemoryRecord): string {
  const parsed = parseSerializedMemory(memory.details);
  const authorId = parsed?.authorPersonaId;
  const personaName = (authorId && PERSONA_NAME_BY_ID.get(authorId)) ?? 'Echo';
  const promptSnippet = parsed?.prompt ? `Prompt: ${parsed.prompt}` : null;
  const replySnippet = parsed?.reply ? `Reply: ${parsed.reply}` : null;
  const summary = [promptSnippet, replySnippet].filter(Boolean).join(' | ') || memory.details;

  return `- [${memory.createdAt.toISOString()}] (${personaName}) ${memory.label}: ${summary}`;
}

function parseSerializedMemory(details: string): SerializedMemory | null {
  try {
    const payload = JSON.parse(details) as SerializedMemory;
    if (payload && typeof payload === 'object') {
      return payload;
    }
    return null;
  } catch {
    return null;
  }
}

function truncateForMemory(value: string, maxLength: number): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength - 3)}...`;
}
