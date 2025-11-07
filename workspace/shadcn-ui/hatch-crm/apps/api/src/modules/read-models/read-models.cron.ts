import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ContactReadModelService } from '../contacts/read-model.service';

@Injectable()
export class ReadModelsCron {
  private readonly log = new Logger(ReadModelsCron.name);

  constructor(private readonly clv: ContactReadModelService) {}

  @Cron('0 3 * * *', { timeZone: 'UTC' })
  async nightly(): Promise<void> {
    try {
      this.log.log('Refreshing contact_list_view at 03:00 UTC');
      await this.clv.refresh();
      this.log.log('Contact read model refreshed successfully');
    } catch (error) {
      this.log.error('Nightly contact read-model refresh failed', error as Error);
    }
  }
}
