import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { ConsumerPreferencesService } from './consumer-preferences.service';
import { SaveListingDto } from './dto/save-listing.dto';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';

@Controller('organizations/:orgId/consumer')
@UseGuards(JwtAuthGuard)
export class ConsumerPreferencesController {
  constructor(private readonly service: ConsumerPreferencesService) {}

  @Post('saved-listings')
  saveListing(@Param('orgId') orgId: string, @Body() dto: SaveListingDto, @Req() req: any) {
    const consumerId = req.user?.userId ?? req.user?.sub;
    if (!consumerId) throw new Error('Missing user context');
    return this.service.saveListing(orgId, consumerId, dto);
  }

  @Delete('saved-listings/:searchIndexId')
  removeSavedListing(@Param('orgId') orgId: string, @Param('searchIndexId') searchIndexId: string, @Req() req: any) {
    const consumerId = req.user?.userId ?? req.user?.sub;
    if (!consumerId) throw new Error('Missing user context');
    return this.service.removeSavedListing(orgId, consumerId, searchIndexId);
  }

  @Get('saved-listings')
  listSavedListings(@Param('orgId') orgId: string, @Req() req: any) {
    const consumerId = req.user?.userId ?? req.user?.sub;
    if (!consumerId) throw new Error('Missing user context');
    return this.service.listSavedListings(orgId, consumerId);
  }

  @Post('saved-searches')
  createSavedSearch(@Param('orgId') orgId: string, @Body() dto: CreateSavedSearchDto, @Req() req: any) {
    const consumerId = req.user?.userId ?? req.user?.sub;
    if (!consumerId) throw new Error('Missing user context');
    return this.service.createSavedSearch(orgId, consumerId, dto);
  }

  @Patch('saved-searches/:id')
  updateSavedSearch(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateSavedSearchDto,
    @Req() req: any
  ) {
    const consumerId = req.user?.userId ?? req.user?.sub;
    if (!consumerId) throw new Error('Missing user context');
    return this.service.updateSavedSearch(orgId, consumerId, id, dto);
  }

  @Delete('saved-searches/:id')
  deleteSavedSearch(@Param('orgId') orgId: string, @Param('id') id: string, @Req() req: any) {
    const consumerId = req.user?.userId ?? req.user?.sub;
    if (!consumerId) throw new Error('Missing user context');
    return this.service.deleteSavedSearch(orgId, consumerId, id);
  }

  @Get('saved-searches')
  listSavedSearches(@Param('orgId') orgId: string, @Req() req: any) {
    const consumerId = req.user?.userId ?? req.user?.sub;
    if (!consumerId) throw new Error('Missing user context');
    return this.service.listSavedSearches(orgId, consumerId);
  }
}
