import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsService } from './org-events.service';
import { OrgEventsController } from './org-events.controller';

@Module({
  imports: [PrismaModule],
  providers: [OrgEventsService],
  controllers: [OrgEventsController],
  exports: [OrgEventsService]
})
export class OrgEventsModule {}

