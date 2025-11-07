'use client';

type AutoContactPurpose = 'intro' | 'tour' | 'price_drop' | 'checkin';

export async function autoContactDraft(
  contactId: string,
  purpose: AutoContactPurpose = 'checkin',
  context?: Record<string, unknown>
): Promise<string | undefined> {
  const response = await fetch(`/api/contacts/${contactId}/activity/auto-contact`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ purpose, context })
  });

  if (!response.ok) {
    throw new Error(`Failed to generate auto-contact draft (${response.status})`);
  }

  const payload = await response.json();
  const draft = payload?.draft;

  if (typeof draft === 'string') {
    return draft;
  }
  if (draft && typeof draft === 'object' && typeof draft.text === 'string') {
    return draft.text;
  }

  return undefined;
}
