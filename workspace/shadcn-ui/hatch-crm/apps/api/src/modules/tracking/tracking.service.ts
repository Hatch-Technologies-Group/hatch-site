import { BadRequestException, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { subDays } from 'date-fns';

import { assertJsonSafe, toNullableJson } from '../common';
import { PrismaService } from '../prisma/prisma.service';
import { calculateLeadScore } from '../leads/lead-score.util';
import { TrackEventDto } from './dto/track-event.dto';

const ROLLUP_LOOKBACK_DAYS = 7;
const ROLLUP_EVENT_NAMES = new Set(['listing.viewed', 'session.started']);

@Injectable()
export class TrackingService {
  constructor(private readonly prisma: PrismaService) {}

  async trackEvent(dto: TrackEventDto, req: FastifyRequest): Promise<{ status: 'ok'; eventId: string }> {
    const tenantId = await this.resolveTenantId(dto);
    const name = dto.name.trim();
    if (!name) {
      throw new BadRequestException('name is required');
    }

    const anonymousId = dto.anonymousId.trim();
    if (!anonymousId) {
      throw new BadRequestException('anonymousId is required');
    }

    const occurredAt = dto.timestamp ? new Date(dto.timestamp) : new Date();
    if (Number.isNaN(occurredAt.getTime())) {
      throw new BadRequestException('Invalid timestamp');
    }

    const personId = dto.personId?.trim() ? dto.personId.trim() : null;
    if (personId) {
      const exists = await this.prisma.person.findFirst({
        where: { id: personId, tenantId },
        select: { id: true }
      });
      if (!exists) {
        throw new BadRequestException('personId is invalid for tenant');
      }
    }

    const baseContext = dto.context ?? {};
    const context = {
      ...baseContext,
      ip: req.ip,
      userAgent: req.headers['user-agent'] ?? null
    } satisfies Record<string, unknown>;

    assertJsonSafe(dto.properties, 'tracking.properties');
    assertJsonSafe(context, 'tracking.context');

    const eventId = dto.eventId?.trim() ? dto.eventId.trim() : undefined;

    try {
      const created = await this.prisma.event.create({
        data: {
          ...(eventId ? { id: eventId } : {}),
          tenantId,
          personId,
          anonymousId,
          name,
          timestamp: occurredAt,
          properties: toNullableJson(dto.properties),
          context: toNullableJson(context)
        }
      });

      if (personId) {
        await this.updateLeadActivityFromEvents({
          tenantId,
          personId,
          occurredAt,
          shouldRecomputeRollup: ROLLUP_EVENT_NAMES.has(name)
        });
      }

      return { status: 'ok', eventId: created.id };
    } catch (error) {
      const code = (error as { code?: string } | undefined)?.code;
      if (code === 'P2002' && eventId) {
        // Idempotency: client re-sent the same event id.
        return { status: 'ok', eventId };
      }
      throw error;
    }
  }

  async updateLeadActivityFromEvents(params: {
    tenantId: string;
    personId: string;
    occurredAt: Date;
    shouldRecomputeRollup: boolean;
  }) {
    const { tenantId, personId, occurredAt } = params;
    const since = subDays(occurredAt, ROLLUP_LOOKBACK_DAYS);

    const [person, listingViews, sessions, existingRollup] = await Promise.all([
      this.prisma.person.findFirst({
        where: { id: personId, tenantId },
        include: { pipelineStage: true, leadFit: true }
      }),
      params.shouldRecomputeRollup
        ? this.prisma.event.count({
            where: {
              tenantId,
              personId,
              name: 'listing.viewed',
              timestamp: { gte: since }
            }
          })
        : Promise.resolve(null),
      params.shouldRecomputeRollup
        ? this.prisma.event.count({
            where: {
              tenantId,
              personId,
              name: 'session.started',
              timestamp: { gte: since }
            }
          })
        : Promise.resolve(null),
      this.prisma.leadActivityRollup.findUnique({
        where: { personId }
      })
    ]);

    if (!person) {
      return;
    }

    const rollup =
      params.shouldRecomputeRollup || !existingRollup
        ? await this.prisma.leadActivityRollup.upsert({
            where: { personId },
            create: {
              tenantId,
              personId,
              last7dListingViews: listingViews ?? 0,
              last7dSessions: sessions ?? 0
            },
            update: {
              last7dListingViews: listingViews ?? 0,
              last7dSessions: sessions ?? 0
            }
          })
        : existingRollup;

    const { score, scoreTier } = calculateLeadScore({
      stage: person.pipelineStage,
      rollup,
      fit: person.leadFit ?? undefined,
      lastActivityAt: person.lastActivityAt ?? undefined,
      touchpointAt: occurredAt
    });

    await this.prisma.person.update({
      where: { id: personId },
      data: {
        lastActivityAt: occurredAt,
        leadScore: score,
        scoreTier,
        scoreUpdatedAt: new Date()
      }
    });
  }

  private async resolveTenantId(dto: Pick<TrackEventDto, 'tenantId' | 'orgId'>): Promise<string> {
    const tenantId = dto.tenantId?.trim();
    if (tenantId) {
      return tenantId;
    }

    const orgId = dto.orgId?.trim();
    if (!orgId) {
      throw new BadRequestException('tenantId or orgId is required');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'asc' },
      select: { id: true }
    });
    if (!tenant) {
      throw new BadRequestException('No tenant found for orgId');
    }

    return tenant.id;
  }
}
