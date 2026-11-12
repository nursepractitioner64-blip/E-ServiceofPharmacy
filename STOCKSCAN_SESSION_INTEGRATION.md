# E-StockScan SESSION Integration — Phase 1

This build adds the E-StockScan SESSION workflow as a Nurse Station Hub module.
It does not yet migrate the E-StockScan DISPENSE workflow.

## Business rules

- Authentication comes from the Nurse Station Hub `esp_session` session.
- The active branch comes from the Hub `requireBranch` middleware (`req.authBranchId`).
- `REQUIRED` is read from `INVENTORY_MASTER.REQUIRED`.
- A scan is identified by `MOVEMENT_ID` (the lookup also accepts `QRCODE`).
- A duplicate `MOVEMENT_ID` is blocked within the same `SESSION_ID` and `BRANCH_ID`.
- Actual quantities are aggregated by `SESSION_ID`, `BRANCH_ID`, and `CODE`.
- `DIFF = ACTUAL - REQUIRED`.
- `SESSION_RESULT` retains its six columns: `SESSION`, `CODE`, `REQUIRED`, `ACTUAL`, `DIFF`, `BRANCH_ID`.
- The integration does not use `CART_ID`.

## Existing Sheets used

- `INVENTORY_MASTER` — `CODE`, `NAME`, `UNIT`, `REQUIRED`
- `INVENTORY_MOVEMENT` — existing 18-column movement schema
- `COUNT_SESSION` — first eight columns used: `SESSION_ID`, `MOVEMENT_ID`, `CODE`, `NAME`, `QTY`, `USER`, `TIME`, `BRANCH_ID`
- `SESSION_RESULT` — existing six-column result schema

If the existing `COUNT_SESSION` sheet still has a legacy `CART_ID` column in column I, this build leaves it untouched and does not read or write it. Do not delete historical columns until a backup and full deployment verification are complete.

## API endpoints

All endpoints below require Hub authentication and an active authorized branch:

- `GET /api/stockscan/session/new`
- `GET /api/stockscan/session/movement/:token`
- `POST /api/stockscan/session/:sessionId/count` with `{ "items": [{ "movement_id": "...", "qty": 1 }] }`
- `GET /api/stockscan/session/:sessionId/items`
- `POST /api/stockscan/session/:sessionId/close`

The server ignores client-supplied user and branch identifiers. It derives them from the authenticated Hub session.

## Deployment

1. Merge this source into the existing Nurse Station Hub project.
2. Keep the existing `.env` and service-account credentials in the deployment environment; they are intentionally not included in this ZIP.
3. Verify `GOOGLE_SHEET_ID` points to the spreadsheet containing the 13 current sheets.
4. Confirm the sheet headers match the schemas above.
5. Deploy to a staging service first and test with a non-production branch/user.
6. Do not shut down the standalone E-StockScan app until the integrated SESSION flow passes real-device camera and Google Sheets tests.

## Validation performed

- Node syntax checks passed for the new SESSION service, routes, client module, and Hub route registration.
- Unit tests passed for duplicate blocking, the 8-column COUNT_SESSION contract (ignoring a legacy CART_ID column), six-column SESSION_RESULT, and branch-specific result calculation.
- Google Sheets live integration and physical camera testing have not been performed in this build.
