# Running Number Format Fix

## Canonical format
All generated annual running numbers use:

`PREFIXYYYYMM-XXXXX`

- `PREFIX`: existing module/document prefix is preserved.
- `YYYYMM`: current Gregorian year and month in Asia/Bangkok.
- `XXXXX`: five-digit sequence, continuing across months and resetting to `00001` at the start of a new year.
- Existing historical numbers are read in supported legacy formats so they continue to count for the current year. Historical records are not rewritten.

Examples:

- `RCIN202609-00063`
- `RCOUT202609-00064`
- `MOV202609-00065`
- `RCIN202610-00064` (same annual sequence in the next month)
- `RCIN202701-00001` (new year reset)

## Generator paths reviewed/updated

- Shared running service: `src/utils/running/running.service.js`
- Daily Check and Controlled Drug Daily Check: `src/utils/running/annual-sheet-number.js`
- Receive Stock: `src/modules/receivestock/receivestock.repository.js`
- Dispense: `src/modules/dispense/dispense.running.js`
- Vaccine Master stock references and movement IDs: `src/modules/vaccinemaster/vaccinemaster.repository.js`
- Receive Drug: `src/modules/receivedrug/receivedrug.service.js`
- Emergency Check IDs: `src/modules/emergencycheck/emergencycheck.routes.js`

The existing prefixes are retained per module. Container IDs now follow the same no-extra-hyphen prefix rule (`CONTAINERYYYYMM-XXXXX`).

## Validation performed

- `node --check` passed for JavaScript files under `src`, `public`, and `test`.
- `test/annual-number-format.test.js`: 6/6 tests passed for formatting, cross-month continuity, annual reset, legacy-number parsing, and previous-year exclusion.
- Google Sheets integration was not run in this environment. Test against a staging sheet before deploying.
