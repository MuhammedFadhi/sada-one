# SA'DA ONE — Edge Functions

Three serverless functions. They are OPTIONAL — the app works fully without them,
but they unlock: creating login accounts for new employees, two-factor auth, and push notifications.

## What each does
- **create-employee-account** — HR clicks "Create Login" on an employee → makes a Supabase
  auth user + linked profile + temp password (employee changes it on first login).
- **verify-2fa** — validates a 6-digit authenticator code when a user has 2FA turned on.
- **send-push-notification** — stores in-app notifications (the bell icon) and, if push keys
  are configured, sends web push to installed PWAs.

## Deploy (browser-only, no terminal needed)
You don't need these to use the app. When you're ready:

1. Supabase Dashboard → **Edge Functions** → **Deploy a new function**
2. Name it exactly `create-employee-account` (then repeat for the other two)
3. Paste the contents of each `index.ts`
4. Set the secret: Edge Functions → **Manage secrets** → add
   `SUPABASE_SERVICE_ROLE_KEY` = your service_role key (Settings → API)
   (`SUPABASE_URL` is provided automatically.)
5. (Push only, optional) add `FCM_SERVER_KEY` for web push.

That's it. The app auto-detects them.
