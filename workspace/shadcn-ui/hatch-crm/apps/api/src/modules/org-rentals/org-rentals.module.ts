import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { OrgRentalsService } from './org-rentals.service';
import { OrgRentalsController } from './org-rentals.controller';

@Module({
  imports: [PrismaModule, OrgEventsModule],
  controllers: [OrgRentalsController],
  providers: [OrgRentalsService],
  exports: [OrgRentalsService]
})
export class OrgRentalsModule {}
