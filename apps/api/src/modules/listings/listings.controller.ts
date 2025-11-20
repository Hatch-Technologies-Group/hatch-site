import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '@/auth/jwt-auth.guard';
import { RolesGuard } from '@/auth/roles.guard';
import { ListingsService } from './listings.service';
import { CreateListingDto } from './dto/create-listing.dto';
import { UpdateListingDto } from './dto/update-listing.dto';
import { AttachListingDocumentDto } from './dto/attach-listing-document.dto';

interface AuthedRequest {
  user?: { userId?: string };
}

@ApiTags('listings')
@ApiBearerAuth()
@Controller('organizations/:orgId/listings')
export class ListingsController {
  constructor(private readonly svc: ListingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@Param('orgId') orgId: string, @Req() req: AuthedRequest, @Body() dto: CreateListingDto) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.createListing(orgId, userId, dto);
  }

  @Patch(':listingId')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('orgId') orgId: string,
    @Param('listingId') listingId: string,
    @Req() req: AuthedRequest,
    @Body() dto: UpdateListingDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.updateListing(orgId, userId, listingId, dto);
  }

  @Post(':listingId/request-approval')
  @UseGuards(JwtAuthGuard)
  requestApproval(
    @Param('orgId') orgId: string,
    @Param('listingId') listingId: string,
    @Req() req: AuthedRequest
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.requestListingApproval(orgId, userId, listingId);
  }

  @Post(':listingId/approve')
  @UseGuards(JwtAuthGuard, RolesGuard('broker'))
  approve(@Param('orgId') orgId: string, @Param('listingId') listingId: string, @Req() req: AuthedRequest) {
    const brokerUserId = req.user?.userId;
    if (!brokerUserId) throw new Error('Missing user context');
    return this.svc.approveListing(orgId, brokerUserId, listingId);
  }

  @Post(':listingId/documents')
  @UseGuards(JwtAuthGuard)
  attachDocument(
    @Param('orgId') orgId: string,
    @Param('listingId') listingId: string,
    @Req() req: AuthedRequest,
    @Body() dto: AttachListingDocumentDto
  ) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.attachListingDocument(orgId, userId, listingId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  list(@Param('orgId') orgId: string, @Req() req: AuthedRequest) {
    const userId = req.user?.userId;
    if (!userId) throw new Error('Missing user context');
    return this.svc.listListingsForOrg(orgId, userId);
  }
}

