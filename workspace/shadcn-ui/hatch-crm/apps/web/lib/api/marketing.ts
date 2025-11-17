import { apiFetch } from '@/lib/api';
import type {
  AiEmailDraft,
  AiEmailDraftRequest,
  CampaignFilter,
  CreateMarketingCampaignPayload,
  MarketingCampaign
} from '@/lib/marketing/types';

export async function listMarketingCampaigns(filter: CampaignFilter = 'all'): Promise<MarketingCampaign[]> {
  const params = new URLSearchParams();
  if (filter) {
    params.set('filter', filter);
  }
  const query = params.toString();
  const data = await apiFetch<{ campaigns: MarketingCampaign[] }>(
    query ? `marketing/campaigns?${query}` : 'marketing/campaigns'
  );
  return data.campaigns;
}

export async function createMarketingCampaign(
  payload: CreateMarketingCampaignPayload
): Promise<MarketingCampaign> {
  const data = await apiFetch<{ campaign: MarketingCampaign }>('marketing/campaigns', {
    method: 'POST',
    body: payload
  });
  return data.campaign;
}

export async function generateAiEmailDraft(payload: AiEmailDraftRequest): Promise<AiEmailDraft> {
  const data = await apiFetch<{ draft: AiEmailDraft }>('marketing/draft', {
    method: 'POST',
    body: payload
  });
  return data.draft;
}

export async function sendAiEmailPreview(payload: CreateMarketingCampaignPayload): Promise<MarketingCampaign> {
  return createMarketingCampaign(payload);
}
