import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module'
import { PlaybooksModule } from '@/modules/playbooks/playbooks.module'
import { AuditModule } from '@/modules/audit/audit.module'
import { TransactionCoordinatorService } from './transaction-coordinator.service'
import { TransactionCoordinatorController } from './transaction-coordinator.controller'

@Module({
  imports: [PrismaModule, AiEmployeesModule, PlaybooksModule, AuditModule],
  providers: [TransactionCoordinatorService],
  controllers: [TransactionCoordinatorController],
  exports: [TransactionCoordinatorService]
})
export class TransactionCoordinatorModule {}
