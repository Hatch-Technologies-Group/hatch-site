CREATE TABLE IF NOT EXISTS "LeadScoreV2" (
  "leadId"    text PRIMARY KEY,
  "tenantId"  text NOT NULL,
  "score"     double precision NOT NULL,
  "factors"   jsonb NOT NULL,
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "LeadScoreV2_tenantId_idx"
  ON "LeadScoreV2"("tenantId");
