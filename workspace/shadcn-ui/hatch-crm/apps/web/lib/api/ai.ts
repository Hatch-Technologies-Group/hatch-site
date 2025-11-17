import { apiFetch } from '@/lib/api/api';
import type { AudienceSegmentKey, PersonaId } from '@/lib/marketing/types';

export type AiEmailDraftRequest = {
  personaId: PersonaId;
  contextType: 'segment' | 'singleLead';
  segmentKey?: AudienceSegmentKey;
  leadId?: string;
  prompt?: string;
};

export type AiEmailDraftResponse = {
  subject: string;
  html: string;
};

export async function requestAiEmailDraft(
  payload: AiEmailDraftRequest
): Promise<AiEmailDraftResponse> {
  return apiFetch<AiEmailDraftResponse>('ai/email-draft', {
    method: 'POST',
    body: payload
  });
}

export type { AudienceSegmentKey } from '@/lib/marketing/types';
