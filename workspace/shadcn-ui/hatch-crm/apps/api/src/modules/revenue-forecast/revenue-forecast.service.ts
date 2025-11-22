import { Injectable, Logger } from '@nestjs/common'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { AiEmployeesService } from '@/modules/ai-employees/ai-employees.service'

@Injectable()
export class RevenueForecastService {
  private readonly log = new Logger(RevenueForecastService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiEmployees: AiEmployeesService
  ) {}

  async generate(orgId: string, userId: string) {
    const transactions = await (this.prisma as any).orgTransaction.findMany({
      where: { organizationId: orgId, status: { in: ['UNDER_CONTRACT', 'CONTINGENT', 'PENDING'] as any } },
      select: { id: true, status: true, closingDate: true, listPrice: true, price: true }
    })

    const totals = {
      totalActive: transactions.reduce((sum: number, txn: any) => sum + (txn.listPrice ?? txn.price ?? 0), 0),
      totalPending: transactions.length,
      totalLost: 0
    }

    const ai = await this.aiEmployees.runPersona('revenueForecaster', {
      organizationId: orgId,
      userId,
      input: { transactions, totals }
    })

    const structured = ai?.structured ?? {}
    const snapshot = await (this.prisma as any).revenueForecast.create({
      data: {
        organizationId: orgId,
        forecast30Days: structured.forecast30Days ?? 0,
        forecast60Days: structured.forecast60Days ?? 0,
        forecast90Days: structured.forecast90Days ?? 0,
        totalPending: totals.totalPending,
        totalActive: totals.totalActive,
        totalLost: totals.totalLost,
        assumptions: (structured.assumptions ?? undefined) as any
      }
    })

    return { snapshot, structured, raw: ai?.rawText ?? null }
  }
}
