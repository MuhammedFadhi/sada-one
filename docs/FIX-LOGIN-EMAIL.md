# "Load failed" / can't sign in — cause and fix

## What was actually wrong

Koyamu's sign-in worked the moment his **login email** was corrected. He can now sign in:

```
koyamu@sadawater.com  /  SadaTemp#2026
```

Change that password once he's in.

## Why resetting his password kept failing

Two different email fields, and only one of them controls sign-in:

| Field | Where it lives | What it does |
|---|---|---|
| `employees.work_email` | your database | the address shown in the app |
| auth email | `auth.users` (Supabase Auth) | **the address you actually sign in with** |

Editing an employee's email in the admin screen only changed the first one. The login address
stayed whatever it was when the account was created. So you were handing him an address that had
no account behind it — and Supabase answers that with "Invalid login credentials", exactly the
same message as a wrong password. Resetting the password again could never fix it, because the
password was being set on an account reachable at a *different* address.

Proof from the live system: resetting his password returned `{"ok":true}`, and sign-in still
failed for both candidate addresses. Syncing the auth email made it succeed immediately.

## About the "Load failed" message

That one is separate and not a sign-in failure at all — it's Safari's wording for a network
request that never completed (weak signal, or the phone dropping the connection; the screenshot
shows 5G and 13% battery, and iOS Low Power Mode throttles background connections). The app
displays whatever the browser reports, so a dead connection surfaces as "Load failed".

Worth doing regardless: the app should say something clearer like *"Can't reach the server —
check your connection"* instead of passing the browser's raw text through. Say the word and
I'll add that.

## Fixed going forward

`UserDetailPage` now calls `admin-user-ops → update_email` whenever you change an employee's
email, so the login address moves with it. If that call fails, the toast now says so explicitly
("Details saved, but the sign-in email could NOT be changed… they must keep using X") rather
than reporting a clean success.

## Check whether anyone else is affected

Run **`supabase/introspection/find_broken_logins.sql`** in the SQL editor. It lists every
employee whose shown email differs from their real login address, plus a summary count. Anyone
marked `MISMATCH` cannot sign in with the address you'd read off their profile.

To repair them, open each one in Admin → Users, re-save their email (the new code syncs it), then
reset their password. If there are many, tell me the count and I'll write a bulk script instead.
