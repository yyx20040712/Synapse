# F-LINT-02 门二审包（deepseek——处置核对终审）

## 0. 门一（0B/4W）处置对照

| finding | 处置 |
| --- | --- |
| B 锁文件未随附 | 主控核销：git diff check-locks.mjs+3/lock-protected.ps1 排除清单加 baseline.json 实档（本次已附 diff） |
| C-1 baseline 解析失败静默误归因 | 回炉升级：catch stderr 告警（含错误详情+指引）+**损坏 exit=1 不放行**（超出门一要求的告警——防绕过加固，红证在档） |
| C-2 括号壳漏收未申报 | ParenthesizedExpression 剥壳（同 while）+RED-5 括号 sentinel 红 exit=1（f-lint02-red-paren.raw.txt） |
| C-3 quality 挂点无 20 行截断 | formatDupDetails 单源导出——CLI/挂点两路径同 clipped；newRed 走 violations 全量（拦截语义不截断，warn 截断） |
| C-4 parseDiagnostics | 申报入边界矩阵（漏报方向+typecheck 兜底） |
| D 越证表述 | 已删「必红」断言（250=宪法目标线/ESLint 500 硬线口径） |
| E check-tickets 互扰 | 主控核销：verify 编排各关独立无互扰 |

## 1. 工单（四清单+一）

1. 处置核对：上表 vs 随附 diff（含锁文件两件套本轮补附）。
2. 宪法红线：受锁面完整性（baseline.json 双处登记）？
3. 代码面：回炉三修的实现（catch exit=1/剥壳/截断单源）有无新引入面？
4. 机器面：scanner 8 baseline+3 warn 不变+locks 304+230 行——收口 verify 由主控统一（A10 并发 ABI 竞态排队）。
5. 成本账本：设计链 Kimi in=2202/out=7379+deepseek 审核 in=5500/out=24128+实现者两轮 2.65M+1.43M tokens+门一 Kimi in=8025/out=6289。

输出 [B|W|N]+一行总评。

## 2. 终态 diff 全文（check-quality/package.json/两锁文件）

diff --git a/package.json b/package.json
index a965f5bf0f..faec9dd2b4 100644
--- a/package.json
+++ b/package.json
@@ -19,6 +19,7 @@
     "preview": "electron-vite preview",
     "typecheck": "tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json",
     "lint": "eslint .",
+    "lint:dup-constants": "node scripts/check-dup-constants.mjs",
     "test": "node scripts/sqlite-abi.mjs use node && vitest run",
     "test:watch": "vitest",
     "test:e2e": "npm run build && playwright test",
diff --git a/scripts/check-locks.mjs b/scripts/check-locks.mjs
index 0ec3254ebf..1156d359e8 100644
--- a/scripts/check-locks.mjs
+++ b/scripts/check-locks.mjs
@@ -38,6 +38,9 @@ function protectedFiles() {
     join(root, 'tsconfig.json'),
     join(root, 'tsconfig.node.json'),
     join(root, 'tsconfig.web.json'),
+    // [F-LINT-02] baseline 棘轮防绕过（终裁 §3）：scripts/*.json 不在 walk 自动面，
+    // 单文件显式登记——baseline 变更必经 [locked-change] 人类审查位
+    join(root, 'scripts', 'dup-constants.baseline.json'),
     ...walk(join(root, 'scripts'), (p) => p.endsWith('.mjs') || p.endsWith('.ps1'))
   ].filter((p) => existsSync(p))
   return [...new Set(files)].sort()
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index bc63612125..79be0f891d 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -6,6 +6,7 @@
  */
 import { readdirSync, readFileSync, statSync } from 'node:fs'
 import { dirname, join, relative, resolve, sep } from 'node:path'
+import { scanDuplicateConstants, formatDupDetails, clipped } from './check-dup-constants.mjs'
 
 const root = process.cwd()
 const violations = []
@@ -188,9 +189,23 @@ for (const f of cssAll) {
   if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
 }
 
+// 7) [F-LINT-02] B-1 同值双常量——同名同值跨 ≥2 文件即红（trivial/同文件豁免、
+//    异名同文案 warn 不卡 CI；baseline 棘轮=存量真命中放行待收敛）。判据与边界
+//    矩阵见 scripts/check-dup-constants.mjs 头注（独立跑：npm run lint:dup-constants）。
+//    [门一 C-3] 信息性明细（baseline 待收敛+warn）与 CLI 路径同走 clipped 20 行截断；
+//    newRed=红走 violations 全量（拦截语义不截断，与各段一致）
+const dupResult = scanDuplicateConstants(root)
+for (const v of dupResult.newRed) violations.push(`dup-constants: ${v}`)
+for (const line of clipped(formatDupDetails(dupResult))) console.log('  ' + line)
+console.log(
+  `dup-constants：扫描 ${dupResult.stats.files} 文件 / ${dupResult.stats.decls} 声明——` +
+  `红层 ${dupResult.baselineHits.length} 组 baseline 待收敛（F-LINT-03 候选）、新增 ${dupResult.newRed.length} 组、` +
+  `warn ${dupResult.warnGroups.length} 组（异名同文案不卡 CI）`
+)
+
 if (violations.length > 0) {
   console.error('quality 检查未通过：')
   for (const v of violations) console.error('  - ' + v)
   process.exit(1)
 }
-console.log('quality 检查通过：无占位标记 / 无乱码 / 无跨域引用')
+console.log('quality 检查通过：无占位标记 / 无乱码 / 无跨域引用 / 无同值双常量新增')
diff --git a/scripts/lock-protected.ps1 b/scripts/lock-protected.ps1
index d8deebef0a..6fa11b5210 100644
--- a/scripts/lock-protected.ps1
+++ b/scripts/lock-protected.ps1
@@ -17,7 +17,8 @@ function Get-ProtectedFiles {
     Where-Object { $_.FullName -notmatch '\\node_modules\\|\\out\\|\\dist\\|\\coverage\\' }
   foreach ($cfg in @('docs/invariants.md', 'vitest.config.ts', 'eslint.config.js', '.github/workflows/ci.yml',
       'playwright.config.ts', 'electron.vite.config.ts',
-      'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json')) {
+      'tsconfig.json', 'tsconfig.node.json', 'tsconfig.web.json',
+      'scripts/dup-constants.baseline.json')) {
     $p = Join-Path $root $cfg
     if (Test-Path $p) { $files += Get-Item $p }
   }

## 3. check-dup-constants.mjs 全文（终态 230 行）

#!/usr/bin/env node
/**
 * check-dup-constants.mjs —— [F-LINT-02] B-1 同值双常量 lint 关卡（受锁文件）。
 * 判据=终裁书 scripts/audits/f-lint02-design-final.md §2（六判据修正版）：
 *  1. 红层=同名同值跨 ≥2 文件（项目约定：跨文件两处即红，非 Rule of Three）；
 *  2. trivial {0,1,-1,true,false,'',null} 绝对豁免（宁漏报不加噪）；
 *  3. 文案不豁免：同名同文案入红；异名同文案（字符串值长度≥4）warn 不卡 CI
 *     （终裁修正：不限 CJK/空格——'ai-sensor' 类短横线文案同收）；明细截断 20 行；
 *  4. 同文件豁免（跨文件限定）；
 *  5. 常量名前缀规则不实现（终裁 §2.5 显式裁决：无增量收益）；
 *  6. AST 归一化：单双引号/数字分隔符（15_000≡15000）/1e3≡1000 归一；无插值
 *     TemplateLiteral ≈字面量计入；as const / as T / satisfies 包裹剥壳计入；
 *     负数字面量剥 - 壳计入（-1 落 trivial 豁免）；computed key / 对象常量 /
 *     插值模板 / bigint 天然排除（非字面量初值）——收集边界申报见实现报告。
 * baseline 棘轮（§3）：scripts/dup-constants.baseline.json 存存量 6 组真命中
 * 指纹（name+kind+value+文件集，无行号）。运行时新增/漂移命中 exit 1；
 * baseline 内打印「待收敛」放行（收敛子票 F-LINT-03 候选）。baseline 受锁
 * （check-locks.mjs/lock-protected.ps1 显式登记），变更须 [locked-change]。
 * B-2 副产物（§5）：未 export 的字面量 const 清单=stderr 只读输出，
 * DUP_CONSTANTS_B2=1 展开全清单；不卡 CI、不定消费规则。
 * CLI：node scripts/check-dup-constants.mjs（exit 1=红层新增/漂移）。
 * 挂载：check-quality.mjs 第 7 段 import 本模块（npm script lint:dup-constants 可独立跑）。
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'

const BASELINE_PATH = 'scripts/dup-constants.baseline.json'
const DETAIL_LIMIT = 20

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

/** 数字归一化：分隔符/指数记法折叠为规范十进制串（15_000≡15000、1e3≡1000） */
function normalizeNumber(text) {
  return String(Number(text.replace(/_/g, '')))
}

/** 字面量初值识别（终裁 §2.6+[门一 C-2]）：剥 as const / as T / satisfies / 括号壳；
 *  无插值模板≈字面量 */
function literalOf(init) {
  let n = init
  while (ts.isAsExpression(n) || ts.isSatisfiesExpression(n) || ts.isParenthesizedExpression(n)) n = n.expression
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
    return { kind: 'string', value: n.text }
  }
  if (ts.isNumericLiteral(n)) return { kind: 'number', value: normalizeNumber(n.text) }
  if (
    ts.isPrefixUnaryExpression(n) &&
    n.operator === ts.SyntaxKind.MinusToken &&
    ts.isNumericLiteral(n.operand)
  ) {
    return { kind: 'number', value: normalizeNumber('-' + n.operand.text) }
  }
  if (n.kind === ts.SyntaxKind.TrueKeyword) return { kind: 'boolean', value: 'true' }
  if (n.kind === ts.SyntaxKind.FalseKeyword) return { kind: 'boolean', value: 'false' }
  if (n.kind === ts.SyntaxKind.NullKeyword) return { kind: 'null', value: 'null' }
  return null
}

/** trivial 豁免（终裁 §2.2）：{0,1,-1,true,false,'',null}——宁漏报不加噪 */
function isTrivial(kind, value) {
  if (kind === 'boolean' || kind === 'null') return true
  if (kind === 'number' && ['0', '1', '-1'].includes(value)) return true
  if (kind === 'string' && value === '') return true
  return false
}

function collectDeclarations(root) {
  const decls = []
  const files = walk(join(root, 'src'), (p) => /\.(ts|tsx)$/.test(p) && !/\.test\./.test(basename(p)) && !p.endsWith('.d.ts'))
  for (const f of files) {
    const sf = ts.createSourceFile(f, readFileSync(f, 'utf-8'), ts.ScriptTarget.Latest, true)
    const visit = (node) => {
      if (ts.isVariableStatement(node) && (node.declarationList.flags & ts.NodeFlags.Const) !== 0) {
        const exp = node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false
        for (const d of node.declarationList.declarations) {
          if (!ts.isIdentifier(d.name) || !d.initializer) continue
          const lit = literalOf(d.initializer)
          if (!lit) continue
          decls.push({
            file: relative(root, f).replaceAll('\\', '/'),
            line: sf.getLineAndCharacterOfPosition(d.name.getStart(sf)).line + 1,
            name: d.name.text,
            kind: lit.kind,
            value: lit.value,
            trivial: isTrivial(lit.kind, lit.value),
            exported: exp
          })
        }
      }
      ts.forEachChild(node, visit)
    }
    visit(sf)
  }
  return { decls, fileCount: files.length }
}

function basename(p) {
  return p.replaceAll('\\', '/').split('/').pop()
}

function fingerprintOf(group) {
  return {
    name: group.name,
    kind: group.kind,
    value: group.value,
    files: [...new Set(group.decls.map((d) => d.file))].sort()
  }
}

/**
 * 主扫描：返回 { stats, redGroups, newRed, baselineHits, warnGroups, b2 }。
 * newRed 非空 = CI 红（baseline 外新增或指纹漂移——文件集/值/名任一变化即拦，
 * 棘轮：收敛与膨胀同走 [locked-change] 人类审查位）。
 */
export function scanDuplicateConstants(root) {
  const { decls, fileCount } = collectDeclarations(root)
  const active = decls.filter((d) => !d.trivial)

  // 红层：同名同值跨 ≥2 文件（同文件多声明豁免）
  const redByKey = new Map()
  for (const d of active) {
    const key = `${d.name}\u0000${d.kind}\u0000${d.value}`
    if (!redByKey.has(key)) redByKey.set(key, [])
    redByKey.get(key).push(d)
  }
  const redGroups = [...redByKey.values()]
    .filter((ds) => new Set(ds.map((d) => d.file)).size >= 2)
    .map((ds) => ({ name: ds[0].name, kind: ds[0].kind, value: ds[0].value, decls: ds }))

  // warn 层：异名同文案（字符串值长度≥4）跨 ≥2 文件——同名对已归红层，此层不卡 CI
  const warnByKey = new Map()
  for (const d of active) {
    if (d.kind !== 'string' || d.value.length < 4) continue
    if (!warnByKey.has(d.value)) warnByKey.set(d.value, [])
    warnByKey.get(d.value).push(d)
  }
  const warnGroups = [...warnByKey.values()]
    .filter((ds) => new Set(ds.map((d) => d.file)).size >= 2 && new Set(ds.map((d) => d.name)).size >= 2)
    .map((ds) => ({ value: ds[0].value, decls: ds }))

  // baseline 棘轮比对（§3）：指纹= name+kind+value+文件集（无行号）
  const baselinePath = join(root, BASELINE_PATH)
  let entries = []
  if (existsSync(baselinePath)) {
    try {
      const parsed = JSON.parse(readFileSync(baselinePath, 'utf-8').replace(/^\uFEFF/, ''))
      entries = Array.isArray(parsed?.entries) ? parsed.entries : []
    } catch (e) {
      entries = []
      // [门一 C-1] 排障归因护栏：按空处理≠静默——损坏时明示，防误导归因到扫描器
      console.error(`dup-constants 告警：${BASELINE_PATH} 解析失败按空 baseline 处理——检查文件是否损坏（${e.message}）`)
    }
  }
  const recorded = new Map(entries.map((e) => [`${e.name}\u0000${e.kind}\u0000${e.value}`, new Set(e.files)]))
  const baselineHits = []
  const newRed = []
  for (const g of redGroups) {
    const fp = fingerprintOf(g)
    const key = `${fp.name}\u0000${fp.kind}\u0000${fp.value}`
    const recordedFiles = recorded.get(key)
    if (recordedFiles && recordedFiles.size === fp.files.length && fp.files.every((f) => recordedFiles.has(f))) {
      baselineHits.push(fp)
    } else {
      const drift = recordedFiles ? `（baseline 指纹漂移：登记 ${[...recordedFiles].sort()} vs 实测 ${fp.files}——收敛请更新 baseline+[locked-change]）` : ''
      newRed.push(
        `${fp.name} = ${displayValue(fp.kind, fp.value)} 跨 ${fp.files.length} 文件（${fp.files.join(', ')}）——` +
        `同名同值跨文件${drift || '（baseline 外新增——收敛到 src/shared 唯一定义点）'}`
      )
    }
  }

  const b2 = decls.filter((d) => !d.exported).map((d) => `${d.file}:${d.line} ${d.name} = ${displayValue(d.kind, d.value)}`)
  return {
    stats: { files: fileCount, decls: decls.length, groups: redGroups.length + warnGroups.length },
    redGroups,
    baselineHits,
    newRed,
    warnGroups,
    b2
  }
}

function displayValue(kind, value) {
  return kind === 'string' ? `'${value}'` : value
}

/** 信息性明细行（baseline 待收敛+warn；红=newRed 由宿主进 violations 全量输出——
 *  拦截语义不截断）。CLI 与 check-quality 挂点共用（[门一 C-3]） */
export function formatDupDetails(r) {
  const lines = []
  for (const fp of r.baselineHits) {
    lines.push(`[baseline 待收敛] ${fp.name} = ${displayValue(fp.kind, fp.value)} ×${fp.files.length} 文件（${fp.files.join(', ')}）`)
  }
  for (const w of r.warnGroups) {
    const byName = [...new Set(w.decls.map((d) => d.name))]
    lines.push(`[warn] 异名同文案 ${displayValue('string', w.value)}（${w.decls.length} 声明 / ${new Set(w.decls.map((d) => d.file)).size} 文件：${byName.join(' / ')}）`)
  }
  return lines
}

/** 明细统一截断（终裁 §2.3+[门一 C-3]：CLI 与 check-quality 挂点两路径同走 20 行截断） */
export function clipped(lines) {
  return lines.length <= DETAIL_LIMIT ? lines : [...lines.slice(0, DETAIL_LIMIT), `…另有 ${lines.length - DETAIL_LIMIT} 行截断（lint:dup-constants 独立跑看全量）`]
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd()
  const r = scanDuplicateConstants(root)
  const details = [...r.newRed.map((v) => `[红] ${v}`), ...formatDupDetails(r)]
  console.log(`dup-constants：扫描 ${r.stats.files} 文件 / ${r.stats.decls} 声明 / ${r.stats.groups} 跨文件同值组`)
  for (const line of clipped(details)) console.log('  ' + line)
  console.error(`B-2 副产物：未 export 字面量 const ${r.b2.length} 处（DUP_CONSTANTS_B2=1 展开清单）`)
  if (process.env.DUP_CONSTANTS_B2 === '1') for (const line of r.b2) console.error('B-2 ' + line)
  if (r.newRed.length > 0) {
    console.error(`dup-constants 检查未通过：红层新增/漂移 ${r.newRed.length} 组`)
    process.exit(1)
  }
  console.log(`dup-constants 检查通过：红层 ${r.baselineHits.length} 组 baseline 待收敛（F-LINT-03 候选）/ warn ${r.warnGroups.length} 组不卡 CI`)
}
