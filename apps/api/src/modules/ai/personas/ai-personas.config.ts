import type { PersonaConfig } from './ai-personas.types';

export const PERSONAS: PersonaConfig[] = [
  {
    id: 'agent_copilot',
    name: 'Agent Copilot',
    shortName: 'Agent Copilot',
    color: '#1F5FFF',
    icon: 'sparkles',
    tagline: 'Daily briefings & next best actions',
    placeholder: 'Ask Agent Copilot to summarize new leads, prioritize tasks, or plan your day…',
    examples: ['Summarize my new leads today', 'Who should I call first this afternoon?', 'What tasks are overdue this week?'],
    specialty: 'High-level overview of your book of business, prioritization, and daily planning.'
  },
  {
    id: 'lead_nurse',
    name: 'Lead Nurse',
    shortName: 'Lead Nurse',
    color: '#00B894',
    icon: 'heart',
    tagline: 'Nurture & follow-up outreach',
    placeholder: 'Ask Lead Nurse to draft nurturing emails, check-in texts, or follow-up plans…',
    examples: ['Draft a warm follow-up email', 'Write a check-in text for a buyer', 'Create a 3-email nurture sequence'],
    specialty: 'Nurturing sequences, relationship-driven communication, and outreach messages.'
  },
  {
    id: 'listing_concierge',
    name: 'Listing Concierge',
    shortName: 'Listing Concierge',
    color: '#9B5BFF',
    icon: 'home',
    tagline: 'Listing descriptions & marketing',
    placeholder: 'Ask Listing Concierge to draft MLS descriptions, feature highlights, or captions…',
    examples: [
      'Create a listing description for a 3/2 pool home',
      'Highlight features for social media',
      'Rewrite this listing to sound more luxury'
    ],
    specialty: 'Listing descriptions, marketing remarks, and property-focused copywriting.'
  },
  {
    id: 'market_analyst',
    name: 'Market Analyst',
    shortName: 'Market Analyst',
    color: '#FF9F43',
    icon: 'chart',
    tagline: 'Local trends & pricing insight',
    placeholder: 'Ask Market Analyst about pricing, comps, or market trends in your area…',
    examples: ['Summarize recent price trends', 'Is this listing overpriced?', 'Give seller talking points for today’s market'],
    specialty: 'Explaining trends, comps, pricing context, and economic reasoning.'
  },
  {
    id: 'transaction_coordinator',
    name: 'Transaction Coordinator',
    shortName: 'Transaction Coordinator',
    color: '#F368E0',
    icon: 'sparkles',
    tagline: 'Contract dates, milestones & checklists',
    placeholder: 'Ask Transaction Coordinator about key dates, contingencies, and next steps for a deal…',
    examples: [
      'Summarize the key dates for this transaction',
      'What contingencies are still open on 123 Main St?',
      'Create a checklist for getting this deal to close'
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
