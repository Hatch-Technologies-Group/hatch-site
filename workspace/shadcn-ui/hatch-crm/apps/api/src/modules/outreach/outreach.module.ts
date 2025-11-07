import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ScheduleModule } from '@nestjs/schedule';

import { PrismaService } from '@/shared/prisma.service';
import { EmailService } from '@/lib/email/email.service';
import { OutreachQueueService, OUTREACH_QUEUE_NAME } from './outreach.queue';
import { OutreachProcessor } from './outreach.processor';
import { OutreachCron } from './outreach.cron';
import { OutreachController } from './outreach.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: OUTREACH_QUEUE_NAME
    }),
    ScheduleModule.forRoot()
  ],
  controllers: [OutreachController],
  providers: [
    PrismaService,
    EmailService,
    OutreachQueueService,
    OutreachProcessor,
    OutreachCron
  ]
})
export class OutreachModule {}
