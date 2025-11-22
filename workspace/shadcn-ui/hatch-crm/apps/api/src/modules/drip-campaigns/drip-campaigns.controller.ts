import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { DripCampaignsService } from './drip-campaigns.service'
import { DripRunnerService } from './drip-runner.service'

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('drip-campaigns')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'agent', 'team_lead'))
@Controller('organizations/:orgId/drip-campaigns')
export class DripCampaignsController {
  constructor(
    private readonly drips: DripCampaignsService,
    private readonly runner: DripRunnerService
  ) {}

  @Get()
  list(@Param('orgId') orgId: string) {
    return this.drips.list(orgId)
  }

  @Get(':id')
  get(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.drips.get(orgId, id)
  }

  @Post()
  create(
    @Param('orgId') orgId: string,
    @Body() body: { name: string; description?: string | null; enabled?: boolean; steps?: any[] }
  ) {
    return this.drips.create(orgId, {
      name: body.name,
      description: body.description,
      enabled: body.enabled,
      steps: body.steps
    })
  }

  @Patch(':id')
  update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string | null; enabled?: boolean }
  ) {
    return this.drips.update(orgId, id, body)
  }

  @Post(':id/steps')
  addStep(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: { offsetHours: number; actionType: string; payload?: Record<string, unknown> | null }
  ) {
    return this.drips.addStep(orgId, id, body)
  }

  @Post(':id/run-now')
  runNow(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: { leadId: string },
    @Req() _req: AuthedRequest
  ) {
    return this.drips.runNow(orgId, id, body.leadId)
  }

  @Get('leads/:leadId/next-step')
  nextStep(@Param('orgId') orgId: string, @Param('leadId') leadId: string) {
    return this.runner.nextStepForLead(orgId, leadId)
  }
}
