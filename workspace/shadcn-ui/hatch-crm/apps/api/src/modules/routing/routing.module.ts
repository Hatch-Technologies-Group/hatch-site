import { Module } from '@nestjs/common';

import { AiModule } from '../ai/ai.module';
import { OutboxModule } from '../outbox/outbox.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RoutingController } from './routing.controller';
import { RoutingAiService } from './routing-ai.service';
import { RoutingService } from './routing.service';

@Module({
  imports: [PrismaModule, OutboxModule, AiModule],
  controllers: [RoutingController],
  providers: [RoutingService, RoutingAiService],
  exports: [RoutingService]
})
export class RoutingModule {}
