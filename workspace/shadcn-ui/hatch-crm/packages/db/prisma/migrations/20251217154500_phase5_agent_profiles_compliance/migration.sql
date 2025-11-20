-- Phase 5: Agent Profiles, Compliance, Training (additive)

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'AgentRiskLevel') THEN
    CREATE TYPE "AgentRiskLevel" AS ENUM ('LOW','MEDIUM','HIGH');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'AgentMembershipType') THEN
    CREATE TYPE "AgentMembershipType" AS ENUM ('MLS','BOARD','NAR','OTHER');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'AgentMembershipStatus') THEN
    CREATE TYPE "AgentMembershipStatus" AS ENUM ('ACTIVE','PENDING','EXPIRED','SUSPENDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type t WHERE t.typname = 'AgentTrainingStatus') THEN
    CREATE TYPE "AgentTrainingStatus" AS ENUM ('NOT_STARTED','IN_PROGRESS','COMPLETED');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS "AgentProfile" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "licenseNumber" TEXT,
  "licenseState" TEXT,
  "licenseExpiresAt" TIMESTAMP(3),
  "isCommercial" BOOLEAN NOT NULL DEFAULT FALSE,
  "isResidential" BOOLEAN NOT NULL DEFAULT TRUE,
  "title" TEXT,
  "bio" TEXT,
  "tags" TEXT,
  "metadata" JSONB,
  "isCompliant" BOOLEAN NOT NULL DEFAULT TRUE,
  "requiresAction" BOOLEAN NOT NULL DEFAULT FALSE,
  "riskLevel" "AgentRiskLevel" NOT NULL DEFAULT 'LOW',
  "riskScore" INTEGER NOT NULL DEFAULT 0,
  "riskFlags" JSONB,
  "ceCycleStartAt" TIMESTAMP(3),
  "ceCycleEndAt" TIMESTAMP(3),
  "ceHoursRequired" INTEGER,
  "ceHoursCompleted" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentProfile_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentProfile_org_user_uq" ON "AgentProfile"("organizationId","userId");
CREATE INDEX IF NOT EXISTS "AgentProfile_org_idx" ON "AgentProfile"("organizationId");

CREATE TABLE IF NOT EXISTS "AgentMembership" (
  "id" TEXT PRIMARY KEY,
  "agentProfileId" TEXT NOT NULL,
  "type" "AgentMembershipType" NOT NULL,
  "name" TEXT NOT NULL,
  "externalId" TEXT,
  "status" "AgentMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
  "startedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentMembership_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AgentMembership_profile_type_idx" ON "AgentMembership"("agentProfileId","type");

CREATE TABLE IF NOT EXISTS "AgentCERecord" (
  "id" TEXT PRIMARY KEY,
  "agentProfileId" TEXT NOT NULL,
  "provider" TEXT,
  "courseName" TEXT NOT NULL,
  "hours" INTEGER NOT NULL,
  "completedAt" TIMESTAMP(3) NOT NULL,
  "certificateUrl" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentCERecord_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AgentTrainingModule" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "orgFileId" TEXT,
  "externalUrl" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentTrainingModule_orgId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentTrainingModule_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AgentTrainingModule_orgFileId_fkey" FOREIGN KEY ("orgFileId") REFERENCES "OrgFile"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AgentTrainingProgress" (
  "id" TEXT PRIMARY KEY,
  "agentProfileId" TEXT NOT NULL,
  "moduleId" TEXT NOT NULL,
  "status" "AgentTrainingStatus" NOT NULL DEFAULT 'NOT_STARTED',
  "score" INTEGER,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentTrainingProgress_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentTrainingProgress_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "AgentTrainingModule"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "AgentTrainingProgress_profile_module_uq" ON "AgentTrainingProgress"("agentProfileId","moduleId");

