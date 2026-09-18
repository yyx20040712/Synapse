#!/usr/bin/env node
// g11-netstat.mjs —— F-GEOM-01-G11 域分组净删实测探针（单文件单目的，收官票①）
// 义务=简报③.1：git diff --numstat c05e2ff8dd..HEAD -- src/renderer/features/reader
// 按六域（state/time/anchors/interact/panels/view）+域内新件分组统计 insertions/
// deletions/净额+合计；另产 wc 现值（逐文件行数求和——b23 教训：禁
// `xargs wc -l | tail -1`，拆批后 tail 只取末段小计=假数）与 af946a5324 基线
// 69 文件总行数（git show 逐文件）对账。
// 行数口径=逻辑行数（split('\n') 末尾空串减 1；wc 现值与 git show 基线同一函数，
// 两口径自洽可比）。
// EXIT 码：0=正常产出（净额为事实呈现不作红）；1=解析/文件面异常（bin diff 路径
// 混入/reader 根驻留残留/diff 含 M/A 态非域路径）。
// 「D 态非域路径」=基点（c05e2ff8dd）根驻留旧件的删除条目——迁移本身（G1 删根下
// geometry-types 立案骨架等），单列计入合计，不作异常。
import { execFileSync } from 'node:child_process'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const READER = 'src/renderer/features/reader'
const BASE = 'c05e2ff8dd' // G1 前夜（净删 diff 基准，70 文件含 geometry-types 立案骨架）
const DESIGN_BASE = 'af946a5324' // 设计书基线（69 文件）
const DOMAINS = ['state', 'time', 'anchors', 'interact', 'panels', 'view']

function git(args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
}

// rename 简写展开：'{a => b}rest' → 新路径；'old => new' 整替换；普通路径原样
function expandRename(p) {
  const m = p.match(/^(.*?)\{(.*?) => (.*?)\}(.*)$/)
  if (m) return (m[1] + m[3] + m[4]).replace(/\/\/+/g, '/')
  if (p.includes(' => ')) return p.split(' => ').pop().trim()
  return p
}

// 逻辑行数（两口径同函数）
function lineCount(content) {
  const parts = content.split('\n')
  return parts[parts.length - 1] === '' ? parts.length - 1 : parts.length
}

function walk(dir, acc = []) {
  for (const e of readdirSync(dir)) {
    const p = join(dir, e)
    if (statSync(p).isDirectory()) walk(p, acc)
    else if (/\.(ts|tsx|css)$/.test(p)) acc.push(p)
  }
  return acc
}

const anomalies = []

// [1] 域分组 numstat（diff 终态路径归域）
const numstat = git(['diff', '-M', '--numstat', `${BASE}..HEAD`, '--', READER])
const namestatus = git(['diff', '-M', '--name-status', `${BASE}..HEAD`, '--', READER])
const statusByNew = new Map()
for (const line of namestatus.split('\n')) {
  if (!line) continue
  const cols = line.split('\t')
  statusByNew.set(expandRename(cols[cols.length - 1]), cols[0][0])
}

const perFile = []
for (const line of numstat.split('\n')) {
  if (!line) continue
  const cols = line.split('\t')
  if (cols[0] === '-') {
    anomalies.push(`BIN_DIFF 混入: ${line}`)
    continue
  }
  perFile.push({
    newPath: expandRename(cols.slice(2).join('\t')),
    status: statusByNew.get(expandRename(cols.slice(2).join('\t'))) || '?',
    I: Number(cols[0]),
    D: Number(cols[1]),
  })
}

const byDomain = new Map(DOMAINS.map((d) => [d, { files: 0, ins: 0, del: 0, newFiles: [] }]))
const baseRootDel = { files: 0, ins: 0, del: 0, entries: [] }
for (const f of perFile) {
  const rel = f.newPath.slice(READER.length + 1)
  const seg = rel.split('/')[0]
  if (DOMAINS.includes(seg)) {
    const g = byDomain.get(seg)
    g.files++
    g.ins += f.I
    g.del += f.D
    if (f.status === 'A') g.newFiles.push(`${rel} (+${f.I}/-${f.D})`)
  } else if (f.status === 'D') {
    baseRootDel.files++
    baseRootDel.ins += f.I
    baseRootDel.del += f.D
    baseRootDel.entries.push(`${rel} (+${f.I}/-${f.D})`)
  } else {
    anomalies.push(`DIFF 非域路径(M/A): ${f.newPath} status=${f.status} +${f.I}/-${f.D}`)
  }
}

console.log('== [1] 域分组净删（git diff -M --numstat c05e2ff8dd..HEAD）==')
let tFiles = 0
let tIns = 0
let tDel = 0
for (const d of DOMAINS) {
  const g = byDomain.get(d)
  const net = g.ins - g.del
  console.log(
    `${d}/`.padEnd(10), `files=${g.files}`, `+${g.ins}/-${g.del}`, `net=${net >= 0 ? '+' + net : net}`,
    g.newFiles.length ? `新件=[${g.newFiles.join(', ')}]` : ''
  )
  tFiles += g.files
  tIns += g.ins
  tDel += g.del
}
tFiles += baseRootDel.files
tIns += baseRootDel.ins
tDel += baseRootDel.del
console.log(`(基点根删除)/ files=${baseRootDel.files} +${baseRootDel.ins}/-${baseRootDel.del} [${baseRootDel.entries.join(', ')}]`)
console.log(`合计 files=${tFiles} (+${tIns}/-${tDel}) 净额=${tIns - tDel >= 0 ? '+' + (tIns - tDel) : tIns - tDel}（含 rename 计数）`)

// [2] wc 现值（逐文件求和）
const files = walk(join(ROOT, ...READER.split('/')))
let wcTotal = 0
const perDomWc = new Map(DOMAINS.map((d) => [d, 0]))
for (const abs of files) {
  const n = lineCount(readFileSync(abs, 'utf8'))
  wcTotal += n
  const rel = abs.slice(ROOT.length + 1).replace(/\\/g, '/').slice(READER.length + 1)
  const seg = rel.split('/')[0]
  if (perDomWc.has(seg)) perDomWc.set(seg, perDomWc.get(seg) + n)
  else anomalies.push(`WC 根驻留残留: ${rel}`)
}
console.log('== [2] wc 现值（逻辑行数逐文件求和）==')
console.log(`files=${files.length} total_lines=${wcTotal}`)
for (const d of DOMAINS) console.log(`  ${d}/ = ${perDomWc.get(d)}`)

// [3] af946a5324 基线对账（git show 逐文件）
const baseFiles = git(['ls-tree', '-r', '--name-only', DESIGN_BASE, '--', READER]).split('\n').filter(Boolean)
let baseTotal = 0
for (const bf of baseFiles) baseTotal += lineCount(git(['show', `${DESIGN_BASE}:${bf}`]))
console.log('== [3] af946a5324 设计书基线（git show 逐文件，同口径逻辑行数）==')
console.log(`files=${baseFiles.length} total_lines=${baseTotal}（设计书 §3.5 记载 69 文件/11,860 行）`)
console.log(`对账：现值 ${files.length} 文件 ${wcTotal} 行 vs 基线 ${baseFiles.length} 文件 ${baseTotal} 行 → Δ文件=${files.length - baseFiles.length} Δ行=${wcTotal - baseTotal}`)

// [4] 异常面
console.log('== [4] 异常面 ==')
if (anomalies.length === 0) console.log('无（bin/M-A 非域路径/根驻留全零）')
else for (const a of anomalies) console.log(a)

const exit = anomalies.length > 0 ? 1 : 0
console.log(`EXIT=${exit}`)
process.exit(exit)
