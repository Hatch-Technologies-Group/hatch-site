-- Phase 0: Identity & Multi-Tenant Foundation (additive only)
-- 1) Extend UserRole enum
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'UserRole' AND e.enumlabel = 'CONSUMER'
  ) THEN
    ALTER TYPE "UserRole" ADD VALUE 'CONSUMER';
  END IF;
END$$;

-- 2) Add optional password hash to users
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;

-- 3) Add slug and createdByUserId to organizations
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "createdByUserId" TEXT;

-- 3a) Unique slug (nulls allowed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'Organization_slug_key'
  ) THEN
    ALTER TABLE "Organization" ADD CONSTRAINT "Organization_slug_key" UNIQUE ("slug");
  END IF;
END$$;

-- 3b) Foreign key to creator user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_name='Organization' AND constraint_name='Organization_createdByUserId_fkey'
  ) THEN
    ALTER TABLE "Organization"
      ADD CONSTRAINT "Organization_createdByUserId_fkey"
      FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;

