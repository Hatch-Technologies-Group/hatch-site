import { Module } from '@nestjs/common';

import { ViewsController } from './views.controller';
import { ViewsService } from './views.service';
import { PrismaService } from '@/shared/prisma.service';
import { AuditModule } from '@/modules/audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [ViewsController],
  providers: [ViewsService, PrismaService],
  exports: [ViewsService]
})
export class ViewsModule {}
