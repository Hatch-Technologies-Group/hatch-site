import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';

import { SharedPrismaModule } from '@/modules/shared-prisma';
import { BatchClient } from './batch.client';
import { BatchController } from './batch.controller';
import { BatchCron } from './batch.cron';
import { BatchService } from './batch.service';

@Module({
  imports: [SharedPrismaModule, ScheduleModule.forRoot()],
  controllers: [BatchController],
  providers: [BatchClient, BatchService, BatchCron],
  exports: [BatchService]
})
export class BatchModule {}
