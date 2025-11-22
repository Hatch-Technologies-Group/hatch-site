-- Phase 28: Offices, Teams, Delegated Access

CREATE TABLE "Office" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "city" TEXT,
  "state" TEXT,
  "region" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Office_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "User"
  ADD COLUMN "officeId" TEXT,
  ADD COLUMN "teamId" TEXT,
  ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "User_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrgListing"
  ADD COLUMN "officeId" TEXT,
  ADD CONSTRAINT "OrgListing_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Lead"
  ADD COLUMN "officeId" TEXT,
  ADD CONSTRAINT "Lead_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "RentalLease"
  ADD COLUMN "officeId" TEXT,
  ADD CONSTRAINT "RentalLease_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OrgTransaction"
  ADD COLUMN "officeId" TEXT,
  ADD CONSTRAINT "OrgTransaction_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentProfile"
  ADD COLUMN "officeId" TEXT,
  ADD COLUMN "teamId" TEXT,
  ADD CONSTRAINT "AgentProfile_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "AgentProfile_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Team"
  ADD COLUMN "officeId" TEXT,
  ADD COLUMN "description" TEXT,
  ADD CONSTRAINT "Team_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "DelegatedAccess" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "agentId" TEXT NOT NULL,
  "assistantId" TEXT NOT NULL,
  "canManageListings" BOOLEAN NOT NULL DEFAULT true,
  "canManageLeads" BOOLEAN NOT NULL DEFAULT true,
  "canManageTransactions" BOOLEAN NOT NULL DEFAULT true,
  "canManageRentals" BOOLEAN NOT NULL DEFAULT true,
  "canManageTasks" BOOLEAN NOT NULL DEFAULT true,
  "canViewFinancials" BOOLEAN NOT NULL DEFAULT false,
  "canChangeCompliance" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DelegatedAccess_org_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DelegatedAccess_agent_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "DelegatedAccess_assistant_fkey" FOREIGN KEY ("assistantId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DelegatedAccess_org_agent_idx" ON "DelegatedAccess" ("organizationId", "agentId");
CREATE INDEX "DelegatedAccess_org_assistant_idx" ON "DelegatedAccess" ("organizationId", "assistantId");
