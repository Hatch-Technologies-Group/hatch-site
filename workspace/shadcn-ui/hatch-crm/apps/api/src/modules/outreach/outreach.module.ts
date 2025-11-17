import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { SearchModule } from '../search/search.module';
import { OutreachController } from './outreach.controller';
import { OutreachAIService } from './outreach.ai.service';
import { OutreachService } from './outreach.service';
import { OUTREACH_SEQUENCER_QUEUE, OutreachProducer } from './outreach.queue';
import { OutreachSequencerProcessor } from './outreach.sequencer';

@Module({
  imports: [
    PrismaModule,
    SearchModule,
    BullModule.registerQueue({
      name: OUTREACH_SEQUENCER_QUEUE
    })
  ],
  controllers: [OutreachController],
  providers: [OutreachAIService, OutreachService, OutreachProducer, OutreachSequencerProcessor],
  exports: [OutreachService, OutreachProducer]
})
export class OutreachModule {}
