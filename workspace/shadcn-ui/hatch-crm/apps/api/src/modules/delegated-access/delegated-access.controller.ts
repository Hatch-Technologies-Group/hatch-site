import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from '@nestjs/common'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { DelegatedAccessService } from './delegated-access.service'
import { PermissionsService } from '@/modules/permissions/permissions.service'
import { UpsertDelegationDto } from './dto/upsert-delegation.dto'

interface AuthedRequest {
  user?: { userId?: string }
}

@Controller('organizations/:orgId/delegated-access')
@UseGuards(JwtAuthGuard, RolesGuard('broker'))
export class DelegatedAccessController {
  constructor(
    private readonly delegations: DelegatedAccessService,
    private readonly permissions: PermissionsService
  ) {}

  private async ensureBroker(orgId: string, req: AuthedRequest) {
    const userId = req.user?.userId
    if (!userId) throw new Error('Missing user context')
    await this.permissions.assertBroker(orgId, userId)
  }

  @Get()
  async list(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    await this.ensureBroker(orgId, req)
    return this.delegations.list(orgId)
  }

  @Post()
  async upsert(@Param('orgId') orgId: string, @Body() dto: UpsertDelegationDto, @Req() req: AuthedRequest) {
    await this.ensureBroker(orgId, req)
    return this.delegations.upsert(orgId, dto)
  }

  @Delete(':delegationId')
  async remove(@Param('orgId') orgId: string, @Param('delegationId') delegationId: string, @Req() req: AuthedRequest) {
    await this.ensureBroker(orgId, req)
    return this.delegations.remove(orgId, delegationId)
  }
}
