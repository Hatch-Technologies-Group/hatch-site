-- CreateIndex
CREATE INDEX "AgentWorkflowTask_organizationId_agentProfileId_type_status_idx" ON "AgentWorkflowTask"("organizationId", "agentProfileId", "type", "status");
