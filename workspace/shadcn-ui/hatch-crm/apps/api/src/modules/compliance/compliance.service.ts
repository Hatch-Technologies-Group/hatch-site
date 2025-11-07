import { BadRequestException, Injectable } from '@nestjs/common';
import {
  AgreementStatus,
  AgreementType,
  ClearCooperationStatus,
  ConsentChannel,
  ConsentScope,
  ConsentStatus,
  TourStatus,
  Prisma
} from '@hatch/db';
import { differenceInCalendarDays, differenceInHours, subDays } from 'date-fns';

import { PrismaService } from '../prisma/prisma.service';
import type { GetComplianceStatusDto } from './dto/get-status.dto';

type AgentScope = {
  agentIds: string[];
  teamIds: string[];
};

const HOURS_24 = 24;

const parseDate = (input: string | undefined, fallback: Date) => {
  if (!input) return fallback;
  const parsed = new Date(input);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

const asCsv = (values: string[] | undefined) => (values && values.length > 0 ? values.join(',') : '—');

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');

@Injectable()
export class ComplianceService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveAgentScope(tenantId: string, scope: AgentScope) {
    if (!scope.teamIds || scope.teamIds.length === 0) {
      return scope.agentIds ?? [];
    }

    const memberships = await this.prisma.teamMembership.findMany({
      where: {
        teamId: { in: scope.teamIds },
        team: { tenantId }
      },
      select: { userId: true }
    });

    const ids = new Set(scope.agentIds ?? []);
    for (const membership of memberships) {
      ids.add(membership.userId);
    }
    return Array.from(ids);
  }

  private async getMessagingReadiness(tenantId: string) {
    // TODO: integrate with messaging providers (10DLC, SPF/DKIM/DMARC)
    const lastOverride = await this.prisma.overrideLog.findFirst({
      where: { tenantId, context: 'messaging_readiness' },
      orderBy: { occurredAt: 'desc' }
    });
    return {
      tenDlcApproved: true,
      dmarcAligned: true,
      lastOverride
    };
  }

  private buildPdf(lines: string[]): Buffer {
    const sanitized = lines.map(escapePdfText);
    const textSegments = sanitized.map((line, index) => {
      if (index === 0) {
        return `(${line}) Tj`;
      }
      return `T* (${line}) Tj`;
    });

    const content = `BT /F1 12 Tf 72 720 Td\n${textSegments.join('\n')}\nET`;
    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>\nendobj',
      `5 0 obj\n<< /Length ${Buffer.byteLength(content, 'utf-8')} >>\nstream\n${content}\nendstream\nendobj`
    ];

    const header = '%PDF-1.4\n';
    let offset = header.length;
    const xrefEntries = ['0000000000 65535 f '];
    const body = objects
      .map((object) => {
        const entry = `${offset.toString().padStart(10, '0')} 00000 n `;
        xrefEntries.push(entry);
        const chunk = `${object}\n`;
        offset += chunk.length;
        return chunk;
      })
      .join('');

    const xref = `xref\n0 ${objects.length + 1}\n${xrefEntries.join('\n')}\n`;
    const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${offset}\n%%EOF`;

    return Buffer.from(header + body + xref + trailer, 'utf-8');
  }

  private async computeIdxMetrics(tenantId: string, windowStart: Date, filters: { mlsIds?: string[] }) {
    const where: Prisma.MarketingEventWhereInput = {
      tenantId,
      eventType: 'IDX_PREFLIGHT',
      occurredAt: { gte: windowStart }
    };
    if (filters.mlsIds && filters.mlsIds.length > 0) {
      where.mlsProfileId = { in: filters.mlsIds };
    }

    const [total, failures] = await Promise.all([
      this.prisma.marketingEvent.count({ where }),
      this.prisma.marketingEvent.count({
        where: {
          ...where,
          OR: [
            { result: { equals: 'FAILURE' } },
            { result: { equals: 'BLOCKED' } }
          ]
        }
      })
    ]);

    return { totalChecksLast7Days: total, failuresLast7Days: failures };
  }

  private async consentSummary(tenantId: string) {
    const consentGroups = await this.prisma.consent.groupBy({
      where: { tenantId },
      by: ['channel', 'status'],
      _count: { _all: true }
    });

    const summary = {
      sms: { granted: 0, revoked: 0, unknown: 0 },
      email: { granted: 0, revoked: 0, unknown: 0 }
    };

    for (const group of consentGroups) {
      const channelKey =
        group.channel === ConsentChannel.SMS
          ? 'sms'
          : group.channel === ConsentChannel.EMAIL
            ? 'email'
            : null;
      if (!channelKey) continue;
      if (group.status === ConsentStatus.GRANTED) {
        summary[channelKey].granted += group._count._all;
      } else if (group.status === ConsentStatus.REVOKED) {
        summary[channelKey].revoked += group._count._all;
      } else {
        summary[channelKey].unknown += group._count._all;
      }
    }

    const totalSms = summary.sms.granted + summary.sms.revoked + summary.sms.unknown;
    const totalEmail = summary.email.granted + summary.email.revoked + summary.email.unknown;

    return {
      summary,
      smsHealth: totalSms === 0 ? 1 : summary.sms.granted / totalSms,
      emailHealth: totalEmail === 0 ? 1 : summary.email.granted / totalEmail
    };
  }

  async getStatus(tenantId: string, query: GetComplianceStatusDto) {
    const now = new Date();
    const defaultStart = subDays(now, 30);
    const start = parseDate(query.start, defaultStart);
    const end = parseDate(query.end, now);

    const resolvedAgents = await this.resolveAgentScope(tenantId, {
      agentIds: query.agentIds ?? [],
      teamIds: query.teamIds ?? []
    });

    const tourWhere: Prisma.TourWhereInput = {
      tenantId,
      status: TourStatus.KEPT,
      startAt: { gte: start, lte: end }
    };
    if (resolvedAgents.length > 0) {
      tourWhere.agentId = { in: resolvedAgents };
    }

    const keptTours = await this.prisma.tour.findMany({
      where: tourWhere,
      select: {
        id: true,
        personId: true,
        agentId: true,
        startAt: true
      }
    });

    const tourIds = keptTours.map((tour) => tour.id);

    const links = tourIds.length
      ? await this.prisma.tourAgreementLink.findMany({
          where: { tourId: { in: tourIds } },
          include: {
            agreement: {
              select: {
                id: true,
                effectiveDate: true,
                expiryDate: true,
                signedAt: true
              }
            }
          }
        })
      : [];

    const linkMap = new Map<string, { effectiveDate: Date | null; signedAt: Date | null; expiryDate: Date | null }>();
    for (const link of links) {
      linkMap.set(link.tourId, {
        effectiveDate: link.agreement.effectiveDate,
        signedAt: link.agreement.signedAt,
        expiryDate: link.agreement.expiryDate
      });
    }

    const personIds = Array.from(new Set(keptTours.map((tour) => tour.personId)));
    const agreementsByPerson = new Map<
      string,
      Array<{ effectiveDate: Date | null; signedAt: Date | null; expiryDate: Date | null }>
    >();

    if (personIds.length > 0) {
      const agreements = await this.prisma.agreement.findMany({
        where: {
          tenantId,
          personId: { in: personIds },
          type: AgreementType.BUYER_REP,
          status: AgreementStatus.SIGNED
        },
        select: {
          personId: true,
          effectiveDate: true,
          signedAt: true,
          expiryDate: true
        }
      });

      for (const agreement of agreements) {
        const current = agreementsByPerson.get(agreement.personId) ?? [];
        current.push({
          effectiveDate: agreement.effectiveDate,
          signedAt: agreement.signedAt,
          expiryDate: agreement.expiryDate
        });
        agreementsByPerson.set(agreement.personId, current);
      }
    }

    let activeBuyerRep = 0;
    for (const tour of keptTours) {
      const link = linkMap.get(tour.id);
      if (link) {
        const effective = link.effectiveDate ?? link.signedAt ?? new Date(0);
        const expires = link.expiryDate;
        if (effective <= tour.startAt && (!expires || expires >= tour.startAt)) {
          activeBuyerRep += 1;
          continue;
        }
      }

      const agreements = agreementsByPerson.get(tour.personId) ?? [];
      const hasActive = agreements.some((agreement) => {
        const effective = agreement.effectiveDate ?? agreement.signedAt ?? new Date(0);
        const expires = agreement.expiryDate;
        return effective <= tour.startAt && (!expires || expires >= tour.startAt);
      });

      if (hasActive) {
        activeBuyerRep += 1;
      }
    }

    const totalKeptTours = keptTours.length;
    const buyerRepPercentage = totalKeptTours === 0 ? 1 : activeBuyerRep / totalKeptTours;

    const { summary: consentSummary, smsHealth, emailHealth } = await this.consentSummary(tenantId);

    const coopTimers = await this.prisma.clearCooperationTimer.findMany({
      where: { tenantId },
      select: {
        status: true,
        dueAt: true
      }
    });

    const coopTotal = coopTimers.length;
    const coopYellow = coopTimers.filter((timer) => timer.status === ClearCooperationStatus.YELLOW).length;
    const coopRed = coopTimers.filter((timer) => timer.status === ClearCooperationStatus.RED).length;
    const coopDueSoon = coopTimers.filter((timer) => {
      if (!timer.dueAt) return false;
      const hours = differenceInHours(timer.dueAt, now);
      return hours >= 0 && hours <= HOURS_24;
    }).length;

    const idxMetrics = await this.computeIdxMetrics(tenantId, subDays(now, 7), {
      mlsIds: query.mlsIds
    });

    const messagingReadiness = await this.getMessagingReadiness(tenantId);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { quietHoursStart: true, quietHoursEnd: true, timezone: true }
    });

    return {
      range: {
        start: start.toISOString(),
        end: end.toISOString(),
        days: Math.max(1, differenceInCalendarDays(end, start) || 1)
      },
      filters: {
        agentIds: resolvedAgents,
        teamIds: query.teamIds ?? [],
        mlsIds: query.mlsIds ?? []
      },
      quietHours: tenant
        ? {
            startHour: tenant.quietHoursStart,
            endHour: tenant.quietHoursEnd,
            timezone: tenant.timezone ?? 'UTC'
          }
        : null,
      metrics: {
        buyerRepCoverage: {
          numerator: activeBuyerRep,
          denominator: totalKeptTours,
          percentage: buyerRepPercentage
        },
        consentHealth: {
          sms: {
            granted: consentSummary.sms.granted,
            revoked: consentSummary.sms.revoked,
            unknown: consentSummary.sms.unknown,
            health: smsHealth
          },
          email: {
            granted: consentSummary.email.granted,
            revoked: consentSummary.email.revoked,
            unknown: consentSummary.email.unknown,
            health: emailHealth
          }
        },
        clearCooperation: {
          total: coopTotal,
          yellow: coopYellow,
          red: coopRed,
          dueSoon: coopDueSoon
        },
        idxCompliance: idxMetrics,
        messagingReadiness: {
          tenDlcApproved: messagingReadiness.tenDlcApproved,
          dmarcAligned: messagingReadiness.dmarcAligned,
          lastOverride: messagingReadiness.lastOverride
        },
        alerts: {
          coopDueSoon: coopDueSoon > 0,
          optOutSpike: false
        }
      }
    };
  }

  async getAgreements(tenantId: string, query: GetComplianceStatusDto) {
    const now = new Date();
    const start = parseDate(query.start, subDays(now, 30));
    const end = parseDate(query.end, now);

    const resolvedAgents = await this.resolveAgentScope(tenantId, {
      agentIds: query.agentIds ?? [],
      teamIds: query.teamIds ?? []
    });

    const tours = await this.prisma.tour.findMany({
      where: {
        tenantId,
        status: TourStatus.KEPT,
        startAt: { gte: start, lte: end },
        ...(resolvedAgents.length > 0 ? { agentId: { in: resolvedAgents } } : {})
      },
      select: {
        id: true,
        startAt: true,
        person: { select: { id: true, firstName: true, lastName: true } },
        agent: { select: { id: true, firstName: true, lastName: true } },
        listing: { select: { id: true, addressLine1: true, city: true, state: true } }
      }
    });

    const tourIds = tours.map((tour) => tour.id);

    const links = tourIds.length
      ? await this.prisma.tourAgreementLink.findMany({
          where: { tourId: { in: tourIds } },
          include: {
            agreement: {
              select: {
                id: true,
                effectiveDate: true,
                expiryDate: true,
                signedAt: true
              }
            }
          }
        })
      : [];

    const linkMap = new Map<string, typeof links[number]>();
    for (const link of links) {
      linkMap.set(link.tourId, link);
    }

    const personIds = Array.from(new Set(tours.map((tour) => tour.person.id)));
    const agreements = await this.prisma.agreement.findMany({
      where: {
        tenantId,
        personId: { in: personIds },
        type: AgreementType.BUYER_REP,
        status: AgreementStatus.SIGNED
      },
      select: {
        id: true,
        personId: true,
        effectiveDate: true,
        expiryDate: true,
        signedAt: true
      }
    });

    const agreementsByPerson = new Map<string, typeof agreements>();
    for (const agreement of agreements) {
      const entries = agreementsByPerson.get(agreement.personId) ?? [];
      entries.push(agreement);
      agreementsByPerson.set(agreement.personId, entries);
    }

    const rows = tours.map((tour) => {
      const link = linkMap.get(tour.id);
      const candidateAgreements = agreementsByPerson.get(tour.person.id) ?? [];
      let status: 'LINKED' | 'ACTIVE' | 'EXPIRED' | 'MISSING' = 'MISSING';
      let agreementSummary: { id: string; effectiveDate: Date | null; expiryDate: Date | null } | null = null;

      const checkActive = (agreement: { effectiveDate: Date | null; signedAt: Date | null; expiryDate: Date | null }) => {
        const effective = agreement.effectiveDate ?? agreement.signedAt ?? new Date(0);
        const expires = agreement.expiryDate;
        if (effective <= tour.startAt && (!expires || expires >= tour.startAt)) {
          return true;
        }
        if (expires && expires < tour.startAt) {
          status = status === 'MISSING' ? 'EXPIRED' : status;
        }
        return false;
      };

      if (link) {
        agreementSummary = {
          id: link.agreement.id,
          effectiveDate: link.agreement.effectiveDate ?? link.agreement.signedAt ?? null,
          expiryDate: link.agreement.expiryDate ?? null
        };
        status = checkActive(link.agreement) ? 'LINKED' : 'EXPIRED';
      } else {
        for (const agreement of candidateAgreements) {
          if (checkActive(agreement)) {
            status = 'ACTIVE';
            agreementSummary = {
              id: agreement.id,
              effectiveDate: agreement.effectiveDate ?? agreement.signedAt ?? null,
              expiryDate: agreement.expiryDate ?? null
            };
            break;
          }
        }
      }

      return {
        tourId: tour.id,
        startAt: tour.startAt,
        person: {
          id: tour.person.id,
          name: [tour.person.firstName, tour.person.lastName].filter(Boolean).join(' ') || 'Unknown'
        },
        agent: tour.agent
          ? {
              id: tour.agent.id,
              name: [tour.agent.firstName, tour.agent.lastName].filter(Boolean).join(' ')
            }
          : null,
        listing: tour.listing
          ? {
              id: tour.listing.id,
              address: `${tour.listing.addressLine1}, ${tour.listing.city}, ${tour.listing.state}`
            }
          : null,
        status,
        agreement: agreementSummary,
        linkedAt: link?.linkedAt ?? null
      };
    });

    return {
      count: rows.length,
      missing: rows.filter((row) => row.status === 'MISSING').length,
      expired: rows.filter((row) => row.status === 'EXPIRED').length,
      rows
    };
  }

  async getConsents(tenantId: string, _query: GetComplianceStatusDto) {
    const now = new Date();
    const windowStart = subDays(now, 30);
    const baselineWindow = subDays(now, 7);

    const { summary, smsHealth, emailHealth } = await this.consentSummary(tenantId);

    const recentRevocations = await this.prisma.consent.findMany({
      where: {
        tenantId,
        status: ConsentStatus.REVOKED,
        revokedAt: { gte: subDays(now, 7) }
      },
      select: {
        id: true,
        channel: true,
        scope: true,
        revokedAt: true,
        person: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { revokedAt: 'desc' },
      take: 50
    });

    const lastDayRevocations = recentRevocations.filter((consent) => consent.revokedAt && consent.revokedAt >= subDays(now, 1)).length;
    const thirtyDayRevocations = await this.prisma.consent.count({
      where: {
        tenantId,
        status: ConsentStatus.REVOKED,
        revokedAt: { gte: windowStart }
      }
    });

    const averagePerDay = thirtyDayRevocations / 30;
    const spikeDetected = lastDayRevocations > averagePerDay * 2 && lastDayRevocations >= 5;

    return {
      summary: {
        sms: {
          granted: summary.sms.granted,
          revoked: summary.sms.revoked,
          unknown: summary.sms.unknown,
          health: smsHealth
        },
        email: {
          granted: summary.email.granted,
          revoked: summary.email.revoked,
          unknown: summary.email.unknown,
          health: emailHealth
        }
      },
      anomalies: {
        optOutSpike: {
          detected: spikeDetected,
          recentCount: lastDayRevocations,
          baselineDaily: Number.isFinite(averagePerDay) ? averagePerDay : 0
        }
      },
      recentRevocations: recentRevocations.map((consent) => ({
        id: consent.id,
        channel: consent.channel,
        scope: consent.scope,
        revokedAt: consent.revokedAt,
        person: {
          id: consent.person?.id ?? 'unknown',
          name: [consent.person?.firstName, consent.person?.lastName].filter(Boolean).join(' ') || 'Unknown contact'
        }
      })),
      baselineWindowStart: baselineWindow.toISOString()
    };
  }

  async getListings(tenantId: string, query: GetComplianceStatusDto) {
    const timers = await this.prisma.clearCooperationTimer.findMany({
      where: {
        tenantId,
        ...(query.mlsIds && query.mlsIds.length > 0 ? { mlsProfileId: { in: query.mlsIds } } : {})
      },
      include: {
        listing: {
          select: {
            id: true,
            addressLine1: true,
            city: true,
            state: true
          }
        },
        mlsProfile: {
          select: {
            id: true,
            name: true
          }
        },
        lastActor: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    });

    const now = new Date();
    const rows = timers.map((timer) => {
      const dueInHours = timer.dueAt ? differenceInHours(timer.dueAt, now) : null;
      const dueSoon = dueInHours !== null && dueInHours >= 0 && dueInHours <= HOURS_24;
      return {
        id: timer.id,
        status: timer.status,
        dueAt: timer.dueAt,
        dueInHours,
        dueSoon,
        riskReason: timer.riskReason ?? null,
        lastAction: timer.lastAction,
        lastActor: timer.lastActor
          ? {
              id: timer.lastActor.id,
              name: [timer.lastActor.firstName, timer.lastActor.lastName].filter(Boolean).join(' ')
            }
          : null,
        listing: timer.listing
          ? {
              id: timer.listing.id,
              address: `${timer.listing.addressLine1}, ${timer.listing.city}, ${timer.listing.state}`
            }
          : null,
        mlsProfile: timer.mlsProfile
          ? { id: timer.mlsProfile.id, name: timer.mlsProfile.name }
          : null
      };
    });

    return {
      count: rows.length,
      overdue: rows.filter((row) => row.status === ClearCooperationStatus.RED).length,
      dueSoon: rows.filter((row) => row.dueSoon).length,
      rows
    };
  }

  async getDisclaimers(tenantId: string, query: GetComplianceStatusDto) {
    const policies = await this.prisma.disclaimerPolicy.findMany({
      where: {
        tenantId,
        ...(query.mlsIds && query.mlsIds.length > 0 ? { mlsProfileId: { in: query.mlsIds } } : {})
      },
      include: {
        mlsProfile: {
          select: { id: true, name: true }
        }
      }
    });

    const failures = await this.prisma.marketingEvent.findMany({
      where: {
        tenantId,
        eventType: 'IDX_PREFLIGHT',
        OR: [
          { result: { equals: 'FAILURE' } },
          { result: { equals: 'BLOCKED' } }
        ],
        ...(query.mlsIds && query.mlsIds.length > 0 ? { mlsProfileId: { in: query.mlsIds } } : {})
      },
      include: {
        listing: {
          select: { id: true, addressLine1: true, city: true, state: true }
        },
        mlsProfile: {
          select: { id: true, name: true }
        }
      },
      orderBy: { occurredAt: 'desc' },
      take: 50
    });

    return {
      policies: policies.map((policy) => ({
        id: policy.id,
        mlsProfile: {
          id: policy.mlsProfile.id,
          name: policy.mlsProfile.name
        },
        requiredText: policy.requiredText,
        requiredPlacement: policy.requiredPlacement,
        compensationRule: policy.compensationRule,
        lastReviewedAt: policy.lastReviewedAt
      })),
      failures: failures.map((failure) => ({
        id: failure.id,
        occurredAt: failure.occurredAt,
        result: failure.result,
        listing: failure.listing
          ? {
              id: failure.listing.id,
              address: `${failure.listing.addressLine1}, ${failure.listing.city}, ${failure.listing.state}`
            }
          : null,
        mlsProfile: failure.mlsProfile
          ? {
              id: failure.mlsProfile.id,
              name: failure.mlsProfile.name
            }
          : null
      }))
    };
  }

  async getOverrides(tenantId: string, context?: string) {
    const overrides = await this.prisma.overrideLog.findMany({
      where: {
        tenantId,
        ...(context ? { context } : {})
      },
      include: {
        actor: {
          select: { id: true, firstName: true, lastName: true, email: true }
        }
      },
      orderBy: { occurredAt: 'desc' },
      take: 100
    });

    return overrides.map((override) => ({
      id: override.id,
      context: override.context,
      reasonText: override.reasonText,
      metadata: override.metadata,
      occurredAt: override.occurredAt,
      actor: override.actor
        ? {
            id: override.actor.id,
            name: [override.actor.firstName, override.actor.lastName].filter(Boolean).join(' ') || override.actor.email,
            email: override.actor.email
          }
        : null
    }));
  }

  async createOverride(input: {
    tenantId: string;
    actorUserId?: string;
    context: string;
    reasonText?: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    return this.prisma.overrideLog.create({
      data: {
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        context: input.context,
        reasonText: input.reasonText,
        ...(input.metadata !== undefined ? { metadata: input.metadata } : {})
      }
    });
  }

  async exportStatus(tenantId: string, query: GetComplianceStatusDto) {
    const status = await this.getStatus(tenantId, query);
    const lines = [
      'Compliance Center Snapshot',
      `Tenant: ${tenantId}`,
      `Range: ${status.range.start} → ${status.range.end}`,
      `Filters — Agents: ${asCsv(status.filters.agentIds)} | Teams: ${asCsv(status.filters.teamIds)} | MLS: ${asCsv(status.filters.mlsIds)}`,
      '',
      'Key Metrics',
      `• Buyer-rep coverage: ${(status.metrics.buyerRepCoverage.percentage * 100).toFixed(1)}% (${status.metrics.buyerRepCoverage.numerator}/${status.metrics.buyerRepCoverage.denominator})`,
      `• Consent health (SMS): ${(status.metrics.consentHealth.sms.health * 100).toFixed(1)}% granted`,
      `• Consent health (Email): ${(status.metrics.consentHealth.email.health * 100).toFixed(1)}% granted`,
      `• Clear Cooperation timers: total ${status.metrics.clearCooperation.total}, yellow ${status.metrics.clearCooperation.yellow}, red ${status.metrics.clearCooperation.red}, due soon ${status.metrics.clearCooperation.dueSoon}`,
      `• IDX pre-flight failures (7d): ${status.metrics.idxCompliance.failuresLast7Days} / ${status.metrics.idxCompliance.totalChecksLast7Days}`,
      `• Messaging readiness: 10DLC ${status.metrics.messagingReadiness.tenDlcApproved ? 'approved' : 'review'} | DMARC ${status.metrics.messagingReadiness.dmarcAligned ? 'aligned' : 'action required'}`,
      '',
      status.quietHours
        ? `Quiet hours: ${status.quietHours.startHour}:00 → ${status.quietHours.endHour}:00 (${status.quietHours.timezone})`
        : 'Quiet hours: not configured',
      '',
      'Definitions: Buyer-rep coverage = kept tours with active buyer agreements. Consent health = share of contacts with grant status. Cooperation timers follow MLS policy SLA. IDX compliance derived from marketing pre-flight checks. Messaging readiness uses last known 10DLC and DMARC status.'
    ];

    return this.buildPdf(lines);
  }

  async enforceConsent(input: {
    tenantId: string;
    personId: string;
    channel: 'SMS' | 'EMAIL';
    scope: ConsentScope;
    actorUserId?: string;
    overrideQuietHours?: boolean;
    isTransactional?: boolean;
  }) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: input.tenantId },
      select: { quietHoursStart: true, quietHoursEnd: true, timezone: true }
    });

    if (!tenant) {
      throw new BadRequestException('Unknown tenant context');
    }

    if (!input.overrideQuietHours) {
      const timeZone = tenant.timezone ?? 'UTC';
      const hourString = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        hour12: false,
        timeZone
      }).format(new Date());
      const currentHour = Number.parseInt(hourString, 10);

      const { quietHoursStart, quietHoursEnd } = tenant;
      const quietHoursActive =
        quietHoursStart === quietHoursEnd
          ? false
          : quietHoursStart < quietHoursEnd
            ? currentHour >= quietHoursStart && currentHour < quietHoursEnd
            : currentHour >= quietHoursStart || currentHour < quietHoursEnd;

      if (quietHoursActive) {
        throw new BadRequestException(
          'Quiet hours are in effect. Override is required to send this message.'
        );
      }
    } else {
      await this.createOverride({
        tenantId: input.tenantId,
        actorUserId: input.actorUserId,
        context: 'quiet_hours',
        reasonText: 'Message sent with quiet-hours override'
      });
    }

    const consent = await this.prisma.consent.findFirst({
      where: {
        tenantId: input.tenantId,
        personId: input.personId,
        channel: input.channel as ConsentChannel,
        scope: input.scope
      },
      orderBy: { capturedAt: 'desc' }
    });

    if (!consent) {
      if (input.isTransactional) {
        return;
      }
      throw new BadRequestException('No consent on file for this channel and scope.');
    }

    if (consent.status === ConsentStatus.REVOKED) {
      throw new BadRequestException('Contact has revoked consent for this channel.');
    }
  }
}
