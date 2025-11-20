import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  AiCopilotActionStatus,
  AiCopilotInsightType,
  Prisma
} from '@hatch/db';

import { PrismaService } from '../prisma/prisma.service';
import { AiService } from '../ai/ai.service';
import { GetAgentBriefingDto } from './dto/get-agent-briefing.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';

const MAX_CONTEXT_ROWS = 50;

@Injectable()
export class AiCopilotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService
  ) {}

  private async assertAgentInOrg(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.role !== 'AGENT') {
      throw new ForbiddenException('Agent access required');
    }
    const membership = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } }
    });
    if (!membership) {
      throw new ForbiddenException('Agent is not a member of this organization');
    }
    const agentProfile = await this.prisma.agentProfile.findFirst({
      where: { organizationId: orgId, userId }
    });
    if (!agentProfile) {
      throw new NotFoundException('Agent profile not found');
    }
    return agentProfile;
  }

  private async buildAgentContext(orgId: string, agentProfileId: string, date: Date) {
    const sevenDays = new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [leads, tasks, listings, transactions, rentalTaxes] = await Promise.all([
      this.prisma.lead.findMany({
        where: {
          organizationId: orgId,
          agentProfileId,
          status: { in: ['NEW', 'CONTACTED', 'QUALIFIED', 'APPOINTMENT_SET'] }
        },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
          budgetMin: true,
          budgetMax: true,
          desiredMoveIn: true
        },
        orderBy: { createdAt: 'desc' },
        take: MAX_CONTEXT_ROWS
      }),
      this.prisma.agentWorkflowTask.findMany({
        where: {
          organizationId: orgId,
          agentProfileId,
          status: { in: ['PENDING', 'IN_PROGRESS'] }
        },
        select: {
          id: true,
          type: true,
          title: true,
          dueAt: true,
          status: true
        },
        orderBy: { dueAt: 'asc' },
        take: MAX_CONTEXT_ROWS
      }),
      this.prisma.orgListing.findMany({
        where: {
          organizationId: orgId,
          agentProfileId,
          status: { in: ['ACTIVE', 'PENDING'] }
        },
        select: {
          id: true,
          addressLine1: true,
          city: true,
          state: true,
          status: true,
          expiresAt: true,
          listPrice: true
        },
        orderBy: { updatedAt: 'desc' },
        take: MAX_CONTEXT_ROWS
      }),
      this.prisma.orgTransaction.findMany({
        where: {
          organizationId: orgId,
          agentProfileId,
          status: { in: ['UNDER_CONTRACT', 'CONTINGENT'] },
          closingDate: { not: null, gte: date, lte: sevenDays }
        },
        select: {
          id: true,
          buyerName: true,
          sellerName: true,
          closingDate: true,
          status: true
        },
        orderBy: { closingDate: 'asc' },
        take: MAX_CONTEXT_ROWS
      }),
      this.prisma.rentalTaxSchedule.findMany({
        where: {
          lease: { organizationId: orgId },
          dueDate: { gte: date, lte: sevenDays },
          status: 'PENDING'
        },
        select: {
          id: true,
          leaseId: true,
          dueDate: true,
          amountDue: true,
          lease: {
            select: {
              tenantName: true,
              unit: {
                select: {
                  property: {
                    select: { addressLine1: true, city: true, state: true }
                  }
                }
              }
            }
          }
        },
        orderBy: { dueDate: 'asc' },
        take: MAX_CONTEXT_ROWS
      })
    ]);

    return {
      leads,
      tasks,
      listings,
      transactions,
      rentalTaxes
    };
  }

  async getOrGenerateDailyBriefing(orgId: string, userId: string, dto: GetAgentBriefingDto) {
    const agentProfile = await this.assertAgentInOrg(orgId, userId);
    const targetDate = dto.date ? new Date(dto.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const existing = await this.prisma.aiCopilotInsight.findFirst({
      where: {
        organizationId: orgId,
        agentProfileId: agentProfile.id,
        type: AiCopilotInsightType.DAILY_BRIEFING,
        createdAt: { gte: startOfDay, lte: endOfDay }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (existing) {
      const actions = await this.listActions(agentProfile.id, orgId);
      return { insight: existing, actions };
    }

    const context = await this.buildAgentContext(orgId, agentProfile.id, startOfDay);

    const systemPrompt =
      'You are Hatch AI Agent Copilot. Given the JSON context, produce a short JSON payload: ' +
      '{"title":string,"summary":string,"actions":[{"title":string,"description"?:string,' +
      '"priority"?:number,"leadId"?:string,"listingId"?:string,"transactionId"?:string,"leaseId"?:string}]}. ' +
      'Keep the summary actionable and focus on concrete next steps for the agent.';

    const aiResult = await this.aiService.runStructuredChat({
      systemPrompt,
      responseFormat: 'json_object',
      temperature: 0.2,
      messages: [{ role: 'user', content: JSON.stringify({
        agentProfile: { id: agentProfile.id, userId: agentProfile.userId },
        date: startOfDay.toISOString(),
        context
      }) }]
    });

    let parsed: { title?: string; summary?: string; actions?: Array<Record<string, any>> } = {};
    if (aiResult.text) {
      try {
        parsed = JSON.parse(aiResult.text);
      } catch (err) {
        parsed = {};
      }
    }

    const insight = await this.prisma.aiCopilotInsight.create({
      data: {
        organizationId: orgId,
        agentProfileId: agentProfile.id,
        type: AiCopilotInsightType.DAILY_BRIEFING,
        title: parsed.title ?? 'Your day at a glance',
        summary:
          parsed.summary ??
          'Focus on your highest priority leads and complete outstanding tasks to keep deals moving forward.',
        data: context as Prisma.InputJsonValue
      }
    });

    const actionsPayload = Array.isArray(parsed.actions) ? parsed.actions : [];
    const actionCreates = actionsPayload
      .filter((action) => typeof action?.title === 'string')
      .map((action) =>
        this.prisma.aiCopilotActionRecommendation.create({
          data: {
            organizationId: orgId,
            agentProfileId: agentProfile.id,
            title: action.title,
            description: action.description ?? null,
            priority: action.priority ?? null,
            leadId: action.leadId ?? null,
            orgListingId: action.listingId ?? null,
            orgTransactionId: action.transactionId ?? null,
            leaseId: action.leaseId ?? null,
            metadata: action.metadata ?? undefined
          }
        })
      );

    const createdActions = actionCreates.length > 0 ? await this.prisma.$transaction(actionCreates) : [];

    return {
      insight,
      actions: createdActions
    };
  }

  private listActions(agentProfileId: string, orgId: string) {
    return this.prisma.aiCopilotActionRecommendation.findMany({
      where: { organizationId: orgId, agentProfileId },
      orderBy: [
        { status: 'asc' },
        { priority: 'asc' },
        { createdAt: 'desc' }
      ],
      take: 50
    });
  }

  async listActionsForAgent(orgId: string, userId: string) {
    const agentProfile = await this.assertAgentInOrg(orgId, userId);
    return this.listActions(agentProfile.id, orgId);
  }

  async updateActionStatus(orgId: string, userId: string, actionId: string, dto: UpdateActionStatusDto) {
    const agentProfile = await this.assertAgentInOrg(orgId, userId);

    const action = await this.prisma.aiCopilotActionRecommendation.findUnique({
      where: { id: actionId }
    });
    if (!action || action.organizationId !== orgId || action.agentProfileId !== agentProfile.id) {
      throw new NotFoundException('Action not found');
    }

    const data: Prisma.AiCopilotActionRecommendationUpdateInput = {
      status: dto.status as AiCopilotActionStatus,
      updatedAt: new Date()
    };

    if (dto.status === 'COMPLETED') {
      data.completedAt = new Date();
      data.completedBy = { connect: { id: userId } };
    } else {
      data.completedAt = null;
      data.completedBy = { disconnect: true };
    }

    const updated = await this.prisma.aiCopilotActionRecommendation.update({
      where: { id: actionId },
      data
    });

    return updated;
  }

  async runDailyBriefingsForOrg(orgId: string, now = new Date()) {
    const agents = await this.prisma.agentProfile.findMany({
      where: { organizationId: orgId },
      select: { userId: true }
    });

    const results: Array<{ agentProfileId: string; insightId: string }> = [];
    for (const agent of agents) {
      try {
        const briefing = await this.getOrGenerateDailyBriefing(orgId, agent.userId, {
          date: now.toISOString()
        });
        results.push({
          agentProfileId: briefing.insight.agentProfileId,
          insightId: briefing.insight.id
        });
      } catch (err) {
        console.error('Failed to generate copilot briefing', err);
      }
    }

    return { results };
  }
}
