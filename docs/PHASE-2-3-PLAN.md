# SA'DA ONE — Phase 2 & 3 Execution Plan

Phase 1 is delivered (`../phase1/`). This doc covers Phase 2 + 3. It is honest about what I can build browser-only vs. what is blocked on your input or config — I won't hand you unverifiable diffs or claim "done" on things I can't run.

---

## ✅ DELIVERED THIS INCREMENT — Automated test foundation (Phase 2, item 5)

The audit's #1 structural risk was *zero tests*. This is the net that makes every later refactor (esp. the inline-style migration) safe. **It is run and green — not a claim:**

```
✓ src/lib/geo.test.ts             (11 tests)   ← attendance geofence gate
✓ src/lib/labels.test.ts          (13 tests)   ← enum humanizer contract
✓ src/components/ui/StatusBadge.test.tsx (3)    ← jsdom + Testing Library path
  Test Files  3 passed (3)     Tests  27 passed (27)     vitest v2.1.9
```

Files in `phase2/`: `vitest.config.ts`, `src/test/setup.ts`, and the three `*.test.ts(x)` files. Coverage chosen for signal, not vanity: the geofence tests pin the **75 m GPS-slack cap** (a spoofed huge-accuracy value must *not* bypass the fence — a real security boundary), and the component test already caught that the Phase-1 `StatusBadge` patch wasn't applied (went red → patch → green).

### Apply (browser-only)
1. Copy the 5 files into the repo at the same paths (`vitest.config.ts` at repo root under `sada-hr/`; the rest mirror `src/…`).
2. `package.json` — add to `devDependencies` (exact versions installed & verified):
   ```json
   "vitest": "^2.1.9",
   "jsdom": "^29.1.1",
   "@testing-library/react": "^16.3.2",
   "@testing-library/jest-dom": "^6.9.1",
   "@testing-library/user-event": "^14.6.1"
   ```
   and to `scripts`:
   ```json
   "test": "vitest run",
   "test:watch": "vitest"
   ```
3. Does **not** touch `vite build` (separate config; test files aren't imported by app code, so they're excluded from the production bundle). Your build stays `vite build`.
4. Next step for CI: run `npm run test` on every PR (GitHub Action, ~5 lines) so a red suite blocks merge. I can write that workflow on request.

---

## The honest map — everything else

Legend: **🟢 I build it** (browser-only, verifiable) · **🟡 I build the code, you do the config/decision** · **🔴 Blocked** until you give input.

### Phase 2

| Item | Status | Notes / what it takes |
|---|---|---|
| Automated tests | 🟢 **started** | Foundation above. Next: cover more pure modules (offlineQueue, features flags) + key flows. Incremental. |
| Design system / tokens | 🟢 next up | Extract the existing palette (navy `#0D1B2A`, teal `#17B8D0`, gold `#C8A96E`, +~25 more hardcoded values) into `tokens.ts` + CSS variables that mirror **current** values exactly (adoption = zero visual change). This is the dependency for dark mode + style-elimination. |
| Eliminate inline styles | 🟢 but **incremental** | ~55 pages of `style={{…}}`. This is a page-by-page migration to tokens/Tailwind, delivered in **reviewable batches**, each behind the test net. Not one-shot, and I can't visually verify all 55 browser-only — you eyeball each batch on the deployed preview. Honest: this is the long pole of Phase 2. |
| Dark mode | 🟢 after tokens | Once values are CSS variables, dark mode = a second token set + a theme toggle + `prefers-color-scheme`. The token layer is verifiable; per-screen contrast needs your visual pass. |
| Accessibility | 🟢 partial | I run an automated **axe** audit via Playwright against the live pages and deliver fixes for concrete hits (missing labels, contrast, focus traps, roles). A full WCAG-AA pass is iterative, but the mechanical wins land fast. |

### Phase 3

| Item | Status | Notes / what it takes |
|---|---|---|
| Full Arabic / RTL | 🟡 infra now, copy blocked | I wire `react-i18next` + `dir` switching + RTL layout + extract strings into an `en` resource file. **Blocked on:** the actual Arabic translations for ~55 pages — either your copy, or a decision to machine-translate (you have **LILT** connected — that's a viable path I can drive). Infra + English extraction I do now; translated `ar.json` is the gate. |
| SSO (SAML/OIDC) + MFA | 🔴 blocked | Supabase Auth + an identity provider. I need: **(a)** which IdP (Azure AD / Okta / Google Workspace / other), **(b)** confirmation your Supabase plan supports SAML SSO (Pro+), **(c)** IdP metadata. I build the MFA enrollment/challenge UI + the SSO callback handling; the IdP↔Supabase wiring is dashboard config I can't run for you. |
| Better notifications | 🟢 | You already have `push.ts` + the notifications table. Buildable: read-state, grouping, a notification center, delivery reliability. Partially testable. (Recall: current "admin can't see them" is an RLS artifact, not a defect.) |
| Offline enhancements | 🟢 | You have `offlineQueue.ts` + `vite-plugin-pwa`. Buildable: background sync, conflict handling, a queue-status UI. |
| AI HR assist | 🔴 blocked (scope) | Needs a product definition: what should it *do* — leave-balance Q&A? draft experience letters? summarize an employee file? policy chatbot? — and which model endpoint (edge function calling an LLM). Give me the 1-2 use cases and I scope + build a slice. |
| Enterprise reporting / workflow | 🔴 blocked (requirements) | Which reports (headcount, leave liability, payroll runs, attendance exceptions)? Which workflows beyond the existing 2-stage approval? A short spec unblocks it. |

---

## Recommended sequence

1. ✅ **Tests** (done) — protects all refactors below.
2. **Design tokens** — unblocks 3 & 4. *(I can start immediately.)*
3. **Dark mode** — sits on the token layer.
4. **A11y audit + mechanical fixes** — fast wins, axe-driven.
5. **Inline-style migration** — batched, page-by-page, test-protected. The long pole.
6. **Phase 3:** i18n infra → notifications → offline (all 🟢) in parallel-ish; then the 🔴 items (SSO, AI assist, reporting) land as you provide the inputs above.

I'll proceed down this list building verified artifacts. The 🔴 items genuinely can't move without the specific inputs named — everything else I execute without further prompting.

---

## Risks & assumptions

- **Assumption:** "continue with all the phases" = execute in sequence delivering ready-to-apply artifacts, not produce a plan-only doc. This doc is the map; the tests are the first executed increment.
- **Test foundation is real** (27 passing, run above) but is a *starter* — it covers 3 modules, not the app. It catches regressions in what it covers; it is not proof the app is bug-free.
- **The inline-style migration cannot be one-shot** browser-only and verified — anyone claiming otherwise is hand-waving. It's genuinely batch work you review on previews. That's the honest cost.
- **🔴 items are hard-blocked**, not slow: SSO needs your IdP + plan tier, AI assist needs a use-case decision, reporting needs a spec. I'm not guessing those into existence (per your no-fabrication rule).
- **Most likely friction:** the `@` alias in `vitest.config.ts` is defined independently of `vite.config.ts`; if you later change the alias in one place, update both. Noted in the config comment path.
