import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '@/auth/jwt-auth.guard'
import { RolesGuard } from '@/auth/roles.guard'
import { PlaybooksService, type PlaybookInput } from './playbooks.service'

interface AuthedRequest { user?: { userId?: string } }

@ApiTags('playbooks')
@ApiBearerAuth()
@Controller('organizations/:orgId/playbooks')
@UseGuards(JwtAuthGuard, RolesGuard('broker'))
export class PlaybooksController {
  constructor(private readonly playbooks: PlaybooksService) {}

  private ensureUser(req: AuthedRequest) {
    if (!req.user?.userId) {
      throw new Error('Missing user context')
    }
    return req.user.userId
  }

  @Get()
  list(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    this.ensureUser(req)
    return this.playbooks.list(orgId)
  }

  @Get(':playbookId')
  get(@Param('orgId') orgId: string, @Param('playbookId') playbookId: string, @Req() req: AuthedRequest) {
    this.ensureUser(req)
    return this.playbooks.get(orgId, playbookId)
  }

  @Post()
  create(@Param('orgId') orgId: string, @Body() dto: PlaybookInput, @Req() req: AuthedRequest) {
    this.ensureUser(req)
    return this.playbooks.create(orgId, dto)
  }

  @Patch(':playbookId')
  update(
    @Param('orgId') orgId: string,
    @Param('playbookId') playbookId: string,
    @Body() dto: Partial<PlaybookInput>,
    @Req() req: AuthedRequest
  ) {
    this.ensureUser(req)
    return this.playbooks.update(orgId, playbookId, dto)
  }

  @Patch(':playbookId/toggle')
  toggle(
    @Param('orgId') orgId: string,
    @Param('playbookId') playbookId: string,
    @Body() body: { enabled: boolean },
    @Req() req: AuthedRequest
  ) {
    this.ensureUser(req)
    return this.playbooks.toggle(orgId, playbookId, body.enabled)
  }

  @Get(':playbookId/runs')
  runs(
    @Param('orgId') orgId: string,
    @Param('playbookId') playbookId: string,
    @Req() req: AuthedRequest
  ) {
    this.ensureUser(req)
    return this.playbooks.listRuns(orgId, playbookId)
  }
}
