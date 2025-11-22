import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { PermissionsModule } from '@/modules/permissions/permissions.module'
import { TeamsController } from './teams.controller'
import { TeamsService } from './teams.service'

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [TeamsController],
  providers: [TeamsService]
})
export class TeamsModule {}
