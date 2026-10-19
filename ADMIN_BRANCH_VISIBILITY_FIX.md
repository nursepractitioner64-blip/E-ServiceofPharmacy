# Admin Branch Visibility Fix

## Cause
The branch selector could restore the legacy `ALL` value from localStorage and automatically set the session to `ALL`. Branch-scoped read APIs such as Daily Check, Emergency Check, and Receive Stock require a real active `BRANCH_ID`, so they returned `BRANCH_REQUIRED` or empty/error states.

## Change
- On login, ignore a remembered `ALL` value and recover to the last valid real branch, or the first active branch for Admin.
- The branch switcher lists actual active branches only. Admin can switch between branches to view each branch's data.
- The branch selection API rejects `ALL` with a clear message because a full aggregated cross-branch view is not implemented consistently across all modules.
- User branch authorization checks and server-side write branch validation remain in place.

## Test
- `node --check public/assets/js/auth.client.js`
- `node --check src/modules/branches/branches.routes.js`
- `node --test test/admin-branch-visibility.test.js`

Google Sheets live data was not tested in this environment.
