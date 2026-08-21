#!/usr/bin/env node
/**
 * check-tickets.mjs —— 工单一致性关卡（受锁文件）。
 * 防作弊核心（K3）：弱模型无法"不实现就翻状态"，因为：
 * 1. 代码中引用的工单号必须真实存在
 * 2. done 工单的文件里不得再引用自己的工单号以外的地方引用（自引用规约头除外）
 * 3. open 的 UI 组件工单文件必须含 data-ticket 占位标记（或非组件文件）
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const registryPath = join(root, 'tickets', 'registry.ts')
const registry = readFileSync(registryPath, 'utf-8')

const tickets = []
const lineRe = /\{\s*id:\s*'(SR-[A-Z]+-\d+)',[^}]*?file:\s*'([^']+)',[^}]*?owner:\s*'(strong|weak)',[^}]*?status:\s*'(open|done)'/g
let m
while ((m = lineRe.exec(registry)) !== null) {
  tickets.push({ id: m[1], file: m[2], owner: m[3], status: m[4] })
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
const ticketRefRe = /SR-[A-Z]+-\d+/g
const placeholderCallRe = /(unimplementedObject|NotImplementedError)\(\s*'(SR-[A-Z]+-\d+)'/g
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

const openCount = tickets.filter((t) => t.status === 'open').length
const openWeak = tickets.filter((t) => t.status === 'open' && t.owner === 'weak').length
console.log(`工单统计：共 ${tickets.length} 个；open ${openCount}（weak 可领 ${openWeak}，strong ${openCount - openWeak}）`)

if (violations.length > 0) {
  console.error('tickets 检查未通过：')
  for (const v of violations) console.error('  - ' + v)
  process.exit(1)
}
console.log('tickets 检查通过：注册表与代码一致')
