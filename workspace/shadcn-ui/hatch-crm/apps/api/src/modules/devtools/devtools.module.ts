import { Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module'
import { NotificationsModule } from '@/modules/notifications/notifications.module'
import { OrgAccountingModule } from '@/modules/org-accounting/org-accounting.module'
import { OrgMlsModule } from '@/modules/org-mls/org-mls.module'
import { DevtoolsController } from './devtools.controller'
import { SeedService } from './seed.service'
import { StressService } from './stress.service'
import { ChaosService } from './chaos.service'
import { ChaosInterceptor } from '@/middleware/chaos.interceptor'

@Module({
  imports: [PrismaModule, AiEmployeesModule, NotificationsModule, OrgAccountingModule, OrgMlsModule],
  controllers: [DevtoolsController],
  providers: [
    SeedService,
    StressService,
    ChaosService,
    {
      provide: APP_INTERCEPTOR,
      useClass: ChaosInterceptor
    }
  ]
})
export class DevtoolsModule {}
