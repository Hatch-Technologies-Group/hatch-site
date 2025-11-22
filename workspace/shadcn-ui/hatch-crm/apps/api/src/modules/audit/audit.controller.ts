import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { AuditService } from './audit.service';

interface AuthedRequest {
  user?: { userId?: string; sub?: string };
}

@Controller('organizations/:orgId/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard('broker', 'admin'))
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  async list(
    @Param('orgId') orgId: string,
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined,
    @Query('userId') userId: string | undefined,
    @Query('actionType') actionType: string | undefined,
    @Req() _req: AuthedRequest
  ) {
    const lim = limit ? Number(limit) : undefined;
    return this.auditService.listForOrganization(orgId, lim ?? 50, cursor, { userId, actionType });
  }
}
