import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { OutreachAIService } from './outreach.ai.service';
import { bestSendWindow } from './utils/send-time';

@Injectable()
export class OutreachService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outreachAI: OutreachAIService
  ) {}

  async listSequences(tenantId: string) {
    // Use the current Sequence model (JSON-based steps)
    return this.prisma.sequence.findMany({
      where: { tenantId, active: true },
      select: { id: true, name: true },
      orderBy: { createdAt: 'asc' }
    });
  }

  async enrollLeadInSequence(params: { tenantId: string; leadId: string; sequenceId: string }) {
    const { tenantId, leadId, sequenceId } = params;

    const [sequence, lead] = await Promise.all([
      this.prisma.sequence.findFirst({ where: { tenantId, id: sequenceId, active: true } }),
      this.prisma.person.findUnique({ where: { id: leadId }, select: { id: true, tenantId: true } })
    ]);

    if (!sequence) {
      throw new NotFoundException('Sequence not found');
    }

    if (!lead || lead.tenantId !== tenantId) {
      throw new NotFoundException('Lead not found for tenant');
    }

    const existing = await this.prisma.sequenceEnrollment.findFirst({
      where: { tenantId, personId: leadId, sequenceId, status: 'ACTIVE' as any }
    });
    if (existing) {
      throw new BadRequestException('Lead already enrolled in this sequence');
    }

    // Compute next run time from first step delay (if present)
    let nextRunAt = bestSendWindow();
    try {
      const steps = (sequence.steps as unknown as Array<{ delayHours?: number }> | null) ?? [];
      const first = steps[0];
      if (first && typeof first.delayHours === 'number') {
        nextRunAt = bestSendWindow(new Date(Date.now() + first.delayHours * 3600 * 1000));
      }
    } catch {
      // ignore malformed steps JSON; fall back to default send window
    }

    await this.prisma.sequenceEnrollment.create({
      data: {
        tenantId,
        sequenceId,
        personId: leadId,
        // ownerId: optional, can be set later
        currentStep: 0,
        status: 'ACTIVE' as any,
        nextRunAt
      }
    });

    return { ok: true };
  }

  async draftNextStepForLead(tenantId: string, leadId: string) {
    // Use the new enrollment model; if not found, still allow generating a draft (non-persistent)
    const enrollment = await this.prisma.sequenceEnrollment.findFirst({
      where: { tenantId, personId: leadId, status: 'ACTIVE' as any }
    });

    // Always generate a draft via AI; UI only needs the subject to confirm action
    const draft = await this.outreachAI.draftForLead(tenantId, leadId);

    if (!enrollment) {
      // Return ephemeral draft when no active enrollment exists
      return { subject: draft.subject } as any;
    }

    // Advance enrollment state heuristically using steps JSON if available
    try {
      const sequence = await this.prisma.sequence.findUnique({ where: { id: enrollment.sequenceId } });
      const steps = (sequence?.steps as unknown as Array<{ delayHours?: number }> | null) ?? [];
      const nextStepIndex = (enrollment.currentStep ?? 0) + 1;
      const next = steps[nextStepIndex];
      const nextRunAt = next && typeof next.delayHours === 'number'
        ? bestSendWindow(new Date(Date.now() + next.delayHours * 3600 * 1000))
        : null;

      await this.prisma.sequenceEnrollment.update({
        where: { id: enrollment.id },
        data: {
          currentStep: nextStepIndex,
          lastExecutedAt: new Date(),
          nextRunAt,
          status: next ? ('ACTIVE' as any) : ('COMPLETED' as any)
        }
      });
    } catch {
      // If step progression fails, ignore and still return draft subject
    }

    return { subject: draft.subject } as any;
  }
}
