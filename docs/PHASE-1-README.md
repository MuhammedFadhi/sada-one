# SA'DA ONE — Phase 1 Remediation Pack

Apply order below is safe. Everything is browser-only (GitHub web editor → Vercel auto-deploy; SQL in Supabase SQL editor). No file overwrites the whole app — all edits are surgical.

| # | Phase 1 item | Status | What to do |
|---|---|---|---|
| 1 | Fix icon rendering | **No fix needed — false positive** | Read §1, do the 5-second self-check |
| 2 | Baseline DB schema + migrations | **Partial (browser limit)** | Run `baseline_schema_introspection.sql`, commit the JSON snapshot; §2 |
| 3 | Add a Content Security Policy | **Ready** | Replace `vercel.json`; §3 |
| 4 | Remove language selector | **Ready** | 3 surgical edits; §4 |
| 5 | Humanize enum values | **Ready** | Add `labels.ts` + patch `StatusBadge` + ProfilePage; §5 |

---

## §1 — Icons: nothing is broken (verified)

The earlier "icons render as CJK/Arabic glyphs" report is a **measurement artifact**, not a real bug. Evidence gathered this session against the **live** deployment:

- The Tabler webfont **is loaded** (`document.fonts.check('22px "tabler-icons"') === true`) and the woff2 returns HTTP 200.
- `.ti { font-family: tabler-icons !important }` is applied and each icon's `::before` inherits it (verified on a real `<i class="ti ti-pencil">`).
- The built CSS codepoints are **correct**: `.ti-user-cog` → U+F9D4, `.ti-home` → U+EAC1 (exactly the Tabler source values). Vite did not corrupt them.
- **Canvas pixel test** (rendered each codepoint in the Tabler font vs. a fallback vs. a known-absent glyph):

  | codepoint | Tabler font | serif fallback | absent (U+FFFF) |
  |---|---|---|---|
  | U+F9D4 user-cog | **471 ink px** | 642 px | 0 px |
  | U+EAC1 home | **595 ink px** | 460 px | 0 px |

  The Tabler render differs from both the fallback **and** the blank box → the font contains a real, distinct glyph at each codepoint → **the icons paint correctly**.

**Why the a11y tree looked wrong:** the accessibility tree exposes the `::before` *codepoint* as text. U+F9D4/U+F9C3 live in the Unicode **CJK-Compatibility** block and U+EAC1 in the Private-Use Area, so in plain a11y text they *display* as 倫/遼 or blank — which is exactly what a **working** icon font looks like when read as text rather than rendered. Same class of false positive as the earlier chat-notification "bug."

**Your 5-second confirmation:** open the live app and look at the nav — the icons are there. (Or paste this in DevTools console for the same canvas proof:)

```js
(() => {
  const ink = (ch, font) => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d');
    x.font = `40px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(ch, 32, 32);
    const d = x.getImageData(0, 0, 64, 64).data;
    let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 10) n++;
    return n;
  };
  console.log('user-cog → tabler:', ink('\uF9D4', '"tabler-icons"'),
              ' serif:', ink('\uF9D4', 'serif'), ' (different numbers = icon renders)');
})();
```
Different numbers = the glyph is real. **Do not ship an icon "fix" — there is nothing to fix.** If icons genuinely look broken *on your device*, that's new information (a font-load race on first paint, or a device/browser quirk) — tell me and I'll chase that specific case.

---

## §2 — Schema baseline (Item 2)

**File:** `baseline_schema_introspection.sql`

1. Supabase → SQL Editor → paste the whole file → Run.
2. Sections A–G are for human review (columns, constraints, RLS policies, indexes, functions, enums, triggers).
3. **Section Z** returns one JSON row = the full structural snapshot. Export it and commit to the repo:
   ```
   supabase/baseline/schema-snapshot-2026-07-23.json
   ```
4. Re-run after any schema change (or monthly) and **diff the JSON** — that diff *is* your change log until real migrations exist.

**Honest limit (browser-only):** this captures *structure* (tables, columns, types, constraints, RLS, indexes, functions, triggers, enums). It is **not** a `pg_dump` — no sequence values, grants, row data, or Supabase-managed `auth`/`storage` internals. A true portable dump needs DB creds:
- Dashboard → Project Settings → Database → **Connection string**, then locally `pg_dump --schema-only`, **or**
- `supabase link` + `supabase db pull` once you have CLI access on any machine.

**Migration hygiene going forward** (stops drift):
- Create `supabase/migrations/` in the repo. Every schema change becomes a timestamped `.sql` file committed *before* it's run in the dashboard.
- Name pattern already in your history: `NNN_description.sql` (you have 034/035/037/038). Keep that.
- Rule: **no schema change lands in the dashboard without a matching committed migration file.** The JSON snapshot from Section Z is the safety net that catches anything applied out-of-band.

---

## §3 — Content Security Policy (Item 3)

**File:** `vercel.json` — replace your current one with this (it preserves all four existing headers and adds the CSP).

Shipped as **`Content-Security-Policy-Report-Only`** on purpose: it does **not** enforce, it only logs violations to the browser console. Zero white-screen risk on the PWA. Every external origin the app actually uses is allowlisted:

- `fonts.googleapis.com` (Inter CSS) → `style-src`; `fonts.gstatic.com` (Inter files) → `font-src`
- `psjcmitxouzwtljrlucv.supabase.co` → `connect-src` (https + `wss` for realtime), `img-src` (storage)
- `www.openstreetmap.org` → `frame-src` (WorkSites map iframe)
- Tabler webfont + app icons are self-hosted → covered by `'self'`
- `style-src` includes `'unsafe-inline'` — **required** (Radix + the app's inline styles). Removing it is a Phase-2 nonce task.

**Rollout:**
1. Deploy this `vercel.json`.
2. Use the live app across roles for a few minutes with DevTools open. Watch for `[Report Only] Refused to…` messages.
3. **If the console is clean:** flip enforcement by renaming the header key in `vercel.json`:
   `"Content-Security-Policy-Report-Only"` → `"Content-Security-Policy"`, redeploy. Done.
4. **If something is flagged:** paste the violation lines to me and I'll widen the exact directive. Don't enforce until clean.

---

## §4 — Remove the language selector (Item 4)

The Language preference is a **no-op** (there is no i18n yet — that's Phase 3). Remove the control and its two display rows so users don't see a setting that does nothing. Storing `language_pref` is harmless and left intact for when i18n lands.

### 4a · `src/pages/employee/ProfilePage.tsx` — remove the selector in the Edit sheet
**Find:**
```tsx
          <div className="form-label">Language</div>
          <select className="input" value={form.language_pref} onChange={e=>setForm(f=>({...f,language_pref:e.target.value}))} style={{marginBottom:16}}>
            <option value="en">English</option>
            <option value="ar">العربية</option>
          </select>
          <Button variant="primary" fullWidth loading={saving} onClick={saveProfile}>
```
**Replace with:**
```tsx
          <Button variant="primary" fullWidth loading={saving} onClick={saveProfile}>
```

### 4b · `src/pages/admin/UserDetailPage.tsx` — remove the Language display row
**Find:**
```tsx
          {label:'Last Login', value:user.last_login_at?new Date(user.last_login_at).toLocaleString('en-SA'):'Never'},
          {label:'Language',   value:user.language_pref==='ar'?'العربية':'English'},
          {label:'Created',    value:new Date(user.created_at).toLocaleDateString('en-SA',{day:'numeric',month:'short',year:'numeric'})},
```
**Replace with:**
```tsx
          {label:'Last Login', value:user.last_login_at?new Date(user.last_login_at).toLocaleString('en-SA'):'Never'},
          {label:'Created',    value:new Date(user.created_at).toLocaleDateString('en-SA',{day:'numeric',month:'short',year:'numeric'})},
```

(The ProfilePage "Language" *display* row is removed together with the enum patch in §5b, since they're adjacent.)

---

## §5 — Humanize enum values (Item 5)

Root problem: some screens show raw enums (`on_leave`, `annual`, `hr_officer`), others use ad-hoc inline `capitalize` + `.replace(/_/g,' ')`. Fix once with a shared label module, then swap the highest-visibility call sites. `StatusBadge` is the single biggest lever — it's used app-wide for every status pill.

### 5a · Add the new file
Create **`src/lib/labels.ts`** with the contents of `labels.ts` in this pack. (`@/lib` already resolves to `src/lib` — verified.)

### 5b · Patch `StatusBadge` in `src/components/ui/index.tsx`
**Add** to the import block at the top (right after the `@radix-ui/react-dialog` import):
```tsx
import { statusLabel } from '@/lib/labels'
```
**Find:**
```tsx
  const cls = badgeStyles[status] ?? 'badge-dark'
  return <span className={clsx('badge', cls)}>{label ?? status.replace(/_/g, ' ')}</span>
```
**Replace with:**
```tsx
  const cls = badgeStyles[status] ?? 'badge-dark'
  return <span className={clsx('badge', cls)}>{label ?? statusLabel(status)}</span>
```
That one change humanizes every `<StatusBadge>` across all roles.

### 5c · Patch `src/pages/employee/ProfilePage.tsx` (humanize + drop the Language display row)
**Add** to the imports (right after `import { supabase } from '@/lib/supabase'`):
```tsx
import { statusLabel, roleLabel, contractTypeLabel } from '@/lib/labels'
```
**Find (block 1 — "Details" card):**
```tsx
          {label:'Contract Type',  value:emp?.contract_type?.replace(/_/g,' ')??'—'},
          {label:'Division',       value:emp?.division?.name_en??'—'},
          {label:'Status',         value:<span className={`badge badge-${emp?.status==='active'?'success':'warning'}`}>{emp?.status}</span>},
```
**Replace with:**
```tsx
          {label:'Contract Type',  value:contractTypeLabel(emp?.contract_type)},
          {label:'Division',       value:emp?.division?.name_en??'—'},
          {label:'Status',         value:<span className={`badge badge-${emp?.status==='active'?'success':'warning'}`}>{statusLabel(emp?.status)}</span>},
```
**Find (block 2 — "Account" card; also removes the no-op Language row):**
```tsx
          {label:'Role',           value:<span className="badge badge-info" style={{textTransform:'capitalize'}}>{profile?.role?.replace(/_/g,' ')}</span>},
          {label:'Language',       value:profile?.language_pref==='ar'?'العربية':'English'},
          {label:'Last Login',     value:profile?.last_login_at?new Date(profile.last_login_at).toLocaleDateString('en-SA',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'},
```
**Replace with:**
```tsx
          {label:'Role',           value:<span className="badge badge-info">{roleLabel(profile?.role)}</span>},
          {label:'Last Login',     value:profile?.last_login_at?new Date(profile.last_login_at).toLocaleDateString('en-SA',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—'},
```

### 5d · Remaining sites (optional, mechanical)
`StatusBadge` + ProfilePage cover the highest-visibility displays. To find any other raw-enum renders and migrate them to the helpers (`statusLabel`, `roleLabel`, `leaveTypeLabel`, `requestTypeLabel`, `contractTypeLabel`, `urgencyLabel`, `loanTypeLabel`, `genderLabel`, or generic `label`):
```bash
grep -rn "replace(/_/g" src --include=*.tsx
grep -rn "textTransform:'capitalize'" src --include=*.tsx
```
Each hit is a candidate: replace the inline transform with the matching helper. Safe to do incrementally — the helpers fall back to `humanize()` so nothing regresses.

---

## Risks & assumptions

- **Icons:** Verified via canvas pixel test on the live build that the font is loaded and contains distinct glyphs at the exact codepoints in use — so they render. The one residual: this proves steady-state rendering, not a possible first-paint font-load flash. **Assumption:** the original "broken icons" report came from reading rendered text / the a11y tree, not from seeing broken pixels on a device. If you *see* broken icons, that overrides this — flag it.
- **CSP is Report-Only** by design → it cannot break the live app; worst case is noisy console logs. Do not flip to enforcing until the console is clean across all five roles (esp. the WorkSites map page and any Supabase Storage images). **Assumption:** no external origin is loaded from code paths I couldn't reach by static grep — Report-Only exists precisely to catch that before enforcement.
- **`labels.ts` `loan_type`:** only `emergency` and `salary_advance` are confirmed in the codebase; other loan types (if any exist in data) fall back to `humanize()` rather than a guessed label. Not fabricating labels I can't verify. Add explicit entries once the real loan-type set is confirmed.
- **Schema baseline is structural, not a `pg_dump`** — see §2 limit. It does not replace real migrations; it's the drift-detection net until `supabase/migrations/` is adopted.
- **Edit blocks** were matched against the current live files this session; if a block doesn't match, the file changed after capture — re-grep the surrounding lines and I'll re-issue that block.
- **Most likely way this is wrong:** an enum value exists in production data that isn't referenced in the frontend source I grepped, so it won't get an explicit label (it still renders via `humanize()`, just not curated wording).
