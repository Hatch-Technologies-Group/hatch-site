import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgListingContactType } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ContactOrgListingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(contactId: string, tenantId: string, type?: OrgListingContactType) {
    const person = await this.prisma.person.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
      select: { id: true, organizationId: true }
    });
    if (!person) {
      throw new NotFoundException('Contact not found');
    }

    return this.prisma.orgListingContact.findMany({
      where: {
        personId: person.id,
        type: type ?? undefined,
        listing: {
          organizationId: person.organizationId
        }
      },
      include: {
        listing: {
          include: {
            agentProfile: { include: { user: { select: { firstName: true, lastName: true, email: true } } } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async attach(contactId: string, tenantId: string, orgListingId: string, type: OrgListingContactType) {
    const person = await this.prisma.person.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
      select: { id: true, organizationId: true }
    });
    if (!person) {
      throw new NotFoundException('Contact not found');
    }

    const listing = await this.prisma.orgListing.findFirst({
      where: { id: orgListingId, organizationId: person.organizationId },
      select: { id: true }
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const existing = await this.prisma.orgListingContact.findFirst({
      where: { listingId: listing.id, personId: person.id, type }
    });
    if (existing) return existing;

    return this.prisma.orgListingContact.create({
      data: {
        listingId: listing.id,
        personId: person.id,
        type
      }
    });
  }

  async detach(
    contactId: string,
    tenantId: string,
    orgListingId: string,
    type?: OrgListingContactType
  ) {
    const person = await this.prisma.person.findFirst({
      where: { id: contactId, tenantId },
      select: { id: true, organizationId: true }
    });
    if (!person) {
      throw new NotFoundException('Contact not found');
    }

    const listing = await this.prisma.orgListing.findFirst({
      where: { id: orgListingId, organizationId: person.organizationId },
      select: { id: true }
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const result = await this.prisma.orgListingContact.deleteMany({
      where: {
        personId: person.id,
        listingId: listing.id,
        type: type ?? undefined
      }
    });

    if (type && result.count === 0) {
      throw new BadRequestException('No matching attachment found');
    }

    return { deleted: result.count };
  }
}

