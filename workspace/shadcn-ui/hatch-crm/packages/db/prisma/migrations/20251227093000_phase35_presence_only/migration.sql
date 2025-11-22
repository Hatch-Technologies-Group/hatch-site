-- CreateTable
CREATE TABLE "LivePresence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivePresence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LivePresence_organizationId_userId_key" ON "LivePresence"("organizationId", "userId");
CREATE INDEX "LivePresence_organizationId_userId_idx" ON "LivePresence"("organizationId", "userId");
CREATE INDEX "LivePresence_organizationId_location_idx" ON "LivePresence"("organizationId", "location");
