import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AiBrokerModule } from '../ai-broker/ai-broker.module';
import { AiCopilotService } from './ai-copilot.service';
import { AiCopilotController } from './ai-copilot.controller';

@Module({
  imports: [PrismaModule, AiModule, AiBrokerModule],
  controllers: [AiCopilotController],
  providers: [AiCopilotService],
  exports: [AiCopilotService]
})
export class AiCopilotModule {}
