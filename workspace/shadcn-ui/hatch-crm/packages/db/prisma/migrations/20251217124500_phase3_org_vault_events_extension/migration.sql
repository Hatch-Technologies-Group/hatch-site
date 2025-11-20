-- Phase 3: Extend OrgEventType with vault events
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'OrgEventType' AND e.enumlabel = 'ORG_FOLDER_CREATED'
  ) THEN
    ALTER TYPE "OrgEventType" ADD VALUE 'ORG_FOLDER_CREATED';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'OrgEventType' AND e.enumlabel = 'ORG_FILE_UPLOADED'
  ) THEN
    ALTER TYPE "OrgEventType" ADD VALUE 'ORG_FILE_UPLOADED';
  END IF;
END$$;

