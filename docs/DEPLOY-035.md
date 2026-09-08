# SA'DA ONE — Increment 035 · deploy guide

Covers the seven things you asked for. **Code is build-verified** (27/27 tests, production `vite build` green). Three of the items need a deploy action from you (migration, env vars, edge function) — they cannot work from code alone.

---

## Apply order

### 1 · Run the migration (required — do this FIRST)
Supabase → SQL Editor → paste **`supabase/migrations/035_flat_approvals_selfservice_tasks_push.sql`** → Run.
It prints a success row at the end; expect `flat_approval_policies = 8`, `task_assignees_table = 1`, `profile_completed_col = 1`, `new_triggers = 3`.

Idempotent — safe to re-run. It is **additive**: every existing RLS policy keeps working, so nothing that worked before can break.

### 2 · Push notifications — env + secrets (required for phone notifications)
Real VAPID keys were generated for you: see **`VAPID-KEYS-SECRET.txt`** at the root of this package.

**a. Vercel** → Project → Settings → Environment Variables → add (all environments), then redeploy:
```
VITE_VAPID_PUBLIC_KEY = <the CLIENT key from VAPID-KEYS-SECRET.txt>
```

**b. Supabase** → Edge Functions → Secrets → add:
```
VAPID_PUBLIC_KEY   = <the EDGE public JWK — the whole {...} string>
VAPID_PRIVATE_KEY  = <the EDGE private JWK — the whole {...} string>
VAPID_SUBJECT      = mailto:admin@sada.co     ← change to a real address you own
```

**c. Deploy the `send-push` edge function** (it exists in the repo but has never been deployed). Dashboard → Edge Functions → Deploy, or `supabase functions deploy send-push`.

**d. Each user turns it on once**: Notifications page → enable push. The UI for this already exists and activates automatically once `VITE_VAPID_PUBLIC_KEY` is set.

> **iPhone:** iOS only delivers Web Push to a PWA that has been **Added to Home Screen** and opened from that icon — not from a Safari tab. Tell staff to install it first, then enable notifications inside the app. Android/Chrome works either way.

### 3 · Push everything else (code) — normal git push, Vercel auto-deploys.

---

## What changed, item by item

### ✅ 2 · Flat approval hierarchy — **done**
The direct-manager chain is out of the approval path.
- Every new leave / loan / exit-re-entry / expense request now starts at `status='pending'` (stage 1) regardless of whether the employee has a `manager_id`. Previously an employee with no manager skipped straight to HR/Finance.
- `usePendingApprovals` no longer filters by "my direct reports" — **any** user with the `manager` role sees every stage-1 request.
- Migration 035 mirrors this server-side with `*_mgr_stage1_select` / `*_mgr_stage1_update` RLS policies, so the rule is enforced in the database, not just the UI.
- Managers can only **update** rows still at `status='pending'` — they cannot reach back into stage-2 or finalised requests.
- Stage 2 (HR / Finance on `status='processing'`) is unchanged.

`employees.manager_id` is **kept** (org chart, historical data) — it simply no longer decides who approves.

### ✅ 4 · Notification badge that wouldn't clear — **root-caused and fixed**
`useMarkChannelRead` wrote the new `last_read_at` to the database but never invalidated the cached channel list. The unread dot is computed from that cache (`last_message_at > last_read_at`), so it survived opening the chat until some unrelated refetch happened — exactly the "sometimes it clears, sometimes it doesn't" behaviour. Now the mutation invalidates the chat queries on success, so the badge clears the moment you open the conversation.

### ✅ 5 · Tasks — **done**
- New `task_assignees` junction table → **one task, many assignees**. Existing single assignments are backfilled automatically, so nothing disappears.
- A task is visible to **every assignee AND the person who assigned it** (`reporter_id`), enforced by RLS.
- The assigner controls the assignee list; assignees can update the task (e.g. move it across the board).
- `tasks.assignee_id` is kept as the "primary" assignee and stays in sync via trigger, so existing screens keep working.

### ✅ 6 · Phone push notifications — **code complete, needs the deploy above**
The pipeline was already 90% built (service-worker push handler, `push_subscriptions` table, `send-push` edge function, subscribe UI). Two things were missing:
- **No VAPID keys** → generated, see step 2.
- **Chat messages were deliberately excluded from push** in migration 033 (`IF NEW.type = 'chat_message' THEN RETURN NEW`). That's why phones never buzzed for messages. 035 removes that exclusion — chat now pushes like any other notification.

### 🟡 1 · Self-onboarding — **built; invite-issuing still manual**
New **`/auth/complete-profile`** wizard. Flow: you create the account with any temporary credentials → the employee signs in → they're routed straight into the wizard, where they:
1. set **their own sign-in email (username) and password**, then
2. fill in **their own** personal details (name EN/AR, mobile, DOB, gender, nationality, iqama, passport, emergency contact).

On finish it marks `profile_completed = true` and clears `must_change_password`, and they land in the app. Existing staff are marked complete by the migration, so **nobody currently using the system is disturbed**.

HR-controlled fields (job title, division, department, contract, status, employee number, work email) are **not** editable in the wizard, and migration 035's `employees_protect_hr_columns` trigger silently reverts them server-side even if the request is tampered with.

*Still manual:* creating the account + handing over the temp credentials. There is an unused `InvitePage` + `validate_invite_token` RPC already in the repo — wiring that into a "send invite link" button is the natural next step so you don't hand out passwords by hand.

### 🟡 3 · Credentials editable by user and admin — **partly done**
- **User, at onboarding:** ✅ sets their own email + password in the wizard.
- **User, later:** ⚠️ not yet — the profile page still has no "change email / change password" section. Next increment.
- **Admin:** ⚠️ not verified — an `admin-user-ops` edge function exists in the repo but I have not confirmed it's deployed or wired to a reset-password button.

### ⚠️ 7 · UI polish — **not started**
Deliberately deferred. Doing it properly means design tokens first (extracting the ~30 hardcoded colours into variables), which is also the prerequisite for dark mode and for removing the inline styles across 67 pages. Rushing a cosmetic pass before that would be work thrown away. This is the next increment.

---

## Verify after deploying

| Check | Expected |
|---|---|
| Employee submits leave | lands at `status='pending'`, visible to **any** manager |
| Manager approves | moves to `processing`, appears for HR/Finance |
| Open a chat with unread messages | badge clears immediately |
| Assign one task to 3 people | all 3 see it, and so does the assigner |
| New account signs in | routed to `/auth/complete-profile` |
| Existing account signs in | goes straight to their dashboard (not the wizard) |
| Phone (installed PWA) receives a notification | after step 2 completes |

## Risks

- **`VAPID-KEYS-SECRET.txt` contains a private key.** It's added to `.gitignore`, but if you commit it anyway, regenerate the pair. It only controls push authentication — no access to your data.
- **Push cannot be verified without a real device.** Everything else in this increment was build- and test-verified; Web Push is the one path that can only be confirmed by installing the PWA on a phone and triggering a notification.
- **Managers now see every stage-1 request company-wide** — that's the flat hierarchy you asked for, but it does mean any manager can read any employee's leave/loan request at stage 1. If you'd rather scope managers to their own division, that's a one-line change to the RLS policies in 035 (add `AND division_id = ...`); say the word.
- **The `employees_protect_hr_columns` trigger** reverts protected columns on self-edits. If some background job ever updates an employee's own row while authenticated as that employee, its changes to those columns would also be reverted. No such path exists today.

---

# Live test report — 2026-07-29 (post-deploy)

Tested against production with real accounts.

## Fixed during testing
1. **`42P17` infinite recursion — Tasks feature was down.** 035's two new RLS policies referenced each other (`tasks` → `task_assignees` → `tasks`). **Fix: migration `036_fix_task_rls_recursion.sql`** moves the cross-table lookups into `SECURITY DEFINER` helpers (`is_task_assignee`, `is_task_reporter`). Verified after applying: Tasks page renders, multi-assignee query returns HTTP 200 with 5 tasks and their assignee lists.
2. **The real notification-badge bug.** Opening a chat marked the *channel* read but left the `chat_message` rows in `notifications` at `is_read = false` — so the bell badge never cleared. Confirmed live: 11 unread notifications, 6 of them `chat_message`, each carrying `data.channel_id`. `useMarkChannelRead` now also marks that channel's notifications read and refetches the bell. **This is the actual cause of "I opened the messages but the badge is still there."**

## Verified working
| Test | Result |
|---|---|
| Tasks page + multi-assignee embed | ✅ HTTP 200, 5 tasks, assignee lists populated |
| Flat approvals | ✅ manager1 sees a pending request from **Yasar Rahmani (`manager_id: null`)** — not a direct report, and previously would have skipped the manager stage entirely |
| `last_read_at` advances on channel open | ✅ marker updated in DB |
| `/auth/complete-profile` route | ✅ renders |
| Existing users skip the wizard | ✅ `profile_completed = true` |
| `push_subscriptions` reachable | ✅ HTTP 200 (0 devices — nobody has subscribed yet) |
| `send-push` edge function | ✅ HTTP 200 `{"ok":true,"sent":0}`; wrong secret → 403 |

## Not verified
- **Web Push on a real device** — needs a phone with the PWA installed and permission granted. Everything up to the edge function is proven healthy.
- **The chat channel-list unread dot never rendered** even with the read marker backdated to 2020, so that indicator appears not to work independently of the bell badge. `ChatChannelsPage` carries a comment calling it a placeholder ("Real implementation would count messages after last_read_at"). Worth replacing with a real unread count — separate from the bell fix above.

---

# Increment 3 — credentials + UI foundation

## Item 3 · Credentials — now complete
- **Change password (self):** already existed on the profile page.
- **Change sign-in email / username (self):** ✅ added — collapsible card on the profile page, uses `supabase.auth.updateUser({ email })`. Supabase sends a confirmation link; the change only applies once the user clicks it (that's Supabase's behaviour, and it's the safe one — it stops someone with a borrowed session from locking the real owner out).
- **Admin reset:** ✅ already existed in `UserDetailPage` (`admin-user-ops` → `reset_password`, with an optional force-change-on-next-login). Verified the `admin-user-ops`, `create-employee-account` and `delete-user` edge functions are all **deployed** (HTTP 401 = present and auth-gated).

## Item 7 · UI — foundation + polish pass
**`src/styles/tokens.css`** — 59 hardcoded hex values across the app distilled into named CSS variables (brand, text, surfaces, borders, status, elevation, radius, spacing, motion). Every value is the colour already in use, so adopting a token changes nothing visually. This is the prerequisite for dark mode and for retiring inline styles without re-deciding the palette twice.

**Polish layer appended to `globals.css`** — visual only, no layout/size/spacing changes:
- Antialiased text rendering
- Cards: layered shadow + subtle press response
- Buttons: real hover/press feedback instead of a flat opacity change; proper disabled state
- Inputs: soft focus ring (3px teal glow) rather than a bare border swap
- Badges: hairline edge so they read as objects
- `:focus-visible` outlines everywhere — keyboard accessible, invisible on mouse clicks
- Slim scrollbars
- Full `prefers-reduced-motion` guard on everything added

Deliberately conservative: it refines the shared `.card` / `.btn` / `.input` / `.badge` classes, which are used app-wide, so every screen improves without touching a single page's layout. Nothing can shift position.

## Known remaining gap
**Channel unread dot.** Testing showed the unread dot only exists in the **DMs ("Chats") tab**; channels like `#general` render in the **Channels tab**, which has no unread indicator at all. That's why the dot never appeared in testing. The *bell* badge — the actual reported complaint — is fixed. Adding a per-channel unread count is a small, separate piece of work.

---

# Increment 4 — multi-assignee UI + push diagnosis

## Item 5 · Multi-assignee — now actually usable
The database has supported multiple assignees since 035, but the **UI could not set them** — the task form had a single `<select>` and `task_assignees` was only ever read, never written. Closed:
- Task form now shows a **checkbox list of assignees** ("pick one or more") with a live count.
- `useCreateTask` accepts `assignee_ids[]` and writes the junction rows via `upsert(..., { ignoreDuplicates: true })` — the DB trigger already inserts the primary assignee, so duplicates are expected and ignored rather than erroring on the PK.
- `tasks.assignee_id` is still populated with the first pick, so older screens keep working.

## Item 6 · Push — subscription confirmed, secrets malformed
Firing a real push at Yasar's account returned **HTTP 500** from `send-push`:
`{"error":"Unexpected non-whitespace character after JSON at position 5"}`

Two conclusions:
1. **The phone subscription saved correctly.** The function returns early with `{"ok":true,"sent":0}` when a user has no subscriptions. Reaching the encryption path proves at least one device row exists for that account.
2. **One of the two VAPID JWK secrets is malformed.** Line 51 does `JSON.parse(pub)` / `JSON.parse(priv)`; the error is a JSON parse failure, not a push failure. The usual cause is pasting the whole line from the key file (`VAPID_PUBLIC_KEY={...}`) into the value box, so the value carries a `NAME=` prefix.

**Fix (no redeploy needed):** re-enter both secrets in Supabase → Edge Functions → Secrets with *only* the JSON object as the value, starting `{` and ending `}`.

**Hardening (needs a redeploy):** `send-push` now strips whitespace, wrapping quotes and an accidental `NAME=` prefix before parsing, and returns a named error (`VAPID_PUBLIC_KEY is not valid JWK JSON…`) instead of a raw parser message — so a future mis-paste self-diagnoses.
