import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

import { OutreachService } from './outreach.service';
import { OUTREACH_SEQUENCER_QUEUE, OutreachSequencerJob } from './outreach.queue';

@Injectable()
@Processor(OUTREACH_SEQUENCER_QUEUE)
export class OutreachSequencerProcessor extends WorkerHost {
  private readonly log = new Logger(OutreachSequencerProcessor.name);

  constructor(private readonly outreach: OutreachService) {
    super();
  }

  async process(job: Job<OutreachSequencerJob>) {
    const { tenantId, leadId } = job.data;
    try {
      const draft = await this.outreach.draftNextStepForLead(tenantId, leadId);
      this.log.log(`Drafted outreach email ${draft.id} for lead=${leadId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown outreach error';
      this.log.warn(`Failed to draft outreach email for lead=${leadId}: ${message}`);
      throw error;
    }
  }
}
