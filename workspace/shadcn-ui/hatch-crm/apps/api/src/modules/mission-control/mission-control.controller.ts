import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { MissionControlService } from './mission-control.service';

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('mission-control')
@ApiBearerAuth()
@Controller('organizations/:orgId/mission-control')
export class MissionControlController {
  constructor(private readonly svc: MissionControlService) {}

  private parseScope(officeId?: string, teamId?: string) {
    const scope: { officeId?: string; teamId?: string } = {};
    if (officeId) {
      scope.officeId = officeId;
    }
    if (teamId) {
      scope.teamId = teamId;
    }
    return scope.officeId || scope.teamId ? scope : undefined;
  }

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  overview(
    @Param('orgId') orgId: string,
    @Query('officeId') officeId: string | undefined,
    @Query('teamId') teamId: string | undefined,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.getOrgOverview(orgId, userId, this.parseScope(officeId, teamId));
  }

  @Get('agents')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  agents(
    @Param('orgId') orgId: string,
    @Query('officeId') officeId: string | undefined,
    @Query('teamId') teamId: string | undefined,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.getAgentsDashboard(orgId, userId, this.parseScope(officeId, teamId));
  }

  @Get('compliance')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  compliance(
    @Param('orgId') orgId: string,
    @Query('officeId') officeId: string | undefined,
    @Query('teamId') teamId: string | undefined,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.getComplianceSummary(orgId, userId, this.parseScope(officeId, teamId));
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  activity(
    @Param('orgId') orgId: string,
    @Query('officeId') officeId: string | undefined,
    @Query('teamId') teamId: string | undefined,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.getActivityFeed(orgId, userId, this.parseScope(officeId, teamId));
  }
}
