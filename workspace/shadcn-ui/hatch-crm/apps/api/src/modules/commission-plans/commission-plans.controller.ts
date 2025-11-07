import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { AuditInterceptor } from '../../platform/audit/audit.interceptor';
import { Permit } from '../../platform/security/permit.decorator';
import { ApiModule, ApiStandardErrors, resolveRequestContext } from '../common';
import { CommissionPlansService } from './commission-plans.service';
import { CapLedgerService } from './cap-ledger.service';
import { CapProgressQueryDto } from './dto/cap-progress.dto';
import {
  CommissionPlanListQueryDto,
  CommissionPlanListResponseDto,
  CommissionPlanResponseDto,
  CreateCommissionPlanDto,
  UpdateCommissionPlanDto
} from './dto';

@ApiModule('Commission Plans')
@ApiStandardErrors()
@Controller('commission-plans')
@UseInterceptors(AuditInterceptor)
export class CommissionPlansController {
  constructor(
    private readonly service: CommissionPlansService,
    private readonly capLedger: CapLedgerService
  ) {}

  @Get()
  @Permit('commission_plans', 'read')
  @ApiQuery({
    name: 'limit',
    required: false,
    schema: { type: 'integer', minimum: 1, maximum: 100 },
    description: 'Page size (default 25, maximum 100)'
  })
  @ApiQuery({ name: 'cursor', required: false, description: 'Opaque pagination cursor from a prior response' })
  @ApiOkResponse({ type: CommissionPlanListResponseDto })
  async list(@Req() req: FastifyRequest, @Query() query: CommissionPlanListQueryDto) {
    const ctx = resolveRequestContext(req);
    return this.service.list(ctx, query);
  }

  @Get(':id')
  @Permit('commission_plans', 'read')
  @ApiParam({ name: 'id', description: 'Commission plan identifier' })
  @ApiOkResponse({ type: CommissionPlanResponseDto })
  async get(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.service.get(ctx, id);
  }

  @Post()
  @Permit('commission_plans', 'create')
  @ApiBody({ type: CreateCommissionPlanDto })
  @ApiOkResponse({ type: CommissionPlanResponseDto })
  async create(@Req() req: FastifyRequest, @Body() dto: CreateCommissionPlanDto) {
    const ctx = resolveRequestContext(req);
    return this.service.create(ctx, dto);
  }

  @Patch(':id')
  @Permit('commission_plans', 'update')
  @ApiParam({ name: 'id', description: 'Commission plan identifier' })
  @ApiBody({ type: UpdateCommissionPlanDto })
  @ApiOkResponse({ type: CommissionPlanResponseDto })
  async update(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCommissionPlanDto
  ) {
    const ctx = resolveRequestContext(req);
    return this.service.update(ctx, id, dto);
  }

  @Get('cap-progress')
  @Permit('commission_plans', 'read')
  @ApiQuery({ name: 'userId', required: false, description: 'Filter cap progress by user id' })
  @ApiQuery({ name: 'teamId', required: false, description: 'Filter cap progress by team id' })
  @ApiQuery({
    name: 'periodStart',
    required: false,
    description: 'ISO date string; only include ledgers whose period overlaps this value'
  })
  @ApiQuery({
    name: 'periodEnd',
    required: false,
    description: 'ISO date string; only include ledgers whose period overlaps this value'
  })
  async getCapProgress(@Req() req: FastifyRequest, @Query() query: CapProgressQueryDto) {
    const ctx = resolveRequestContext(req);
    return this.capLedger.getCapProgress(ctx, query);
  }
}
