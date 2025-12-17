import { Injectable, Logger } from '@nestjs/common'
import { Cron } from '@nestjs/schedule'

import { PresenceService } from './presence.service'

@Injectable()
export class PresenceCron {
  private readonly logger = new Logger(PresenceCron.name)

  constructor(private readonly presence: PresenceService) {}

  @Cron('*/1 * * * *', { timeZone: 'UTC' })
  async cleanupStale() {
    try {
      await this.presence.cleanupStale()
    } catch (error) {
      this.logger.error(
        `Presence cleanup failed: ${error instanceof Error ? error.message : error}`
      )
    }
  }
}

