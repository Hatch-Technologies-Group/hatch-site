-- Lead generation framework: campaigns, landing pages, audiences, conversion exports.

-- CreateEnum
CREATE TYPE "LeadGenChannel" AS ENUM ('PAID_SOCIAL', 'PAID_SEARCH', 'SEO', 'OUTBOUND', 'DIRECT', 'OTHER');

CREATE TYPE "LeadGenObjective" AS ENUM ('LEADS', 'TRAFFIC', 'CONVERSIONS');

CREATE TYPE "LeadGenCampaignStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

CREATE TYPE "LeadGenLandingPageStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

CREATE TYPE "LeadGenAudienceStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

CREATE TYPE "LeadGenConversionEventType" AS ENUM (
    'LEAD_CREATED',
    'LEAD_CONTACTED',
    'LEAD_QUALIFIED',
    'APPOINTMENT_SET',
    'OPPORTUNITY_CREATED',
    'DEAL_UNDER_CONTRACT',
    'DEAL_CLOSED'
);

CREATE TYPE "LeadGenExportStatus" AS ENUM ('PENDING', 'EXPORTED', 'SKIPPED', 'FAILED');

-- CreateTable
CREATE TABLE "LeadGenCampaign" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tenantId" TEXT,
    "createdByUserId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "channel" "LeadGenChannel" NOT NULL DEFAULT 'OTHER',
    "objective" "LeadGenObjective" NOT NULL DEFAULT 'LEADS',
    "status" "LeadGenCampaignStatus" NOT NULL DEFAULT 'DRAFT',
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "startAt" TIMESTAMP(3),
    "endAt" TIMESTAMP(3),
    "dailyBudgetCents" INTEGER,
    "totalBudgetCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "targeting" JSONB,
    "creativeBrief" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadGenCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadGenCampaign_organizationId_slug_key" ON "LeadGenCampaign"("organizationId", "slug");

CREATE INDEX "LeadGenCampaign_organizationId_status_idx" ON "LeadGenCampaign"("organizationId", "status");

CREATE INDEX "LeadGenCampaign_tenantId_idx" ON "LeadGenCampaign"("tenantId");

-- AddForeignKey
ALTER TABLE "LeadGenCampaign" ADD CONSTRAINT "LeadGenCampaign_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadGenCampaign" ADD CONSTRAINT "LeadGenCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenCampaign" ADD CONSTRAINT "LeadGenCampaign_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeadGenCampaignSpendDaily" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadGenCampaignSpendDaily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadGenCampaignSpendDaily_campaignId_date_key" ON "LeadGenCampaignSpendDaily"("campaignId", "date");

CREATE INDEX "LeadGenCampaignSpendDaily_campaignId_date_idx" ON "LeadGenCampaignSpendDaily"("campaignId", "date");

-- AddForeignKey
ALTER TABLE "LeadGenCampaignSpendDaily" ADD CONSTRAINT "LeadGenCampaignSpendDaily_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadGenCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeadGenLandingPage" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tenantId" TEXT,
    "campaignId" TEXT,
    "listingId" TEXT,
    "createdByUserId" TEXT,
    "slug" TEXT NOT NULL,
    "status" "LeadGenLandingPageStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "description" TEXT,
    "seoTitle" TEXT,
    "seoDescription" TEXT,
    "layout" JSONB NOT NULL,
    "formSchema" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadGenLandingPage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadGenLandingPage_organizationId_slug_key" ON "LeadGenLandingPage"("organizationId", "slug");

CREATE INDEX "LeadGenLandingPage_organizationId_status_idx" ON "LeadGenLandingPage"("organizationId", "status");

CREATE INDEX "LeadGenLandingPage_tenantId_idx" ON "LeadGenLandingPage"("tenantId");

CREATE INDEX "LeadGenLandingPage_campaignId_idx" ON "LeadGenLandingPage"("campaignId");

CREATE INDEX "LeadGenLandingPage_listingId_idx" ON "LeadGenLandingPage"("listingId");

-- AddForeignKey
ALTER TABLE "LeadGenLandingPage" ADD CONSTRAINT "LeadGenLandingPage_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadGenLandingPage" ADD CONSTRAINT "LeadGenLandingPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenLandingPage" ADD CONSTRAINT "LeadGenLandingPage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadGenCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenLandingPage" ADD CONSTRAINT "LeadGenLandingPage_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenLandingPage" ADD CONSTRAINT "LeadGenLandingPage_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeadGenAudience" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "LeadGenAudienceStatus" NOT NULL DEFAULT 'DRAFT',
    "definition" JSONB NOT NULL,
    "lastComputedAt" TIMESTAMP(3),
    "lastCount" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadGenAudience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadGenAudience_tenantId_status_idx" ON "LeadGenAudience"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "LeadGenAudience" ADD CONSTRAINT "LeadGenAudience_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeadGenAudienceSnapshot" (
    "id" TEXT NOT NULL,
    "audienceId" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "exportFormat" TEXT NOT NULL DEFAULT 'csv',
    "storageKey" TEXT,
    "metadata" JSONB,

    CONSTRAINT "LeadGenAudienceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadGenAudienceSnapshot_audienceId_computedAt_idx" ON "LeadGenAudienceSnapshot"("audienceId", "computedAt");

-- AddForeignKey
ALTER TABLE "LeadGenAudienceSnapshot" ADD CONSTRAINT "LeadGenAudienceSnapshot_audienceId_fkey" FOREIGN KEY ("audienceId") REFERENCES "LeadGenAudience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeadGenExportBatch" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "campaignId" TEXT,
    "destination" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT,
    "from" TIMESTAMP(3),
    "to" TIMESTAMP(3),
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "storageKey" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadGenExportBatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadGenExportBatch_organizationId_createdAt_idx" ON "LeadGenExportBatch"("organizationId", "createdAt");

CREATE INDEX "LeadGenExportBatch_destination_status_idx" ON "LeadGenExportBatch"("destination", "status");

-- AddForeignKey
ALTER TABLE "LeadGenExportBatch" ADD CONSTRAINT "LeadGenExportBatch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadGenExportBatch" ADD CONSTRAINT "LeadGenExportBatch_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadGenCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenExportBatch" ADD CONSTRAINT "LeadGenExportBatch_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "LeadGenConversionEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "tenantId" TEXT,
    "personId" TEXT,
    "leadId" TEXT,
    "campaignId" TEXT,
    "landingPageId" TEXT,
    "exportBatchId" TEXT,
    "eventType" "LeadGenConversionEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "valueCents" INTEGER,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "attribution" JSONB,
    "exportStatus" "LeadGenExportStatus" NOT NULL DEFAULT 'PENDING',
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadGenConversionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeadGenConversionEvent_organizationId_eventType_occurredAt_idx" ON "LeadGenConversionEvent"("organizationId", "eventType", "occurredAt");

CREATE INDEX "LeadGenConversionEvent_tenantId_occurredAt_idx" ON "LeadGenConversionEvent"("tenantId", "occurredAt");

CREATE INDEX "LeadGenConversionEvent_personId_idx" ON "LeadGenConversionEvent"("personId");

CREATE INDEX "LeadGenConversionEvent_leadId_idx" ON "LeadGenConversionEvent"("leadId");

CREATE INDEX "LeadGenConversionEvent_campaignId_idx" ON "LeadGenConversionEvent"("campaignId");

CREATE INDEX "LeadGenConversionEvent_exportStatus_idx" ON "LeadGenConversionEvent"("exportStatus");

-- AddForeignKey
ALTER TABLE "LeadGenConversionEvent" ADD CONSTRAINT "LeadGenConversionEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeadGenConversionEvent" ADD CONSTRAINT "LeadGenConversionEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenConversionEvent" ADD CONSTRAINT "LeadGenConversionEvent_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenConversionEvent" ADD CONSTRAINT "LeadGenConversionEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenConversionEvent" ADD CONSTRAINT "LeadGenConversionEvent_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "LeadGenCampaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenConversionEvent" ADD CONSTRAINT "LeadGenConversionEvent_landingPageId_fkey" FOREIGN KEY ("landingPageId") REFERENCES "LeadGenLandingPage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadGenConversionEvent" ADD CONSTRAINT "LeadGenConversionEvent_exportBatchId_fkey" FOREIGN KEY ("exportBatchId") REFERENCES "LeadGenExportBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

