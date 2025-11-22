import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { UpsertDelegationDto } from './dto/upsert-delegation.dto'

@Injectable()
export class DelegatedAccessService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.delegatedAccess.findMany({
      where: { organizationId: orgId },
      include: {
        agent: true,
        assistant: true
      }
    })
  }

  async upsert(orgId: string, dto: UpsertDelegationDto) {
    const existing = await this.prisma.delegatedAccess.findFirst({
      where: {
        organizationId: orgId,
        agentId: dto.agentId,
        assistantId: dto.assistantId
      }
    })

    if (existing) {
      return this.prisma.delegatedAccess.update({
        where: { id: existing.id },
        data: {
          canManageListings: dto.canManageListings ?? existing.canManageListings,
          canManageLeads: dto.canManageLeads ?? existing.canManageLeads,
          canManageTransactions: dto.canManageTransactions ?? existing.canManageTransactions,
          canManageRentals: dto.canManageRentals ?? existing.canManageRentals,
          canManageTasks: dto.canManageTasks ?? existing.canManageTasks,
          canViewFinancials: dto.canViewFinancials ?? existing.canViewFinancials,
          canChangeCompliance: dto.canChangeCompliance ?? existing.canChangeCompliance
        }
      })
    }

    return this.prisma.delegatedAccess.create({
      data: {
        organizationId: orgId,
        agentId: dto.agentId,
        assistantId: dto.assistantId,
        canManageListings: dto.canManageListings ?? true,
        canManageLeads: dto.canManageLeads ?? true,
        canManageTransactions: dto.canManageTransactions ?? true,
        canManageRentals: dto.canManageRentals ?? true,
        canManageTasks: dto.canManageTasks ?? true,
        canViewFinancials: dto.canViewFinancials ?? false,
        canChangeCompliance: dto.canChangeCompliance ?? false
      }
    })
  }

  remove(orgId: string, delegationId: string) {
    return this.prisma.delegatedAccess.delete({ where: { id: delegationId, organizationId: orgId } })
  }
}
