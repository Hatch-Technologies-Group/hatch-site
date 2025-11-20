import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { OrgTransactionsModule } from '../org-transactions/org-transactions.module';
import { OrgRentalsModule } from '../org-rentals/org-rentals.module';
import { IntegrationService } from '../integration/integration.service';
import { OrgAccountingController } from './org-accounting.controller';
import { OrgAccountingService } from './org-accounting.service';

@Module({
  imports: [PrismaModule, OrgEventsModule, OrgTransactionsModule, OrgRentalsModule],
  controllers: [OrgAccountingController],
  providers: [OrgAccountingService, IntegrationService],
  exports: [OrgAccountingService, IntegrationService]
})
export class OrgAccountingModule {}
