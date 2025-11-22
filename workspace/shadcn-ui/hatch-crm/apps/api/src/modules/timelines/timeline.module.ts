import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module'
import { TimelineService } from './timeline.service'
import { TimelineController } from './timeline.controller'

@Module({
  imports: [PrismaModule, AiEmployeesModule],
  controllers: [TimelineController],
  providers: [TimelineService],
  exports: [TimelineService]
})
export class TimelineModule {}
