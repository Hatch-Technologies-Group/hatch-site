import { BadRequestException, Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';

import { resolveRequestContext } from '../common/request-context';
import { GetInsightsQueryDto } from './dto';
import { InsightsService } from './insights.service';

const STALE_AFTER_MS = 10 * 60 * 1000;

@ApiTags('Insights')
@ApiBearerAuth()
@Controller('insights')
@UseGuards(JwtAuthGuard, RolesGuard('broker'))
export class InsightsController {
  constructor(private readonly service: InsightsService) {}

  @Get()
  @ApiOkResponse({ description: 'Lead insights payload' })
  async getInsights(
    @Req() req: FastifyRequest,
    @Query() query: GetInsightsQueryDto,
    @Res({ passthrough: true }) reply: FastifyReply
  ) {
    const tenantHeader = (req.headers['x-tenant-id'] as string | undefined)?.trim();
    if (!tenantHeader) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    const ctx = resolveRequestContext(req);
    const enforcedQuery: GetInsightsQueryDto = { ...query, tenantId: tenantHeader };
    const result = await this.service.getInsights({ ...ctx, tenantId: tenantHeader }, enforcedQuery);

    const version = (result as any)?.v;
    if (version !== undefined) {
      reply.header('X-Insights-Version', String(version));
    }

    const dataAge = (result as any)?.dataAge;
    if (dataAge) {
      const dataAgeIso = String(dataAge);
      reply.header('X-Insights-DataAge', dataAgeIso);
      const parsed = new Date(dataAgeIso).getTime();
      const ageMs = Date.now() - parsed;
      const isStale = Number.isFinite(ageMs) && ageMs > STALE_AFTER_MS;
      reply.header('X-Insights-Stale', isStale ? 'true' : 'false');
    }

    return result;
  }
}

