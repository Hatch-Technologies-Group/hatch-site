import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgCommsService } from './org-comms.service';
import { OrgCommsController } from './org-comms.controller';

@Module({
  imports: [PrismaModule],
  providers: [OrgCommsService],
  controllers: [OrgCommsController],
  exports: [OrgCommsService]
})
export class OrgCommsModule {}

