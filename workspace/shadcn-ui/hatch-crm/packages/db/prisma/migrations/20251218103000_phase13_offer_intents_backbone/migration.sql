-- Phase 13: Offer of Intent backbone

CREATE TYPE "OfferIntentStatus" AS ENUM ('DRAFT','SUBMITTED','UNDER_REVIEW','ACCEPTED','DECLINED','WITHDRAWN');

ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_OFFER_INTENT_CREATED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_OFFER_INTENT_STATUS_CHANGED';

CREATE TABLE "OfferIntent" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "leadId" TEXT,
  "consumerId" TEXT,
  "status" "OfferIntentStatus" NOT NULL DEFAULT 'DRAFT',
  "offeredPrice" INTEGER,
  "financingType" TEXT,
  "closingTimeline" TEXT,
  "contingencies" TEXT,
  "comments" TEXT,
  "transactionId" TEXT,
  "conversationId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfferIntent_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfferIntent_listing_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OfferIntent_lead_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OfferIntent_consumer_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OfferIntent_transaction_fkey" FOREIGN KEY ("transactionId") REFERENCES "OrgTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OfferIntent_conversation_fkey" FOREIGN KEY ("conversationId") REFERENCES "OrgConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OfferIntent_org_listing_idx" ON "OfferIntent"("organizationId","listingId");
CREATE INDEX IF NOT EXISTS "OfferIntent_org_consumer_idx" ON "OfferIntent"("organizationId","consumerId");
