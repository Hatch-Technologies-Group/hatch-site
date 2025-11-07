import { Module } from '@nestjs/common';

import { ConsumerPortalController } from './consumer-portal.controller';
import { ConsumerPortalService } from './consumer-portal.service';
import { PrismaService } from '@/shared/prisma.service';
import { AuditModule } from '@/modules/audit/audit.module';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';

@Module({
  imports: [AuditModule, AnalyticsModule],
  controllers: [ConsumerPortalController],
  providers: [ConsumerPortalService, PrismaService],
  exports: [ConsumerPortalService]
})
export class ConsumerPortalModule {}
