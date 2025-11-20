import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AgentLifecycleStage,
  OrgEventType,
  WorkflowTaskStatus,
  WorkflowTaskTrigger,
  WorkflowType
} from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { OrgEventsService } from '../org-events/org-events.service';
import { CreateWorkflowTemplateDto } from './dto/create-workflow-template.dto';
import { UpdateWorkflowTemplateDto } from './dto/update-workflow-template.dto';
import { GenerateOnboardingTasksDto } from './dto/generate-onboarding-tasks.dto';
import { UpdateAgentTaskStatusDto } from './dto/update-agent-task-status.dto';

const OPEN_STATUSES: WorkflowTaskStatus[] = ['PENDING', 'IN_PROGRESS'];

@Injectable()
export class OnboardingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgEvents: OrgEventsService
  ) {}

  private async assertUserIsBrokerInOrg(userId: string, orgId: string) {
    const membership = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } },
      select: { user: { select: { role: true } } }
    });
    if (!membership || membership.user?.role !== 'BROKER') {
      throw new ForbiddenException('Broker access required');
    }
    return membership;
  }

  private async assertAgentProfileInOrg(agentProfileId: string, orgId: string) {
    const profile = await this.prisma.agentProfile.findUnique({ where: { id: agentProfileId } });
    if (!profile || profile.organizationId !== orgId) {
      throw new NotFoundException('Agent profile not found in this organization');
    }
    return profile;
  }

  private async validateTaskReferences(orgId: string, tasks: Array<{ trainingModuleId?: string; orgFileId?: string }>) {
    const trainingModuleIds = Array.from(
      new Set(tasks.map((task) => task.trainingModuleId).filter((id): id is string => Boolean(id)))
    );
    const orgFileIds = Array.from(new Set(tasks.map((task) => task.orgFileId).filter((id): id is string => Boolean(id))));

    if (trainingModuleIds.length) {
      const foundModules = await this.prisma.agentTrainingModule.count({
        where: { id: { in: trainingModuleIds }, organizationId: orgId }
      });
      if (foundModules !== trainingModuleIds.length) {
        throw new NotFoundException('One or more training modules were not found in this organization');
      }
    }

    if (orgFileIds.length) {
      const foundFiles = await this.prisma.orgFile.count({ where: { id: { in: orgFileIds }, orgId } });
      if (foundFiles !== orgFileIds.length) {
        throw new NotFoundException('One or more org files were not found in this organization');
      }
    }
  }

  async createWorkflowTemplate(orgId: string, brokerUserId: string, dto: CreateWorkflowTemplateDto) {
    await this.assertUserIsBrokerInOrg(brokerUserId, orgId);
    const tasks = dto.tasks ?? [];
    await this.validateTaskReferences(orgId, tasks);
    const template = await this.prisma.orgWorkflowTemplate.create({
      data: {
        organizationId: orgId,
        type: dto.type as WorkflowType,
        name: dto.name,
        description: dto.description ?? undefined,
        isDefault: dto.isDefault ?? false,
        createdByUserId: brokerUserId,
        tasks: {
          create: tasks.map((task, index) => ({
            title: task.title,
            description: task.description ?? undefined,
            assignedToRole: task.assignedToRole ?? undefined,
            trainingModuleId: task.trainingModuleId ?? undefined,
            orgFileId: task.orgFileId ?? undefined,
            orderIndex: index
          }))
        }
      },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } }
    });

    if (template.isDefault) {
      await this.prisma.orgWorkflowTemplate.updateMany({
        where: {
          organizationId: orgId,
          type: template.type,
          id: { not: template.id }
        },
        data: { isDefault: false }
      });
    }

    await this.orgEvents.logOrgEvent({
      organizationId: orgId,
      actorId: brokerUserId,
      type: OrgEventType.ONBOARDING_TEMPLATE_CREATED,
      payload: { templateId: template.id, type: template.type }
    });

    return template;
  }

  async updateWorkflowTemplate(orgId: string, brokerUserId: string, templateId: string, dto: UpdateWorkflowTemplateDto) {
    await this.assertUserIsBrokerInOrg(brokerUserId, orgId);
    const existing = await this.prisma.orgWorkflowTemplate.findUnique({ where: { id: templateId } });
    if (!existing || existing.organizationId !== orgId) {
      throw new NotFoundException('Workflow template not found');
    }

    if (dto.tasks) {
      await this.validateTaskReferences(orgId, dto.tasks);
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.orgWorkflowTemplate.update({
        where: { id: templateId },
        data: {
          name: dto.name ?? undefined,
          description: dto.description ?? undefined,
          isDefault: dto.isDefault ?? undefined
        }
      });

      if (dto.tasks) {
        await tx.orgWorkflowTemplateTask.deleteMany({ where: { templateId } });
        if (dto.tasks.length) {
        await tx.orgWorkflowTemplateTask.createMany({
          data: dto.tasks.map((task, index) => ({
            templateId,
            title: task.title ?? 'Task',
            description: task.description ?? undefined,
            assignedToRole: task.assignedToRole ?? undefined,
            trainingModuleId: task.trainingModuleId ?? undefined,
              orgFileId: task.orgFileId ?? undefined,
              orderIndex: task.orderIndex ?? index
            }))
          });
        }
      }

      if (dto.isDefault) {
        await tx.orgWorkflowTemplate.updateMany({
          where: { organizationId: orgId, type: existing.type, id: { not: templateId } },
          data: { isDefault: false }
        });
      }

      return tx.orgWorkflowTemplate.findUnique({
        where: { id: templateId },
        include: { tasks: { orderBy: { orderIndex: 'asc' } } }
      });
    });
  }

  async listWorkflowTemplates(orgId: string, brokerUserId: string, type?: 'ONBOARDING' | 'OFFBOARDING') {
    await this.assertUserIsBrokerInOrg(brokerUserId, orgId);
    return this.prisma.orgWorkflowTemplate.findMany({
      where: {
        organizationId: orgId,
        ...(type ? { type } : {})
      },
      orderBy: { createdAt: 'desc' },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } }
    });
  }

  async manualGenerateOnboardingTasks(orgId: string, brokerUserId: string, dto: GenerateOnboardingTasksDto) {
    await this.assertUserIsBrokerInOrg(brokerUserId, orgId);
    const profile = await this.assertAgentProfileInOrg(dto.agentProfileId, orgId);
    const template = dto.workflowTemplateId
      ? await this.prisma.orgWorkflowTemplate.findFirst({
          where: { id: dto.workflowTemplateId, organizationId: orgId, type: WorkflowType.ONBOARDING },
          include: { tasks: { orderBy: { orderIndex: 'asc' } } }
        })
      : await this.findDefaultTemplate(orgId, WorkflowType.ONBOARDING);

    if (!template) {
      throw new NotFoundException('Onboarding workflow template not found');
    }

    return this.generateTasksFromTemplate({
      orgId,
      agentProfileId: profile.id,
      template,
      type: WorkflowType.ONBOARDING,
      trigger: WorkflowTaskTrigger.MANUAL,
      triggerSource: `MANUAL:${template.id}:${Date.now()}`,
      actorId: brokerUserId,
      replaceExisting: true
    });
  }

  async listAgentTasks(
    orgId: string,
    requesterUserId: string,
    agentProfileId: string,
    type?: 'ONBOARDING' | 'OFFBOARDING'
  ) {
    const requester = await this.prisma.user.findUnique({ where: { id: requesterUserId }, select: { role: true } });
    if (!requester) {
      throw new ForbiddenException('User not found');
    }
    const profile = await this.assertAgentProfileInOrg(agentProfileId, orgId);

    if (requester.role === 'BROKER') {
      await this.assertUserIsBrokerInOrg(requesterUserId, orgId);
    } else {
      const membership = await this.prisma.userOrgMembership.findUnique({
        where: { userId_orgId: { userId: requesterUserId, orgId } }
      });
      if (!membership || profile.userId !== requesterUserId) {
        throw new ForbiddenException('Not authorized to view these tasks');
      }
    }

    return this.prisma.agentWorkflowTask.findMany({
      where: {
        organizationId: orgId,
        agentProfileId,
        ...(type ? { type } : {})
      },
      orderBy: [{ createdAt: 'asc' }]
    });
  }

  async updateAgentTaskStatus(orgId: string, userId: string, taskId: string, dto: UpdateAgentTaskStatusDto) {
    const task = await this.prisma.agentWorkflowTask.findUnique({
      where: { id: taskId },
      include: { agentProfile: true }
    });
    if (!task || task.organizationId !== orgId || !task.agentProfile) {
      throw new NotFoundException('Task not found in this organization');
    }

    const requester = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (!requester) {
      throw new ForbiddenException('User not found');
    }

    if (requester.role !== 'BROKER') {
      const membership = await this.prisma.userOrgMembership.findUnique({
        where: { userId_orgId: { userId, orgId } }
      });
      if (!membership || task.agentProfile.userId !== userId) {
        throw new ForbiddenException('Not authorized to update this task');
      }
    } else {
      await this.assertUserIsBrokerInOrg(userId, orgId);
    }

    const status = dto.status as WorkflowTaskStatus;
    if (!['PENDING', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'].includes(status)) {
      throw new BadRequestException('Invalid task status');
    }

    const updateData: Record<string, unknown> = { status };
    if (status === 'COMPLETED') {
      updateData.completedAt = new Date();
      updateData.completedByUserId = userId;
    } else if (status === 'PENDING' || status === 'IN_PROGRESS') {
      updateData.completedAt = null;
      updateData.completedByUserId = null;
    }

    const updated = await this.prisma.agentWorkflowTask.update({
      where: { id: taskId },
      data: updateData as any
    });

    if (status === 'COMPLETED') {
      await this.orgEvents.logOrgEvent({
        organizationId: orgId,
        actorId: userId,
        type:
          updated.type === WorkflowType.OFFBOARDING
            ? OrgEventType.OFFBOARDING_TASK_COMPLETED
            : OrgEventType.ONBOARDING_TASK_COMPLETED,
        payload: {
          taskId: updated.id,
          agentProfileId: updated.agentProfileId,
          trigger: updated.trigger,
          templateId: updated.templateId ?? null
        }
      });
    }

    if (updated.type === WorkflowType.ONBOARDING && status === 'COMPLETED') {
      const remaining = await this.prisma.agentWorkflowTask.count({
        where: {
          agentProfileId: updated.agentProfileId,
          type: WorkflowType.ONBOARDING,
          status: { in: OPEN_STATUSES }
        }
      });
      if (remaining === 0) {
        await this.prisma.agentProfile.update({
          where: { id: updated.agentProfileId },
          data: { lifecycleStage: AgentLifecycleStage.ACTIVE }
        });
      }
    }

    return updated;
  }

  async generateOnboardingTasksForAgent(
    orgId: string,
    agentProfileId: string,
    trigger: WorkflowTaskTrigger,
    triggerSource: string,
    actorId?: string
  ) {
    const template = await this.findDefaultTemplate(orgId, WorkflowType.ONBOARDING);
    if (!template) return [];
    return this.generateTasksFromTemplate({
      orgId,
      agentProfileId,
      template,
      type: WorkflowType.ONBOARDING,
      trigger,
      triggerSource,
      actorId
    });
  }

  async generateOffboardingTasksForAgent(
    orgId: string,
    agentProfileId: string,
    trigger: WorkflowTaskTrigger,
    triggerSource: string,
    actorId?: string
  ) {
    const template = await this.findDefaultTemplate(orgId, WorkflowType.OFFBOARDING);
    if (!template) return [];
    return this.generateTasksFromTemplate({
      orgId,
      agentProfileId,
      template,
      type: WorkflowType.OFFBOARDING,
      trigger,
      triggerSource,
      actorId
    });
  }

  private async findDefaultTemplate(orgId: string, type: WorkflowType) {
    return this.prisma.orgWorkflowTemplate.findFirst({
      where: { organizationId: orgId, type, isDefault: true },
      include: { tasks: { orderBy: { orderIndex: 'asc' } } }
    });
  }

  private async generateTasksFromTemplate(params: {
    orgId: string;
    agentProfileId: string;
    template: NonNullable<Awaited<ReturnType<OnboardingService['findDefaultTemplate']>>>;
    type: WorkflowType;
    trigger: WorkflowTaskTrigger;
    triggerSource: string;
    actorId?: string;
    replaceExisting?: boolean;
  }) {
    const { orgId, agentProfileId, template, type, trigger, triggerSource, actorId, replaceExisting } = params;
    if (!template) {
      return [];
    }

    const duplicateBatch = await this.prisma.agentWorkflowTask.findFirst({
      where: {
        organizationId: orgId,
        agentProfileId,
        type,
        trigger,
        triggerSource
      }
    });
    if (duplicateBatch && !replaceExisting) {
      return this.prisma.agentWorkflowTask.findMany({
        where: { organizationId: orgId, agentProfileId, type, trigger, triggerSource },
        orderBy: { createdAt: 'asc' }
      });
    }

    await this.prisma.$transaction(async (tx) => {
      if (replaceExisting) {
        await tx.agentWorkflowTask.deleteMany({
          where: {
            organizationId: orgId,
            agentProfileId,
            type,
            templateId: template.id
          }
        });
      }

      if (template.tasks.length) {
        await tx.agentWorkflowTask.createMany({
          data: template.tasks.map((task) => ({
            organizationId: orgId,
            agentProfileId,
            templateId: template.id,
            templateTaskId: task.id,
            type,
            title: task.title,
            description: task.description ?? undefined,
            assignedToRole: task.assignedToRole ?? undefined,
            trigger,
            triggerSource,
            status: WorkflowTaskStatus.PENDING
          }))
        });
      }

      await tx.agentProfile.update({
        where: { id: agentProfileId },
        data: {
          lifecycleStage:
            type === WorkflowType.OFFBOARDING ? AgentLifecycleStage.OFFBOARDING : AgentLifecycleStage.ONBOARDING
        }
      });
    });

    await this.orgEvents.logOrgEvent({
      organizationId: orgId,
      actorId: actorId ?? null,
      type:
        type === WorkflowType.OFFBOARDING
          ? OrgEventType.OFFBOARDING_TASK_GENERATED
          : OrgEventType.ONBOARDING_TASK_GENERATED,
      payload: {
        agentProfileId,
        templateId: template.id,
        trigger,
        triggerSource,
        taskCount: template.tasks.length
      }
    });

    return this.prisma.agentWorkflowTask.findMany({
      where: {
        organizationId: orgId,
        agentProfileId,
        type,
        trigger,
        triggerSource
      },
      orderBy: { createdAt: 'asc' }
    });
  }
}
