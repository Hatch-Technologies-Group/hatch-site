import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { OfficesService } from './offices.service'
import { CreateOfficeDto } from './dto/create-office.dto'
import { UpdateOfficeDto } from './dto/update-office.dto'
import { PermissionsService } from '@/modules/permissions/permissions.service'

interface AuthedRequest {
  user?: { userId?: string }
}

@Controller('organizations/:orgId/offices')
@UseGuards(JwtAuthGuard, RolesGuard('broker'))
export class OfficesController {
  constructor(private readonly offices: OfficesService, private readonly permissions: PermissionsService) {}

  private async ensureBroker(orgId: string, req: AuthedRequest) {
    const userId = req.user?.userId
    if (!userId) throw new Error('Missing user context')
    await this.permissions.assertBroker(orgId, userId)
    return userId
  }

  @Get()
  async list(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    await this.ensureBroker(orgId, req)
    return this.offices.list(orgId)
  }

  @Post()
  async create(@Param('orgId') orgId: string, @Body() dto: CreateOfficeDto, @Req() req: AuthedRequest) {
    await this.ensureBroker(orgId, req)
    return this.offices.create(orgId, dto)
  }

  @Patch(':officeId')
  async update(
    @Param('orgId') orgId: string,
    @Param('officeId') officeId: string,
    @Body() dto: UpdateOfficeDto,
    @Req() req: AuthedRequest
  ) {
    await this.ensureBroker(orgId, req)
    return this.offices.update(orgId, officeId, dto)
  }

  @Delete(':officeId')
  async delete(@Param('orgId') orgId: string, @Param('officeId') officeId: string, @Req() req: AuthedRequest) {
    await this.ensureBroker(orgId, req)
    return this.offices.remove(orgId, officeId)
  }
}
