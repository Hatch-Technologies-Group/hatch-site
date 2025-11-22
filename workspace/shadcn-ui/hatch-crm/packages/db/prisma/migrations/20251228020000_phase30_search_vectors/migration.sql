-- Create table for search vectors (if not present)
CREATE TABLE IF NOT EXISTS "SearchVector" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "embedding" DOUBLE PRECISION[] NOT NULL,
  "content" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SearchVector_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SearchVector"
  ADD CONSTRAINT "SearchVector_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SearchVector_organizationId_entityType_idx" ON "SearchVector"("organizationId", "entityType");
CREATE UNIQUE INDEX IF NOT EXISTS "SearchVector_org_entity_unique" ON "SearchVector"("organizationId", "entityType", "entityId");
