import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'
import { DocumentReviewStatus } from '@hatch/db'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { DocumentsCollabService } from './documents-collab.service'
import { CreateCommentDto } from './dto/create-comment.dto'
import { UpdateCommentDto } from './dto/update-comment.dto'
import { CreateVersionDto } from './dto/create-version.dto'
import { UpdateReviewStatusDto } from './dto/update-review-status.dto'

interface AuthedRequest {
  user?: { userId?: string; role?: string }
}

@ApiTags('documents-collab')
@ApiBearerAuth()
@Controller('organizations/:orgId/files/:fileId')
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'agent', 'team_lead'))
export class DocumentsCollabController {
  constructor(private readonly collab: DocumentsCollabService) {}

  @Get('comments')
  async listComments(@Param('orgId') orgId: string, @Param('fileId') fileId: string) {
    return this.collab.listComments(orgId, fileId)
  }

  @Post('comments')
  async createComment(
    @Param('orgId') orgId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthedRequest,
    @Body() dto: CreateCommentDto
  ) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.collab.createComment(orgId, userId, fileId, dto)
  }

  @Patch('comments/:commentId')
  async updateComment(
    @Param('orgId') orgId: string,
    @Param('fileId') fileId: string,
    @Param('commentId') commentId: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateCommentDto
  ) {
    const userId = req.user?.userId ?? 'user-broker'
    const role = req.user?.role ?? 'agent'
    const isBroker = role === 'BROKER'
    return this.collab.updateComment(orgId, userId, commentId, dto, isBroker)
  }

  @Delete('comments/:commentId')
  async deleteComment(
    @Param('orgId') orgId: string,
    @Param('fileId') fileId: string,
    @Param('commentId') commentId: string,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId ?? 'user-broker'
    const role = req.user?.role ?? 'agent'
    const isBroker = role === 'BROKER'
    return this.collab.deleteComment(orgId, userId, commentId, isBroker)
  }

  @Get('versions')
  async listVersions(@Param('orgId') orgId: string, @Param('fileId') fileId: string) {
    return this.collab.listVersions(orgId, fileId)
  }

  @Post('versions')
  async createVersion(
    @Param('orgId') orgId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthedRequest,
    @Body() dto: CreateVersionDto
  ) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.collab.createVersion(orgId, userId, fileId, dto.storageKey)
  }

  @Patch('review-status')
  @UseGuards(JwtAuthGuard, RolesGuard('broker', 'team_lead'))
  async updateReviewStatus(
    @Param('orgId') orgId: string,
    @Param('fileId') fileId: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateReviewStatusDto
  ) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.collab.updateReviewStatus(orgId, userId, fileId, dto.status as DocumentReviewStatus)
  }
}
