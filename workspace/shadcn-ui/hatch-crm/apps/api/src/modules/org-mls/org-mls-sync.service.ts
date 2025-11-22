import { Injectable, Logger } from '@nestjs/common';
import { MlsProvider, MlsSyncStatus, PlaybookTriggerType } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { OrgMlsService } from './org-mls.service';
import { AuditService } from '../audit/audit.service';
import { PlaybookRunnerService } from '../playbooks/playbook-runner.service';

type RawListing = Record<string, any>;
type UpsertListingInput = Parameters<OrgMlsService['upsertSearchIndexForListing']>[0];

const DEFAULT_MOCK_LISTINGS: RawListing[] = [
  {
    mlsNumber: 'STELLAR-123456',
    address1: '123 Harbor Blvd',
    address2: 'Unit 18',
    city: 'Naples',
    state: 'FL',
    postalCode: '34102',
    country: 'US',
    propertyType: 'Single Family',
    listPrice: 875000,
    bedrooms: 4,
    bathrooms: 3,
    squareFeet: 2650,
    status: 'Active'
  },
  {
    mlsNumber: 'STELLAR-654321',
    address1: '45 Gulf Shore Dr',
    city: 'Naples',
    state: 'FL',
    postalCode: '34103',
    country: 'US',
    propertyType: 'Condo',
    listPrice: 1295000,
    bedrooms: 3,
    bathrooms: 2.5,
    squareFeet: 2100,
    status: 'Pending'
  },
  {
    mlsNumber: 'STELLAR-789012',
    address1: '301 Tarpon Bay Rd',
    city: 'Bonita Springs',
    state: 'FL',
    postalCode: '34135',
    propertyType: 'Rental',
    listPrice: 5200,
    bedrooms: 2,
    bathrooms: 2,
    squareFeet: 1450,
    status: 'Active',
    isRental: true
  }
];

@Injectable()
export class OrgMlsSyncService {
  private readonly logger = new Logger(OrgMlsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orgMlsService: OrgMlsService,
    private readonly auditService: AuditService,
    private readonly playbooks: PlaybookRunnerService
  ) {}

  async runSync(orgId: string, initiatedBy?: string) {
    const config = await this.prisma.mlsFeedConfig.findUnique({ where: { organizationId: orgId } });
    if (!config || !config.enabled) {
      throw new Error('MLS feed not configured or enabled for this organization');
    }

    const run = await this.prisma.mlsSyncRun.create({
      data: {
        organizationId: orgId,
        provider: config.provider,
        status: 'RUNNING'
      }
    });

    if (initiatedBy) {
      await this.auditService.log({
        organizationId: orgId,
        userId: initiatedBy,
        actionType: 'MLS_SYNC_TRIGGERED',
        summary: `MLS sync requested by ${initiatedBy}`,
        metadata: { runId: run.id }
      });
    }

    let totalFetched = 0;
    let totalUpserted = 0;
    let totalFailed = 0;
    let errorMessage: string | null = null;

    try {
      const listings = await this.fetchListings(config.provider);
      totalFetched = listings.length;

      for (const raw of listings) {
        try {
          const normalized = this.normalizeListing(raw, orgId, config.provider);
          await this.orgMlsService.upsertSearchIndexForListing(normalized);
          totalUpserted++;
        } catch (err) {
          totalFailed++;
          const message = err instanceof Error ? err.message : 'Unknown MLS normalization error';
          this.logger.error(`Failed to normalize MLS listing: ${message}`);
        }
      }

      const status: MlsSyncStatus = totalFailed > 0 ? 'FAILED' : 'SUCCESS';
      if (totalFailed > 0 && !errorMessage) {
        errorMessage = `${totalFailed} listing(s) failed to sync.`;
      }
      const finishedAt = new Date();

      await this.prisma.mlsSyncRun.update({
        where: { id: run.id },
        data: {
          status,
          finishedAt,
          totalFetched,
          totalUpserted,
          totalFailed,
          errorMessage
        }
      });

      await this.prisma.mlsFeedConfig.update({
        where: { organizationId: orgId },
        data: { lastIncrementalSyncAt: finishedAt }
      });

      void this.playbooks
        .runTrigger(orgId, PlaybookTriggerType.MLS_SYNC_COMPLETED, {
          runId: run.id,
          fetched: totalFetched,
          upserted: totalUpserted,
          failed: totalFailed,
          status
        })
        .catch(() => undefined);

      return this.prisma.mlsSyncRun.findUniqueOrThrow({ where: { id: run.id } });
    } catch (err: any) {
      errorMessage = err?.message ?? 'MLS sync failed';
      const finishedAt = new Date();

      await this.prisma.mlsSyncRun.update({
        where: { id: run.id },
        data: {
          status: 'FAILED',
          finishedAt,
          totalFetched,
          totalUpserted,
          totalFailed,
          errorMessage
        }
      });

      throw err;
    }
  }

  async listRecentRuns(orgId: string, limit = 10) {
    const take = Math.min(Math.max(limit, 1), 50);
    return this.prisma.mlsSyncRun.findMany({
      where: { organizationId: orgId },
      orderBy: { startedAt: 'desc' },
      take
    });
  }

  private async fetchListings(_provider: MlsProvider): Promise<RawListing[]> {
    const mockUrl = process.env.MLS_MOCK_URL;
    if (mockUrl) {
      const response = await fetch(mockUrl);
      if (!response.ok) {
        throw new Error(`MLS mock endpoint responded with status ${response.status}`);
      }

      const payload = await response.json();
      if (Array.isArray(payload)) return payload;
      if (Array.isArray(payload?.listings)) return payload.listings;
      if (Array.isArray(payload?.data)) return payload.data;
      return [];
    }

    return DEFAULT_MOCK_LISTINGS;
  }

  private normalizeListing(raw: RawListing, organizationId: string, provider: MlsProvider): UpsertListingInput {
    const toOptionalNumber = (value: unknown) => {
      if (value === null || value === undefined || value === '') return undefined;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : undefined;
    };

    const pickString = (...candidates: unknown[]) => {
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
          return candidate.trim();
        }
      }
      return undefined;
    };

    const status = pickString(raw.status, raw.Status, raw.listingStatus, raw.ListingStatus)?.toLowerCase();
    const activeStatuses = ['active', 'coming soon', 'new'];
    const isActive = status ? activeStatuses.includes(status) : true;
    const isRental = Boolean(
      raw.isRental ??
        (pickString(raw.propertyType, raw.PropertyType, raw.usage, raw.intent)?.toLowerCase().includes('rental') ?? false)
    );

    return {
      organizationId,
      mlsNumber: pickString(raw.mlsNumber, raw.mlsId, raw.MLSNumber, raw.ListingKey),
      mlsProvider: provider,
      addressLine1: pickString(raw.addressLine1, raw.address1, raw.streetAddress, raw.address?.line1) ?? 'Unknown Address',
      addressLine2: pickString(raw.addressLine2, raw.address2, raw.address?.line2),
      city: pickString(raw.city, raw.City, raw.address?.city) ?? 'Unknown City',
      state: pickString(raw.state, raw.State, raw.region, raw.address?.state) ?? 'Unknown State',
      postalCode: pickString(raw.postalCode, raw.zip, raw.Zip, raw.address?.postalCode) ?? '00000',
      country: pickString(raw.country, raw.Country, raw.address?.country) ?? 'US',
      propertyType: pickString(raw.propertyType, raw.PropertyType),
      listPrice: toOptionalNumber(raw.listPrice ?? raw.price ?? raw.ListPrice),
      bedrooms: toOptionalNumber(raw.bedrooms ?? raw.BedroomsTotal ?? raw.beds),
      bathrooms: toOptionalNumber(raw.bathrooms ?? raw.BathroomsTotalInteger ?? raw.baths),
      squareFeet: toOptionalNumber(raw.squareFeet ?? raw.LivingArea ?? raw.sqft),
      isActive,
      isRental
    };
  }
}
