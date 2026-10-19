# Annual Running Numbers & Input History

## Running number rule
- All business running numbers use `PREFIXYYYYMM-XXXXX` (for example `RCIN202609-00063`).
- `YYYYMM` follows the Asia/Bangkok Gregorian calendar. The `XXXXX` sequence continues across months and resets only when the year changes.
- Generators read existing records from the relevant Google Sheet and find the highest sequence for the current year before generating a new value. Legacy formats are scanned where their prefix and sequence can be identified; old records are never rewritten.
- Existing prefixes remain in place. Daily check, controlled-drug daily check, emergency check, drug receive, dispense, inventory receive, container, and vaccine stock running numbers use the annual rule.
- Sequence locks serialize generation in one Node.js process. If deploying multiple server instances, use a shared atomic sequence store/lock to guarantee cross-instance uniqueness.

## Input history / autocomplete
- Applies to free-entry text inputs and textareas in static and dynamically-rendered SPA screens.
- Suggestions are saved in browser local storage per signed-in user and field; selecting a suggestion fills the field.
- Passwords, secrets, OTPs, hidden fields, numeric/date/time controls, buttons, patient identifiers and clinical/patient-detail fields are excluded intentionally.
- No Google Sheets columns or new sheets are required for browser-local history. History is not synced between browsers/devices.

## Validation
- JavaScript syntax and focused running-number tests are run after edits. Google Sheets live integration is not available in this environment.
