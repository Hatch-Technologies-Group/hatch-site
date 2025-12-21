# Staging post-migration verification (copy/paste)

This checklist is designed to be safe on staging and to produce repeatable evidence after `prisma migrate deploy`.

## Prereqs

- You are pointing `DATABASE_URL` at **staging**.
- You set `DB_ENV=staging` (required by the migration guard).
- Optional but recommended so inserts land in the org you are validating in the UI:
  - `POSTCHECK_ORG_ID=<orgId>`
  - `POSTCHECK_USER_EMAIL=<brokerEmail>`

## 0) (Optional) Snapshot LOI status counts BEFORE migrating

Run this before you apply migrations so you can compare before/after mapping:

```bash
DB_ENV=staging pnpm -C workspace/shadcn-ui/hatch-crm --filter @hatch/db exec prisma db execute --stdin <<'SQL'
SELECT status, COUNT(*)::int AS count
FROM "OfferIntent"
GROUP BY 1
ORDER BY 1;
SQL
```

Expected: you may see legacy statuses like `SUBMITTED`, `UNDER_REVIEW`, `DECLINED`, `WITHDRAWN` (depending on existing data).

## 1) Run migrations (guarded)

```bash
DB_ENV=staging pnpm -C workspace/shadcn-ui/hatch-crm db:migrate
```

Expected:

- it prints `Target database: <host>/<db>` before applying anything
- it refuses to run unless `DB_ENV=staging` (or the explicit prod override is present)

## 2) Verify Prisma migration status

```bash
DB_ENV=staging pnpm -C workspace/shadcn-ui/hatch-crm --filter @hatch/db exec prisma migrate status
```

Expected: no pending migrations.

## 3) Post-migration checks (script)

Runs all checks below (LOIs, OrgEventType enum insert/read, ChatSession unique index, SellerOpportunity + OrgLedgerEntry upserts):

```bash
DB_ENV=staging pnpm -C workspace/shadcn-ui/hatch-crm db:postcheck
```

Expected final line:

- `[postcheck] All checks passed.`

### 3.1 LOI status migration validation (OfferIntent)

The postcheck script prints a status-count table and fails if any rows remain in legacy statuses:

- `SUBMITTED`
- `UNDER_REVIEW`
- `DECLINED`
- `WITHDRAWN`

If you want the raw SQL:

```sql
SELECT status, COUNT(*)::int AS count
FROM "OfferIntent"
GROUP BY 1
ORDER BY 1;
```

### 3.2 OrgEventType enum validation

The postcheck script verifies the enum is compatible by inserting and reading an `OrgEvent` with type `ORG_OFFER_INTENT_CREATED`.

Raw SQL to list enum values:

```sql
SELECT e.enumlabel
FROM pg_enum e
JOIN pg_type t ON t.oid = e.enumtypid
WHERE t.typname = 'OrgEventType'
ORDER BY e.enumsortorder;
```

### 3.3 Chat session context validation

The postcheck script:

- checks for duplicate `(organizationId, userId, contextKey)` rows
- attempts a duplicate insert and expects a unique constraint rejection

Raw SQL duplicate scan:

```sql
SELECT "organizationId", "userId", "contextKey", COUNT(*)::int AS count
FROM "ChatSession"
GROUP BY 1,2,3
HAVING COUNT(*) > 1;
```

### 3.4 SellerOpportunity + OrgLedgerEntry validation

The postcheck script upserts:

- `SellerOpportunity` with `source=QA_POSTCHECK`
- `OrgLedgerEntry` with `category=QA_POSTCHECK`

**UI read proof:** after the script runs, confirm the rows are visible:

- `/broker/opportunities` (Seller tab) shows the `QA_POSTCHECK` opportunity address.
- `/broker/financials` shows the `QA_POSTCHECK` ledger entry.

## Cleanup (optional)

To remove the postcheck artifacts:

```bash
DB_ENV=staging pnpm -C workspace/shadcn-ui/hatch-crm --filter @hatch/db exec prisma db execute --stdin <<'SQL'
DELETE FROM "SellerOpportunity" WHERE source = 'QA_POSTCHECK';
DELETE FROM "OrgLedgerEntry" WHERE category = 'QA_POSTCHECK';
SQL
```

