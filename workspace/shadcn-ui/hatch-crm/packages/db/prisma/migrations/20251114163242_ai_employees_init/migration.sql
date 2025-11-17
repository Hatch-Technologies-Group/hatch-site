-- CreateTable
CREATE TABLE "AiEmployeeTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "systemPrompt" TEXT NOT NULL,
    "allowedTools" JSONB NOT NULL,
    "defaultSettings" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiEmployeeTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEmployeeInstance" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "nameOverride" TEXT,
    "settings" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "autoMode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiEmployeeInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiEmployeeSession" (
    "id" TEXT NOT NULL,
    "employeeInstanceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "contextType" TEXT,
    "contextId" TEXT,
    "lastInteractionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiEmployeeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiProposedAction" (
    "id" TEXT NOT NULL,
    "employeeInstanceId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "actionType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "executedAt" TIMESTAMP(3),
    "approvedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProposedAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiExecutionLog" (
    "id" TEXT NOT NULL,
    "employeeInstanceId" TEXT NOT NULL,
    "sessionId" TEXT,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "proposedActionId" TEXT,
    "toolKey" TEXT,
    "input" JSONB NOT NULL,
    "output" JSONB,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "modelName" TEXT,
    "rawPromptTokens" INTEGER,
    "rawCompletionTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiEmployeeTemplate_key_key" ON "AiEmployeeTemplate"("key");

-- CreateIndex
CREATE INDEX "AiEmployeeInstance_tenantId_status_templateId_idx" ON "AiEmployeeInstance"("tenantId", "status", "templateId");

-- CreateIndex
CREATE INDEX "AiEmployeeInstance_tenantId_userId_idx" ON "AiEmployeeInstance"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AiEmployeeSession_employeeInstanceId_tenantId_userId_idx" ON "AiEmployeeSession"("employeeInstanceId", "tenantId", "userId");

-- CreateIndex
CREATE INDEX "AiEmployeeSession_tenantId_channel_contextType_contextId_idx" ON "AiEmployeeSession"("tenantId", "channel", "contextType", "contextId");

-- CreateIndex
CREATE INDEX "AiProposedAction_tenantId_status_requiresApproval_idx" ON "AiProposedAction"("tenantId", "status", "requiresApproval");

-- CreateIndex
CREATE INDEX "AiProposedAction_employeeInstanceId_status_idx" ON "AiProposedAction"("employeeInstanceId", "status");

-- CreateIndex
CREATE INDEX "AiExecutionLog_tenantId_success_idx" ON "AiExecutionLog"("tenantId", "success");

-- CreateIndex
CREATE INDEX "AiExecutionLog_employeeInstanceId_proposedActionId_idx" ON "AiExecutionLog"("employeeInstanceId", "proposedActionId");

-- CreateIndex
CREATE INDEX "AiExecutionLog_sessionId_idx" ON "AiExecutionLog"("sessionId");

-- AddForeignKey
ALTER TABLE "AiEmployeeInstance" ADD CONSTRAINT "AiEmployeeInstance_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "AiEmployeeTemplate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiEmployeeSession" ADD CONSTRAINT "AiEmployeeSession_employeeInstanceId_fkey" FOREIGN KEY ("employeeInstanceId") REFERENCES "AiEmployeeInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProposedAction" ADD CONSTRAINT "AiProposedAction_employeeInstanceId_fkey" FOREIGN KEY ("employeeInstanceId") REFERENCES "AiEmployeeInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiProposedAction" ADD CONSTRAINT "AiProposedAction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiEmployeeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiExecutionLog" ADD CONSTRAINT "AiExecutionLog_employeeInstanceId_fkey" FOREIGN KEY ("employeeInstanceId") REFERENCES "AiEmployeeInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiExecutionLog" ADD CONSTRAINT "AiExecutionLog_proposedActionId_fkey" FOREIGN KEY ("proposedActionId") REFERENCES "AiProposedAction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiExecutionLog" ADD CONSTRAINT "AiExecutionLog_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "AiEmployeeSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

