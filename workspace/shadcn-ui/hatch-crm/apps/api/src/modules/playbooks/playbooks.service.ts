import { Injectable, NotFoundException } from '@nestjs/common'
import { PlaybookActionType, PlaybookTriggerType, Prisma } from '@hatch/db'

import { PrismaService } from '@/modules/prisma/prisma.service'

export type PlaybookInput = {
  name: string
  description?: string | null
  enabled?: boolean
  triggers: Array<{ type: PlaybookTriggerType; conditions?: Record<string, unknown> | null }>
  actions: Array<{ type: PlaybookActionType; params?: Record<string, unknown> | null }>
}

@Injectable()
export class PlaybooksService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.playbook.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: { triggers: true, actions: true }
    })
  }

  async get(orgId: string, playbookId: string) {
    const playbook = await this.prisma.playbook.findFirst({
      where: { id: playbookId, organizationId: orgId },
      include: { triggers: true, actions: true }
    })
    if (!playbook) throw new NotFoundException('Playbook not found')
    return playbook
  }

  async create(orgId: string, input: PlaybookInput) {
    return this.prisma.playbook.create({
      data: {
        organizationId: orgId,
        name: input.name,
        description: input.description ?? null,
        enabled: input.enabled ?? true,
        triggers: {
          create: input.triggers.map((t) => ({
            type: t.type,
            conditions: (t.conditions ?? undefined) as Prisma.InputJsonValue | undefined
          }))
        },
        actions: {
          create: input.actions.map((a) => ({
            type: a.type,
            params: (a.params ?? undefined) as Prisma.InputJsonValue | undefined
          }))
        }
      },
      include: { triggers: true, actions: true }
    })
  }

  async update(orgId: string, playbookId: string, input: Partial<PlaybookInput>) {
    await this.get(orgId, playbookId)
    const updates: Prisma.PlaybookUpdateInput = {
      name: input.name ?? undefined,
      description: input.description ?? undefined,
      enabled: input.enabled ?? undefined
    }

    if (input.triggers) {
      await this.prisma.playbookTrigger.deleteMany({ where: { playbookId } })
      updates.triggers = {
        create: input.triggers.map((t) => ({
          type: t.type,
          conditions: (t.conditions ?? undefined) as Prisma.InputJsonValue | undefined
        }))
      }
    }
    if (input.actions) {
      await this.prisma.playbookAction.deleteMany({ where: { playbookId } })
      updates.actions = {
        create: input.actions.map((a) => ({
          type: a.type,
          params: (a.params ?? undefined) as Prisma.InputJsonValue | undefined
        }))
      }
    }

    return this.prisma.playbook.update({
      where: { id: playbookId },
      data: updates,
      include: { triggers: true, actions: true }
    })
  }

  async toggle(orgId: string, playbookId: string, enabled: boolean) {
    await this.get(orgId, playbookId)
    return this.prisma.playbook.update({ where: { id: playbookId }, data: { enabled } })
  }

  listRuns(orgId: string, playbookId: string, limit = 20) {
    return this.prisma.playbookRun.findMany({
      where: { organizationId: orgId, playbookId },
      orderBy: { startedAt: 'desc' },
      take: Math.max(1, Math.min(limit, 50))
    })
  }

  validatePlaybookDraft(draft: any): PlaybookInput {
    if (!draft || typeof draft !== 'object') {
      throw new Error('AI draft is empty or invalid')
    }
    const name = typeof draft.name === 'string' && draft.name.trim() ? draft.name.trim() : 'AI Generated Playbook'
    const description = typeof draft.description === 'string' ? draft.description : null
    const triggersInput = Array.isArray(draft.triggers) ? draft.triggers : []
    const actionsInput = Array.isArray(draft.actions) ? draft.actions : []

    const triggers = triggersInput.map((entry: any) => {
      const type = entry?.type as PlaybookTriggerType
      if (!Object.values(PlaybookTriggerType).includes(type)) {
        throw new Error(`Invalid trigger type: ${type}`)
      }
      const conditions = entry?.conditions && typeof entry.conditions === 'object' ? entry.conditions : undefined
      return { type, conditions }
    })

    if (!triggers.length) {
      throw new Error('At least one trigger is required')
    }

    const actions = actionsInput.map((entry: any) => {
      const type = entry?.type as PlaybookActionType
      if (!Object.values(PlaybookActionType).includes(type)) {
        throw new Error(`Invalid action type: ${type}`)
      }
      const params = entry?.params && typeof entry.params === 'object' ? entry.params : undefined
      return { type, params }
    })

    if (!actions.length) {
      throw new Error('At least one action is required')
    }

    return {
      name,
      description,
      enabled: true,
      triggers,
      actions
    }
  }
}
