import { apiFetch } from '@/lib/api/hatch';

export type DripStep = {
  id: string;
  campaignId: string;
  offsetHours: number;
  actionType: string;
  payload?: Record<string, unknown> | null;
  createdAt: string;
};

export type DripCampaign = {
  id: string;
  organizationId: string;
  name: string;
  description?: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  steps: DripStep[];
};

export async function listDripCampaigns(orgId: string): Promise<DripCampaign[]> {
  return apiFetch<DripCampaign[]>(`organizations/${orgId}/drip-campaigns`);
}

export async function createDripCampaign(orgId: string, input: { name: string; description?: string }): Promise<DripCampaign> {
  return apiFetch<DripCampaign>(`organizations/${orgId}/drip-campaigns`, {
    method: 'POST',
    body: JSON.stringify(input)
  });
}

export async function addDripStep(
  orgId: string,
  campaignId: string,
  step: { offsetHours: number; actionType: string; payload?: Record<string, unknown> | null }
): Promise<DripStep> {
  return apiFetch<DripStep>(`organizations/${orgId}/drip-campaigns/${campaignId}/steps`, {
    method: 'POST',
    body: JSON.stringify(step)
  });
}

export async function getLatestDripStepForLead(orgId: string, leadId: string): Promise<{ nextStep?: DripStep | null }> {
  return apiFetch<{ nextStep?: DripStep | null }>(`organizations/${orgId}/drip-campaigns/leads/${leadId}/next-step`);
}
