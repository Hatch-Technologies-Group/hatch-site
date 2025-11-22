import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { BatchService } from './batch.service';

@Injectable()
export class BatchCron {
  private readonly logger = new Logger(BatchCron.name);

  constructor(private readonly batchService: BatchService) {}

  @Cron('*/30 * * * *', { timeZone: 'UTC' })
  async syncEvents() {
    try {
      const result = await this.batchService.syncEvents();
      this.logger.log(
        `Batch cron sync completed: ${result.totalImported} event(s) upserted across ${result.pagesProcessed} page(s)`
      );
    } catch (error) {
      this.logger.error(
        `Batch cron sync failed: ${error instanceof Error ? error.message : error}`
      );
    }
  }
}
