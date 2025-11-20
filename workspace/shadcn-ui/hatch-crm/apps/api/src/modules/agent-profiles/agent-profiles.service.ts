import { ForbiddenException, Inject, Injectable, NotFoundException, forwardRef } from '@nestjs/common';
import { AgentRiskLevel, UserRole, WorkflowTaskTrigger } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { UpsertAgentProfileDto } from './dto/upsert-agent-profile.dto';
import { UpdateAgentComplianceDto } from './dto/update-agent-compliance.dto';

@Injectable()
export class AgentProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => OnboardingService))
    private readonly onboarding: OnboardingService
  ) {}

  private async assertUserInOrg(userId: string, orgId: string) {
    const member = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } }
    });
    if (!member) {
      throw new ForbiddenException('User is not part of this organization');
    }
    return member;
  }

  private async assertBrokerInOrg(userId: string, orgId: string) {
    await this.assertUserInOrg(userId, orgId);
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!user || user.role !== UserRole.BROKER) {
      throw new ForbiddenException('Only brokers can manage agent profiles');
    }
  }

  async upsertAgentProfile(orgId: string, brokerUserId: string, dto: UpsertAgentProfileDto) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    await this.assertUserInOrg(dto.userId, orgId);

    const tagsString = dto.tags?.length ? dto.tags.join(',') : undefined;
    const licenseExpiresAt = dto.licenseExpiresAt ? new Date(dto.licenseExpiresAt) : undefined;

    const data = {
      licenseNumber: dto.licenseNumber ?? undefined,
      licenseState: dto.licenseState ?? undefined,
      licenseExpiresAt,
      isCommercial: dto.isCommercial ?? undefined,
      isResidential: dto.isResidential ?? undefined,
      title: dto.title ?? undefined,
      bio: dto.bio ?? undefined,
      tags: tagsString
    };

    const profile = await this.prisma.agentProfile.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId: dto.userId } },
      update: data,
      create: {
        organizationId: orgId,
        userId: dto.userId,
        ...data
      }
    });

    return profile;
  }

  async updateAgentCompliance(orgId: string, brokerUserId: string, agentProfileId: string, dto: UpdateAgentComplianceDto) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    const profile = await this.prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
    if (!profile || profile.organizationId !== orgId) {
      throw new NotFoundException('Agent profile not found');
    }

    const updated = await this.prisma.agentProfile.update({
      where: { id: agentProfileId },
      data: {
        isCompliant: dto.isCompliant ?? undefined,
        requiresAction: dto.requiresAction ?? undefined,
        riskLevel: dto.riskLevel ? (dto.riskLevel as AgentRiskLevel) : undefined,
        riskScore: dto.riskScore ?? undefined,
        riskFlags: dto.riskFlags ? (dto.riskFlags as any) : undefined,
        ceCycleStartAt: dto.ceCycleStartAt ? new Date(dto.ceCycleStartAt) : undefined,
        ceCycleEndAt: dto.ceCycleEndAt ? new Date(dto.ceCycleEndAt) : undefined,
        ceHoursRequired: dto.ceHoursRequired ?? undefined,
        ceHoursCompleted: dto.ceHoursCompleted ?? undefined
      }
    });

    const ceIncomplete =
      (updated.ceHoursRequired ?? 0) > 0 &&
      (updated.ceHoursCompleted ?? 0) < (updated.ceHoursRequired ?? 0);
    if (ceIncomplete) {
      await this.onboarding.generateOffboardingTasksForAgent(
        orgId,
        updated.id,
        WorkflowTaskTrigger.CE_INCOMPLETE,
        `CE:${updated.id}`,
        brokerUserId
      );
    }

    const expiredMembership = await this.prisma.agentMembership.findFirst({
      where: { agentProfileId: updated.id, status: 'EXPIRED' }
    });
    if (expiredMembership) {
      await this.onboarding.generateOffboardingTasksForAgent(
        orgId,
        updated.id,
        WorkflowTaskTrigger.MEMBERSHIP_EXPIRED,
        `MEMBERSHIP:${expiredMembership.id}`,
        brokerUserId
      );
    }

    return updated;
  }

  async listAgentProfilesForOrg(orgId: string, brokerUserId: string) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    return this.prisma.agentProfile.findMany({
      where: { organizationId: orgId },
      orderBy: { updatedAt: 'desc' },
      include: {
        user: true,
        memberships: true,
        trainingProgress: true,
        ceRecords: true
      }
    });
  }

  async getAgentProfile(orgId: string, requesterUserId: string, agentProfileId: string) {
    const profile = await this.prisma.agentProfile.findUnique({
      where: { id: agentProfileId },
      include: {
        user: true,
        memberships: true,
        trainingProgress: { include: { module: true } },
        ceRecords: true
      }
    });
    if (!profile || profile.organizationId !== orgId) {
      throw new NotFoundException('Agent profile not found');
    }

    if (profile.userId === requesterUserId) {
      await this.assertUserInOrg(requesterUserId, orgId);
      return profile;
    }

    await this.assertUserInOrg(requesterUserId, orgId);
    const requester = await this.prisma.user.findUnique({ where: { id: requesterUserId }, select: { role: true } });
    if (requester?.role !== UserRole.BROKER) {
      throw new ForbiddenException('Not authorized to view this profile');
    }
    return profile;
  }
}
