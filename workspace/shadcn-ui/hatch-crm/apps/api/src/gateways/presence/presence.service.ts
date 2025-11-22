import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/modules/prisma/prisma.service'

const STALE_MS = 30_000

@Injectable()
export class PresenceService {
  constructor(private readonly prisma: PrismaService) {}

  async record(orgId: string, userId: string, location: string) {
    await this.prisma.livePresence.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      create: { organizationId: orgId, userId, location },
      update: { location }
    })
    await this.cleanupStale()
  }

  async cleanupStale() {
    const cutoff = new Date(Date.now() - STALE_MS)
    await this.prisma.livePresence.deleteMany({ where: { updatedAt: { lt: cutoff } } })
  }

  async viewers(orgId: string, location: string) {
    await this.cleanupStale()
    return this.prisma.livePresence.findMany({
      where: { organizationId: orgId, location },
      select: { userId: true }
    })
  }

  async activeSummary(orgId: string) {
    await this.cleanupStale()
    const activeUsers = await this.prisma.livePresence.findMany({ where: { organizationId: orgId } })
    const listingViews = activeUsers.filter((p) => p.location.startsWith('listing:')).length
    const transactionViews = activeUsers.filter((p) => p.location.startsWith('transaction:')).length
    const documentViews = activeUsers.filter((p) => p.location.startsWith('document:')).length
    return {
      activeUsers: activeUsers.length,
      listingViews,
      transactionViews,
      documentViews
    }
  }
}
