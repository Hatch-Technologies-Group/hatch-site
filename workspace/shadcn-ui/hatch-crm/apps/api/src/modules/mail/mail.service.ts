import { Injectable, Logger } from '@nestjs/common';
import sgMail from '@sendgrid/mail';

import { DemoConfig } from '@/config/demo.config';

interface MailPayload {
  to: string;
  subject: string;
  html?: string;
  text?: string;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly from: string;
  private readonly sendgridEnabled: boolean;

  constructor() {
    const apiKey = process.env.SENDGRID_API_KEY;
    const from = process.env.EMAIL_FROM;
    if (!apiKey || !from) {
      this.sendgridEnabled = false;
      this.logger.warn('SendGrid not fully configured; transactional emails will be skipped.');
    } else {
      sgMail.setApiKey(apiKey);
      this.sendgridEnabled = true;
    }
    this.from = from ?? 'no-reply@hatchcrm.test';
  }

  async sendMail({ to, subject, html, text }: MailPayload) {
    if (DemoConfig.isDemoMode) {
      this.logger.log(`Demo mode: skipping email to ${to} (${subject}).`);
      return { skipped: true, demoMode: true };
    }

    if (!this.sendgridEnabled) {
      this.logger.debug(`Skipping email to ${to}; provider not configured.`);
      return { skipped: true };
    }

    const payload = {
      to,
      from: this.from,
      subject,
      text: text ?? html?.replace(/<[^>]+>/g, '') ?? '',
      html: html ?? text ?? ''
    } as sgMail.MailDataRequired;

    try {
      await sgMail.send(payload);
      this.logger.log(`Email sent to ${to} (${subject})`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to send email to ${to}`, error instanceof Error ? error.stack : error);
      return { success: false, error };
    }
  }
}
