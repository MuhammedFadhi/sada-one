# SA'DA ONE v2 — changes applied (Phase 1 + Phase 2 tests + CI)

This is **your v2 codebase with my Phase-1 and Phase-2-tests changes already merged in and build-verified.** Not a diff to hand-apply — extract it over your repo (or replace the repo), review the git diff, commit, deploy.

## Verified in this session (real artifacts, not claims)
- `npm install` → clean (765 packages).
- `npm run test` → **27/27 passing** against your actual `src/lib/geo.ts`, `src/lib/labels.ts`, `StatusBadge`.
- `npm run build` (production `vite build`) → **✓ built in ~11s**, all 67 pages compiled, PWA service worker generated. Your app still builds with these changes in it.

## What changed vs. your v2

**Added (new files)**
- `sada-hr/src/lib/labels.ts` — enum→human-label map (`on_leave`→"On Leave", `hr_officer`→"HR Officer", unmapped values fall back to title-case, never raw).
- `sada-hr/vitest.config.ts`, `sada-hr/src/test/setup.ts` — test harness.
- `sada-hr/src/lib/labels.test.ts`, `sada-hr/src/lib/geo.test.ts`, `sada-hr/src/components/ui/StatusBadge.test.tsx` — 27 tests (enum contract + the attendance geofence gate incl. the 75 m GPS-slack cap that blocks spoofed-accuracy bypass).
- `.github/workflows/ci.yml` (**repo root — one level above `sada-hr/`; GitHub only runs workflows from there**) — runs `npm install && npm run test` on every push/PR.

**Edited (in place)**
- `sada-hr/src/components/ui/index.tsx` — `StatusBadge` humanizes via `statusLabel()`.
- `sada-hr/src/pages/employee/ProfilePage.tsx` — removed the no-op language `<select>`; Contract/Status/Role now humanized; removed the Language display row.
- `sada-hr/src/pages/admin/UserDetailPage.tsx` — removed the Language display row.
- `sada-hr/vercel.json` — added a **Report-Only** CSP header (your 4 existing headers preserved).
- `sada-hr/package.json` — added 5 test devDeps + `test`/`test:watch` scripts.
- `sada-hr/package-lock.json` — regenerated **in sync** with the new `package.json` (additive: test deps only) and build-proven, so Vercel's install can't break on a mismatch.

**Untouched:** all 67 pages except the two above, your `supabase/migrations/`, `migrations/`, everything else.

**Excluded from this package:** `sada-hr/.env` (secrets — you have your local copy; `.env.example` kept).

## Do this
1. Extract over your repo → **review the git diff** (this is the safe checkpoint) → commit → push. Vercel deploys; GitHub Actions runs the tests.
2. **Flip CSP to enforcing after checking:** deploy, open the live app across roles with DevTools; if there are no `[Report Only] Refused to…` logs, rename the header key in `vercel.json` from `Content-Security-Policy-Report-Only` → `Content-Security-Policy` and redeploy. If anything is flagged, send me the lines.

## Correction to my earlier Phase-1 advice
You **already have** `supabase/migrations/` (001→034+). My Phase-1 note said to *create* one — wrong, you have migration hygiene. So `supabase/introspection/schema_baseline.sql` isn't a bootstrap; it's a **drift-check** — run it in the Supabase SQL editor and diff the Section-Z JSON against what your accumulated migrations imply, to catch anything applied out-of-band.

## Reference (in `docs/` and `supabase/introspection/`)
- `docs/PHASE-1-README.md` — full Phase-1 detail (icon false-positive evidence, CSP rationale, enum sites).
- `docs/PHASE-2-3-PLAN.md` — roadmap: every remaining Phase 2/3 item flagged 🟢 build-now / 🟡 code-now-you-configure / 🔴 blocked-on-your-input, with sequence.
- `supabase/introspection/schema_baseline.sql` — the drift-check query.

---

## Live QA sweep — 2026-07-23 (findings & fixes)

Swept the live deployment across **all five roles and every panel** (employee ×20 pages, manager, HR, Finance, Analytics, admin ×10), plus detail pages, via authenticated session walking + network/console/CSP inspection. Navigation + reads + form-opens only — no destructive writes against production.

### Fixed (build-verified: 27/27 tests, production build green)
1. **Employee File page was fully broken (HTTP 300).** `useEmployee` in `src/hooks/useData.ts` embedded `department:departments(*)` and `salary:employee_salaries(*)` without FK hints. Both have two relationship paths to `employees` (`departments.manager_id`→employees; `employee_salaries.created_by`→employees), so PostgREST returned **300 Multiple Choices** → every employee file errored. Fixed by hinting both: `departments!department_id` and `employee_salaries!employee_id`. **Live-verified**: unhinted → 300, fully-hinted → 200 with data.
2. **Raw enum `On_leave` in the Employees filter tabs.** `EmployeesPage` rendered the raw `STATUS_FILTERS` value with CSS `capitalize` (which doesn't touch underscores). Now routed through `statusLabel()` → "On Leave", "Active", "Suspended", "Offboarding".
3. **CSP logged an error on every page.** `upgrade-insecure-requests` is ignored in a Report-Only policy (browser logs it). Removed from the Report-Only header — it belongs only in the enforcing policy. Cleans the console you check before the enforce-flip.
4. **Deprecated meta tag.** Added the standard `<meta name="mobile-web-app-capable">` alongside the legacy `apple-` one.

### Verified NON-issues (checked, no fix needed)
- **`/chat` first-load flash of "Couldn't load"** — transient; react-query retries and the page renders fine on a settled load. All chat REST calls return 200.
- **Login buttons are `type="submit"`** — there is no `<form>` element, so they can't submit anything. Cosmetic only (ideally `type="button"`).

### CSP enforce-readiness (good news)
Across the entire sweep the `securitypolicyviolation` listener caught **zero** violations — including the WorkSites OpenStreetMap iframe (frame-src) and chat realtime `wss` (connect-src). Once fix #3 is deployed and the console is confirmed clean, the CSP is safe to flip from Report-Only to enforcing.

### Follow-up items — now resolved
- **Manager "9+" Approvals badge → NON-ISSUE.** Root-caused in source: it's the notification bell (`HeaderActions.tsx`: `unread > 9 ? '9+' : unread`), and manager1 had 11 unread. The actual Approvals badge uses the same team-scoped `usePendingApprovals()` hook as the Approvals page and correctly rendered nothing. The flattened-text capture placed the bell's "9+" next to "Approvals". No fix needed.
- **`finance1` swept in isolation → clean.** Every Finance + HR page renders; the only errors were the already-fixed employee-file 300 and the `On_leave` enum. **Authorization verified correct**: `finance1` → `/admin` is blocked (`/unauthorized`, "Access Denied"). Zero CSP violations. No finance-specific RLS problems.

### Still deliberately not run
- **Destructive/write function tests** (creating/approving/sending/deleting) against production data.
- Chat room (`/chat/:channelId`), task/project detail, and role-detail pages were not deep-tested (empty for test data / low risk).
