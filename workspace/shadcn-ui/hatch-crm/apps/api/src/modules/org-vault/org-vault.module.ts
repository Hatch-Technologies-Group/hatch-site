import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { OrgEventsModule } from '../org-events/org-events.module';
import { DocumentsAiModule } from '../documents-ai/documents-ai.module';
import { SearchModule } from '../search/search.module';
import { OrgVaultService } from './org-vault.service';
import { OrgVaultController } from './org-vault.controller';

@Module({
  imports: [PrismaModule, OrgEventsModule, DocumentsAiModule, SearchModule],
  providers: [OrgVaultService],
  controllers: [OrgVaultController],
  exports: [OrgVaultService]
})
export class OrgVaultModule {}
