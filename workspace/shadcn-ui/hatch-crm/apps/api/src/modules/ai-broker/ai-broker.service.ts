import {
  ForbiddenException,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import {
  ComplianceStatus,
  NotificationType,
  OrgEventType,
  WorkflowTaskStatus,
  WorkflowTaskTrigger,
  UserRole
} from '@hatch/db';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { AiService } from '@/modules/ai/ai.service';
import { OrgEventsService } from '@/modules/org-events/org-events.service';
import { OnboardingService } from '@/modules/onboarding/onboarding.service';
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service';
import { NotificationsService } from '@/modules/notifications/notifications.service';
import { MailService } from '@/modules/mail/mail.service';
import { TimelineService } from '@/modules/timelines/timeline.service';
import { complianceAlertEmail } from '@/modules/mail/templates';
import { AskBrokerAssistantDto } from './dto/ask-broker-assistant.dto';
import { AiAnswerDto } from './dto/ai-answer.dto';
import { EvaluateComplianceDto } from './dto/evaluate-compliance.dto';
import { ComplianceEvaluationResponseDto } from './dto/compliance-evaluation-response.dto';

type JsonValue = Record<string, any> | null;
type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH';
type RiskSignal = {
  source: string;
  code: string;
  severity: RiskSeverity;
  description?: string;
  category?: string;
  ttlHours?: number;
  detectedAt?: string;
  meta?: Record<string, any>;
};

@Injectable()
export class AiBrokerService {
  private readonly dashboardBaseUrl = process.env.DASHBOARD_BASE_URL ?? 'http://localhost:5173/broker';

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiService: AiService,
    private readonly orgEvents: OrgEventsService,
    private readonly onboarding: OnboardingService,
    private readonly aiEmployees: AiEmployeesService,
    private readonly notifications: NotificationsService,
    private readonly mail: MailService,
    private readonly timelines: TimelineService
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

    const personaResult = await this.aiEmployees.runPersona('brokerAssistant', {
      organizationId: orgId,
      userId,
      input: payload
    });

    const fallbackAnswer = this.buildFallbackAnswer(dto.question, orgContext, listingContext, transactionContext);
    return this.normalizeAiAnswer(personaResult.rawText ?? null, fallbackAnswer);
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

      await this.recomputeAgentRisk(orgId, listing.agentProfileId);
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

    if (evaluation.riskLevel === 'HIGH' || evaluation.issues.length > 0) {
      await this.notifyComplianceRecipients(orgId, evaluation.summary ?? 'Listing compliance issues detected.', {
        listingId
      });
    }
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

      await this.recomputeAgentRisk(orgId, transaction.agentProfileId);
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

    if (evaluation.riskLevel === 'HIGH' || evaluation.issues.length > 0) {
      await this.notifyComplianceRecipients(orgId, evaluation.summary ?? 'Transaction compliance issues detected.', {
        transactionId
      });
    }
  }

  private computeRiskScore(signals: RiskSignal[], now = new Date()) {
    const pointsBySeverity: Record<RiskSeverity, number> = {
      LOW: 5,
      MEDIUM: 15,
      HIGH: 30
    };
    const categoryCap = 40;
    const categoryTotals = new Map<string, number>();

    const effectiveSignals = signals.filter((signal) => {
      if (!signal.ttlHours) return true;
      const detectedAt = signal.detectedAt ? new Date(signal.detectedAt) : now;
      const expiresAt = detectedAt.getTime() + signal.ttlHours * 60 * 60 * 1000;
      return expiresAt >= now.getTime();
    });

    let total = 0;
    for (const signal of effectiveSignals) {
      const categoryKey = signal.category ?? signal.source;
      const already = categoryTotals.get(categoryKey) ?? 0;
      const available = Math.max(0, categoryCap - already);
      const add = Math.min(pointsBySeverity[signal.severity] ?? 0, available);
      if (add > 0) {
        categoryTotals.set(categoryKey, already + add);
        total += add;
      }
    }

    const clamped = Math.min(100, total);
    const level: RiskSeverity = clamped >= 70 ? 'HIGH' : clamped >= 35 ? 'MEDIUM' : 'LOW';
    const severityOrder: Record<RiskSeverity, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    const reasons = [...effectiveSignals]
      .sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity])
      .slice(0, 5)
      .map((signal) => ({
        code: signal.code,
        source: signal.source,
        severity: signal.severity,
        description: signal.description
      }));

    return { score: clamped, level, reasons, signals: effectiveSignals };
  }

  private upsertRiskSignals(existing: unknown, signals: RiskSignal[]): Record<string, any> {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...(existing as Record<string, any>) } : {};
    base.riskSignals = this.trimSignalsForStorage(signals);
    return base;
  }

  private trimSignalsForStorage(signals: RiskSignal[]): RiskSignal[] {
    return signals.slice(0, 12).map((signal) => ({
      source: signal.source,
      code: signal.code,
      severity: signal.severity,
      description: signal.description,
      category: signal.category,
      detectedAt: signal.detectedAt ?? new Date().toISOString(),
      ttlHours: signal.ttlHours,
      meta: signal.meta
    }));
  }

  private mergeRiskFlags(existing: unknown, entry: Record<string, unknown>): Record<string, any> {
    const base =
      existing && typeof existing === 'object' && !Array.isArray(existing) ? { ...(existing as Record<string, any>) } : {};
    const history = Array.isArray(base.aiCompliance) ? [...base.aiCompliance] : [];
    history.push(entry);
    base.aiCompliance = history.slice(-5);
    return base;
  }

  private buildAgentSignals(profile: {
    id: string;
    organizationId: string;
    isCompliant: boolean;
    requiresAction: boolean;
    riskFlags: any;
    licenseExpiresAt: Date | null;
    ceHoursRequired: number | null;
    ceHoursCompleted: number | null;
    memberships: Array<{ status: string; expiresAt: Date | null; type: string; name: string }>;
  }): RiskSignal[] {
    const now = new Date();
    const msInDay = 24 * 60 * 60 * 1000;
    const signals: RiskSignal[] = [];

    const daysToExpiry = profile.licenseExpiresAt
      ? Math.floor((profile.licenseExpiresAt.getTime() - now.getTime()) / msInDay)
      : null;
    if (daysToExpiry !== null) {
      if (daysToExpiry < 0) {
        signals.push({
          source: 'LICENSE',
          code: 'LICENSE_EXPIRED',
          severity: 'HIGH',
          description: `License expired ${Math.abs(daysToExpiry)} day(s) ago`,
          category: 'COMPLIANCE'
        });
      } else if (daysToExpiry <= 30) {
        signals.push({
          source: 'LICENSE',
          code: 'LICENSE_EXPIRING_SOON',
          severity: 'MEDIUM',
          description: `License expires in ${daysToExpiry} day(s)`,
          category: 'COMPLIANCE'
        });
      }
    }

    if (profile.ceHoursRequired && profile.ceHoursCompleted !== null) {
      const gap = profile.ceHoursRequired - profile.ceHoursCompleted;
      if (gap > 0) {
        const completionRatio = profile.ceHoursCompleted / profile.ceHoursRequired;
        const severity: RiskSeverity = completionRatio < 0.5 ? 'HIGH' : 'MEDIUM';
        signals.push({
          source: 'CE',
          code: 'CE_HOURS_INCOMPLETE',
          severity,
          description: `CE gap of ${gap} hour(s) (${profile.ceHoursCompleted}/${profile.ceHoursRequired})`,
          category: 'TRAINING',
          meta: { gap, required: profile.ceHoursRequired, completed: profile.ceHoursCompleted }
        });
      }
    }

    for (const membership of profile.memberships ?? []) {
      const status = (membership.status ?? '').toUpperCase();
      if (status === 'EXPIRED') {
        signals.push({
          source: 'MEMBERSHIP',
          code: 'MEMBERSHIP_EXPIRED',
          severity: 'HIGH',
          description: `${membership.name} membership expired`,
          category: 'COMPLIANCE'
        });
      } else if (status === 'PENDING') {
        signals.push({
          source: 'MEMBERSHIP',
          code: 'MEMBERSHIP_PENDING',
          severity: 'MEDIUM',
          description: `${membership.name} membership pending`,
          category: 'COMPLIANCE'
        });
      } else if (membership.expiresAt) {
        const days = Math.floor((membership.expiresAt.getTime() - now.getTime()) / msInDay);
        if (days <= 30) {
          signals.push({
            source: 'MEMBERSHIP',
            code: 'MEMBERSHIP_EXPIRING_SOON',
            severity: 'MEDIUM',
            description: `${membership.name} expires in ${days} day(s)`,
            category: 'COMPLIANCE'
          });
        }
      }
    }

    if (!profile.isCompliant || profile.requiresAction) {
      signals.push({
        source: 'AGENT_COMPLIANCE',
        code: profile.requiresAction ? 'ACTION_REQUIRED' : 'NON_COMPLIANT',
        severity: profile.requiresAction ? 'HIGH' : 'MEDIUM',
        description: profile.requiresAction ? 'Agent flagged for broker action' : 'Agent is marked non-compliant',
        category: 'COMPLIANCE'
      });
    }

    const aiHistory = Array.isArray((profile.riskFlags as any)?.aiCompliance)
      ? (profile.riskFlags as any).aiCompliance
      : [];
    for (const entry of aiHistory) {
      const severity = this.normalizeSeverity((entry as any)?.riskLevel);
      if (!severity) continue;
      signals.push({
        source: 'AI',
        code: 'AI_COMPLIANCE',
        severity,
        description: (entry as any)?.summary ?? 'AI compliance review',
        category: 'AI',
        detectedAt: (entry as any)?.timestamp
      });
    }

    const storedSignals = Array.isArray((profile.riskFlags as any)?.riskSignals)
      ? (profile.riskFlags as any).riskSignals
      : [];
    for (const entry of storedSignals) {
      const severity = this.normalizeSeverity((entry as any)?.severity);
      if (!severity) continue;
      signals.push({
        source: (entry as any)?.source ?? 'HISTORICAL',
        code: (entry as any)?.code ?? 'HISTORICAL_SIGNAL',
        severity,
        description: (entry as any)?.description,
        category: (entry as any)?.category,
        detectedAt: (entry as any)?.detectedAt
      });
    }

    return signals;
  }

  private normalizeSeverity(value: any): RiskSeverity | null {
    if (value === 'HIGH' || value === 'MEDIUM' || value === 'LOW') return value;
    return null;
  }

  async recomputeAgentRisk(orgId: string, agentProfileId: string) {
    const [profile, openTransactions, failingDocs, openTasks] = await Promise.all([
      this.prisma.agentProfile.findUnique({
        where: { id: agentProfileId },
        include: { memberships: true }
      }),
      this.prisma.orgTransaction.count({
        where: { organizationId: orgId, agentProfileId, requiresAction: true }
      }),
      this.prisma.orgFile.count({
        where: {
          orgId: orgId,
          complianceStatus: { in: [ComplianceStatus.FAILED, ComplianceStatus.PENDING] },
          OR: [
            { listing: { agentProfileId } },
            { transaction: { agentProfileId } }
          ]
        }
      }),
      this.prisma.agentWorkflowTask.count({
        where: {
          organizationId: orgId,
          agentProfileId,
          status: { in: [WorkflowTaskStatus.PENDING, WorkflowTaskStatus.IN_PROGRESS] }
        }
      })
    ]);
    if (!profile || profile.organizationId !== orgId) {
      return null;
    }

    const signals = this.buildAgentSignals({
      id: profile.id,
      organizationId: profile.organizationId,
      isCompliant: profile.isCompliant,
      requiresAction: profile.requiresAction,
      riskFlags: profile.riskFlags,
      licenseExpiresAt: profile.licenseExpiresAt,
      ceHoursRequired: profile.ceHoursRequired,
      ceHoursCompleted: profile.ceHoursCompleted,
      memberships: profile.memberships.map((m) => ({
        status: m.status,
        expiresAt: m.expiresAt,
        type: m.type,
        name: m.name
      }))
    });

    if (openTransactions > 0) {
      signals.push({
        source: 'TRANSACTION',
        code: 'OPEN_COMPLIANCE_ISSUES',
        severity: openTransactions > 2 ? 'HIGH' : 'MEDIUM',
        description: `${openTransactions} transaction(s) need compliance action`,
        category: 'COMPLIANCE'
      });
    }

    if (failingDocs > 0) {
      signals.push({
        source: 'DOCUMENTS',
        code: 'DOCS_PENDING_OR_FAILED',
        severity: failingDocs > 2 ? 'HIGH' : 'MEDIUM',
        description: `${failingDocs} document(s) pending or failed compliance`,
        category: 'DOCUMENTS'
      });
    }

    if (openTasks > 0) {
      signals.push({
        source: 'WORKFLOW',
        code: 'OPEN_COMPLIANCE_TASKS',
        severity: openTasks > 3 ? 'HIGH' : 'MEDIUM',
        description: `${openTasks} compliance tasks open`,
        category: 'WORKFLOW'
      });
    }

    const { score, level, signals: normalizedSignals } = this.computeRiskScore(signals);
    const requiresAction = profile.requiresAction || level !== 'LOW';
    const nextFlags = this.upsertRiskSignals(profile.riskFlags, normalizedSignals);

    await this.prisma.agentProfile.update({
      where: { id: profile.id },
      data: {
        riskScore: score,
        riskLevel: level,
        riskFlags: nextFlags,
        requiresAction
      }
    });

    return { score, level };
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

  private async notifyComplianceRecipients(
    orgId: string,
    summary: string,
    links: { listingId?: string; transactionId?: string }
  ) {
    const brokers = await this.prisma.user.findMany({
      where: { organizationId: orgId, role: UserRole.BROKER },
      select: { id: true, email: true, firstName: true, lastName: true }
    });
    if (!brokers.length) {
      return;
    }

    const organization = await this.prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true }
    });
    const complianceLink = `${this.dashboardBaseUrl.replace(/\/+$/, '')}/compliance`;

    await Promise.all(
      brokers.map(async (broker) => {
        await this.notifications.createNotification({
          organizationId: orgId,
          userId: broker.id,
          type: NotificationType.COMPLIANCE,
          title: 'Compliance alert',
          message: summary,
          listingId: links.listingId,
          transactionId: links.transactionId
        });

        const shouldEmail = await this.notifications.shouldSendEmail(orgId, broker.id, NotificationType.COMPLIANCE);
        if (shouldEmail && broker.email) {
          const template = complianceAlertEmail({
            brokerName: [broker.firstName, broker.lastName].filter(Boolean).join(' ') || undefined,
            orgName: organization?.name ?? 'Hatch',
            issueSummary: summary,
            complianceLink
          });
          await this.mail.sendMail({
            to: broker.email,
            subject: template.subject,
            text: template.text,
            html: template.html
          });
        }
      })
    );
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
          include: { orgFile: { include: { file: true } } },
          take: 5
        }
      }
    });
    if (!transaction || transaction.organizationId !== orgId) {
      throw new NotFoundException('Transaction not found');
    }

    const timeline = await this.timelines.getTimeline(orgId, 'transaction', transactionId);

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
        name: doc.orgFile.name,
        complianceStatus: doc.orgFile.complianceStatus,
        documentType: doc.orgFile.documentType,
        storageKey: doc.orgFile.file?.storageKey,
        fileId: doc.orgFile.fileId
      })),
      timeline: timeline.timeline.slice(0, 25)
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
