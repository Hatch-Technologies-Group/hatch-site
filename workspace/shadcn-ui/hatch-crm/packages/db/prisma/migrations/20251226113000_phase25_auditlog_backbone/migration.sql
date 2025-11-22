-- Phase 25: Audit Logging Backbone

CREATE TYPE "AuditActionType" AS ENUM (
  'LOGIN',
  'LOGOUT',
  'ROLE_CHANGED',
  'MLS_SYNC_TRIGGERED',
  'ACCOUNTING_SYNC_TRIGGERED',
  'NOTIFICATION_PREFS_UPDATED',
  'AI_PERSONA_RUN',
  'AI_PERSONA_CONFIG_CHANGED',
  'ONBOARDING_STATE_CHANGED',
  'OFFBOARDING_STATE_CHANGED',
  'COMPLIANCE_STATUS_CHANGED',
  'OTHER'
);

CREATE TABLE "OrgAuditLog" (
  "id" TEXT PRIMARY KEY,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "actionType" "AuditActionType" NOT NULL DEFAULT 'OTHER',
  "summary" TEXT NOT NULL,
  "metadata" JSONB,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgAuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "OrgAuditLog_org_created_idx" ON "OrgAuditLog" ("organizationId", "createdAt");
CREATE INDEX "OrgAuditLog_org_user_created_idx" ON "OrgAuditLog" ("organizationId", "userId", "createdAt");
