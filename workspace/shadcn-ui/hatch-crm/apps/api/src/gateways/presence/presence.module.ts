import { Module } from '@nestjs/common'
import { PresenceGateway } from './presence.gateway'
import { PresenceService } from './presence.service'
import { PrismaModule } from '@/modules/prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  providers: [PresenceGateway, PresenceService],
  exports: [PresenceService]
})
export class PresenceModule {}
