import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  LeadGenAudienceStatus,
  LeadGenCampaignStatus,
  LeadGenConversionEventType,
  LeadGenExportStatus,
  LeadGenLandingPageStatus,
  PersonStage,
  Prisma
} from '@hatch/db';

import { assertJsonSafe, toJsonValue, toNullableJson } from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { OrgLeadsService } from '../org-leads/org-leads.service';
import type { CreateLeadDto as PortalCreateLeadDto } from '../org-leads/dto/create-lead.dto';
import {
  ComputeLeadGenAudienceDto,
  CreateLeadGenAudienceDto,
  UpdateLeadGenAudienceDto
} from './dto/audience.dto';
import {
  CreateLeadGenCampaignDto,
  UpdateLeadGenCampaignDto,
  UpsertLeadGenCampaignSpendDto
} from './dto/campaign.dto';
import {
  CreateLeadGenLandingPageDto,
  UpdateLeadGenLandingPageDto
} from './dto/landing-page.dto';
import { ExportLeadGenConversionsDto, RecordLeadGenConversionEventDto } from './dto/conversion-events.dto';
import { normalizeEmail, normalizePhone, parseDateOnlyToUtc, sha256Hex, slugify } from './lead-gen.utils';

const isPrismaUniqueConstraintError = (error: unknown) =>
  typeof (error as { code?: string } | undefined)?.code === 'string' && (error as { code?: string }).code === 'P2002';

export interface LeadGenRequestContext {
  orgId: string;
  tenantId: string;
  userId: string;
}

@Injectable()
export class LeadGenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgLeads: OrgLeadsService
  ) {}

  async listCampaigns(ctx: LeadGenRequestContext) {
    return this.prisma.leadGenCampaign.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createCampaign(ctx: LeadGenRequestContext, dto: CreateLeadGenCampaignDto) {
    const slug = (dto.slug ?? slugify(dto.name)).trim() || null;
    assertJsonSafe(dto.targeting, 'leadGenCampaign.targeting');

    try {
      return await this.prisma.leadGenCampaign.create({
        data: {
          organizationId: ctx.orgId,
          tenantId: ctx.tenantId || undefined,
          createdByUserId: ctx.userId || undefined,
          name: dto.name.trim(),
          slug,
          channel: dto.channel,
          objective: dto.objective,
          status: dto.status ?? LeadGenCampaignStatus.DRAFT,
          utmSource: dto.utmSource?.trim() || undefined,
          utmMedium: dto.utmMedium?.trim() || undefined,
          utmCampaign: dto.utmCampaign?.trim() || undefined,
          startAt: dto.startAt ? new Date(dto.startAt) : undefined,
          endAt: dto.endAt ? new Date(dto.endAt) : undefined,
          dailyBudgetCents: dto.dailyBudgetCents ?? undefined,
          totalBudgetCents: dto.totalBudgetCents ?? undefined,
          currency: dto.currency?.trim() || undefined,
          targeting: dto.targeting ? toJsonValue(dto.targeting) : undefined,
          creativeBrief: dto.creativeBrief ?? undefined,
          notes: dto.notes ?? undefined
        }
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Campaign slug already exists for organization');
      }
      throw error;
    }
  }

  async getCampaign(ctx: LeadGenRequestContext, id: string) {
    const campaign = await this.prisma.leadGenCampaign.findUnique({ where: { id } });
    if (!campaign || campaign.organizationId !== ctx.orgId) {
      throw new NotFoundException('Campaign not found');
    }
    return campaign;
  }

  async updateCampaign(ctx: LeadGenRequestContext, id: string, dto: UpdateLeadGenCampaignDto) {
    await this.getCampaign(ctx, id);
    assertJsonSafe(dto.targeting, 'leadGenCampaign.targeting');

    const slug = dto.slug !== undefined ? (dto.slug ? slugify(dto.slug) : null) : undefined;

    try {
      return await this.prisma.leadGenCampaign.update({
        where: { id },
        data: {
          name: dto.name?.trim(),
          slug,
          channel: dto.channel ?? undefined,
          objective: dto.objective ?? undefined,
          status: dto.status ?? undefined,
          utmSource: dto.utmSource === undefined ? undefined : dto.utmSource?.trim() || null,
          utmMedium: dto.utmMedium === undefined ? undefined : dto.utmMedium?.trim() || null,
          utmCampaign: dto.utmCampaign === undefined ? undefined : dto.utmCampaign?.trim() || null,
          startAt: dto.startAt === undefined ? undefined : dto.startAt ? new Date(dto.startAt) : null,
          endAt: dto.endAt === undefined ? undefined : dto.endAt ? new Date(dto.endAt) : null,
          dailyBudgetCents: dto.dailyBudgetCents === undefined ? undefined : dto.dailyBudgetCents,
          totalBudgetCents: dto.totalBudgetCents === undefined ? undefined : dto.totalBudgetCents,
          currency: dto.currency?.trim() || undefined,
          targeting: dto.targeting === undefined ? undefined : dto.targeting ? toJsonValue(dto.targeting) : Prisma.JsonNull,
          creativeBrief: dto.creativeBrief === undefined ? undefined : dto.creativeBrief,
          notes: dto.notes === undefined ? undefined : dto.notes
        }
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Campaign slug already exists for organization');
      }
      throw error;
    }
  }

  async upsertCampaignSpend(ctx: LeadGenRequestContext, campaignId: string, dto: UpsertLeadGenCampaignSpendDto) {
    await this.getCampaign(ctx, campaignId);

    const date = parseDateOnlyToUtc(dto.date);
    if (!date) {
      throw new BadRequestException('Invalid date (expected YYYY-MM-DD or ISO timestamp)');
    }

    return this.prisma.leadGenCampaignSpendDaily.upsert({
      where: { campaignId_date: { campaignId, date } },
      create: {
        campaignId,
        date,
        amountCents: dto.amountCents,
        currency: dto.currency?.trim() || undefined,
        source: dto.source?.trim() || undefined
      },
      update: {
        amountCents: dto.amountCents,
        currency: dto.currency?.trim() || undefined,
        source: dto.source?.trim() || undefined
      }
    });
  }

  async campaignMetrics(ctx: LeadGenRequestContext, campaignId: string) {
    const campaign = await this.getCampaign(ctx, campaignId);

    const [spendAgg, leadsCreated, qualified, appointments] = await Promise.all([
      this.prisma.leadGenCampaignSpendDaily.aggregate({
        where: { campaignId },
        _sum: { amountCents: true }
      }),
      this.prisma.leadGenConversionEvent.count({
        where: { organizationId: ctx.orgId, campaignId, eventType: LeadGenConversionEventType.LEAD_CREATED }
      }),
      this.prisma.leadGenConversionEvent.count({
        where: { organizationId: ctx.orgId, campaignId, eventType: LeadGenConversionEventType.LEAD_QUALIFIED }
      }),
      this.prisma.leadGenConversionEvent.count({
        where: { organizationId: ctx.orgId, campaignId, eventType: LeadGenConversionEventType.APPOINTMENT_SET }
      })
    ]);

    const spendCents = spendAgg._sum.amountCents ?? 0;
    const cpl = leadsCreated > 0 ? Math.round(spendCents / leadsCreated) : null;

    return {
      campaignId: campaign.id,
      spendCents,
      leadsCreated,
      qualified,
      appointments,
      costPerLeadCents: cpl
    };
  }

  async listLandingPages(ctx: LeadGenRequestContext) {
    return this.prisma.leadGenLandingPage.findMany({
      where: { organizationId: ctx.orgId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createLandingPage(ctx: LeadGenRequestContext, dto: CreateLeadGenLandingPageDto) {
    assertJsonSafe(dto.layout, 'leadGenLandingPage.layout');
    assertJsonSafe(dto.formSchema, 'leadGenLandingPage.formSchema');

    try {
      return await this.prisma.leadGenLandingPage.create({
        data: {
          organizationId: ctx.orgId,
          tenantId: ctx.tenantId || undefined,
          createdByUserId: ctx.userId || undefined,
          slug: slugify(dto.slug, 100) || dto.slug.trim(),
          status: dto.status ?? LeadGenLandingPageStatus.DRAFT,
          title: dto.title.trim(),
          description: dto.description ?? undefined,
          seoTitle: dto.seoTitle ?? undefined,
          seoDescription: dto.seoDescription ?? undefined,
          campaignId: dto.campaignId ?? undefined,
          listingId: dto.listingId ?? undefined,
          layout: toJsonValue(dto.layout),
          formSchema: dto.formSchema ? toJsonValue(dto.formSchema) : Prisma.JsonNull
        }
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Landing page slug already exists for organization');
      }
      throw error;
    }
  }

  async getLandingPage(ctx: LeadGenRequestContext, id: string) {
    const page = await this.prisma.leadGenLandingPage.findUnique({ where: { id } });
    if (!page || page.organizationId !== ctx.orgId) {
      throw new NotFoundException('Landing page not found');
    }
    return page;
  }

  async updateLandingPage(ctx: LeadGenRequestContext, id: string, dto: UpdateLeadGenLandingPageDto) {
    await this.getLandingPage(ctx, id);
    assertJsonSafe(dto.layout, 'leadGenLandingPage.layout');
    assertJsonSafe(dto.formSchema, 'leadGenLandingPage.formSchema');

    const slug = dto.slug !== undefined ? (slugify(dto.slug, 100) || dto.slug.trim()) : undefined;

    try {
      return await this.prisma.leadGenLandingPage.update({
        where: { id },
        data: {
          slug,
          title: dto.title?.trim(),
          description: dto.description === undefined ? undefined : dto.description,
          seoTitle: dto.seoTitle === undefined ? undefined : dto.seoTitle,
          seoDescription: dto.seoDescription === undefined ? undefined : dto.seoDescription,
          campaignId: dto.campaignId === undefined ? undefined : dto.campaignId,
          listingId: dto.listingId === undefined ? undefined : dto.listingId,
          status: dto.status ?? undefined,
          layout: dto.layout === undefined ? undefined : toJsonValue(dto.layout),
          formSchema:
            dto.formSchema === undefined
              ? undefined
              : dto.formSchema
                ? toJsonValue(dto.formSchema)
                : Prisma.JsonNull
        }
      });
    } catch (error) {
      if (isPrismaUniqueConstraintError(error)) {
        throw new ConflictException('Landing page slug already exists for organization');
      }
      throw error;
    }
  }

  async publishLandingPage(ctx: LeadGenRequestContext, id: string) {
    await this.getLandingPage(ctx, id);
    return this.prisma.leadGenLandingPage.update({
      where: { id },
      data: {
        status: LeadGenLandingPageStatus.PUBLISHED,
        publishedAt: new Date()
      }
    });
  }

  async unpublishLandingPage(ctx: LeadGenRequestContext, id: string) {
    await this.getLandingPage(ctx, id);
    return this.prisma.leadGenLandingPage.update({
      where: { id },
      data: {
        status: LeadGenLandingPageStatus.DRAFT,
        publishedAt: null
      }
    });
  }

  async archiveLandingPage(ctx: LeadGenRequestContext, id: string) {
    await this.getLandingPage(ctx, id);
    return this.prisma.leadGenLandingPage.update({
      where: { id },
      data: {
        status: LeadGenLandingPageStatus.ARCHIVED
      }
    });
  }

  async getPublicLandingPage(orgId: string, slug: string) {
    const page = await this.prisma.leadGenLandingPage.findFirst({
      where: {
        organizationId: orgId,
        slug,
        status: LeadGenLandingPageStatus.PUBLISHED
      }
    });
    if (!page) {
      throw new NotFoundException('Landing page not found');
    }
    return page;
  }

  async submitPublicLandingPageLead(params: {
    orgId: string;
    slug: string;
    dto: PortalCreateLeadDto;
    req?: { ip?: string; headers?: Record<string, unknown> };
  }) {
    const page = await this.getPublicLandingPage(params.orgId, params.slug);

    const leadGenMeta = {
      leadGen: {
        landingPageId: page.id,
        campaignId: page.campaignId ?? null
      }
    };

    const enrichedDto: PortalCreateLeadDto = {
      ...params.dto,
      metadata: {
        ...(params.dto.metadata ?? {}),
        ...leadGenMeta
      }
    };

    const lead = await this.orgLeads.createLeadFromPortal(params.orgId, null, enrichedDto, params.req);

    await this.prisma.leadGenConversionEvent.create({
      data: {
        organizationId: params.orgId,
        tenantId: lead.tenantId ?? undefined,
        personId: lead.personId ?? undefined,
        leadId: lead.id,
        campaignId: page.campaignId ?? undefined,
        landingPageId: page.id,
        eventType: LeadGenConversionEventType.LEAD_CREATED,
        occurredAt: lead.createdAt,
        attribution: toNullableJson((lead.metadata as any)?.attribution ?? (lead.metadata as any)?.custom?.attribution ?? null)
      }
    });

    return lead;
  }

  async listAudiences(ctx: LeadGenRequestContext) {
    return this.prisma.leadGenAudience.findMany({
      where: { tenantId: ctx.tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async createAudience(ctx: LeadGenRequestContext, dto: CreateLeadGenAudienceDto) {
    assertJsonSafe(dto.definition, 'leadGenAudience.definition');
    return this.prisma.leadGenAudience.create({
      data: {
        tenantId: ctx.tenantId,
        name: dto.name.trim(),
        status: dto.status ?? LeadGenAudienceStatus.DRAFT,
        definition: toJsonValue(dto.definition)
      }
    });
  }

  async getAudience(ctx: LeadGenRequestContext, id: string) {
    const audience = await this.prisma.leadGenAudience.findUnique({ where: { id } });
    if (!audience || audience.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Audience not found');
    }
    return audience;
  }

  async updateAudience(ctx: LeadGenRequestContext, id: string, dto: UpdateLeadGenAudienceDto) {
    await this.getAudience(ctx, id);
    assertJsonSafe(dto.definition, 'leadGenAudience.definition');
    return this.prisma.leadGenAudience.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        status: dto.status ?? undefined,
        definition: dto.definition === undefined ? undefined : toJsonValue(dto.definition)
      }
    });
  }

  async computeAudienceSnapshot(ctx: LeadGenRequestContext, id: string, dto: ComputeLeadGenAudienceDto) {
    const audience = await this.getAudience(ctx, id);
    const definition = (audience.definition as unknown as Record<string, any> | null) ?? {};
    const filters = (definition.filters as Record<string, any> | null) ?? {};

    const where = this.buildPersonWhereFromAudienceFilters(ctx, filters);
    const members = await this.prisma.person.findMany({
      where,
      select: { id: true, primaryEmail: true, primaryPhone: true }
    });

    const now = new Date();
    const snapshot = await this.prisma.leadGenAudienceSnapshot.create({
      data: {
        audienceId: audience.id,
        computedAt: now,
        memberCount: members.length,
        exportFormat: dto.exportFormat?.trim() || 'csv',
        metadata: toNullableJson({
          memberIds: members.map((m) => m.id)
        })
      }
    });

    await this.prisma.leadGenAudience.update({
      where: { id: audience.id },
      data: {
        lastComputedAt: now,
        lastCount: members.length,
        status: audience.status === LeadGenAudienceStatus.ARCHIVED ? LeadGenAudienceStatus.ARCHIVED : LeadGenAudienceStatus.ACTIVE
      }
    });

    return snapshot;
  }

  async listAudienceSnapshots(ctx: LeadGenRequestContext, id: string) {
    await this.getAudience(ctx, id);
    return this.prisma.leadGenAudienceSnapshot.findMany({
      where: { audienceId: id },
      orderBy: { computedAt: 'desc' }
    });
  }

  async buildAudienceExportCsv(ctx: LeadGenRequestContext, audienceId: string, snapshotId?: string | null) {
    const audience = await this.getAudience(ctx, audienceId);
    let memberIds: string[] | null = null;

    if (snapshotId) {
      const snapshot = await this.prisma.leadGenAudienceSnapshot.findUnique({ where: { id: snapshotId } });
      if (!snapshot || snapshot.audienceId !== audienceId) {
        throw new NotFoundException('Snapshot not found');
      }
      const meta = snapshot.metadata as any;
      if (meta && Array.isArray(meta.memberIds)) {
        memberIds = meta.memberIds.filter((id: unknown) => typeof id === 'string');
      }
    }

    const members = memberIds
      ? await this.prisma.person.findMany({
          where: { tenantId: ctx.tenantId, id: { in: memberIds }, deletedAt: null },
          select: { id: true, primaryEmail: true, primaryPhone: true }
        })
      : await this.prisma.person.findMany({
          where: this.buildPersonWhereFromAudienceFilters(
            ctx,
            ((audience.definition as unknown as Record<string, any> | null) ?? {}).filters ?? {}
          ),
          select: { id: true, primaryEmail: true, primaryPhone: true }
        });

    const header = ['person_id', 'email_sha256', 'phone_sha256'];
    const rows = [header.join(',')];

    for (const member of members) {
      const email = normalizeEmail(member.primaryEmail);
      const phone = normalizePhone(member.primaryPhone);
      const emailHash = email ? sha256Hex(email) : '';
      const phoneHash = phone ? sha256Hex(phone.replace(/[^0-9]/g, '')) : '';
      rows.push([member.id, emailHash, phoneHash].map(this.csvEscape).join(','));
    }

    return rows.join('\n');
  }

  async recordConversionEvent(ctx: LeadGenRequestContext, dto: RecordLeadGenConversionEventDto) {
    if (!dto.leadId && !dto.personId) {
      throw new BadRequestException('leadId or personId is required');
    }

    return this.prisma.leadGenConversionEvent.create({
      data: {
        organizationId: ctx.orgId,
        tenantId: ctx.tenantId || undefined,
        leadId: dto.leadId ?? undefined,
        personId: dto.personId ?? undefined,
        campaignId: dto.campaignId ?? undefined,
        landingPageId: dto.landingPageId ?? undefined,
        eventType: dto.eventType,
        occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
        valueCents: dto.valueCents ?? undefined,
        currency: dto.currency?.trim() || undefined
      }
    });
  }

  async listConversionEvents(ctx: LeadGenRequestContext, query: { campaignId?: string; landingPageId?: string; eventType?: LeadGenConversionEventType; from?: Date; to?: Date; }) {
    return this.prisma.leadGenConversionEvent.findMany({
      where: {
        organizationId: ctx.orgId,
        ...(query.campaignId ? { campaignId: query.campaignId } : {}),
        ...(query.landingPageId ? { landingPageId: query.landingPageId } : {}),
        ...(query.eventType ? { eventType: query.eventType } : {}),
        ...(query.from || query.to ? { occurredAt: { ...(query.from ? { gte: query.from } : {}), ...(query.to ? { lte: query.to } : {}) } } : {})
      },
      orderBy: { occurredAt: 'desc' },
      take: 500
    });
  }

  async exportConversions(ctx: LeadGenRequestContext, dto: ExportLeadGenConversionsDto) {
    const destination = dto.destination?.trim() || 'MANUAL_CSV';
    const from = dto.from ? new Date(dto.from) : null;
    const to = dto.to ? new Date(dto.to) : null;

    const batch = await this.prisma.leadGenExportBatch.create({
      data: {
        organizationId: ctx.orgId,
        campaignId: dto.campaignId ?? undefined,
        destination,
        status: 'RUNNING',
        requestedByUserId: ctx.userId || undefined,
        from: from ?? undefined,
        to: to ?? undefined
      }
    });

    const events = await this.prisma.leadGenConversionEvent.findMany({
      where: {
        organizationId: ctx.orgId,
        ...(dto.campaignId ? { campaignId: dto.campaignId } : {}),
        ...(from || to
          ? {
              occurredAt: {
                ...(from ? { gte: from } : {}),
                ...(to ? { lte: to } : {})
              }
            }
          : {})
      },
      orderBy: { occurredAt: 'asc' }
    });

    const csv = this.conversionsToCsv(events);

    const finalStatus = 'COMPLETED';
    await this.prisma.leadGenExportBatch.update({
      where: { id: batch.id },
      data: {
        status: finalStatus,
        itemCount: events.length
      }
    });

    if (!dto.dryRun && events.length > 0) {
      await this.prisma.leadGenConversionEvent.updateMany({
        where: { id: { in: events.map((e) => e.id) } },
        data: {
          exportBatchId: batch.id,
          exportStatus: LeadGenExportStatus.EXPORTED,
          exportedAt: new Date()
        }
      });
    }

    return { batchId: batch.id, destination, csv };
  }

  private conversionsToCsv(events: Array<{ id: string; eventType: string; occurredAt: Date; valueCents: number | null; currency: string; campaignId: string | null; landingPageId: string | null; leadId: string | null; personId: string | null; }>) {
    const header = [
      'conversion_id',
      'event_type',
      'occurred_at',
      'value_cents',
      'currency',
      'campaign_id',
      'landing_page_id',
      'lead_id',
      'person_id'
    ];
    const rows = [header.join(',')];
    for (const e of events) {
      rows.push(
        [
          e.id,
          e.eventType,
          e.occurredAt.toISOString(),
          e.valueCents ?? '',
          e.currency ?? '',
          e.campaignId ?? '',
          e.landingPageId ?? '',
          e.leadId ?? '',
          e.personId ?? ''
        ].map(this.csvEscape).join(',')
      );
    }
    return rows.join('\n');
  }

  private csvEscape(value: unknown): string {
    const raw = value == null ? '' : String(value);
    if (raw.includes('"') || raw.includes(',') || raw.includes('\n') || raw.includes('\r')) {
      return `"${raw.replace(/\"/g, '""')}"`;
    }
    return raw;
  }

  private buildPersonWhereFromAudienceFilters(ctx: LeadGenRequestContext, filters: Record<string, any>) {
    const where: Prisma.PersonWhereInput = {
      tenantId: ctx.tenantId,
      deletedAt: null
    };

    if (filters.doNotContact === true) {
      where.doNotContact = true;
    } else if (filters.doNotContact === false) {
      where.doNotContact = false;
    }

    if (Array.isArray(filters.stageIn) && filters.stageIn.length > 0) {
      const values = filters.stageIn.filter((value: unknown) => typeof value === 'string');
      where.stage = { in: values as PersonStage[] };
    }

    if (Array.isArray(filters.tagsAny) && filters.tagsAny.length > 0) {
      const values = filters.tagsAny.filter((value: unknown) => typeof value === 'string' && value.trim());
      if (values.length > 0) {
        where.tags = { hasSome: values };
      }
    }

    if (Array.isArray(filters.tagsAll) && filters.tagsAll.length > 0) {
      const values = filters.tagsAll.filter((value: unknown) => typeof value === 'string' && value.trim());
      if (values.length > 0) {
        where.tags = { hasEvery: values };
      }
    }

    if (filters.hasEmail === true) {
      where.primaryEmail = { not: null };
    }

    if (filters.hasPhone === true) {
      where.primaryPhone = { not: null };
    }

    if (typeof filters.utmSource === 'string' && filters.utmSource.trim()) {
      where.utmSource = filters.utmSource.trim();
    }

    if (typeof filters.utmCampaign === 'string' && filters.utmCampaign.trim()) {
      where.utmCampaign = filters.utmCampaign.trim();
    }

    if (typeof filters.createdAfter === 'string' && filters.createdAfter.trim()) {
      const dt = new Date(filters.createdAfter);
      if (!Number.isNaN(dt.getTime())) {
        where.createdAt = { gte: dt };
      }
    }

    if (typeof filters.lastActivityAfter === 'string' && filters.lastActivityAfter.trim()) {
      const dt = new Date(filters.lastActivityAfter);
      if (!Number.isNaN(dt.getTime())) {
        where.lastActivityAt = { gte: dt };
      }
    }

    return where;
  }
}
