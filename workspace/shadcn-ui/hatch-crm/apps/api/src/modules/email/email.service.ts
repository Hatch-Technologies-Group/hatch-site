import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ConsentChannel,
  ConsentScope,
  ConsentStatus,
  MarketingCampaignStatus,
  OutreachChannel,
  PersonStage,
  Prisma
} from '@hatch/db';
import sgMail from '@sendgrid/mail';
import type { MailDataRequired } from '@sendgrid/helpers/classes/mail';

import { PrismaService } from '@/modules/prisma/prisma.service';
import { PERSONAS } from '@/modules/ai/personas/ai-personas.config';
import type { PersonaId } from '@/modules/ai/personas/ai-personas.types';
import { AUDIENCE_SEGMENTS, type AudienceSegmentKey } from '@/modules/ai/ai-email.types';
import { MarketingService } from '@/modules/marketing/marketing.service';

type SendPreviewInput = {
  tenantId: string;
  userId: string;
  to?: string[];
  segmentKey?: AudienceSegmentKey;
  subject: string;
  html?: string;
  text?: string;
  personaId?: PersonaId;
};

type CampaignRecord = Awaited<ReturnType<MarketingService['createCampaign']>>['campaign'];

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HOT_LEAD_LOOKBACK_MS = (Number(process.env.AI_EMAIL_HOT_LOOKBACK_DAYS ?? 30) || 30) * ONE_DAY_MS;
const PAST_CLIENT_LOOKBACK_MS = (Number(process.env.AI_EMAIL_PAST_CLIENT_DAYS ?? 730) || 730) * ONE_DAY_MS;
const SEGMENT_LIMIT = Number(process.env.AI_EMAIL_SEGMENT_LIMIT ?? 200) || 200;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly fromEmail: string;
  private readonly dryRun: boolean;
  private readonly sendgridEnabled: boolean;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly marketing: MarketingService
  ) {
    const domain = this.config.get<string>('EMAIL_SENDER_DOMAIN') ?? 'example.hatchcrm.test';
    this.fromEmail = `ai@${domain}`;
    this.dryRun = (process.env.AI_EMAIL_PREVIEW_DRY_RUN ?? 'false').toLowerCase() === 'true';

    const apiKey =
      this.config.get<string>('SENDGRID_API_KEY') ?? process.env.SENDGRID_API_KEY ?? null;
    if (apiKey) {
      sgMail.setApiKey(apiKey);
      this.sendgridEnabled = true;
    } else {
      this.sendgridEnabled = false;
      this.logger.warn('SENDGRID_API_KEY is not configured; /email/send will operate in dry-run mode.');
    }
  }

  async sendPreview(input: SendPreviewInput): Promise<{ success: boolean; campaign?: CampaignRecord }> {
    const recipients = await this.resolveRecipients({
      tenantId: input.tenantId,
      to: input.to,
      segmentKey: input.segmentKey
    });

    const campaignRecord = await this.logCampaign({
      tenantId: input.tenantId,
      userId: input.userId,
      personaId: input.personaId,
      subject: input.subject,
      html: input.html,
      text: input.text,
      segmentKey: input.segmentKey,
      recipientsCount: recipients.length
    });

    if (!this.sendgridEnabled || this.dryRun) {
      this.logger.log(
        `[email-preview] Dry run (${recipients.length} recipients) — subject="${input.subject}"`
      );
      return { success: true, campaign: campaignRecord };
    }

    const payload: MailDataRequired = {
      to: recipients,
      from: {
        email: this.fromEmail,
        name: this.resolveFromName(input.personaId)
      },
      subject: input.subject,
      html: input.html ?? undefined,
      text: this.buildTextBody(input)
    };

    payload.customArgs = {
      tenantId: input.tenantId,
      userId: input.userId,
      personaId: input.personaId ?? 'unknown'
    };
    payload.trackingSettings = {
      subscriptionTracking: { enable: true },
      clickTracking: { enable: true, enableText: true },
      openTracking: { enable: true }
    };

    try {
      await sgMail.send(payload);
      return { success: true, campaign: campaignRecord };
    } catch (error) {
      const description = error instanceof Error ? error.message : 'Unknown SendGrid error';
      this.logger.error(`Failed to send marketing preview email: ${description}`);
      throw new BadRequestException('Failed to send email');
    }
  }

  private async resolveRecipients(input: {
    tenantId: string;
    to?: string[];
    segmentKey?: AudienceSegmentKey;
  }): Promise<string[]> {
    if (input.to && input.to.length > 0) {
      return this.dedupeEmails(input.to);
    }

    if (!input.segmentKey) {
      throw new BadRequestException('Provide recipients or a segment to target.');
    }

    const leads = await this.prisma.person.findMany({
      where: this.buildSegmentWhere(input.tenantId, input.segmentKey),
      select: { primaryEmail: true },
      orderBy: [
        { lastActivityAt: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: SEGMENT_LIMIT
    });

    const recipients = leads
      .map((person) => person.primaryEmail?.trim().toLowerCase())
      .filter((email): email is string => Boolean(email));

    if (recipients.length === 0) {
      const segment = AUDIENCE_SEGMENTS[input.segmentKey];
      throw new BadRequestException(
        `No emailable contacts found for segment ${segment?.label ?? input.segmentKey}`
      );
    }

    return Array.from(new Set(recipients));
  }

  private buildSegmentWhere(
    tenantId: string,
    segmentKey: AudienceSegmentKey
  ): Prisma.PersonWhereInput {
    const base: Prisma.PersonWhereInput = {
      tenantId,
      deletedAt: null,
      primaryEmail: { not: null },
      doNotContact: false,
      consents: {
        some: {
          channel: ConsentChannel.EMAIL,
          scope: ConsentScope.PROMOTIONAL,
          status: ConsentStatus.GRANTED
        }
      }
    };

    const now = Date.now();

    switch (segmentKey) {
      case 'all_hot_leads':
        return {
          ...base,
          stage: { in: [PersonStage.ACTIVE, PersonStage.UNDER_CONTRACT] },
          lastActivityAt: {
            not: null,
            gte: new Date(now - HOT_LEAD_LOOKBACK_MS)
          }
        };
      case 'past_clients':
        return {
          ...base,
          stage: PersonStage.CLOSED,
          updatedAt: {
            gte: new Date(now - PAST_CLIENT_LOOKBACK_MS)
          }
        };
      case 'open_house_invites':
        return {
          ...base,
          stage: { in: [PersonStage.NEW, PersonStage.NURTURE, PersonStage.ACTIVE] },
          OR: [
            { tags: { hasSome: ['open_house', 'open-house', 'sphere'] } },
            { source: { contains: 'open house', mode: 'insensitive' } },
            { address: { not: null } }
          ]
        };
      case 'all_leads':
      default:
        return base;
    }
  }

  private dedupeEmails(recipients: string[]): string[] {
    return Array.from(
      new Set(
        recipients
          .map((email) => (typeof email === 'string' ? email.trim().toLowerCase() : ''))
          .filter((email) => email.length > 0)
      )
    );
  }

  private buildTextBody(input: SendPreviewInput): string | undefined {
    if (input.text && input.text.trim().length > 0) {
      return input.text.trim();
    }
    if (!input.html) {
      return undefined;
    }
    return this.stripHtml(input.html);
  }

  private resolveFromName(personaId?: PersonaId): string {
    if (!personaId) {
      return 'Hatch AI';
    }
    const persona = PERSONAS.find((entry) => entry.id === personaId);
    return persona ? `${persona.name} via Hatch AI` : 'Hatch AI';
  }

  private async logCampaign(input: {
    tenantId: string;
    userId?: string;
    personaId?: PersonaId;
    subject: string;
    html?: string;
    text?: string;
    segmentKey?: AudienceSegmentKey;
    recipientsCount: number;
  }): Promise<CampaignRecord | undefined> {
    if (!input.personaId) {
      return undefined;
    }

    const body = (input.html ?? input.text ?? '').trim();
    if (!body) {
      return undefined;
    }

    const audienceLabel = input.segmentKey
      ? AUDIENCE_SEGMENTS[input.segmentKey]?.label ?? input.segmentKey
      : 'Custom list';

    try {
      const result = await this.marketing.createCampaign(input.tenantId, input.userId ?? null, {
        personaId: input.personaId,
        subject: input.subject,
        body,
        audienceKey: input.segmentKey,
        audienceLabel,
        recipientsCount: input.recipientsCount,
        status: MarketingCampaignStatus.SENT,
        channel: OutreachChannel.EMAIL
      });
      return result.campaign;
    } catch (error) {
      const description = error instanceof Error ? error.message : 'unknown error';
      this.logger.warn(`Failed to log marketing campaign: ${description}`);
      return undefined;
    }
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
}
