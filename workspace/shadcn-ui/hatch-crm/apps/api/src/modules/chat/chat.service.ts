import { Injectable, Logger } from '@nestjs/common'
import { PlaybookActionType } from '@hatch/db'
import { PrismaService } from '@/modules/prisma/prisma.service'
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service'
import { GlobalSearchService } from '@/modules/search/global-search.service'
import { TimelineService } from '@/modules/timelines/timeline.service'
import { PlaybookRunnerService, type PlaybookActionExecutionResult } from '@/modules/playbooks/playbook-runner.service'

const PLAYBOOK_ACTION_CATALOG: Array<{
  type: PlaybookActionType
  description: string
  required: string[]
  optional?: string[]
  example?: Record<string, unknown>
}> = [
  {
    type: PlaybookActionType.CREATE_TASK,
    description: 'Create a follow-up or remediation task for an agent',
    required: ['agentProfileId', 'title'],
    optional: ['description', 'listingId', 'transactionId']
  },
  {
    type: PlaybookActionType.ASSIGN_LEAD,
    description: 'Assign a lead to an agent and notify them',
    required: ['leadId', 'agentProfileId'],
    optional: ['userId']
  },
  {
    type: PlaybookActionType.SEND_NOTIFICATION,
    description: 'Send an in-app notification to a broker or agent',
    required: ['title'],
    optional: ['message', 'userId']
  },
  {
    type: PlaybookActionType.SEND_EMAIL,
    description: 'Send a quick email update to a user',
    required: ['toUserId', 'subject', 'body']
  },
  {
    type: PlaybookActionType.FLAG_ENTITY,
    description: 'Flag a listing, transaction, or lease for review',
    required: [],
    optional: ['listingId', 'transactionId', 'leaseId']
  },
  {
    type: PlaybookActionType.UPDATE_ENTITY_STATUS,
    description: 'Update a listing/transaction/lease status',
    required: ['entity', 'id', 'status']
  },
  {
    type: PlaybookActionType.START_PLAYBOOK,
    description: 'Kick off another playbook by id',
    required: ['targetPlaybookId']
  },
  {
    type: PlaybookActionType.RUN_AI_PERSONA,
    description: 'Delegate to another AI persona with context',
    required: ['personaId'],
    optional: ['userId']
  }
]

const ACTION_TYPE_LOOKUP = new Map<string, PlaybookActionType>()
for (const action of PLAYBOOK_ACTION_CATALOG) {
  const type = action.type
  ACTION_TYPE_LOOKUP.set(type, type)
  ACTION_TYPE_LOOKUP.set(type.toLowerCase(), type)
  ACTION_TYPE_LOOKUP.set(type.replace(/[_\s-]+/g, '').toLowerCase(), type)
}

type PlannedAction = {
  type: PlaybookActionType
  params?: Record<string, unknown>
  summary?: string
}

type ChatActionMetadata = PlaybookActionExecutionResult & { summary?: string }

@Injectable()
export class ChatService {
  private readonly log = new Logger(ChatService.name)
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEmployees: AiEmployeesService,
    private readonly search: GlobalSearchService,
    private readonly timelines: TimelineService,
    private readonly playbooks: PlaybookRunnerService
  ) {}

  async listSessions(orgId: string, userId: string) {
    return (this.prisma as any).chatSession.findMany({
      where: { organizationId: orgId, userId },
      orderBy: { updatedAt: 'desc' }
    })
  }

  async createSession(orgId: string, userId: string, title?: string) {
    return (this.prisma as any).chatSession.create({
      data: { organizationId: orgId, userId, title: title ?? null }
    })
  }

  async getMessages(sessionId: string, orgId: string, userId: string) {
    await this.assertSession(sessionId, orgId, userId)
    return (this.prisma as any).chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    })
  }

  async sendMessage(orgId: string, userId: string, sessionId: string, content: string) {
    await this.assertSession(sessionId, orgId, userId)
    await (this.prisma as any).chatMessage.create({
      data: { sessionId, role: 'user', content }
    })

    const context = await this.buildContext(orgId, userId, content)
    const ai = await this.aiEmployees.runPersona('hatchAssistant' as any, {
      organizationId: orgId,
      userId,
      input: { content, context, availableActions: context.availableActions }
    })
    const reply =
      ai?.rawText ??
      (ai as any)?.aiResponse?.message ??
      (ai as any)?.structured?.message ??
      'I do not have enough context to answer right now.'

    const plannedActions = this.extractActions(ai)
    const actionPayload = this.buildActionPayload(content, context)
    let actionResults: PlaybookActionExecutionResult[] = []
    if (plannedActions.length > 0) {
      try {
        actionResults = await this.playbooks.runActions(orgId, plannedActions, actionPayload)
      } catch (error) {
        actionResults = plannedActions.map((action) => ({
          type: action.type,
          params: action.params,
          status: 'failed',
          error: error instanceof Error ? error.message : 'Action execution failed'
        }))
      }
    }

    const actionsForMetadata = this.mergeActionResults(plannedActions, actionResults)

    await (this.prisma as any).chatMessage.create({
      data: {
        sessionId,
        role: 'assistant',
        content: reply,
        metadata: { ...(context ?? {}), actions: actionsForMetadata, actionContext: actionPayload }
      }
    })

    // bump updatedAt
    await (this.prisma as any).chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    })

    return this.getMessages(sessionId, orgId, userId)
  }

  private async assertSession(sessionId: string, orgId: string, userId: string) {
    const session = await (this.prisma as any).chatSession.findFirst({
      where: { id: sessionId, organizationId: orgId, userId }
    })
    if (!session) {
      throw new Error('Session not found or unauthorized')
    }
  }

  private async buildContext(orgId: string, userId: string, content: string) {
    const availableActions = this.describePlaybookActions()
    let tcInsights: Record<string, unknown> | null = null
    let nurtureDraft: Record<string, unknown> | null = null
    try {
      // simple heuristic: run global search and pick top hits
      const searchResults = await this.search.search(orgId, { q: content })
      const allResults = searchResults?.results ?? []
      const top = allResults.slice(0, 5)
      const legalFormsContext = allResults
        .filter((item) => item.type === 'knowledge_doc')
        .slice(0, 5)
        .map((item) => ({
          id: item.id,
          title: item.title,
          snippet: (item.metadata as any)?.content ?? item.subtitle ?? '',
          route: item.route
        }))
      const timelines = []
      for (const item of top) {
        if (item.type && item.id) {
          if (['listing', 'lead', 'transaction', 'rental'].includes(item.type)) {
            const tl = await this.timelines.getTimeline(orgId, item.type as any, item.id)
            timelines.push({ entityType: item.type, entityId: item.id, timeline: tl.timeline })
          }
        }
      }
      const transactionCandidate = top.find((item) => item.type === 'transaction')
      if (transactionCandidate?.id) {
        tcInsights = await this.runTransactionCoordinator(orgId, userId, transactionCandidate.id)
      }
      const leadCandidate = top.find((item) => item.type === 'lead')
      if (leadCandidate?.id && this.isFollowUpIntent(content)) {
        nurtureDraft = await this.runLeadNurtureWriter(orgId, userId, leadCandidate.id)
      }
      if (legalFormsContext.length > 0) {
        this.log.log(
          `legalFormsContext hits (${legalFormsContext.length}): ${legalFormsContext
            .map((hit) => hit.title)
            .join(', ')}`
        )
      }
      return { topResults: top, timelines, availableActions, tcInsights, nurtureDraft, legalFormsContext }
    } catch (err) {
      return { availableActions, tcInsights, nurtureDraft }
    }
  }

  private async runTransactionCoordinator(orgId: string, userId: string, transactionId: string) {
    try {
      const result = await this.aiEmployees.runPersona('transactionCoordinator', {
        organizationId: orgId,
        userId,
        transactionId,
        input: { reason: 'chat_context' }
      })
      return {
        transactionId,
        summary: result?.structured?.summary ?? null,
        actions: result?.actions ?? result?.structured?.actions ?? [],
        raw: result?.rawText ?? null
      }
    } catch {
      return null
    }
  }

  private async runLeadNurtureWriter(orgId: string, userId: string, leadId: string) {
    try {
      const result = await this.aiEmployees.runPersona('leadNurtureWriter', {
        organizationId: orgId,
        userId,
        leadId,
        input: { reason: 'chat_follow_up' }
      })
      return {
        leadId,
        draft: result?.structured ?? null,
        actions: result?.actions ?? result?.structured?.actions ?? [],
        raw: result?.rawText ?? null
      }
    } catch {
      return null
    }
  }

  private isFollowUpIntent(text: string) {
    const normalized = text.toLowerCase()
    return ['follow up', 'follow-up', 'email', 'reply', 'message lead'].some((term) => normalized.includes(term))
  }

  private extractActions(aiResult: any): PlannedAction[] {
    const rawActions =
      Array.isArray(aiResult?.actions) && aiResult.actions.length > 0
        ? aiResult.actions
        : Array.isArray(aiResult?.structured?.actions)
          ? aiResult.structured.actions
          : []

    return rawActions
      .map((entry: any) => {
        const normalizedType = this.normalizeActionType(entry?.type ?? entry?.actionType ?? entry?.tool)
        if (!normalizedType) return null
        const params = entry?.params && typeof entry.params === 'object' ? entry.params : {}
        const summary = typeof entry?.summary === 'string' ? entry.summary : undefined
        return { type: normalizedType, params, summary }
      })
      .filter(Boolean) as PlannedAction[]
  }

  private mergeActionResults(planned: PlannedAction[], results: PlaybookActionExecutionResult[]): ChatActionMetadata[] {
    if (!planned.length && !results.length) return []
    return planned.map((action, idx) => {
      const result = results[idx]
      return {
        type: action.type,
        params: action.params,
        summary: action.summary,
        status: result?.status ?? 'executed',
        error: result?.error
      }
    })
  }

  private buildActionPayload(content: string, context: Record<string, unknown>) {
    const payload: Record<string, unknown> = { prompt: content }
    const topResults = Array.isArray((context as any)?.topResults) ? (context as any).topResults : []
    const findFirst = (type: string) => topResults.find((item) => item?.type === type)
    const lead = findFirst('lead')
    const listing = findFirst('listing')
    const transaction = findFirst('transaction')
    const rental = findFirst('rental')

    if (lead?.id) payload.leadId = lead.id
    if (listing?.id) payload.listingId = listing.id
    if (transaction?.id) payload.transactionId = transaction.id
    if (rental?.id) payload.leaseId = rental.id

    return payload
  }

  private describePlaybookActions() {
    return PLAYBOOK_ACTION_CATALOG.map((action) => {
      const entry: Record<string, unknown> = {
        type: action.type,
        description: action.description,
        required: action.required,
        optional: action.optional ?? []
      }
      if (action.example) {
        entry.example = action.example
      }
      return entry
    })
  }

  private normalizeActionType(value: unknown): PlaybookActionType | null {
    if (typeof value !== 'string') return null
    const trimmed = value.trim()
    if (!trimmed) return null
    const candidates = [
      trimmed,
      trimmed.toLowerCase(),
      trimmed.replace(/[_\s-]+/g, '').toLowerCase()
    ]
    for (const candidate of candidates) {
      const resolved = ACTION_TYPE_LOOKUP.get(candidate)
      if (resolved) return resolved
    }
    return null
  }
}
