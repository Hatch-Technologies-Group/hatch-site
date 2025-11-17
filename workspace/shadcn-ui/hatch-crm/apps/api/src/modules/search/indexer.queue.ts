import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';

import { IngestService } from './ingest.service';

export const INDEXER_QUEUE = 'rag-indexer';

type IndexPayload = { tenantId: string; entityType: 'client' | 'lead'; entityId: string };

@Injectable()
export class IndexerProducer {
  constructor(@InjectQueue(INDEXER_QUEUE) private readonly queue: Queue) {}

  enqueue(payload: IndexPayload) {
    return this.queue.add('index-entity', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    });
  }
}

@Processor(INDEXER_QUEUE)
export class IndexerProcessor extends WorkerHost {
  private readonly logger = new Logger(IndexerProcessor.name);

  constructor(private readonly ingest: IngestService) {
    super();
  }

  async process(job: Job<IndexPayload>) {
    const result = await this.ingest.indexEntity(job.data);
    this.logger.log(
      `Indexed ${result.inserted} chunks for ${job.data.tenantId}:${job.data.entityType}:${job.data.entityId}`
    );
  }
}
