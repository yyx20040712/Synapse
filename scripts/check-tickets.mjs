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
 * 7. v3 全域化（F-REG-01，2026-09-10）：行级解析（免疫 summary 行内自平衡
 *    花括号的块级漏捕）+ id 前缀白名单 + 文件存在性全域——旧块级 objRe 只捕
 *    SR2?- 前缀，非 SR 系 44 票+SR 系嵌套截断 2 票=46 票完全脱检（F 系 done
 *    票 file 指向不存在路径曾平凡绿，红证 f-reg01-redproof-a.raw.txt）；
 *    门一 B-1 回炉：解析数对账哨兵+file 空串校验（防行格式漂移静默脱检）
 */
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = process.cwd()
const registryPath = join(root, 'tickets', 'registry.ts')
const registry = readFileSync(registryPath, 'utf-8')

const tickets = []
// 行级解析（F-REG-01 全域化）：registry 条目为单行对象（id/file/area/owner/status
// 均在 summary 字段前、字段序稳定），行级提取天然免疫 summary 内行内自平衡
// 花括号——旧块级 objRe 的 [^{}] 在 summary 含 {...} 时提前截断（7 票曾静默
// 漏检），且其 SR2?- 前缀限定使 F/P/R/B/C 系票整体脱检
for (const line of registry.split('\n')) {
  const m = /^\s*\{ id: '([^']+)', file: '([^']*)'/.exec(line)
  if (!m) continue
  const fieldOf = (name) => {
    const fm = new RegExp(`\\b${name}:\\s*'([^']+)'`).exec(line)
    return fm === null ? null : fm[1]
  }
  const id = m[1]
  const file = m[2]
  const owner = fieldOf('owner')
  const status = fieldOf('status')
  if (owner === null || status === null) {
    console.error(`工单 ${id} 缺少 owner/status 必填字段`)
    process.exit(1)
  }
  tickets.push({ id, file, owner, status })
}

// 对账哨兵（门一 B-1 回炉+门二 W-1/gate2r W-1 双向收紧）：①status 字段计数
// （值域 open|done）②id 全文计数（不锚行首——兜多行对象/非标 status 形态：
// 两类票行首正则与 status 计数均不见而 id 行恒在；summary 实测无 id: 字面量）
// ——任一 ≠ 成功解析数即硬红（exit 1）
const statusLineCount = (registry.match(/\bstatus:\s*'(?:open|done)'/g) || []).length
const idAnyCount = (registry.match(/\bid:\s*'/g) || []).length
if (statusLineCount !== tickets.length || idAnyCount !== tickets.length) {
  console.error(
    `registry 对账失败：status 字段 ${statusLineCount}/id 全文 ${idAnyCount} ≠ 成功解析 ${tickets.length}` +
      `——存在格式漂移/多行对象/非标 status 票被静默排除`
  )
  process.exit(1)
}
// 重复 id 哨兵（2026-09-18 立案批搭车微票——裁决书 §5/§8 双审 B 级发现）：
// byId/TICKET_MAP 的 Map 构建对重复 id 后写静默覆盖（先例：新 F-DOC-01 与
// 2026-09-09 既有 done 票撞号曾平凡通过——两审独立命中）；下方计数对账哨兵
// 只核解析数不核唯一性，此通道在 byId 构建前先拦，防先登记条目被顶替后
// 其全域规则集体失锚
const idSeen = new Set()
for (const t of tickets) {
  if (idSeen.has(t.id)) {
    console.error(`工单 ${t.id} 重复登记——Map 后写会静默覆盖先登记条目（id 必须全表唯一）`)
    process.exit(1)
  }
  idSeen.add(t.id)
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

// 0) 全工单号格式白名单（F-REG-01）：前缀全集=registry 165 票实测——SR/SR2/
//    R1/R2/R3/F/C/T3 系须至少一段后缀；P7 系显式枚举（裸形态仅 B7/P7A 两枚实存；
//    门二 W-2 收紧：P7D/E/X 后缀系不可裸，新前缀免同步逃逸口已封；T3=三主题
//    UI+脉络时间线战役前缀 2026-09-26 T3-P1 起）
const ID_WHITELIST = /^((SR2?|R[123]|F|C|T3)(-[A-Z0-9]+)+|P7A|(P7D|P7E|P7X)(-[A-Z0-9]+)+|B7)$/
for (const t of tickets) {
  if (!ID_WHITELIST.test(t.id)) {
    violations.push(
      `工单 ${t.id} 的 id 不在白名单（SR/SR2/R1~R3/F/C/T3 带后缀；P7A/P7D/P7E/P7X；B7）——新前缀须同步 check-tickets.mjs ID_WHITELIST`
    )
  }
  // 门一 B-1 回炉：file 空串=existsSync(root) 恒真的全规则免疫通道，硬拦
  if (t.file === '') {
    violations.push(`工单 ${t.id} 的 file 字段为空串（指向仓库根=存在性恒过、内容检查全跳）`)
  }
}

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
// 引用一致性扫描维持 SR 系（F-REG-01 终裁）：非 SR 票号在 src/tests 以规约
// 头注形态大量注释引用（R2-SH1/P7E-05/F-LG14 等实测），无占位桩语义，
// 纳入扫描即大面积误报；全域票（含非 SR）受规则 0/1/3/4b 覆盖
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
// 校验器自身豁免（门二 B-7）：本脚本源码含检测词字面量（正则+注释），对
// 自身运行规则 3 必自匹配假红——file=本脚本的票跳过内容检查（结构性必然）
const SELF_REL = relative(root, fileURLToPath(import.meta.url)).replaceAll('\\', '/')
// DIR 形态豁免清单（门一 W-2 回炉）：目录票无文件内容可检，但任意目录放行
// =逃逸口——限定到已盘点两票，新增 DIR 票须同步本清单（与白名单同机制）
const DIR_FILE_EXEMPT = new Set(['F-AUDIT-01', 'P7X-03', 'F-STOR-01'])
for (const t of tickets.filter((x) => x.status === 'done')) {
  if (t.file === SELF_REL) continue
  const p = join(root, t.file.replaceAll('/', '\\'))
  if (!existsSync(p)) continue
  if (statSync(p).isDirectory()) {
    if (!DIR_FILE_EXEMPT.has(t.id)) {
      violations.push(`工单 ${t.id} 的 file 指向目录 ${t.file}——不在 DIR_FILE_EXEMPT 清单（新增目录票须同步豁免清单）`)
    }
    continue
  }
  const content = readFileSync(p, 'utf-8')
  if (/unimplementedObject|NotImplementedError\(/.test(content)) {
    violations.push(`${t.id} 已 done，但文件仍含未实现占位：${t.file}`)
  }
}

// 4) open 且 .tsx 的 UI 工单文件必须渲染 data-ticket 占位（骨架可见性）
//    F-REG-01：限定 SR 系——本防线为骨架票设计，F 系 open 票（F-A9/F-A10/
//    F-A11）是立案时已实现的真组件，无骨架占位语义，纳入即误报
for (const t of tickets.filter((x) => /^SR2?-/.test(x.id) && x.status === 'open' && x.file.endsWith('.tsx'))) {
  const p = join(root, t.file.replaceAll('/', '\\'))
  if (!existsSync(p)) continue
  const content = readFileSync(p, 'utf-8')
  if (/JSX\.Element/.test(content) && !content.includes(`data-ticket="${t.id}"`)) {
    violations.push(`${t.id}（open UI 工单）缺少 data-ticket="${t.id}" 占位标记`)
  }
}

// 4b) done 工单文件不得残留骨架占位：自身 data-ticket 属性，或文件内任何以工单号
//     字面量初值的 *_STUB 导出（骨架文件结构上只含自身 STUB；即便出现他单 STUB 亦属
//     残留同样该红——窄化到「工单号初值」形态避免误伤正常常量命名）。
//     完成定义「占位实现已删除」的机器防线（P7-A 工单化单元 deepseek W6 处置）
for (const t of tickets.filter((x) => x.status === 'done')) {
  const p = join(root, t.file.replaceAll('/', '\\'))
  if (!existsSync(p)) continue
  if (statSync(p).isDirectory()) {
    if (!DIR_FILE_EXEMPT.has(t.id)) {
      violations.push(`工单 ${t.id} 的 file 指向目录 ${t.file}——不在 DIR_FILE_EXEMPT 清单`)
    }
    continue
  }
  const content = readFileSync(p, 'utf-8')
  if (content.includes(`data-ticket="${t.id}"`)) {
    violations.push(`${t.id} 已 done，但文件仍含自身 data-ticket 骨架占位：${t.file}`)
  }
  if (/export const [A-Z][A-Z0-9_]*_STUB\s*=\s*'SR2?-[A-Z]+-\d+'/.test(content)) {
    violations.push(`${t.id} 已 done，但文件仍含工单号初值的 *_STUB 骨架导出：${t.file}`)
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
  if (statSync(p).isDirectory()) continue // SR2 票现无目录形态；防御性守卫防 EISDIR（门一 W-5）
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
