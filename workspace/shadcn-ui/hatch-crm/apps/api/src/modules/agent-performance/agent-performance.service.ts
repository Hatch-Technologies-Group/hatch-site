import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '@/modules/prisma/prisma.service'
import { computeCompositeScore } from './scoring/scoring.helpers'

@Injectable()
export class AgentPerformanceService {
  private readonly logger = new Logger(AgentPerformanceService.name)

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Compute and persist performance snapshots for all agents in an org.
   * This is intentionally lightweight and uses best-effort heuristics with existing tables.
   */
  async generateSnapshots(orgId: string, periodStart?: Date, periodEnd?: Date) {
    const start = periodStart ?? new Date(Date.now() - 1000 * 60 * 60 * 24) // default last 24h
    const end = periodEnd ?? new Date()
    const agents = await this.prisma.agentProfile.findMany({
      where: { organizationId: orgId },
      select: { id: true },
    })

    for (const agent of agents) {
      try {
        const [leadsWorked, leadsConverted, tasksCompleted, tasksOverdue, listingsActive, transactionsActive, documentsFailed, documentsApproved] =
          await this.prisma.$transaction([
            this.prisma.lead.count({
              where: { organizationId: orgId, agentProfileId: agent.id },
            }),
            this.prisma.lead.count({
              where: {
                organizationId: orgId,
                agentProfileId: agent.id,
                status: 'CLOSED',
              },
            }),
            this.prisma.agentWorkflowTask.count({
              where: {
                organizationId: orgId,
                agentProfileId: agent.id,
                status: 'COMPLETED',
              },
            }),
            this.prisma.agentWorkflowTask.count({
              where: {
                organizationId: orgId,
                agentProfileId: agent.id,
                status: { in: ['PENDING', 'IN_PROGRESS'] },
                dueAt: { lt: end },
              },
            }),
            this.prisma.orgListing.count({
              where: {
                organizationId: orgId,
                agentProfileId: agent.id,
                status: { not: 'WITHDRAWN' },
              },
            }),
            this.prisma.orgTransaction.count({
              where: {
                organizationId: orgId,
                agentProfileId: agent.id,
                status: { not: 'CLOSED' },
              },
            }),
            this.prisma.orgFile.count({
              where: {
                orgId: orgId,
                listing: { agentProfileId: agent.id },
                complianceStatus: 'FAILED',
              },
            }),
            this.prisma.orgFile.count({
              where: {
                orgId: orgId,
                listing: { agentProfileId: agent.id },
                complianceStatus: 'PASSED',
              },
            }),
          ])

        const responsivenessScore = leadsWorked > 0 ? Math.max(0, Math.min(100, 100 - tasksOverdue * 5)) : 0
        const activityScore = Math.min(100, leadsWorked * 2 + tasksCompleted * 3 + listingsActive * 5)
        const conversionRate = leadsWorked > 0 ? leadsConverted / leadsWorked : 0
        const performanceScore = computeCompositeScore({
          responsivenessScore,
          activityScore,
          conversionRate,
        })

        await this.prisma.agentPerformanceSnapshot.create({
          data: {
            organizationId: orgId,
            agentProfileId: agent.id,
            leadsWorked,
            leadsConverted,
            avgResponseTimeSec: 0,
            tasksCompleted,
            tasksOverdue,
            documentsIssues: documentsFailed,
            compliantDocs: documentsApproved,
            listingsActive,
            transactionsActive,
            activityScore,
            responsivenessScore,
            performanceScore,
            periodStart: start,
            periodEnd: end,
          },
        })
      } catch (err) {
        this.logger.warn(`Failed to compute snapshot for agent ${agent.id} in org ${orgId}: ${err}`)
      }
    }
  }

  async listSnapshots(orgId: string, agentProfileId?: string) {
    return this.prisma.agentPerformanceSnapshot.findMany({
      where: { organizationId: orgId, agentProfileId: agentProfileId ?? undefined },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
  }

  async latestByOrg(orgId: string) {
    // return latest snapshot per agent using simple ordering
    return this.prisma.agentPerformanceSnapshot.findMany({
      where: { organizationId: orgId },
      orderBy: [{ agentProfileId: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    })
  }
}
