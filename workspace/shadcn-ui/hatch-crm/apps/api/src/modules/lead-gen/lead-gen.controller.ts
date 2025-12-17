import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseInterceptors } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiParam, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';

import { AuditInterceptor } from '../../platform/audit/audit.interceptor';
import { Permit } from '../../platform/security/permit.decorator';
import { ApiModule, ApiStandardErrors, resolveRequestContext } from '../common';
import { LeadGenService } from './lead-gen.service';
import { CreateLeadGenAudienceDto, ComputeLeadGenAudienceDto, UpdateLeadGenAudienceDto } from './dto/audience.dto';
import { CreateLeadGenCampaignDto, UpdateLeadGenCampaignDto, UpsertLeadGenCampaignSpendDto } from './dto/campaign.dto';
import { CreateLeadGenLandingPageDto, UpdateLeadGenLandingPageDto } from './dto/landing-page.dto';
import {
  ExportLeadGenConversionsDto,
  ListLeadGenConversionEventsQueryDto,
  RecordLeadGenConversionEventDto
} from './dto/conversion-events.dto';

@ApiModule('Lead Gen')
@ApiTags('beta')
@ApiStandardErrors()
@Controller('lead-gen')
@UseInterceptors(AuditInterceptor)
export class LeadGenController {
  constructor(private readonly leadGen: LeadGenService) {}

  @Get('campaigns')
  @Permit('lead_gen', 'read')
  async listCampaigns(@Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.listCampaigns({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId });
  }

  @Post('campaigns')
  @Permit('lead_gen', 'create')
  @ApiBody({ type: CreateLeadGenCampaignDto })
  async createCampaign(@Req() req: FastifyRequest, @Body() dto: CreateLeadGenCampaignDto) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.createCampaign({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, dto);
  }

  @Get('campaigns/:id')
  @Permit('lead_gen', 'read')
  @ApiParam({ name: 'id', description: 'Lead generation campaign id' })
  async getCampaign(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.getCampaign({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id);
  }

  @Patch('campaigns/:id')
  @Permit('lead_gen', 'update')
  @ApiParam({ name: 'id', description: 'Lead generation campaign id' })
  @ApiBody({ type: UpdateLeadGenCampaignDto })
  async updateCampaign(@Req() req: FastifyRequest, @Param('id') id: string, @Body() dto: UpdateLeadGenCampaignDto) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.updateCampaign({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id, dto);
  }

  @Post('campaigns/:id/spend')
  @Permit('lead_gen', 'update')
  @ApiParam({ name: 'id', description: 'Lead generation campaign id' })
  @ApiBody({ type: UpsertLeadGenCampaignSpendDto })
  async upsertCampaignSpend(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
    @Body() dto: UpsertLeadGenCampaignSpendDto
  ) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.upsertCampaignSpend({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id, dto);
  }

  @Get('campaigns/:id/metrics')
  @Permit('lead_gen', 'read')
  @ApiParam({ name: 'id', description: 'Lead generation campaign id' })
  async campaignMetrics(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.campaignMetrics({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id);
  }

  @Get('landing-pages')
  @Permit('lead_gen', 'read')
  async listLandingPages(@Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.listLandingPages({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId });
  }

  @Post('landing-pages')
  @Permit('lead_gen', 'create')
  @ApiBody({ type: CreateLeadGenLandingPageDto })
  async createLandingPage(@Req() req: FastifyRequest, @Body() dto: CreateLeadGenLandingPageDto) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.createLandingPage({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, dto);
  }

  @Get('landing-pages/:id')
  @Permit('lead_gen', 'read')
  @ApiParam({ name: 'id', description: 'Lead generation landing page id' })
  async getLandingPage(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.getLandingPage({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id);
  }

  @Patch('landing-pages/:id')
  @Permit('lead_gen', 'update')
  @ApiParam({ name: 'id', description: 'Lead generation landing page id' })
  @ApiBody({ type: UpdateLeadGenLandingPageDto })
  async updateLandingPage(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
    @Body() dto: UpdateLeadGenLandingPageDto
  ) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.updateLandingPage({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id, dto);
  }

  @Post('landing-pages/:id/publish')
  @Permit('lead_gen', 'update')
  @ApiParam({ name: 'id', description: 'Lead generation landing page id' })
  async publishLandingPage(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.publishLandingPage({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id);
  }

  @Post('landing-pages/:id/unpublish')
  @Permit('lead_gen', 'update')
  @ApiParam({ name: 'id', description: 'Lead generation landing page id' })
  async unpublishLandingPage(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.unpublishLandingPage({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id);
  }

  @Post('landing-pages/:id/archive')
  @Permit('lead_gen', 'update')
  @ApiParam({ name: 'id', description: 'Lead generation landing page id' })
  async archiveLandingPage(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.archiveLandingPage({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id);
  }

  @Get('audiences')
  @Permit('lead_gen', 'read')
  async listAudiences(@Req() req: FastifyRequest) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.listAudiences({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId });
  }

  @Post('audiences')
  @Permit('lead_gen', 'create')
  @ApiBody({ type: CreateLeadGenAudienceDto })
  async createAudience(@Req() req: FastifyRequest, @Body() dto: CreateLeadGenAudienceDto) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.createAudience({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, dto);
  }

  @Get('audiences/:id')
  @Permit('lead_gen', 'read')
  @ApiParam({ name: 'id', description: 'Audience id' })
  async getAudience(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.getAudience({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id);
  }

  @Patch('audiences/:id')
  @Permit('lead_gen', 'update')
  @ApiParam({ name: 'id', description: 'Audience id' })
  @ApiBody({ type: UpdateLeadGenAudienceDto })
  async updateAudience(@Req() req: FastifyRequest, @Param('id') id: string, @Body() dto: UpdateLeadGenAudienceDto) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.updateAudience({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id, dto);
  }

  @Post('audiences/:id/compute')
  @Permit('lead_gen', 'update')
  @ApiParam({ name: 'id', description: 'Audience id' })
  @ApiBody({ type: ComputeLeadGenAudienceDto })
  async computeAudience(@Req() req: FastifyRequest, @Param('id') id: string, @Body() dto: ComputeLeadGenAudienceDto) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.computeAudienceSnapshot({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id, dto);
  }

  @Get('audiences/:id/snapshots')
  @Permit('lead_gen', 'read')
  @ApiParam({ name: 'id', description: 'Audience id' })
  async listAudienceSnapshots(@Req() req: FastifyRequest, @Param('id') id: string) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.listAudienceSnapshots({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, id);
  }

  @Get('audiences/:id/export')
  @Permit('lead_gen', 'read')
  @ApiParam({ name: 'id', description: 'Audience id' })
  async exportAudience(
    @Req() req: FastifyRequest,
    @Param('id') id: string,
    @Query('snapshotId') snapshotId: string | undefined,
    @Res() reply: FastifyReply
  ) {
    const ctx = resolveRequestContext(req);
    const csv = await this.leadGen.buildAudienceExportCsv(
      { orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId },
      id,
      snapshotId ?? null
    );
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="audience_${id}.csv"`);
    return reply.send(csv);
  }

  @Post('conversions/record')
  @Permit('lead_gen', 'create')
  @ApiBody({ type: RecordLeadGenConversionEventDto })
  async recordConversion(@Req() req: FastifyRequest, @Body() dto: RecordLeadGenConversionEventDto) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.recordConversionEvent({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, dto);
  }

  @Get('conversions')
  @Permit('lead_gen', 'read')
  @ApiOkResponse({ schema: { type: 'array', items: { type: 'object' } } })
  async listConversions(@Req() req: FastifyRequest, @Query() query: ListLeadGenConversionEventsQueryDto) {
    const ctx = resolveRequestContext(req);
    return this.leadGen.listConversionEvents(
      { orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId },
      {
        campaignId: query.campaignId,
        landingPageId: query.landingPageId,
        eventType: query.eventType,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined
      }
    );
  }

  @Post('exports/conversions')
  @Permit('lead_gen', 'create')
  @ApiBody({ type: ExportLeadGenConversionsDto })
  async exportConversions(
    @Req() req: FastifyRequest,
    @Body() dto: ExportLeadGenConversionsDto,
    @Res() reply: FastifyReply
  ) {
    const ctx = resolveRequestContext(req);
    const result = await this.leadGen.exportConversions({ orgId: ctx.orgId, tenantId: ctx.tenantId, userId: ctx.userId }, dto);
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="conversions_${result.batchId}.csv"`);
    return reply.send(result.csv);
  }
}
