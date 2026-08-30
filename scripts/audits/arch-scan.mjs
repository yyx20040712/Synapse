/**
 * 架构系统性排查——机器面扫描(防屎山三盲区:时序/接缝/未声明假设 + 结构面)。
 * 扫描项:①行数红线(>500 违规/>450 预警)②import 依赖图:循环依赖+跨层语义
 * 违规(renderer↔main)+孤儿文件(零入边非入口)③状态机合规:store/异步/输入
 * 模块清单④跨模块行为标记 vs invariants.md 登记覆盖⑤重复逻辑(≥3 文件
 * 同构 N 行块)⑥churn 热点(30d 提交 Top)⑦类型单一真相源(非 shared 定义
 * 跨侧引用疑点)。
 * 产物:scripts/audits/arch-out/arch-scan.json
 */
import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { execSync } from 'node:child_process'

const ROOT = process.cwd()
const OUT = join(ROOT, 'scripts', 'audits', 'arch-out')
mkdirSync(OUT, { recursive: true })
const R = { meta: { script: 'arch-scan.mjs', date: new Date().toISOString() }, findings: {} }
const log = (...a) => console.log(`[arch ${new Date().toISOString().slice(11, 19)}]`, ...a)

/** 递归收集 src 下 ts/tsx(排除 .d.ts) */
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx)$/.test(name) && !name.endsWith('.d.ts')) acc.push(p)
  }
  return acc
}
const files = walk(join(ROOT, 'src'))
R.meta.filesScanned = files.length
const rel = (p) => relative(ROOT, p).replace(/\\/g, '/')
const byPath = new Map(files.map(p => [rel(p), p]))

// ①行数红线
const lineCounts = files.map(p => ({ f: rel(p), n: readFileSync(p, 'utf8').split('\n').length }))
R.findings.lineLimits = {
  over500: lineCounts.filter(x => x.n > 500),
  over450: lineCounts.filter(x => x.n > 450 && x.n <= 500),
  top10: [...lineCounts].sort((a, b) => b.n - a.n).slice(0, 10)
}
log('①行数', JSON.stringify({ over500: R.findings.lineLimits.over500.length, over450: R.findings.lineLimits.over450.length }))

// ②import 依赖图
const importRe = /(?:import\s[^'"]*from\s*|import\s*\(\s*|require\s*\(\s*)['"]([^'"]+)['"]/g
const graph = new Map()
const external = new Set()
for (const p of files) {
  const f = rel(p)
  const src = readFileSync(p, 'utf8')
  const deps = new Set()
  let m
  while ((m = importRe.exec(src))) {
    const spec = m[1]
    if (!spec.startsWith('.')) { external.add(spec); continue }
    let target = join(dirname(p), spec).replace(/\\/g, '/')
    for (const cand of [target, target + '.ts', target + '.tsx', target + '/index.ts']) {
      const cr = relative(ROOT, cand).replace(/\\/g, '/')
      if (byPath.has(cr)) { deps.add(cr); break }
    }
  }
  graph.set(f, deps)
}
// 循环依赖(Tarjan SCC 简化:DFS 双色标记)
const color = new Map(), stack = [], sccs = []
function dfs(u) {
  color.set(u, 1); stack.push(u)
  for (const v of graph.get(u) || []) {
    if (!graph.has(v)) continue
    const c = color.get(v) || 0
    if (c === 1) {
      const i = stack.indexOf(v)
      if (i >= 0) sccs.push([...stack.slice(i), u])
    } else if (c === 0) dfs(v)
  }
  color.set(u, 2); stack.pop()
}
for (const u of graph.keys()) if (!color.get(u)) dfs(u)
const realCycles = sccs.filter(c => new Set(c).size > 1)
// 跨层语义违规:renderer 引 main,或 main 引 renderer
const layerViolation = []
for (const [f, deps] of graph) {
  for (const d of deps) {
    if (f.includes('/renderer/') && d.includes('/main/')) layerViolation.push({ from: f, to: d })
    if (f.includes('/main/') && d.includes('/renderer/')) layerViolation.push({ from: f, to: d })
  }
}
// 孤儿:零入边且非入口(main/index.ts, renderer 入口, preload)
const entries = new Set(['src/main/index.ts', 'src/main/main.ts', 'src/preload/index.ts', 'src/renderer/main.tsx', 'src/renderer/index.tsx', 'src/renderer/App.tsx'])
const inDeg = new Set()
for (const deps of graph.values()) for (const d of deps) inDeg.add(d)
const orphans = [...graph.keys()].filter(f => !inDeg.has(f) && !entries.has(f) && !f.includes('test'))
R.findings.dependency = { cycles: realCycles, layerViolation, orphans, externalDeps: [...external].sort() }
log('②依赖', JSON.stringify({ cycles: realCycles.length, layerViolation: layerViolation.length, orphans: orphans.length }))

// ③状态机合规:store/异步/用户输入模块(state 词法信号)
const stateful = []
for (const p of files) {
  const f = rel(p)
  const src = readFileSync(p, 'utf8')
  const hasStore = /useState|useReducer|create\(|zustand|store/i.test(src)
  const hasAsync = /async |await |\.then\(|Promise/.test(src)
  const hasInput = /onChange|onInput|onMouse|onKey|addEventListener|ipcRenderer/.test(src)
  if (hasStore && hasAsync && hasInput) stateful.push(f)
}
R.findings.statefulModules = stateful
log('③状态模块', stateful.length)

// ④跨模块行为标记 vs invariants.md
const inv = readFileSync(join(ROOT, 'docs', 'invariants.md'), 'utf8')
const invIds = [...inv.matchAll(/INV-[A-Z0-9-]+/g)].map(m => m[0])
const R2 = (re) => {
  const hits = []
  for (const p of files) {
    const f = rel(p)
    const src = readFileSync(p, 'utf8')
    const lines = src.split('\n')
    lines.forEach((line, i) => { if (re.test(line)) hits.push(`${f}:${i + 1}`) })
  }
  return hits
}
R.findings.crossModuleBehaviors = {
  localStorage: R2(/localStorage\./).filter(x => !x.includes('__test')),
  intervals: R2(/setInterval\(|setTimeout\(/).length,
  windowEvents: R2(/window\.addEventListener/),
  invariantIdsInDocs: [...new Set(invIds)]
}
log('④跨模块', JSON.stringify({ localStorage: R.findings.crossModuleBehaviors.localStorage.length, windowEvents: R.findings.crossModuleBehaviors.windowEvents.length, invDocs: new Set(invIds).size }))

// ⑤重复逻辑:滑窗 8 行归一化块出现在 ≥3 文件
const BLOCK = 8
const blockOwners = new Map()
for (const p of files) {
  const f = rel(p)
  const lines = readFileSync(p, 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('*') && !l.startsWith('//') && !l.startsWith('import') && !l.startsWith('}'))
  for (let i = 0; i + BLOCK <= lines.length; i++) {
    const key = lines.slice(i, i + BLOCK).join('|')
    if (!blockOwners.has(key)) blockOwners.set(key, new Set())
    blockOwners.get(key).add(f)
  }
}
const dupBlocks = [...blockOwners.entries()].filter(([, fs]) => fs.size >= 3).map(([k, fs]) => ({ files: [...fs], head: k.split('|')[0] }))
R.findings.duplication = { threshold3files: dupBlocks.slice(0, 30), count: dupBlocks.length }
log('⑤重复', dupBlocks.length)

// ⑥churn 热点(30d)
let churn = []
try {
  const out = execSync('git log --since="45 days ago" --name-only --pretty=format:', { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 24 })
  const cnt = new Map()
  for (const l of out.split('\n')) if (l.trim().startsWith('src/')) cnt.set(l.trim(), (cnt.get(l.trim()) || 0) + 1)
  churn = [...cnt.entries()].map(([f, n]) => ({ f, n })).sort((a, b) => b.n - a.n).slice(0, 12)
} catch { churn = [{ f: 'git-log-unavailable', n: 0 }] }
R.findings.churn45d = churn
log('⑥churn', churn.slice(0, 3).map(c => `${c.f}:${c.n}`).join(' '))

// ⑦类型单一真相源:非 shared 文件定义的 interface/type 被跨侧文件引用疑点
const typeDef = new Map()
for (const p of files) {
  const f = rel(p)
  const src = readFileSync(p, 'utf8')
  for (const m of src.matchAll(/export\s+(?:interface|type)\s+([A-Z]\w+)/g)) {
    if (!typeDef.has(m[1])) typeDef.set(m[1], f)
  }
}
const suspicious = []
for (const f of graph.keys()) {
  const side = f.includes('/renderer/') ? 'renderer' : f.includes('/main/') ? 'main' : f.includes('/preload/') ? 'preload' : f.includes('/shared/') ? 'shared' : null
  if (!side || side === 'shared') continue
  const src = readFileSync(byPath.get(f), 'utf8')
  for (const m of src.matchAll(/\b([A-Z]\w{3,})\b/g)) {
    const def = typeDef.get(m[1])
    if (def) {
      const defSide = def.includes('/shared/') ? 'shared' : def.includes('/renderer/') ? 'renderer' : def.includes('/main/') ? 'main' : 'preload'
      if (defSide !== 'shared' && defSide !== side) suspicious.push({ type: m[1], defIn: def, usedIn: f })
    }
  }
}
R.findings.typeSourcing = { crossSide: [...new Map(suspicious.map(s => [s.type + '|' + s.usedIn, s])).values()].slice(0, 20) }
log('⑦类型跨侧', R.findings.typeSourcing.crossSide.length)

writeFileSync(join(OUT, 'arch-scan.json'), JSON.stringify(R, null, 2))
console.log('ARCH SCAN: done,', files.length, 'files')
