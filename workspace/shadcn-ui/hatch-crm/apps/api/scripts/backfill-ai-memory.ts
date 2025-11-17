import { existsSync } from 'node:fs';
import path from 'node:path';

import { config as loadEnv } from 'dotenv';

import { PrismaClient } from '@prisma/client';

const appRoot = path.resolve(__dirname, '..');
const envFiles = ['.env.local', '.env'].map((file) => path.join(appRoot, file));
for (const envFile of envFiles) {
  if (existsSync(envFile)) {
    loadEnv({ path: envFile, override: false });
  }
}

const prisma = new PrismaClient();

type SerializedMemory = {
  authorPersonaId?: string;
  prompt?: string;
  reply?: string;
};

const BATCH_SIZE = Number(process.env.AI_MEMORY_BACKFILL_BATCH ?? 200);

async function main() {
  console.log(`Starting AI memory backfill in batches of ${BATCH_SIZE}…`);
  let processed = 0;
  let updated = 0;
  let skipped = 0;
  let cursor: string | undefined;

  while (true) {
    const rows = await prisma.aiMemory.findMany({
      orderBy: { id: 'asc' },
      take: BATCH_SIZE,
      ...(cursor
        ? {
            skip: 1,
            cursor: { id: cursor }
          }
        : {})
    });

    if (!rows.length) break;

    for (const row of rows) {
      processed += 1;
      const parsed = parseSerialized(row.details);
      if (parsed?.authorPersonaId) {
        skipped += 1;
        continue;
      }

      const legacy = parsed ?? extractLegacySnippets(row.details);
      const payload: SerializedMemory = {
        authorPersonaId: legacy.authorPersonaId ?? parsed?.authorPersonaId ?? row.personaId ?? 'agent_copilot',
        prompt: truncate(legacy.prompt ?? parsed?.prompt ?? row.details, 200),
        reply: truncate(legacy.reply ?? parsed?.reply ?? row.details, 260)
      };

      await prisma.aiMemory.update({
        where: { id: row.id },
        data: { details: JSON.stringify(payload) }
      });
      updated += 1;
    }

    cursor = rows[rows.length - 1]?.id;
  }

  console.log(
    `Backfill finished. processed=${processed}, updated=${updated}, skipped=${skipped}, remaining=${processed - updated - skipped}`
  );
}

function parseSerialized(details: string): SerializedMemory | null {
  try {
    const value = JSON.parse(details);
    return value && typeof value === 'object' ? (value as SerializedMemory) : null;
  } catch {
    return null;
  }
}

function extractLegacySnippets(details: string): SerializedMemory {
  const promptMatch = details.match(/Prompt:\s*"?([^"|]+)"?/i);
  const replyMatch = details.match(/Reply:\s*"?([^"]+)"?/i);
  return {
    prompt: promptMatch?.[1]?.trim(),
    reply: (replyMatch?.[1] ?? details)?.trim()
  };
}

function truncate(value: string | undefined, maxLength: number): string | undefined {
  if (!value) {
    return value;
  }
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
