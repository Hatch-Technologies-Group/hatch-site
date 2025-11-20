import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { AgentTrainingStatus, UserRole } from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTrainingModuleDto } from './dto/create-training-module.dto';
import { UpdateTrainingModuleDto } from './dto/update-training-module.dto';
import { AssignTrainingModulesDto } from './dto/assign-training-modules.dto';
import { UpdateTrainingProgressDto } from './dto/update-training-progress.dto';

@Injectable()
export class TrainingService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertBrokerInOrg(userId: string, orgId: string) {
    const membership = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { user: { select: { role: true } } }
    });
    if (!membership || membership.user?.role !== UserRole.BROKER) {
      throw new ForbiddenException('Broker access required');
    }
  }

  private async assertAgentProfileInOrg(agentProfileId: string, orgId: string) {
    const profile = await this.prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
    if (!profile || profile.organizationId !== orgId) {
      throw new NotFoundException('Agent profile not found in this organization');
    }
    return profile;
  }

  async createTrainingModule(orgId: string, brokerUserId: string, dto: CreateTrainingModuleDto) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    if (dto.orgFileId) {
      const orgFile = await this.prisma.orgFile.findFirst({ where: { id: dto.orgFileId, orgId } });
      if (!orgFile) {
        throw new NotFoundException('Org file not found in this organization');
      }
    }
    const module = await this.prisma.agentTrainingModule.create({
      data: {
        organizationId: orgId,
        title: dto.title,
        description: dto.description ?? undefined,
        orgFileId: dto.orgFileId ?? undefined,
        externalUrl: dto.externalUrl ?? undefined,
        required: dto.required ?? false,
        estimatedMinutes: dto.estimatedMinutes ?? undefined,
        createdByUserId: brokerUserId
      }
    });
    return module;
  }

  async updateTrainingModule(orgId: string, brokerUserId: string, moduleId: string, dto: UpdateTrainingModuleDto) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    const existing = await this.prisma.agentTrainingModule.findUnique({ where: { id: moduleId } });
    if (!existing || existing.organizationId !== orgId) {
      throw new NotFoundException('Training module not found');
    }
    if (dto.orgFileId) {
      const orgFile = await this.prisma.orgFile.findFirst({ where: { id: dto.orgFileId, orgId } });
      if (!orgFile) throw new NotFoundException('Org file not found in this organization');
    }
    const module = await this.prisma.agentTrainingModule.update({
      where: { id: moduleId },
      data: {
        title: dto.title ?? undefined,
        description: dto.description ?? undefined,
        orgFileId: dto.orgFileId === null ? null : dto.orgFileId ?? undefined,
        externalUrl: dto.externalUrl === null ? null : dto.externalUrl ?? undefined,
        required: dto.required ?? undefined,
        estimatedMinutes: dto.estimatedMinutes === null ? null : dto.estimatedMinutes ?? undefined
      }
    });
    return module;
  }

  async listTrainingModulesForOrg(orgId: string, brokerUserId: string) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    return this.prisma.agentTrainingModule.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' }
    });
  }

  async assignModulesToAgent(orgId: string, brokerUserId: string, dto: AssignTrainingModulesDto) {
    await this.assertBrokerInOrg(brokerUserId, orgId);
    await this.assertAgentProfileInOrg(dto.agentProfileId, orgId);
    const modules = await this.prisma.agentTrainingModule.findMany({
      where: { id: { in: dto.moduleIds }, organizationId: orgId }
    });
    if (modules.length !== dto.moduleIds.length) {
      throw new NotFoundException('One or more modules were not found in this organization');
    }
    const progressRecords = [];
    for (const module of modules) {
      const progress = await this.prisma.agentTrainingProgress.upsert({
        where: {
          agentProfileId_moduleId: {
            agentProfileId: dto.agentProfileId,
            moduleId: module.id
          }
        },
        update: {},
        create: {
          agentProfileId: dto.agentProfileId,
          moduleId: module.id
        },
        include: { module: true }
      });
      progressRecords.push(progress);
    }
    return progressRecords;
  }

  async updateAgentTrainingProgress(
    orgId: string,
    requesterUserId: string,
    agentProfileId: string,
    moduleId: string,
    dto: UpdateTrainingProgressDto
  ) {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterUserId } });
    if (!requester) throw new ForbiddenException('User not found');
    const profile = await this.assertAgentProfileInOrg(agentProfileId, orgId);
    const module = await this.prisma.agentTrainingModule.findUnique({ where: { id: moduleId } });
    if (!module || module.organizationId !== orgId) {
      throw new NotFoundException('Training module not found');
    }
    const isBroker = requester.role === UserRole.BROKER;
    if (!isBroker && profile.userId !== requesterUserId) {
      throw new ForbiddenException('Not allowed to update this training progress');
    }

    const status = dto.status ? AgentTrainingStatus[dto.status] : undefined;
    const completedAt = dto.completedAt === null ? null : dto.completedAt ? new Date(dto.completedAt) : undefined;
    const progress = await this.prisma.agentTrainingProgress.upsert({
      where: {
        agentProfileId_moduleId: { agentProfileId, moduleId }
      },
      update: {
        status: status ?? undefined,
        score: dto.score ?? undefined,
        completedAt: completedAt ?? undefined,
        notes: dto.notes ?? undefined
      },
      create: {
        agentProfileId,
        moduleId,
        status: status ?? AgentTrainingStatus.IN_PROGRESS,
        score: dto.score ?? undefined,
        completedAt: completedAt ?? (status === AgentTrainingStatus.COMPLETED ? new Date() : undefined),
        notes: dto.notes ?? undefined
      },
      include: { module: true }
    });
    return progress;
  }

  async listAgentTrainingProgress(orgId: string, requesterUserId: string, agentProfileId: string) {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterUserId } });
    if (!requester) throw new ForbiddenException('User not found');
    const profile = await this.assertAgentProfileInOrg(agentProfileId, orgId);
    const isBroker = requester.role === UserRole.BROKER;
    if (!isBroker) {
      const membership = await this.prisma.userOrgMembership.findUnique({ where: { userId_orgId: { userId: requesterUserId, orgId } } });
      if (!membership || profile.userId !== requesterUserId) {
        throw new ForbiddenException('Not allowed to view this training progress');
      }
    } else {
      await this.assertBrokerInOrg(requesterUserId, orgId);
    }

    return this.prisma.agentTrainingProgress.findMany({
      where: { agentProfileId },
      include: { module: true },
      orderBy: { updatedAt: 'desc' }
    });
  }
}

