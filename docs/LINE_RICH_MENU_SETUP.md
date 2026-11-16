# LINE OA Rich Menu – Nurse Station Hub

## Included menu destinations

| Menu | SPA route | Status |
|---|---|---|
| SESSION | `/#estockscan-session` | Existing route |
| DISPENSE | `/#estockscan-dispense` | Existing route |
| TEMPERATURE | `/#temperature-entry` | Existing route |
| EQUIPMENT CHECK | `/#equipment` | Existing route |
| DASHBOARD | `/#dashboard` | Existing route |
| REPORTS | `/#reports` | Placeholder only |
| NOTIFICATIONS | `/#notifications` | Placeholder only |

## Image

`public/assets/images/line-rich-menu.png` is a 2500 × 1686 PNG. The image must remain at or below 1 MB for LINE Messaging API. Tap areas use three equal columns in row one, then two equal columns in each of rows two and three.

## Publish prerequisites

1. Use a LINE Messaging API channel belonging to the same LINE Official Account.
2. Create a channel access token in the LINE Developers Console. This is **not** `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ID`, or the LIFF ID.
3. Set `LINE_CHANNEL_ACCESS_TOKEN` and `PUBLIC_BASE_URL` in the local environment or the deployment environment. `PUBLIC_BASE_URL` must be the public HTTPS URL, with no trailing slash. Never commit `.env` or paste tokens into chat.
4. Confirm the application is deployed and all seven hash routes load on the production domain.
5. Run `node scripts/publish-line-rich-menu.js` from the project root. The script creates a new menu, uploads the PNG, then makes it the default for all OA users. It prints only the returned Rich Menu ID.

## Important behavior

Setting a new default Rich Menu replaces the previous Messaging API default. A per-user Rich Menu has higher display priority and can hide this default. The menu may appear after the user reopens the OA chat.

## Rollback

To remove the Messaging API default, call `DELETE https://api.line.me/v2/bot/user/all/richmenu` with the same channel access token. This removes the Messaging API default; it does not delete the newly created Rich Menu object. To restore an earlier default, set its known Rich Menu ID again using `POST /v2/bot/user/all/richmenu/{richMenuId}`. Do not run rollback unless the previous menu ID is known and the owner approves.

## Tests

Run:

```bash
node --test test/line-rich-menu.test.js test/nursehub-rich-menu-routes.test.js
```

The publish command makes live changes to the LINE OA. Tests do not publish anything.
