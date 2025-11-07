import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactReadModelService {
  private readonly logger = new Logger(ContactReadModelService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Refreshes the contact_list_view materialized view.
   * Runs concurrently by default and falls back to a blocking refresh when concurrent refresh fails.
   */
  async refresh(concurrent = true): Promise<void> {
    const statement = concurrent
      ? Prisma.sql`REFRESH MATERIALIZED VIEW CONCURRENTLY contact_list_view`
      : Prisma.sql`REFRESH MATERIALIZED VIEW contact_list_view`;

    try {
      await this.prisma.$executeRaw(statement);
    } catch (error) {
      if (concurrent && this.shouldRetryWithoutConcurrency(error)) {
        this.logger.warn('Concurrent refresh failed; retrying without concurrency');
        await this.refresh(false);
        return;
      }
      throw error;
    }
  }

  /**
   * Fire-and-forget refresh so that writes do not block on view maintenance.
   */
  refreshInBackground(): void {
    void this.refresh().catch((error) => {
      this.logger.error('Failed to refresh contact_list_view materialized view', error as Error);
    });
  }

  private shouldRetryWithoutConcurrency(error: unknown): boolean {
    if (typeof error !== 'object' || !error) {
      return false;
    }

    const code = (error as { code?: string }).code;
    // 55000: concurrent refresh is not allowed (typically no unique index)
    // 55P02: concurrent refresh detected deadlock
    return code === '55000' || code === '55P02';
  }
}
