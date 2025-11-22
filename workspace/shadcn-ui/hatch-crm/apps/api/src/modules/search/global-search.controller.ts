import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { PermissionsService } from '@/modules/permissions/permissions.service';
import { GlobalSearchService } from './global-search.service';
import { GlobalSearchQueryDto, GlobalSearchResponseDto } from './global-search.dto';

interface AuthedRequest {
  user?: { userId?: string };
}

@ApiTags('search')
@ApiBearerAuth()
@Controller('organizations/:orgId/search')
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'team_lead', 'agent'))
export class GlobalSearchController {
  constructor(
    private readonly search: GlobalSearchService,
    private readonly permissions: PermissionsService
  ) {}

  @Get()
  async searchOrg(
    @Param('orgId') orgId: string,
    @Query() query: GlobalSearchQueryDto,
    @Req() req: AuthedRequest
  ): Promise<GlobalSearchResponseDto> {
    const userId = req.user?.userId;
    if (!userId) {
      throw new Error('Missing user context');
    }
    await this.permissions.assertOrgMember(orgId, userId);
    return this.search.search(orgId, query);
  }
}
