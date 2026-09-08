# Why the chat crashed, and what now prevents it

## What happened

`ChatRoomPage` called `formatTime()` without importing it. That's a plain
`ReferenceError` the moment the component renders — the error boundary caught it and
showed "Something went wrong".

It reached production because **`vite build` does not type-check**. The build succeeded,
the deploy succeeded, and nothing failed until a user opened a group chat.

Worse, `tsc` had effectively never run on this repo: `tsconfig.json` set `baseUrl`, which
TypeScript 6+ rejects with TS5101 and **halts before checking anything**. So the one tool
that would have caught this was silently doing nothing.

## What changed

**`tsconfig.json`** — dropped `baseUrl` (path aliases now resolve relative to the config,
same behaviour), and turned off `noUnusedLocals` / `noUnusedParameters`. Those were 20 of
24 diagnostics: style noise that buried the real errors.

**`package.json`**

```
npm run typecheck   # tsc --noEmit
npm run verify      # typecheck + test + build — run before pushing
```

**CI** now runs **typecheck → tests → build**, in that order. A missing import fails the
pipeline instead of reaching a phone.

**Three regression tests** (`src/lib/imports.test.ts`):
- a helper used without an import
- a component declared inside another component (the focus/remount bug)
- any return of `toLocaleDateString('en-SA')` (the Hijri bug)

## Verified, not assumed

The `formatTime` import was deliberately removed again to confirm the gate works:

```
tsc     → error TS2304: Cannot find name 'formatTime'.
vitest  → "uses formatTime() from @/lib/dates but never imports it"
```

Both caught it independently. The import was then restored and the checks return clean.

## Also fixed

`hr/ReportsPage` and `finance/ReportsPage` scaled progress bars by dividing by the largest
value with no guard. When that value was zero the result was `Infinity` and the bar
rendered wrong. Both now use a shared `pctOfMax()` helper that returns 0 for empty or
all-zero data and clamps at 100.

## Worth knowing

`strict` is on, but much of the codebase uses `any` (`(u: any) => …`), which opts out of
checking. The type gate catches undefined names everywhere, but null-safety only where
types are real. Reducing `any` over time would widen what this net catches — not urgent,
but it's the difference between catching this class of bug and catching most bugs.
