import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { TeamsService } from './teams.service'
import { CreateTeamDto } from './dto/create-team.dto'
import { UpdateTeamDto } from './dto/update-team.dto'
import { PermissionsService } from '@/modules/permissions/permissions.service'

interface AuthedRequest {
  user?: { userId?: string }
}

@Controller('organizations/:orgId/teams')
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'team_lead'))
export class TeamsController {
  constructor(private readonly teams: TeamsService, private readonly permissions: PermissionsService) {}

  private async ensureLeader(orgId: string, req: AuthedRequest) {
    const userId = req.user?.userId
    if (!userId) throw new Error('Missing user context')
    await this.permissions.assertBrokerOrTeamLead(orgId, userId)
    return userId
  }

  @Get()
  async list(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    await this.ensureLeader(orgId, req)
    return this.teams.list(orgId)
  }

  @Post()
  async create(@Param('orgId') orgId: string, @Body() dto: CreateTeamDto, @Req() req: AuthedRequest) {
    await this.permissions.assertBroker(orgId, await this.ensureLeader(orgId, req))
    return this.teams.create(orgId, dto)
  }

  @Patch(':teamId')
  async update(
    @Param('orgId') orgId: string,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @Req() req: AuthedRequest
  ) {
    await this.ensureLeader(orgId, req)
    return this.teams.update(orgId, teamId, dto)
  }

  @Delete(':teamId')
  async remove(@Param('orgId') orgId: string, @Param('teamId') teamId: string, @Req() req: AuthedRequest) {
    await this.permissions.assertBroker(orgId, await this.ensureLeader(orgId, req))
    return this.teams.remove(orgId, teamId)
  }
}
