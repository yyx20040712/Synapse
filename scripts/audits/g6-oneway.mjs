#!/usr/bin/env node
/**
 * g6-oneway.mjs —— F-GEOM-01-G6 迁移后核验（零改动，只读）。
 * ① §3.1 单向核验：state→anchors 反向边零存在；anchors→state 边恰 3
 *    （anchor-locate.ts:88/:89 + open-paper-anchor.ts:26）；time↔anchors 互边零存在。
 * ② 旧径残留零检查：全代码面不应再存在指向迁移前旧路径的 import 说明符。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const READER = join(root, 'src', 'renderer', 'features', 'reader')
const MOVED = [
  'pdf-item-geometry', 'annotation-anchor', 'annotation-merge', 'annotation-resolve',
  'annotation-resolve-layered', 'annotation-band-calibrate', 'anchor-serialize',
  'anchor-blank-snap', 'anchor-locate', 'page-items.store', 'open-paper-anchor',
  'annotation-style', 'ai-note-style', 'geometry-types'
]

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(name)) acc.push(p)
  }
  return acc
}

const SPEC_RE = /(?:import|export)\s+(?:type\s+)?[\s\S]*?from\s+['"]([^'"]+)['"]|\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g
function specsOf(text) {
  const out = []
  let m
  SPEC_RE.lastIndex = 0
  while ((m = SPEC_RE.exec(text)) !== null) out.push(m[1] || m[2])
  return out
}

// ① 单向核验
const stateFiles = walk(join(READER, 'state'))
const timeFiles = walk(join(READER, 'time'))
const anchorsFiles = walk(join(READER, 'anchors'))
let stateToAnchors = 0, timeToAnchors = 0, anchorsToTime = 0, anchorsToState = []
for (const f of [...stateFiles, ...timeFiles, ...anchorsFiles]) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const specs = specsOf(readFileSync(f, 'utf-8'))
  for (const s of specs) {
    if (!s.startsWith('.')) continue
    const hit = (mod) => new RegExp(`(^|/)${mod.replace('.', '\\.')}(\\.ts|\\.tsx)?$`).test(s)
    const pointsAnchors = s.includes('/anchors/') || (s.startsWith('./') && MOVED.some(hit))
    if (rel.includes('/state/') && pointsAnchors) stateToAnchors++
    if (rel.includes('/time/') && pointsAnchors) timeToAnchors++
    if (rel.includes('/anchors/') && /(^|\/)time\//.test(s.slice(2))) anchorsToTime++
    if (rel.includes('/anchors/') && /(^|\/)state\//.test(s.slice(2))) anchorsToState.push(`${rel} -> ${s}`)
  }
}
console.log('=== ① §3.1 单向核验 ===')
console.log(`state→anchors 反向边: ${stateToAnchors}（期望 0）`)
console.log(`time→anchors 边: ${timeToAnchors}（期望 0）`)
console.log(`anchors→time 边: ${anchorsToTime}（期望 0）`)
console.log(`anchors→state 边: ${anchorsToState.length}（期望 3）`)
for (const e of anchorsToState) console.log(`  anchors→state: ${e}`)

// ② 旧径残留零检查（src+tests+scripts 代码面）
const scan = [
  ...walk(join(root, 'src')),
  ...walk(join(root, 'tests')),
  join(root, 'scripts', 'check-quality.mjs')
].filter((p) => statSync(p).isFile())
let residual = 0
for (const f of scan) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const lines = readFileSync(f, 'utf-8').split(/\r?\n/)
  lines.forEach((line, i) => {
    // 旧形态：reader 根 './x'、跨域 '../reader/x'、tests '.../reader/x'、白名单 'reader/x'
    for (const b of MOVED) {
      const be = b.replace('.', '\\.')
      const oldForms = [
        new RegExp(`'\\./${be}'`), new RegExp(`"\\./${be}"`),
        new RegExp(`/reader/${be}'`), new RegExp(`"reader/${be}"`), new RegExp(`'reader/${be}'`)
      ]
      if (oldForms.some((re) => re.test(line))) {
        // anchors 域内同层 './x' 合法（互引）——排除
        if (rel.startsWith('src/renderer/features/reader/anchors/')) continue
        // 新形态误匹配排除：'./anchors/x' 不匹配 `'./x'`；'reader/anchors/x' 不匹配 `/reader/x'`
        residual++
        console.log(`RESIDUAL ${rel}:${i + 1}: ${line.trim().slice(0, 140)}`)
      }
    }
  })
}
console.log('=== ② 旧径残留零检查 ===')
console.log(`旧径残留行数: ${residual}（期望 0）`)
const ok = stateToAnchors === 0 && timeToAnchors === 0 && anchorsToTime === 0 &&
  anchorsToState.length === 3 && residual === 0
console.log(`ONEWAY_RESULT=${ok ? 'PASS' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
