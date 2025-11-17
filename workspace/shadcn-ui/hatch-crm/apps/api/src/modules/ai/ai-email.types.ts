export const AUDIENCE_SEGMENTS = {
  all_hot_leads: {
    label: 'All hot leads',
    description: 'Leads showing recent activity or high intent.',
    guidance:
      'Remind them why now is a good moment to move and offer a direct way to talk or tour.'
  },
  past_clients: {
    label: 'Past clients',
    description: 'Clients who closed in the last 24 months.',
    guidance: 'Share a helpful market update and reopen the relationship with a light-touch CTA.'
  },
  open_house_invites: {
    label: 'Open house invites',
    description: 'People within driving distance of the featured property.',
    guidance: 'Highlight the property’s key hooks, date/time, and how to RSVP or book a tour.'
  },
  all_leads: {
    label: 'All leads',
    description: 'Entire CRM across stages — use sparingly.',
    guidance: 'Keep it broadly valuable and segment-friendly; avoid over-promising.'
  }
} as const;

export type AudienceSegmentKey = keyof typeof AUDIENCE_SEGMENTS;

export const AUDIENCE_SEGMENT_KEYS = Object.keys(AUDIENCE_SEGMENTS) as AudienceSegmentKey[];
