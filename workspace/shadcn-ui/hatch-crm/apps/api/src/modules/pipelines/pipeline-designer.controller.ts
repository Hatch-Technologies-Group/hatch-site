import { Body, Controller, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { resolveRequestContext } from '../common/request-context';
import { OrgAdminGuard } from '../common/org-admin.guard';
import {
  AssignPipelineDto,
  CreatePipelineDto,
  MutateAutomationDto,
  MutateFieldSetDto,
  MutateStagesDto,
  PublishPipelineDto,
  UpdatePipelineDto
} from './dto/pipeline-designer.dto';
import { PipelineDesignerService } from './pipeline-designer.service';

@Controller('pipelines/designer')
@UseGuards(OrgAdminGuard)
export class PipelineDesignerController {
  constructor(private readonly designer: PipelineDesignerService) {}

  @Get()
  async listPipelines(@Req() req: FastifyRequest): Promise<unknown> {
    const ctx = resolveRequestContext(req);
    return this.designer.list(ctx);
  }

  @Post()
  async createPipeline(@Body() dto: CreatePipelineDto, @Req() req: FastifyRequest): Promise<unknown> {
    const ctx = resolveRequestContext(req);
    return this.designer.createDraft(ctx, dto);
  }

  @Put(':pipelineId')
  async updatePipeline(
    @Param('pipelineId') pipelineId: string,
    @Body() dto: UpdatePipelineDto,
    @Req() req: FastifyRequest
  ): Promise<unknown> {
    const ctx = resolveRequestContext(req);
    return this.designer.updateDraft(ctx, pipelineId, dto);
  }

  @Post(':pipelineId/publish')
  async publishPipeline(
    @Param('pipelineId') pipelineId: string,
    @Body() dto: PublishPipelineDto,
    @Req() req: FastifyRequest
  ): Promise<unknown> {
    const ctx = resolveRequestContext(req);
    return this.designer.publish(ctx, pipelineId, dto);
  }

  @Post(':pipelineId/stages')
  async mutateStages(
    @Param('pipelineId') pipelineId: string,
    @Body() dto: MutateStagesDto,
    @Req() req: FastifyRequest
  ): Promise<unknown> {
    const ctx = resolveRequestContext(req);
    return this.designer.mutateStages(ctx, pipelineId, dto);
  }

  @Post(':pipelineId/field-sets')
  async mutateFieldSets(
    @Param('pipelineId') pipelineId: string,
    @Body() dto: MutateFieldSetDto,
    @Req() req: FastifyRequest
  ): Promise<unknown> {
    const ctx = resolveRequestContext(req);
    return this.designer.mutateFieldSets(ctx, pipelineId, dto);
  }

  @Post(':pipelineId/automations')
  async mutateAutomations(
    @Param('pipelineId') pipelineId: string,
    @Body() dto: MutateAutomationDto,
    @Req() req: FastifyRequest
  ): Promise<unknown> {
    const ctx = resolveRequestContext(req);
    return this.designer.mutateAutomations(ctx, pipelineId, dto);
  }

  @Post(':pipelineId/assign')
  async assignPipeline(
    @Param('pipelineId') pipelineId: string,
    @Body() dto: AssignPipelineDto,
    @Req() req: FastifyRequest
  ): Promise<unknown> {
    const ctx = resolveRequestContext(req);
    return this.designer.assign(ctx, pipelineId, dto);
  }
}
