import type { PersonaConfig } from './ai-personas.types';

export const PERSONAS: PersonaConfig[] = [
  {
    id: 'agent_copilot',
    name: 'Echo',
    shortName: 'Echo',
    color: '#1F5FFF',
    avatarBg: 'rgba(31,95,255,0.12)',
    avatarEmoji: '🧠',
    tagline: 'Daily briefings & next best actions',
    placeholder: 'Ask Echo to summarize your day, prioritize leads, or plan what to do next…',
    examples: ['Echo, help prioritize my leads', 'Echo, summarize my new leads today', 'Echo, which sellers need attention this week?'],
    specialty: 'High-level overview of your book of business, prioritization, and daily planning.'
  },
  {
    id: 'lead_nurse',
    name: 'Lumen',
    shortName: 'Lumen',
    color: '#00B894',
    avatarBg: 'rgba(0,184,148,0.12)',
    avatarEmoji: '✨',
    tagline: 'Warm outreach & follow-up nurturing',
    placeholder: 'Ask Lumen to write follow-ups, check-in texts, or nurture campaigns…',
    examples: ['Lumen, draft a warm follow-up', 'Lumen, write a check-in text', 'Lumen, create a nurturing sequence'],
    specialty: 'Nurturing sequences, relationship-driven communication, and outreach messages.'
  },
  {
    id: 'listing_concierge',
    name: 'Haven',
    shortName: 'Haven',
    color: '#9B5BFF',
    avatarBg: 'rgba(155,91,255,0.12)',
    avatarEmoji: '🏡',
    tagline: 'Listing descriptions & marketing copy',
    placeholder: 'Ask Haven to write listing descriptions or highlight key features…',
    examples: ['Haven, write a listing description', 'Haven, rewrite this to sound luxury', 'Haven, highlight features for social media'],
    specialty: 'Listing descriptions, marketing remarks, and property-focused copywriting.'
  },
  {
    id: 'market_analyst',
    name: 'Atlas',
    shortName: 'Atlas',
    color: '#FF9F43',
    avatarBg: 'rgba(255,159,67,0.12)',
    avatarEmoji: '📊',
    tagline: 'Local trends & pricing insight',
    placeholder: 'Ask Atlas about pricing, comps, or what’s happening in your market…',
    examples: ['Atlas, is this listing overpriced?', 'Atlas, summarize price trends', 'Atlas, give me seller talking points'],
    specialty: 'Explaining trends, comps, pricing context, and economic reasoning.'
  },
  {
    id: 'transaction_coordinator',
    name: 'Nova',
    shortName: 'Nova',
    color: '#F368E0',
    avatarBg: 'rgba(243,104,224,0.12)',
    avatarEmoji: '📑',
    tagline: 'Contract dates, milestones & checklists',
    placeholder: 'Ask Nova about key dates, contingencies, or deal steps…',
    examples: ['Nova, summarize the key dates for 123 Main St', 'Nova, what contingencies are open?', 'Nova, create a closing checklist'],
    specialty: 'Tracking contract dates, contingencies, and transaction milestones so nothing falls through the cracks.'
  }
];

export const ROUTER_SYSTEM_PROMPT = `
You are the routing brain for a team of AI coworkers.
Given a user message and their specialties, decide which persona should respond.

Return STRICT JSON:
{"targetPersonaId": "<id>", "reason": "<short explanation>"}.
`;

export const HANDOFF_TEMPLATE = (fromName: string, toName: string) =>
  `${fromName}: Sending this to ${toName} — they specialize in that.`;
