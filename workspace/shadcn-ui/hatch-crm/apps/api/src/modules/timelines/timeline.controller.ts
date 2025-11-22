import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service'
import { TimelineService } from './timeline.service'
import { EntityType } from './dto/get-timeline.dto'

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('timelines')
@ApiBearerAuth()
@Controller('organizations/:orgId/timeline')
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'team_lead', 'agent'))
export class TimelineController {
  constructor(
    private readonly timelines: TimelineService,
    private readonly aiEmployees: AiEmployeesService
  ) {}

  @Get(':entityType/:entityId')
  async getTimeline(
    @Param('orgId') orgId: string,
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string
  ) {
    return this.timelines.getTimeline(orgId, entityType, entityId)
  }

  @Post(':entityType/:entityId/summary')
  async summarize(
    @Param('orgId') orgId: string,
    @Param('entityType') entityType: EntityType,
    @Param('entityId') entityId: string,
    @Req() req: AuthedRequest
  ) {
    if (!req.user?.userId) throw new Error('Missing user context')
    const timeline = await this.timelines.getTimeline(orgId, entityType, entityId)
    const ai = await this.aiEmployees.runPersona('timelineSummarizer' as any, {
      organizationId: orgId,
      userId: req.user.userId,
      input: timeline
    })
    return { summary: ai.rawText ?? '', structured: ai.structured ?? null }
  }
}
