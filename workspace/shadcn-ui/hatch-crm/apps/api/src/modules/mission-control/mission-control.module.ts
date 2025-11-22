import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MissionControlService } from './mission-control.service';
import { MissionControlController } from './mission-control.controller';
import { PresenceModule } from '@/gateways/presence/presence.module';

@Module({
  imports: [PrismaModule, PresenceModule],
  providers: [MissionControlService],
  controllers: [MissionControlController]
})
export class MissionControlModule {}
