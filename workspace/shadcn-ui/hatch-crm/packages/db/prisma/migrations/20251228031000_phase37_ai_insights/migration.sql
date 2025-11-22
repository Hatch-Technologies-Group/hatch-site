-- Enum for insights
CREATE TYPE "InsightType" AS ENUM (
  'BROKER',
  'TEAM',
  'AGENT',
  'LISTING',
  'TRANSACTION',
  'LEAD',
  'RENTAL',
  'COMPLIANCE',
  'RISK',
  'PRODUCTIVITY'
);

-- AiInsight table
CREATE TABLE "AiInsight" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "type" "InsightType" NOT NULL,
  "targetId" TEXT,
  "summary" TEXT NOT NULL,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiInsight_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AiInsight"
  ADD CONSTRAINT "AiInsight_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AiInsight_organizationId_type_idx" ON "AiInsight"("organizationId", "type");
CREATE INDEX "AiInsight_organizationId_targetId_idx" ON "AiInsight"("organizationId", "targetId");
