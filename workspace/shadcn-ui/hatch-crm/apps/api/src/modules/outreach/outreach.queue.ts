import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { JobsOptions, Queue } from 'bullmq';

import { CampaignEnrollmentStatus, OutreachChannel } from '@hatch/db';

import { PrismaService } from '@/shared/prisma.service';

export const OUTREACH_QUEUE_NAME = 'outreach-send';
export const OUTREACH_JOB_NAME = 'send-step';

export type OutreachJobData = {
  enrollmentId: string;
  stepOrder: number;
};

@Injectable()
export class OutreachQueueService {
  private readonly log = new Logger(OutreachQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(OUTREACH_QUEUE_NAME) private readonly queue: Queue<OutreachJobData>
  ) {}

  async scheduleDueEnrollments(): Promise<void> {
    const dueEnrollments = await this.prisma.campaignEnrollment.findMany({
      where: {
        status: CampaignEnrollmentStatus.ACTIVE,
        nextRunAt: { lte: new Date() }
      },
      select: {
        id: true,
        campaignId: true,
        lastStepSent: true
      }
    });

    for (const enrollment of dueEnrollments) {
      const nextOrder = (enrollment.lastStepSent ?? 0) + 1;
      const nextStep = await this.prisma.campaignStep.findFirst({
        where: {
          campaignId: enrollment.campaignId,
          order: nextOrder
        },
        select: {
          id: true,
          channel: true,
          delayHours: true,
          templateId: true
        }
      });

      if (!nextStep) {
        await this.prisma.campaignEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: CampaignEnrollmentStatus.COMPLETED,
            nextRunAt: new Date()
          }
        });
        continue;
      }

      if (nextStep.channel !== OutreachChannel.EMAIL) {
        this.log.warn(
          `Campaign step ${nextStep.id} uses unsupported channel ${nextStep.channel}; skipping enrollment ${enrollment.id}`
        );
        await this.prisma.campaignEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: CampaignEnrollmentStatus.PAUSED,
            nextRunAt: new Date()
          }
        });
        continue;
      }

      const jobId = `${enrollment.id}-${nextOrder}`;
      const jobOptions: JobsOptions = {
        jobId,
        attempts: 3,
        backoff: { type: 'exponential', delay: 60_000 },
        removeOnComplete: 1000,
        removeOnFail: 1000
      };

      try {
        await this.queue.add(
          OUTREACH_JOB_NAME,
          {
            enrollmentId: enrollment.id,
            stepOrder: nextOrder
          },
          jobOptions
        );
      } catch (error) {
        if (error instanceof Error && error.message.includes('jobId')) {
          this.log.debug(
            `Job already scheduled for enrollment ${enrollment.id} step ${nextOrder}`
          );
          continue;
        }
        throw error;
      }
    }
  }
}
