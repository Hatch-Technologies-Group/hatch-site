import { Injectable, Logger } from '@nestjs/common'
import { PlaybookTriggerType, Prisma } from '@hatch/db'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service'
import { PlaybookRunnerService } from '@/modules/playbooks/playbook-runner.service'

const HIGH_THRESHOLD = 75
const LOW_THRESHOLD = 35

@Injectable()
export class LeadScoringService {
  private readonly log = new Logger(LeadScoringService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEmployees: AiEmployeesService,
    private readonly playbooks: PlaybookRunnerService
  ) {}

  async scoreLead(orgId: string, leadId: string, userId: string) {
    const lead = await (this.prisma as any).lead.findFirst({
      where: { id: leadId, organizationId: orgId }
    })
    if (!lead) {
      throw new Error('Lead not found')
    }

    const ai = await this.aiEmployees.runPersona('leadScorer', {
      organizationId: orgId,
      userId,
      leadId,
      input: { lead }
    })

    const structured = ai?.structured ?? {}
    const aiScore = typeof structured.aiScore === 'number' ? structured.aiScore : structured.score ?? null
    const likelihood =
      typeof structured.conversionLikelihood === 'number'
        ? structured.conversionLikelihood
        : typeof structured.likelihood === 'number'
          ? structured.likelihood
          : null
    const reasonSummary =
      typeof structured.reason === 'string'
        ? structured.reason
        : typeof structured.summary === 'string'
          ? structured.summary
          : undefined

    if (aiScore !== null) {
      await (this.prisma as any).lead.update({
        where: { id: leadId },
        data: {
          aiScore,
          conversionLikelihood: likelihood,
          lastAiScoreAt: new Date()
        }
      })
      await (this.prisma as any).leadScoreHistory.create({
        data: {
          organizationId: orgId,
          leadId,
          aiScore,
          likelihood: likelihood ?? 0,
          reasonSummary
        }
      })
    }

    await this.triggerPlaybooks(orgId, leadId, aiScore, likelihood)

    return {
      leadId,
      aiScore,
      conversionLikelihood: likelihood,
      structured,
      raw: ai?.rawText ?? null
    }
  }

  private async triggerPlaybooks(orgId: string, leadId: string, score: number | null, likelihood: number | null) {
    if (score === null && likelihood === null) return
    const scoreUpdated = (PlaybookTriggerType as any).LEAD_SCORE_UPDATED ?? PlaybookTriggerType.LEAD_UPDATED
    const highTrigger =
      (PlaybookTriggerType as any).LEAD_CONVERSION_HIGH ?? (PlaybookTriggerType as any).LEAD_UPDATED ?? PlaybookTriggerType.LEAD_UPDATED
    const lowTrigger =
      (PlaybookTriggerType as any).LEAD_CONVERSION_LOW ?? (PlaybookTriggerType as any).LEAD_UPDATED ?? PlaybookTriggerType.LEAD_UPDATED

    const actions: Array<{ type: PlaybookTriggerType; payload: Record<string, unknown> }> = []
    actions.push({ type: scoreUpdated, payload: { leadId, score, likelihood } })
    if (score !== null) {
      if (score >= HIGH_THRESHOLD) {
        actions.push({ type: highTrigger, payload: { leadId, score, likelihood } })
      } else if (score <= LOW_THRESHOLD) {
        actions.push({ type: lowTrigger, payload: { leadId, score, likelihood } })
      }
    }

    for (const action of actions) {
      try {
        await this.playbooks.runTrigger(orgId, action.type, action.payload)
      } catch (error) {
        this.log.warn(`Lead scoring trigger failed: ${(error as Error).message}`)
      }
    }
  }
}
