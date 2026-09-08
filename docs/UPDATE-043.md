# Dates, presence and read receipts

**Run `supabase/migrations/043_presence_and_read_receipts.sql` FIRST, then push the code.**
The chat ticks and the activity page call functions that migration creates; pushing code first
makes them fail silently.

## 1 · Hijri dates fixed everywhere

**Cause:** 39 calls used `toLocaleDateString('en-SA', …)`. The `SA` region's default calendar is
`islamic-umalqura`, so on real devices every date rendered as a Hijri date. It's an easy one to
miss because the same call resolves to Gregorian in some JS runtimes — it breaks on phones but not
necessarily on a developer machine.

**Fix:** a single module, `src/lib/dates.ts`. Every formatter is built from
`getDate()/getMonth()/getFullYear()`, which are Gregorian by definition and involve no locale
resolution at all. Month names come from a fixed table rather than `Intl`. Identical output on
every device.

House format is **dd/mm/yyyy**. All 39 call sites across 28 files now use it, including the shared
`formatDate` in `components/ui`. Seventeen tests cover it, two of which fail if a Hijri year ever
reappears.

One `toLocaleString('en-SA')` remains and is correct — it formats **currency**, not a date.

## 2 · Users & Activity — HR / Finance / Admin

New page at **HR → Tools → Users & Activity**. Shows every account with:

- a green dot for online now (seen in the last 2 minutes)
- "Last seen 5m ago" / "Last login 25/08/2026 14:30" / "Never signed in"
- role, job title, and a **Setup pending** badge for anyone who hasn't finished onboarding
- filter tabs for All / Online / Never signed in, plus search

Useful right now: it tells you exactly who has acted on the credentials SMS.

Presence comes from a heartbeat that fires every 60 seconds while the app is open and visible, so
it costs nothing while a phone is in someone's pocket.

## 3 · Chat ticks

| Ticks | Meaning |
|---|---|
| ✓ one grey | Sent — stored on the server |
| ✓✓ two grey | Delivered — every recipient has been online since it was sent |
| ✓✓ two blue | Read — every recipient has opened the conversation since |

In a group, ticks only turn blue when **all** members have read it, matching WhatsApp. Read state
reuses `chat_channel_members.last_read_at`, which already existed — no new table.

## 4 · Privacy switches

**Profile → Privacy**, two toggles:

- **Read receipts** — off means others don't see your blue ticks
- **Online status** — off means colleagues can't see when you're online

**HR, Finance and Admin always see presence**, whichever way a user sets these. That's enforced
inside `get_presence()` and `get_user_directory()` on the server, not in the UI, so it can't be
worked around from the browser.

Worth being deliberate about: staff can switch online status off, but it does not hide them from
management. If anyone asks, the honest answer is that the toggle controls what *colleagues* see.
Telling people it's fully private would not be true.
