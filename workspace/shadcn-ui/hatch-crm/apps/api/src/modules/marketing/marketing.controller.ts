import { Body, Controller, Get, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';

import { CreateMarketingCampaignDto } from './dto/create-marketing-campaign.dto';
import { GenerateDraftDto } from './dto/generate-draft.dto';
import { MarketingService } from './marketing.service';

@Controller('marketing')
@UseGuards(JwtAuthGuard)
export class MarketingController {
  constructor(private readonly marketing: MarketingService) {}

  @Get('campaigns')
  async listCampaigns(@Req() req: any, @Query('filter') filter?: 'all' | 'draft' | 'scheduled' | 'sent') {
    const tenantId = req.user?.tenantId;
    return this.marketing.listCampaigns(tenantId, filter);
  }

  @Post('campaigns')
  async createCampaign(@Req() req: any, @Body() body: CreateMarketingCampaignDto) {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id ?? null;
    return this.marketing.createCampaign(tenantId, userId, body);
  }

  @Post('draft')
  async generateDraft(@Body() body: GenerateDraftDto) {
    return this.marketing.generateDraft(body);
  }
}
