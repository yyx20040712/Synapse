// g4 侦察探针：M1 十文件的全仓 import 消费面（src+tests 分列，按文件分组）
// 只读探针，用毕归档 scripts/audits（受锁面外——audits 不在 manifest）
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve } from 'node:path'

const root = process.cwd()
const readerDir = join(root, 'src/renderer/features/reader')
const mods = [
  'reader.store', 'tab-dirty', 'useActiveTab', 'annotation-undo', 'page-layer-z',
  'ai-notes.store', 'ai-notes-phase', 'PdfDocProvider', 'CorpusExtractor', 'scroll-converge'
]

function walk(dir, acc) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    const st = statSync(p)
    if (st.isDirectory()) {
      if (e === 'node_modules' || e === 'dist' || e === 'release' || e === '.git') continue
      walk(p, acc)
    } else if (/\.(ts|tsx|mjs|cjs|js|json|html|css)$/.test(e)) {
      acc.push(p)
    }
  }
  return acc
}

const files = walk(root, [])
const results = {}
for (const mod of mods) {
  results[mod] = []
}
// 相对 import 解析：匹配 from './x' / from '../x' / from '../../x' 等，目标落到 reader/<mod>
const importRe = /from\s+['"](\.[^'"]+)['"]/g
for (const f of files) {
  let content
  try { content = readFileSync(f, 'utf-8') } catch { continue }
  importRe.lastIndex = 0
  let m
  const hits = new Set()
  while ((m = importRe.exec(content)) !== null) {
    const target = resolve(dirname(f), m[1]).replaceAll('\\', '/')
    for (const mod of mods) {
      // 命中 reader/<mod> 精确路径（含扩展名省略形）
      if (target === `${readerDir.replaceAll('\\', '/')}\\${mod}`.replaceAll('\\', '/')) hits.add(mod)
      if (target === `${readerDir.replaceAll('\\', '/')}/${mod}`) hits.add(mod)
    }
  }
  // 兜底：字符串路径直接点名（e2e、配置、脚本里的 'reader/tab-dirty' 等）
  for (const mod of mods) {
    if (content.includes(`reader/${mod}`)) hits.add(mod)
  }
  for (const mod of hits) results[mod].push(relative(root, f).replaceAll('\\', '/'))
}

const srcCount = {}
const testCount = {}
for (const mod of mods) {
  const srcs = results[mod].filter(p => !p.startsWith('tests/') && !p.includes('.test.'))
  const tests = results[mod].filter(p => p.startsWith('tests/') || p.includes('.test.'))
  srcCount[mod] = srcs.length
  testCount[mod] = tests.length
  console.log(`\n=== ${mod} (src:${srcs.length} tests:${tests.length}) ===`)
  for (const p of srcs) console.log(`  [src]   ${p}`)
  for (const p of tests) console.log(`  [test]  ${p}`)
}
console.log('\n=== SUMMARY ===')
let ts = 0, tt = 0
for (const mod of mods) { ts += srcCount[mod]; tt += testCount[mod] }
console.log(`src total=${ts} tests total=${tt} grand=${ts + tt}`)
