# Groups (was Channels) — what was broken and what changed

**Run `supabase/migrations/040_group_chat_fixes.sql` FIRST, then push the code.**
The migration is the actual fix; the code alone won't help.

## The one bug behind most of your complaints

A non-admin creating a group got **403 when adding members — including themselves.**
Migration 010 in the repo fixed this, but it was **never applied to the live database**.

So every group you created ended up with **zero members**, and that single fault produced
what looked like several unrelated problems:

- **"Creating multiple groups but only one appears."** The Groups list shows groups you're a
  *member* of. With no membership row, your own group was invisible to you. Confirmed in your
  live data: **`khobar-operations` and `erp` currently have zero members.** Migration 040
  reattaches every stranded group to whoever created it.
- **"Can't tag people."** The @mention list is drawn from group members. No members, nobody to tag.
- Messages in those groups were unreachable for everyone.

Why the policy failed: it was written as `FOR ALL ... USING (employee_id = current_employee_id())`
with no `WITH CHECK`. Postgres then reuses `USING` as the insert check, so the rule
"you can only see your own membership row" silently became "you can only ever add yourself".

## Channels → Groups

The page is now **Groups**, and groups behave like WhatsApp rather than Slack:

| Before | Now |
|---|---|
| Public / Private dropdown | Gone — every group is private to its members |
| "Browse all channels" + Join button | Gone — you're in a group because someone added you |
| Name forced to `lowercase-with-hyphens` | **Free text: capitals, spaces, punctuation** |
| `#channel-name` everywhere | Plain group name |
| No member picker at all | **Searchable member picker, required to create** |
| — | Header shows who's in the group ("Ahmed, Sara and 4 others") |

## Group names

`e.target.value.toLowerCase().replace(/\s+/g,'-')` was rewriting every keystroke — that's why
capitals were impossible. Names are now stored exactly as typed.

**Duplicate names are allowed**, like WhatsApp. Groups are identified internally by id, never by
name, so two groups called "Site Team" are genuinely separate conversations.

## Tagging

- The @ list now offers **only people in that conversation.** Tagging someone who isn't a member
  would notify them about a thread they can't open.
- Mentions are resolved by **the person you picked**, not by first name. Previously
  `@Muhammed` matched whoever appeared first in the employee list — with several staff sharing a
  first name, it tagged the wrong colleague. Typed text is still matched, but only when it maps
  to exactly one member; anything ambiguous falls back to your actual selection.

## Also fixed
Creating a group only refreshed one of the two lists that display groups, so a newly created
group could stay missing until an unrelated refetch. Both are refreshed now.

## After deploying
1. Run migration 040.
2. Push the code.
3. Open Messages → **Groups**. `khobar-operations` and `erp` should be back.
4. Create a group named with capitals and spaces, add two people, and check they can see it.

---

# Follow-up after running 040 — one more fix (code only)

Migration 040 **is applied and worked**: `khobar-operations` now has 4 members, `erp` has 2,
`riyadh-operations` 2. (An earlier reading that said they were still empty was wrong — I checked
as a *manager*, and RLS correctly hides other people's membership rows from managers.)

But creating a group still failed, for a second and separate reason.

## Insert order matters

The policy authorises adding other people via:

```sql
EXISTS (SELECT 1 FROM chat_channels WHERE id = channel_id AND created_by = current_employee_id())
```

That subquery is itself subject to RLS, and `channels_select` only exposes a **private** channel
to its **members**. A brand-new group has no members yet — not even its creator — so the check
fails and every other member in the same statement is rejected.

Measured directly:

| Attempt | Result |
|---|---|
| Add another person before the creator has joined | 403 |
| Creator + members in one batch (**what the app did**) | 400 |
| Creator first, then the others | 201 → **3 members** |

`useCreateChannel` now inserts the creator first, then everyone else in a second call. If some
members can't be added, the group is still created with the creator in it rather than the whole
operation failing.

No further migration is needed — this is a code change only.
