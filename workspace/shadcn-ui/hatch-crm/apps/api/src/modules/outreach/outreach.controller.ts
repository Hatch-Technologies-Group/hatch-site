import { BadRequestException, Body, Controller, Param, Post } from '@nestjs/common';
import { IsString } from 'class-validator';

import {
  CampaignEnrollmentStatus,
  ConsentChannel,
  ConsentStatus
} from '@hatch/db';

import { PrismaService } from '@/shared/prisma.service';
import { OutreachQueueService } from './outreach.queue';

class EnrollLeadDto {
  @IsString()
  leadId!: string;
}

@Controller('outreach')
export class OutreachController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: OutreachQueueService
  ) {}

  @Post('campaigns/:campaignId/enroll')
  async enroll(@Param('campaignId') campaignId: string, @Body() body: EnrollLeadDto) {
    if (!body?.leadId) {
      throw new BadRequestException('leadId is required');
    }

    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
      include: {
        steps: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!campaign || !campaign.isActive) {
      throw new BadRequestException('Campaign not found or inactive');
    }

    const firstStep = campaign.steps[0];
    if (!firstStep) {
      throw new BadRequestException('Campaign has no steps');
    }

    const lead = await this.prisma.person.findUnique({
      where: { id: body.leadId },
      select: { id: true, tenantId: true, organizationId: true }
    });

    if (!lead) {
      throw new BadRequestException('Lead not found');
    }

    if (lead.tenantId !== campaign.tenantId) {
      throw new BadRequestException('Lead and campaign tenants do not match');
    }

    const hasEmailConsent = await this.prisma.consent.findFirst({
      where: {
        personId: lead.id,
        channel: ConsentChannel.EMAIL,
        status: ConsentStatus.GRANTED
      }
    });

    if (!hasEmailConsent) {
      throw new BadRequestException('Lead must have email consent before enrollment');
    }

    const existingEnrollment = await this.prisma.campaignEnrollment.findFirst({
      where: {
        campaignId,
        leadId: lead.id,
        status: { in: [CampaignEnrollmentStatus.ACTIVE, CampaignEnrollmentStatus.PAUSED] }
      }
    });

    if (existingEnrollment) {
      throw new BadRequestException('Lead is already enrolled in this campaign');
    }

    const nextRunAt = new Date(Date.now() + firstStep.delayHours * 3600 * 1000);

    const enrollment = await this.prisma.campaignEnrollment.create({
      data: {
        tenantId: lead.tenantId,
        organizationId: lead.organizationId,
        campaignId,
        leadId: lead.id,
        status: CampaignEnrollmentStatus.ACTIVE,
        startedAt: new Date(),
        lastStepSent: 0,
        nextRunAt
      }
    });

    await this.queueService.scheduleDueEnrollments();

    return enrollment;
  }
}
