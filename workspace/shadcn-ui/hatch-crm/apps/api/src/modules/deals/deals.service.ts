import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import type { RequestContext } from '../common/request-context';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async moveDeal(ctx: RequestContext, dealId: string, toStageId: string, reason?: string) {
    if (!ctx.tenantId) {
      throw new BadRequestException('Tenant context is required');
    }
    if (!toStageId) {
      throw new BadRequestException('toStageId is required');
    }

    const person = await this.prisma.person.findFirst({
      where: { id: dealId, tenantId: ctx.tenantId },
      select: {
        id: true,
        pipelineId: true,
        stageId: true,
        tenantId: true
      }
    });
    if (!person) {
      throw new NotFoundException('Deal not found');
    }

    const destinationStage = await this.prisma.stage.findFirst({
      where: { id: toStageId, tenantId: ctx.tenantId },
      select: {
        id: true,
        pipelineId: true,
        tenantId: true
      }
    });
    if (!destinationStage) {
      throw new NotFoundException('Destination stage not found');
    }

    if (destinationStage.pipelineId && person.pipelineId && destinationStage.pipelineId !== person.pipelineId) {
      throw new BadRequestException('Cannot move deal to a stage in a different pipeline');
    }

    const updated = await this.prisma.person.update({
      where: { id: person.id },
      data: {
        pipelineId: destinationStage.pipelineId,
        stageId: destinationStage.id,
        stageEnteredAt: new Date()
      },
      select: {
        id: true,
        stageId: true,
        pipelineId: true
      }
    });

    // TODO: surface `reason` in activity timeline once activity log is implemented.
    void reason;

    return updated;
  }
}
