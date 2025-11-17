import { SemanticSearchService } from '../src/modules/search/semantic.service';
import type { PrismaService } from '../src/modules/prisma/prisma.service';
import type { EmbeddingsService } from '../src/modules/ai/embeddings.service';

describe('SemanticSearchService (fallback search)', () => {
  const tenantId = 'semantic-test-tenant';
  const entityType = 'client';
  const entityId = 'client_test_1';

  let prisma: Pick<PrismaService, '$queryRaw'> & {
    vectorChunk: { findMany: jest.Mock };
  };
  let embeddings: jest.Mocked<EmbeddingsService>;
  let service: SemanticSearchService;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('type \"vector\" does not exist')),
      vectorChunk: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: `${tenantId}:${entityType}:${entityId}:0`,
            tenantId,
            entityType,
            entityId,
            chunkIndex: 0,
            content: 'Client confirmed the appointment for Friday afternoon and asked for prep materials.',
            embeddingF8: [1, 0],
            meta: { test: true }
          },
          {
            id: `${tenantId}:${entityType}:${entityId}:1`,
            tenantId,
            entityType,
            entityId,
            chunkIndex: 1,
            content: 'Logged a quick call to discuss weekend plans—nothing actionable.',
            embeddingF8: [0.5, 0.5],
            meta: { test: true }
          },
          {
            id: `${tenantId}:${entityType}:${entityId}:2`,
            tenantId,
            entityType,
            entityId,
            chunkIndex: 2,
            content: 'Lead mentioned interest in a second showing downtown next week.',
            embeddingF8: [0, 1],
            meta: { test: true }
          }
        ])
      }
    } as unknown as typeof prisma;

    embeddings = {
      embed: jest.fn().mockResolvedValue([[1, 0]])
    } as unknown as jest.Mocked<EmbeddingsService>;

    service = new SemanticSearchService(prisma as unknown as PrismaService, embeddings);
  });

  it('returns cosine-ranked snippets scoped to tenant/entity', async () => {
    jest.spyOn<any, any>(service as any, 'isVectorTypeMissing').mockReturnValue(true);

    const results = await service.search({
      tenantId,
      query: 'When is the appointment scheduled?',
      entityType,
      entityId,
      limit: 2
    });

    expect(embeddings.embed).toHaveBeenCalledWith(
      ['When is the appointment scheduled?'],
      expect.objectContaining({ tenantId })
    );
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.vectorChunk.findMany).toHaveBeenCalledWith({
      where: {
        tenantId,
        entityType,
        entityId
      },
      take: expect.any(Number)
    });

    expect(results).toHaveLength(2);
    expect(results[0].content).toContain('appointment');
    expect(results[0].score).toBeGreaterThanOrEqual(results[1].score);
  });
});
