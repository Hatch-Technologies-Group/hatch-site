-- Create AgentPerformanceSnapshot
CREATE TABLE "AgentPerformanceSnapshot" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" TEXT NOT NULL,
    "agentProfileId" TEXT NOT NULL,
    "leadsWorked" INTEGER NOT NULL DEFAULT 0,
    "leadsConverted" INTEGER NOT NULL DEFAULT 0,
    "avgResponseTimeSec" INTEGER NOT NULL DEFAULT 0,
    "tasksCompleted" INTEGER NOT NULL DEFAULT 0,
    "tasksOverdue" INTEGER NOT NULL DEFAULT 0,
    "documentsIssues" INTEGER NOT NULL DEFAULT 0,
    "compliantDocs" INTEGER NOT NULL DEFAULT 0,
    "listingsActive" INTEGER NOT NULL DEFAULT 0,
    "transactionsActive" INTEGER NOT NULL DEFAULT 0,
    "activityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "performanceScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "responsivenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentPerformanceSnapshot_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "AgentPerformanceSnapshot" ADD CONSTRAINT "AgentPerformanceSnapshot_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AgentPerformanceSnapshot" ADD CONSTRAINT "AgentPerformanceSnapshot_agentProfileId_fkey" FOREIGN KEY ("agentProfileId") REFERENCES "AgentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AgentPerformanceSnapshot_org_agent_period_idx" ON "AgentPerformanceSnapshot"("organizationId", "agentProfileId", "periodStart");
