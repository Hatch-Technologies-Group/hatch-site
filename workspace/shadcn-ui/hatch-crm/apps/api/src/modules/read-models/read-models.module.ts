import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { OrgAdminGuard } from '../common/org-admin.guard';
import { ContactsModule } from '../contacts/contacts.module';
import { ReadModelsController } from './read-models.controller';
import { ReadModelsCron } from './read-models.cron';

@Module({
  imports: [ScheduleModule.forRoot(), ContactsModule],
  controllers: [ReadModelsController],
  providers: [ReadModelsCron, OrgAdminGuard]
})
export class ReadModelsModule {}
