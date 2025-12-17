import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { MarketingStudioService } from './marketing-studio.service';
import { CreateMarketingStudioTemplateDto } from './dto/create-template.dto';
import { GenerateMarketingStudioAssetDto } from './dto/generate-asset.dto';
import { PresignMarketingStudioTemplateDto } from './dto/presign-template.dto';

type AuthedRequest = FastifyRequest & {
  user?: {
    userId?: string;
    sub?: string;
  };
};

@ApiTags('marketing-studio', 'beta')
@ApiBearerAuth()
@Controller('organizations/:orgId/marketing-studio')
@UseGuards(JwtAuthGuard)
export class MarketingStudioController {
  constructor(private readonly svc: MarketingStudioService) {}

  @Get('templates')
  async listTemplates(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listTemplates(orgId, userId);
  }

  @Post('templates/seed')
  async seedTemplates(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.svc.seedDefaultTemplates(orgId, userId);
  }

  @Post('templates/presign')
  async presignTemplateUpload(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body() dto: PresignMarketingStudioTemplateDto
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.svc.presignTemplateUpload(orgId, userId, dto);
  }

  @Post('templates')
  async createTemplate(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body() dto: CreateMarketingStudioTemplateDto
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.svc.createTemplate(orgId, userId, dto);
  }

  @Get('listings/:listingId/assets')
  async listAssets(
    @Param('orgId') orgId: string,
    @Param('listingId') listingId: string,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listAssets(orgId, listingId, userId);
  }

  @Get('listings/:listingId/images')
  async listListingImages(
    @Param('orgId') orgId: string,
    @Param('listingId') listingId: string,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listListingImages(orgId, listingId, userId);
  }

  @Post('listings/:listingId/assets')
  async generateAsset(
    @Param('orgId') orgId: string,
    @Param('listingId') listingId: string,
    @Req() req: AuthedRequest,
    @Body() dto: GenerateMarketingStudioAssetDto
  ) {
    const userId = req.user?.userId ?? req.user?.sub;
    if (!userId) throw new Error('Missing user context');
    return this.svc.generateAsset(orgId, listingId, userId, dto);
  }
}
