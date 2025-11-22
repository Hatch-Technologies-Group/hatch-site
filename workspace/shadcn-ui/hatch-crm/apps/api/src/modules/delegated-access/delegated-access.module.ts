import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { PermissionsModule } from '@/modules/permissions/permissions.module'
import { DelegatedAccessController } from './delegated-access.controller'
import { DelegatedAccessService } from './delegated-access.service'

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [DelegatedAccessController],
  providers: [DelegatedAccessService]
})
export class DelegatedAccessModule {}
