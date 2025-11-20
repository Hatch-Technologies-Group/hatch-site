import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { OrgMlsService } from './org-mls.service';
import { ConfigureMlsDto } from './dto/configure-mls.dto';
import { SearchListingsDto } from './dto/search-listings.dto';

interface AuthedRequest {
  user?: { userId?: string };
}

@Controller('organizations/:orgId/mls')
export class OrgMlsController {
  constructor(private readonly orgMlsService: OrgMlsService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  getConfig(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.orgMlsService.getMlsConfig(orgId, userId);
  }

  @Post('configure')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  configureMls(@Param('orgId') orgId: string, @Body() dto: ConfigureMlsDto, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.orgMlsService.configureMls(orgId, userId, dto);
  }

  @Post('ingest')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  ingestListing(
    @Param('orgId') orgId: string,
    @Req() req: AuthedRequest,
    @Body()
    body: {
      listingId?: string | null;
      mlsNumber?: string | null;
      mlsProvider?: 'STELLAR' | 'NABOR' | 'MATRIX' | 'GENERIC' | null;
      addressLine1: string;
      addressLine2?: string | null;
      city: string;
      state: string;
      postalCode: string;
      country?: string | null;
      propertyType?: string | null;
      listPrice?: number | null;
      bedrooms?: number | null;
      bathrooms?: number | null;
      squareFeet?: number | null;
      isActive?: boolean;
      isRental?: boolean;
    }
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.orgMlsService.ingestListing(orgId, userId, body);
  }

  @Get('search')
  searchListings(@Param('orgId') orgId: string, @Query() query: SearchListingsDto) {
    return this.orgMlsService.searchListings(orgId, query);
  }
}
