import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsAiModule } from '../documents-ai/documents-ai.module';
import { PlaybooksModule } from '../playbooks/playbooks.module';
import { OrgListingsController } from './org-listings.controller';
import { OrgListingsService } from './org-listings.service';

@Module({
  imports: [PrismaModule, DocumentsAiModule, PlaybooksModule],
  controllers: [OrgListingsController],
  providers: [OrgListingsService],
  exports: [OrgListingsService]
})
export class OrgListingsModule {}
