import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { EmbeddingsService } from '@/modules/ai/embeddings.service';

import { PrismaModule } from '../prisma/prisma.module';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SemanticSearchController } from './semantic.controller';
import { SemanticSearchService } from './semantic.service';
import { IngestService } from './ingest.service';
import { INDEXER_QUEUE, IndexerProcessor, IndexerProducer } from './indexer.queue';
import { IndexController } from './index.controller';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: INDEXER_QUEUE
    })
  ],
  controllers: [SearchController, SemanticSearchController, IndexController],
  providers: [
    SearchService,
    SemanticSearchService,
    EmbeddingsService,
    IngestService,
    IndexerProducer,
    IndexerProcessor
  ],
  exports: [SemanticSearchService, IngestService, IndexerProducer]
})
export class SearchModule {}
