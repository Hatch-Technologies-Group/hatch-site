import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import { OrgEventType, WorkflowTaskTrigger } from '@hatch/db';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { AiService } from '@/modules/ai/ai.service';
import { OrgEventsService } from '@/modules/org-events/org-events.service';
import { OnboardingService } from '@/modules/onboarding/onboarding.service';
import { AskBrokerAssistantDto } from './dto/ask-broker-assistant.dto';
import { AiAnswerDto } from './dto/ai-answer.dto';
import { EvaluateComplianceDto } from './dto/evaluate-compliance.dto';
import { ComplianceEvaluationResponseDto } from './dto/compliance-evaluation-response.dto';

type JsonValue = Record<string, any> | null;

@Injectable()
export class AiBrokerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly orgEvents: OrgEventsService,
    private readonly onboarding: OnboardingService
  ) {}

  async askBrokerAssistant(orgId: string, userId: string, dto: AskBrokerAssistantDto): Promise<AiAnswerDto> {
    await this.assertUserInOrg(userId, orgId);

    const [orgContext, vaultContext] = await Promise.all([
      this.buildOrgContext(orgId),
      this.buildVaultContext(orgId)
    ]);

    let listingContext: JsonValue = null;
    if (dto.listingId) {
      listingContext = await this.buildListingContext(dto.listingId, orgId);
    }

    let transactionContext: JsonValue = null;
    if (dto.transactionId) {
      transactionContext = await this.buildTransactionContext(dto.transactionId, orgId);
    }

    const payload = {
      question: dto.question,
      contextType: dto.contextType ?? 'GENERAL',
      orgContext,
      listingContext,
      transactionContext,
      vaultContext
    };

    const systemPrompt =
      'You are Hatch AI Broker Assistant. Use the provided JSON context to answer questions for licensed real-estate brokers. ' +
      'Respond with a concise JSON object: {"answer": string, "suggestions": string[], "references": [{"type": string, "id": string}]}. ' +
      'If context is missing, say so but still provide proactive next steps.';

    const aiResult = await this.aiService.runStructuredChat({
      systemPrompt,
      responseFormat: 'json_object',
      temperature: 0.2,
      messages: [{ role: 'user', content: JSON.stringify(payload) }]
    });

    const fallbackAnswer = this.buildFallbackAnswer(dto.question, orgContext, listingContext, transactionContext);
    return this.normalizeAiAnswer(aiResult.text, fallbackAnswer);
  }

  async evaluateCompliance(
    orgId: string,
    userId: string,
    dto: EvaluateComplianceDto
  ): Promise<ComplianceEvaluationResponseDto> {
    await this.assertUserInOrg(userId, orgId);

    let listingContext: JsonValue = null;
    let transactionContext: JsonValue = null;

    if (dto.targetType === 'LISTING') {
      if (!dto.listingId) {
        throw new ForbiddenException('listingId required for listing evaluations');
      }
      listingContext = await this.buildListingContext(dto.listingId, orgId);
    } else if (dto.targetType === 'TRANSACTION') {
      if (!dto.transactionId) {
        throw new ForbiddenException('transactionId required for transaction evaluations');
      }
      transactionContext = await this.buildTransactionContext(dto.transactionId, orgId);
    }

    const orgContext = await this.buildOrgContext(orgId);
    const payload = {
      targetType: dto.targetType,
      orgContext,
      listingContext,
      transactionContext
    };

    const systemPrompt =
      'You are Hatch AI Compliance Officer. Evaluate the provided listing or transaction context for real-estate compliance risk. ' +
      'Return strict JSON: {"riskLevel":"LOW|MEDIUM|HIGH","summary":string,"issues":[{"code":string,"title":string,"description":string,"severity":"LOW|MEDIUM|HIGH","relatedEntity":{"type":"LISTING|TRANSACTION|AGENT|DOCUMENT","id":string}}],"recommendations":string[]}. ' +
      'If no issues, return an empty issues array but still suggest proactive recommendations.';

    const aiResult = await this.aiService.runStructuredChat({
      systemPrompt,
      responseFormat: 'json_object',
      temperature: 0,
      messages: [{ role: 'user', content: JSON.stringify(payload) }]
    });

    const normalized = this.normalizeComplianceResponse(aiResult.text, dto);

    if (dto.targetType === 'LISTING' && dto.listingId) {
      await this.handleListingEvaluation(orgId, dto.listingId, userId, normalized);
    } else if (dto.targetType === 'TRANSACTION' && dto.transactionId) {
      await this.handleTransactionEvaluation(orgId, dto.transactionId, userId, normalized);
    }

    return normalized;
  }

  private async handleListingEvaluation(
    orgId: string,
    listingId: string,
    actorId: string,
    evaluation: ComplianceEvaluationResponseDto
  ) {
    const listing = await this.prisma.orgListing.findUnique({
      where: { id: listingId },
      include: {
        agentProfile: true
      }
    });
    if (!listing || listing.organizationId !== orgId) {
      throw new NotFoundException('Listing not found');
    }

    if (listing.agentProfileId && listing.agentProfile) {
      const nextFlags = this.mergeRiskFlags(listing.agentProfile.riskFlags, {
        timestamp: new Date().toISOString(),
        targetType: 'LISTING',
        listingId,
        riskLevel: evaluation.riskLevel,
        summary: evaluation.summary ?? null
      });
      await this.prisma.agentProfile.update({
        where: { id: listing.agentProfileId },
        data: { riskFlags: nextFlags }
      });

      if (evaluation.riskLevel === 'HIGH') {
        await this.onboarding.generateOffboardingTasksForAgent(
          orgId,
          listing.agentProfileId,
          WorkflowTaskTrigger.AI_HIGH_RISK,
          `LISTING:${listingId}`,
          actorId
        );
      }
    }

    await this.orgEvents.logOrgEvent({
      organizationId: orgId,
      actorId,
      type: OrgEventType.ORG_LISTING_EVALUATED,
      payload: {
        listingId,
        riskLevel: evaluation.riskLevel,
        issuesCount: evaluation.issues.length,
        agentProfileId: listing.agentProfileId ?? null
      }
    });
  }

  private async handleTransactionEvaluation(
    orgId: string,
    transactionId: string,
    actorId: string,
    evaluation: ComplianceEvaluationResponseDto
  ) {
    const transaction = await this.prisma.orgTransaction.findUnique({
      where: { id: transactionId },
      include: {
        agentProfile: true
      }
    });
    if (!transaction || transaction.organizationId !== orgId) {
      throw new NotFoundException('Transaction not found');
    }

    const requiresAction = evaluation.riskLevel !== 'LOW' || evaluation.issues.length > 0;
    await this.prisma.orgTransaction.update({
      where: { id: transactionId },
      data: {
        isCompliant: !requiresAction,
        requiresAction,
        complianceNotes: evaluation.summary?.slice(0, 500) ?? null
      }
    });

    if (transaction.agentProfileId && transaction.agentProfile) {
      const nextFlags = this.mergeRiskFlags(transaction.agentProfile.riskFlags, {
        timestamp: new Date().toISOString(),
        targetType: 'TRANSACTION',
        transactionId,
        riskLevel: evaluation.riskLevel,
        summary: evaluation.summary ?? null
      });
      await this.prisma.agentProfile.update({
        where: { id: transaction.agentProfileId },
        data: { riskFlags: nextFlags }
      });

      if (evaluation.riskLevel === 'HIGH') {
        await this.onboarding.generateOffboardingTasksForAgent(
          orgId,
          transaction.agentProfileId,
          WorkflowTaskTrigger.AI_HIGH_RISK,
          `TRANSACTION:${transactionId}`,
          actorId
        );
      }
    }

    await this.orgEvents.logOrgEvent({
      organizationId: orgId,
      actorId,
      type: OrgEventType.ORG_TRANSACTION_EVALUATED,
      payload: {
        transactionId,
        riskLevel: evaluation.riskLevel,
        issuesCount: evaluation.issues.length,
        agentProfileId: transaction.agentProfileId ?? null
      }
    });
  }

  private mergeRiskFlags(existing: unknown, entry: Record<string, unknown>): Record<string, any> {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...(existing as Record<string, any>) } : {};
    const history = Array.isArray(base.aiCompliance) ? [...base.aiCompliance] : [];
    history.push(entry);
    base.aiCompliance = history.slice(-5);
    return base;
  }

  private normalizeAiAnswer(rawText: string | null, fallback: string): AiAnswerDto {
    let parsed: any = null;
    if (rawText) {
      parsed = this.safeJsonParse(rawText);
    }

    if (parsed && typeof parsed.answer === 'string') {
      return {
        answer: parsed.answer,
        suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
        references: Array.isArray(parsed.references) ? parsed.references : []
      };
    }

    return { answer: fallback, suggestions: ['Review latest compliance handbook in your vault.'] };
  }

  private normalizeComplianceResponse(rawText: string | null, dto: EvaluateComplianceDto) {
    let parsed: any = null;
    if (rawText) {
      parsed = this.safeJsonParse(rawText);
    }

    const response = new ComplianceEvaluationResponseDto();
    response.riskLevel =
      parsed && typeof parsed.riskLevel === 'string' && ['LOW', 'MEDIUM', 'HIGH'].includes(parsed.riskLevel)
        ? parsed.riskLevel
        : 'MEDIUM';
    response.summary = typeof parsed?.summary === 'string' ? parsed.summary : `Automated review for ${dto.targetType}`;
    if (Array.isArray(parsed?.issues)) {
      response.issues = parsed.issues.map((issue: any) => ({
        code: typeof issue?.code === 'string' ? issue.code : undefined,
        title: typeof issue?.title === 'string' ? issue.title : 'Potential issue',
        description:
          typeof issue?.description === 'string'
            ? issue.description
            : 'AI detected a potential compliance gap that should be reviewed.',
        severity:
          typeof issue?.severity === 'string' && ['LOW', 'MEDIUM', 'HIGH'].includes(issue.severity)
            ? issue.severity
            : 'MEDIUM',
        relatedEntity:
          issue?.relatedEntity && typeof issue.relatedEntity === 'object'
            ? {
                type: issue.relatedEntity.type ?? dto.targetType,
                id: issue.relatedEntity.id
              }
            : undefined
      }));
    } else {
      response.issues = [];
    }
    response.recommendations = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations
      : ['Schedule a broker review meeting', 'Ensure the required documents are uploaded to the vault'];

    return response;
  }

  private buildFallbackAnswer(question: string, org: JsonValue, listing: JsonValue, transaction: JsonValue) {
    let subject = 'your organization';
    if (listing) subject = 'the referenced listing';
    else if (transaction) subject = 'the referenced transaction';

    const orgName = (org as any)?.organization?.name;
    const prefix = orgName ? `Hatch summary for ${orgName}: ` : 'Hatch summary: ';
    return `${prefix}Based on ${subject}, consider reviewing your compliance playbook. Question received: "${question}".`;
  }

  private safeJsonParse(text: string) {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  }

  private async assertUserInOrg(userId: string, orgId: string) {
    const membership = await this.prisma.userOrgMembership.findUnique({
      where: { userId_orgId: { userId, orgId } }
    });
    if (!membership) {
      throw new ForbiddenException('User is not part of this organization');
    }
  }

  private async buildOrgContext(orgId: string): Promise<JsonValue> {
    const [organization, agentProfiles, trainingModules, recentEvents] = await Promise.all([
      this.prisma.organization.findUnique({
        where: { id: orgId },
        select: { id: true, name: true, createdAt: true, slug: true }
      }),
      this.prisma.agentProfile.findMany({
        where: { organizationId: orgId },
        select: {
          id: true,
          licenseState: true,
          riskLevel: true,
          isCompliant: true,
          requiresAction: true,
          user: { select: { firstName: true, lastName: true } }
        },
        take: 5,
        orderBy: { updatedAt: 'desc' }
      }),
      this.prisma.agentTrainingModule.findMany({
        where: { organizationId: orgId },
        select: { id: true, title: true, required: true, estimatedMinutes: true },
        take: 5,
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.orgEvent.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { type: true, message: true }
      })
    ]);

    return {
      organization,
      agentProfiles: agentProfiles.map((profile) => ({
        id: profile.id,
        name: `${profile.user?.firstName ?? ''} ${profile.user?.lastName ?? ''}`.trim(),
        riskLevel: profile.riskLevel,
        isCompliant: profile.isCompliant,
        requiresAction: profile.requiresAction,
        licenseState: profile.licenseState
      })),
      trainingModules,
      recentEvents
    };
  }

  private async buildListingContext(listingId: string, orgId: string): Promise<JsonValue> {
    const listing = await this.prisma.orgListing.findUnique({
      where: { id: listingId },
      include: {
        agentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        documents: {
          include: {
            orgFile: true
          },
          take: 5
        }
      }
    });
    if (!listing || listing.organizationId !== orgId) {
      throw new NotFoundException('Listing not found');
    }

    return {
      id: listing.id,
      status: listing.status,
      listPrice: listing.listPrice,
      propertyType: listing.propertyType,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      expiresAt: listing.expiresAt,
      agent: listing.agentProfile
        ? {
            id: listing.agentProfile.id,
            name: `${listing.agentProfile.user?.firstName ?? ''} ${listing.agentProfile.user?.lastName ?? ''}`.trim(),
            email: listing.agentProfile.user?.email
          }
        : null,
      documents: listing.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        name: doc.orgFile.name,
        category: doc.orgFile.category
      }))
    };
  }

  private async buildTransactionContext(transactionId: string, orgId: string): Promise<JsonValue> {
    const transaction = await this.prisma.orgTransaction.findUnique({
      where: { id: transactionId },
      include: {
        listing: true,
        agentProfile: {
          include: {
            user: { select: { firstName: true, lastName: true, email: true } }
          }
        },
        documents: {
          include: { orgFile: true },
          take: 5
        }
      }
    });
    if (!transaction || transaction.organizationId !== orgId) {
      throw new NotFoundException('Transaction not found');
    }

    return {
      id: transaction.id,
      status: transaction.status,
      keyDates: {
        contractSignedAt: transaction.contractSignedAt,
        inspectionDate: transaction.inspectionDate,
        financingDate: transaction.financingDate,
        closingDate: transaction.closingDate
      },
      buyerName: transaction.buyerName,
      sellerName: transaction.sellerName,
      isCompliant: transaction.isCompliant,
      requiresAction: transaction.requiresAction,
      listing: transaction.listing ? { id: transaction.listing.id, status: transaction.listing.status } : null,
      agent: transaction.agentProfile
        ? {
            id: transaction.agentProfile.id,
            name: `${transaction.agentProfile.user?.firstName ?? ''} ${transaction.agentProfile.user?.lastName ?? ''}`.trim(),
            email: transaction.agentProfile.user?.email
          }
        : null,
      documents: transaction.documents.map((doc) => ({
        id: doc.id,
        type: doc.type,
        name: doc.orgFile.name
      }))
    };
  }

  private async buildVaultContext(orgId: string): Promise<JsonValue> {
    const files = await this.prisma.orgFile.findMany({
      where: {
        orgId,
        category: { in: ['COMPLIANCE', 'CONTRACT_TEMPLATE', 'TRAINING'] }
      },
      select: {
        id: true,
        name: true,
        category: true,
        description: true
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return { files };
  }
}
