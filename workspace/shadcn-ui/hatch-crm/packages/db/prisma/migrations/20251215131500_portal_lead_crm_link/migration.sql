-- AlterTable
ALTER TABLE "Lead" ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "personId" TEXT,
ADD COLUMN     "metadata" JSONB;

-- CreateIndex
CREATE INDEX "Lead_organizationId_tenantId_idx" ON "Lead"("organizationId", "tenantId");

-- CreateIndex
CREATE INDEX "Lead_organizationId_personId_idx" ON "Lead"("organizationId", "personId");

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;

