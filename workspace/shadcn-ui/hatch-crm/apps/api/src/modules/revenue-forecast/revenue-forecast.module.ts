import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module'
import { RevenueForecastService } from './revenue-forecast.service'
import { RevenueForecastController } from './revenue-forecast.controller'

@Module({
  imports: [PrismaModule, AiEmployeesModule],
  providers: [RevenueForecastService],
  controllers: [RevenueForecastController],
  exports: [RevenueForecastService]
})
export class RevenueForecastModule {}
