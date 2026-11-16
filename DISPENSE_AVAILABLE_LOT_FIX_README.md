# DISPENSE Available LOT Fix (Ver5.3)

## Change scope
- Only the standard DISPENSE screen (`/api/dispense`) LOT selection flow was changed.
- E-StockScan routes and client files were not modified.
- `DRUG_RECEIVE` remains the drug master source for the drug selector.
- Available LOTs are now read from `INVENTORY_MOVEMENT` and grouped by CODE + LOT + EXP, scoped to the authenticated branch, with balance = IN - OUT.
- Only positive-balance LOTs are offered. EXP is populated from the selected ledger row.
- Existing create/update backend stock validation remains in place.

## Files changed
- `src/modules/dispense/dispense.repository.js`
- `src/modules/dispense/dispense.service.js`
- `src/modules/dispense/dispense.controller.js`
- `src/modules/dispense/dispense.routes.js`
- `public/modules/dispense/dispense.client.js`
- `public/views/dispense.html`
- `test/dispense-available-lots.test.js`

## Test
Run: `node --test test/dispense-available-lots.test.js`

No Google Sheets rows are changed by this patch.
