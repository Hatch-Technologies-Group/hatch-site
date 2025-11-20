import { ForbiddenException, Injectable } from '@nestjs/common';
import { MlsProvider, Prisma } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { ConfigureMlsDto } from './dto/configure-mls.dto';
import { SearchListingsDto } from './dto/search-listings.dto';

@Injectable()
export class OrgMlsService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertUserInOrg(orgId: string, userId: string) {
    const membership = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } }
    });
    if (!membership) {
      throw new ForbiddenException('User is not a member of this organization');
    }
    return membership;
  }

  private async assertUserIsBroker(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'BROKER') {
      throw new ForbiddenException('Broker access required');
    }
    await this.assertUserInOrg(orgId, userId);
  }

  async getMlsConfig(orgId: string, userId: string) {
    await this.assertUserIsBroker(orgId, userId);
    return this.prisma.mlsFeedConfig.findUnique({ where: { organizationId: orgId } });
  }

  async configureMls(orgId: string, userId: string, dto: ConfigureMlsDto) {
    await this.assertUserIsBroker(orgId, userId);
    return this.prisma.mlsFeedConfig.upsert({
      where: { organizationId: orgId },
      update: {
        provider: dto.provider,
        officeCode: dto.officeCode ?? null,
        brokerId: dto.brokerId ?? null,
        boardName: dto.boardName ?? null,
        boardUrl: dto.boardUrl ?? null,
        enabled: dto.enabled ?? true
      },
      create: {
        organizationId: orgId,
        provider: dto.provider,
        officeCode: dto.officeCode ?? null,
        brokerId: dto.brokerId ?? null,
        boardName: dto.boardName ?? null,
        boardUrl: dto.boardUrl ?? null,
        enabled: dto.enabled ?? true
      }
    });
  }

  async ingestListing(
    orgId: string,
    brokerUserId: string,
    payload: Omit<Parameters<typeof this.upsertSearchIndexForListing>[0], 'organizationId'>
  ) {
    await this.assertUserIsBroker(orgId, brokerUserId);
    return this.upsertSearchIndexForListing({
      organizationId: orgId,
      ...payload
    });
  }

  async upsertSearchIndexForListing(params: {
    organizationId: string;
    listingId?: string;
    mlsNumber?: string;
    mlsProvider?: string;
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    postalCode: string;
    country?: string;
    propertyType?: string;
    listPrice?: number;
    bedrooms?: number;
    bathrooms?: number;
    squareFeet?: number;
    isActive?: boolean;
    isRental?: boolean;
  }) {
    const {
      organizationId,
      listingId,
      mlsNumber,
      mlsProvider,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      propertyType,
      listPrice,
      bedrooms,
      bathrooms,
      squareFeet,
      isActive,
      isRental
    } = params;

    const searchTextParts = [addressLine1, addressLine2, city, state, postalCode, propertyType, mlsNumber].filter(Boolean);
    const searchText = searchTextParts.join(' ').toLowerCase();

    let existing: Awaited<ReturnType<typeof this.prisma.listingSearchIndex.findFirst>> | null = null;
    if (listingId) {
      existing = await this.prisma.listingSearchIndex.findFirst({
        where: { organizationId, listingId }
      });
    } else if (mlsNumber) {
      existing = await this.prisma.listingSearchIndex.findFirst({
        where: { organizationId, mlsNumber }
      });
    }

    const providerValue = mlsProvider ? (mlsProvider.toUpperCase() as MlsProvider) : undefined;

    const data = {
      organizationId,
      listingId: listingId ?? undefined,
      mlsNumber: mlsNumber ?? undefined,
      mlsProvider: providerValue,
      addressLine1,
      addressLine2: addressLine2 ?? undefined,
      city,
      state,
      postalCode,
      country: country ?? undefined,
      propertyType: propertyType ?? undefined,
      listPrice: listPrice ?? undefined,
      bedrooms: bedrooms ?? undefined,
      bathrooms: bathrooms ?? undefined,
      squareFeet: squareFeet ?? undefined,
      isActive: isActive ?? true,
      isRental: isRental ?? false,
      searchText
    };

    if (existing) {
      return this.prisma.listingSearchIndex.update({
        where: { id: existing.id },
        data
      });
    }

    return this.prisma.listingSearchIndex.create({ data });
  }

  async searchListings(orgId: string, dto: SearchListingsDto) {
    const {
      query,
      city,
      state,
      postalCode,
      minPrice,
      maxPrice,
      minBedrooms,
      maxBedrooms,
      minBathrooms,
      maxBathrooms,
      propertyType,
      isRental,
      limit = 20,
      offset = 0
    } = dto;

    const where: Prisma.ListingSearchIndexWhereInput = {
      organizationId: orgId,
      isActive: true
    };

    if (city) where['city'] = { equals: city, mode: 'insensitive' };
    if (state) where['state'] = { equals: state, mode: 'insensitive' };
    if (postalCode) where['postalCode'] = { equals: postalCode };
    if (propertyType) where['propertyType'] = { equals: propertyType, mode: 'insensitive' };
    if (isRental !== undefined) where['isRental'] = isRental;

    if (minPrice !== undefined || maxPrice !== undefined) {
      const priceFilter: Prisma.IntNullableFilter = {};
      if (minPrice !== undefined) priceFilter['gte'] = minPrice;
      if (maxPrice !== undefined) priceFilter['lte'] = maxPrice;
      where['listPrice'] = priceFilter;
    }

    if (minBedrooms !== undefined || maxBedrooms !== undefined) {
      const bedroomFilter: Prisma.IntNullableFilter = {};
      if (minBedrooms !== undefined) bedroomFilter['gte'] = minBedrooms;
      if (maxBedrooms !== undefined) bedroomFilter['lte'] = maxBedrooms;
      where['bedrooms'] = bedroomFilter;
    }

    if (minBathrooms !== undefined || maxBathrooms !== undefined) {
      const bathroomFilter: Prisma.FloatNullableFilter = {};
      if (minBathrooms !== undefined) bathroomFilter['gte'] = minBathrooms;
      if (maxBathrooms !== undefined) bathroomFilter['lte'] = maxBathrooms;
      where['bathrooms'] = bathroomFilter;
    }

    if (query && query.trim().length > 0) {
      const q = query.trim().toLowerCase();
      where['searchText'] = { contains: q, mode: 'insensitive' };
    }

    const safeLimit = Math.min(Math.max(limit ?? 20, 1), 100);
    const safeOffset = Math.max(offset ?? 0, 0);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.listingSearchIndex.findMany({
        where,
        orderBy: [{ listPrice: 'asc' }, { createdAt: 'desc' }],
        skip: safeOffset,
        take: safeLimit
      }),
      this.prisma.listingSearchIndex.count({ where })
    ]);

    return { items, total, limit: safeLimit, offset: safeOffset };
  }
}
