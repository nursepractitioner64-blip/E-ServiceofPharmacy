# Registration methods update

The login screen's Register button now opens a method chooser:

1. Manual registration: opens the registration form and creates a pending USER without a LINE identity.
2. LINE registration: redirects to the LINE-hosted OAuth page (QR may be offered by LINE on desktop), validates the ID token and nonce on the server, then returns to the details form. A short-lived, one-time opaque registration token is used to complete registration.

Both methods preserve the existing USERS sheet schema and create accounts with STATUS=PENDING, ROLE=USER, and empty BRANCH_IDS. LINE registration stores the verified LINE identity; manual registration leaves LINE fields blank.

Required LINE configuration for the LINE method: LINE_CHANNEL_ID, LINE_CHANNEL_SECRET, and PUBLIC_BASE_URL must be set to the same LINE Login channel and current public HTTPS base URL. Register `${PUBLIC_BASE_URL}/api/auth/line/callback` in the LINE Login channel Callback URL settings. Restart the server after changing environment variables.

The project archive does not include `.env`, service-account credentials, or `node_modules`.
