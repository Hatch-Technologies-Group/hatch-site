-- Agent portal config (broker-controlled navigation for agents)
CREATE TABLE "AgentPortalConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "allowedPaths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "landingPath" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPortalConfig_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentPortalConfig_organizationId_key" ON "AgentPortalConfig"("organizationId");
CREATE INDEX "AgentPortalConfig_organizationId_idx" ON "AgentPortalConfig"("organizationId");

ALTER TABLE "AgentPortalConfig" ADD CONSTRAINT "AgentPortalConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

