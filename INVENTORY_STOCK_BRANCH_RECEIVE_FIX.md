# Inventory Stock — Branch Receive Fix

## Scope
- Preserve the existing receive-stock flow and existing sticker-print flow.
- Populate `BRANCH_ID` and `LOCATION` in the receive modal from the authenticated user's currently selected/authorized branch.
- Resolve branch identity on the server; do not trust `branchId` or `location` submitted by the browser.
- Store `BRANCH_ID` and `LOCATION` in `INVENTORY_MOVEMENT` for each new `TYPE=IN` row.
- Filter receive-stock history to the current branch only.
- Keep the existing `INVENTORY_MASTER` product selector unchanged.

## Google Sheet
`INVENTORY_MOVEMENT` already expects these headers:
`MOVEMENT_ID, TYPE, REF_NO, DATE, CODE, NAME, QTY, UNIT, LOT, EXP, TARGET, USER, TIME, BRANCH_ID, LOCATION`
The existing append helper maps object fields by header names, so no new sheet or extra columns are required if `BRANCH_ID` and `LOCATION` already exist exactly as headers. Preserve any existing `QRCODE`, `CONTAINER_ID`, and `CONTAINER_QR` columns after them.

## Validation performed
- `node --check` passed for the modified controller, routes, service, and client JavaScript files.
- Google Sheets live read/write and browser end-to-end tests were not run in this environment.
