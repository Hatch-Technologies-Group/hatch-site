import { Module } from '@nestjs/common';

import { OrgVaultModule } from '@/modules/org-vault/org-vault.module';
import { DocumentsAiModule } from '@/modules/documents-ai/documents-ai.module';
import { S3Service } from '@/modules/storage/s3.service';
import { IngestionController } from './ingestion.controller';
import { IngestionService } from './ingestion.service';

@Module({
  imports: [OrgVaultModule, DocumentsAiModule],
  providers: [S3Service, IngestionService],
  controllers: [IngestionController],
  exports: [IngestionService]
})
export class IngestionModule {}
