#!/usr/bin/env node
// g10-oneway.mjs —— F-GEOM-01-G10 §3.1 单向核验探针（单文件单目的，G10 收官步）
// 核验面（简报③.7）：view→{anchors,state,panels,interact,time} 出边计数 + 反向边（五子域→view）=0
// + reader 根驻留文件=0（根=纯目录容器）+ view 域 ../X 直指根件形态=0（中间态边清零）
// + 旧径残留五通道（旧径 import/点径/别名/动态 import/vi.mock）=0。
// 扫描范围=src/**+tests/**（tickets/registry.ts=主控收口面不在扫描面；scripts/audits=历史证据件零动作，G7/G8 先例）。
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const READER = join(ROOT, 'src', 'renderer', 'features', 'reader')
const VIEW = join(READER, 'view')
const SUBDOMAINS = ['anchors', 'state', 'panels', 'interact', 'time']
const MOVED = [
  'AnnotationEditor', 'AnnotationMenu', 'PageColumnView', 'ReaderPage', 'ReaderSearchBox',
  'ReaderShortcuts', 'ReaderToolbar', 'SearchHighlightLayer', 'TabBar',
  'reader-search.store', 'reader-search', 'reader-shortcut-handlers', 'useReaderSearch'
]

function walk(dir, exts, acc = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry)
    if (statSync(p).isDirectory()) walk(p, exts, acc)
    else if (exts.some((ext) => p.endsWith(ext))) acc.push(p)
  }
  return acc
}

const violations = []

// [1] reader 根驻留文件必须 0（收官核验：根=纯目录容器）
const rootResidents = readdirSync(READER).filter((e) => !statSync(join(READER, e)).isDirectory())
console.log(`== [1] reader 根驻留文件（必须 0）==`)
console.log(`root_resident_files=${rootResidents.length}${rootResidents.length ? ' => ' + rootResidents.join(',') : ''}`)
if (rootResidents.length > 0) violations.push(`[1] 根驻留 ${rootResidents.length} 件：${rootResidents.join(',')}`)

// [2] view 出边分类 + ../X 直指根件形态必须 0
const viewFiles = walk(VIEW, ['.ts', '.tsx'])
const outEdges = { anchors: 0, state: 0, panels: 0, interact: 0, time: 0 }
let intraView = 0
let upCross = 0
const importRe = /(?:from|import)\s+['"](\.[^'"]+)['"]/g
const bareUpRe = /^..\/([^/]+)$/
for (const f of viewFiles) {
  const rel = f.slice(VIEW.length + 1).replace(/\\/g, '/')
  for (const m of readFileSync(f, 'utf8').matchAll(importRe)) {
    const spec = m[1]
    if (spec.startsWith('./')) { intraView += 1; continue }
    const seg = spec.split('/')[1] ?? ''
    if (spec.startsWith('../')) {
      const bare = spec.match(bareUpRe)
      if (bare) {
        violations.push(`[2] view 域 ../X 直指根件形态残留：${rel} -> '${spec}'`)
        continue
      }
      if (SUBDOMAINS.includes(seg)) { outEdges[seg] += 1; continue }
      upCross += 1 // ../../shared、../../../api 等上跨（合法）
    }
  }
}
console.log(`== [2] view 出边（view→五子域单向+域内互引+上跨）==`)
console.log(`view_out_edges=${JSON.stringify(outEdges)} intra_view=${intraView} up_cross=${upCross}`)

// [3] 反向边（五子域→view）必须 0
const reverseHits = []
for (const sub of SUBDOMAINS) {
  for (const f of walk(join(READER, sub), ['.ts', '.tsx'])) {
    const rel = f.slice(READER.length + 1).replace(/\\/g, '/')
    const content = readFileSync(f, 'utf8')
    for (const m of content.matchAll(/['"](\.[^'"]*\/view\/[^'"]*)['"]/g)) {
      reverseHits.push(`${rel} -> '${m[1]}'`)
    }
  }
}
console.log(`== [3] 反向边（五子域→view，必须 0）==`)
console.log(`reverse_edges=${reverseHits.length}${reverseHits.length ? '\n' + reverseHits.join('\n') : ''}`)
if (reverseHits.length > 0) violations.push(`[3] 反向边 ${reverseHits.length} 条（见上）`)

// [4] 旧径残留五通道（src+tests 全文扫描；通道对象=13 件旧根径形态——子域/view 合法路径不旗标，
//     v1 谓词过宽误报 state/view/anchors 面 19 处合法命中，v2 收敛为旧径谓词，v1 FAIL 输出留档红能力实证）
const scanRoots = [join(ROOT, 'src'), join(ROOT, 'tests')]
const scanFiles = scanRoots.flatMap((r) => walk(r, ['.ts', '.tsx']))
const oldPrefix = 'src/renderer/features/reader/'
const ch = { oldImport: [], dotPath: [], alias: [], dynamicImport: [], viMock: [] }
const movedSegRe = new RegExp(`^(?:${MOVED.map((n) => n.replace('.', '\\.')).join('|')})(?:\\.tsx?)?$`)
function oldPathHit(line) {
  let idx = line.indexOf(oldPrefix)
  while (idx !== -1) {
    const rest = line.slice(idx + oldPrefix.length)
    const seg = rest.split(/['"'\s),]/)[0].split('/')[0]
    if (movedSegRe.test(seg)) return rest.slice(0, 50)
    idx = line.indexOf(oldPrefix, idx + 1)
  }
  return null
}
for (const f of scanFiles) {
  const rel = f.slice(ROOT.length + 1).replace(/\\/g, '/')
  const inView = rel.startsWith('src/renderer/features/reader/view/')
  const lines = readFileSync(f, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`
    const hit = oldPathHit(line)
    if (hit) ch.oldImport.push(`${at} …reader/${hit}`)
    if (inView && /['"]\.\/view\//.test(line)) {
      ch.dotPath.push(`${at} ${line.trim().slice(0, 60)}`)
    }
    if (/@[^'"]*reader/.test(line)) ch.alias.push(`${at} ${line.trim().slice(0, 60)}`)
    const dynHit = /import\(\s*['"]([^'"]*reader[^'"]*)['"]/.exec(line)
    if (dynHit) {
      const seg = (dynHit[1].split(oldPrefix)[1] ?? '').split(/['"'\s)]/)[0].split('/')[0]
      if (movedSegRe.test(seg) || /['"]\.\/view\//.test(dynHit[1])) {
        ch.dynamicImport.push(`${at} ${line.trim().slice(0, 60)}`)
      }
    }
    const mockHit = /vi\.mock\(\s*['"]([^'"]+)['"]/.exec(line)
    if (mockHit) {
      const seg = (mockHit[1].split(oldPrefix)[1] ?? '').split(/['"'\s)]/)[0].split('/')[0]
      if (movedSegRe.test(seg) || (inView && /^\.\/view\//.test(mockHit[1]))) {
        ch.viMock.push(`${at} ${line.trim().slice(0, 60)}`)
      }
    }
  })
}
console.log(`== [4] 旧径残留五通道（src+tests 全文，scan_files=${scanFiles.length}，必须全 0）==`)
for (const [k, v] of Object.entries(ch)) {
  console.log(`ch_${k}=${v.length}${v.length ? '\n' + v.join('\n') : ''}`)
  if (v.length > 0) violations.push(`[4] ${k} 通道残留 ${v.length} 处（见上）`)
}

console.log('== 判定 ==')
if (violations.length > 0) {
  console.log(`ONEWAY_VERDICT=FAIL (${violations.length} 项违规)`)
  for (const v of violations) console.log(' - ' + v)
  process.exit(1)
}
console.log('ONEWAY_VERDICT=PASS（反向边 0+根驻留 0+中间态边清零+旧径残留五通道全 0）')
process.exit(0)
