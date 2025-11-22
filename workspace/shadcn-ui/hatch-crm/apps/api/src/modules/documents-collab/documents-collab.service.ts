import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { DocumentReviewStatus } from '@hatch/db'

import { PrismaService } from '@/modules/prisma/prisma.service'

@Injectable()
export class DocumentsCollabService {
  constructor(private readonly prisma: PrismaService) {}

  async listComments(orgId: string, fileId: string) {
    await this.assertFile(orgId, fileId)
    return (this.prisma as any).orgFileComment.findMany({
      where: { orgFileId: fileId },
      orderBy: { createdAt: 'asc' }
    })
  }

  async createComment(orgId: string, userId: string, fileId: string, dto: any) {
    await this.assertFile(orgId, fileId)
    return (this.prisma as any).orgFileComment.create({
      data: {
        orgFileId: fileId,
        organizationId: orgId,
        userId,
        content: dto.content,
        pageNumber: dto.pageNumber ?? null,
        x: dto.x ?? null,
        y: dto.y ?? null,
        width: dto.width ?? null,
        height: dto.height ?? null
      }
    })
  }

  async updateComment(orgId: string, userId: string, commentId: string, dto: any, isBroker: boolean) {
    const comment = await (this.prisma as any).orgFileComment.findFirst({ where: { id: commentId, organizationId: orgId } })
    if (!comment) throw new NotFoundException('Comment not found')
    if (!isBroker && comment.userId !== userId) {
      throw new ForbiddenException('Not allowed to edit this comment')
    }
    return (this.prisma as any).orgFileComment.update({
      where: { id: commentId },
      data: { content: dto.content ?? comment.content }
    })
  }

  async deleteComment(orgId: string, userId: string, commentId: string, isBroker: boolean) {
    const comment = await (this.prisma as any).orgFileComment.findFirst({ where: { id: commentId, organizationId: orgId } })
    if (!comment) throw new NotFoundException('Comment not found')
    if (!isBroker && comment.userId !== userId) {
      throw new ForbiddenException('Not allowed to delete this comment')
    }
    await (this.prisma as any).orgFileComment.delete({ where: { id: commentId } })
    return { deleted: true }
  }

  async listVersions(orgId: string, fileId: string) {
    await this.assertFile(orgId, fileId)
    return (this.prisma as any).orgFileVersion.findMany({
      where: { orgFileId: fileId },
      orderBy: { versionNumber: 'desc' }
    })
  }

  async createVersion(orgId: string, userId: string, fileId: string, storageKey: string) {
    await this.assertFile(orgId, fileId)
    const maxVersion = await (this.prisma as any).orgFileVersion.aggregate({
      where: { orgFileId: fileId },
      _max: { versionNumber: true }
    })
    const nextVersion = (maxVersion?._max?.versionNumber ?? 0) + 1
    return (this.prisma as any).orgFileVersion.create({
      data: {
        orgFileId: fileId,
        versionNumber: nextVersion,
        storageKey,
        createdById: userId
      }
    })
  }

  async updateReviewStatus(orgId: string, userId: string, fileId: string, status: DocumentReviewStatus) {
    await this.assertFile(orgId, fileId)
    const updated = await (this.prisma as any).orgFile.update({
      where: { id: fileId },
      data: { reviewStatus: status }
    })
    return updated
  }

  private async assertFile(orgId: string, fileId: string) {
    const file = await (this.prisma as any).orgFile.findFirst({ where: { id: fileId, orgId } })
    if (!file) throw new NotFoundException('Document not found')
    return file
  }
}
