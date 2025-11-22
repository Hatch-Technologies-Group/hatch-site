-- Enum for document review status
CREATE TYPE "DocumentReviewStatus" AS ENUM ('NONE', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED');

-- Alter OrgFile
ALTER TABLE "OrgFile" ADD COLUMN "reviewStatus" "DocumentReviewStatus" NOT NULL DEFAULT 'NONE';

-- OrgFileVersion
CREATE TABLE "OrgFileVersion" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "orgFileId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT,
    CONSTRAINT "OrgFileVersion_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrgFileVersion" ADD CONSTRAINT "OrgFileVersion_orgFileId_fkey" FOREIGN KEY ("orgFileId") REFERENCES "OrgFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgFileVersion" ADD CONSTRAINT "OrgFileVersion_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE UNIQUE INDEX "OrgFileVersion_orgFileId_versionNumber_key" ON "OrgFileVersion"("orgFileId", "versionNumber");

-- OrgFileComment
CREATE TABLE "OrgFileComment" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "orgFileId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrgFileComment_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "OrgFileComment" ADD CONSTRAINT "OrgFileComment_orgFileId_fkey" FOREIGN KEY ("orgFileId") REFERENCES "OrgFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgFileComment" ADD CONSTRAINT "OrgFileComment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrgFileComment" ADD CONSTRAINT "OrgFileComment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "OrgFileComment_orgFileId_idx" ON "OrgFileComment"("orgFileId");
