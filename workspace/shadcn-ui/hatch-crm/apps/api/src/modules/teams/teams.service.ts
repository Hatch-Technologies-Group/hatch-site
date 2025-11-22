import { Injectable, NotFoundException } from '@nestjs/common'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { CreateTeamDto } from './dto/create-team.dto'
import { UpdateTeamDto } from './dto/update-team.dto'

@Injectable()
export class TeamsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(orgId: string) {
    return this.prisma.team.findMany({
      where: { orgId },
      include: {
        office: true,
        members: {
          include: {
            user: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
  }

  async create(orgId: string, dto: CreateTeamDto) {
    const tenantId = await this.resolveTenantId(orgId)
    const team = await this.prisma.team.create({
      data: {
        tenantId,
        orgId,
        name: dto.name,
        description: dto.description ?? null,
        officeId: dto.officeId ?? null
      }
    })
    await this.applyMemberships(team.id, dto)
    return team
  }

  async update(orgId: string, teamId: string, dto: UpdateTeamDto) {
    const team = await this.prisma.team.update({
      where: { id: teamId, orgId },
      data: {
        name: dto.name,
        description: dto.description ?? undefined,
        officeId: dto.officeId ?? undefined
      }
    })
    await this.applyMemberships(team.id, dto)
    return team
  }

  async remove(orgId: string, teamId: string) {
    await this.prisma.user.updateMany({ where: { teamId }, data: { teamId: null } })
    await this.prisma.teamMembership.deleteMany({ where: { teamId } })
    return this.prisma.team.delete({ where: { id: teamId, orgId } })
  }

  private async resolveTenantId(orgId: string) {
    const tenant = await this.prisma.tenant.findFirst({ where: { organizationId: orgId }, select: { id: true } })
    if (!tenant) {
      throw new NotFoundException('Tenant not found for organization')
    }
    return tenant.id
  }

  private async applyMemberships(teamId: string, dto: { leaderIds?: string[]; memberIds?: string[] }) {
    const leaderIds = dto.leaderIds ?? []
    const memberIds = dto.memberIds ?? []
    const combined = Array.from(new Set([...leaderIds, ...memberIds]))
    if (!combined.length) {
      return
    }
    await Promise.all(
      combined.map((userId) =>
        this.prisma.teamMembership.upsert({
          where: { teamId_userId: { teamId, userId } },
          update: { role: leaderIds.includes(userId) ? 'leader' : 'member' },
          create: { teamId, userId, role: leaderIds.includes(userId) ? 'leader' : 'member' }
        })
      )
    )
    await this.prisma.user.updateMany({ where: { id: { in: combined } }, data: { teamId } })
  }
}
