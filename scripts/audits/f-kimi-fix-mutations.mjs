// [F-TESTREF-00 Kimi supplement fix] Mutation probe M11-M14 (cp backup method, all ASCII)
// usage: node scripts/audits/f-kimi-fix-mutations.mjs   (repo root cwd)
import { readFileSync, writeFileSync, copyFileSync, unlinkSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'

const GATE = 'node scripts/check-test-surface.mjs'
const run = () => execSync(GATE, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] })
const tryRun = () => { try { const o = run(); return { code: 0, out: o } } catch (e) { return { code: e.status, out: (e.stdout || '') + (e.stderr || '') } } }
const section = (name) => console.log(`\n===== ${name} =====`)

// M11: NEW file with it.only -> ONLY_FORBIDDEN (Kimi B-1 fix evidence)
section('M11 new-file it.only -> ONLY_FORBIDDEN')
const M11 = 'tests/unit/tmp-m11-only-probe.test.ts'
writeFileSync(M11, "import { describe, it } from 'vitest'\ndescribe('m11 probe block', () => { it.only('m11 only case', () => {}) })\n", 'utf8')
let r = tryRun()
console.log(`exit=${r.code}`)
console.log(r.out.split('\n').filter((l) => l.includes('ONLY_FORBIDDEN') || l.includes('NEW ') || l.includes('FAIL')).join('\n'))
unlinkSync(M11)
r = tryRun(); console.log(`after-delete exit=${r.code}`)

// M12: EXISTING case + it.skip -> single SKIP_ADDED, no MISSING_CASE (Kimi W-1 fix evidence)
section('M12 existing case +skip -> SKIP_ADDED only (no MISSING_CASE)')
const T = 'tests/unit/renderer/theme.test.ts'
copyFileSync(T, 'scripts/audits/.m12-theme.bak')
let text = readFileSync(T, 'utf8')
const anchor = "it('body 视觉底换新"
const idx = text.indexOf(anchor)
if (idx < 0) { console.log('ANCHOR_NOT_FOUND'); process.exit(9) }
text = text.slice(0, idx) + text.slice(idx).replace("it('", "it.skip('", 1)
writeFileSync(T, text, 'utf8')
r = tryRun()
console.log(`exit=${r.code}`)
const lines = r.out.split('\n').filter((l) => l.includes('SKIP_ADDED') || l.includes('MISSING_CASE'))
console.log(lines.join('\n'))
console.log(`MISSING_CASE count=${lines.filter((l) => l.includes('MISSING_CASE')).length} (expect 0)`)
copyFileSync('scripts/audits/.m12-theme.bak', T)
unlinkSync('scripts/audits/.m12-theme.bak')

// M13: NEW file with expect alias -> UNRESOLVABLE (Kimi W-2 fix evidence)
section('M13 new-file expect alias -> UNRESOLVABLE')
const M13 = 'tests/unit/tmp-m13-expalias-probe.test.ts'
writeFileSync(M13, "import { expect as exp, it } from 'vitest'\nit('m13 alias case', () => { exp(1).toBe(1) })\n", 'utf8')
r = tryRun()
console.log(`exit=${r.code}`)
console.log(r.out.split('\n').filter((l) => l.includes('UNRESOLVABLE') || l.includes('别名')).slice(0, 3).join('\n'))
unlinkSync(M13)
r = tryRun(); console.log(`after-delete exit=${r.code}`)

// M14: bogus exemption entry -> stale:1 hits:0, exit 0 (Kimi N-1 fix evidence, non-red warning)
section('M14 stale exemption -> stale:1 exit 0')
const E = 'scripts/test-surface.exemptions.json'
copyFileSync(E, 'scripts/audits/.m14-exempt.bak')
const j = JSON.parse(readFileSync(E, 'utf8'))
j.entries.push({ file: 'tests/unit/tmp-nonexist.test.ts', caseTitle: 'm14 stale probe', reason: 'probe', rulingLink: 'probe' })
writeFileSync(E, JSON.stringify(j, null, 2) + '\n', 'utf8')
r = tryRun()
console.log(`exit=${r.code}`)
console.log(r.out.split('\n').filter((l) => l.includes('exemptions')).join('\n'))
copyFileSync('scripts/audits/.m14-exempt.bak', E)
unlinkSync('scripts/audits/.m14-exempt.bak')

// final green
section('final')
r = tryRun(); console.log(`exit=${r.code}`)
console.log(r.out.trim().split('\n').slice(-2).join('\n'))
if (existsSync('scripts/audits/.m12-theme.bak') || existsSync('scripts/audits/.m14-exempt.bak') || existsSync(M11) || existsSync(M13)) { console.log('RESIDUE!'); process.exit(9) }
console.log('NO_RESIDUE')
