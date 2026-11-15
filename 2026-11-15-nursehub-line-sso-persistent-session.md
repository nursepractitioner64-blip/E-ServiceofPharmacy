# NurseHub LINE SSO and Persistent Session Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enable first-time existing-account linking and subsequent LINE/LIFF sign-in, persist the existing eight-hour NurseHub session in PostgreSQL, and publish a seven-area LINE OA Rich Menu.

**Architecture:** Keep Google Sheets as the source of truth for USERS, roles, branch assignments, and all operational data. Add `express-session` plus `connect-pg-simple` backed by Render PostgreSQL, adapting the current `auth.service` session helpers so existing middleware and protected modules continue to work. Use the LIFF ID token only as a verified LINE identity, link it to the existing USERS row after Username/Password authentication, and publish the Rich Menu through the LINE Messaging API.

**Tech Stack:** Node.js CommonJS, Express 4, `express-session`, `connect-pg-simple`, `pg`, Google Sheets API, LINE LIFF SDK, LINE Login ID-token verification, LINE Messaging API, Node built-in test runner (`node --test`).

**Spec:** `docs/superpowers/specs/nursehub-liff-persistent-session-design.md`

## Global Constraints

- Google Sheets remains the primary database for users, branches, and existing business data.
- PostgreSQL is used only for persistent web sessions.
- Session TTL remains eight hours.
- Preserve cookie name `esp_session` where compatible.
- Preserve the existing `USERS` sheet and `LINE_USER_ID` mapping; do not create a parallel user/account sheet.
- Verify LINE ID tokens on the server against `LINE_CHANNEL_ID`.
- First-time LINE linking requires the existing Username/Password account; later LINE login must resolve to that same active account.
- Preserve role, branch assignment, branch selection, and `requireAuth` / `requireAdmin` / `requireBranch` enforcement.
- Never place passwords, ID tokens, channel secrets, or session IDs in URLs, browser storage, or logs.
- Do not change unrelated pharmacy, inventory, vaccine, temperature, equipment, or E-StockScan behavior.
- Rich Menu destinations 6 and 7 are placeholders only; do not claim Reports or Notifications functionality exists until those modules are separately implemented.

## Review Focus

- **Missing or malformed `DATABASE_URL` / PostgreSQL unavailable:** startup must fail clearly rather than silently reverting to process-local sessions.
- **LINE identity absent, duplicated, or linked to an inactive user:** reject login/link with a stable error code and do not create or mutate another account.
- **Expired, replayed, or invalid LIFF ID token:** reject it without issuing a session or logging the token.
- **Session changes to branch, user status, password, or branch ID:** persisted session state must reflect the change or be revoked as appropriate.
- **Direct access to Reports/Notifications routes:** show an explicit not-yet-available placeholder, not a blank screen or a false success state.

---

### Task 1: Add PostgreSQL-backed Express session infrastructure

**Files:**
- Create: `src/config/postgres.js`
- Create: `src/config/session.js`
- Modify: `server.js`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Test: `test/session-config.test.js`

**Interfaces:**
- `src/config/postgres.js` exports `pool` (`pg.Pool`) configured from `DATABASE_URL` and `closePostgres()`.
- `src/config/session.js` exports `createSessionMiddleware()` and `closeSessionStore()`.
- `createSessionMiddleware()` returns Express middleware configured with `connect-pg-simple`, table `user_sessions`, `createTableIfMissing: true`, cookie name `esp_session`, eight-hour max age, `HttpOnly`, `SameSite=Lax`, `Secure` in production, and `resave:false` / `saveUninitialized:false`.
- The server sets `trust proxy` for the Render proxy before session middleware and mounts session middleware before `/api` routes.

- [ ] **Step 1: Write the failing configuration tests**

  Add tests asserting the PostgreSQL module requires `DATABASE_URL`, the session store uses `user_sessions`, the cookie name is `esp_session`, the max age is eight hours, production cookies are Secure, and session middleware is mounted before `app.use('/api', apiRoutes)`.

- [ ] **Step 2: Run the focused test and verify it fails**

  Run: `node --test test/session-config.test.js`

  Expected: FAIL because the PostgreSQL/session configuration modules and middleware wiring do not exist yet.

- [ ] **Step 3: Add the session dependencies and configuration**

  Add `express-session`, `connect-pg-simple`, and `pg`; create the shared pool and session middleware; add `DATABASE_URL` and `SESSION_SECRET` placeholders to `.env.example` without real credentials. Configure production proxy trust and mount the middleware before the API router.

- [ ] **Step 4: Run the focused test**

  Run: `node --test test/session-config.test.js`

  Expected: PASS; the test confirms ordering and the required cookie/store configuration.

- [ ] **Step 5: Commit the infrastructure change**

  ```bash
  git add package.json package-lock.json .env.example server.js src/config/postgres.js src/config/session.js test/session-config.test.js
  git commit -m "feat(auth): add postgres-backed session middleware"
  ```

### Task 2: Replace process-local auth sessions without breaking existing auth APIs

**Files:**
- Create: `src/modules/auth/session.repository.js`
- Modify: `src/modules/auth/auth.service.js`
- Modify: `src/modules/auth/auth.middleware.js`
- Modify: `src/modules/auth/auth.routes.js`
- Modify: `src/modules/branches/branches.service.js`
- Test: `test/auth-session-persistence.test.js`
- Test: `test/auth-login.test.js`
- Test: `test/branch-selection-workflow.test.js`

**Interfaces:**
- `auth.createSession(req, res, user)` regenerates the Express session, stores `{ user: publicUser(user), expiresAt }` at `req.session.auth`, saves it, and returns the public user.
- `auth.getSession(req)` returns `null` without a valid `req.session.auth`; otherwise returns `{ sid: req.sessionID, user, expiresAt, currentBranchId }`.
- `auth.setSessionBranch(req, branchId)` and `auth.clearSessionBranch(req)` update `req.session.currentBranchId` and save the session.
- `auth.destroySession(req, res)` destroys the server-side session and clears the `esp_session` cookie.
- `session.repository.js` exports `remapBranchId(oldId,newId)`, `destroySessionsForUser(userId)`, and `updateUserBranchIds(userId,branchIds)` for the `user_sessions` store table.
- `auth.remapBranchId(oldId,newId)` becomes async; `branches.service.updateBranch` awaits it after the Sheets batch update.

- [ ] **Step 1: Write failing tests for persistence and session lifecycle**

  Add tests asserting: a session is stored through the Express session object rather than a module-level `Map`; `getSession` reads `req.session.auth`; session regeneration is used on login; logout destroys the session; branch selection is persisted; password reset and user deactivation revoke matching sessions; branch-ID remapping updates active session data.

- [ ] **Step 2: Run focused tests and verify they fail**

  Run: `node --test test/auth-session-persistence.test.js test/auth-login.test.js test/branch-selection-workflow.test.js`

  Expected: FAIL on the existing in-memory `sessions` implementation and the old `createSession(user,res)` signature.

- [ ] **Step 3: Implement the session repository and adapt auth service**

  Move session lifecycle to `req.session`; preserve the existing eight-hour expiration and public user shape. Implement repository updates against the `user_sessions` table's `sid`, `sess`, and `expire` columns. Keep login-attempt throttling and temporary OAuth state maps separate from authenticated session storage.

- [ ] **Step 4: Update all session call sites and branch remapping**

  Pass `req` to `createSession` in the password-login route and LINE callback; make logout await session destruction; update branch service to await the persistent remap operation. Keep middleware's `req.authUser` and `req.authSessionId` contract unchanged.

- [ ] **Step 5: Run focused tests**

  Run: `node --test test/auth-session-persistence.test.js test/auth-login.test.js test/branch-selection-workflow.test.js test/admin-branch-visibility.test.js`

  Expected: PASS for all focused session, login, branch-selection, and admin branch-visibility tests.

- [ ] **Step 6: Commit the auth session migration**

  ```bash
  git add src/modules/auth/session.repository.js src/modules/auth/auth.service.js src/modules/auth/auth.middleware.js src/modules/auth/auth.routes.js src/modules/branches/branches.service.js test/auth-session-persistence.test.js
  git commit -m "feat(auth): persist staff sessions in postgres"
  ```

### Task 3: Complete LIFF first-link and returning LINE sign-in flow

**Files:**
- Create: `public/assets/js/auth.liff.js`
- Modify: `src/modules/auth/auth.routes.js`
- Modify: `src/modules/auth/auth.service.js`
- Modify: `public/index.html`
- Modify: `public/assets/js/auth.client.js`
- Modify: `public/assets/js/auth.link-line.js`
- Modify: `.env.example` (only if an additional public LIFF setting is required)
- Test: `test/auth-liff-flow.test.js`
- Test: `test/auth-line-link.test.js`
- Test: `test/auth-line-login.test.js`

**Interfaces:**
- Add `POST /api/auth/line/login` accepting `{ id_token }`; it calls `authenticateByLineIdToken`, creates a persistent session, and returns `{ ok:true, user }` on success.
- An unmapped LINE identity returns HTTP 403 with `{ ok:false, code:'LINE_NOT_LINKED', message }`; it must not create a new account or session.
- Existing `POST /api/auth/line/link` remains authenticated and accepts `{ id_token }`; it links the verified LINE identity to `req.authUser.userId` only.
- Existing `POST /api/auth/login`, `GET /api/auth/me`, and `POST /api/auth/logout` retain their public response contracts.
- `public/assets/js/auth.liff.js` initializes the LIFF SDK from `/api/auth/config`, obtains the ID token, attempts LINE SSO, and retains a first-link token only in in-memory JavaScript state until the existing Username/Password login succeeds.

- [ ] **Step 1: Write failing route and client-flow tests**

  Add tests asserting the new LINE login endpoint verifies the ID token server-side, issues a session only for one active mapped account, returns `LINE_NOT_LINKED` for an unmapped identity, rejects duplicate/inactive mappings, and that the LIFF client never writes the ID token to `localStorage`, `sessionStorage`, or a URL.

- [ ] **Step 2: Run the focused tests and verify they fail**

  Run: `node --test test/auth-liff-flow.test.js test/auth-line-link.test.js test/auth-line-login.test.js`

  Expected: FAIL because the `/line/login` endpoint and LIFF SSO client flow do not exist.

- [ ] **Step 3: Add the server-side LINE SSO endpoint**

  Implement `POST /line/login` using the existing `verifyLineIdToken` and `authenticateByLineIdToken` functions. Create a session only after a unique active USERS match; return the stable `LINE_NOT_LINKED` code when no mapping exists. Preserve duplicate and inactive-account rejection.

- [ ] **Step 4: Implement the LIFF client flow**

  Initialize LIFF with the public `liffId` returned by `/api/auth/config`; obtain `liff.getIDToken()`; try `/api/auth/line/login`; on `LINE_NOT_LINKED`, keep the token only in memory while displaying the existing Username/Password login form. After successful password login, call the authenticated `/api/auth/line/link` endpoint with that in-memory token, clear it immediately, then continue through the existing branch-selection flow. If LIFF is unavailable, keep the current Username/Password and hosted LINE OAuth options working.

- [ ] **Step 5: Verify the end-to-end auth flow**

  Run: `node --test test/auth-liff-flow.test.js test/auth-line-link.test.js test/auth-line-login.test.js test/auth-login.test.js`

  Expected: PASS for first-time linking, returning LINE login, legacy password login, and the existing hosted OAuth callback behavior.

- [ ] **Step 6: Commit LIFF SSO**

  ```bash
  git add public/assets/js/auth.liff.js public/assets/js/auth.client.js public/assets/js/auth.link-line.js public/index.html src/modules/auth/auth.routes.js src/modules/auth/auth.service.js test/auth-liff-flow.test.js
  git commit -m "feat(auth): add liff sso for linked staff accounts"
  ```

### Task 4: Make all seven Rich Menu destinations explicit in the SPA

**Files:**
- Modify: `public/assets/js/app.js`
- Create: `public/views/reports.html`
- Create: `public/views/notifications.html`
- Test: `test/nursehub-rich-menu-routes.test.js`
- Test: `test/spa-routes.test.js`

**Interfaces:**
- Register SPA route key `reports` with view `/views/reports.html`.
- Register SPA route key `notifications` with view `/views/notifications.html`.
- Keep the existing five destinations unchanged: `estockscan-session`, `estockscan-dispense`, `temperature-entry`, `equipment`, and `dashboard`.
- Reports and Notifications views are clear, accessible placeholder screens that state the module is not yet available; they must not display fabricated data or imply a working report/notification service.

- [ ] **Step 1: Write failing route tests**

  Add tests asserting all seven route keys exist in the SPA route table, each target view resolves, and Reports/Notifications views contain explicit unavailable/coming-soon messaging rather than sample operational data.

- [ ] **Step 2: Run focused tests and verify they fail**

  Run: `node --test test/nursehub-rich-menu-routes.test.js test/spa-routes.test.js`

  Expected: FAIL because `reports` and `notifications` route targets are not currently registered.

- [ ] **Step 3: Add the two placeholder views and route registrations**

  Add small views using the existing NurseHub visual style; register `reports` and `notifications` without changing any existing route definitions or module APIs.

- [ ] **Step 4: Run focused SPA tests**

  Run: `node --test test/nursehub-rich-menu-routes.test.js test/spa-routes.test.js test/system-navigation.test.js`

  Expected: PASS; all seven Rich Menu destinations resolve through the SPA.

- [ ] **Step 5: Commit the destination routes**

  ```bash
  git add public/assets/js/app.js public/views/reports.html public/views/notifications.html test/nursehub-rich-menu-routes.test.js
  git commit -m "feat(nursehub): add rich menu destination routes"
  ```

### Task 5: Build and publish the seven-area LINE OA Rich Menu

**Files:**
- Create: `scripts/build-line-rich-menu-image.js`
- Create: `scripts/publish-line-rich-menu.js`
- Create: `public/assets/images/line-rich-menu.png`
- Create: `docs/LINE_RICH_MENU_SETUP.md`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.env.example`
- Test: `test/line-rich-menu.test.js`

**Interfaces:**
- `scripts/build-line-rich-menu-image.js` generates `public/assets/images/line-rich-menu.png` at 2500 × 1686 pixels, PNG, with seven tap-area labels laid out as three tiles in the first row, two tiles in the second row, and two tiles in the third row.
- `scripts/publish-line-rich-menu.js` reads `LINE_CHANNEL_ACCESS_TOKEN` and `PUBLIC_BASE_URL`; creates the LINE rich menu, uploads the PNG, and sets it as the default rich menu for all OA users. It prints the returned rich-menu ID but never prints the channel access token.
- Rich Menu areas use these URI destinations: `#estockscan-session`, `#estockscan-dispense`, `#temperature-entry`, `#equipment`, `#dashboard`, `#reports`, and `#notifications` on `PUBLIC_BASE_URL`.
- The LINE Messaging API access token is separate from `LINE_CHANNEL_SECRET` and `LINE_CHANNEL_ID`.

- [ ] **Step 1: Write failing Rich Menu structure tests**

  Add tests asserting the image dimensions and file type, seven non-overlapping tap areas, exact route suffixes, the expected Messaging API endpoints, use of `LINE_CHANNEL_ACCESS_TOKEN`, and absence of secret literals in scripts/docs.

- [ ] **Step 2: Run focused test and verify it fails**

  Run: `node --test test/line-rich-menu.test.js`

  Expected: FAIL because the Rich Menu image and publisher script do not exist.

- [ ] **Step 3: Create the Rich Menu artwork**

  Add `sharp` for deterministic SVG-to-PNG rendering. Build the PNG in the specified dimensions with a mint/teal NurseHub visual style, readable Thai/English labels, clear separators, and the seven agreed menu names. Use the existing project logo only if it is a public brand asset; do not embed credentials or personal information.

- [ ] **Step 4: Implement the LINE Messaging API publisher**

  Create the Rich Menu metadata with seven valid bounds, upload the PNG as image content, then set the created rich-menu ID as the OA default. Fail with an actionable message if any API call fails; do not log authorization headers or tokens. Read the current LINE official Rich Menu API specification before finalizing request payloads.

- [ ] **Step 5: Document safe LINE OA setup and run tests**

  Document the Messaging API channel access token, LIFF/Login channel separation, Rich Menu publish command, expected callback/LIFF URLs, and rollback procedure. Add `LINE_CHANNEL_ACCESS_TOKEN` to `.env.example` as an empty placeholder only.

  Run: `node --test test/line-rich-menu.test.js test/nursehub-rich-menu-routes.test.js`

  Expected: PASS; all seven areas point to registered routes and publisher configuration is validated.

- [ ] **Step 6: Commit Rich Menu assets and publisher**

  ```bash
  git add scripts/build-line-rich-menu-image.js scripts/publish-line-rich-menu.js public/assets/images/line-rich-menu.png docs/LINE_RICH_MENU_SETUP.md package.json package-lock.json .env.example test/line-rich-menu.test.js
  git commit -m "feat(line): publish nursehub seven-item rich menu"
  ```

### Task 6: Verify production deployment and restart persistence

**Files:**
- Modify: `docs/LINE_RICH_MENU_SETUP.md`
- Modify: `README.md` (deployment section only)
- Test: `test/auth-session-persistence.test.js`
- Test: all existing tests under `test/`

**Interfaces:**
- Render web service environment variables: `DATABASE_URL`, `SESSION_SECRET`, `LINE_CHANNEL_ID`, `LINE_CHANNEL_SECRET`, `LINE_LIFF_ID`, `LINE_CHANNEL_ACCESS_TOKEN`, and existing Google Sheets settings.
- Render PostgreSQL provides the database URL; the session store auto-creates `user_sessions` on first startup.
- LIFF endpoint and LINE OAuth callback use the production HTTPS URL; LINE Login callback is `/api/auth/line/callback`.

- [ ] **Step 1: Add an integration test for restart persistence**

  Add an integration test using a disposable PostgreSQL test database: create a session, close/recreate the app session middleware, then assert the same cookie still resolves through `/api/auth/me`; assert logout invalidates it.

- [ ] **Step 2: Run the integration test against the test database**

  Run: `DATABASE_URL=<test-database-url> node --test test/auth-session-persistence.test.js`

  Expected: PASS; the session remains valid after recreating the app process/middleware and is invalid after logout.

- [ ] **Step 3: Run the full existing test suite**

  Run: `npm test`

  Expected: no new failures relative to the recorded baseline; all new authentication, branch, LIFF, SPA route, and Rich Menu tests pass. The current project baseline on 2026-11-15 is 94 passing and 13 failing tests out of 107; those existing failures must be tracked separately and must not be silently attributed to this feature.

- [ ] **Step 4: Verify Render and LINE configuration manually**

  Confirm PostgreSQL connectivity, session table creation, Secure cookie delivery through Render's proxy, login with Username/Password, first-time LINE linking, subsequent LINE login, branch selection, session survival after a Render restart, logout, and all seven Rich Menu actions in LINE.

- [ ] **Step 5: Document production verification and commit**

  ```bash
  git add README.md docs/LINE_RICH_MENU_SETUP.md test/auth-session-persistence.test.js
  git commit -m "test(auth): verify render session persistence and line login"
  ```

---

## Baseline note

The unmodified test suite was run before implementation on 2026-11-15 using `npm test`: **107 tests total, 94 passed, 13 failed**. Preserve this result as the comparison baseline. Investigate the existing failures separately; do not change unrelated modules merely to make this feature plan appear green.
