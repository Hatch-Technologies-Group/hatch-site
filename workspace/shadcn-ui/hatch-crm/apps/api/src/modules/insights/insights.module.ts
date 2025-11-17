import { Module } from '@nestjs/common';

import { InsightsController } from './insights.controller';
import { LegacyTenantInsightsController } from './legacy-insights.controller';
import { InsightsService } from './insights.service';
import { InsightsRefreshListener } from './insights.refresh.listener';
import { InsightsRefreshScheduler } from './insights.refresh.scheduler';
import { InsightsRefreshQueueMonitor } from './insights.refresh.monitor';

@Module({
  controllers: [InsightsController, LegacyTenantInsightsController],
  providers: [InsightsService, InsightsRefreshListener, InsightsRefreshScheduler, InsightsRefreshQueueMonitor]
})
export class InsightsModule {}
