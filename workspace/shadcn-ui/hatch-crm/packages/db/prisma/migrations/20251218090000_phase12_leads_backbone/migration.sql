-- Phase 12: Leads & consumer funnel backbone

CREATE TYPE "LeadStatus" AS ENUM ('NEW','CONTACTED','QUALIFIED','UNQUALIFIED','APPOINTMENT_SET','UNDER_CONTRACT','CLOSED');
CREATE TYPE "LeadSource" AS ENUM ('PORTAL_SIGNUP','LISTING_INQUIRY','LOI_SUBMISSION','MANUAL','OTHER');

ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_LEAD_CREATED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_LEAD_STATUS_CHANGED';

CREATE TABLE "Lead" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "consumerId" TEXT,
  "listingId" TEXT,
  "agentProfileId" TEXT,
  "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
  "source" "LeadSource" NOT NULL DEFAULT 'PORTAL_SIGNUP',
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "message" TEXT,
  "desiredMoveIn" TIMESTAMP(3),
  "budgetMin" INTEGER,
  "budgetMax" INTEGER,
  "bedrooms" INTEGER,
  "bathrooms" DOUBLE PRECISION,
  "createdByUserId" TEXT,
  "conversationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Lead_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Lead_consumer_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lead_listing_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lead_agentProfile_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "Lead_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Lead_org_status_idx" ON "Lead"("organizationId","status");
CREATE INDEX IF NOT EXISTS "Lead_org_agent_idx" ON "Lead"("organizationId","agentProfileId");
