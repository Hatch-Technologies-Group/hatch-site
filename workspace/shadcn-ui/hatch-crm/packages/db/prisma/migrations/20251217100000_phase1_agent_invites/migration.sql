-- Phase 1: Broker Workspace & Agent Invites (additive)

-- 1) AgentInviteStatus enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'AgentInviteStatus'
  ) THEN
    CREATE TYPE "AgentInviteStatus" AS ENUM ('PENDING','ACCEPTED','EXPIRED','REVOKED');
  END IF;
END$$;

-- 2) AgentInvite table
CREATE TABLE IF NOT EXISTS "AgentInvite" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "status" "AgentInviteStatus" NOT NULL DEFAULT 'PENDING',
  "invitedByUserId" TEXT NOT NULL,
  "acceptedByUserId" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentInvite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentInvite_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 3) Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'AgentInvite_organizationId_idx'
  ) THEN
    CREATE INDEX "AgentInvite_organizationId_idx" ON "AgentInvite"("organizationId");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'AgentInvite_email_idx'
  ) THEN
    CREATE INDEX "AgentInvite_email_idx" ON "AgentInvite"("email");
  END IF;
END$$;

