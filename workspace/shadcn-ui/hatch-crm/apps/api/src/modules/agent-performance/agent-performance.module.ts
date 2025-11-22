import { Module } from '@nestjs/common';
import { AgentPerformanceService } from './agent-performance.service';
import { AgentPerformanceController } from './agent-performance.controller';
import { PrismaService } from '@/modules/prisma/prisma.service';
import { MissionControlModule } from '@/modules/mission-control/mission-control.module';
import { SearchModule } from '@/modules/search/search.module';

@Module({
  imports: [MissionControlModule, SearchModule],
  providers: [PrismaService, AgentPerformanceService],
  controllers: [AgentPerformanceController],
  exports: [AgentPerformanceService],
})
export class AgentPerformanceModule {}
