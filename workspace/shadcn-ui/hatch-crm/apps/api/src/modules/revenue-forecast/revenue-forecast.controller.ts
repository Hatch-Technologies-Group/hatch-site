import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { RevenueForecastService } from './revenue-forecast.service'

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('revenue-forecast')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'agent', 'team_lead'))
@Controller('organizations/:orgId/revenue-forecast')
export class RevenueForecastController {
  constructor(private readonly forecasts: RevenueForecastService) {}

  @Post()
  generate(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.forecasts.generate(orgId, userId)
  }
}
