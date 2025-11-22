import { Injectable, Logger } from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { EmbeddingsService } from '@/modules/ai/embeddings.service';

interface VectorInput {
  organizationId: string;
  entityType: string;
  entityId: string;
  content: string;
}

@Injectable()
export class SearchVectorService {
  private readonly logger = new Logger(SearchVectorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingsService
  ) {}

  async index(input: VectorInput) {
    const content = input.content?.trim();
    if (!content) {
      return null;
    }
    try {
      const [vector] = await this.embeddings.embed([content], { tenantId: input.organizationId });
      await this.prisma.searchVector.upsert({
        where: {
          organizationId_entityType_entityId: {
            organizationId: input.organizationId,
            entityType: input.entityType,
            entityId: input.entityId
          }
        },
        update: {
          content,
          embedding: vector as any
        },
        create: {
          organizationId: input.organizationId,
          entityType: input.entityType,
          entityId: input.entityId,
          content,
          embedding: vector as any
        }
      });
      return true;
    } catch (error) {
      this.logger.warn(`Search indexing failed for ${input.entityType}:${input.entityId}: ${(error as Error).message}`);
      return false;
    }
  }

  async remove(organizationId: string, entityType: string, entityId: string) {
    await this.prisma.searchVector.deleteMany({
      where: { organizationId, entityType, entityId }
    });
  }
}
