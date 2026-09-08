import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// ============================================================
// Guards against a real production crash.
//
// A helper used but never imported is a plain ReferenceError at runtime.
// `vite build` does not type-check, so it builds and deploys happily and
// the screen dies with "Something went wrong" the moment the component
// renders. That shipped once (formatTime in ChatRoomPage); this stops it
// happening again.
// ============================================================

function walk(dir: string, out: string[] = []): string[] {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(p) && !p.includes('.test.')) out.push(p)
  }
  return out
}

const exportsOf = (file: string) =>
  [...readFileSync(file, 'utf8').matchAll(/export (?:function|const) (\w+)/g)].map(m => m[1])

describe('no helper is used without being imported', () => {
  const modules: Record<string, string[]> = {
    '@/lib/dates':  exportsOf('src/lib/dates.ts'),
    '@/lib/labels': exportsOf('src/lib/labels.ts'),
  }

  it('every date/label helper call has a matching import', () => {
    const problems: string[] = []
    for (const file of walk('src')) {
      const src = readFileSync(file, 'utf8')

      const imported = new Set<string>()
      for (const m of src.matchAll(/import \{([^}]*)\} from '[^']*'/g)) {
        for (const part of m[1].split(',')) {
          const name = part.trim().split(' as ').pop()?.trim()
          if (name) imported.add(name)
        }
      }
      // locally declared names, including destructured props and consts
      const declared = new Set<string>([
        ...[...src.matchAll(/^(?:export )?(?:function|const|let) (\w+)/gm)].map(m => m[1]),
        ...[...src.matchAll(/\{\s*([^}]*)\s*\}\s*:/g)].flatMap(m =>
          m[1].split(',').map(s => s.trim().split(':')[0].trim())),
      ])

      for (const [mod, names] of Object.entries(modules)) {
        for (const fn of names) {
          if (!new RegExp(`\\b${fn}\\s*\\(`).test(src)) continue
          if (imported.has(fn) || declared.has(fn)) continue
          problems.push(`${file}: uses ${fn}() from ${mod} but never imports it`)
        }
      }
    }
    expect(problems).toEqual([])
  })
})

describe('no locale-dependent date formatting', () => {
  it("nothing calls toLocale*String('en-SA') for dates", () => {
    const offenders: string[] = []
    for (const file of walk('src')) {
      if (file.endsWith('dates.ts')) continue
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/toLocale(?:Date|Time)?String\('en-SA'[^)]*\)/g)) {
        // the currency formatter is legitimate — it formats numbers, not dates
        if (m[0].includes('FractionDigits')) continue
        offenders.push(`${file}: ${m[0]}`)
      }
    }
    expect(offenders).toEqual([])
  })
})

describe('no component is declared inside another component', () => {
  it('render-scoped components are hoisted', () => {
    // A component declared inside render gets a new identity every render, so
    // React unmounts and remounts its entire subtree. With a text input inside,
    // that drops focus on every keystroke and closes the phone keyboard —
    // exactly the onboarding-wizard bug. Without one it is still needless churn.
    const offenders: string[] = []
    for (const file of walk('src')) {
      const src = readFileSync(file, 'utf8')
      for (const m of src.matchAll(/^[ \t]+(?:const|function) ([A-Z]\w*)\s*=?\s*\(\{/gm)) {
        // indented => nested inside something; module scope has no leading space
        offenders.push(`${file}: ${m[1]} is declared inside a component`)
      }
    }
    expect(offenders).toEqual([])
  })
})
