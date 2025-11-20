import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { OrgVaultService } from './org-vault.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { CreateFileMetadataDto } from './dto/create-file-metadata.dto';

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('org-vault')
@ApiBearerAuth()
@Controller('organizations/:orgId/vault')
export class OrgVaultController {
  constructor(private readonly svc: OrgVaultService) {}

  @Post('folders')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  createFolder(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: CreateFolderDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.createFolder(orgId, userId, dto);
  }

  @Get('folders')
  @UseGuards(JwtAuthGuard)
  list(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Query('folderId') folderId?: string) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listFolders(orgId, userId, folderId);
  }

  @Post('files')
  @UseGuards(JwtAuthGuard)
  createFile(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: CreateFileMetadataDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.createFileMetadata(orgId, userId, dto);
  }
}

