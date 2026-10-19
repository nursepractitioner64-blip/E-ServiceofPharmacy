# Daily Check: branch isolation

This update scopes the Daily Check read endpoint to the authenticated user's server-side active branch. `GET /api/dailycheck` now requires `requireBranch` and aggregates only `COUNT_SESSION` rows whose column H (`BRANCH_ID`) matches `req.authBranchId`.

New records continue to append `BRANCH_ID` to column H. Historical rows with an empty branch ID are intentionally excluded from branch-specific totals; the system does not infer or backfill a branch for old data.

The item master remains the existing `INVENTORY_MASTER` sheet. This update scopes Daily Check records/history by branch without changing the master item list. Formal Inspection is a separate follow-up task.

## Validation

Run:

```bash
node --check src/modules/dailycheck/dailycheck.routes.js
node --test test/dailycheck-branch-isolation.test.js test/branch-selection-workflow.test.js
```

Live Google Sheets behavior must still be verified in the deployment environment.
