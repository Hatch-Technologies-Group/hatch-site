import { Module } from '@nestjs/common';

import { AnalyticsService } from './analytics.service';
import { AnalyticsListeners } from './analytics.listeners';
import { AnalyticsController } from './analytics.controller';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService, AnalyticsListeners],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}
