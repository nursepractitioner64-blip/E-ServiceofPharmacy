# NurseHub LINE SSO implementation progress

**Working source:** `E-ServiceofPharmacyVer4_1.zip`  
**Feature branch:** `feature/nursehub-line-sso-persistent-session`

## Completed in this working copy

- Added `src/config/postgres.js` with a required `DATABASE_URL`, shared `pg.Pool`, and explicit pool shutdown.
- Added `src/config/session.js` using `express-session` and `connect-pg-simple`, the `user_sessions` table, eight-hour TTL, `esp_session` cookie, HttpOnly, SameSite=Lax, and Secure in production.
- Configured Express to trust the Render proxy and mount persistent session middleware before `/api` routes.
- Added empty environment placeholders in `.env.example`; no credentials are included.
- Added `test/session-config.test.js`; all 3 focused tests pass.

## Verification

- Uploaded Ver4.1 baseline: 107 tests, 93 passing, 14 failing.
- Current working copy: 110 tests, 96 passing, 14 failing.
- The 3 added tests pass. The 14 pre-existing failures remain; they are not attributed to this change.

## Blocker before continuing

The environment could not reach `registry.npmjs.org` and the npm cache does not contain `express-session`, `connect-pg-simple`, or `pg`. Therefore `package-lock.json` could not be regenerated and the new middleware could not be runtime-tested here. The dependency versions are declared in `package.json`; run `npm install` in a network-enabled project environment to generate and commit the lockfile before deployment.

## Not yet implemented

- Migration of `auth.service.js` from its in-memory `Map()` to `req.session` and persistent session revocation/remapping.
- LIFF SSO client flow and `/api/auth/line/login`.
- Reports/Notifications SPA placeholder routes.
- Rich Menu artwork/publisher and production verification.

No Render deployment or LINE OA publication has been performed.
