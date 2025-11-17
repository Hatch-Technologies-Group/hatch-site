import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { LeadScoringService } from './scoring.service';

export const LEAD_SCORING_QUEUE = 'lead-scoring';

@Injectable()
export class LeadScoringProducer {
  constructor(@InjectQueue(LEAD_SCORING_QUEUE) private readonly queue: Queue<{ tenantId: string; leadId: string }>) {}

  async enqueue(tenantId: string, leadId: string) {
    await this.queue.add(
      'recalc',
      { tenantId, leadId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: 500,
        removeOnFail: 200
      }
    );
  }
}

@Processor(LEAD_SCORING_QUEUE)
export class LeadScoringProcessor extends WorkerHost {
  private readonly logger = new Logger(LeadScoringProcessor.name);

  constructor(private readonly scoring: LeadScoringService) {
    super();
  }

  async process(job: Job<{ tenantId: string; leadId: string }>) {
    const { tenantId, leadId } = job.data;
    const result = await this.scoring.scoreLead(tenantId, leadId);
    this.logger.log(`Lead ${leadId} scored v2 = ${Math.round(result.score)}`);
  }
}
