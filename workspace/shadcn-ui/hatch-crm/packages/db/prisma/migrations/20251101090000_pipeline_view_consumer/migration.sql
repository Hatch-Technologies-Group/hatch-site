-- Create new enum for pipeline status when not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PipelineStatus') THEN
    CREATE TYPE "PipelineStatus" AS ENUM ('draft', 'active', 'archived');
  END IF;
END
$$;

-- Pipeline extensions for versioning and rollout
ALTER TABLE "Pipeline"
  ADD COLUMN IF NOT EXISTS "brokerageId" TEXT,
  ADD COLUMN IF NOT EXISTS "familyId" TEXT,
  ADD COLUMN IF NOT EXISTS "useCase" TEXT,
  ADD COLUMN IF NOT EXISTS "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "status" "PipelineStatus" NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "publishedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "archivedAt" TIMESTAMP(3);

-- Seed new structural fields for existing pipelines
UPDATE "Pipeline"
SET "familyId" = COALESCE("familyId", "id");

UPDATE "Pipeline"
SET "status" = 'active'
WHERE "status" = 'draft';

UPDATE "Pipeline"
SET "brokerageId" = COALESCE("brokerageId", "tenantId");

WITH ranked AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (PARTITION BY "tenantId" ORDER BY "order", "createdAt") AS rn
  FROM "Pipeline"
)
UPDATE "Pipeline" p
SET "isDefault" = TRUE
FROM ranked r
WHERE p."id" = r."id" AND r.rn = 1;

ALTER TABLE "Pipeline"
  ALTER COLUMN "familyId" SET NOT NULL;

-- Replace unique/index definitions for pipelines
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = current_schema AND indexname = 'Pipeline_tenantId_name_key') THEN
    DROP INDEX "Pipeline_tenantId_name_key";
  END IF;
EXCEPTION
  WHEN undefined_table THEN NULL;
END
$$;

CREATE UNIQUE INDEX IF NOT EXISTS "Pipeline_tenantId_familyId_version_key"
  ON "Pipeline" ("tenantId", "familyId", "version");

CREATE INDEX IF NOT EXISTS "Pipeline_tenantId_isDefault_idx"
  ON "Pipeline" ("tenantId", "isDefault");

-- Stage enhancements
ALTER TABLE "Stage"
  ADD COLUMN IF NOT EXISTS "probWin" INTEGER,
  ADD COLUMN IF NOT EXISTS "slaHours" INTEGER,
  ADD COLUMN IF NOT EXISTS "exitReasons" JSONB;

CREATE INDEX IF NOT EXISTS "Stage_tenantId_pipelineId_order_idx"
  ON "Stage" ("tenantId", "pipelineId", "order");

-- Field sets
CREATE TABLE IF NOT EXISTS "FieldSet" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "target" TEXT NOT NULL,
  "schema" JSONB NOT NULL,
  "uiSchema" JSONB,
  "visibility" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FieldSet_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FieldSet_tenantId_idx" ON "FieldSet" ("tenantId");
CREATE INDEX IF NOT EXISTS "FieldSet_tenantId_pipelineId_idx" ON "FieldSet" ("tenantId", "pipelineId");

ALTER TABLE "FieldSet"
  ADD CONSTRAINT "FieldSet_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "FieldSet_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Pipeline automations
CREATE TABLE IF NOT EXISTS "PipelineAutomation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "pipelineId" TEXT NOT NULL,
  "name" TEXT,
  "trigger" JSONB NOT NULL,
  "actions" JSONB NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PipelineAutomation_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PipelineAutomation_tenantId_idx" ON "PipelineAutomation" ("tenantId");
CREATE INDEX IF NOT EXISTS "PipelineAutomation_tenantId_pipelineId_idx" ON "PipelineAutomation" ("tenantId", "pipelineId");
CREATE INDEX IF NOT EXISTS "PipelineAutomation_tenantId_isEnabled_idx" ON "PipelineAutomation" ("tenantId", "isEnabled");

ALTER TABLE "PipelineAutomation"
  ADD CONSTRAINT "PipelineAutomation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "PipelineAutomation_pipelineId_fkey" FOREIGN KEY ("pipelineId") REFERENCES "Pipeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- View presets
CREATE TABLE IF NOT EXISTS "ViewPreset" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "brokerageId" TEXT,
  "name" TEXT NOT NULL,
  "scope" TEXT NOT NULL,
  "layout" JSONB NOT NULL,
  "filters" JSONB,
  "sort" JSONB,
  "roles" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ViewPreset_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ViewPreset_tenantId_idx" ON "ViewPreset" ("tenantId");
CREATE INDEX IF NOT EXISTS "ViewPreset_tenantId_scope_idx" ON "ViewPreset" ("tenantId", "scope");
CREATE INDEX IF NOT EXISTS "ViewPreset_tenantId_isDefault_idx" ON "ViewPreset" ("tenantId", "isDefault");

ALTER TABLE "ViewPreset"
  ADD CONSTRAINT "ViewPreset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Share tokens for presets
CREATE TABLE IF NOT EXISTS "ViewPresetShareToken" (
  "id" TEXT NOT NULL,
  "viewPresetId" TEXT NOT NULL,
  "token" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ViewPresetShareToken_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ViewPresetShareToken_token_key" UNIQUE ("token")
);

CREATE INDEX IF NOT EXISTS "ViewPresetShareToken_viewPresetId_idx"
  ON "ViewPresetShareToken" ("viewPresetId");

ALTER TABLE "ViewPresetShareToken"
  ADD CONSTRAINT "ViewPresetShareToken_viewPresetId_fkey" FOREIGN KEY ("viewPresetId") REFERENCES "ViewPreset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Consumer portal configuration
CREATE TABLE IF NOT EXISTS "ConsumerPortalConfig" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "brokerageId" TEXT,
  "modules" JSONB NOT NULL,
  "fields" JSONB,
  "viewPresetId" TEXT,
  "permissions" JSONB,
  "branding" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ConsumerPortalConfig_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ConsumerPortalConfig"
  ADD CONSTRAINT "ConsumerPortalConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "ConsumerPortalConfig_viewPresetId_fkey" FOREIGN KEY ("viewPresetId") REFERENCES "ViewPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "ConsumerPortalConfig_tenantId_key"
  ON "ConsumerPortalConfig" ("tenantId");

CREATE INDEX IF NOT EXISTS "ConsumerPortalConfig_tenantId_viewPresetId_idx"
  ON "ConsumerPortalConfig" ("tenantId", "viewPresetId");
