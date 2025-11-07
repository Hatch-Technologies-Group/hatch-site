import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AnalyticsListeners {
  private readonly logger = new Logger('Analytics');

  @OnEvent('pipeline.published')
  onPipelinePublished(payload: Record<string, unknown>) {
    this.logger.log(`pipeline.published ${JSON.stringify(payload)}`);
  }

  @OnEvent('consumerPortal.config.saved')
  onConsumerConfigSaved(payload: Record<string, unknown>) {
    this.logger.log(`consumerPortal.config.saved ${JSON.stringify(payload)}`);
  }

  @OnEvent('pipeline.migration.run')
  onMigrationRun(payload: Record<string, unknown>) {
    this.logger.log(`pipeline.migration.run ${JSON.stringify(payload)}`);
  }

  @OnEvent('pipeline.migration.failed')
  onMigrationFailed(payload: Record<string, unknown>) {
    this.logger.error(`pipeline.migration.failed ${JSON.stringify(payload)}`);
  }
}
