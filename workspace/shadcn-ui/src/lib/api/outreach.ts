import { apiFetch } from './hatch';

type OutreachSequence = { id: string; name: string };

export async function listSequences() {
  return apiFetch<OutreachSequence[]>('outreach/sequences');
}

export async function enrollLeadInSequence(leadId: string, sequenceId: string) {
  return apiFetch<{ ok: boolean }>('outreach/enroll', {
    method: 'POST',
    body: JSON.stringify({ leadId, sequenceId })
  });
}

export async function draftNextForLead(leadId: string) {
  return apiFetch<{ subject?: string }>('outreach/draft-next', {
    method: 'POST',
    body: JSON.stringify({ leadId })
  });
}
