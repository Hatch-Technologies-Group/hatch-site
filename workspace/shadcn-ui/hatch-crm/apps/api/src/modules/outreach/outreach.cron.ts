import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

import { OutreachQueueService } from './outreach.queue';

@Injectable()
export class OutreachCron {
  private readonly log = new Logger(OutreachCron.name);

  constructor(private readonly queueService: OutreachQueueService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    try {
      await this.queueService.scheduleDueEnrollments();
    } catch (error) {
      if (error instanceof Error) {
        this.log.error('Failed to schedule outreach enrollments', error.stack);
      } else {
        this.log.error(`Failed to schedule outreach enrollments: ${String(error)}`);
      }
    }
  }
}
