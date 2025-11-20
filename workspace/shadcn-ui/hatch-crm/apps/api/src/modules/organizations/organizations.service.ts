import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AgentInviteStatus, OrgEventType, UserRole } from '@hatch/db';
import { randomUUID } from 'crypto';
import { OrgEventsService } from '../org-events/org-events.service';

import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly events: OrgEventsService) {}

  async createOrganizationForBroker(userId: string, dto: CreateOrganizationDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.role !== UserRole.BROKER) {
      throw new ForbiddenException('Only brokers can create organizations');
    }

    const org = await this.prisma.organization.create({
      data: {
        name: dto.name,
        slug: dto.slug,
        createdByUserId: userId
      }
    });

    await this.prisma.userOrgMembership.create({
      data: {
        userId: userId,
        orgId: org.id,
        isOrgAdmin: true
      }
    });

    try {
      await this.events.logOrgEvent({
        organizationId: org.id,
        actorId: userId,
        type: OrgEventType.ORG_CREATED,
        message: 'Organization created by broker',
        payload: { organizationId: org.id, name: org.name, createdByUserId: userId }
      });
    } catch {}

    return org;
  }

  async getOrganizationsForUser(userId: string) {
    const memberships = await this.prisma.userOrgMembership.findMany({
      where: { userId },
      include: { org: true }
    });
    return memberships.map((m) => m.org);
  }

  private async ensureBrokerInOrg(orgId: string, brokerUserId: string, requireAdmin = false) {
    const [user, org, membership] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: brokerUserId } }),
      this.prisma.organization.findUnique({ where: { id: orgId } }),
      this.prisma.userOrgMembership.findUnique({ where: { userId_orgId: { userId: brokerUserId, orgId } } })
    ]);
    if (!user) throw new NotFoundException('User not found');
    if (!org) throw new NotFoundException('Organization not found');
    if (user.role !== UserRole.BROKER) throw new ForbiddenException('Only brokers can manage invites');
    if (!membership) throw new ForbiddenException('User is not a member of this organization');
    if (requireAdmin && !membership.isOrgAdmin) throw new ForbiddenException('Admin rights required');
    return { user, org, membership };
  }

  async createAgentInvite(orgId: string, brokerUserId: string, dto: { email: string; expiresAt?: string }) {
    await this.ensureBrokerInOrg(orgId, brokerUserId);

    if (!dto.email || !dto.email.includes('@')) {
      throw new BadRequestException('A valid email is required');
    }

    const token = randomUUID();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invite = await this.prisma.agentInvite.create({
      data: {
        organizationId: orgId,
        email: dto.email.toLowerCase(),
        token,
        status: AgentInviteStatus.PENDING,
        invitedByUserId: brokerUserId,
        expiresAt
      }
    });

    // Security note: Returning token here for broker to share via email link.
    try {
      await this.events.logOrgEvent({
        organizationId: orgId,
        actorId: brokerUserId,
        type: OrgEventType.AGENT_INVITE_CREATED,
        message: `Agent invite created for ${invite.email}`,
        payload: { inviteId: invite.id, email: invite.email, invitedByUserId: brokerUserId, expiresAt }
      });
    } catch {}

    return invite;
  }

  async getOrgInvites(orgId: string, brokerUserId: string) {
    await this.ensureBrokerInOrg(orgId, brokerUserId);
    return this.prisma.agentInvite.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
  }
}
