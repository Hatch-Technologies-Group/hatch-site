import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { InsightsService } from './insights.service'

interface AuthedRequest {
  user?: { userId?: string }
}
type InsightType =
  | 'BROKER'
  | 'TEAM'
  | 'AGENT'
  | 'LISTING'
  | 'TRANSACTION'
  | 'LEAD'
  | 'RENTAL'
  | 'COMPLIANCE'
  | 'RISK'
  | 'PRODUCTIVITY'

@ApiTags('insights')
@ApiBearerAuth()
@Controller('organizations/:orgId/insights')
@UseGuards(JwtAuthGuard, RolesGuard('broker'))
export class InsightsController {
  constructor(private readonly svc: InsightsService) {}

  @Get()
  async list(
    @Param('orgId') orgId: string,
    @Query('type') type?: InsightType,
    @Query('targetId') targetId?: string,
    @Query('limit') limit?: string
  ) {
    const lim = limit ? Number(limit) : 50
    return this.svc.list(orgId, type, targetId, lim)
  }

  @Post('generate')
  async generate(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? 'system'
    return this.svc.generateDailyInsights(orgId, userId)
  }
}
