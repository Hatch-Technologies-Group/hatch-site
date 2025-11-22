import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/modules/prisma/prisma.service'
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service'

// Local fallback while generated client is updated
type InsightType =
  | 'BROKER'
  | 'TEAM'
  | 'AGENT'
  | 'LISTING'
  | 'TRANSACTION'
  | 'LEAD'
  | 'RENTAL'
  | 'COMPLIANCE'
  | 'RISK'
  | 'PRODUCTIVITY'

type AiInsightPayload = {
  type?: string
  targetId?: string | null
  summary: string
  details?: Record<string, unknown>
}

// Local typed accessors to avoid missing client typings during migration
const PrismaModels = {
  aiInsight: 'aiInsight'
} as const

@Injectable()
export class InsightsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEmployees: AiEmployeesService
  ) {}

  // Compatibility stub for legacy callers
  purgeTenantCache(_tenantId: string) {
    // no-op in this simplified implementation
  }

  // Compatibility stub for legacy controllers/tests
  async getInsights(ctx: { tenantId?: string }, _query?: any) {
    if (!ctx?.tenantId) return []
    return this.list(ctx.tenantId, undefined, undefined, 50)
  }

  async generateDailyInsights(orgId: string, userId: string) {
    const ai = await this.aiEmployees.runPersona('brokerCoach' as any, {
      organizationId: orgId,
      userId
    })
    const insights = this.normalize(ai?.structured ?? (ai as any)?.aiResponse?.insights ?? (ai as any)?.rawJson ?? [])
    const created = []
    for (const insight of insights) {
      const type = this.parseType(insight.type)
      const record = await (this.prisma as any).aiInsight.create({
        data: {
          organizationId: orgId,
          type,
          targetId: insight.targetId ?? null,
          summary: insight.summary,
          details: insight.details ?? {}
        }
      })
      created.push(record)
    }
    return created
  }

  async list(orgId: string, type?: InsightType, targetId?: string, limit = 50) {
    return (this.prisma as any).aiInsight.findMany({
      where: {
        organizationId: orgId,
        ...(type ? { type } : {}),
        ...(targetId ? { targetId } : {})
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
  }

  private normalize(value: unknown): AiInsightPayload[] {
    if (!Array.isArray(value)) return []
    return value
      .filter((item) => item && typeof item.summary === 'string')
      .map((item) => ({
        type: (item as any).type,
        targetId: (item as any).targetId ?? null,
        summary: (item as any).summary as string,
        details: (item as any).details ?? {}
      }))
  }

  private parseType(input?: string): InsightType {
    const upper = (input ?? 'BROKER').toUpperCase()
    const allowed: InsightType[] = [
      'BROKER',
      'TEAM',
      'AGENT',
      'LISTING',
      'TRANSACTION',
      'LEAD',
      'RENTAL',
      'COMPLIANCE',
      'RISK',
      'PRODUCTIVITY'
    ]
    if (allowed.includes(upper as InsightType)) {
      return upper as InsightType
    }
    return 'BROKER'
  }
}
