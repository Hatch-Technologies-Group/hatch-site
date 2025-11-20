import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { OrgAccountingService } from './org-accounting.service';
import { ConnectAccountingDto } from './dto/connect-accounting.dto';
import { SyncTransactionDto } from './dto/sync-transaction.dto';
import { SyncRentalLeaseDto } from './dto/sync-rental-lease.dto';

interface AuthedRequest {
  user?: { userId?: string };
}

@ApiTags('org-accounting')
@ApiBearerAuth()
@Controller('organizations/:orgId/accounting')
export class OrgAccountingController {
  constructor(private readonly svc: OrgAccountingService) {}

  @Post('connect')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  connect(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body() dto: ConnectAccountingDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.connectAccounting(orgId, userId, dto);
  }

  @Post('sync-transaction')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  syncTransaction(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body() dto: SyncTransactionDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.syncTransactionToAccounting(orgId, userId, dto.transactionId);
  }

  @Post('sync-lease')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  syncLease(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: SyncRentalLeaseDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.syncRentalLeaseToAccounting(orgId, userId, dto.leaseId);
  }

  @Get('sync-status')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  list(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listSyncStatusForOrg(orgId, userId);
  }
}
