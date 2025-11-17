# AI Employees Overview

This document captures the architecture, flows, and admin touchpoints for the Hatch AI Employees system. Use it as a quick reference when debugging production issues or planning enhancements.

## 1. Conceptual Model

- **Templates (AiEmployeeTemplate)** – Define global persona defaults such as prompts, tone, avatar styling, and allowed tools. Seed data lives in `packages/db/prisma/seed/ai-employees.seed.ts`.
- **Instances (AiEmployeeInstance)** – Per-tenant copies that inherit template defaults plus tenant overrides (e.g., execution mode). Instances reference templates via `templateId`.
- **Proposed actions (AiProposedAction)** – Structured actions generated from AI planning runs. They capture the intended tool, payload, status, and whether the action is a dry run.
- **Execution logs (AiExecutionLog)** – Append-only log of tool executions, approvals, and system events. These power analytics, rate limiting, and audit trails.

## 2. Persona Editing Surface

- **Backend endpoint**: `PATCH /ai/employees/templates/:id`
  - Guards: tenant admin roles only.
  - Editable fields: display name, descriptions, prompts, tone, avatar defaults (color, shape, icon, initial), allowed tools, and execution tool lists.
  - Service merges partial updates without overwriting unrelated JSON.
- **Admin UI**: `/admin/ai-personas`
  - `apps/web/components/admin/ai-personas/PersonaAdminPanel.tsx` renders persona cards with live previews, avatar controls, tone picker, allowed-tool checkboxes, and execution mode selectors.
  - Usage snapshots (total actions, success rate, top tools) are displayed beside each persona to provide fast context.

## 3. Execution Flow

1. **Conversation + planning** – Copilot gathers context and produces an assistant plan containing reply text + structured actions.
2. **Proposed action creation** – Each plan action becomes an `AiProposedAction`, capturing tool metadata, payload, and `dryRun` (if Preview Mode was active).
3. **Approval pipeline**:
   - `requires-approval` actions wait for a human decision.
   - `auto-run` actions execute immediately unless rate limits or dry-run mode intervene.
4. **Dry run behavior**:
   - When `dryRun = true`, `executeActionRecord` short-circuits: it logs `"Dry run – no changes applied"` and marks the action executed without mutating downstream systems.
5. **Rate limiting**:
   - `MAX_EXECUTIONS_PER_TENANT_PER_DAY` caps tool executions per tenant over a rolling 24-hour window.
   - `isTenantOverRateLimit` counts non-conversation logs; when the cap is exceeded, actions are marked failed with a rate-limit error and a log entry is emitted.

## 4. Analytics + Reporting

- **Endpoint**: `GET /ai/employees/usage`
  - Returns aggregated stats per persona (total/success/failed counts plus per-tool tallies) for the requested date window.
  - Backed by indexed `AiExecutionLog` queries (filters on `tenantId`, `createdAt`, `success`).
- **Dashboard**: `/admin/ai-usage`
  - `apps/web/components/admin/ai-usage/AiUsageDashboard.tsx` renders stacked bar charts, persona-filtered tables, date presets (7d/30d), and manual range pickers.
  - CSV export mirrors the current filter window via `apps/web/lib/export/csv.ts`.
- **Persona admin snapshot**:
  - `/admin/ai-personas` page fetches usage stats server-side and injects them into each persona card for quick insight.

## 5. Copilot Surfaces

- **Context events**:
  - Both Vite and Next apps emit `copilot:context` CustomEvents describing the active entity (lead/listing/etc.). The docks subscribe and display the current context banner.
- **CopilotDock**:
  - Files:
    - Vite: `src/components/copilot/CopilotDock.tsx`
    - Next: `apps/web/components/copilot/CopilotDock.tsx`
  - Features: persona switcher, context banner, usage hints (`"Last 30d: X actions · Y% success"`), and disabled-state handling (if AI Employees are feature-flagged off).
- **CopilotPanel**:
  - Preview-mode toggle injects `dryrun: true` metadata so downstream planners create `AiProposedAction` entries marked as dry runs.
  - Inline actions show execution status, dry-run badges, and approval controls.

## 6. Operational Notes

- **Seeding**: run the standard Prisma seed workflow to provision default personas.
- **Migrations**: indexes on `AiExecutionLog` (`tenantId/createdAt/success`) and `AiProposedAction` (`tenantId/status/createdAt`) keep analytics + rate-limit queries performant.
- **Monitoring**: rate-limit integration tests live in `apps/api/test/integration/ai-employees.ratelimit.spec.ts`, while CSV export tests cover the dashboard output.
- **Feature flag**: set `AI_EMPLOYEES_ENABLED=false` to globally disable endpoints/UI. Clients detect the 503 response and surface a disabled banner.

Refer back to this doc when touching AI Employee logic to ensure new features respect dry-run semantics, rate limits, and analytics pipelines.
