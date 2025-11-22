import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { AiModule } from '../ai/ai.module';
import { AiBrokerModule } from '../ai-broker/ai-broker.module';
import { AiEmployeesModule } from '../ai-employees/ai-employees.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { MailModule } from '../mail/mail.module';
import { AiCopilotService } from './ai-copilot.service';
import { AiCopilotController } from './ai-copilot.controller';

@Module({
  imports: [PrismaModule, AiModule, AiBrokerModule, AiEmployeesModule, NotificationsModule, MailModule],
  controllers: [AiCopilotController],
  providers: [AiCopilotService],
  exports: [AiCopilotService]
})
export class AiCopilotModule {}
