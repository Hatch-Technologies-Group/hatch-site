-- Create the core company/household structures that the CRM expansion expects.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT NOT NULL,
    "legalName" TEXT,
    "industry" TEXT,
    "type" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT,
    "size" TEXT,
    "primaryContactId" TEXT,
    "billingAddress" TEXT,
    "shippingAddress" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Household" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerId" TEXT,
    "name" TEXT,
    "timezone" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Person"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT;

ALTER TABLE "Person"
    ADD COLUMN IF NOT EXISTS "householdId" TEXT;

ALTER TABLE "Person"
    ADD COLUMN IF NOT EXISTS "householdRole" TEXT;

ALTER TABLE "Deal"
    ADD COLUMN IF NOT EXISTS "companyId" TEXT;

-- Indexes to keep queries snappy
CREATE INDEX IF NOT EXISTS "Company_tenantId_name_idx" ON "Company"("tenantId", "name");
CREATE INDEX IF NOT EXISTS "Company_tenantId_ownerId_idx" ON "Company"("tenantId", "ownerId");
CREATE INDEX IF NOT EXISTS "Company_tenantId_primaryContactId_idx" ON "Company"("tenantId", "primaryContactId");
CREATE INDEX IF NOT EXISTS "Person_tenantId_companyId_idx" ON "Person"("tenantId", "companyId");
CREATE INDEX IF NOT EXISTS "Person_tenantId_householdId_idx" ON "Person"("tenantId", "householdId");
CREATE INDEX IF NOT EXISTS "Deal_tenantId_companyId_idx" ON "Deal"("tenantId", "companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "Pipeline_tenantId_name_key" ON "Pipeline"("tenantId", "name");

-- Foreign keys
ALTER TABLE "Company"
    ADD CONSTRAINT "Company_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Company"
    ADD CONSTRAINT "Company_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Company"
    ADD CONSTRAINT "Company_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Company"
    ADD CONSTRAINT "Company_primaryContactId_fkey"
    FOREIGN KEY ("primaryContactId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Household"
    ADD CONSTRAINT "Household_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Household"
    ADD CONSTRAINT "Household_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Household"
    ADD CONSTRAINT "Household_ownerId_fkey"
    FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Person"
    ADD CONSTRAINT "Person_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Person"
    ADD CONSTRAINT "Person_householdId_fkey"
    FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Deal"
    ADD CONSTRAINT "Deal_companyId_fkey"
    FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
