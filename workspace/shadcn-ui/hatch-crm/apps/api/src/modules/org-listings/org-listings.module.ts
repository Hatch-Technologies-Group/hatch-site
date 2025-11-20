import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgListingsController } from './org-listings.controller';
import { OrgListingsService } from './org-listings.service';

@Module({
  imports: [PrismaModule],
  controllers: [OrgListingsController],
  providers: [OrgListingsService],
  exports: [OrgListingsService]
})
export class OrgListingsModule {}
