import { Module } from '@nestjs/common';

import { PrismaModule } from '@/modules/prisma/prisma.module';
import { AiEmployeesModule } from '@/modules/ai-employees/ai-employees.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { OrgEventsModule } from '@/modules/org-events/org-events.module';
import { PlaybooksModule } from '@/modules/playbooks/playbooks.module';
import { SearchModule } from '@/modules/search/search.module';
import { S3Service } from '@/modules/storage/s3.service';
import { DocumentsAiService } from './documents-ai.service';
import { DocumentsAiController } from './documents-ai.controller';
import { FormsController } from './forms.controller';

@Module({
  imports: [PrismaModule, AiEmployeesModule, AuditModule, OrgEventsModule, PlaybooksModule, SearchModule],
  providers: [DocumentsAiService, S3Service],
  controllers: [DocumentsAiController, FormsController],
  exports: [DocumentsAiService]
})
export class DocumentsAiModule {}
