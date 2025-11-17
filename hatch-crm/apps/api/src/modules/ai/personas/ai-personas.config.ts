import type { PersonaConfig } from './ai-personas.types';

export const PERSONAS: PersonaConfig[] = [
  {
    id: 'agent_copilot',
    name: 'Echo',
    shortName: 'Echo',
    color: '#1F5FFF',
    icon: 'sparkles',
    tagline: 'Daily briefings & next best actions',
    placeholder: 'Ask Echo to summarize your day, prioritize leads, or plan what to do next…',
    examples: [
      'Echo, what should I focus on this afternoon?',
      'Echo, summarize my new leads today',
      'Echo, which sellers need attention this week?'
    ],
    specialty: 'High-level overview of your book of business, prioritization, and daily planning.'
  },
  {
    id: 'lead_nurse',
    name: 'Lumen',
    shortName: 'Lumen',
    color: '#00B894',
    icon: 'heart',
    tagline: 'Warm outreach & follow-up nurturing',
    placeholder: 'Ask Lumen to write follow-ups, check-in texts, or nurture campaigns…',
    examples: [
      'Lumen, draft a warm follow-up for a lead that went cold',
      'Lumen, write a check-in text after a showing',
      'Lumen, create a 3-email nurture sequence'
    ],
    specialty: 'Nurturing sequences, relationship-driven communication, and outreach messages.'
  },
  {
    id: 'listing_concierge',
    name: 'Haven',
    shortName: 'Haven',
    color: '#9B5BFF',
    icon: 'home',
    tagline: 'Listing descriptions & marketing copy',
    placeholder: 'Ask Haven to write listing descriptions or highlight key property features…',
    examples: [
      'Haven, write a listing description for a 3/2 pool home',
      'Haven, highlight features for social media',
      'Haven, rewrite this listing to sound more luxury'
    ],
    specialty: 'Listing descriptions, marketing remarks, and property-focused copywriting.'
  },
  {
    id: 'market_analyst',
    name: 'Atlas',
    shortName: 'Atlas',
    color: '#FF9F43',
    icon: 'chart',
    tagline: 'Local trends & pricing insight',
    placeholder: 'Ask Atlas about pricing, comps, and what’s happening in your market…',
    examples: ['Atlas, is this listing overpriced?', 'Atlas, summarize price trends in this ZIP', 'Atlas, give me seller talking points for today’s market'],
    specialty: 'Explaining trends, comps, pricing context, and economic reasoning.'
  },
  {
    id: 'transaction_coordinator',
    name: 'Nova',
    shortName: 'Nova',
    color: '#F368E0',
    icon: 'sparkles',
    tagline: 'Contract dates, milestones & checklists',
    placeholder: 'Ask Nova about key dates, contingencies, and next steps for a deal…',
    examples: [
      'Nova, summarize key dates for 123 Main St',
      'Nova, what contingencies are still open?',
      'Nova, create a checklist for getting this deal to close'
    ],
    specialty: 'Tracking contract dates, contingencies, and transaction milestones so nothing falls through the cracks.'
  }
];

export const ROUTER_SYSTEM_PROMPT = `
You are a routing assistant for a real estate AI team.
Your job: Identify which persona should handle the user's message.

Return ONLY JSON:
{"targetPersonaId": "<id>", "reason": "<short explanation>"}.
`;

export const HANDOFF_TEMPLATE = (fromName: string, toName: string) =>
  `${fromName}: That task belongs to ${toName}. Routing now…`;
