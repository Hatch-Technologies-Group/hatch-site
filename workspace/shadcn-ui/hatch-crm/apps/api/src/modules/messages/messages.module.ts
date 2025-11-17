import { Module } from '@nestjs/common';

import { ComplianceModule } from '../compliance/compliance.module';
import { OutboxModule } from '../outbox/outbox.module';
import { RoutingModule } from '../routing/routing.module';
import { SearchModule } from '../search/search.module';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [ComplianceModule, OutboxModule, RoutingModule, SearchModule],
  controllers: [MessagesController],
  providers: [MessagesService],
  exports: [MessagesService]
})
export class MessagesModule {}
