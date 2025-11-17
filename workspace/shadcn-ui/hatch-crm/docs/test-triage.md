### Next to Fix

1. `test/search.semantic.spec.ts`
2. `test/ai.evals.spec.ts`
3. `test/integration/ai-employees.admin.spec.ts`
4. `test/unit/re.milestone.upsert.spec.ts`

### Failure Inventory

| File | Type | Category | Status | Priority | Notes |
|------|------|----------|--------|----------|-------|
| test/search.semantic.spec.ts | Integration | Search / pgvector | failing | P1 | Needs pgvector extension (type `vector`) in test DB; query currently errors and returns 0 snippets. |
| test/ai.evals.spec.ts | Eval | Copilot golden outputs | failing | P1 | Goldens for `lead_next_actions` and `pipeline_bottleneck` expect phrases that the current prompt no longer emits; decide whether to adjust goldens or prompt. |
| src/modules/insights/insights.property.spec.ts | Unit/property | Insights legacy | failing | P3 | Missing dependency (`fast-check`); legacy property-testing path. |
| test/integration/ai-employees.admin.spec.ts | Integration | AI Employees admin | failing | P1 | Fixture uses plain `Record<string, unknown>` where Prisma expects `InputJsonValue`. |
| test/unit/re.milestone.upsert.spec.ts | Unit | Transactions/milestones | failing | P1 | `TransactionsService` ctor gained an `AiEmployeesProducer` dependency; test needs an extra mock. |

### Skipped / Deferred

| File | Reason |
|------|--------|
| tests/admin/rules-manager.test.tsx | Already skipped (legacy admin flow). |
