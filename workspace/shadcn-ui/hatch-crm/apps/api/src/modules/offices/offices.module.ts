import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { PermissionsModule } from '@/modules/permissions/permissions.module'
import { OfficesController } from './offices.controller'
import { OfficesService } from './offices.service'

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [OfficesController],
  providers: [OfficesService],
  exports: [OfficesService]
})
export class OfficesModule {}
