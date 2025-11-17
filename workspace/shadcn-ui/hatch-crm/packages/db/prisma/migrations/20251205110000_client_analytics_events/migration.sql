CREATE TABLE "ClientAnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "properties" JSONB,
    "sourceIp" TEXT,
    "userAgent" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ClientAnalyticsEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientAnalyticsEvent_tenantId_occurredAt_idx" ON "ClientAnalyticsEvent"("tenantId", "occurredAt");

CREATE INDEX "ClientAnalyticsEvent_tenantId_name_idx" ON "ClientAnalyticsEvent"("tenantId", "name");

ALTER TABLE "ClientAnalyticsEvent"
  ADD CONSTRAINT "ClientAnalyticsEvent_tenantId_fkey"
  FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
