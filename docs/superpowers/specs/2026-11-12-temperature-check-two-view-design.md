# Temperature Check – Two-View Design

## Intent
Separate Temperature Check reporting from data entry while keeping one shared API and Google Sheets data model.

## Goals
- `#temperature-checklist` opens the complete dashboard: monthly report, daily table (days 1–31, rows/columns for 09:00 and 16:00), temperature/humidity charts, status summary, branch/month filters, and print/PDF.
- `#temperature-entry` opens only the temperature/humidity entry form.
- Both views use `/api/temperature-check/records`; records from the form and E-StockScan appear in the same reports.
- Preserve existing branch authorization and existing Sheets: `TEMPERATURE_CHECK_LOG`, `TEMPERATURE_CHECK_RECORDER`, and `TEMPERATURE_CHECK_ALERTS`.
- Keep responsive styling for desktop, tablet, and mobile.

## Non-goals
- Do not redesign unrelated modules, change the API contract, or migrate/rename existing Sheets.
- Do not fabricate report data or bypass branch permissions.

## Approaches
1. Duplicate the whole client and API for the entry page — rejected because it duplicates logic and risks inconsistent data.
2. Keep one view with client-side hide/show based on hash — rejected because both entry points still load the same combined view and make separation fragile.
3. Use two dedicated views with one shared client module and API — selected because each route has a clear responsibility while data and validation remain centralized.

## Constraints and implementation decisions
- Reuse the existing `app.js` route registry and its `view`, `script`, and `style` fields.
- Keep the existing `temperaturecheck.client.js` as the shared client entry point; initialize only the DOM features present in the current view.
- Keep current API endpoint and field names, including `date`, `time`, `type`, `value`, `remark`, and `source`.
- Preserve existing measurement types and time slots: `freezer`, `fridge`, `room`, `humidity`; `09:00`, `16:00`.
- Use actual authorized API responses for dashboard values. If a chart library is already loaded, reuse it; otherwise use lightweight native SVG/canvas rendering without adding a dependency.
