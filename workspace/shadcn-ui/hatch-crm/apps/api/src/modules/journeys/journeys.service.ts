import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { SimulationResult, simulateJourney } from '@hatch/shared';
import { LeadHistoryEventType, Prisma } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE
} from '../common/dto/cursor-pagination-query.dto';
import {
  JourneyListItemDto,
  JourneyListResponseDto
} from './dto/journey-response.dto';

@Injectable()
export class JourneysService {
  constructor(private readonly prisma: PrismaService) {}

  async simulate(
    journeyId: string,
    tenantId: string,
    context: Record<string, unknown>
  ): Promise<SimulationResult> {
    const journey = await this.prisma.journey.findFirst({
      where: { id: journeyId, tenantId }
    });

    if (!journey) {
      throw new NotFoundException('Journey not found');
    }

    return simulateJourney(journey as any, {
      trigger: journey.trigger as any,
      context
    });
  }

  async startForLead(params: {
    tenantId: string;
    leadId: string;
    templateId: string;
    actorId?: string | null;
    source?: string;
  }) {
    const journey = await this.prisma.journey.findFirst({
      where: {
        id: params.templateId,
        tenantId: params.tenantId,
        isActive: true
      }
    });

    if (!journey) {
      throw new NotFoundException('Journey template not found');
    }

    const lead = await this.prisma.person.findUnique({
      where: { id: params.leadId },
      select: { tenantId: true }
    });
    if (!lead) {
      throw new NotFoundException('Lead not found');
    }
    if (lead.tenantId !== params.tenantId) {
      throw new ForbiddenException('You cannot modify leads from another tenant');
    }

    const existing = await this.prisma.journeySimulation.findUnique({
      where: {
        tenantId_leadId_journeyId: {
          tenantId: params.tenantId,
          leadId: params.leadId,
          journeyId: params.templateId
        }
      }
    });
    if (existing) {
      return { status: 'skipped' } as const;
    }

    await this.prisma.journeySimulation.create({
      data: {
        tenantId: params.tenantId,
        leadId: params.leadId,
        journeyId: params.templateId,
        input: {
          tenantId: params.tenantId,
          leadId: params.leadId,
          source: params.source ?? 'insights',
          actorId: params.actorId ?? null
        } satisfies Prisma.InputJsonValue,
        result: {
          status: 'QUEUED'
        }
      }
    });

    await this.prisma.leadHistory.create({
      data: {
        tenantId: params.tenantId,
        personId: params.leadId,
        actorId: params.actorId ?? null,
        eventType: LeadHistoryEventType.JOURNEY_STARTED,
        payload: {
          templateId: params.templateId,
          source: params.source ?? 'insights'
        } satisfies Prisma.InputJsonValue
      }
    });

    return { status: 'queued' } as const;
  }

  async list(
    tenantId: string | undefined,
    query: {
      limit?: number;
      cursor?: string;
      q?: string;
      active?: boolean;
    }
  ): Promise<JourneyListResponseDto> {
    const take = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
    const journeys = await this.prisma.journey.findMany({
      where: {
        ...(tenantId ? { tenantId } : {}),
        ...(query.q
          ? {
              name: {
                contains: query.q,
                mode: 'insensitive'
              }
            }
          : {}),
        ...(typeof query.active === 'boolean' ? { isActive: query.active } : {})
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      ...(query.cursor
        ? {
            skip: 1,
            cursor: { id: query.cursor }
          }
        : {})
    });

    let nextCursor: string | null = null;
    if (journeys.length > take) {
      const next = journeys.pop();
      nextCursor = next?.id ?? null;
    }

    const items: JourneyListItemDto[] = journeys.map((journey) => ({
      id: journey.id,
      tenantId: journey.tenantId,
      name: journey.name,
      trigger: journey.trigger as unknown as string,
      isActive: journey.isActive,
      createdAt: journey.createdAt.toISOString(),
      updatedAt: journey.updatedAt.toISOString()
    }));

    return { items, nextCursor };
  }
}
