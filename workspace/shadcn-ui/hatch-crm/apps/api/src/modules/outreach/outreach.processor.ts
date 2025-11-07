import { Injectable, Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';

import {
  CampaignEnrollmentStatus,
  OutreachChannel,
  OutreachEventStatus
} from '@hatch/db';

import { PrismaService } from '@/shared/prisma.service';
import { EmailService } from '@/lib/email/email.service';
import { renderTemplate, wrapEmailHtml } from '@/lib/templates/render-template';
import { OUTREACH_QUEUE_NAME, OutreachJobData } from './outreach.queue';

@Injectable()
@Processor(OUTREACH_QUEUE_NAME)
export class OutreachProcessor extends WorkerHost {
  private readonly log = new Logger(OutreachProcessor.name);

  constructor(private readonly prisma: PrismaService, private readonly email: EmailService) {
    super();
  }

  async process(job: Job<any, any, string>) {
    const { enrollmentId, stepOrder } = job.data as OutreachJobData;
    const enrollment = await this.prisma.campaignEnrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        campaign: {
          include: {
            steps: {
              include: { template: true },
              orderBy: { order: 'asc' }
            }
          }
        },
        lead: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryEmail: true
          }
        }
      }
    });

    if (!enrollment) {
      this.log.warn(`Enrollment ${enrollmentId} not found`);
      return;
    }

    const step = enrollment.campaign.steps.find((candidate) => candidate.order === stepOrder);
    if (!step) {
      await this.prisma.campaignEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: CampaignEnrollmentStatus.COMPLETED,
          nextRunAt: new Date()
        }
      });
      return;
    }

    if (step.channel !== OutreachChannel.EMAIL) {
      this.log.warn(`Unsupported channel ${step.channel} for enrollment ${enrollmentId}`);
      await this.prisma.campaignEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: CampaignEnrollmentStatus.PAUSED,
          nextRunAt: new Date()
        }
      });
      return;
    }

    if (!enrollment.lead?.primaryEmail) {
      await this.prisma.outreachEvent.create({
        data: {
          tenantId: enrollment.tenantId,
          organizationId: enrollment.organizationId,
          enrollmentId,
          stepOrder,
          channel: OutreachChannel.EMAIL,
          status: OutreachEventStatus.SKIPPED,
          error: 'Lead is missing a primary email address'
        }
      });
      await this.prisma.campaignEnrollment.update({
        where: { id: enrollmentId },
        data: {
          status: CampaignEnrollmentStatus.PAUSED,
          nextRunAt: new Date()
        }
      });
      return;
    }

    const vars = {
      leadFirst: enrollment.lead.firstName ?? 'there',
      leadLast: enrollment.lead.lastName ?? '',
      leadEmail: enrollment.lead.primaryEmail,
      unsubscribeUrl: `https://your.app/u/${enrollment.id}`
    };

    try {
      const htmlBody = wrapEmailHtml(renderTemplate(step.template.body, vars));
      const subject = renderTemplate(
        step.template.subject ?? 'Update from your agent',
        vars
      );

      const info = await this.email.send({
        to: enrollment.lead.primaryEmail,
        subject,
        html: htmlBody,
        text: stripHtml(htmlBody)
      });

      const nextStep = enrollment.campaign.steps.find(
        (candidate) => candidate.order === stepOrder + 1
      );
      const nextRunAt = nextStep
        ? new Date(Date.now() + nextStep.delayHours * 3600 * 1000)
        : new Date();
      const nextStatus = nextStep
        ? CampaignEnrollmentStatus.ACTIVE
        : CampaignEnrollmentStatus.COMPLETED;

      await this.prisma.$transaction(async (tx) => {
        await tx.outreachEvent.create({
          data: {
            tenantId: enrollment.tenantId,
            organizationId: enrollment.organizationId,
            enrollmentId,
            stepOrder,
            channel: OutreachChannel.EMAIL,
            status: OutreachEventStatus.SENT,
            sentAt: new Date(),
            metadata: info?.messageId ? { messageId: info.messageId } : undefined
          }
        });

        await tx.campaignEnrollment.update({
          where: { id: enrollmentId },
          data: {
            lastStepSent: stepOrder,
            status: nextStatus,
            nextRunAt
          }
        });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      await this.prisma.$transaction(async (tx) => {
        await tx.outreachEvent.create({
          data: {
            tenantId: enrollment.tenantId,
            organizationId: enrollment.organizationId,
            enrollmentId,
            stepOrder,
            channel: OutreachChannel.EMAIL,
            status: OutreachEventStatus.FAILED,
            error: message
          }
        });

        await tx.campaignEnrollment.update({
          where: { id: enrollmentId },
          data: {
            status: CampaignEnrollmentStatus.PAUSED,
            nextRunAt: new Date()
          }
        });
      });

      this.log.error(
        `Failed to send outreach email for enrollment ${enrollmentId}: ${message}`,
        error instanceof Error ? error.stack : undefined
      );
      throw error;
    }
  }
}

function stripHtml(html: string) {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}
