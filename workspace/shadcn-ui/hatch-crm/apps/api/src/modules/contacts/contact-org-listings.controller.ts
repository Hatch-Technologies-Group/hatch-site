import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import { Permit } from '@/platform/security/permit.decorator';
import { resolveRequestContext } from '../common/request-context';
import { ContactOrgListingsService } from './contact-org-listings.service';
import { AttachOrgListingToContactDto, ListContactOrgListingsQueryDto } from './dto/contact-org-listings.dto';

@Controller('contacts/:contactId/org-listings')
export class ContactOrgListingsController {
  constructor(private readonly contactOrgListings: ContactOrgListingsService) {}

  @Get()
  @Permit('contacts', 'read')
  list(
    @Param('contactId') contactId: string,
    @Query() query: ListContactOrgListingsQueryDto,
    @Query('tenantId') tenantId: string | undefined,
    @Req() req: FastifyRequest
  ) {
    const ctx = resolveRequestContext(req);
    const resolvedTenantId = tenantId ?? ctx.tenantId;
    return this.contactOrgListings.list(contactId, resolvedTenantId, query.type);
  }

  @Post()
  @Permit('contacts', 'update')
  attach(
    @Param('contactId') contactId: string,
    @Query('tenantId') tenantId: string | undefined,
    @Body() dto: AttachOrgListingToContactDto,
    @Req() req: FastifyRequest
  ) {
    const ctx = resolveRequestContext(req);
    const resolvedTenantId = tenantId ?? ctx.tenantId;
    return this.contactOrgListings.attach(contactId, resolvedTenantId, dto.orgListingId, dto.type);
  }

  @Delete(':orgListingId')
  @Permit('contacts', 'update')
  detach(
    @Param('contactId') contactId: string,
    @Param('orgListingId') orgListingId: string,
    @Query() query: ListContactOrgListingsQueryDto,
    @Query('tenantId') tenantId: string | undefined,
    @Req() req: FastifyRequest
  ) {
    const ctx = resolveRequestContext(req);
    const resolvedTenantId = tenantId ?? ctx.tenantId;
    return this.contactOrgListings.detach(contactId, resolvedTenantId, orgListingId, query.type);
  }
}

