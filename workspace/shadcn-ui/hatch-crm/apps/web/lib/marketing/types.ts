export type PersonaId =
  | 'agent_copilot'
  | 'lead_nurse'
  | 'listing_concierge'
  | 'market_analyst'
  | 'transaction_coordinator';

export type AudienceSegmentKey = 'all_hot_leads' | 'past_clients' | 'open_house_invites' | 'all_leads';

export type MarketingCampaignStatus = 'draft' | 'scheduled' | 'sent' | 'failed';

export type CampaignFilter = 'all' | 'draft' | 'scheduled' | 'sent';

export type MarketingChannel = 'EMAIL' | 'SMS';

export type MarketingCampaign = {
  id: string;
  tenantId?: string;
  name: string;
  personaId: PersonaId;
  subject: string;
  body?: string;
  channel: MarketingChannel;
  audienceKey?: string | null;
  audienceLabel?: string | null;
  callToAction?: string | null;
  createdAt: string;
  sentAt?: string | null;
  scheduledAt?: string | null;
  updatedAt?: string;
  status: MarketingCampaignStatus;
  recipientsCount: number;
};

export type AiEmailDraftRequest = {
  personaId: PersonaId;
  audience?: string;
  callToAction?: string;
  subject?: string;
  brief?: string;
};

export type AiEmailDraft = {
  personaId: PersonaId;
  subject: string;
  body: string;
};

export type CreateMarketingCampaignPayload = {
  personaId: PersonaId;
  subject: string;
  body: string;
  name?: string;
  audienceKey?: string;
  audienceLabel?: string;
  callToAction?: string;
  recipientsCount?: number;
  status?: MarketingCampaignStatus;
  channel?: MarketingChannel;
};
