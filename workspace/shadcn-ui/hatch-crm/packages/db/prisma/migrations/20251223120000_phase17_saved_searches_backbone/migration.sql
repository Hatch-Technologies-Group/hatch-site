-- Phase 17: Saved Listings & Searches backbone

CREATE TYPE "SavedSearchFrequency" AS ENUM ('INSTANT', 'DAILY', 'WEEKLY');

CREATE TABLE "SavedListing" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "consumerId" TEXT NOT NULL,
  "searchIndexId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedListing_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedListing_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedListing_searchIndexId_fkey" FOREIGN KEY ("searchIndexId") REFERENCES "ListingSearchIndex"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedListing_consumerId_searchIndexId_key" UNIQUE ("consumerId", "searchIndexId")
);

CREATE INDEX "SavedListing_org_consumer_idx" ON "SavedListing"("organizationId", "consumerId");

CREATE TABLE "SavedSearch" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "consumerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "criteria" JSONB NOT NULL,
  "alertsEnabled" BOOLEAN NOT NULL DEFAULT true,
  "frequency" "SavedSearchFrequency" NOT NULL DEFAULT 'INSTANT',
  "lastRunAt" TIMESTAMP(3),
  "lastNotifiedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedSearch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "SavedSearch_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SavedSearch_org_consumer_idx" ON "SavedSearch"("organizationId", "consumerId");

CREATE TABLE "SavedSearchAlertEvent" (
  "id" TEXT PRIMARY KEY,
  "savedSearchId" TEXT NOT NULL,
  "matchCount" INTEGER NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "channel" TEXT NOT NULL DEFAULT 'email',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavedSearchAlertEvent_savedSearchId_fkey" FOREIGN KEY ("savedSearchId") REFERENCES "SavedSearch"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SavedSearchAlertEvent_savedSearchId_sentAt_idx" ON "SavedSearchAlertEvent"("savedSearchId", "sentAt");
