# Equipment QR Inspection — Implementation Notes

## Scope
This module is added to Nurse Station Hub as an isolated feature. It does not replace or modify Emergency Checklist behavior.

## Access
- `ADMIN`: create/update Equipment Master and Checklist Master; register branch assets; inspect and view reports.
- `STAFF`: register/edit equipment only in the currently selected authorized branch; inspect and view that branch's report.
- All branch-scoped API requests use the existing `requireBranch` middleware. The server uses the active branch from the authenticated session and does not trust a client-supplied branch ID.

## Google Sheets
On first Equipment API use, the module creates these tabs if they do not exist and writes the expected header row:
1. `EQUIPMENT_MASTER`
2. `EQUIPMENT_CHECKLIST_MASTER`
3. `BRANCH_EQUIPMENT`
4. `EQUIPMENT_INSPECTION`
5. `EQUIPMENT_INSPECTION_DETAIL`

Existing tabs with different headers are not rewritten; the API returns a header mismatch error so existing data is not overwritten.

## QR
Each physical device receives an opaque random QR token (`EQ1:<token>`). The token is not the Master CODE and is resolved server-side against the currently selected branch. A QR from another branch cannot be used to inspect or read that device from the current branch.

The browser uses the existing `html5-qrcode` scanner and the `qrcodejs` library to render printable QR labels. Camera access requires HTTPS or localhost and user permission.

## Checklist result rules
- `PASS_FAIL`: user selects PASS or FAIL.
- `YES_NO`: YES passes by default; a Master can configure `passValues`.
- `NUMBER`: Master must configure a minimum and/or maximum acceptable value.
- `SELECT`: Master configures options and the values that count as passing.
- `TEXT` and `PHOTO`: supporting information only; they do not determine the overall result.
- The overall inspection is FAIL if any result-bearing item is FAIL; otherwise PASS when at least one result-bearing item was evaluated.
- Checklist changes append a new version. Inspection detail rows snapshot item labels, type, answer and result so historical inspections remain readable.

`PHOTO` currently stores an image URL (not a direct binary upload). For direct camera/photo uploads, a persistent file-storage destination must be selected before implementation.

## Monthly report
- One row per active Master CODE registered in the selected branch.
- `✓` means every active physical device for that Master CODE has a PASS inspection for that date.
- `✕` means at least one physical device has a FAIL inspection for that date.
- `◐` means some but not all physical devices have been inspected and none of the inspected devices failed.
- Blank means no device under that Master CODE has an inspection for that date.
- Clicking a day opens the per-device results. Clicking an inspection opens its checklist detail.
- The bottom recorder row shows the unique inspectors who recorded on each date.
- A `7d` marker appears when a physical device has FAIL as its latest result on each of the last seven consecutive calendar dates. A date with no inspection breaks the streak; PASS resets it. This is report-only; no LINE message or repair task is created.

## Validation performed
- `node --check` passed for the Equipment route, Equipment client, central API router and SPA router.
- The uploaded baseline has 99 existing tests: 86 pass and 13 fail. The modified project has those same 13 pre-existing failures, plus 7 new Equipment structural tests passing (106 total: 93 pass, 13 fail). The new Equipment test file passes independently (7/7).
- Live Google Sheets writes, real camera scanning, QR printing and browser UI interaction have not been tested in this environment. They require the user's configured Google credentials, branch session and a browser with camera permission.
