-- Phase 3: Org File Vault (additive)

-- 1) OrgFileCategory enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t WHERE t.typname = 'OrgFileCategory'
  ) THEN
    CREATE TYPE "OrgFileCategory" AS ENUM ('CONTRACT_TEMPLATE','COMPLIANCE','TRAINING','MARKETING','RENTAL_PM','OTHER');
  END IF;
END$$;

-- 2) OrgFolder table
CREATE TABLE IF NOT EXISTS "OrgFolder" (
  "id" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "tenantId" TEXT,
  "name" TEXT NOT NULL,
  "parentId" TEXT,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgFolder_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "OrgFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OrgFolder_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrgFolder_org_parent_idx" ON "OrgFolder"("orgId", "parentId");

-- 3) OrgFile table
CREATE TABLE IF NOT EXISTS "OrgFile" (
  "id" TEXT PRIMARY KEY,
  "orgId" TEXT NOT NULL,
  "tenantId" TEXT,
  "folderId" TEXT,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" "OrgFileCategory" NOT NULL DEFAULT 'OTHER',
  "fileId" TEXT NOT NULL,
  "uploadedByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrgFile_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OrgFile_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "OrgFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "OrgFile_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "FileObject"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "OrgFile_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "OrgFile_org_folder_idx" ON "OrgFile"("orgId", "folderId");
CREATE INDEX IF NOT EXISTS "OrgFile_org_category_idx" ON "OrgFile"("orgId", "category");

