import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { DocumentsAiService } from './documents-ai.service';
import { ClassifyFileDto } from './dto/classify-file.dto';
import { EvaluateFileDto } from './dto/evaluate-file.dto';

interface AuthedRequest {
  user?: { userId?: string };
}

@Controller('organizations/:orgId/documents-ai')
@UseGuards(JwtAuthGuard, RolesGuard('broker'))
export class DocumentsAiController {
  constructor(private readonly documents: DocumentsAiService) {}

  @Post('classify')
  classify(@Param('orgId') orgId: string, @Body() dto: ClassifyFileDto, @Req() req: AuthedRequest) {
    this.ensureUser(req);
    return this.documents.classifyFile(orgId, dto.fileId);
  }

  @Post('evaluate')
  evaluate(@Param('orgId') orgId: string, @Body() dto: EvaluateFileDto, @Req() req: AuthedRequest) {
    this.ensureUser(req);
    return this.documents.evaluateFile(orgId, dto.fileId);
  }

  @Post('analyze')
  analyze(@Param('orgId') orgId: string, @Body() dto: ClassifyFileDto, @Req() req: AuthedRequest) {
    this.ensureUser(req);
    return this.documents.analyzeFile(orgId, dto.fileId);
  }

  private ensureUser(req: AuthedRequest) {
    if (!req.user?.userId) {
      throw new Error('Missing user context');
    }
  }
}
