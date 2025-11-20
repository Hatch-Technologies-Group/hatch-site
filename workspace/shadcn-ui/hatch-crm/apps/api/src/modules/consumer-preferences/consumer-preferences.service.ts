import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { SaveListingDto } from './dto/save-listing.dto';
import { CreateSavedSearchDto } from './dto/create-saved-search.dto';
import { UpdateSavedSearchDto } from './dto/update-saved-search.dto';

@Injectable()
export class ConsumerPreferencesService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertConsumer(organizationId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'CONSUMER') {
      throw new ForbiddenException('Only consumers can manage saved content');
    }
    // Future: validate org access
    return user;
  }

  async saveListing(orgId: string, consumerId: string, dto: SaveListingDto) {
    await this.assertConsumer(orgId, consumerId);
    const entry = await this.prisma.listingSearchIndex.findUnique({ where: { id: dto.searchIndexId } });
    if (!entry || entry.organizationId !== orgId) {
      throw new NotFoundException('Listing not found for this organization');
    }
    return this.prisma.savedListing.upsert({
      where: { consumerId_searchIndexId: { consumerId, searchIndexId: dto.searchIndexId } },
      update: {},
      create: {
        organizationId: orgId,
        consumerId,
        searchIndexId: dto.searchIndexId
      }
    });
  }

  async removeSavedListing(orgId: string, consumerId: string, searchIndexId: string) {
    await this.assertConsumer(orgId, consumerId);
    const existing = await this.prisma.savedListing.findUnique({
      where: { consumerId_searchIndexId: { consumerId, searchIndexId } }
    });
    if (!existing || existing.organizationId !== orgId) {
      throw new NotFoundException('Saved listing not found');
    }
    await this.prisma.savedListing.delete({ where: { id: existing.id } });
    return { success: true };
  }

  async listSavedListings(orgId: string, consumerId: string) {
    await this.assertConsumer(orgId, consumerId);
    return this.prisma.savedListing.findMany({
      where: { organizationId: orgId, consumerId },
      include: { searchIndex: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createSavedSearch(orgId: string, consumerId: string, dto: CreateSavedSearchDto) {
    await this.assertConsumer(orgId, consumerId);
    return this.prisma.savedSearch.create({
      data: {
        organizationId: orgId,
        consumerId,
        name: dto.name,
        criteria: dto.criteria as Prisma.InputJsonValue,
        alertsEnabled: dto.alertsEnabled ?? true,
        frequency: (dto.frequency ?? 'INSTANT') as any
      }
    });
  }

  async updateSavedSearch(orgId: string, consumerId: string, savedSearchId: string, dto: UpdateSavedSearchDto) {
    await this.assertConsumer(orgId, consumerId);
    const existing = await this.prisma.savedSearch.findUnique({ where: { id: savedSearchId } });
    if (!existing || existing.organizationId !== orgId || existing.consumerId !== consumerId) {
      throw new NotFoundException('Saved search not found');
    }
    return this.prisma.savedSearch.update({
      where: { id: savedSearchId },
      data: {
        name: dto.name ?? existing.name,
        criteria: (dto.criteria as Prisma.InputJsonValue | undefined) ?? existing.criteria,
        alertsEnabled: dto.alertsEnabled ?? existing.alertsEnabled,
        frequency: dto.frequency ? (dto.frequency as any) : existing.frequency
      }
    });
  }

  async deleteSavedSearch(orgId: string, consumerId: string, savedSearchId: string) {
    await this.assertConsumer(orgId, consumerId);
    const existing = await this.prisma.savedSearch.findUnique({ where: { id: savedSearchId } });
    if (!existing || existing.organizationId !== orgId || existing.consumerId !== consumerId) {
      throw new NotFoundException('Saved search not found');
    }
    await this.prisma.savedSearch.delete({ where: { id: savedSearchId } });
    return { success: true };
  }

  async listSavedSearches(orgId: string, consumerId: string) {
    await this.assertConsumer(orgId, consumerId);
    return this.prisma.savedSearch.findMany({
      where: { organizationId: orgId, consumerId },
      orderBy: { createdAt: 'desc' }
    });
  }

  private shouldRun(search: { frequency: string; lastRunAt: Date | null }, now: Date) {
    if (!search.lastRunAt) return true;
    const diff = now.getTime() - new Date(search.lastRunAt).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    switch (search.frequency) {
      case 'DAILY':
        return diff >= dayMs;
      case 'WEEKLY':
        return diff >= 7 * dayMs;
      default:
        return true;
    }
  }

  private buildNumberFilter(min?: number, max?: number, field?: 'listPrice' | 'bedrooms' | 'bathrooms') {
    if (min == null && max == null) return undefined;
    const filter: Record<string, number> = {};
    if (min != null) filter.gte = min;
    if (max != null) filter.lte = max;
    return { [field!]: filter } as Record<string, unknown>;
  }

  private extractSearchParams(criteria: Record<string, any>) {
    return {
      query: criteria?.query as string | undefined,
      city: criteria?.city as string | undefined,
      state: criteria?.state as string | undefined,
      postalCode: criteria?.postalCode as string | undefined,
      minPrice: criteria?.minPrice as number | undefined,
      maxPrice: criteria?.maxPrice as number | undefined,
      minBedrooms: criteria?.minBedrooms as number | undefined,
      maxBedrooms: criteria?.maxBedrooms as number | undefined,
      minBathrooms: criteria?.minBathrooms as number | undefined,
      maxBathrooms: criteria?.maxBathrooms as number | undefined,
      propertyType: criteria?.propertyType as string | undefined,
      isRental: criteria?.isRental as boolean | undefined
    };
  }

  async runSavedSearchAlertsForOrg(orgId: string, now = new Date()) {
    const savedSearches = await this.prisma.savedSearch.findMany({
      where: { organizationId: orgId, alertsEnabled: true }
    });

    const results: Array<{ savedSearchId: string; matchCount: number }> = [];
    for (const search of savedSearches) {
      if (!this.shouldRun(search, now)) {
        continue;
      }

      const params = this.extractSearchParams(search.criteria as Record<string, unknown>);
      const where: any = {
        organizationId: orgId,
        isActive: true,
        createdAt: { gt: search.lastRunAt ?? new Date(0) }
      };
      if (params.city) where.city = { equals: params.city, mode: 'insensitive' };
      if (params.state) where.state = { equals: params.state, mode: 'insensitive' };
      if (params.postalCode) where.postalCode = params.postalCode;
      if (params.propertyType) where.propertyType = { equals: params.propertyType, mode: 'insensitive' };
      if (typeof params.isRental === 'boolean') where.isRental = params.isRental;
      if (params.query && params.query.trim().length > 0) {
        where.searchText = { contains: params.query.trim().toLowerCase() };
      }
      Object.assign(where, this.buildNumberFilter(params.minPrice, params.maxPrice, 'listPrice'));
      Object.assign(where, this.buildNumberFilter(params.minBedrooms, params.maxBedrooms, 'bedrooms'));
      Object.assign(where, this.buildNumberFilter(params.minBathrooms, params.maxBathrooms, 'bathrooms'));

      const matches = await this.prisma.listingSearchIndex.count({ where });

      await this.prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastRunAt: now }
      });

      if (matches === 0) {
        continue;
      }

      await this.prisma.savedSearchAlertEvent.create({
        data: {
          savedSearchId: search.id,
          matchCount: matches,
          channel: 'email'
        }
      });
      await this.prisma.savedSearch.update({
        where: { id: search.id },
        data: { lastNotifiedAt: now }
      });
      results.push({ savedSearchId: search.id, matchCount: matches });
    }

    return { results };
  }
}
