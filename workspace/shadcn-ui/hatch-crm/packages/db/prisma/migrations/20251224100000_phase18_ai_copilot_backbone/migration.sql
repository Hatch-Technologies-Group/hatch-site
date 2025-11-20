-- Phase 18: AI Copilot insights & actions

CREATE TYPE "AiCopilotInsightType" AS ENUM ('DAILY_BRIEFING', 'LEAD_FOLLOWUP_SUMMARY', 'PIPELINE_OVERVIEW');
CREATE TYPE "AiCopilotActionStatus" AS ENUM ('SUGGESTED', 'ACCEPTED', 'DISMISSED', 'COMPLETED');

CREATE TABLE "AiCopilotInsight" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "agentProfileId" TEXT NOT NULL,
  "type" "AiCopilotInsightType" NOT NULL DEFAULT 'DAILY_BRIEFING',
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiCopilotInsight_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiCopilotInsight_agentProfile_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "AiCopilotInsight_org_agent_type_created_idx"
  ON "AiCopilotInsight"("organizationId", "agentProfileId", "type", "createdAt");

CREATE TABLE "AiCopilotActionRecommendation" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "agentProfileId" TEXT NOT NULL,
  "leadId" TEXT,
  "orgListingId" TEXT,
  "orgTransactionId" TEXT,
  "leaseId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "status" "AiCopilotActionStatus" NOT NULL DEFAULT 'SUGGESTED',
  "priority" INTEGER,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  CONSTRAINT "AiCopilotActionRecommendation_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiCopilotActionRecommendation_agent_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AiCopilotActionRecommendation_lead_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiCopilotActionRecommendation_listing_fkey" FOREIGN KEY ("orgListingId") REFERENCES "OrgListing"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiCopilotActionRecommendation_transaction_fkey" FOREIGN KEY ("orgTransactionId") REFERENCES "OrgTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiCopilotActionRecommendation_lease_fkey" FOREIGN KEY ("leaseId") REFERENCES "RentalLease"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AiCopilotActionRecommendation_completedBy_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AiCopilotActionRecommendation_org_agent_status_idx"
  ON "AiCopilotActionRecommendation"("organizationId", "agentProfileId", "status");
CREATE INDEX "AiCopilotActionRecommendation_lead_idx" ON "AiCopilotActionRecommendation"("leadId");
CREATE INDEX "AiCopilotActionRecommendation_listing_idx" ON "AiCopilotActionRecommendation"("orgListingId");
CREATE INDEX "AiCopilotActionRecommendation_transaction_idx" ON "AiCopilotActionRecommendation"("orgTransactionId");
CREATE INDEX "AiCopilotActionRecommendation_lease_idx" ON "AiCopilotActionRecommendation"("leaseId");
