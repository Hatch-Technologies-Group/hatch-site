import { Injectable } from '@nestjs/common';
import { PersonStage, Prisma } from '@hatch/db';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { EmbeddingsService } from '@/modules/ai/embeddings.service';

type SourceRow = { id: string; text: string | null; createdAt: Date };

@Injectable()
export class IngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService
  ) {}

  async indexEntity(params: { tenantId: string; entityType: 'client' | 'lead'; entityId: string }) {
    const { tenantId, entityType, entityId } = params;
    const rows = await this.loadNotes(tenantId, entityType, entityId);

    const size = Number(process.env.AI_RAG_CHUNK_SIZE || 700);
    const overlap = Number(process.env.AI_RAG_CHUNK_OVERLAP || 120);
    const chunks: Array<{ text: string; idx: number; meta: Record<string, unknown> }> = [];

    let idx = 0;
    for (const row of rows) {
      const redacted = redactPII(row.text ?? '');
      for (const part of slidingWindows(redacted, size, overlap)) {
        chunks.push({
          text: part,
          idx,
          meta: { sourceId: row.id, createdAt: row.createdAt }
        });
        idx += 1;
      }
    }

    if (!chunks.length) {
      return { inserted: 0 };
    }

    const batchSize = 64;
    let inserted = 0;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const slice = chunks.slice(i, i + batchSize);
      const vectors = await this.embeddings.embed(slice.map((chunk) => chunk.text), { tenantId });
      const writes = slice.map((chunk, j) =>
        //
        this.prisma.vectorChunk.upsert({
          where: {
            tenantId_entityType_entityId_chunkIndex: {
              tenantId,
              entityType,
              entityId,
              chunkIndex: chunk.idx
            }
          },
          update: {
            content: chunk.text,
            embeddingF8: vectors[j] as any,
            meta: chunk.meta as Prisma.JsonValue
          },
          create: {
            id: `${tenantId}:${entityType}:${entityId}:${chunk.idx}`,
            tenantId,
            entityType,
            entityId,
            chunkIndex: chunk.idx,
            content: chunk.text,
            embeddingF8: vectors[j] as any,
            meta: chunk.meta as Prisma.JsonValue
          }
        })
      );

      await this.prisma.$transaction(writes);
      inserted += writes.length;
    }

    return { inserted };
  }

  private async loadNotes(tenantId: string, entityType: 'client' | 'lead', entityId: string): Promise<SourceRow[]> {
    if (entityType === 'lead') {
      return this.loadLeadNotes(tenantId, entityId);
    }
    if (entityType === 'client') {
      return this.loadClientNotes(tenantId, entityId);
    }
    return [];
  }

  private async loadLeadNotes(tenantId: string, leadId: string): Promise<SourceRow[]> {
    const notes = await this.prisma.leadNote.findMany({
      where: { tenantId, personId: leadId },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { id: true, body: true, createdAt: true }
    });
    return notes.map((note) => ({ id: note.id, text: note.body ?? '', createdAt: note.createdAt }));
  }

  private async loadClientNotes(tenantId: string, clientId: string): Promise<SourceRow[]> {
    const notes = await this.prisma.leadNote.findMany({
      where: {
        tenantId,
        personId: clientId,
        person: { stage: { in: [PersonStage.ACTIVE, PersonStage.CLOSED] } }
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
      select: { id: true, body: true, createdAt: true }
    });
    return notes.map((note) => ({ id: note.id, text: note.body ?? '', createdAt: note.createdAt }));
  }
}

function redactPII(input: string) {
  return input
    .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[email]')
    .replace(/\+?\d[\d\s().-]{7,}\d/g, '[phone]');
}

function* slidingWindows(text: string, size = 700, overlap = 120) {
  if (!text) {
    return;
  }
  let start = 0;
  while (start < text.length) {
    yield text.slice(start, start + size);
    if (start + size >= text.length) {
      break;
    }
    start += Math.max(1, size - overlap);
  }
}
