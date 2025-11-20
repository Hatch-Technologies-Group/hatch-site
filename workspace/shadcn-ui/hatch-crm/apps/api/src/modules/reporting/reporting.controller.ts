import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';

import { AgentAnalyticsQueryDto } from './dto/agent-analytics-query.dto';
import { OrgAnalyticsQueryDto } from './dto/org-analytics-query.dto';
import { ReportingService } from './reporting.service';

const DEFAULT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;

@Controller('organizations/:orgId/reporting')
@UseGuards(JwtAuthGuard)
export class ReportingController {
  constructor(private readonly reporting: ReportingService) {}

  @Get('org-daily')
  @UseGuards(RolesGuard('broker'))
  async getOrgDaily(@Param('orgId') orgId: string, @Query() query: OrgAnalyticsQueryDto) {
    const { start, end } = this.resolveDateRange(query.startDate, query.endDate);
    await this.reporting.computeDailyAnalyticsForOrg(orgId, end);
    return this.reporting.getOrgDailySeries(orgId, start, end);
  }

  @Get('agent-daily')
  @UseGuards(RolesGuard('broker'))
  async getAgentDaily(@Param('orgId') orgId: string, @Query() query: AgentAnalyticsQueryDto) {
    if (!query.agentProfileId) {
      throw new BadRequestException('agentProfileId is required');
    }
    const { start, end } = this.resolveDateRange(query.startDate, query.endDate);
    return this.reporting.getAgentDailySeries(orgId, query.agentProfileId, start, end);
  }

  private resolveDateRange(startDate?: string, endDate?: string) {
    const end = endDate ? new Date(endDate) : new Date();
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException('Invalid endDate');
    }
    const defaultStart = new Date(end.getTime() - DEFAULT_WINDOW_MS);
    const start = startDate ? new Date(startDate) : defaultStart;
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException('Invalid startDate');
    }
    if (start > end) {
      throw new BadRequestException('startDate must be before endDate');
    }
    return { start, end };
  }
}
