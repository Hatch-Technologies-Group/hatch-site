import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { OrgTransactionsModule } from '../org-transactions/org-transactions.module';
import { OrgRentalsModule } from '../org-rentals/org-rentals.module';
import { IntegrationService } from '../integration/integration.service';
import { OrgAccountingController } from './org-accounting.controller';
import { OrgAccountingService } from './org-accounting.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { AuditModule } from '../audit/audit.module';
import { PlaybooksModule } from '../playbooks/playbooks.module';

@Module({
  imports: [PrismaModule, OrgEventsModule, OrgTransactionsModule, OrgRentalsModule, NotificationsModule, MailModule, AuditModule, PlaybooksModule],
  controllers: [OrgAccountingController],
  providers: [OrgAccountingService, IntegrationService],
  exports: [OrgAccountingService, IntegrationService]
})
export class OrgAccountingModule {}
