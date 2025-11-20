-- Phase 7: Add training module fields
ALTER TABLE "AgentTrainingModule"
  ADD COLUMN IF NOT EXISTS "required" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "estimatedMinutes" INTEGER;

ALTER TABLE "AgentTrainingProgress"
  ADD COLUMN IF NOT EXISTS "notes" TEXT;

