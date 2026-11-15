# NurseHub LIFF + Persistent Session Design

**Status:** Approved by the user on 2026-11-15

## Goal

Enable staff to open NurseHub from the LINE Official Account, link their existing NurseHub account once with Username/Password, and subsequently sign in through LINE without repeatedly entering credentials. Keep the current Google Sheets business data and authorization model intact, persist web sessions across Render restarts and instances, and provide a seven-item LINE OA Rich Menu.

## Architecture

- Google Sheets remains the primary database for users, branches, inventory, clinical/operational records, and all existing business data.
- PostgreSQL is introduced only for persistent web-session storage.
- Use `express-session` with `connect-pg-simple`, backed by the Render PostgreSQL `DATABASE_URL`.
- Preserve the existing `esp_session` cookie name where compatible, the eight-hour session lifetime, the existing authentication API contract, role checks, branch checks, and the existing USERS sheet.
- LINE identity is verified server-side using the LINE Login Channel ID. The verified LINE `sub` is mapped to the existing `USERS.LINE_USER_ID`; LINE identity does not create a second staff account.
- First-time linking requires a successful login to the existing account with Username/Password. Subsequent LINE login resolves the verified LINE identity to exactly one active USERS account.
- Deploy a seven-item Rich Menu for the existing NurseHub destinations. Reports and Notifications are currently placeholders in the project and must remain clearly identified as not-yet-available rather than implying working report/notification features.

## Authentication behavior

1. When opened from LIFF, initialize LIFF using the public `LINE_LIFF_ID` configuration and obtain the LIFF ID token.
2. Send the ID token to the server. The server verifies it against `LINE_CHANNEL_ID` and resolves `sub` to an existing active USERS row.
3. If exactly one active account is linked, create the same server-side session used by Username/Password login.
4. If no account is linked, require Username/Password authentication to the existing account, then link the verified LINE identity to that account. Do not create a duplicate user.
5. Reject duplicate LINE mappings, inactive accounts, invalid tokens, and ambiguous mappings. Never trust a user ID supplied by the browser.
6. Preserve role, assigned branches, current branch selection, and existing middleware enforcement.

## Persistent session behavior

- Session TTL: eight hours.
- Cookie: `esp_session` where compatible; HttpOnly, Secure in production, SameSite=Lax, Path=/.
- Session data and expiration are stored in PostgreSQL, not a process-local Map.
- Sessions survive application restarts and work across multiple application instances.
- Logout destroys the server-side session and clears the cookie.
- Password reset and account deactivation revoke that user's sessions.
- Branch selection and branch-ID remapping continue to update session state.

## Rich Menu

Create one LINE OA Rich Menu with seven tap areas:

1. SESSION → `#estockscan-session`
2. DISPENSE → `#estockscan-dispense`
3. TEMPERATURE → `#temperature-entry`
4. EQUIPMENT CHECK → `#equipment`
5. DASHBOARD → `#dashboard`
6. REPORTS → `#reports` (placeholder until a report center is implemented)
7. NOTIFICATIONS → `#notifications` (placeholder until a notification center is implemented)

The Rich Menu uses the existing public application URL and must be published using the LINE Messaging API. The Messaging API channel access token is separate from LINE Login channel credentials.

## Security and compatibility

- Never put passwords, ID tokens, channel secrets, or session IDs in URLs, browser storage, or logs.
- Verify LINE ID tokens server-side and enforce the configured LINE Login Channel ID.
- Prevent one LINE identity from being linked to more than one staff account.
- Preserve existing API response shapes where practical and keep existing Sheets schemas unchanged.
- Preserve `requireAuth`, `requireAdmin`, `requireBranch`, branch selection, and all existing protected modules.
- Keep secrets in Render environment variables; do not commit `.env` or service-account credentials.

## Deployment requirements

- Add a Render PostgreSQL database and set `DATABASE_URL` and a strong `SESSION_SECRET` on the web service.
- Set the LINE LIFF/Login configuration and the separate LINE Messaging API channel access token for Rich Menu publication.
- Confirm the LINE Login callback URL and LIFF endpoint URL use the production HTTPS application URL.
- Verify cookie behavior behind Render's proxy and test restart persistence before enabling the Rich Menu for all users.
