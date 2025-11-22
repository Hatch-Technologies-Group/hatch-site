import { Injectable, Logger } from '@nestjs/common'
import { PlaybookActionType } from '@hatch/db'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { AiEmployeesService, type PersonaAction } from '@/modules/ai-employees/ai-employees.service'
import { PlaybookRunnerService, type PlaybookActionExecutionResult } from '@/modules/playbooks/playbook-runner.service'
import { AuditService } from '@/modules/audit/audit.service'
import { REQUIRED_DOCS } from '@/config/required-docs.config'

const ALLOWED_AUTOMATED_ACTIONS = [PlaybookActionType.CREATE_TASK, PlaybookActionType.SEND_NOTIFICATION] as const

type AllowedActionType = (typeof ALLOWED_AUTOMATED_ACTIONS)[number]

@Injectable()
export class TransactionCoordinatorService {
  private readonly log = new Logger(TransactionCoordinatorService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEmployees: AiEmployeesService,
    private readonly playbooks: PlaybookRunnerService,
    private readonly audit: AuditService
  ) {}

  async runChecksForOrg(orgId: string, userId?: string) {
    const actor = userId ?? 'user-broker'
    const transactions = await this.prisma.orgTransaction.findMany({
      where: {
        organizationId: orgId,
        status: { not: 'CLOSED' as any }
      },
      select: {
        id: true,
        status: true,
        closingDate: true,
        requiresAction: true,
        isCompliant: true,
        listingId: true,
        agentProfileId: true
      }
    })

    const atRisk = transactions.filter((txn) => this.isAtRisk(txn))
    const results: Array<{
      transactionId: string
      planned: Array<{ type: AllowedActionType; params?: Record<string, unknown>; summary?: string }>
      execution: PlaybookActionExecutionResult[]
    }> = []

    for (const txn of atRisk) {
      try {
        const forms = await this.loadTransactionForms(orgId, txn.id)
        const missingForms = this.findMissingForms(forms)
        const personaResult = await this.aiEmployees.runPersona('transactionCoordinator', {
          organizationId: orgId,
          userId: actor,
          transactionId: txn.id,
          input: {
            reason: 'scheduled_tc_check',
            presentForms: forms,
            missingForms
          }
        })

        const planned = this.normalizeActions(personaResult.actions ?? [])
        const payload = this.buildPayload(txn)
        const execution =
          planned.length > 0
            ? await this.playbooks.runActions(
                orgId,
                planned.map((action) => ({ type: action.type, params: action.params })),
                payload
              )
            : []

        await this.audit.log({
          organizationId: orgId,
          userId: actor,
          actionType: 'TC_AI_ACTION',
          summary: `TC automated check executed for transaction ${txn.id}`,
          metadata: { transactionId: txn.id, planned, execution }
        })

        results.push({ transactionId: txn.id, planned, execution })
      } catch (error) {
        this.log.warn(`TC check failed for transaction ${txn.id}: ${(error as Error).message}`)
      }
    }

    return results
  }

  private isAtRisk(transaction: { closingDate: Date | null; requiresAction: boolean; isCompliant: boolean }) {
    const closingSoon =
      transaction.closingDate !== null
        ? new Date(transaction.closingDate).getTime() - Date.now() <= 1000 * 60 * 60 * 24 * 7
        : false
    return Boolean(transaction.requiresAction || transaction.isCompliant === false || closingSoon)
  }

  private normalizeActions(actions: PersonaAction[]): Array<{ type: AllowedActionType; params?: Record<string, unknown>; summary?: string }> {
    return actions
      .map((action) => {
        const normalized = this.toAllowedAction(action.type)
        if (!normalized) return null
        const params = action.params && typeof action.params === 'object' ? action.params : {}
        return { type: normalized, params, summary: action.summary }
      })
      .filter(Boolean) as Array<{ type: AllowedActionType; params?: Record<string, unknown>; summary?: string }>
  }

  private toAllowedAction(value: string | PlaybookActionType) {
    if (!value) return null
    return ALLOWED_AUTOMATED_ACTIONS.find(
      (candidate) => candidate === value || candidate.toString().toLowerCase() === value.toString().toLowerCase()
    )
  }

  private buildPayload(transaction: { id: string; listingId: string | null; agentProfileId: string | null }) {
    const payload: Record<string, unknown> = { transactionId: transaction.id }
    if (transaction.listingId) payload.listingId = transaction.listingId
    if (transaction.agentProfileId) payload.agentProfileId = transaction.agentProfileId
    return payload
  }

  private async loadTransactionForms(orgId: string, transactionId: string) {
    const files = await this.prisma.orgFile.findMany({
      where: { orgId, transactionId },
      select: { name: true }
    })
    return files.map((file) => file.name)
  }

  private findMissingForms(present: string[]) {
    const normalizedPresent = present.map((name) => name.toLowerCase())
    const requiredForms = Object.values(REQUIRED_DOCS).flatMap((group) => Object.values(group).flat())
    const missing = requiredForms.filter((form) => {
      const slug = form.toLowerCase()
      return !normalizedPresent.some((name) => name.includes(slug) || slug.includes(name))
    })
    return Array.from(new Set(missing))
  }
}
