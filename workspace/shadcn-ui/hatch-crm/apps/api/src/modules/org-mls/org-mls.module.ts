import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { OrgMlsController } from './org-mls.controller';
import { OrgMlsService } from './org-mls.service';

@Module({
  imports: [PrismaModule, OrgEventsModule],
  controllers: [OrgMlsController],
  providers: [OrgMlsService],
  exports: [OrgMlsService]
})
export class OrgMlsModule {}
