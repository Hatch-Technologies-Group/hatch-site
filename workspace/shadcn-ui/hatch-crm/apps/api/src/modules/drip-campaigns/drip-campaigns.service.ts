import { Injectable, NotFoundException } from '@nestjs/common'
import { PlaybookActionType, Prisma } from '@hatch/db'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { PlaybookRunnerService } from '@/modules/playbooks/playbook-runner.service'

type DripStepInput = {
  offsetHours: number
  actionType: string
  payload?: Record<string, unknown> | null
}

@Injectable()
export class DripCampaignsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly playbooks: PlaybookRunnerService
  ) {}

  list(orgId: string) {
    return (this.prisma as any).dripCampaign.findMany({
      where: { organizationId: orgId },
      include: { steps: true },
      orderBy: { createdAt: 'desc' }
    })
  }

  async get(orgId: string, id: string) {
    const campaign = await (this.prisma as any).dripCampaign.findFirst({
      where: { id, organizationId: orgId },
      include: { steps: { orderBy: { offsetHours: 'asc' } } }
    })
    if (!campaign) throw new NotFoundException('Drip campaign not found')
    return campaign
  }

  create(orgId: string, input: { name: string; description?: string | null; enabled?: boolean; steps?: DripStepInput[] }) {
    return (this.prisma as any).dripCampaign.create({
      data: {
        organizationId: orgId,
        name: input.name,
        description: input.description ?? null,
        enabled: input.enabled ?? true,
        steps: input.steps
          ? {
              create: input.steps.map((step) => ({
                offsetHours: step.offsetHours ?? 0,
                actionType: step.actionType,
                payload: (step.payload ?? undefined) as Prisma.InputJsonValue | undefined
              }))
            }
          : undefined
      },
      include: { steps: true }
    })
  }

  async update(orgId: string, id: string, input: { name?: string; description?: string | null; enabled?: boolean }) {
    await this.get(orgId, id)
    return (this.prisma as any).dripCampaign.update({
      where: { id },
      data: {
        name: input.name ?? undefined,
        description: input.description ?? undefined,
        enabled: input.enabled ?? undefined
      },
      include: { steps: true }
    })
  }

  async addStep(orgId: string, id: string, step: DripStepInput) {
    await this.get(orgId, id)
    return (this.prisma as any).dripStep.create({
      data: {
        campaignId: id,
        offsetHours: step.offsetHours ?? 0,
        actionType: step.actionType,
        payload: (step.payload ?? undefined) as Prisma.InputJsonValue | undefined
      }
    })
  }

  async runNow(orgId: string, id: string, leadId: string) {
    const campaign = await this.get(orgId, id)
    const steps = [...campaign.steps].sort((a, b) => a.offsetHours - b.offsetHours)
    const actions = steps
      .map((step) => this.toPlaybookAction(step))
      .filter((action): action is { type: PlaybookActionType; params: Record<string, unknown> } => action !== null)

    if (actions.length === 0) {
      return { campaignId: id, executed: [] }
    }

    const payload: Record<string, unknown> = { leadId, campaignId: id }
    const results = await this.playbooks.runActions(orgId, actions, payload)
    return { campaignId: id, executed: results }
  }

  private toPlaybookAction(step: { actionType: string; payload: Prisma.JsonValue | null }) {
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
