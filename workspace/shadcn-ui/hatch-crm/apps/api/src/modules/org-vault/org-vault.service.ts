import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgFileCategory, OrgEventType } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreateFileMetadataDto } from './dto/create-file-metadata.dto';
import { OrgEventsService } from '../org-events/org-events.service';

@Injectable()
export class OrgVaultService {
  constructor(private readonly prisma: PrismaService, private readonly events: OrgEventsService) {}

  private async assertUserInOrg(userId: string, orgId: string) {
    const member = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } }
    });
    if (!member) throw new ForbiddenException('Not a member of the organization');
    return member;
  }

  async createFolder(orgId: string, userId: string, dto: CreateFolderDto) {
    await this.assertUserInOrg(userId, orgId);
    if (dto.parentId) {
      const parent = await this.prisma.orgFolder.findFirst({ where: { id: dto.parentId, orgId } });
      if (!parent) throw new NotFoundException('Parent folder not found');
    }
    const folder = await this.prisma.orgFolder.create({
      data: {
        orgId,
        name: dto.name,
        parentId: dto.parentId ?? null,
        createdByUserId: userId
      }
    });
    try {
      await this.events.logOrgEvent({
        organizationId: orgId,
        actorId: userId,
        type: OrgEventType.ORG_FOLDER_CREATED,
        message: `Folder "${folder.name}" created`,
        payload: { folderId: folder.id, name: folder.name, parentId: folder.parentId }
      });
    } catch {}
    return folder;
  }

  async listFolders(orgId: string, userId: string, folderId?: string) {
    await this.assertUserInOrg(userId, orgId);
    if (folderId) {
      const folder = await this.prisma.orgFolder.findFirst({ where: { id: folderId, orgId } });
      if (!folder) throw new NotFoundException('Folder not found');
      const [folders, files] = await Promise.all([
        this.prisma.orgFolder.findMany({ where: { orgId, parentId: folderId }, orderBy: { name: 'asc' } }),
        this.prisma.orgFile.findMany({ where: { orgId, folderId }, orderBy: { createdAt: 'desc' }, include: { file: true } })
      ]);
      return { folders, files };
    }
    const [folders, files] = await Promise.all([
      this.prisma.orgFolder.findMany({ where: { orgId, parentId: null }, orderBy: { name: 'asc' } }),
      this.prisma.orgFile.findMany({ where: { orgId, folderId: null }, orderBy: { createdAt: 'desc' }, include: { file: true } })
    ]);
    return { folders, files };
  }

  private toCategory(cat?: CreateFileMetadataDto['category']): OrgFileCategory {
    const fallback = OrgFileCategory.OTHER;
    if (!cat) return fallback;
    const map: Record<string, OrgFileCategory> = {
      CONTRACT_TEMPLATE: OrgFileCategory.CONTRACT_TEMPLATE,
      COMPLIANCE: OrgFileCategory.COMPLIANCE,
      TRAINING: OrgFileCategory.TRAINING,
      MARKETING: OrgFileCategory.MARKETING,
      RENTAL_PM: OrgFileCategory.RENTAL_PM,
      OTHER: OrgFileCategory.OTHER
    };
    return map[cat] ?? fallback;
  }

  async createFileMetadata(orgId: string, userId: string, dto: CreateFileMetadataDto) {
    await this.assertUserInOrg(userId, orgId);
    if (dto.folderId) {
      const folder = await this.prisma.orgFolder.findFirst({ where: { id: dto.folderId, orgId } });
      if (!folder) throw new NotFoundException('Folder not found');
    }

    let fileId = dto.fileId ?? null;
    if (!fileId && dto.storageKey) {
      const created = await this.prisma.fileObject.create({
        data: {
          orgId,
          ownerId: userId,
          fileName: dto.name,
          storageKey: dto.storageKey,
          byteSize: 0,
          status: 'READY'
        }
      });
      fileId = created.id;
    }
    if (!fileId) {
      throw new NotFoundException('fileId or storageKey required');
    }

    // Validate file belongs to org
    const file = await this.prisma.fileObject.findFirst({ where: { id: fileId, orgId } });
    if (!file) throw new NotFoundException('FileObject not found for this org');

    const record = await this.prisma.orgFile.create({
      data: {
        orgId,
        folderId: dto.folderId ?? null,
        name: dto.name,
        description: dto.description ?? null,
        category: this.toCategory(dto.category),
        fileId: fileId,
        uploadedByUserId: userId
      },
      include: { file: true }
    });

    try {
      await this.events.logOrgEvent({
        organizationId: orgId,
        actorId: userId,
        type: OrgEventType.ORG_FILE_UPLOADED,
        message: `File "${record.name}" uploaded`,
        payload: { fileId: record.id, name: record.name, folderId: record.folderId, category: record.category }
      });
    } catch {}

    return record;
  }
}

