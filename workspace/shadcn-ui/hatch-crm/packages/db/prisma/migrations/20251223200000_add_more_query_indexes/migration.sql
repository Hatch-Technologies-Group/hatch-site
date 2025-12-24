-- CreateIndex
CREATE INDEX "OrgTransaction_organizationId_createdAt_idx" ON "OrgTransaction"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "AgentProfile_organizationId_updatedAt_idx" ON "AgentProfile"("organizationId", "updatedAt");

-- CreateIndex
CREATE INDEX "OfferIntent_organizationId_createdAt_idx" ON "OfferIntent"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "OfferIntent_organizationId_status_createdAt_idx" ON "OfferIntent"("organizationId", "status", "createdAt");

