# SA'DA ONE — 12-item change set

**Run `supabase/migrations/039_suggestions_author_task_history.sql` FIRST, then push the code.**
Items 2, 6 and 7 depend on new columns; pushing code first breaks task deletion and suggestions.

| # | Request | Status |
|---|---|---|
| 1 | Remove Recognition + Training from homepage | ✅ |
| 2 | Admin sees who submitted each suggestion | ✅ (see note) |
| 3 | Remove Payslips entirely | ✅ |
| 4 | Leave: annual, emergency, Hajj/Umrah only | ✅ (see note) |
| 5 | Manager can assign tasks to another manager | ✅ real bug found |
| 6 | Tasks can be deleted by managers | ✅ real bug found |
| 7 | History of completed / open / deleted tasks | ✅ new page |
| 8 | Keyboard closes after every character | ✅ real bug found |
| 9 | Notification permission prompts automatically | ✅ |
| 10 | Chat opens on last-used tab, defaults to Chats | ✅ |
| 11 | Search box in the assignee picker | ✅ |
| 12 | Full app review | see REVIEW section |

## Three real bugs found while doing this

**8 · Keyboard dismissing after each character.** The onboarding wizard defined its `Row`
field-wrapper *inside* the component body. React treats a function declared during render as a
brand-new component type each time, so every keystroke unmounted and remounted the `<input>` —
which drops focus and closes the phone keyboard. `Row` now lives at module scope. (The same bug
had already been found and fixed in `AddEmployeePage`; its warning comment is still in the file.)

**5 · Only the first assignee ever saw a task.** `useMyTasks` filtered on
`assignee_id` (the legacy single column) and `reporter_id` — it never consulted the
`task_assignees` table. Since task creation writes the first person picked into `assignee_id`,
everyone *after* the first was invisible. Assigning a second manager genuinely did nothing.
The query now includes tasks reached through the junction table.

**6 · Deletion was silently impossible.** `tasks` had SELECT, INSERT and UPDATE policies but
**no DELETE policy**. Under RLS a missing policy denies the operation, and PostgREST reports
success with zero rows affected — so the button worked, the toast appeared, and the task stayed.
Deletion is now a **soft delete** (`deleted_at`), which is what makes item 7's history possible;
managers, HR and the task's creator can delete, and management can restore from history.

## Notes on two judgement calls

**2 · Suggestions were anonymous by design.** The original schema carries the comment
`-- NO employee_id — fully anonymous`, and the screen told staff *"Suggestions are 100%
anonymous. No identifying information is stored."* Attribution is now recorded as you asked,
and the employee-facing copy was rewritten to say their name is shared with management.
Recording identity while still promising anonymity was the one outcome that couldn't ship.
Suggestions submitted before this change stay unattributed and display as
*"Anonymous (before tracking)"* — they genuinely cannot be traced.
Worth knowing: people report harassment and pay problems through channels like this, and
attribution tends to reduce that traffic. If you want both, the clean answer is a checkbox
letting the submitter choose — say the word and I'll add it.

**4 · Sick leave was kept.** You asked to remove maternity, paternity and unpaid — all three
are gone. Sick leave wasn't in that list, and it's a statutory entitlement under Saudi labour
law (Article 117), so removing it would create a compliance problem. Tell me if you want it
gone anyway.

## Item 9 · How the notification prompt behaves
A card appears a couple of seconds after sign-in; tapping **Enable** triggers the browser
permission request. It is deliberately not a bare auto-request: iOS Safari only grants
permission from a user gesture, and in Chrome a dismissed auto-request is permanent —
one tap preserves the second chance. "Not now" snoozes it on that device.
