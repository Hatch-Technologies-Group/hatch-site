-- Create Enums
CREATE TYPE "PlaybookTriggerType" AS ENUM (
  'LEAD_CREATED',
  'LEAD_UPDATED',
  'LISTING_CREATED',
  'LISTING_UPDATED',
  'DOCUMENT_EVALUATED',
  'TRANSACTION_UPDATED',
  'RENTAL_UPDATED',
  'MLS_SYNC_COMPLETED',
  'ACCOUNTING_SYNC_FAILED',
  'AGENT_NONCOMPLIANT'
);

CREATE TYPE "PlaybookActionType" AS ENUM (
  'CREATE_TASK',
  'SEND_NOTIFICATION',
  'SEND_EMAIL',
  'ASSIGN_LEAD',
  'FLAG_ENTITY',
  'START_PLAYBOOK',
  'UPDATE_ENTITY_STATUS',
  'RUN_AI_PERSONA'
);

-- CreateTable Playbook
CREATE TABLE "Playbook" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "organizationId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable PlaybookTrigger
CREATE TABLE "PlaybookTrigger" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "playbookId" TEXT NOT NULL,
  "type" "PlaybookTriggerType" NOT NULL,
  "conditions" JSONB
);

-- CreateTable PlaybookAction
CREATE TABLE "PlaybookAction" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "playbookId" TEXT NOT NULL,
  "type" "PlaybookActionType" NOT NULL,
  "params" JSONB
);

-- CreateTable PlaybookRun
CREATE TABLE "PlaybookRun" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "playbookId" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "triggerType" "PlaybookTriggerType" NOT NULL,
  "actionSummary" TEXT,
  "success" BOOLEAN NOT NULL DEFAULT TRUE,
  "errorMessage" TEXT,
  "listingId" TEXT,
  "leadId" TEXT,
  "transactionId" TEXT,
  "leaseId" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3)
);

-- Relations
ALTER TABLE "Playbook" ADD CONSTRAINT "Playbook_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaybookTrigger" ADD CONSTRAINT "PlaybookTrigger_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaybookAction" ADD CONSTRAINT "PlaybookAction_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PlaybookRun" ADD CONSTRAINT "PlaybookRun_playbookId_fkey" FOREIGN KEY ("playbookId") REFERENCES "Playbook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Indexes
CREATE INDEX "Playbook_organizationId_enabled_idx" ON "Playbook"("organizationId", "enabled");
CREATE INDEX "PlaybookRun_organizationId_playbookId_startedAt_idx" ON "PlaybookRun"("organizationId", "playbookId", "startedAt");
CREATE INDEX "PlaybookRun_organizationId_listingId_idx" ON "PlaybookRun"("organizationId", "listingId");
CREATE INDEX "PlaybookRun_organizationId_leadId_idx" ON "PlaybookRun"("organizationId", "leadId");
CREATE INDEX "PlaybookRun_organizationId_transactionId_idx" ON "PlaybookRun"("organizationId", "transactionId");
CREATE INDEX "PlaybookRun_organizationId_leaseId_idx" ON "PlaybookRun"("organizationId", "leaseId");
