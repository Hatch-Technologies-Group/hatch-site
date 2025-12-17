-- Marketing studio templates/assets + org add-ons (white label marketing, marketing studio)

CREATE TYPE "MarketingStudioTemplateVariant" AS ENUM ('HATCH_BRANDED', 'WHITE_LABEL');

CREATE TABLE "OrganizationAddon" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationAddon_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrganizationAddon_organizationId_key_key" ON "OrganizationAddon"("organizationId", "key");
CREATE INDEX "OrganizationAddon_organizationId_idx" ON "OrganizationAddon"("organizationId");

ALTER TABLE "OrganizationAddon" ADD CONSTRAINT "OrganizationAddon_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "MarketingStudioTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT,
    "organizationId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "variant" "MarketingStudioTemplateVariant" NOT NULL DEFAULT 'HATCH_BRANDED',
    "overlayS3Key" TEXT,
    "overlayPageIndex" INTEGER NOT NULL DEFAULT 0,
    "schema" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingStudioTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MarketingStudioTemplate_key_key" ON "MarketingStudioTemplate"("key");
CREATE INDEX "MarketingStudioTemplate_organizationId_idx" ON "MarketingStudioTemplate"("organizationId");
CREATE INDEX "MarketingStudioTemplate_variant_idx" ON "MarketingStudioTemplate"("variant");

ALTER TABLE "MarketingStudioTemplate" ADD CONSTRAINT "MarketingStudioTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "MarketingStudioAsset" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "createdByUserId" TEXT,
    "outputS3Key" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketingStudioAsset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketingStudioAsset_organizationId_listingId_createdAt_idx" ON "MarketingStudioAsset"("organizationId", "listingId", "createdAt");
CREATE INDEX "MarketingStudioAsset_listingId_idx" ON "MarketingStudioAsset"("listingId");
CREATE INDEX "MarketingStudioAsset_templateId_idx" ON "MarketingStudioAsset"("templateId");

ALTER TABLE "MarketingStudioAsset" ADD CONSTRAINT "MarketingStudioAsset_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingStudioAsset" ADD CONSTRAINT "MarketingStudioAsset_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingStudioAsset" ADD CONSTRAINT "MarketingStudioAsset_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "MarketingStudioTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketingStudioAsset" ADD CONSTRAINT "MarketingStudioAsset_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

