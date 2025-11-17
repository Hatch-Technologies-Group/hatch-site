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
    return this.prisma.emailSequence.findMany({
      where: { tenantId },
      include: {
        steps: {
          orderBy: { stepIndex: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async enrollLeadInSequence(params: { tenantId: string; leadId: string; sequenceId: string }) {
    const { tenantId, leadId, sequenceId } = params;

    const [sequence, lead] = await Promise.all([
      this.prisma.emailSequence.findFirst({ where: { tenantId, id: sequenceId } }),
      this.prisma.person.findUnique({ where: { id: leadId }, select: { id: true, tenantId: true } })
    ]);

    if (!sequence) {
      throw new NotFoundException('Sequence not found');
    }

    if (!lead || lead.tenantId !== tenantId) {
      throw new NotFoundException('Lead not found for tenant');
    }

    const existing = await this.prisma.leadSequenceEnrollment.findFirst({
      where: { tenantId, leadId, sequenceId, active: true }
    });
    if (existing) {
      throw new BadRequestException('Lead already enrolled in this sequence');
    }

    const firstStep = await this.prisma.emailStep.findFirst({
      where: { tenantId, sequenceId },
      orderBy: { stepIndex: 'asc' }
    });

    const nextSendAt = firstStep
      ? bestSendWindow(new Date(Date.now() + firstStep.delayHours * 3600 * 1000))
      : bestSendWindow();

    return this.prisma.leadSequenceEnrollment.create({
      data: {
        tenantId,
        leadId,
        sequenceId,
        currentStep: 0,
        nextSendAt,
        active: true
      }
    });
  }

  async draftNextStepForLead(tenantId: string, leadId: string) {
    const enrollment = await this.prisma.leadSequenceEnrollment.findFirst({
      where: { tenantId, leadId, active: true }
    });

    if (!enrollment) {
      throw new NotFoundException('Lead is not enrolled in any active sequence');
    }

    const step = await this.prisma.emailStep.findFirst({
      where: {
        tenantId,
        sequenceId: enrollment.sequenceId,
        stepIndex: enrollment.currentStep
      }
    });

    if (!step) {
      await this.prisma.leadSequenceEnrollment.update({
        where: { id: enrollment.id },
        data: { active: false, nextSendAt: null }
      });
      throw new NotFoundException('No step available for enrollment');
    }

    const draft = await this.outreachAI.draftForLead(tenantId, leadId);

    const emailDraft = await this.prisma.emailDraft.create({
      data: {
        tenantId,
        leadId,
        subject: draft.subject,
        html: draft.html,
        text: draft.text,
        meta: {
          sequenceId: enrollment.sequenceId,
          stepIndex: enrollment.currentStep,
          grounding: draft.grounding
        }
      }
    });

    const nextStepIndex = enrollment.currentStep + 1;
    const nextStep = await this.prisma.emailStep.findFirst({
      where: {
        tenantId,
        sequenceId: enrollment.sequenceId,
        stepIndex: nextStepIndex
      }
    });

    const nextSendAt = nextStep
      ? bestSendWindow(new Date(Date.now() + nextStep.delayHours * 3600 * 1000))
      : null;

    await this.prisma.leadSequenceEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: nextStepIndex,
        lastSentAt: new Date(),
        nextSendAt,
        active: Boolean(nextStep)
      }
    });

    return emailDraft;
  }
}
