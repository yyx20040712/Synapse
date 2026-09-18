// F-GEOM-01-G7 §3.1 单向核验探针（只读——零写入面）。
// 三表：①interact→{anchors,state} 出边全表；②state|anchors|time|panels→interact
// 反向边须 0；③全仓 7 名旧径 import 残留（解析后目标不存在）须 0。
// 输出重定向落 scripts/audits/g7-oneway-check.log（echo 变量法补 EXIT 行）。
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const READER = join(ROOT, 'src/renderer/features/reader')
const NAMES = [
  'SelectionLayer', 'SelectionToolbar', 'selection-evaluate', 'selection-geometry',
  'selection-paint', 'release-affinity', 'use-annotation-draft'
]
const EXT = /\.(ts|tsx)$/

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, out)
    else if (EXT.test(e)) out.push(p)
  }
  return out
}

// 相对 specifier 解析（试 ts/tsx 扩展与 /index——本仓无 barrel，保守双试）
function resolves(file, spec) {
  if (!spec.startsWith('.')) return true // 别名/裸包不在本表判定面
  const base = resolve(dirname(file), spec)
  return existsSync(base + '.ts') || existsSync(base + '.tsx') || existsSync(base)
}

const importRe = /(?:from|import)\s+['"]([^'"]+)['"]/g
const srcFiles = walk(READER)
const interactFiles = srcFiles.filter(p => p.includes(join(READER, 'interact')))

// ① interact 出边全表（跨域 ../——anchors/state/shared/api 等）
console.log('[1] interact -> 域外出边全表（specifier 含 ../）')
let outCount = 0
for (const f of interactFiles) {
  const txt = readFileSync(f, 'utf8')
  let m
  while ((m = importRe.exec(txt))) {
    if (m[1].startsWith('../')) {
      console.log(`  ${f.slice(READER.length + 1)} : ${m[1]}`)
      outCount++
    }
  }
}
console.log(`  出边合计: ${outCount}`)

// ② 反向边：state|anchors|time|panels(以及 reader 根?) -> interact 须 0
//    （reader 根入边=合法消费面 B 段，不在反向禁面——仅子域禁）
console.log('[2] state|anchors|time|panels -> interact 反向边（须 0）')
let reverse = 0
for (const f of srcFiles) {
  const rel = f.slice(READER.length + 1).replaceAll('\\', '/')
  const sub = rel.split('/')[0]
  if (!['state', 'anchors', 'time', 'panels'].includes(sub)) continue
  const txt = readFileSync(f, 'utf8')
  let m
  while ((m = importRe.exec(txt))) {
    if (m[1].includes('interact')) {
      console.log(`  REVERSE: ${rel} : ${m[1]}`)
      reverse++
    }
  }
}
console.log(`  反向边合计: ${reverse}（须 0）`)

// ③ 旧径残留：src+tests（e2e spec 在 tests/e2e/ 下随 tests 面覆盖）中 7 名
//    import 解析失败（旧位置已迁走）须 0
console.log('[3] 7 名旧径 import 残留（解析后目标缺失——须 0）')
const scanRoots = ['src', 'tests'].map(d => join(ROOT, d))
let residue = 0
const nameAlt = NAMES.join('|')
const altRe = new RegExp(`(?:from|import)\\s+['"]([^'"]*(?:${nameAlt}))['"]`)
for (const root of scanRoots) {
  for (const f of walk(root)) {
    const txt = readFileSync(f, 'utf8')
    let m
    const re = new RegExp(altRe.source, 'g')
    while ((m = re.exec(txt))) {
      if (!resolves(f, m[1])) {
        console.log(`  RESIDUE: ${f.slice(ROOT.length + 1)} : ${m[1]}`)
        residue++
      }
    }
  }
}
console.log(`  残留合计: ${residue}（须 0）`)

const pass = reverse === 0 && residue === 0
console.log(pass ? 'G7_ONEWAY_CHECK=PASS' : 'G7_ONEWAY_CHECK=FAIL')
process.exit(pass ? 0 : 1)
