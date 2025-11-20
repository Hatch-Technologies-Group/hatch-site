import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { MissionControlService } from './mission-control.service';
import { MissionControlController } from './mission-control.controller';

@Module({
  imports: [PrismaModule],
  providers: [MissionControlService],
  controllers: [MissionControlController]
})
export class MissionControlModule {}

