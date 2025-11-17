import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue, RepeatOptions } from 'bullmq';

import { AI_EMPLOYEE_JOBS, AI_EMPLOYEES_QUEUE } from './ai-employees.queue';

@Injectable()
export class AiEmployeesScheduler implements OnModuleInit {
  private readonly log = new Logger(AiEmployeesScheduler.name);

  constructor(@InjectQueue(AI_EMPLOYEES_QUEUE) private readonly queue: Queue) {}

  async onModuleInit() {
    await this.ensureAgentCopilotDailyJob();
  }

  private async ensureAgentCopilotDailyJob() {
    const cron = process.env.AI_EMPLOYEE_AGENT_COPILOT_CRON ?? '0 11 * * *'; // 11:00 UTC (~7am ET)
    const timezone = process.env.AI_EMPLOYEE_TIMEZONE ?? 'UTC';
    const existing = await this.queue.getRepeatableJobs();
    const existingJob = existing.find((job) => job.name === AI_EMPLOYEE_JOBS.AGENT_COPILOT_DAILY_SUMMARY);

    const repeat: RepeatOptions = { pattern: cron, tz: timezone, immediately: false };

    if (existingJob) {
      if (existingJob.pattern === cron && existingJob.tz === timezone) {
        return;
      }
      await this.queue.removeRepeatableByKey(existingJob.key);
    }

    try {
      await this.queue.add(
        AI_EMPLOYEE_JOBS.AGENT_COPILOT_DAILY_SUMMARY,
        {},
        {
          jobId: 'agent_copilot_daily_summary',
          repeat,
          removeOnComplete: true,
          removeOnFail: { age: 6 * 60 * 60 }
        }
      );
      this.log.log(`Scheduled Agent Copilot daily summary cron ${cron} (${timezone})`);
    } catch (error) {
      this.log.error('Failed to schedule agent copilot summary', error as Error);
    }
  }
}
