import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { OrgEventsService } from './org-events.service';

@ApiTags('org-events')
@ApiBearerAuth()
@Controller('organizations')
export class OrgEventsController {
  constructor(private readonly svc: OrgEventsService) {}

  @Get(':orgId/events')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  list(@Param('orgId') orgId: string) {
    return this.svc.listOrgEventsForBroker(orgId, 50);
  }
}

