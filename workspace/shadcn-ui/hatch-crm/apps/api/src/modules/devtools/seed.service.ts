import { Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@hatch/db'
import { PrismaService } from '@/modules/prisma/prisma.service'

const STAGES: Prisma.LeadScalarFieldEnum[] = ['NEW', 'ACTIVE', 'UNDER_CONTRACT'] as any

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name)

  constructor(private readonly prisma: PrismaService) {}

  async seedOrganization(orgId: string) {
    const org = await this.prisma.organization.upsert({
      where: { id: orgId },
      update: {},
      create: {
        id: orgId,
        name: 'Load Test Brokerage',
        slug: `demo-${orgId}`,
        isDemo: true
      }
    })

    await this.seedUsers(org.id)
    await this.seedLeads(org.id, 200)
    this.logger.log(`Seeded organization ${org.id}`)
  }

  private async seedUsers(orgId: string) {
    const brokers = Array.from({ length: 5 }).map((_, idx) =>
      this.prisma.user.upsert({
        where: { email: `broker+${idx}@demo.local` },
        update: { organizationId: orgId },
        create: {
          organizationId: orgId,
          tenantId: orgId,
          email: `broker+${idx}@demo.local`,
          firstName: 'Demo',
          lastName: `Broker ${idx}`,
          role: 'BROKER'
        }
      })
    )
    await Promise.all(brokers)
  }

  private async seedLeads(orgId: string, count: number) {
    await this.prisma.$transaction(
      Array.from({ length: count }).map((_, idx) =>
        this.prisma.lead.create({
          data: {
            organizationId: orgId,
            name: `Load Lead ${idx}`,
            email: `load-lead-${idx}@demo.local`,
            status: STAGES[idx % STAGES.length] as any,
            source: 'MANUAL'
          }
        })
      )
    )
  }
}
