import { BadRequestException, Controller, Get, Query, Req, Res, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuditInterceptor } from '../../platform/audit/audit.interceptor';
import { Permit } from '../../platform/security/permit.decorator';
import { resolveRequestContext } from '../common/request-context';
import { ApiModule, ApiStandardErrors } from '../common';
import { InsightsService } from './insights.service';
import { ClientInsightsResponseDto, GetInsightsQueryDto } from './dto';

@ApiTags('Insights')
@ApiModule('Insights')
@ApiStandardErrors()
@ApiBearerAuth()
@UseInterceptors(AuditInterceptor)
@Controller('insights')
export class InsightsController {
  constructor(private readonly insights: InsightsService) {}

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get()
  @Permit('dashboards', 'read')
  @ApiOkResponse({ type: ClientInsightsResponseDto })
  async getInsights(
    @Req() req: FastifyRequest,
    @Query() query: GetInsightsQueryDto,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const ctx = resolveRequestContext(req);
    const tenantHeader = (req.headers['x-tenant-id'] as string | undefined)?.trim();
    if (!tenantHeader) {
      throw new BadRequestException('x-tenant-id header is required for insights queries');
    }
    query.tenantId = tenantHeader;
    const result = await this.insights.getInsights(ctx, query);

    const hasDataAge = result.dataAge ? Number.isFinite(new Date(result.dataAge).getTime()) : false;
    const dataAgeDate = hasDataAge ? new Date(result.dataAge as string) : null;
    const isStale =
      dataAgeDate !== null ? Date.now() - dataAgeDate.getTime() > 10 * 60 * 1000 : true;

    reply.header('X-Insights-Version', String(result.v ?? 1));
    if (dataAgeDate) {
      reply.header('X-Insights-DataAge', dataAgeDate.toISOString());
    }
    reply.header('X-Insights-Stale', String(isStale));

    return result;
  }
}
