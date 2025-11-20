import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
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

  @Get('overview')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  overview(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.getOrgOverview(orgId, userId);
  }

  @Get('agents')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  agents(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.getAgentsDashboard(orgId, userId);
  }

  @Get('compliance')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  compliance(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.getComplianceSummary(orgId, userId);
  }

  @Get('activity')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  activity(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.getActivityFeed(orgId, userId);
  }
}

