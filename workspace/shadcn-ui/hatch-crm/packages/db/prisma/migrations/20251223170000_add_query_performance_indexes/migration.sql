-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_organizationId_role_idx" ON "User"("organizationId", "role");

-- CreateIndex
CREATE INDEX "User_tenantId_role_idx" ON "User"("tenantId", "role");

-- CreateIndex
CREATE INDEX "OrgListing_organizationId_agentProfileId_idx" ON "OrgListing"("organizationId", "agentProfileId");

-- CreateIndex
CREATE INDEX "OrgListing_organizationId_officeId_idx" ON "OrgListing"("organizationId", "officeId");

-- CreateIndex
CREATE INDEX "OrgTransaction_organizationId_agentProfileId_idx" ON "OrgTransaction"("organizationId", "agentProfileId");

-- CreateIndex
CREATE INDEX "OrgTransaction_organizationId_officeId_idx" ON "OrgTransaction"("organizationId", "officeId");

-- CreateIndex
CREATE INDEX "AgentProfile_organizationId_officeId_idx" ON "AgentProfile"("organizationId", "officeId");

-- CreateIndex
CREATE INDEX "AgentProfile_organizationId_teamId_idx" ON "AgentProfile"("organizationId", "teamId");

-- CreateIndex
CREATE INDEX "TransactionAccountingRecord_organizationId_syncStatus_idx" ON "TransactionAccountingRecord"("organizationId", "syncStatus");

-- CreateIndex
CREATE INDEX "RentalLeaseAccountingRecord_organizationId_syncStatus_idx" ON "RentalLeaseAccountingRecord"("organizationId", "syncStatus");

-- CreateIndex
CREATE INDEX "Person_tenantId_deletedAt_stageEnteredAt_createdAt_idx" ON "Person"("tenantId", "deletedAt", "stageEnteredAt", "createdAt");

-- CreateIndex
CREATE INDEX "person_pipeline_stage_timeline_idx" ON "Person"("tenantId", "pipelineId", "stageId", "deletedAt", "stageEnteredAt", "createdAt");

-- CreateIndex
CREATE INDEX "Person_organizationId_deletedAt_stageId_stage_idx" ON "Person"("organizationId", "deletedAt", "stageId", "stage");

-- CreateIndex
CREATE INDEX "Person_organizationId_deletedAt_stageId_leadType_idx" ON "Person"("organizationId", "deletedAt", "stageId", "leadType");

-- CreateIndex
CREATE INDEX "Person_organizationId_ownerId_deletedAt_stage_idx" ON "Person"("organizationId", "ownerId", "deletedAt", "stage");

-- CreateIndex
CREATE INDEX "Person_organizationId_ownerId_deletedAt_leadType_idx" ON "Person"("organizationId", "ownerId", "deletedAt", "leadType");

-- CreateIndex
CREATE INDEX "Pipeline_brokerageId_idx" ON "Pipeline"("brokerageId");
