import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PipelinesModule } from '../pipelines/pipelines.module';
import { PlatformModule } from '../../platform/platform.module';
import { SearchModule } from '../search/search.module';
import { AiEmployeesModule } from '../ai-employees/ai-employees.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';
import { LeadScoringService } from './scoring.service';
import { LEAD_SCORING_QUEUE, LeadScoringProcessor, LeadScoringProducer } from './lead-scoring.queue';

@Module({
  imports: [
    forwardRef(() => AiEmployeesModule),
    NotificationsModule,
    PipelinesModule,
    PlatformModule,
    SearchModule,
    BullModule.registerQueue({
      name: LEAD_SCORING_QUEUE
    })
  ],
  controllers: [LeadsController],
  providers: [LeadsService, LeadScoringService, LeadScoringProducer, LeadScoringProcessor],
  exports: [LeadsService]
})
export class LeadsModule {}
