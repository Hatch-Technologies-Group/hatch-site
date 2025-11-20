import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AgentInviteStatus, OrgEventType, UserRole, WorkflowTaskTrigger } from '@hatch/db';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { OrgEventsService } from '../org-events/org-events.service';
import { TokensService } from '../../platform/auth/tokens.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { AcceptAgentInviteDto } from './dto/accept-agent-invite.dto';

@Injectable()
export class AgentInvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokensService,
    private readonly events: OrgEventsService,
    private readonly onboarding: OnboardingService
  ) {}

  private async ensureTenantForOrg(orgId: string) {
    const org = await this.prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organization not found');
    const tenant = await this.prisma.tenant.findFirst({ where: { organizationId: orgId } });
    if (tenant) return tenant;
    const derived = (org.name ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const slugBase = org.slug ?? (derived || 'org');
    const slug = `${slugBase}-${org.id.substring(0, 6)}`;
    return this.prisma.tenant.create({
      data: {
        organizationId: org.id,
        name: org.name,
        slug
      }
    });
  }

  async acceptInvite(dto: AcceptAgentInviteDto) {
    const now = new Date();
    const invite = await this.prisma.agentInvite.findUnique({ where: { token: dto.token } });
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.status !== AgentInviteStatus.PENDING) {
      throw new BadRequestException('Invite is not pending');
    }
    if (invite.expiresAt.getTime() < now.getTime()) {
      await this.prisma.agentInvite.update({
        where: { id: invite.id },
        data: { status: AgentInviteStatus.EXPIRED }
      });
      throw new BadRequestException('Invite has expired');
    }

    const email = invite.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException(
        'A user with this email already exists. Account linking is not implemented yet.'
      );
    }

    const tenant = await this.ensureTenantForOrg(invite.organizationId);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        organizationId: invite.organizationId,
        tenantId: tenant.id,
        role: UserRole.AGENT,
        passwordHash
      }
    });

    await this.prisma.userOrgMembership.create({
      data: {
        userId: user.id,
        orgId: invite.organizationId,
        isOrgAdmin: false
      }
    });

    await this.prisma.agentInvite.update({
      where: { id: invite.id },
      data: { status: AgentInviteStatus.ACCEPTED, acceptedByUserId: user.id }
    });

    const agentProfile = await this.prisma.agentProfile.upsert({
      where: { organizationId_userId: { organizationId: invite.organizationId, userId: user.id } },
      update: {},
      create: {
        organizationId: invite.organizationId,
        userId: user.id
      }
    });

    const accessToken = this.tokens.issueAccess({
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: [user.role.toLowerCase()],
      tenantId: user.tenantId,
      orgId: user.organizationId
    });
    const refreshToken = this.tokens.issueRefresh({ sub: user.id });

    try {
      await this.events.logOrgEvent({
        organizationId: invite.organizationId,
        tenantId: user.tenantId,
        actorId: user.id,
        type: OrgEventType.AGENT_INVITE_ACCEPTED,
        message: `Agent ${user.email} joined organization via invite`,
        payload: { inviteId: invite.id, agentUserId: user.id, email: user.email }
      });
    } catch {}

    await this.onboarding.generateOnboardingTasksForAgent(
      invite.organizationId,
      agentProfile.id,
      WorkflowTaskTrigger.AGENT_INVITE_ACCEPTED,
      `INVITE:${invite.id}`,
      user.id
    );

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email, role: user.role }
    };
  }
}
