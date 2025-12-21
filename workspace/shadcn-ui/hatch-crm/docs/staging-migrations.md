# Staging-safe migrations (Norman workflow)

This repo uses a guarded migration runner to reduce the risk of accidentally migrating production.

## What changed

`pnpm db:migrate` now runs `scripts/db-migrate-guard.mjs`, which:

- requires `DB_ENV` to be explicitly set (`staging|prod|dev`)
- refuses to run unless `DB_ENV=staging` **or** `I_UNDERSTAND_MIGRATING_PROD=true`
- prints the database host + database name (no credentials) before applying migrations

## Run migrations on staging (safe default)

From repo root:

```bash
DB_ENV=staging pnpm -C workspace/shadcn-ui/hatch-crm db:migrate
```

Expected log prefix:

- `[db:migrate] DB_ENV=staging`
- `[db:migrate] Target database: <host>/<db>`

## Run migrations on production (explicit override)

```bash
DB_ENV=prod I_UNDERSTAND_MIGRATING_PROD=true pnpm -C workspace/shadcn-ui/hatch-crm db:migrate
```

## Local development

Prefer Prisma dev migrations instead of `db:migrate`:

```bash
pnpm -C workspace/shadcn-ui/hatch-crm --filter @hatch/db migrate:dev
```

## Rollback notes

Prisma migrations are not auto-reversible. If staging reveals an issue:

- **Preferred:** fix-forward with a new migration.
- **Emergency staging reset:** drop the staging database and re-run `db:migrate` (only if staging data is disposable).

