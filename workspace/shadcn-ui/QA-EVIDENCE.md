# QA Evidence Pack (staging/dev, reproducible)

This replaces “screenshots I can’t capture” with a deterministic dataset + click-path checklist you can run on staging.

## 0) Seed the dataset (staging/dev only)

Pick the org you want to validate in staging (ideally a dedicated QA org with minimal existing data).

```bash
DB_ENV=staging QA_SEED_ENABLED=true QA_ORG_ID=<orgId> pnpm -C workspace/shadcn-ui/hatch-crm qa:seed
```

Optional selectors:

- `QA_ORG_SLUG=<slug>`
- `QA_TENANT_ID=<tenantId>` / `QA_TENANT_SLUG=<slug>`
- `QA_ACTOR_EMAIL=<brokerEmail>` (used as `createdByUserId` for listings/transactions)

Seeded identifiers to look for:

- Leads: emails like `qa.lead.new.*+<orgPrefix>@qa.hatch.test`
- Listings: `mlsNumber` like `QA-<orgPrefix>-ACTIVE-1`, `QA-<orgPrefix>-PENDING-1`, `QA-<orgPrefix>-PENDING_BROKER-1`
- Transaction: `qa-transaction-<orgPrefix>`
- LOI: `qa-loi-<orgPrefix>`
- Routing approval pool: one queued lead `QA Approval Pool Lead`

## 1) Evidence checklist (expected results)

Numbers below are exact if the org is “clean” (no pre-existing leads/listings/agents in the same states). If your staging org already has data, use the same click-paths but validate **parity and delta behavior** (counts change by 1 and match between pages), and verify the presence of the QA-seeded records above.

### 1.1 Leads: “New leads” delta + persistence (4 → 3)

1. Go to `/broker/mission-control` and note **New leads**.
2. Go to `/broker/crm` and confirm the **New** column/header count matches.
3. Drag one lead from **New** to **Qualified/Active** (or open lead drawer → change Stage).
4. Expected:
   - Mission Control **New leads** decreases by **1 immediately** (e.g., `4 → 3` on a clean org).
   - CRM **New** count decreases by **1 immediately**.
5. Refresh the browser.
6. Expected: counts remain updated (server truth).

### 1.2 Listings parity (Active/Pending: 5 / 1)

1. Go to `/broker/mission-control` and note listings KPIs.
2. Click Active listings tile → lands on `/broker/properties?filter=ACTIVE`.
3. Click Pending listings tile → lands on `/broker/properties?filter=PENDING`.
4. Expected:
   - Active totals match Mission Control (e.g., `5` on a clean org).
   - Pending totals match Mission Control (e.g., `1` on a clean org).

### 1.3 Compliance parity (Risk Center vs Mission Control)

1. Go to `/broker/mission-control` → Risk Center panel.
2. Click **Open Risk Center** → `/broker/compliance`.
3. Expected:
   - Both pages reflect the same “attention” definition (same org scope).
   - Risk Center severity breakdown includes the QA-seeded distribution (at least `1 HIGH`, `2 MEDIUM` from seeded agents).

### 1.4 Agents parity (Mission Control vs Team filters)

1. Go to `/broker/mission-control` and record **Active agents** and **Total agents**.
2. Go to `/broker/team`:
   - filter stage `ACTIVE` and confirm matches **Active agents**
   - show all stages and confirm matches **Total agents** (or totals are explainable via visible filters)

### 1.5 Routing mode + broker approval pool evidence

1. Go to `/broker/lead-routing`.
2. Confirm **Routing mode** toggle exists (Automatic vs Broker approval pool).
3. Set to **Broker approval pool**.
4. Expected:
   - The **Broker approval pool** table shows at least 1 pending lead (QA seeded).
   - Actions work: Approve / Reject / Reassign updates the row immediately.

### 1.6 Recommended actions explainability (no “needs attention” without details)

1. Go to `/broker/properties`.
2. Open the QA listing `QA-<orgPrefix>-ACTIVE-1`.
3. Find **Recommended actions**.
4. Expected:
   - Missing fields list is visible and links to the correct place to fix (Details tab).
   - Compliance issues show **View details** → each issue shows severity + resolution steps + deep link (Documents tab / broker approval anchor / Activity).

### 1.7 Ask Hatch: context panel + tabs + persistence

1. From any entity (lead/listing/transaction), click **Ask Hatch**.
2. Expected:
   - Context appears in a pinned Context panel (not pasted into chat history).
   - Tabs exist (General + entity threads).
3. Send a message in two different entity contexts.
4. Refresh the browser.
5. Expected:
   - Tabs and message history persist after refresh.

