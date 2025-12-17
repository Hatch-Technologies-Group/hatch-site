import { apiFetch } from '@/lib/api/hatch';

export type MarketingStudioEntitlements = {
  marketingStudio: boolean;
  whiteLabelMarketing: boolean;
};

export type MarketingStudioTemplateVariant = 'HATCH_BRANDED' | 'WHITE_LABEL';

export type MarketingStudioTemplate = {
  id: string;
  key?: string | null;
  organizationId?: string | null;
  name: string;
  description?: string | null;
  variant: MarketingStudioTemplateVariant;
  overlayS3Key?: string | null;
  overlayPageIndex?: number | null;
  overlayUrl?: string | null;
  schema: unknown;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MarketingStudioAsset = {
  id: string;
  organizationId: string;
  listingId: string;
  templateId: string;
  createdByUserId?: string | null;
  outputS3Key: string;
  metadata?: unknown;
  createdAt: string;
  template?: MarketingStudioTemplate;
  downloadUrl?: string;
  publicUrl?: string;
};

export type MarketingStudioListingImage = {
  s3Key: string;
  url: string;
};

export async function listMarketingStudioTemplates(orgId: string): Promise<{
  entitlements: MarketingStudioEntitlements;
  templates: MarketingStudioTemplate[];
}> {
  return apiFetch(`organizations/${orgId}/marketing-studio/templates`);
}

export async function seedMarketingStudioTemplates(orgId: string): Promise<{
  templates: MarketingStudioTemplate[];
}> {
  return apiFetch(`organizations/${orgId}/marketing-studio/templates/seed`, { method: 'POST' });
}

export async function presignMarketingStudioTemplateUpload(
  orgId: string,
  payload: { fileName: string; mimeType?: string }
): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  return apiFetch(`organizations/${orgId}/marketing-studio/templates/presign`, { method: 'POST', body: payload });
}

export async function createMarketingStudioTemplate(
  orgId: string,
  payload: {
    key?: string | null;
    name: string;
    description?: string | null;
    variant?: MarketingStudioTemplateVariant;
    overlayS3Key?: string | null;
    overlayPageIndex?: number | null;
    schema: unknown;
    isSystem?: boolean;
  }
): Promise<{ template: MarketingStudioTemplate }> {
  return apiFetch(`organizations/${orgId}/marketing-studio/templates`, { method: 'POST', body: payload });
}

export async function listMarketingStudioAssets(
  orgId: string,
  listingId: string
): Promise<{
  assets: MarketingStudioAsset[];
}> {
  return apiFetch(`organizations/${orgId}/marketing-studio/listings/${listingId}/assets`);
}

export async function listMarketingStudioListingImages(
  orgId: string,
  listingId: string
): Promise<{
  images: MarketingStudioListingImage[];
}> {
  return apiFetch(`organizations/${orgId}/marketing-studio/listings/${listingId}/images`);
}

export async function generateMarketingStudioAsset(
  orgId: string,
  listingId: string,
  payload: {
    templateId: string;
    text?: Record<string, string>;
    images?: Record<string, { url?: string; s3Key?: string }>;
  }
): Promise<{ asset: MarketingStudioAsset }> {
  return apiFetch(`organizations/${orgId}/marketing-studio/listings/${listingId}/assets`, {
    method: 'POST',
    body: payload
  });
}

