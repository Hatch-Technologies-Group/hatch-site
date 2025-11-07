import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { Permit } from '@/platform/security/permit.decorator';

import { ContactListingsService } from './contact-listings.service';

@Controller('contacts/:contactId/listings')
@UseGuards(AuthGuard('oidc'))
export class ContactListingsController {
  constructor(private readonly listings: ContactListingsService) {}

  @Get('sent')
  @Permit('contacts', 'read')
  async sent(
    @Param('contactId') contactId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ) {
    return this.listings.getSent(contactId, { limit: parseLimit(limit), cursor });
  }

  @Get('favorites')
  @Permit('contacts', 'read')
  async favorites(
    @Param('contactId') contactId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string
  ) {
    return this.listings.getFavorites(contactId, { limit: parseLimit(limit), cursor });
  }
}

function parseLimit(limit?: string): number {
  const parsed = Number(limit);
  if (!Number.isFinite(parsed)) {
    return 20;
  }
  const whole = Math.floor(parsed);
  return Math.min(Math.max(whole, 1), 50);
}
