import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { LeadSource, LeadStatus, OrgEventType, UserRole, PlaybookTriggerType } from '@hatch/db';
import { Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { OrgEventsService } from '../org-events/org-events.service';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadStatusDto } from './dto/update-lead-status.dto';
import { PlaybookRunnerService } from '../playbooks/playbook-runner.service';

interface LeadFilters {
  status?: string;
}

@Injectable()
export class OrgLeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgEvents: OrgEventsService,
    private readonly playbooks: PlaybookRunnerService
  ) {}

  private async assertMembership(userId: string, orgId: string) {
    const membership = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: {
        user: { select: { role: true } }
      }
    });
    if (!membership) {
      throw new ForbiddenException('User is not part of this organization');
    }
    const role = membership.user?.role ?? null;
    return { role };
  }

  private async assertBrokerOrAgent(userId: string, orgId: string) {
    const { role } = await this.assertMembership(userId, orgId);
    if (!role || (role !== UserRole.BROKER && role !== UserRole.AGENT && role !== UserRole.TEAM_LEAD)) {
      throw new ForbiddenException('Broker or agent access required');
    }
    return { role };
  }

  private async assertAgentProfileInOrg(agentProfileId: string, orgId: string) {
    const profile = await this.prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
    if (!profile || profile.organizationId !== orgId) {
      throw new NotFoundException('Agent profile not found');
    }
    return profile;
  }

  private async assertListingInOrg(listingId: string, orgId: string) {
    const listing = await this.prisma.orgListing.findUnique({ where: { id: listingId } });
    if (!listing || listing.organizationId !== orgId) {
      throw new NotFoundException('Listing not found');
    }
    return listing;
  }

  private normalizeStatus(value: string) {
    const normalized = value.toUpperCase();
    const allowed = Object.values(LeadStatus) as string[];
    if (!allowed.includes(normalized)) {
      throw new BadRequestException('Invalid lead status');
    }
    return normalized as LeadStatus;
  }

  async createLeadFromPortal(orgId: string, consumerId: string | null, dto: CreateLeadDto) {
    let listingAgentProfileId: string | null = null;
    if (dto.listingId) {
      const listing = await this.assertListingInOrg(dto.listingId, orgId);
      listingAgentProfileId = listing.agentProfileId;
    }

    let consumerFallbackName: string | undefined;
    let consumerFallbackEmail: string | undefined;

    if (consumerId) {
      const consumer = await this.prisma.user.findUnique({ where: { id: consumerId } });
      if (consumer) {
        consumerFallbackName = `${consumer.firstName ?? ''} ${consumer.lastName ?? ''}`.trim() || undefined;
        consumerFallbackEmail = consumer.email;
      }
    }

    const desiredMoveIn = dto.desiredMoveIn ? new Date(dto.desiredMoveIn) : undefined;
    const data: Prisma.LeadUncheckedCreateInput = {
      organizationId: orgId,
      consumerId: consumerId ?? undefined,
      listingId: dto.listingId ?? undefined,
      agentProfileId: listingAgentProfileId ?? undefined,
      name: (dto.name ?? consumerFallbackName) ?? undefined,
      email: (dto.email ?? consumerFallbackEmail) ?? undefined,
      phone: dto.phone ?? undefined,
      message: dto.message ?? undefined,
      desiredMoveIn: desiredMoveIn ?? undefined,
      budgetMin: dto.budgetMin ?? undefined,
      budgetMax: dto.budgetMax ?? undefined,
      bedrooms: dto.bedrooms ?? undefined,
      bathrooms: dto.bathrooms ?? undefined,
      source: dto.listingId ? LeadSource.LISTING_INQUIRY : LeadSource.PORTAL_SIGNUP,
      createdByUserId: consumerId ?? undefined
    };

    const lead = await this.prisma.lead.create({ data });

    await this.orgEvents.logOrgEvent({
      organizationId: orgId,
      type: OrgEventType.ORG_LEAD_CREATED,
      payload: {
        leadId: lead.id,
        listingId: lead.listingId ?? null,
        source: lead.source
      }
    });

    void this.playbooks.runTrigger(orgId, PlaybookTriggerType.LEAD_CREATED, { leadId: lead.id }).catch(() => undefined);

    return lead;
  }

  async listLeadsForOrg(orgId: string, userId: string, filters: LeadFilters = {}) {
    const { role } = await this.assertBrokerOrAgent(userId, orgId);
    const where: Prisma.LeadWhereInput = {
      organizationId: orgId
    };

    if (filters.status) {
      where.status = this.normalizeStatus(filters.status);
    }

    if (role !== UserRole.BROKER && role !== UserRole.TEAM_LEAD) {
      const agentProfile = await this.prisma.agentProfile.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId } }
      });
      if (!agentProfile) {
        return [];
      }
      where.agentProfileId = agentProfile.id;
    }

    return this.prisma.lead.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        listing: true,
        agentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        }
      }
    });
  }

  async updateLeadStatus(orgId: string, userId: string, leadId: string, dto: UpdateLeadStatusDto) {
    const { role } = await this.assertBrokerOrAgent(userId, orgId);
    const lead = await this.prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead || lead.organizationId !== orgId) {
      throw new NotFoundException('Lead not found');
    }

    const requestedStatus = this.normalizeStatus(dto.status);

    let nextAgentProfileId: string | null | undefined = undefined;
    if (dto.agentProfileId !== undefined) {
      if (dto.agentProfileId === null) {
        nextAgentProfileId = null;
      } else {
        const profile = await this.assertAgentProfileInOrg(dto.agentProfileId, orgId);
        nextAgentProfileId = profile.id;
      }
    }

    if (role === UserRole.AGENT) {
      const agentProfile = await this.prisma.agentProfile.findUnique({
        where: { organizationId_userId: { organizationId: orgId, userId } }
      });
      if (!agentProfile) {
        throw new ForbiddenException('Agent profile not found');
      }
      if (lead.agentProfileId && lead.agentProfileId !== agentProfile.id) {
        throw new ForbiddenException('Cannot modify leads assigned to other agents');
      }
      if (nextAgentProfileId && nextAgentProfileId !== agentProfile.id) {
        throw new ForbiddenException('Agents cannot reassign leads to other agents');
      }
      nextAgentProfileId = agentProfile.id;
    }

    const updated = await this.prisma.lead.update({
      where: { id: leadId },
      data: {
        status: requestedStatus,
        agentProfileId: nextAgentProfileId === undefined ? undefined : nextAgentProfileId
      }
    });

    void this.playbooks
      .runTrigger(orgId, PlaybookTriggerType.LEAD_UPDATED, { leadId: updated.id, status: updated.status })
      .catch(() => undefined);

    await this.orgEvents.logOrgEvent({
      organizationId: orgId,
      actorId: userId,
      type: OrgEventType.ORG_LEAD_STATUS_CHANGED,
      payload: {
        leadId: updated.id,
        status: updated.status,
        agentProfileId: updated.agentProfileId ?? null
      }
    });

    return updated;
  }
}
