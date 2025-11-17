import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';

import { AI_EMPLOYEE_JOBS, AI_EMPLOYEES_QUEUE } from './ai-employees.queue';

interface BaseJobPayload extends Record<string, unknown> {
  tenantId: string;
  orgId?: string | null;
}

@Injectable()
export class AiEmployeesProducer {
  private readonly log = new Logger(AiEmployeesProducer.name);

  constructor(@InjectQueue(AI_EMPLOYEES_QUEUE) private readonly queue: Queue) {}

  async enqueueLeadNurseNewLead(payload: BaseJobPayload & { leadId: string }) {
    await this.addJob(AI_EMPLOYEE_JOBS.LEAD_NURSE_NEW_LEAD, payload, `lead:${payload.leadId}`);
  }

  async enqueueListingConciergeNewListing(payload: BaseJobPayload & { listingId: string }) {
    await this.addJob(
      AI_EMPLOYEE_JOBS.LISTING_CONCIERGE_NEW_LISTING,
      payload,
      `listing:${payload.listingId}:${Date.now()}`
    );
  }

  async enqueueTransactionMilestone(payload: BaseJobPayload & { transactionId: string; milestoneName: string; completed?: boolean }) {
    await this.addJob(
      AI_EMPLOYEE_JOBS.TRANSACTION_COORDINATOR_MILESTONE,
      payload,
      `transaction:${payload.transactionId}:${payload.milestoneName}:${Date.now()}`
    );
  }

  async enqueueAgentCopilotDailySummary(payload: { tenantId?: string }) {
    await this.addJob(
      AI_EMPLOYEE_JOBS.AGENT_COPILOT_DAILY_SUMMARY,
      payload,
      payload.tenantId ? `agent_copilot:${payload.tenantId}:${Date.now()}` : undefined
    );
  }

  private async addJob<T extends Record<string, unknown>>(name: string, data: T, dedupeKey?: string) {
    try {
      await this.queue.add(name, data, {
        jobId: dedupeKey,
        removeOnComplete: true,
        removeOnFail: { age: 60 * 60 },
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1500
        }
      });
    } catch (error) {
      this.log.warn(`Failed to enqueue ${name}: ${(error as Error).message}`);
    }
  }
}
