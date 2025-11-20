-- Phase 16: MLS Integration & Search Backbone

CREATE TYPE "MlsProvider" AS ENUM ('STELLAR', 'NABOR', 'MATRIX', 'GENERIC');

CREATE TABLE "MlsFeedConfig" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "provider" "MlsProvider" NOT NULL DEFAULT 'GENERIC',
  "officeCode" TEXT,
  "brokerId" TEXT,
  "boardName" TEXT,
  "boardUrl" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "lastFullSyncAt" TIMESTAMP(3),
  "lastIncrementalSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MlsFeedConfig_organizationId_key" UNIQUE ("organizationId"),
  CONSTRAINT "MlsFeedConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "ListingSearchIndex" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "listingId" TEXT,
  "mlsNumber" TEXT,
  "mlsProvider" "MlsProvider",
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "country" TEXT,
  "propertyType" TEXT,
  "listPrice" INTEGER,
  "bedrooms" INTEGER,
  "bathrooms" DOUBLE PRECISION,
  "squareFeet" INTEGER,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isRental" BOOLEAN NOT NULL DEFAULT false,
  "searchText" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ListingSearchIndex_organizationId_mlsNumber_key" UNIQUE ("organizationId", "mlsNumber"),
  CONSTRAINT "ListingSearchIndex_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ListingSearchIndex_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ListingSearchIndex_org_active_idx" ON "ListingSearchIndex"("organizationId", "isActive");
CREATE INDEX "ListingSearchIndex_org_city_idx" ON "ListingSearchIndex"("organizationId", "city");
CREATE INDEX "ListingSearchIndex_org_state_idx" ON "ListingSearchIndex"("organizationId", "state");
CREATE INDEX "ListingSearchIndex_org_postal_idx" ON "ListingSearchIndex"("organizationId", "postalCode");
