import { Injectable, Logger } from '@nestjs/common'
import {
  NotificationType,
  PlaybookActionType,
  PlaybookTriggerType,
  WorkflowTaskStatus,
  WorkflowTaskTrigger,
  WorkflowType
} from '@hatch/db'

import { NotificationsService } from '@/modules/notifications/notifications.service'
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service'
import { PrismaService } from '@/modules/prisma/prisma.service'
import { MailService } from '../mail/mail.service'

export type PlaybookActionExecutionResult = {
  type: PlaybookActionType
  params?: Record<string, unknown>
  status: 'executed' | 'failed'
  error?: string
}

@Injectable()
export class PlaybookRunnerService {
  private readonly logger = new Logger(PlaybookRunnerService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly aiEmployees: AiEmployeesService,
    private readonly mail: MailService
  ) {}

  async runTrigger(orgId: string, trigger: PlaybookTriggerType, payload: Record<string, unknown>) {
    const playbooks = await this.prisma.playbook.findMany({
      where: {
        organizationId: orgId,
        enabled: true,
        triggers: { some: { type: trigger } }
      },
      include: { triggers: true, actions: true }
    })

    for (const playbook of playbooks) {
      const matchingTriggers = playbook.triggers.filter((t) => t.type === trigger)
      const shouldRun = matchingTriggers.some((t) => this.evaluateConditions(t.conditions, payload))
      if (!shouldRun) continue

      const run = await this.prisma.playbookRun.create({
        data: {
          playbookId: playbook.id,
          organizationId: orgId,
          triggerType: trigger,
          listingId: (payload.listingId as string) ?? null,
          leadId: (payload.leadId as string) ?? null,
          transactionId: (payload.transactionId as string) ?? null,
          leaseId: (payload.leaseId as string) ?? null,
          startedAt: new Date()
        }
      })

      const actionSummaries: string[] = []
      let success = true
      let errorMessage: string | null = null
      try {
        for (const action of playbook.actions) {
          await this.executeAction(
            orgId,
            action.type as PlaybookActionType,
            (action.params ?? {}) as Record<string, unknown>,
            payload
          )
          actionSummaries.push(action.type)
        }
      } catch (error) {
        success = false
        errorMessage = (error as Error)?.message ?? 'Playbook run failed'
        this.logger.warn(`playbook action failed: ${errorMessage}`)
      } finally {
        await this.prisma.playbookRun.update({
          where: { id: run.id },
          data: {
            success,
            errorMessage,
            actionSummary: actionSummaries.join(', '),
            finishedAt: new Date()
          }
        })
      }
    }
  }

  private evaluateConditions(conditions: unknown, payload: Record<string, unknown>) {
    if (!conditions || typeof conditions !== 'object') return true
    const rules = Array.isArray(conditions) ? conditions : [conditions]
    return rules.every((rule) => this.evaluateRule(rule as Record<string, unknown>, payload))
  }

  private evaluateRule(rule: Record<string, unknown>, payload: Record<string, unknown>) {
    const fieldPath = (rule.field as string) || ''
    const value = this.extractValue(payload, fieldPath.replace(/^payload\.?/, ''))
    if ('equals' in rule) return value === rule.equals
    if ('contains' in rule && typeof value === 'string') return value.toString().includes(rule.contains as string)
    if ('in' in rule && Array.isArray(rule.in)) return (rule.in as unknown[]).includes(value)
    if ('gt' in rule && typeof value === 'number') return value > (rule.gt as number)
    if ('lt' in rule && typeof value === 'number') return value < (rule.lt as number)
    return true
  }

  private extractValue(obj: Record<string, unknown>, path: string) {
    if (!path) return undefined
    return path.split('.').reduce<any>((acc, key) => (acc ? (acc as any)[key] : undefined), obj)
  }

  private async executeAction(
    orgId: string,
    type: PlaybookActionType,
    params: Record<string, unknown>,
    payload: Record<string, unknown>
  ) {
    switch (type) {
      case PlaybookActionType.SEND_NOTIFICATION: {
        const title = (params.title as string) || 'Automation notification'
        const message = (params.message as string) || null
        const userId = (params.userId as string) || null
        await this.notifications.createNotification({
          organizationId: orgId,
          userId,
          type: NotificationType.GENERIC,
          title,
          message
        })
        return
      }
      case PlaybookActionType.CREATE_TASK: {
        const title = (params.title as string) || 'Automation Task'
        const agentProfileId = params.agentProfileId as string
        if (!agentProfileId) throw new Error('agentProfileId required for CREATE_TASK')
        await this.prisma.agentWorkflowTask.create({
          data: {
            organizationId: orgId,
            agentProfileId,
            title,
            description: (params.description as string) ?? null,
            status: WorkflowTaskStatus.PENDING,
            type: WorkflowType.ONBOARDING,
            trigger: WorkflowTaskTrigger.MANUAL,
            listingId: (payload.listingId as string) ?? null,
            transactionId: (payload.transactionId as string) ?? null
          }
        })
        return
      }
      case PlaybookActionType.FLAG_ENTITY: {
        if (params.listingId) {
          await this.prisma.orgListing.update({
            where: { id: params.listingId as string },
            data: { brokerApproved: false }
          })
        }
        if (params.transactionId) {
          await this.prisma.orgTransaction.update({
            where: { id: params.transactionId as string },
            data: { isCompliant: false, requiresAction: true, complianceNotes: 'Flagged by automation' }
          })
        }
        if (params.leaseId) {
          await this.prisma.rentalLease.update({
            where: { id: params.leaseId as string },
            data: { isCompliant: false, complianceNotes: 'Flagged by automation' }
          })
        }
        return
      }
      case PlaybookActionType.SEND_EMAIL: {
        const toUserId = params.toUserId as string
        const user = toUserId
          ? await this.prisma.user.findFirst({ where: { id: toUserId, organizationId: orgId } })
          : null
        if (!user?.email) throw new Error('Recipient not found for SEND_EMAIL')
        const subject = (params.subject as string) || 'Automation update'
        const body = (params.body as string) || 'Automation email'
        await this.mail.sendMail({ to: user.email, subject, text: body, html: `<p>${body}</p>` })
        return
      }
      case PlaybookActionType.ASSIGN_LEAD: {
        const leadId = (params.leadId as string) || (payload.leadId as string)
        const agentProfileId = params.agentProfileId as string
        if (!leadId || !agentProfileId) throw new Error('leadId and agentProfileId required for ASSIGN_LEAD')
        await this.prisma.lead.update({ where: { id: leadId }, data: { agentProfileId } })
        await this.notifications.createNotification({
          organizationId: orgId,
          userId: (params.userId as string) ?? null,
          type: NotificationType.LEAD,
          title: 'Lead assigned',
          message: `Lead ${leadId} assigned via playbook`,
          leadId
        })
        return
      }
      case PlaybookActionType.START_PLAYBOOK: {
        const target = params.targetPlaybookId as string
        if (!target) throw new Error('targetPlaybookId required for START_PLAYBOOK')
        const playbook = await this.prisma.playbook.findFirst({
          where: { id: target, organizationId: orgId, enabled: true },
          include: { actions: true }
        })
        if (!playbook) return
        for (const action of playbook.actions) {
          await this.executeAction(
            orgId,
            action.type as PlaybookActionType,
            (action.params ?? {}) as Record<string, unknown>,
            payload
          )
        }
        return
      }
      case PlaybookActionType.UPDATE_ENTITY_STATUS: {
        const entity = params.entity as string
        const id = params.id as string
        const status = params.status as string
        if (!entity || !id || !status) throw new Error('entity, id, status required for UPDATE_ENTITY_STATUS')
        if (entity === 'listing') {
          await this.prisma.orgListing.update({ where: { id }, data: { status: status as any } })
        } else if (entity === 'transaction') {
          await this.prisma.orgTransaction.update({ where: { id }, data: { status: status as any } })
        } else if (entity === 'lease') {
          await this.prisma.rentalLease.update({ where: { id }, data: { tenancyType: status as any } })
        }
        return
      }
      case PlaybookActionType.RUN_AI_PERSONA: {
        const personaId = (params.personaId as string) || 'brokerAssistant'
        await this.aiEmployees.runPersona(personaId as any, {
          organizationId: orgId,
          userId: (params.userId as string) || undefined,
          input: { ...payload, actionParams: params }
        })
        return
      }
      default:
        this.logger.debug(`No-op action for ${type}`)
    }
  }

  async runActions(
    orgId: string,
    actions: Array<{ type: PlaybookActionType; params?: Record<string, unknown> }>,
    payload: Record<string, unknown>
  ): Promise<PlaybookActionExecutionResult[]> {
    const results: PlaybookActionExecutionResult[] = []
    for (const action of actions) {
      try {
        await this.executeAction(orgId, action.type, action.params ?? {}, payload)
        results.push({ type: action.type, params: action.params, status: 'executed' })
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Action failed'
        this.logger.warn(`Ad-hoc playbook action failed for ${action.type}: ${message}`)
        results.push({ type: action.type, params: action.params, status: 'failed', error: message })
      }
    }
    return results
  }
}
