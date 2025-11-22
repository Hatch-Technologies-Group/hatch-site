import { Injectable } from '@nestjs/common'
import { PlaybookActionType } from '@hatch/db'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { PlaybookRunnerService } from '@/modules/playbooks/playbook-runner.service'

@Injectable()
export class DripRunnerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playbooks: PlaybookRunnerService
  ) {}

  async nextStepForLead(orgId: string, leadId: string) {
    const enrollment = await (this.prisma as any).leadSequenceEnrollment.findFirst({
      where: { organizationId: orgId, personId: leadId },
      orderBy: { enrolledAt: 'desc' }
    })
    if (!enrollment) {
      return { nextStep: null }
    }

    const steps = await (this.prisma as any).dripStep.findMany({
      where: { campaignId: enrollment.sequenceId },
      orderBy: { offsetHours: 'asc' }
    })
    if (!steps.length) return { nextStep: null }

    const start = enrollment.enrolledAt instanceof Date ? enrollment.enrolledAt : new Date(enrollment.enrolledAt)
    const now = new Date()
    const elapsedHours = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60))
    const pending = steps.find((step: any) => step.offsetHours >= elapsedHours)
    return { nextStep: pending ?? null }
  }

  async runStep(orgId: string, leadId: string, stepId: string) {
    const step = await (this.prisma as any).dripStep.findFirst({
      where: { id: stepId },
      include: { campaign: true }
    })
    if (!step || step.campaign.organizationId !== orgId) {
      return null
    }
    const action = this.toPlaybookAction(step)
    if (!action) return null
    return this.playbooks.runActions(orgId, [action], { leadId, campaignId: step.campaignId })
  }

  private toPlaybookAction(step: { actionType: string; payload: any }): { type: PlaybookActionType; params?: Record<string, unknown> } | null {
    const normalized = this.normalizeActionType(step.actionType)
    if (!normalized) return null
    const params = step.payload && typeof step.payload === 'object' ? (step.payload as Record<string, unknown>) : {}
    return { type: normalized, params }
  }

  private normalizeActionType(value: string): PlaybookActionType | null {
    const candidates = [
      value,
      value.toUpperCase(),
      value.toLowerCase(),
      value.replace(/[_\s-]+/g, '').toLowerCase()
    ]
    for (const candidate of candidates) {
      const match = (Object.values(PlaybookActionType) as string[]).find((entry) => {
        const compact = entry.replace(/[_\s-]+/g, '').toLowerCase()
        return compact === candidate.replace(/[_\s-]+/g, '').toLowerCase()
      })
      if (match) {
        return match as PlaybookActionType
      }
    }
    return null
  }
}
