import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { AuditModule } from '../audit/audit.module';
import { PlaybooksModule } from '../playbooks/playbooks.module';
import { OrgMlsController } from './org-mls.controller';
import { OrgMlsService } from './org-mls.service';
import { OrgMlsSyncService } from './org-mls-sync.service';

@Module({
  imports: [PrismaModule, OrgEventsModule, AuditModule, PlaybooksModule],
  controllers: [OrgMlsController],
  providers: [OrgMlsService, OrgMlsSyncService],
  exports: [OrgMlsService, OrgMlsSyncService]
})
export class OrgMlsModule {}
