#!/usr/bin/env node
/**
 * check-tickets.mjs —— 工单一致性关卡（受锁文件）。
 * 防作弊核心（K3）：弱模型无法"不实现就翻状态"，因为：
 * 1. 代码中引用的工单号必须真实存在
 * 2. done 工单的文件里不得再引用自己的工单号以外的地方引用（自引用规约头除外）
 * 3. open 的 UI 组件工单文件必须含 data-ticket 占位标记（或非组件文件）
 * 6. v2 工单防线（B4 条款，2026-08-23）：SR2-* 工单文件头必须携带 "// b3: P7-X"
 *    裁决指针注释行，且 P7-X 必须是 docs/ROADMAP.md Phase 7+ 的已裁决候选——
 *    增量候选须经 B3 增量裁决先落 ROADMAP，再开工单（防工单化阶段任意加塞）
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const registryPath = join(root, 'tickets', 'registry.ts')
const registry = readFileSync(registryPath, 'utf-8')

const tickets = []
// 键序无关解析：先按对象字面量切块，再逐字段提取（旧版单正则锁 id→file→owner→status
// 顺序，键序重排的工单会从所有检查中静默消失）
const objRe = /\{[^{}]*?\bid:\s*'(SR2?-[A-Z]+-\d+)'[^{}]*?\}/g
let m
while ((m = objRe.exec(registry)) !== null) {
  const body = m[0]
  const fieldOf = (name) => {
    const fm = new RegExp(`\\b${name}:\\s*'([^']+)'`).exec(body)
    return fm === null ? null : fm[1]
  }
  const id = m[1]
  const file = fieldOf('file')
  const owner = fieldOf('owner')
  const status = fieldOf('status')
  if (file === null || owner === null || status === null) {
    console.error(`工单 ${id} 缺少 file/owner/status 必填字段`)
    process.exit(1)
  }
  tickets.push({ id, file, owner, status })
}
const byId = new Map(tickets.map((t) => [t.id, t]))

function walk(dir, filter, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'out' || name === 'dist' || name === '.git') continue
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walk(p, filter, acc)
    else if (filter(p)) acc.push(p)
  }
  return acc
}

const violations = []

// 1) 工单文件必须存在
for (const t of tickets) {
  if (!existsSync(join(root, t.file.replaceAll('/', '\\')))) {
    violations.push(`工单 ${t.id} 指向的文件不存在：${t.file}`)
  }
}

// 2) 代码中的工单号引用一致性（src 与 tests 规则不同）：
//    - src：任何 done 工单号的引用（本工单文件自身除外）都是占位残留，红；
//      open 号引用 = 未完成占位，合法（57 行"不存在"兜底防错号）
//    - tests：guardedDescribe('号') 是激活机制的合法引用（guard.ts：翻 done 即激活，
//      注释与断言同理）；仅占位调用受限——unimplementedObject('号')/NotImplementedError('号')
//      的号必须存在，且不得指向 done 工单（防样例挂真实号随工单完成而失效）
const srcFiles = [
  ...walk(join(root, 'src'), (p) => /\.(ts|tsx)$/.test(p)),
  ...walk(join(root, 'tests'), (p) => /\.(ts|tsx|mjs)$/.test(p))
]
const ticketRefRe = /SR2?-[A-Z]+-\d+/g
const placeholderCallRe = /(unimplementedObject|NotImplementedError)\(\s*'(SR2?-[A-Z]+-\d+)'/g
for (const f of srcFiles) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const content = readFileSync(f, 'utf-8')
  if (rel.startsWith('tests/')) {
    let pc
    placeholderCallRe.lastIndex = 0
    while ((pc = placeholderCallRe.exec(content)) !== null) {
      const t = byId.get(pc[2])
      if (!t) {
        violations.push(`${rel}: 占位桩引用了不存在的工单号 ${pc[2]}`)
        continue
      }
      if (t.status === 'done') {
        violations.push(`${rel}: 占位桩引用已完成工单 ${t.id}（样例应改用非工单号字符串，如 'SAMPLE-1'）`)
      }
    }
    continue
  }
  let ref
  ticketRefRe.lastIndex = 0
  while ((ref = ticketRefRe.exec(content)) !== null) {
    const t = byId.get(ref[0])
    if (!t) {
      violations.push(`${rel}: 引用了不存在的工单号 ${ref[0]}`)
      continue
    }
    if (t.status === 'done' && t.file !== rel) {
      violations.push(`${rel}: 引用了已完成工单 ${t.id} 的占位（该工单已 done，本文件应是独立实现）`)
    }
  }
}

// 3) done 工单的文件不得再含 NotImplementedError / unimplementedObject
for (const t of tickets.filter((x) => x.status === 'done')) {
  const p = join(root, t.file.replaceAll('/', '\\'))
  if (!existsSync(p)) continue
  const content = readFileSync(p, 'utf-8')
  if (/unimplementedObject|NotImplementedError\(/.test(content)) {
    violations.push(`${t.id} 已 done，但文件仍含未实现占位：${t.file}`)
  }
}

// 4) open 且 .tsx 的 UI 工单文件必须渲染 data-ticket 占位（骨架可见性）
for (const t of tickets.filter((x) => x.status === 'open' && x.file.endsWith('.tsx'))) {
  const p = join(root, t.file.replaceAll('/', '\\'))
  if (!existsSync(p)) continue
  const content = readFileSync(p, 'utf-8')
  if (/JSX\.Element/.test(content) && !content.includes(`data-ticket="${t.id}"`)) {
    violations.push(`${t.id}（open UI 工单）缺少 data-ticket="${t.id}" 占位标记`)
  }
}

// 5) guardedDescribe 工单号 ↔ 被测文件绑定（K3 盲区补防：把 done 工单的测试挂进
//    别人的 open 块会永久 skip 且恒绿——测试文件必须 import 该工单登记的被测文件）
const testFiles = walk(join(root, 'tests'), (p) => /\.test\.tsx?$/.test(p))
const guardRe = /guardedDescribe\(\s*'(SR2?-[A-Z]+-\d+)'/g
const importSpecRe = /(?:from\s+|import\()\s*'([^']+)'/g
for (const f of testFiles) {
  const rel = relative(root, f).replaceAll('\\', '/')
  const content = readFileSync(f, 'utf-8')
  let g
  guardRe.lastIndex = 0
  while ((g = guardRe.exec(content)) !== null) {
    const t = byId.get(g[1])
    if (!t) {
      violations.push(`${rel}: guardedDescribe 引用了不存在的工单号 ${g[1]}`)
      continue
    }
    const stem = t.file.replace(/\.tsx?$/, '')
    const specs = [...content.matchAll(importSpecRe)].map((x) => x[1])
    if (!specs.some((s) => s.includes(stem))) {
      violations.push(
        `${rel}: guardedDescribe('${t.id}') 与被测文件不符——测试未 import 该工单登记的 ` +
          `${t.file}（挂错块的测试会随工单状态被静默 skip）`
      )
    }
  }
}

// 6) v2 工单防线（B4 条款，2026-08-23）：SR2-* 工单必须携带 b3 裁决指针，且 scope
//    必须是 ROADMAP Phase 7+ 已裁决候选（由 ### P7-X: 标题行构成已裁决集）——
//    增量候选先经 B3 增量裁决落 ROADMAP，再开工单
const roadmapContent = readFileSync(join(root, 'docs', 'ROADMAP.md'), 'utf-8')
const decidedScopes = new Set([...roadmapContent.matchAll(/^### (P7-[A-Z])：/gm)].map((x) => x[1]))
for (const t of tickets) {
  if (!t.id.startsWith('SR2-')) continue
  const p = join(root, t.file.replaceAll('/', '\\'))
  if (!existsSync(p)) continue // 文件缺失已在规则 1 报告
  const content = readFileSync(p, 'utf-8')
  // 指针必须位于文件头注释区（首个代码语句之前）——放正文/尾部不算（deepseek 一审 WARN 收紧）
  const codeStart = /\n\s*(?:import|export|const|let|function|class)\b/.exec(content)
  const headerRegion = codeStart === null ? content : content.slice(0, codeStart.index)
  const bm = /^\s*\/\/\s*b3:\s*(P7-[A-Z])\s*$/m.exec(headerRegion)
  if (bm === null) {
    violations.push(
      `${t.id}（v2 工单）缺少 B3 裁决指针——文件头注释区须有 "// b3: P7-X" 注释行` +
        `（X=docs/ROADMAP.md Phase 7+ 已裁决候选；置于正文/尾部无效）`
    )
    continue
  }
  if (!decidedScopes.has(bm[1])) {
    violations.push(
      `${t.id} 的 B3 裁决指针 ${bm[1]} 不在 ROADMAP Phase 7+ 已裁决候选集内` +
        `（现有：${[...decidedScopes].sort().join('/') || '无'}）——增量候选须经 B3 增量裁决先落 ROADMAP`
    )
  }
}

const openCount = tickets.filter((t) => t.status === 'open').length
const openWeak = tickets.filter((t) => t.status === 'open' && t.owner === 'weak').length
console.log(`工单统计：共 ${tickets.length} 个；open ${openCount}（weak 可领 ${openWeak}，strong ${openCount - openWeak}）`)

if (violations.length > 0) {
  console.error('tickets 检查未通过：')
  for (const v of violations) console.error('  - ' + v)
  process.exit(1)
}
console.log('tickets 检查通过：注册表与代码一致')
