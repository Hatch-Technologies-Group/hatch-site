-- Drop legacy table variant if it exists
DROP TABLE IF EXISTS "ContactListView";

DROP MATERIALIZED VIEW IF EXISTS contact_list_view;

CREATE MATERIALIZED VIEW contact_list_view AS
SELECT
    p."id"                                               AS person_id,
    p."tenantId"                                         AS tenant_id,
    p."organizationId"                                   AS org_id,
    p."ownerId"                                          AS owner_id,
    owner_team.team_id                                   AS team_id,
    p."stage"                                            AS status,
    NULLIF(concat_ws(' ', NULLIF(p."firstName", ''), NULLIF(p."lastName", '')), '') AS full_name,
    p."primaryEmail"                                     AS email,
    p."primaryPhone"                                     AS phone,
    p."companyId"                                        AS company_id,
    company."name"                                       AS company_name,
    p."householdId"                                      AS household_id,
    household."name"                                     AS household_name,
    p."leadScore"                                        AS score,
    p."source"                                           AS source,
    p."updatedAt"                                        AS updated_at,
    p."createdAt"                                        AS created_at,
    (
      SELECT MAX(a."occurredAt")
      FROM "Activity" a
      WHERE a."personId" = p."id"
    )                                                    AS last_activity_at,
    (
      SELECT COUNT(*)
      FROM "LeadTask" t
      WHERE t."personId" = p."id" AND t."status" = 'OPEN'
    )                                                    AS open_tasks,
    EXISTS (
      SELECT 1
      FROM "Consent" c
      WHERE c."personId" = p."id" AND c."channel" = 'SMS' AND c."status" = 'GRANTED'
    )                                                    AS has_sms_opt_in,
    EXISTS (
      SELECT 1
      FROM "Consent" c
      WHERE c."personId" = p."id" AND c."channel" = 'EMAIL' AND c."status" = 'GRANTED'
    )                                                    AS has_email_opt_in,
    EXISTS (
      SELECT 1
      FROM "Consent" c
      WHERE c."personId" = p."id" AND c."channel" = 'VOICE' AND c."status" = 'GRANTED'
    )                                                    AS has_call_opt_in,
    p."doNotContact"                                    AS is_dnc_blocked,
    lower(trim(concat_ws(' ', p."firstName", p."lastName", p."primaryEmail", p."primaryPhone"))) AS search_text,
    to_tsvector(
      'simple',
      coalesce(p."firstName", '') || ' ' ||
      coalesce(p."lastName", '') || ' ' ||
      coalesce(p."primaryEmail", '') || ' ' ||
      coalesce(p."primaryPhone", '')
    )                                                    AS search_vector
FROM "Person" p
LEFT JOIN "Company" company
       ON company."id" = p."companyId"
LEFT JOIN "Household" household
       ON household."id" = p."householdId"
LEFT JOIN LATERAL (
    SELECT
      tm."teamId" AS team_id
    FROM "User" u
    JOIN "TeamMembership" tm ON tm."userId" = u."id"
    WHERE u."id" = p."ownerId"
    ORDER BY tm."createdAt"
    LIMIT 1
) owner_team ON TRUE;

-- Indexes to keep list queries responsive
CREATE UNIQUE INDEX contact_list_view_person_id_idx ON contact_list_view (person_id);
CREATE INDEX contact_list_view_org_idx ON contact_list_view (org_id);
CREATE INDEX contact_list_view_owner_idx ON contact_list_view (tenant_id, owner_id);
CREATE INDEX contact_list_view_team_idx ON contact_list_view (tenant_id, team_id);
CREATE INDEX contact_list_view_status_idx ON contact_list_view (tenant_id, status);
CREATE INDEX contact_list_view_updated_idx ON contact_list_view (tenant_id, updated_at DESC);
CREATE INDEX contact_list_view_last_activity_idx ON contact_list_view (tenant_id, last_activity_at DESC);
CREATE INDEX contact_list_view_consent_idx ON contact_list_view (tenant_id, has_sms_opt_in, has_email_opt_in, has_call_opt_in);
CREATE INDEX contact_list_view_tasks_idx ON contact_list_view (tenant_id, open_tasks);
CREATE INDEX contact_list_view_dnc_idx ON contact_list_view (tenant_id, is_dnc_blocked);
CREATE INDEX contact_list_view_search_idx ON contact_list_view USING GIN (search_vector);
