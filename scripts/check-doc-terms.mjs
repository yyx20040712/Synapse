#!/usr/bin/env node
/**
 * check-doc-terms.mjs —— 文档禁用词门禁（F-DOCGOV-02 U4，2026-10-28 落地）。
 *
 * 职责：活文档正文出现宪法「文档写作规范」节（F-DOCGOV-02，2026-10-28）
 * 禁用词表词面即红——词面棘轮，归一面=F-DOCGOV-02 U3 批（2026-10-28）。
 * 机检词表单源=本文件；宪法规范节列人读词面（同表）、methodology §5.2
 * 另列替换写法建议（部分覆盖，人审执法）——三层分工非复制。
 * 词表复审节奏与退出条件=docs/defense-lifecycle.md 登记行㉖。
 *
 * 扫描面（活文档白名单——历史过程档不追溯改写）：
 *   - AGENTS.md、README.md
 *   - docs/ 活文档：methodology / invariants / defense-lifecycle /
 *     architecture / security / ROADMAP / DEVELOPMENT / DEV-SETUP
 *   - docs/adr/ 2026-10-28 起新写的 ADR 全检——选面=按文件名编号 ≥0031
 *     代理（0031=该日新写件已随 U3 归一，为其首件；0030 及以前=历史
 *     决策记录不追溯）。注记今名的语义正确性（今名是否真是今名）=人审
 *     面，登记行㉖复审节奏抽查。
 *   - 不含 tickets/registry.ts 存量行与 docs/prompts 交接书——存量=历史
 *     登记性质不追溯，新增行与新增交接书的人审执法面见 methodology §5.4
 *
 * 行级豁免（内容锚定，防行号漂移；一律 fail-closed——锚缺失不豁免）：
 *   - 括号注记「<禁用词>（…）」（如「回炉（返工）」）与「历史称门一 /
 *     历史称门二」「原称三屋」——豁免方式=剥离子串后继续扫该行剩余文本
 *     （注记不是整行通行证；括号注记须全角括号且今名非空、自身零禁用词
 *     ——「X（）」「X（含 Y 禁用词）」类不剥离仍红；半角括号不认=已知
 *     边界，复审节奏面承载）
 *   - methodology.md §5.2 替换表的表行（以「| 」开头且处于 §5.2 节内）
 *     ——替换表自身即禁用词定义处；§5.2 标题或终止锚缺失时区段=null
 *     不豁免
 *   - AGENTS.md 词表条目区段（「- **禁止自造隐喻词」bullet 到下一 bullet/
 *     标题/空行止）——词表定义处整行豁免；锚缺失时区段=null 不豁免
 *   - 白名单文件/目录（ROOT_DOCS 全部+docs/adr）缺失=哨兵违规（扫描面
 *     失能 fail-closed，防改名/迁移/cwd 错位的静默绿）
 *
 * 供 check-quality.mjs 第 12 段 import 调用（先例=scanModelNames）；
 * 也可独立运行：node scripts/check-doc-terms.mjs（exit 1=有命中）。
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

// 宪法「文档写作规范」节 13 词+「三屋」（历史流程旧称，与词表同族治理）。
// 子串匹配与 model-names 同口径（如出现同形词误报再收紧词边界）。
const TERMS = [
  '战役', '门一', '门二', '回炉', '收口', '保号', '票面', '钉版',
  '批档', '销项', '落章', '席位', '屎山', '三屋'
]
const TERM_RE = new RegExp(TERMS.join('|'), 'g')

// 历史词括号注记（合法引用形态——宪法「引用历史文件中的旧词时括号注明
// 今名」）与「原称/历史称」注记：剥离子串后扫剩余，注记≠整行通行证。
// 合法形态=全角括号「<禁用词>（<非空且不含禁用词的今名>）」（如
// 「回炉（返工）」）或「历史称门一」「原称三屋制」；空注记/括号内含
// 禁用词的形态不剥离（保留受检——见 stripAnnotations 回调校验）。
const ANNOTATION_RE = new RegExp(
  `(?:历史称门[一二]|原称三屋[模制]?|(?:${TERMS.join('|')})（([^）]*)）)`,
  'g'
)
const TERM_TEST_RE = new RegExp(TERMS.join('|'))

// 剥离合法注记：括号注记须「今名非空且自身零禁用词」才剥（「战役（）」
// 「战役（含战役）」类保留原文受检）；无括号的历史称/原称形态直接剥。
function stripAnnotations(line) {
  return line.replace(ANNOTATION_RE, (mm, inner) => {
    if (inner === undefined) return ''
    return inner.trim() !== '' && !TERM_TEST_RE.test(inner) ? '' : mm
  })
}

const ROOT_DOCS = [
  'AGENTS.md',
  'README.md',
  'docs/methodology.md',
  'docs/invariants.md',
  'docs/defense-lifecycle.md',
  'docs/architecture.md',
  'docs/security.md',
  'docs/ROADMAP.md',
  'docs/DEVELOPMENT.md',
  'docs/DEV-SETUP.md'
]

// 扫描面失能哨兵面（缺任一=红，防改名/迁移/cwd 错位的静默退出）
const REQUIRED = [...ROOT_DOCS, 'docs/adr']

const ADR_MIN = 31 // ≥0031 入检（分界=宪法规范节落地日 2026-10-28）

function adrFiles(root) {
  const dir = join(root, 'docs', 'adr')
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((n) => /^(\d{4})-.*\.md$/.test(n) && Number.parseInt(n.slice(0, 4), 10) >= ADR_MIN)
    .sort()
    .map((n) => join('docs', 'adr', n))
}

// 区段解析：起始锚或终止锚缺失 → null（fail-closed：不豁免任何行——
// 豁免区段延伸到文件末的敞口比不豁免更危险）
function sectionRange(lines, startRe, endRe) {
  let start = -1
  for (let i = 0; i < lines.length; i++) {
    if (startRe.test(lines[i])) { start = i; break }
  }
  if (start < 0) return null
  for (let i = start + 1; i < lines.length; i++) {
    if (endRe.test(lines[i])) return [start, i]
  }
  return null
}

function exemptLine(rel, idx, rawLine, ranges) {
  if (rel === 'AGENTS.md') {
    const r = ranges.agents // null=锚缺失→不豁免
    if (r && idx >= r[0] && idx < r[1]) return { exempt: true }
  }
  if (rel === 'docs/methodology.md') {
    const r = ranges.table52
    if (r && idx >= r[0] && idx < r[1] && rawLine.startsWith('| ')) return { exempt: true }
  }
  return {}
}

export function scanDocTerms(root = process.cwd()) {
  const violations = []
  for (const rel of REQUIRED) {
    if (!existsSync(join(root, rel))) {
      violations.push(`哨兵：${rel} 不存在——doc-terms 扫描面失能（cwd 错位或文件被移，fail-closed）`)
    }
  }
  const adrs = adrFiles(root)
  if (existsSync(join(root, 'docs', 'adr')) && adrs.length === 0) {
    violations.push('哨兵：docs/adr 下 ≥0031 的 ADR 集合为空——ADR 扫描面失能（0031 被移/改名，fail-closed）')
  }
  const files = [...ROOT_DOCS, ...adrs]
  for (const rel of files) {
    const abs = join(root, rel)
    if (!existsSync(abs)) continue
    const lines = readFileSync(abs, 'utf8').split('\n')
    const ranges = {
      // §5.2 表行区段：始于「### 5.2 」止于下一任意级别标题
      table52: sectionRange(lines, /^### 5\.2 /, /^#{2,3} /),
      // AGENTS 词表条目：始于「- **禁止自造隐喻词」止于下一 bullet/标题/空行
      agents: sectionRange(lines, /^- \*\*禁止自造隐喻词/, /^(- |#{2,3} )|^\s*$/)
    }
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (exemptLine(rel, i, line, ranges).exempt) continue
      // 剥离合法历史注记后扫剩余文本（注记≠整行通行证）
      const remainder = stripAnnotations(line)
      TERM_RE.lastIndex = 0
      for (const m of remainder.matchAll(TERM_RE)) {
        violations.push(
          `${rel}:${i + 1}: 禁用词 "${m[0]}"（宪法「文档写作规范」节——F-DOCGOV-02 词面棘轮）`
        )
      }
    }
  }
  return violations
}

if (process.argv[1].replaceAll('\\', '/').endsWith('check-doc-terms.mjs')) {
  const hits = scanDocTerms()
  for (const h of hits) console.error('  - ' + h)
  if (hits.length > 0) {
    console.error(`doc-terms 检查未通过：${hits.length} 处命中（活文档禁用词——词表单源=本文件）`)
    process.exit(1)
  }
  console.log('doc-terms 检查通过：活文档面零禁用词')
}
