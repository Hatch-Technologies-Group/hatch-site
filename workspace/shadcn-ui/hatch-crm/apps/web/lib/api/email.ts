import { apiFetch } from '@/lib/api/api';
import type { AudienceSegmentKey, MarketingCampaign, PersonaId } from '@/lib/marketing/types';

export type SendEmailRequest = {
  to?: string | string[];
  subject: string;
  html?: string;
  text?: string;
  personaId?: PersonaId;
  segmentKey?: AudienceSegmentKey;
};

export type SendEmailResponse = {
  success: boolean;
  campaign?: MarketingCampaign;
};

export async function sendEmail(payload: SendEmailRequest): Promise<SendEmailResponse> {
  return apiFetch<SendEmailResponse>('email/send', {
    method: 'POST',
    body: payload
  });
}
