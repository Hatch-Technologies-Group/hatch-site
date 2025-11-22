import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module'
import { PlaybooksModule } from '@/modules/playbooks/playbooks.module'
import { LeadScoringService } from './lead-scoring.service'
import { LeadScoringController } from './lead-scoring.controller'

@Module({
  imports: [PrismaModule, AiEmployeesModule, PlaybooksModule],
  providers: [LeadScoringService],
  controllers: [LeadScoringController],
  exports: [LeadScoringService]
})
export class LeadScoringModule {}
