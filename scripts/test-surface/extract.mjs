#!/usr/bin/env node
/**
 * scripts/test-surface/extract.mjs —— [F-TESTREF-00] 测试面抽取器 lib（受锁文件；
 * [locked-change] 声明面随主件——门一 N10 补齐，受锁变更尾注与主件同携带）。
 *
 * 职责：解析 tests/** 白名单用例文件（*.test.ts / *.test.tsx / *.spec.ts /
 * *.spec.tsx——门一 W7 扩）的契约面（C 面）：用例（describe 路径+标题+markers+
 * expect 断言规范化文本多重集）+ guardedDescribe 工单号集 + 体内条件 skip 规范化
 * 文本多重集。设计母本=docs/design/2026-09-11_f-testref00-design-final.md
 * （W6/W1/W2/W3/B1 裁决参数）。与设计字面的实现自裁（均有 DoD 硬项支撑，
 * 详见主件头注与实现报告自裁申报段）：
 *  ① skipSites 挂 FileSurface（文件级多重集）而非 CaseEntry——存量 15 处
 *    依赖门惯用法中 14 处物理位于模块级 helper（skipIfPending）体内、1 处在
 *    describe 体顶层，用例级归因需调用内联且会按调用点数放大（17≠15）；
 *    文件级计数在「新增依赖门调用/删调用」场景与用例级等价（计数增减双向红），
 *    删整个用例由 MISSING_CASE 兜底，无漏报。
 *  ② 漏扫哨兵用 AST 用例形态判定而非纯文本正则——guard.ts 的
 *    describe(label, fn)（双标识符参=转发调用）按设计正则会误伤，与 DoD
 *    「stats 全量 UNRESOLVABLE=0」冲突；AST 判定（callee 纯标识符
 *    it/test/describe 或带后缀属性访问形态，且首参字符串字面量或任一参为
 *    函数字面量——门一 W7 扩）防漏性等价（真用例文件必含函数字面量参数），
 *    误报面更小（转发调用不命中）。
 * skip 双桶（门一 W8 终案）：conditionalSkipSites（非字面量条件形态，双向红）
 * 与 hardSkipSites（0 参/字面量真值形态——新增红、删除=激活绿 delta）。
 * import 别名检测（门一 W6）：vitest/@playwright/test 的 it/test/describe 说明符
 * 别名或伪装本地名、namespace import → UNRESOLVABLE（用例 API 不可静态判定）。
 * it.each（W3 终案）：const 单跳解析（全文件唯一 const+ArrayLiteral 声明，
 * 标识符存在赋值/更新/多处声明即保守红）；字面量消费位=真实值，非静态位=
 * ⟨nse:源文本空白归一⟩（css→wsCss=源文本变=键变=红）；行计数入多重集。
 * expect 断言（W2 终案）：单元=最外层 expect 调用链 getText+空白归一，
 * 全记不去重（同链去重除外——链内嵌 expect 爬到同一链顶自然合并）；
 * 收集域=用例回调体子树（含体内嵌套声明函数——模块级 helper 不计）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

const WHITELIST_RE = /\.(test\.ts|test\.tsx|spec\.ts|spec\.tsx)$/
const TS_LIKE_RE = /\.(ts|tsx)$/
const TEST_API_SOURCE_RE = /^['"](vitest|@playwright\/test)['"]$/
const THREE_API = new Set(['it', 'test', 'describe'])
// 别名监视集（Kimi 补审 W-2）：import 检测面=三词+expect（expect as exp 形态
// 会使断言收集零指纹——新文件以别名书写断言即整面逃逸）；哨兵面沿用 THREE_API
const ALIAS_WATCHED = new Set([...THREE_API, 'expect'])
const DESCRIBE_PLAIN = new Set(['describe', 'test.describe'])
const DESCRIBE_SKIP = new Set(['describe.skip', 'test.describe.skip', 'xdescribe'])
const DESCRIBE_ONLY = new Set(['describe.only', 'test.describe.only'])
const CASE_PLAIN = new Set(['it', 'test'])
const CASE_SKIP = new Set(['it.skip', 'test.skip', 'xit', 'xtest'])
const CASE_ONLY = new Set(['it.only', 'test.only'])
// CASE_TODO/CASE_FIXME 为 vitest API（it.todo/it.fixme）建模命名，非占位标记
// （门一 W11 主控裁定接受——check-quality 扫描域=src+tests 不含 scripts，verify 绿实证）
const CASE_TODO = new Set(['it.todo', 'test.todo'])
const CASE_FIXME = new Set(['it.fixme', 'test.fixme'])
const CONSERVATIVE_REDS = new Set([
  'it.skipIf', 'it.runIf', 'test.skipIf', 'test.runIf',
  'it.concurrent', 'test.concurrent', 'test.extend',
  'describe.configure', 'test.describe.configure'
])

export function walkFiles(dir, filter, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    const st = statSync(p)
    if (st.isDirectory()) walkFiles(p, filter, acc)
    else if (filter(p)) acc.push(p)
  }
  return acc
}

function calleeText(node) {
  if (ts.isIdentifier(node)) return node.text
  if (ts.isPropertyAccessExpression(node)) {
    const base = calleeText(node.expression)
    return base === null ? null : `${base}.${node.name.text}`
  }
  return null
}

function staticTitleOf(expr) {
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text
  return null
}

function isFunctionExpr(e) {
  return ts.isArrowFunction(e) || ts.isFunctionExpression(e)
}

/** 字面量静态值（number 保留源文本形态——printf %s 需原样字符串） */
function literalValueOf(e) {
  let n = e
  while (ts.isParenthesizedExpression(n)) n = n.expression
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return { v: n.text, num: false }
  if (ts.isNumericLiteral(n) && !/n$/i.test(n.text)) return { v: n.text, num: true }
  if (n.kind === ts.SyntaxKind.TrueKeyword) return { v: true, num: false }
  if (n.kind === ts.SyntaxKind.FalseKeyword) return { v: false, num: false }
  if (n.kind === ts.SyntaxKind.NullKeyword) return { v: null, num: false }
  return null
}

/** 字面量真值判定（B1 三态：字面量 truthy=等价声明 skip） */
function isStaticTruthy(expr) {
  const lit = literalValueOf(expr)
  if (!lit) return null
  if (lit.num) return Number(lit.v) !== 0
  if (typeof lit.v === 'string') return lit.v !== ''
  return Boolean(lit.v)
}

export function normalizeWs(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/** expect 链顶：沿 PropertyAccess/Call 链上爬（链内嵌 expect 合并到同一链顶） */
function chainTop(node) {
  let n = node
  while (n.parent && (ts.isPropertyAccessExpression(n.parent) || ts.isCallExpression(n.parent))) n = n.parent
  return n
}

function lineOf(node, sf) {
  return sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
}

function mergeMarkers(stackFrames, own) {
  const all = new Set(own)
  for (const f of stackFrames) for (const m of f.markers) all.add(m)
  return [...all].sort()
}

/** printf 标题展开（Kimi §3.4 子集：%%/%s/%d/%i/%j/%#；$#；子集外保守红） */
function printfExpand(template, cells, index) {
  let out = ''
  let ai = 0
  const next = () => {
    if (ai >= cells.length) return { over: true }
    return { cell: cells[ai++] }
  }
  const fmt = (t, cell) => (cell.nse !== undefined ? `⟨nse:${cell.nse}⟩` : t === 'j' ? JSON.stringify(cell.lit.v) : String(cell.lit.v))
  for (let i = 0; i < template.length; i++) {
    const c = template[i]
    if (c === '$') {
      const d = template[i + 1]
      if (d === '#') { out += String(index); i++; continue }
      if (d !== undefined && /[A-Za-z_{]/.test(d)) return { bad: `$${d} 形态不在 v1 子集` }
      out += c
      continue
    }
    if (c !== '%') { out += c; continue }
    const t = template[++i]
    if (t === undefined) { out += '%'; continue }
    if (t === '%') { out += '%'; continue }
    if (t === '#') { out += String(index); continue }
    if (t === 's' || t === 'd' || t === 'i' || t === 'j') {
      const got = next()
      if (got.over) return { bad: '消费位超出展开行元素数' }
      out += fmt(t, got.cell)
      continue
    }
    return { bad: `%${t} 不在 v1 printf 子集` }
  }
  return { title: out }
}

/**
 * import 别名检测（门一 W6+Kimi 补审 W-2）：vitest/@playwright/test 源的
 * it/test/describe/expect 说明符被别名（imported≠local）或伪装本地名 →
 * UNRESOLVABLE；namespace import（v.it() 形态 calleeText 不匹配白名单）同红
 * （超裁决保守向，回炉申报）。存量全部直名 import（预检 grep 实证含 expect）。
 */
function importAliasCheck(sf, relPath, unresolvable) {
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue
    if (!TEST_API_SOURCE_RE.test(stmt.moduleSpecifier.getText(sf))) continue
    const clause = stmt.importClause
    if (!clause) continue
    const line = lineOf(stmt, sf)
    if (clause.name) {
      // default import：imported='default'——local∈监视集即伪装形态
      if (ALIAS_WATCHED.has(clause.name.text)) {
        unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（default import as ${clause.name.text}）` })
      }
    }
    const bindings = clause.namedBindings
    if (!bindings) continue
    if (ts.isNamespaceImport(bindings)) {
      unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（namespace import * as ${bindings.name.text}——${bindings.name.text}.it() 形态白名单外）` })
      continue
    }
    if (ts.isNamedImports(bindings)) {
      for (const spec of bindings.elements) {
        if (!ts.isIdentifier(spec.name)) continue
        const imported = spec.propertyName && ts.isIdentifier(spec.propertyName) ? spec.propertyName.text : spec.name.text
        const local = spec.name.text
        if (ALIAS_WATCHED.has(imported) && local !== imported) {
          unresolvable.push({ file: relPath, line, reason: `用例/断言 API 别名 import 不可静态判定（${imported} as ${local}）` })
        } else if (ALIAS_WATCHED.has(local) && !ALIAS_WATCHED.has(imported)) {
          unresolvable.push({ file: relPath, line, reason: `用例/断言 API 别名 import 不可静态判定（${imported} as ${local}——伪装本地名）` })
        }
      }
    }
  }
}

/**
 * 单文件抽取（白名单域）。unresolvable 收集 {file,line,reason}（不中断——
 * 全量明细一次输出）。
 */
function extractFile(absPath, relPath, unresolvable) {
  const text = readFileSync(absPath, 'utf8')
  const kind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, kind)
  const red = (node, reason) => unresolvable.push({ file: relPath, line: lineOf(node, sf), reason })
  importAliasCheck(sf, relPath, unresolvable)

  // 预扫描：const X = ArrayLiteral 声明表 + 标识符赋值/更新表（单跳解析防护）
  const constArrays = new Map()
  const mutatedIds = new Set()
  function preScan(node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer && ts.isArrayLiteralExpression(node.initializer)) {
      const list = node.parent
      if ((list.flags & ts.NodeFlags.Const) !== 0) {
        if (!constArrays.has(node.name.text)) constArrays.set(node.name.text, [])
        constArrays.get(node.name.text).push(node.initializer)
      }
    }
    if (ts.isBinaryExpression(node) && ts.isIdentifier(node.left) && (node.operatorToken.kind === ts.SyntaxKind.EqualsToken || node.operatorToken.kind >= ts.SyntaxKind.FirstCompoundAssignment)) {
      mutatedIds.add(node.left.text)
    }
    if ((ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) && (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) && ts.isIdentifier(node.operand)) mutatedIds.add(node.operand.text)
    ts.forEachChild(node, preScan)
  }
  preScan(sf)

  const surface = { ticketIds: new Set(), conditionalSkipSites: [], hardSkipSites: [], cases: [] }
  const stack = [{ title: null, markers: [] }]
  let currentCase = null

  function resolveEachRows(srcNode) {
    if (ts.isArrayLiteralExpression(srcNode)) return { rows: srcNode.elements.map(resolveElement) }
    if (ts.isIdentifier(srcNode)) {
      const name = srcNode.text
      if (mutatedIds.has(name)) return { bad: `each 数组标识符 ${name} 存在赋值/更新` }
      const decls = constArrays.get(name)
      if (!decls || decls.length !== 1) return { bad: `each 数组标识符 ${name} 无唯一 const+ArrayLiteral 声明` }
      return { rows: decls[0].elements.map(resolveElement) }
    }
    return { bad: 'each 第 1 参非 ArrayLiteral 或可解析 const 标识符' }
  }
  function resolveElement(e) {
    const lit = literalValueOf(e)
    if (lit) return { lit }
    if (ts.isArrayLiteralExpression(e)) {
      return { tuple: e.elements.map((el) => {
        const inner = literalValueOf(el)
        return inner ? { lit: inner } : { nse: normalizeWs(el.getText(sf)) }
      }) }
    }
    return null
  }
  function cellsOf(row) {
    if (row.tuple !== undefined) return row.tuple
    return [row]
  }

  function collectCaseBody(entry, callback) {
    const prev = currentCase
    currentCase = entry
    entry._chainSet = new Set()
    ts.forEachChild(callback, visit)
    entry.assertions = [...entry._chainSet].map((n) => normalizeWs(n.getText(sf)))
    delete entry._chainSet
    currentCase = prev
  }

  function visit(node) {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'expect' && currentCase !== null) {
      currentCase._chainSet.add(chainTop(node))
    }
    if (ts.isCallExpression(node)) {
      const ct = calleeText(node.expression)
      if (ct === 'guardedDescribe') {
        const idArg = node.arguments[0]
        const titleArg = node.arguments[1]
        const ticketId = idArg && ts.isStringLiteral(idArg) ? idArg.text : null
        const title = titleArg ? staticTitleOf(titleArg) : null
        if (ticketId === null || title === null) {
          red(node, 'guardedDescribe 工单号/标题非字符串字面量')
        } else {
          surface.ticketIds.add(ticketId)
          stack.push({ title, markers: stack[stack.length - 1].markers })
          ts.forEachChild(node, visit)
          stack.pop()
          return
        }
      } else if (DESCRIBE_PLAIN.has(ct) || DESCRIBE_SKIP.has(ct) || DESCRIBE_ONLY.has(ct)) {
        const own = DESCRIBE_SKIP.has(ct) ? ['skip'] : DESCRIBE_ONLY.has(ct) ? ['only'] : []
        const titleArg = node.arguments[0]
        const title = titleArg ? staticTitleOf(titleArg) : null
        if (title === null) {
          red(node, 'describe 标题非字符串字面量（动态标题不可静态判定）')
        } else {
          const parentMarkers = stack[stack.length - 1].markers
          stack.push({ title, markers: [...new Set([...parentMarkers, ...own])] })
          ts.forEachChild(node, visit)
          stack.pop()
          return
        }
      } else if (ts.isCallExpression(node.expression) && ct === null) {
        // 潜在 each 形态：外层被调者本身是调用（it.each(ARR)(title, fn)）——
        // calleeText 对 CallExpression 返回 null，须取内层调用的被调者文本
        const inner = calleeText(node.expression.expression)
        if (inner !== null && (inner.startsWith('it.each') || inner.startsWith('test.each') || inner.startsWith('describe.each'))) {
          if (inner !== 'it.each' && inner !== 'test.each') {
            red(node, `${inner} 形态不在 v1 支持子集（describe.each/带后缀 each）`)
          } else {
            const srcNode = node.expression.arguments[0]
          const titleArg = node.arguments[0]
          const callback = node.arguments.find((a) => isFunctionExpr(a)) ?? null
          const resolved = srcNode ? resolveEachRows(srcNode) : { bad: 'each 缺少数组参数' }
          const tpl = titleArg && (ts.isStringLiteral(titleArg) || ts.isNoSubstitutionTemplateLiteral(titleArg)) ? titleArg.text : null
          if (resolved.bad) red(node, `it.each 解析失败：${resolved.bad}`)
          else if (tpl === null) red(node, 'it.each 标题模板非静态字符串（插值模板不可静态判定）')
          else {
            const holder = { assertions: [] }
            if (callback) collectCaseBody(holder, callback)
            resolved.rows.forEach((row, idx) => {
              if (row === null) return
              const got = printfExpand(tpl, cellsOf(row), idx)
              if (got.bad !== undefined) {
                red(node, `it.each 标题展开失败（行 ${idx}）：${got.bad}`)
                return
              }
              const describePath = stack.slice(1).map((f) => f.title)
              surface.cases.push({
                key: JSON.stringify([...describePath, got.title]),
                describePath,
                title: got.title,
                markers: mergeMarkers(stack, []),
                line: lineOf(titleArg, sf),
                assertions: [...holder.assertions],
                _eachRow: true
              })
            })
            if (resolved.rows.some((r) => r === null)) red(node, 'it.each 数组含不可解析元素（顶层仅接受字面量/字面量元组）')
            return
          }
          }
        }
      } else if (CASE_PLAIN.has(ct) || CASE_SKIP.has(ct) || CASE_ONLY.has(ct) || CASE_TODO.has(ct) || CASE_FIXME.has(ct)) {
        const titleArg = node.arguments[0]
        const hasFn = node.arguments.some((a) => isFunctionExpr(a))
        const own = CASE_SKIP.has(ct) ? ['skip'] : CASE_ONLY.has(ct) ? ['only'] : CASE_TODO.has(ct) ? ['todo'] : CASE_FIXME.has(ct) ? ['fixme'] : []
        const isDeclaration = titleArg !== undefined && staticTitleOf(titleArg) !== null && hasFn
        if (!isDeclaration && (CASE_SKIP.has(ct) || CASE_FIXME.has(ct))) {
          // W8 双桶三态（文件级建模，自裁①）：非声明形态=体内 skip。
          // conditional 桶（非字面量条件）双向红；hard 桶（0 参/字面量真值）
          // 新增红、删除=激活绿 delta（与 markers 激活语义一致）。
          if (node.arguments.length === 0 || node.arguments[0] === undefined) {
            surface.hardSkipSites.push(normalizeWs(node.getText(sf))) // test.skip() 0 参=恒 skip
          } else {
            const truthy = isStaticTruthy(node.arguments[0])
            if (truthy === null) surface.conditionalSkipSites.push(normalizeWs(node.getText(sf)))
            else if (truthy) surface.hardSkipSites.push(normalizeWs(node.getText(sf)))
            // 字面量假值条件（false/0）=永不触发，不建模
          }
          ts.forEachChild(node, visit)
          return
        }
        const title = titleArg !== undefined ? staticTitleOf(titleArg) : null
        if (title === null) {
          red(node, `用例标题非字符串字面量（${ct} 动态标题不可静态判定）`)
        } else {
          const describePath = stack.slice(1).map((f) => f.title)
          const entry = {
            key: JSON.stringify([...describePath, title]),
            describePath,
            title,
            markers: mergeMarkers(stack, own),
            line: lineOf(titleArg, sf),
            assertions: []
          }
          surface.cases.push(entry)
          const callback = node.arguments.find((a) => isFunctionExpr(a))
          if (callback) collectCaseBody(entry, callback)
          return
        }
      } else if (CONSERVATIVE_REDS.has(ct)) {
        red(node, `${ct} 形态不在 v1 支持子集（保守红，走豁免或改写为静态形态）`)
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  surface.cases.forEach((c) => { c.markers = [...new Set(c.markers)].sort() })
  return {
    ticketIds: [...surface.ticketIds].sort(),
    conditionalSkipSites: surface.conditionalSkipSites,
    hardSkipSites: surface.hardSkipSites,
    cases: surface.cases
  }
}

/** 漏扫哨兵（设计 W6+自裁②+门一 W7 扩）：非白名单 .ts/.tsx 含用例调用形态 →
 *  保守红。callee 识别面=纯标识符三词 或 带后缀属性访问（calleeText 匹配
 *  /^(it|test|describe)\./）；命中后仍按参数形态判定（首参字符串字面量或
 *  任一参函数字面量）——guard.ts 的 describe(label, fn)/describe.skip(label, fn)
 *  转发调用（双标识符参）不误伤，真用例（带回调）不漏。 */
function sentinelCheck(absPath, relPath, unresolvable) {
  const text = readFileSync(absPath, 'utf8')
  const kind = relPath.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(absPath, text, ts.ScriptTarget.Latest, true, kind)
  importAliasCheck(sf, relPath, unresolvable)
  function visit(node) {
    if (ts.isCallExpression(node)) {
      const ct = calleeText(node.expression)
      const isBareThree = ts.isIdentifier(node.expression) && THREE_API.has(node.expression.text)
      const isDottedThree = ct !== null && /^(it|test|describe)\./.test(ct)
      if (isBareThree || isDottedThree) {
        const looksCase =
          (node.arguments[0] !== undefined && (ts.isStringLiteral(node.arguments[0]) || ts.isNoSubstitutionTemplateLiteral(node.arguments[0]))) ||
          node.arguments.some((a) => isFunctionExpr(a))
        if (looksCase) {
          unresolvable.push({ file: relPath, line: lineOf(node, sf), reason: `漏扫哨兵：非白名单文件含用例调用形态（${isDottedThree ? ct : 'it/test/describe'}——门一 W7 扩）` })
          return
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
}

/** 全量抽取：tests/** → {surfaces: Map<posixRel, FileSurface>, unresolvable: []} */
export function extractAll(root) {
  const all = walkFiles(join(root, 'tests'), (p) => TS_LIKE_RE.test(p))
  const surfaces = new Map()
  const unresolvable = []
  for (const abs of all) {
    const rel = abs.replaceAll('\\', '/').slice(root.replaceAll('\\', '/').length + 1)
    if (WHITELIST_RE.test(rel)) {
      surfaces.set(rel, extractFile(abs, rel, unresolvable))
    } else {
      sentinelCheck(abs, rel, unresolvable)
    }
  }
  return { surfaces, unresolvable }
}

/** stats 汇总（DoD 数字全部机器实测于此；门一 W8——skipSiteCount=双桶和，
 *  向后兼容口径；conditionalSkipSiteCount/hardSkipSiteCount 新字段） */
export function statsOf(surfaces, unresolvable) {
  let caseCount = 0
  let assertionCount = 0
  let conditionalSkipSiteCount = 0
  let hardSkipSiteCount = 0
  let ticketIdCount = 0
  let eachExpandedRows = 0
  for (const s of surfaces.values()) {
    caseCount += s.cases.length
    conditionalSkipSiteCount += s.conditionalSkipSites.length
    hardSkipSiteCount += s.hardSkipSites.length
    ticketIdCount += s.ticketIds.length
    for (const c of s.cases) {
      assertionCount += c.assertions.length
      if (c._eachRow) eachExpandedRows++
    }
  }
  return {
    fileCount: surfaces.size,
    caseCount,
    assertionCount,
    skipSiteCount: conditionalSkipSiteCount + hardSkipSiteCount,
    conditionalSkipSiteCount,
    hardSkipSiteCount,
    ticketIdCount,
    eachExpandedRows,
    unresolvableCount: unresolvable.length
  }
}
