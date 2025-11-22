import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { PrismaService } from '@/modules/prisma/prisma.service';

@ApiTags('forms')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('organizations/:orgId/forms')
export class FormsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@Param('orgId') orgId: string) {
    const docs = await this.prisma.knowledgeDocument.findMany({
      where: { organizationId: orgId },
      include: { orgFile: { select: { fileId: true, name: true, description: true } } },
      orderBy: { title: 'asc' }
    });

    return docs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      jurisdiction: doc.source,
      s3Key: doc.s3Key,
      fileId: doc.orgFileId,
      fileName: doc.orgFile?.name ?? doc.title,
      description: doc.orgFile?.description ?? null
    }));
  }
}
