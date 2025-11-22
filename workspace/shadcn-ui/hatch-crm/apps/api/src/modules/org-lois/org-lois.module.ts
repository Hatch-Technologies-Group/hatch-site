import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { OrgLoisService } from './org-lois.service';
import { OrgLoisController } from './org-lois.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, OrgEventsModule, NotificationsModule],
  controllers: [OrgLoisController],
  providers: [OrgLoisService],
  exports: [OrgLoisService]
})
export class OrgLoisModule {}
