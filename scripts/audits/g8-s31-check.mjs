// F-GEOM-01-G8 §3.1 单向核验探针（零行为迁移票——出边表/反向边/旧径残留三面）
// 域口径与 G7 fullscan2 同：活代码 src + tests + 活脚本 scripts + tickets；
// 扩展名白名单 ts/tsx/mjs/cjs/js/json（.md/.log 证据件域不扫）。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = process.cwd()
const PANELS = join(ROOT, 'src/renderer/features/reader/panels')
const READER = join(ROOT, 'src/renderer/features/reader')
const NAMES = [
  'OutlineAside',
  'OutlinePanel',
  'OutlineThumb',
  'ReaderNotesPanel',
  'AiNotesSection',
  'AiNoteGroupList',
  'AiNotesStatus',
  'FragmentNotesList'
]
const EXTS = new Set(['.ts', '.tsx', '.mjs', '.cjs', '.js', '.json'])
const SKIP_DIRS = new Set(['node_modules', '.git', 'out', 'dist_new', 'abi-cache'])

function walk(dir, acc) {
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    if (ent.isDirectory()) {
      if (!SKIP_DIRS.has(ent.name)) walk(join(dir, ent.name), acc)
    } else {
      const dot = ent.name.lastIndexOf('.')
      const ext = dot === -1 ? '' : ent.name.slice(dot)
      if (EXTS.has(ext)) acc.push(join(dir, ent.name))
    }
  }
  return acc
}

// 面 1：panels→{anchors,state} 出边全表（预判 anchors 4 + state 10 = 14）
let anchorsEdges = 0
let stateEdges = 0
console.log('== FACE1 panels outbound edges (../anchors/ | ../state/) ==')
for (const f of readdirSync(PANELS)) {
  const text = readFileSync(join(PANELS, f), 'utf8')
  for (const m of text.matchAll(/from\s+'(\.\.\/(?:anchors|state)\/[^']+)'/g)) {
    const domain = m[1].startsWith('../anchors/') ? 'anchors' : 'state'
    if (domain === 'anchors') anchorsEdges++
    else stateEdges++
    console.log(`${f} -> ${m[1]} [${domain}]`)
  }
}
console.log(`FACE1_SUMMARY anchors=${anchorsEdges} state=${stateEdges} total=${anchorsEdges + stateEdges}`)

// 面 2：state|anchors|time|interact → panels 反向边须 0
let reverseEdges = 0
console.log('== FACE2 reverse edges (state|anchors|time|interact -> panels) ==')
for (const sub of ['state', 'anchors', 'time', 'interact']) {
  const dir = join(READER, sub)
  let exists = true
  try {
    statSync(dir)
  } catch {
    exists = false
  }
  if (!exists) continue
  for (const f of walk(dir, [])) {
    const text = readFileSync(f, 'utf8')
    for (const m of text.matchAll(/from\s+'([^']*panels[^']*)'/g)) {
      reverseEdges++
      console.log(`${relative(ROOT, f)} -> ${m[1]} [REVERSE]`)
    }
  }
}
console.log(`FACE2_SUMMARY reverse=${reverseEdges}`)

// 面 3：全仓旧径残留须 0（绝对形态 features/reader/NAME + reader 域内相对旧形态 './N'|'../N'）
let residue = 0
console.log('== FACE3 old-path residue across src/tests/scripts/tickets ==')
const domains = ['src', 'tests', 'scripts', 'tickets'].map((d) => join(ROOT, d))
for (const domain of domains) {
  for (const f of walk(domain, [])) {
    const text = readFileSync(f, 'utf8')
    for (const n of NAMES) {
      if (text.includes(`features/reader/${n}`)) {
        residue++
        console.log(`${relative(ROOT, f)} [ABS] features/reader/${n}`)
      }
      const rel = relative(READER, f)
      const inReaderDomain = rel.startsWith('..') === false && !rel.startsWith(`panels${'\\'}`) && !rel.startsWith('panels/')
      if (inReaderDomain) {
        for (const m of text.matchAll(new RegExp(`(?:from\\s+'|vi\\.mock\\(')(\\.{1,2}/${n})'`, 'g'))) {
          residue++
          console.log(`${relative(ROOT, f)} [REL] ${m[1]}`)
        }
      }
    }
  }
}
console.log(`FACE3_SUMMARY residue=${residue}`)

const pass = anchorsEdges === 4 && stateEdges === 10 && reverseEdges === 0 && residue === 0
console.log(`S31_FINAL_PASS=${pass}`)
process.exit(pass ? 0 : 1)
