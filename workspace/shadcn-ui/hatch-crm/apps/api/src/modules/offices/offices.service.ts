import { Injectable } from '@nestjs/common'

import { PrismaService } from '@/modules/prisma/prisma.service'
import { CreateOfficeDto } from './dto/create-office.dto'
import { UpdateOfficeDto } from './dto/update-office.dto'

@Injectable()
export class OfficesService {
  constructor(private readonly prisma: PrismaService) {}

  list(orgId: string) {
    return this.prisma.office.findMany({ where: { organizationId: orgId }, orderBy: { name: 'asc' } })
  }

  create(orgId: string, dto: CreateOfficeDto) {
    return this.prisma.office.create({ data: { organizationId: orgId, ...dto } })
  }

  update(orgId: string, officeId: string, dto: UpdateOfficeDto) {
    return this.prisma.office.update({
      where: { id: officeId, organizationId: orgId },
      data: dto
    })
  }

  remove(orgId: string, officeId: string) {
    return this.prisma.office.delete({ where: { id: officeId, organizationId: orgId } })
  }
}
