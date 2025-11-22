import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { PlaybooksModule } from '../playbooks/playbooks.module';
import { OrgLeadsService } from './org-leads.service';
import { OrgLeadsController } from './org-leads.controller';

@Module({
  imports: [PrismaModule, OrgEventsModule, PlaybooksModule],
  controllers: [OrgLeadsController],
  providers: [OrgLeadsService],
  exports: [OrgLeadsService]
})
export class OrgLeadsModule {}
