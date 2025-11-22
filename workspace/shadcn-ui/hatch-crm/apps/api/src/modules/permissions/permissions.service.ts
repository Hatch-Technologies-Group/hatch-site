import { ForbiddenException, Injectable } from '@nestjs/common'
import { Prisma } from '@hatch/db'

import { PrismaService } from '@/modules/prisma/prisma.service'

@Injectable()
export class PermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  async assertBroker(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, organizationId: true } })
    if (!user || user.organizationId !== orgId || user.role !== 'BROKER') {
      throw new ForbiddenException('Broker access required')
    }
  }

  async assertOrgMember(orgId: string, userId: string) {
    const membership = await this.prisma.user.findUnique({ where: { id: userId }, select: { organizationId: true } })
    if (!membership || membership.organizationId !== orgId) {
      throw new ForbiddenException('User not in organization')
    }
  }

  async assertBrokerOrTeamLead(orgId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { role: true, organizationId: true } })
    if (!user || user.organizationId !== orgId) {
      throw new ForbiddenException('Unauthorized')
    }
    if (user.role === 'BROKER' || user.role === 'TEAM_LEAD') {
      return
    }
    throw new ForbiddenException('Team lead or broker role required')
  }

  async getDelegationsForAssistant(orgId: string, assistantId: string) {
    return this.prisma.delegatedAccess.findMany({
      where: { organizationId: orgId, assistantId }
    })
  }

  async getDelegation(orgId: string, assistantId: string, agentId: string) {
    return this.prisma.delegatedAccess.findFirst({
      where: { organizationId: orgId, assistantId, agentId }
    })
  }

  buildAssistantFilter(orgId: string, userId: string) {
    return this.prisma.delegatedAccess.findMany({
      where: { organizationId: orgId, assistantId: userId }
    })
  }
}
