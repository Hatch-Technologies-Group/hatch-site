import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { OrgLeadsService } from './org-leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';

interface AuthedRequest {
  user?: { userId?: string; sub?: string };
  ip?: string;
  headers?: Record<string, unknown>;
}

const getUserId = (req: AuthedRequest) => req.user?.userId ?? req.user?.sub ?? null;

@ApiTags('org-leads')
@ApiBearerAuth()
@Controller()
export class OrgLeadsController {
  constructor(private readonly leads: OrgLeadsService) {}

  @Post('organizations/:orgId/leads/public')
  async createLeadPublic(@Param('orgId') orgId: string, @Body() dto: CreateLeadDto, @Req() req: AuthedRequest) {
    return this.leads.createLeadFromPortal(orgId, null, dto, req);
  }

  @UseGuards(JwtAuthGuard)
  @Post('organizations/:orgId/leads')
  async createLeadAuthenticated(@Param('orgId') orgId: string, @Body() dto: CreateLeadDto, @Req() req: AuthedRequest) {
    const userId = getUserId(req);
    if (!userId) {
      throw new Error('Missing user context');
    }
    return this.leads.createLeadFromPortal(orgId, userId, dto, req);
  }

  @UseGuards(JwtAuthGuard)
  @Get('organizations/:orgId/leads')
  async listLeads(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Query('status') status?: string) {
    const userId = getUserId(req);
    if (!userId) {
      throw new Error('Missing user context');
    }
    return this.leads.listLeadsForOrg(orgId, userId, { status });
  }

  @UseGuards(JwtAuthGuard)
  @Patch('organizations/:orgId/leads/:leadId/status')
  async updateLeadStatus(
    @Param('orgId') orgId: string,
    @Param('leadId') leadId: string,
    @Body() dto: UpdateLeadStatusDto,
    @Req() req: AuthedRequest
  ) {
    const userId = getUserId(req);
    if (!userId) {
      throw new Error('Missing user context');
    }
    return this.leads.updateLeadStatus(orgId, userId, leadId, dto);
  }
}
