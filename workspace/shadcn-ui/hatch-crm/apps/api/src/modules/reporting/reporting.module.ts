import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ReportingController } from './reporting.controller';
import { ReportingMetricsController } from './reporting-metrics.controller';
import { ReportingService } from './reporting.service';
import { AggregatorService } from './jobs/aggregator.service';

@Module({
  imports: [PrismaModule],
  controllers: [ReportingController, ReportingMetricsController],
  providers: [ReportingService, AggregatorService],
  exports: [ReportingService]
})
export class ReportingModule {}
