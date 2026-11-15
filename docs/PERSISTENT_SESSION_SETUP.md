# Persistent PostgreSQL Sessions

## Runtime configuration

The application uses Google Sheets as its business-data store. PostgreSQL is used only for Express authentication sessions.

Configure these Render Web Service environment variables:

- `DATABASE_URL`: the PostgreSQL **Internal Database URL** from the Render database's Connect page.
- `SESSION_SECRET`: a random secret with at least 32 characters.
- `NODE_ENV=production` (Render normally sets this for production services).

Do not commit `.env`, database URLs, service-account JSON, or private keys.

## Session behavior

- Express cookie name: `esp_session`
- PostgreSQL table: `user_sessions` (created automatically by `connect-pg-simple`)
- Session lifetime: 8 hours, rolling on activity
- Cookie: HttpOnly, SameSite=Lax, Secure in production
- Login regenerates the session ID.
- Logout destroys the server-side session.
- Disabling an account or changing its password revokes its stored sessions.
- Branch changes update the corresponding persistent session records.

## Deploy verification

1. Deploy this version to Render after setting `DATABASE_URL` and `SESSION_SECRET`.
2. Check Render Logs for startup errors.
3. In the PostgreSQL database, verify that `user_sessions` exists.
4. Log in through the normal username/password flow and confirm `esp_session` is set.
5. Call `/api/auth/me`; it should return the logged-in user.
6. Restart the Web Service and call `/api/auth/me` again with the same browser session. The user should remain logged in.
7. Log out and confirm `/api/auth/me` returns HTTP 401.

Do not paste connection strings, session secrets, cookies, or LINE tokens into chat or commit them to Git.
