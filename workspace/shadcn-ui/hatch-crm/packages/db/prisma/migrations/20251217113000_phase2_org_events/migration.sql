-- Phase 2: Org Events (additive)

-- 1) Enum OrgEventType
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'OrgEventType'
  ) THEN
    CREATE TYPE "OrgEventType" AS ENUM (
      'ORG_CREATED',
      'BROKER_CREATED_ORG',
      'AGENT_INVITE_CREATED',
      'AGENT_INVITE_ACCEPTED'
    );
  END IF;
END$$;

-- 2) Table OrgEvent
CREATE TABLE IF NOT EXISTS "OrgEvent" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "tenantId" TEXT,
  "actorId" TEXT,
  "type" "OrgEventType" NOT NULL,
  "message" TEXT,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 3) Indexes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'OrgEvent_org_created_idx'
  ) THEN
    CREATE INDEX "OrgEvent_org_created_idx" ON "OrgEvent"("organizationId", "createdAt");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'OrgEvent_actor_created_idx'
  ) THEN
    CREATE INDEX "OrgEvent_actor_created_idx" ON "OrgEvent"("actorId", "createdAt");
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'OrgEvent_type_org_idx'
  ) THEN
    CREATE INDEX "OrgEvent_type_org_idx" ON "OrgEvent"("type", "organizationId");
  END IF;
END$$;

