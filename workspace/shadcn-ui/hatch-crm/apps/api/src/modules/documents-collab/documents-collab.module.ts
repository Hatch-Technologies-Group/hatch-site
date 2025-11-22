import { Module } from '@nestjs/common'

import { PrismaModule } from '@/modules/prisma/prisma.module'
import { DocumentsCollabService } from './documents-collab.service'
import { DocumentsCollabController } from './documents-collab.controller'

@Module({
  imports: [PrismaModule],
  providers: [DocumentsCollabService],
  controllers: [DocumentsCollabController],
  exports: [DocumentsCollabService]
})
export class DocumentsCollabModule {}
