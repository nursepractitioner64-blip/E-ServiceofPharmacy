# Temperature Check Two-View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Temperature Check sidebar route display the complete reporting dashboard and make the DB-page button route display only the entry form.

**Architecture:** Keep one shared client module and the existing `/api/temperature-check/records` API. Give each SPA route a dedicated HTML view, and make the client initialize only the controls present in that view.

**Tech Stack:** Node.js, Express, SPA route registry in `public/assets/js/app.js`, browser ES modules, HTML/CSS, Google Sheets API, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-11-12-temperature-check-two-view-design.md`

## Global Constraints
- Preserve API path `/api/temperature-check/records`.
- Preserve sheets `TEMPERATURE_CHECK_LOG`, `TEMPERATURE_CHECK_RECORDER`, and `TEMPERATURE_CHECK_ALERTS`.
- Preserve branch authorization and current measurement types `freezer`, `fridge`, `room`, `humidity`.
- Preserve measurement times `09:00` and `16:00`.
- Do not change unrelated modules or invent report data.
- Do not add a chart dependency if existing browser assets can support the required chart.

## Review Focus
- Empty report/month with no records: show an explicit empty state, not fabricated zero-valued measurements.
- API authorization or network failure: show an error state and do not render stale data as current.
- Branch selection: only show branches and records permitted by the existing authorization model.
- Records on the 31st or missing one of the two daily readings: render without shifting dates or confusing 09:00 with 16:00.
- Out-of-range and boundary readings: preserve backend `STATUS`; do not recalculate using different client-side thresholds.

---

### Task 1: Lock down the route-to-view contract

**Files:**
- Modify: `test/spa-routes.test.js`
- Modify: `test/router-structure.test.js` only if necessary
- Modify: `public/assets/js/app.js`

**Interfaces:**
- `temperature-checklist` → `/views/temperature-checklist.html`
- `temperature-entry` → `/views/temperature-entry.html`
- Both routes keep `/modules/temperaturecheck/temperaturecheck.client.js` and `/modules/temperaturecheck/temperaturecheck.style.css`.

- [ ] **Step 1: Write failing route tests** asserting the two exact view paths and shared client/style paths.
- [ ] **Step 2: Run** `node --test test/spa-routes.test.js` and confirm the new route assertion fails because both routes currently use the same view.
- [ ] **Step 3: Update** the `temperature-entry` view path in `public/assets/js/app.js`; do not touch the unused `core/router.js`.
- [ ] **Step 4: Run** `node --test test/spa-routes.test.js` and confirm it passes.

### Task 2: Create the dedicated entry-only view

**Files:**
- Create: `public/views/temperature-entry.html`
- Modify: `test/spa-routes.test.js`

**Interfaces:**
- Form IDs and names remain compatible with the existing client: `temperatureForm`, `tcDate`, `tcTime`, `tcType`, `tcValue`, `tcUnit`, `tcRemark`, `tcSaveBtn`, `tcFormMessage`.
- Form submits the existing payload to `/api/temperature-check/records`.

- [ ] **Step 1: Add failing view assertions** that entry view contains the form and excludes report/dashboard containers.
- [ ] **Step 2: Run** `node --test test/spa-routes.test.js` and confirm failure because the entry view does not exist.
- [ ] **Step 3: Create** the standalone form view, retaining existing labels, choices, validation attributes, and accessible status message.
- [ ] **Step 4: Run** `node --test test/spa-routes.test.js` and confirm it passes.

### Task 3: Build the reporting dashboard view and data rendering

**Files:**
- Modify: `public/views/temperature-checklist.html`
- Modify: `public/modules/temperaturecheck/temperaturecheck.client.js`
- Modify: `test/spa-routes.test.js` or create `test/temperaturecheck-view.test.js`

**Interfaces:**
- Read: `GET /api/temperature-check/records?month=YYYY-MM` with same-origin credentials.
- Dashboard controls: `tcBranchLabel`, `tcMonth`, `tcReload`, `tcPrint`, `tcReport`, `tcReportMessage`.
- Dashboard summary/chart/table render only API-returned records. Display days 1–31 and separate 09:00 / 16:00 values; distinguish time series with blue and red markers.
- Keep the existing form submission behavior available on the entry view; guard event binding for absent elements.

- [ ] **Step 1: Add failing tests** for dashboard containers, month-filtered GET integration contract, empty-state handling, and explicit 09:00/16:00 series labels.
- [ ] **Step 2: Run** the focused test and confirm it fails on the missing dashboard/report implementation.
- [ ] **Step 3: Implement** report loading, summary aggregation based on returned `STATUS`, daily table grouping, chart rendering, loading/empty/error states, and print handling. Reuse existing chart assets if present; otherwise use native SVG/canvas.
- [ ] **Step 4: Verify** records with absent time slots and records on day 31 render in the correct cells without synthetic readings.
- [ ] **Step 5: Run** the focused test and confirm it passes.

### Task 4: Unify responsive Temperature Check styling

**Files:**
- Modify: `public/modules/temperaturecheck/temperaturecheck.style.css`
- Modify: `test/temperaturecheck-view.test.js`

**Interfaces:**
- Shared class prefix remains `tc-`.
- Dashboard and entry view use consistent Prompt typography, teal/white visual language, cards, form controls, table overflow behavior, and print styles.

- [ ] **Step 1: Add failing style-contract tests** for dashboard layout, responsive breakpoints, and print rules.
- [ ] **Step 2: Run** the focused test and confirm the required dashboard selectors/rules are absent.
- [ ] **Step 3: Add** scoped dashboard, chart, summary, table, responsive, and print CSS without global selectors that leak into other modules.
- [ ] **Step 4: Run** the focused test and confirm it passes.

### Task 5: Full regression and integration verification

**Files:**
- Review all changed Temperature Check files and existing test suite.

- [ ] **Step 1: Run** `npm test` from the project root.
- [ ] **Step 2: Check** route behavior for `#temperature-checklist` and `#temperature-entry` in a browser or browser-equivalent smoke test.
- [ ] **Step 3: Check** form POST and dashboard GET against an authenticated session; verify branch filtering and real Sheet data.
- [ ] **Step 4: Inspect** the final diff to confirm no unrelated files or API/schema changes.
- [ ] **Step 5: Report** test results and any manual checks that could not be performed without the user's authenticated Google/LINE environment.
