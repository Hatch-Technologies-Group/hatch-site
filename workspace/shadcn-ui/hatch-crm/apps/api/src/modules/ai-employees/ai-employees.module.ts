import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

import { AiModule } from '@/modules/ai/ai.module';
import { OrgAdminGuard } from '@/modules/common';
import { LeadsModule } from '@/modules/leads/leads.module';
import { MessagesModule } from '@/modules/messages/messages.module';
import { PrismaModule } from '@/modules/prisma/prisma.module';
import { AiEmployeesController } from './ai-employees.controller';
import { AiEmployeesProcessor } from './ai-employees.processor';
import { AiEmployeesService } from './ai-employees.service';
import { AiEmployeeToolRegistrar } from './ai-employee.tools';
import { AiToolRegistry } from './ai-tool.registry';
import { AI_EMPLOYEES_QUEUE } from './ai-employees.queue';
import { AiEmployeesProducer } from './ai-employees.producer';
import { AiEmployeesScheduler } from './ai-employees.scheduler';

@Module({
  imports: [
    PrismaModule,
    AiModule,
    forwardRef(() => LeadsModule),
    MessagesModule,
    BullModule.registerQueue({
      name: AI_EMPLOYEES_QUEUE
    })
  ],
  controllers: [AiEmployeesController],
  providers: [
    AiEmployeesService,
    AiToolRegistry,
    AiEmployeeToolRegistrar,
    AiEmployeesProcessor,
    AiEmployeesProducer,
    AiEmployeesScheduler,
    OrgAdminGuard
  ],
  exports: [AiEmployeesService, AiEmployeesProducer, AiToolRegistry]
})
export class AiEmployeesModule {}
