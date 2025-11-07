import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OfferStatus, Prisma } from '@hatch/db';

import { PrismaService } from '../../prisma/prisma.service';
import { FlsService } from '../../../platform/security/fls.service';
import { OutboxService } from '../../outbox/outbox.service';
import type { RequestContext } from '../../common/request-context';
import { assertJsonSafe, toJsonValue } from '../../common';
import { TransactionsService } from '../transactions/transactions.service';

import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../../common/dto/cursor-pagination-query.dto';
import { CreateOfferDto, DecideOfferDto, ListOffersQueryDto } from './dto';

type OfferRecord = Prisma.OfferGetPayload<{
  include: {
    listing: {
      select: {
        id: true;
        status: true;
        opportunityId: true;
        price: true;
      };
    };
    deal: {
      select: {
        id: true;
        stage: true;
      };
    };
  };
}>;

@Injectable()
export class OffersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fls: FlsService,
    private readonly transactions: TransactionsService,
    private readonly outbox: OutboxService
  ) {}

  async create(ctx: RequestContext, dto: CreateOfferDto) {
    if (!ctx.tenantId || !ctx.orgId || !ctx.userId) {
      throw new BadRequestException('Missing tenant or user context');
    }

    const listing = await this.prisma.listing.findFirst({
      where: { id: dto.listingId, tenantId: ctx.tenantId },
      select: { id: true, tenantId: true, opportunityId: true }
    });
    if (!listing) {
      throw new NotFoundException('Listing not found');
    }

    const buyer = await this.prisma.person.findFirst({
      where: {
        id: dto.buyerContactId,
        organizationId: ctx.orgId
      },
      select: { id: true }
    });

    if (!buyer) {
      throw new NotFoundException('Buyer contact not found');
    }

    const writable = await this.fls.filterWrite(
      { orgId: ctx.orgId, userId: ctx.userId },
      're_offers',
      {
        terms: {
          amount: dto.amount,
          contingencies: dto.contingencies ?? []
        },
        metadata: {
          contingencies: dto.contingencies ?? [],
          createdBy: ctx.userId
        }
      }
    );

    const baseTerms = {
      amount: dto.amount,
      contingencies: dto.contingencies ?? []
    };
    const baseMetadata = {
      contingencies: dto.contingencies ?? [],
      createdBy: ctx.userId
    };

    const termsPayload = (writable.terms ?? baseTerms) as unknown;
    assertJsonSafe(termsPayload, 're_offers.terms');
    const metadataPayload = (writable.metadata ?? baseMetadata) as unknown;
    assertJsonSafe(metadataPayload, 're_offers.metadata');

    const created = await this.prisma.offer.create({
      data: {
        tenantId: ctx.tenantId,
        listingId: dto.listingId,
        personId: buyer.id,
        status: OfferStatus.SUBMITTED,
        terms: toJsonValue(termsPayload),
        metadata: toJsonValue(metadataPayload)
      }
    });

    await this.outbox.enqueue({
      tenantId: ctx.tenantId,
      eventType: 're.offer.created',
      resource: { id: created.id, type: 're.offer' },
      occurredAt: new Date().toISOString(),
      data: {
        offerId: created.id,
        listingId: created.listingId,
        buyerId: created.personId,
        amount: dto.amount
      }
    });

    return this.toOfferView(ctx, { id: created.id });
  }

  async list(ctx: RequestContext, query?: ListOffersQueryDto) {
    if (!ctx.tenantId) {
      return { items: [], nextCursor: null };
    }

    const listingId = query?.listingId;
    const status = query?.status;
    const cursor = query?.cursor;
    const take = Math.min(query?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const offers = await this.prisma.offer.findMany({
      where: {
        tenantId: ctx.tenantId,
        ...(listingId ? { listingId } : {}),
        ...(status ? { status: status.toUpperCase() as OfferStatus } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: take + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: {
        listing: {
          select: {
            id: true,
            status: true,
            opportunityId: true,
            price: true
          }
        },
        deal: {
          select: {
            id: true,
            stage: true
          }
        }
      }
    });

    let nextCursor: string | null = null;
    if (offers.length > take) {
      const next = offers.pop();
      nextCursor = next?.id ?? null;
    }

    const items = await Promise.all(offers.map((offer) => this.toOfferView(ctx, offer)));

    return { items, nextCursor };
  }

  async decide(ctx: RequestContext, id: string, dto: DecideOfferDto) {
    if (!ctx.tenantId || !ctx.orgId || !ctx.userId) {
      throw new BadRequestException('Missing tenant or user context');
    }

    const targetStatus = dto.status.toUpperCase() as OfferStatus;
    if (targetStatus !== OfferStatus.ACCEPTED && targetStatus !== OfferStatus.REJECTED) {
      throw new BadRequestException('Invalid status transition');
    }

    const { offer, transactionId, listingId, opportunityId, accepted } = await this.prisma.$transaction(async (tx) => {
      const current = await tx.offer.findUnique({
        where: { id },
        include: {
          listing: {
            select: {
              id: true,
              tenantId: true,
              opportunityId: true,
              price: true
            }
          },
          deal: {
            select: { id: true }
          }
        }
      });

      if (!current || current.tenantId !== ctx.tenantId) {
        throw new NotFoundException('Offer not found');
      }

      if (current.status !== OfferStatus.SUBMITTED && current.status !== OfferStatus.COUNTERED) {
        return {
          offer: current,
          transactionId: current.deal?.id ?? null,
          listingId: current.listingId,
          opportunityId: current.listing?.opportunityId ?? null,
          accepted: false
        };
      }

      if (targetStatus === OfferStatus.ACCEPTED) {
        const existingAccepted = await tx.offer.findFirst({
          where: {
            listingId: current.listingId,
            status: OfferStatus.ACCEPTED,
            NOT: { id: current.id }
          }
        });
        if (existingAccepted) {
          throw new BadRequestException('Listing already has an accepted offer');
        }
      }

      const nextMetadata = mergeMetadata(current.metadata, {
        decisionNote: dto.decisionNote ?? null,
        decidedBy: ctx.userId
      });
      assertJsonSafe(nextMetadata, 're_offers.metadata');

      const updated = await tx.offer.update({
        where: { id: current.id },
        data: {
          status: targetStatus,
          metadata: toJsonValue(nextMetadata)
        }
      });

      if (targetStatus !== OfferStatus.ACCEPTED) {
        return {
          offer: updated,
          transactionId: current.deal?.id ?? null,
          listingId: current.listingId,
          opportunityId: current.listing?.opportunityId ?? null,
          accepted: false
        };
      }

      const transaction = await this.transactions.ensureForAcceptedOffer(ctx, updated, current.listing, tx);

      return {
        offer: updated,
        transactionId: transaction.id,
        listingId: current.listingId,
        opportunityId: transaction.opportunityId ?? current.listing?.opportunityId ?? null,
        accepted: true
      };
    });

    if (accepted) {
      await this.outbox.enqueue({
        tenantId: ctx.tenantId,
        eventType: 're.offer.accepted',
        resource: { id: offer.id, type: 're.offer' },
        occurredAt: new Date().toISOString(),
        data: {
          offerId: offer.id,
          listingId,
          transactionId: transactionId!,
          opportunityId: opportunityId ?? null
        }
      });
    }

    const offerView = await this.toOfferView(ctx, { id: offer.id });

    return {
      offer: offerView,
      transaction: transactionId ? await this.transactions.toTransactionView(ctx, transactionId) : null
    };
  }

  private async toOfferView(ctx: RequestContext, offer: OfferRecord | { id: string }) {
    const record =
      'listing' in offer
        ? (offer as OfferRecord)
        : await this.prisma.offer.findUnique({
            where: { id: offer.id },
            include: {
              listing: {
                select: {
                  id: true,
                  status: true,
                  opportunityId: true,
                  price: true
                }
              },
              deal: {
                select: { id: true, stage: true }
              }
            }
          });

    if (!record) {
      throw new NotFoundException('Offer not found');
    }

    const filtered = await this.fls.filterRead(ctx, 're_offers', record);
    const amount = extractAmount(record);

    return {
      id: record.id,
      status: record.status,
      listingId: record.listingId,
      personId: record.personId,
      amount,
      contingencies: extractContingencies(record),
      decisionNote: (record.metadata as Record<string, unknown> | null | undefined)?.decisionNote ?? null,
      dealId: record.dealId ?? record.deal?.id ?? null,
      listing: record.listing
        ? {
            id: record.listing.id,
            status: record.listing.status,
            opportunityId: record.listing.opportunityId ?? null
          }
        : null,
      ...filtered
    };
  }
}

function extractAmount(offer: OfferRecord) {
  if (offer?.terms && typeof offer.terms === 'object') {
    const amount = (offer.terms as Record<string, unknown>).amount;
    if (typeof amount === 'number') {
      return amount;
    }
    if (typeof amount === 'string') {
      const parsed = Number(amount);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  if (offer.listing?.price) {
    return Number(offer.listing.price);
  }
  return null;
}

function extractContingencies(offer: OfferRecord) {
  if (offer?.terms && typeof offer.terms === 'object') {
    const contingencies = (offer.terms as Record<string, unknown>).contingencies;
    if (Array.isArray(contingencies)) {
      return contingencies.filter((item): item is string => typeof item === 'string');
    }
  }
  return [];
}

function mergeMetadata(metadata: Prisma.JsonValue | null | undefined, updates: Record<string, unknown>) {
  const base = metadata && typeof metadata === 'object' ? { ...(metadata as Record<string, unknown>) } : {};
  return { ...base, ...updates };
}
