import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { PrismaService } from '@/shared/prisma.service';
import { AuditModule } from '@/modules/audit/audit.module';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';
import { PipelinesController } from './pipelines.controller';
import { PipelinesService } from './pipelines.service';
import { PipelineMigrationProcessor } from './jobs/pipeline-migration.processor';
import { PipelineBoardController } from './pipeline-board.controller';
import { PipelineBoardService } from './pipeline-board.service';
import { PipelineDesignerController } from './pipeline-designer.controller';
import { PipelineDesignerService } from './pipeline-designer.service';

@Module({
  imports: [
    AuditModule,
    AnalyticsModule,
    BullModule.registerQueue({
      name: 'pipeline-migrations'
    })
  ],
  controllers: [PipelinesController, PipelineBoardController, PipelineDesignerController],
  providers: [
    PipelinesService,
    PipelineBoardService,
    PipelineDesignerService,
    PrismaService,
    PipelineMigrationProcessor
  ],
  exports: [PipelinesService, PipelineDesignerService]
})
export class PipelinesModule {}
