import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { JobsOptions, Queue } from 'bullmq';

export const OUTREACH_SEQUENCER_QUEUE = 'outreach-sequencer';

export type OutreachSequencerJob = {
  tenantId: string;
  leadId: string;
};

@Injectable()
export class OutreachProducer {
  constructor(
    @InjectQueue(OUTREACH_SEQUENCER_QUEUE) private readonly queue: Queue<OutreachSequencerJob>
  ) {}

  async enqueueDraft(tenantId: string, leadId: string) {
    const options: JobsOptions = {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2_000 },
      removeOnComplete: 1000,
      removeOnFail: 1000
    };

    await this.queue.add('draft-next-step', { tenantId, leadId }, options);
  }
}
