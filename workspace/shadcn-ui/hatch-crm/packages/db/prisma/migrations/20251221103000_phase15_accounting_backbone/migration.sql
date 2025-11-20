-- Phase 15: Accounting Backbone & QuickBooks Integration

-- Enums
CREATE TYPE "AccountingProvider" AS ENUM ('QUICKBOOKS');
CREATE TYPE "AccountingSyncStatus" AS ENUM ('PENDING', 'SYNCED', 'FAILED');

ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_ACCOUNTING_CONNECTED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_ACCOUNTING_TRANSACTION_SYNCED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_ACCOUNTING_RENTAL_SYNCED';

-- Tables
CREATE TABLE "AccountingIntegrationConfig" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL UNIQUE,
  "provider" "AccountingProvider" NOT NULL DEFAULT 'QUICKBOOKS',
  "realmId" TEXT,
  "connectedAt" TIMESTAMP(3),
  "lastSyncAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AccountingIntegrationConfig_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "TransactionAccountingRecord" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "transactionId" TEXT NOT NULL UNIQUE,
  "provider" "AccountingProvider" NOT NULL DEFAULT 'QUICKBOOKS',
  "externalId" TEXT,
  "syncStatus" "AccountingSyncStatus" NOT NULL DEFAULT 'PENDING',
  "lastSyncAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TransactionAccountingRecord_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TransactionAccountingRecord_transaction_fkey" FOREIGN KEY ("transactionId") REFERENCES "OrgTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "TransactionAccountingRecord_org_provider_status_idx"
  ON "TransactionAccountingRecord"("organizationId", "provider", "syncStatus");

CREATE TABLE "RentalLeaseAccountingRecord" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "leaseId" TEXT NOT NULL UNIQUE,
  "provider" "AccountingProvider" NOT NULL DEFAULT 'QUICKBOOKS',
  "externalId" TEXT,
  "syncStatus" "AccountingSyncStatus" NOT NULL DEFAULT 'PENDING',
  "lastSyncAt" TIMESTAMP(3),
  "errorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalLeaseAccountingRecord_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RentalLeaseAccountingRecord_lease_fkey" FOREIGN KEY ("leaseId") REFERENCES "RentalLease"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RentalLeaseAccountingRecord_org_provider_status_idx"
  ON "RentalLeaseAccountingRecord"("organizationId", "provider", "syncStatus");
