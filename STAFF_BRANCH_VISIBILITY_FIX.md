# Staff Branch Visibility Fix

## Issue
Staff could have a branch assigned in `USERS.BRANCH_IDS` but not see it in the branch selector or Branch Inventory List, especially when a session was created before the assignment changed or when `BRANCH_IDS` used a JSON/semi-colon/pipe separated format.

## Changes
- Parse `BRANCH_IDS` from comma, semicolon, pipe, newline, or JSON-array formats.
- Refresh the current user's role/status/branch assignments from the `USERS` sheet for branch-selection and branch-inventory requests rather than trusting possibly stale in-memory session data.
- Normalize branch ID comparisons for whitespace and case.
- Keep server-side authorization on every read and write; refreshing permissions does not grant unassigned branches.

## Verify
1. Restart `node server.js`.
2. Log out of the Staff account and log in again (recommended to refresh the client session too).
3. Open branch selection and Emergency Checklist > Inventory List.
4. If the branch is still missing, verify that `USERS.BRANCH_IDS` contains the exact `BRANCH_ID` value from `BRANCH`, not the branch name or branch code.
