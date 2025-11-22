import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { LeadScoringService } from './lead-scoring.service'

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('lead-scoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'agent', 'team_lead'))
@Controller('organizations/:orgId/leads/:leadId/score')
export class LeadScoringController {
  constructor(private readonly scorer: LeadScoringService) {}

  @Post()
  async score(@Param('orgId') orgId: string, @Param('leadId') leadId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.scorer.scoreLead(orgId, leadId, userId)
  }
}
