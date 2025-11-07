import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { JourneysService } from './journeys.service';
import { ApiModule, ApiStandardErrors, resolveRequestContext } from '../common';
import { Permit } from '../../platform/security/permit.decorator';
import {
  JourneyListResponseDto,
  JourneySimulationResponseDto
} from './dto/journey-response.dto';
import { MAX_PAGE_SIZE } from '../common/dto/cursor-pagination-query.dto';
import { StartJourneyDto } from './dto/start-journey.dto';

@ApiModule('Journeys')
@ApiStandardErrors()
@Controller('journeys')
export class JourneysController {
  constructor(private readonly journeys: JourneysService) {}

  @Get()
  @ApiQuery({ name: 'tenantId', required: false })
  @ApiQuery({
    name: 'q',
    required: false,
    description: 'Filter journeys by name'
  })
  @ApiQuery({
    name: 'active',
    required: false,
    description: 'Restrict to active journeys when true; inactive when false'
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: MAX_PAGE_SIZE }
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
    description: 'Opaque cursor pointing to the next window'
  })
  @ApiOkResponse({ type: JourneyListResponseDto })
  async list(
    @Query('tenantId') tenantId: string | undefined,
    @Query('q') q: string | undefined,
    @Query('active') active: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('cursor') cursor: string | undefined
  ): Promise<JourneyListResponseDto> {
    const parsedLimit = limit ? Number.parseInt(limit, 10) : undefined;
    return this.journeys.list(tenantId, {
      q,
      cursor,
      limit: Number.isFinite(parsedLimit ?? NaN) ? (parsedLimit as number) : undefined,
      active:
        active === 'true' ? true : active === 'false' ? false : undefined
    });
  }

  @Post(':id/simulate')
  @ApiParam({ name: 'id', description: 'Journey identifier' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        tenantId: { type: 'string' },
        context: { type: 'object', additionalProperties: true }
      },
      required: ['tenantId']
    }
  })
  @ApiOkResponse({ type: JourneySimulationResponseDto })
  async simulate(
    @Param('id') id: string,
    @Body('tenantId') tenantId: string,
    @Body('context') context: Record<string, unknown>
  ): Promise<JourneySimulationResponseDto> {
    const outcome = await this.journeys.simulate(id, tenantId, context ?? {});
    return { outcome };
  }

  @Post('start')
  @Permit('journeys', 'create')
  @ApiBody({ type: StartJourneyDto })
  @ApiOkResponse({ schema: { type: 'object', properties: { ok: { type: 'boolean' } } } })
  async start(@Body() dto: StartJourneyDto, @Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    const tenantId = ctx.tenantId;
    if (!tenantId) {
      throw new BadRequestException('x-tenant-id header is required');
    }

    await this.journeys.startForLead({
      tenantId,
      leadId: dto.leadId,
      templateId: dto.templateId,
      actorId: ctx.userId,
      source: dto.source ?? 'insights'
    });
    return { ok: true };
  }
}
