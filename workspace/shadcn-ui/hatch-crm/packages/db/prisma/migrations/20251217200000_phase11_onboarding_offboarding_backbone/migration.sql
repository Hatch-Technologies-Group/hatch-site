-- Phase 11: Onboarding & Offboarding automation backbone

CREATE TYPE "AgentLifecycleStage" AS ENUM ('ONBOARDING','ACTIVE','OFFBOARDING');
CREATE TYPE "WorkflowType" AS ENUM ('ONBOARDING','OFFBOARDING');
CREATE TYPE "WorkflowTaskStatus" AS ENUM ('PENDING','IN_PROGRESS','COMPLETED','SKIPPED');
CREATE TYPE "WorkflowTaskTrigger" AS ENUM ('MANUAL','AGENT_INVITE_ACCEPTED','CE_INCOMPLETE','MEMBERSHIP_EXPIRED','AI_HIGH_RISK');

ALTER TABLE "AgentProfile" ADD COLUMN "lifecycleStage" "AgentLifecycleStage" NOT NULL DEFAULT 'ONBOARDING';

ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ONBOARDING_TEMPLATE_CREATED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ONBOARDING_TASK_GENERATED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'ONBOARDING_TASK_COMPLETED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'OFFBOARDING_TASK_GENERATED';
ALTER TYPE "OrgEventType" ADD VALUE IF NOT EXISTS 'OFFBOARDING_TASK_COMPLETED';

CREATE TABLE "OrgWorkflowTemplate" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "type" "WorkflowType" NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "isDefault" BOOLEAN NOT NULL DEFAULT FALSE,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgWorkflowTemplate_orgId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgWorkflowTemplate_createdBy_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrgWorkflowTemplate_org_type_idx" ON "OrgWorkflowTemplate"("organizationId","type");

CREATE TABLE "OrgWorkflowTemplateTask" (
  "id" TEXT PRIMARY KEY,
  "templateId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assignedToRole" TEXT,
  "trainingModuleId" TEXT,
  "orgFileId" TEXT,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgWorkflowTemplateTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OrgWorkflowTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgWorkflowTemplateTask_trainingModuleId_fkey" FOREIGN KEY ("trainingModuleId") REFERENCES "AgentTrainingModule"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OrgWorkflowTemplateTask_orgFileId_fkey" FOREIGN KEY ("orgFileId") REFERENCES "OrgFile"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "OrgWorkflowTemplateTask_template_idx" ON "OrgWorkflowTemplateTask"("templateId");

CREATE TABLE "AgentWorkflowTask" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "agentProfileId" TEXT NOT NULL,
  "templateId" TEXT,
  "templateTaskId" TEXT,
  "type" "WorkflowType" NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "assignedToRole" TEXT,
  "status" "WorkflowTaskStatus" NOT NULL DEFAULT 'PENDING',
  "trigger" "WorkflowTaskTrigger" NOT NULL DEFAULT 'MANUAL',
  "triggerSource" TEXT,
  "listingId" TEXT,
  "transactionId" TEXT,
  "dueAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "completedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AgentWorkflowTask_orgId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentWorkflowTask_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AgentWorkflowTask_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "OrgWorkflowTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AgentWorkflowTask_templateTaskId_fkey" FOREIGN KEY ("templateTaskId") REFERENCES "OrgWorkflowTemplateTask"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AgentWorkflowTask_completedBy_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AgentWorkflowTask_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "OrgListing"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "AgentWorkflowTask_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "OrgTransaction"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "AgentWorkflowTask_org_agent_type_idx" ON "AgentWorkflowTask"("organizationId","agentProfileId","type");
