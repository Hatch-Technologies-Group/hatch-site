import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { OrgVaultService } from './org-vault.service';
import { OrgVaultController } from './org-vault.controller';

@Module({
  imports: [PrismaModule, OrgEventsModule],
  providers: [OrgVaultService],
  controllers: [OrgVaultController],
  exports: [OrgVaultService]
})
export class OrgVaultModule {}

