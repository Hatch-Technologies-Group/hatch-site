import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { PermissionsService } from './permissions.service'

@Module({
  imports: [PrismaModule],
  providers: [PermissionsService],
  exports: [PermissionsService]
})
export class PermissionsModule {}
