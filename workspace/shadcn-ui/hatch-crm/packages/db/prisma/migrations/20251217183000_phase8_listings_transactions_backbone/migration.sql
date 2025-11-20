-- Phase 8: Listings & Transactions backbone

CREATE TYPE "OrgListingStatus" AS ENUM ('DRAFT','PENDING_BROKER_APPROVAL','ACTIVE','PENDING','CLOSED','WITHDRAWN','EXPIRED');
CREATE TYPE "OrgTransactionStatus" AS ENUM ('PRE_CONTRACT','UNDER_CONTRACT','CONTINGENT','CLOSED','CANCELLED');
CREATE TYPE "OrgListingDocumentType" AS ENUM ('LISTING_AGREEMENT','DISCLOSURE','PHOTOS','OTHER');
CREATE TYPE "OrgTransactionDocumentType" AS ENUM ('EXECUTED_CONTRACT','ADDENDUM','INSPECTION_REPORT','APPRAISAL','CLOSING_DISCLOSURE','OTHER');

CREATE TABLE "OrgListing" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "agentProfileId" TEXT,
  "mlsNumber" TEXT,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "country" TEXT,
  "listPrice" INTEGER,
  "propertyType" TEXT,
  "bedrooms" INTEGER,
  "bathrooms" DOUBLE PRECISION,
  "squareFeet" INTEGER,
  "status" "OrgListingStatus" NOT NULL DEFAULT 'DRAFT',
  "brokerApproved" BOOLEAN NOT NULL DEFAULT FALSE,
  "brokerApprovedAt" TIMESTAMP(3),
  "brokerApprovedByUserId" TEXT,
  "listedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "withdrawnAt" TIMESTAMP(3),
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgListing_orgId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgListing_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OrgListing_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrgListing_brokerApprovedBy_fkey" FOREIGN KEY ("brokerApprovedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "OrgListing_mlsNumber_key" ON "OrgListing"("mlsNumber");
CREATE INDEX IF NOT EXISTS "OrgListing_org_idx" ON "OrgListing"("organizationId");

CREATE TABLE "OrgListingDocument" (
  "id" TEXT PRIMARY KEY,
  "listingId" TEXT NOT NULL,
  "orgFileId" TEXT NOT NULL,
  "type" "OrgListingDocumentType" NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgListingDocument_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgListingDocument_orgFileId_fkey" FOREIGN KEY ("orgFileId") REFERENCES "OrgFile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrgListingDocument_listing_idx" ON "OrgListingDocument"("listingId");

CREATE TABLE "OrgTransaction" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "listingId" TEXT,
  "agentProfileId" TEXT,
  "status" "OrgTransactionStatus" NOT NULL DEFAULT 'PRE_CONTRACT',
  "contractSignedAt" TIMESTAMP(3),
  "inspectionDate" TIMESTAMP(3),
  "financingDate" TIMESTAMP(3),
  "closingDate" TIMESTAMP(3),
  "buyerName" TEXT,
  "sellerName" TEXT,
  "isCompliant" BOOLEAN NOT NULL DEFAULT TRUE,
  "requiresAction" BOOLEAN NOT NULL DEFAULT FALSE,
  "complianceNotes" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgTransaction_orgId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgTransaction_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OrgTransaction_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OrgTransaction_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrgTransaction_org_idx" ON "OrgTransaction"("organizationId");

CREATE TABLE "OrgTransactionDocument" (
  "id" TEXT PRIMARY KEY,
  "transactionId" TEXT NOT NULL,
  "orgFileId" TEXT NOT NULL,
  "type" "OrgTransactionDocumentType" NOT NULL DEFAULT 'OTHER',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgTransactionDocument_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "OrgTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgTransactionDocument_orgFileId_fkey" FOREIGN KEY ("orgFileId") REFERENCES "OrgFile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrgTransactionDocument_transaction_idx" ON "OrgTransactionDocument"("transactionId");

