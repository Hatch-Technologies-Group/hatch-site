import { Controller, Param, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { TransactionCoordinatorService } from './transaction-coordinator.service'

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('transaction-coordinator')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'agent', 'team_lead'))
@Controller('organizations/:orgId/transactions/tc')
export class TransactionCoordinatorController {
  constructor(private readonly tc: TransactionCoordinatorService) {}

  @Post('run-checks')
  async runChecks(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? 'user-broker'
    return this.tc.runChecksForOrg(orgId, userId)
  }
}
