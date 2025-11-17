-- Materialized view consolidating lead, touchpoint, and queue analytics for client insights.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'LeadHistory'
  ) THEN
    CREATE TABLE "LeadHistory" (
      "id"          text PRIMARY KEY,
      "tenantId"    text NOT NULL,
      "personId"    text NOT NULL,
      "eventType"   text NOT NULL,
      "payload"     jsonb,
      "occurredAt"  timestamptz NOT NULL DEFAULT now(),
      "createdAt"   timestamptz NOT NULL DEFAULT now()
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'LeadTouchpoint'
  ) THEN
    CREATE TABLE "LeadTouchpoint" (
      "id"         text PRIMARY KEY,
      "tenantId"   text NOT NULL,
      "personId"   text NOT NULL,
      "occurredAt" timestamptz NOT NULL DEFAULT now(),
      "summary"    text,
      "body"       text,
      "metadata"   jsonb
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'QueueAssignment'
  ) THEN
    CREATE TABLE "QueueAssignment" (
      "id"         text PRIMARY KEY,
      "tenantId"   text NOT NULL,
      "personId"   text NOT NULL,
      "assigneeId" text,
      "claimedAt"  timestamptz,
      "breachedAt" timestamptz
    );
  END IF;
END
$$;

DROP MATERIALIZED VIEW IF EXISTS "LeadAnalyticsView";

CREATE MATERIALIZED VIEW "LeadAnalyticsView" AS
WITH touchpoints AS (
  SELECT
    lt."tenantId",
    lt."personId",
    COUNT(*) FILTER (WHERE lt."occurredAt" >= NOW() - INTERVAL '1 day')  AS touchpoints_1d,
    COUNT(*) FILTER (WHERE lt."occurredAt" >= NOW() - INTERVAL '7 day')  AS touchpoints_7d,
    COUNT(*) FILTER (WHERE lt."occurredAt" >= NOW() - INTERVAL '14 day') AS touchpoints_14d,
    COUNT(*) FILTER (WHERE lt."occurredAt" >= NOW() - INTERVAL '30 day') AS touchpoints_30d,
    COUNT(*) FILTER (WHERE lt."occurredAt" >= NOW() - INTERVAL '60 day') AS touchpoints_60d,
    MIN(lt."occurredAt") AS first_touchpoint_at,
    MAX(lt."occurredAt") AS last_touchpoint_at
  FROM "LeadTouchpoint" lt
  GROUP BY lt."tenantId", lt."personId"
),
stage_moves AS (
  SELECT
    lh."tenantId",
    lh."personId",
    COUNT(*) FILTER (
      WHERE (lh."payload" ->> 'toStageId') IS NOT NULL
    ) AS stage_moves_total,
    COUNT(*) FILTER (
      WHERE (lh."payload" ->> 'fromStageId') IS NOT NULL
        AND (lh."payload" ->> 'toStageId') IS NOT NULL
        AND (lh."payload" ->> 'fromStageId') <> (lh."payload" ->> 'toStageId')
    ) AS stage_moves_forward,
    AVG(
      CASE
        WHEN jsonb_typeof(lh."payload" -> 'durationMs') = 'number'
        THEN (lh."payload" ->> 'durationMs')::numeric
        ELSE NULL
      END
    ) AS avg_stage_duration_ms,
    MAX(lh."occurredAt") AS last_stage_move_at,
    MAX(lh."payload" ->> 'fromStageId') AS last_from_stage_id,
    MAX(lh."payload" ->> 'toStageId') AS last_to_stage_id,
    MAX(lh."payload" ->> 'fromStageName') AS last_from_stage_name,
    MAX(lh."payload" ->> 'toStageName') AS last_to_stage_name
  FROM "LeadHistory" lh
  WHERE lh."eventType" = 'STAGE_MOVED'
  GROUP BY lh."tenantId", lh."personId"
),
sla AS (
  SELECT
    qa."tenantId",
    qa."personId",
    COUNT(*) FILTER (WHERE qa."breachedAt" IS NOT NULL) AS sla_breaches,
    AVG(
      EXTRACT(EPOCH FROM (tp."occurredAt" - qa."claimedAt")) * 1000
    ) AS avg_response_ms
  FROM "QueueAssignment" qa
  LEFT JOIN LATERAL (
    SELECT lt."occurredAt"
    FROM "LeadTouchpoint" lt
    WHERE lt."tenantId" = qa."tenantId"
      AND lt."personId" = qa."personId"
      AND lt."userId" = qa."assigneeId"
      AND lt."occurredAt" >= qa."claimedAt"
    ORDER BY lt."occurredAt"
    LIMIT 1
  ) tp ON TRUE
  GROUP BY qa."tenantId", qa."personId"
)
SELECT
  p."tenantId",
  p."organizationId",
  p."id" AS "personId",
  p."ownerId",
  p."stageId",
  p."pipelineId",
  p."scoreTier",
  p."stageEnteredAt",
  p."lastActivityAt",
  tp.touchpoints_1d  AS "touchpoints1d",
  tp.touchpoints_7d  AS "touchpoints7d",
  tp.touchpoints_14d AS "touchpoints14d",
  tp.touchpoints_30d AS "touchpoints30d",
  tp.touchpoints_60d AS "touchpoints60d",
  tp.first_touchpoint_at AS "firstTouchpointAt",
  tp.last_touchpoint_at  AS "lastTouchpointAt",
  sm.stage_moves_total   AS "stageMovesTotal",
  sm.stage_moves_forward AS "stageMovesForward",
  sm.avg_stage_duration_ms AS "avgStageDurationMs",
  sm.last_stage_move_at    AS "lastStageMoveAt",
  sm.last_from_stage_id    AS "lastFromStageId",
  sm.last_to_stage_id      AS "lastToStageId",
  sm.last_from_stage_name  AS "lastFromStageName",
  sm.last_to_stage_name    AS "lastToStageName",
  sla.sla_breaches         AS "slaBreaches",
  sla.avg_response_ms      AS "avgResponseMs",
  COALESCE(
    p."stageId",
    sm.last_to_stage_id,
    sm.last_from_stage_id,
    'unassigned'
  ) AS "stageKey",
  COALESCE(
    tp.first_touchpoint_at,
    sm.last_stage_move_at,
    p."stageEnteredAt",
    p."createdAt"
  ) AS "bucketStart",
  COALESCE(
    tp.last_touchpoint_at,
    sm.last_stage_move_at,
    p."lastActivityAt",
    p."updatedAt"
  ) AS "bucketEnd"
FROM "Person" p
LEFT JOIN touchpoints tp
  ON tp."tenantId" = p."tenantId" AND tp."personId" = p."id"
LEFT JOIN stage_moves sm
  ON sm."tenantId" = p."tenantId" AND sm."personId" = p."id"
LEFT JOIN sla
  ON sla."tenantId" = p."tenantId" AND sla."personId" = p."id"
WHERE p."deletedAt" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "LeadAnalyticsView_person_idx"
  ON "LeadAnalyticsView" ("personId");

CREATE INDEX IF NOT EXISTS lav_tenant
  ON "LeadAnalyticsView" ("tenantId");

CREATE INDEX IF NOT EXISTS lav_owner
  ON "LeadAnalyticsView" ("ownerId");

CREATE INDEX IF NOT EXISTS lav_bucket
  ON "LeadAnalyticsView" ("bucketStart", "bucketEnd");

CREATE INDEX IF NOT EXISTS lav_stage
  ON "LeadAnalyticsView" ("stageKey");

CREATE UNIQUE INDEX IF NOT EXISTS lav_uq
  ON "LeadAnalyticsView" ("tenantId", "ownerId", "stageKey", "bucketStart");
