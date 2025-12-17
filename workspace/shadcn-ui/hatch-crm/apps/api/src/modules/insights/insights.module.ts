import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { InsightsService } from './insights.service';
import { InsightsController } from './insights.controller';

@Module({
  imports: [PrismaModule],
  providers: [InsightsService],
  controllers: [InsightsController],
  exports: [InsightsService]
})
export class InsightsModule {}
