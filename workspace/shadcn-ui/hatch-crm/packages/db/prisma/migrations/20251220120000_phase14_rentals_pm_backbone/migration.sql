-- Phase 14: Rentals & Property Management Backbone

-- Enums
CREATE TYPE "RentalPropertyType" AS ENUM ('SINGLE_FAMILY', 'CONDO', 'MULTI_FAMILY', 'COMMERCIAL', 'OTHER');
CREATE TYPE "RentalTenancyType" AS ENUM ('SEASONAL', 'ANNUAL', 'MONTH_TO_MONTH', 'OTHER');
CREATE TYPE "RentalStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_MGMT', 'OFF_MGMT');
CREATE TYPE "RentalUnitStatus" AS ENUM ('VACANT', 'OCCUPIED', 'RESERVED');
CREATE TYPE "RentalTaxStatus" AS ENUM ('PENDING', 'PAID', 'OVERDUE');

ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_RENTAL_PROPERTY_CREATED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ORG_RENTAL_LEASE_CREATED';

-- Tables
CREATE TABLE "RentalProperty" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "listingId" TEXT,
  "addressLine1" TEXT NOT NULL,
  "addressLine2" TEXT,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "country" TEXT,
  "propertyType" "RentalPropertyType" NOT NULL DEFAULT 'SINGLE_FAMILY',
  "status" "RentalStatus" NOT NULL DEFAULT 'UNDER_MGMT',
  "ownerName" TEXT,
  "ownerContact" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalProperty_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RentalProperty_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "RentalProperty_org_status_idx" ON "RentalProperty"("organizationId", "status");

CREATE TABLE "RentalUnit" (
  "id" TEXT PRIMARY KEY,
  "propertyId" TEXT NOT NULL,
  "name" TEXT,
  "bedrooms" INTEGER,
  "bathrooms" DOUBLE PRECISION,
  "squareFeet" INTEGER,
  "status" "RentalUnitStatus" NOT NULL DEFAULT 'VACANT',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalUnit_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "RentalProperty"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RentalUnit_property_status_idx" ON "RentalUnit"("propertyId", "status");

CREATE TABLE "RentalLease" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "unitId" TEXT NOT NULL,
  "tenancyType" "RentalTenancyType" NOT NULL DEFAULT 'SEASONAL',
  "tenantName" TEXT NOT NULL,
  "tenantContact" TEXT,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3) NOT NULL,
  "rentAmount" INTEGER,
  "transactionId" TEXT,
  "requiresTaxFiling" BOOLEAN NOT NULL DEFAULT false,
  "isCompliant" BOOLEAN NOT NULL DEFAULT true,
  "complianceNotes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalLease_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RentalLease_unit_fkey" FOREIGN KEY ("unitId") REFERENCES "RentalUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RentalLease_transaction_fkey" FOREIGN KEY ("transactionId") REFERENCES "OrgTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "RentalLease_org_unit_idx" ON "RentalLease"("organizationId", "unitId");

CREATE TABLE "RentalTaxSchedule" (
  "id" TEXT PRIMARY KEY,
  "leaseId" TEXT NOT NULL,
  "periodLabel" TEXT NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "amountDue" INTEGER,
  "status" "RentalTaxStatus" NOT NULL DEFAULT 'PENDING',
  "paidDate" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RentalTaxSchedule_lease_fkey" FOREIGN KEY ("leaseId") REFERENCES "RentalLease"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "RentalTaxSchedule_lease_status_due_idx" ON "RentalTaxSchedule"("leaseId", "status", "dueDate");
