-- Add JOURNEY_STARTED event type
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'LeadHistoryEventType'
  ) THEN
    CREATE TYPE "LeadHistoryEventType" AS ENUM (
      'STAGE_MOVED',
      'OWNER_ASSIGNED',
      'OWNER_UNASSIGNED',
      'TOUCHPOINT_LOGGED',
      'NOTE_ADDED',
      'FILE_ATTACHED',
      'FIELD_UPDATED',
      'JOURNEY_STARTED'
    );
  END IF;
END
$$;

ALTER TYPE "LeadHistoryEventType" ADD VALUE IF NOT EXISTS 'JOURNEY_STARTED';

-- Extend JourneySimulation with tenant/lead metadata
ALTER TABLE "JourneySimulation"
  ADD COLUMN IF NOT EXISTS "tenantId" TEXT,
  ADD COLUMN IF NOT EXISTS "leadId" TEXT;

UPDATE "JourneySimulation" js
SET "tenantId" = j."tenantId",
    "leadId" = COALESCE(js."leadId", (js."input" ->> 'leadId'))
FROM "Journey" j
WHERE j."id" = js."journeyId";

ALTER TABLE "JourneySimulation"
  ALTER COLUMN "tenantId" SET NOT NULL,
  ALTER COLUMN "leadId" SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "JourneySimulation_tenant_lead_journey_key"
  ON "JourneySimulation" ("tenantId", "leadId", "journeyId");
