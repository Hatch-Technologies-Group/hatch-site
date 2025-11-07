import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { AnalyticsService } from './analytics.service';
import { AnalyticsListeners } from './analytics.listeners';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [AnalyticsService, AnalyticsListeners],
  exports: [AnalyticsService]
})
export class AnalyticsModule {}
