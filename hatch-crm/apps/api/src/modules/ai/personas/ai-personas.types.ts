export type PersonaId =
  | 'agent_copilot'
  | 'lead_nurse'
  | 'listing_concierge'
  | 'market_analyst'
  | 'transaction_coordinator';

export type PersonaConfig = {
  id: PersonaId;
  name: string;
  shortName: string;
  color: string;
  icon: 'sparkles' | 'heart' | 'home' | 'chart';
  tagline: string;
  placeholder: string;
  examples: string[];
  specialty: string;
};

export type PersonaChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export type PersonaChatResponse = {
  activePersonaId: PersonaId;
  reason?: string | null;
  messages: PersonaChatMessage[];
};
