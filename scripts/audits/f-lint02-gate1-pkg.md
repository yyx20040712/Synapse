# F-LINT-02 门一审包（对抗深审——Kimi 链）

## 0. 票面+终裁（背景）

B-1 同值双常量 lint 机器化——设计链三跳毕（Kimi 三案→deepseek 2B/多W→GLM5.3 终裁=案 A+六判据修正版+baseline 棘轮），终裁书全文=scripts/audits/f-lint02-design-final.md（随附实现者报告内有摘要）。实现者按终裁实现+对拍修正（红层 8 组≠终裁预估 6——终裁 §4 漏看组内同名子对，如 操作失败 组 ACTION_FAILED×3 同名跨文件按判据必红；warn 3 组含 ai-sensor——§2.3 长度≥4 修正案必收）。

## 1. 工单（A~E）

A 母本符合度：终裁六判据+baseline 棘轮+B-2 副产物逐条落地？对拍修正（8 组/3 warn）是否恰据判据（非实现者私改）？
B 宪法红线：受锁全程（unlock→改→apply；baseline.json 显式登记两处）？禁新依赖（typescript 已有）？行数 221≤500？
C 代码与测试质量：AST 收集边界矩阵（template/as const/引号/分隔符归一——1_500≡1500 红证在档）落实？trivial 豁免/同文件豁免/跨文件限定的实现与判据一致性？check-quality 第 7 段挂点正确性（exit code 传播）？baseline 指纹形态（name+value+文件集哈希不含行号）？
D 报告诚实性：自裁 9 条对 diff；疑虑①（AnnotationEditor 301 行）主控核销=误读（ESLint max-lines=500 硬线；250=宪法目标线，F-A11 已按 code 口径裁）——核实报告表述。
E 接缝：与 check-tickets（同挂 quality 链）的次序/输出互扰？lint:dup-constants 独立 script 与 verify 链关系？F-A9/A10 收口 manifest re-apply 预告在案？

输出 [B|W|N] 逐条+file:line+一行总评。

## 2. 实现 diff/新文件全文+实现者报告全文（随附以下三件拼接）

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
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index bc63612125..bbc0c61b67 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -6,6 +6,7 @@
  */
 import { readdirSync, readFileSync, statSync } from 'node:fs'
 import { dirname, join, relative, resolve, sep } from 'node:path'
+import { scanDuplicateConstants } from './check-dup-constants.mjs'
 
 const root = process.cwd()
 const violations = []
@@ -188,9 +189,20 @@ for (const f of cssAll) {
   if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
 }
 
+// 7) [F-LINT-02] B-1 同值双常量——同名同值跨 ≥2 文件即红（trivial/同文件豁免、
+//    异名同文案 warn 不卡 CI；baseline 棘轮=存量真命中放行待收敛）。判据与边界
+//    矩阵见 scripts/check-dup-constants.mjs 头注（独立跑：npm run lint:dup-constants）
+const dupResult = scanDuplicateConstants(root)
+for (const v of dupResult.newRed) violations.push(`dup-constants: ${v}`)
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

===NEW FILE check-dup-constants.mjs===
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

/** 字面量初值识别（终裁 §2.6）：剥 as const / as T / satisfies 壳；无插值模板≈字面量 */
function literalOf(init) {
  let n = init
  while (ts.isAsExpression(n) || ts.isSatisfiesExpression(n)) n = n.expression
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
    } catch {
      entries = []
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

/** warn/红明细统一截断（终裁 §2.3：CI 输出截断 20 行） */
function clipped(lines) {
  return lines.length <= DETAIL_LIMIT ? lines : [...lines.slice(0, DETAIL_LIMIT), `…另有 ${lines.length - DETAIL_LIMIT} 行截断（lint:dup-constants 独立跑看全量）`]
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const root = process.cwd()
  const r = scanDuplicateConstants(root)
  const details = []
  for (const fp of r.baselineHits) {
    details.push(`[baseline 待收敛] ${fp.name} = ${displayValue(fp.kind, fp.value)} ×${fp.files.length} 文件（${fp.files.join(', ')}）`)
  }
  for (const v of r.newRed) details.push(`[红] ${v}`)
  for (const w of r.warnGroups) {
    const byName = [...new Set(w.decls.map((d) => d.name))]
    details.push(`[warn] 异名同文案 ${displayValue('string', w.value)}（${w.decls.length} 声明 / ${new Set(w.decls.map((d) => d.file)).size} 文件：${byName.join(' / ')}）`)
  }
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

===NEW FILE dup-constants.baseline.json===
{
  "_comment": "F-LINT-02 baseline 棘轮（终裁书 f-lint02-design-final.md §3）：存量真命中指纹=name+kind+value+文件集（无行号）。任何变更（收敛删减/漂移）须更新本文件并带 [locked-change] 提交尾注——棘轮位=人类审查。实测 8 组（对拍修正：终裁 §4 预估 6 组漏算了 '操作失败' 组内的 ACTION_FAILED×3/OP_FAILED×4 同名子对，按 §2.3 判据同名同文案跨文件入红层，以 §4『对拍通过为验收』为准）。",
  "entries": [
    {
      "name": "ACTION_FAILED",
      "kind": "string",
      "value": "操作失败",
      "files": [
        "src/renderer/features/library/usePaperDetailActions.ts",
        "src/renderer/features/reader/AiNotesStatus.tsx",
        "src/renderer/features/settings/ZcodeLinkSection.tsx"
      ]
    },
    {
      "name": "OP_FAILED",
      "kind": "string",
      "value": "操作失败",
      "files": [
        "src/renderer/features/settings/SettingsPage.tsx",
        "src/renderer/features/settings/UiScaleSection.tsx",
        "src/renderer/features/workspaces/WorkspaceSection.tsx",
        "src/renderer/features/workspaces/WorkspaceSwitcher.tsx"
      ]
    },
    {
      "name": "COLUMN_GAP_H_FACTOR",
      "kind": "number",
      "value": "1.5",
      "files": [
        "src/renderer/features/reader/annotation-anchor.ts",
        "src/renderer/features/reader/pdf-item-geometry.ts"
      ]
    },
    {
      "name": "COLUMN_GAP_PAGE_RATIO",
      "kind": "number",
      "value": "0.02",
      "files": [
        "src/renderer/features/reader/annotation-anchor.ts",
        "src/renderer/features/reader/pdf-item-geometry.ts"
      ]
    },
    {
      "name": "btn",
      "kind": "string",
      "value": "rounded border px-2 py-0.5 text-xs disabled:opacity-50",
      "files": [
        "src/renderer/features/reader/AnnotationEditor.tsx",
        "src/renderer/features/reader/AnnotationMenu.tsx"
      ]
    },
    {
      "name": "STATUS_POLL_MS",
      "kind": "number",
      "value": "5000",
      "files": [
        "src/renderer/features/reader/AiNotesStatus.tsx",
        "src/renderer/features/settings/ZcodeLinkSection.tsx"
      ]
    },
    {
      "name": "TAG_OP_FAILED",
      "kind": "string",
      "value": "标签操作失败",
      "files": [
        "src/renderer/features/tags/TagEditor.tsx",
        "src/renderer/features/tags/tags.store.ts"
      ]
    },
    {
      "name": "ITEM_STYLE",
      "kind": "string",
      "value": "block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5",
      "files": [
        "src/renderer/features/lineage/LineageNodeMenu.tsx",
        "src/renderer/features/tags/TagLifecycleMenu.tsx"
      ]
    }
  ]
}

===实现者报告===
# F-LINT-02 实现报告（B-1 同值双常量 lint 机器化——实现段）

> 实现者子代理（三屋模式）；蓝本=终裁书 f-lint02-design-final.md 逐节照做；
> 对拍金标准=f-lint02-dryrun.raw.txt（dry-run 脚本本体已不在档，输出档在）。
> 配置自查：实现席 GLM5.3flash 档；无 vitest/test 面操作（票面禁全量 verify/test——
> 定向验证清单见 §3）。技能清点：TDD（红证形态适配为变异红证法）/完成前验证（用）；
> 系统化调试（不用——实现场非调试场）。

## 1. 实现摘要

案 A 落地：单文件 AST 扫描器（typescript@~5.6.3 devDeps 已有——**零新依赖**，
票面 §④ 顾虑项解除：无需退正则降档）挂 check-quality 第 7 段。判据=终裁 §2
六判据修正版逐条实现；baseline 棘轮=终裁 §3；B-2 副产物=终裁 §5。
**核心对拍修正：红层实测 8 组（非终裁预估 6）**——详见 §4/§6-1。

## 2. 文件清单（全部相对仓库根）

| 文件 | 性质 | 说明 |
| --- | --- | --- |
| scripts/check-dup-constants.mjs | 新增 221 行（受锁自动入面） | AST 收集+红/warn 分层+baseline 棘轮+B-2+CLI |
| scripts/dup-constants.baseline.json | 新增 80 行（**显式登记受锁**） | 8 组存量真命中指纹 |
| scripts/check-quality.mjs | +14/-1（受锁流程内改） | import scanDuplicateConstants+第 7 段挂点 |
| scripts/check-locks.mjs | +3（受锁流程内改） | protectedFiles 显式加 baseline.json（walk 面外单文件登记） |
| scripts/lock-protected.ps1 | +2/-1（受锁流程内改） | cfg 列表同步加（与 check-locks 口径一致） |
| package.json | +1 | `"lint:dup-constants": "node scripts/check-dup-constants.mjs"` |

受锁操作：unlock（×2——中途被并发会话 re-apply 回只读，见 §6-6）→改→apply
（manifest 299 条，含 dup-constants 两件）→locks:check exit=0 亲验。

## 3. 定向验证清单（未跑 verify/test 全量——票面禁令）

- `node scripts/check-dup-constants.mjs` → exit=0（8 组 baseline 待收敛/warn 3 组）✓
- `node scripts/check-quality.mjs` → 第 7 段摘要行正常；**唯一红=AnnotationEditor.tsx
  302 行超组件上限=F-A11 收口提交（a50e3c348d）自带欠账，非本票引入**（HEAD 与工作树
  同为 301 行物理；该票面自称 verify exit=0 亲验与现状矛盾——见 §7 疑虑）
- `npx eslint scripts/check-dup-constants.mjs scripts/check-quality.mjs
  scripts/check-locks.mjs` → exit=0 ✓
- `node scripts/check-locks.mjs` → exit=0，manifest 含 dup-constants×2 ✓

## 4. 存量对拍表（收集器 vs dry-run 18 组逐组）

扫描面：213 文件（dry-run 214=dry-run 时点 212 ts/tsx+2 个 env.d.ts，未含 F-A9
新增 annotation-band-calibrate.ts；本器排除 .d.ts/.test.，含 band-calibrate）。
声明：**149**（dry-run 138——差 11 逐条定性：138+3 终裁 §2.6 归一化设计增量
[AGG_COLS/INTERFACE_MD 无插值模板×2、BAND_LEFT 负数×1]+8 嵌套作用域 const
[判据不限作用域；dry-run 正则=顶层纯字面量口径]；组级零假阳零漏）。

| dry-run 组 | 值（归一后） | 本器归类 | 成员文件集比对 |
| --- | --- | --- | --- |
| '操作失败' | '操作失败' | **红×2+warn**（拆分） | ACTION_FAILED 3 文件/OP_FAILED 4 文件逐一一致；整组异名另入 warn |
| 2 | 2 | 放行（数字异名） | — |
| 3 | 3 | 放行 | — |
| 0.5 | 0.5 | 放行 | — |
| 200 | 200 | 放行 | — |
| 50 | 50 | 放行 | — |
| 32 | 32 | 放行 | — |
| 15_000 | 15000 | 放行（HTTP_TIMEOUT_MS/READING_TICK_MS 异名） | — |
| 'ai-sensor' | 'ai-sensor' | warn（§2.3 长度≥4 修正案收） | 2 文件一致 |
| 100 | 100 | 放行 | — |
| 0.1 | 0.1 | 放行 | — |
| 1.5 | 1.5 | **红 baseline** | 2 文件一致 |
| 0.02 | 0.02 | **红 baseline** | 2 文件一致 |
| '标注保存失败' | '标注保存失败' | warn | 2 文件一致 |
| btn（tailwind） | 同值 | **红 baseline** | 2 文件一致（同名异值的 3 处局部 btn 正确未入组） |
| 5000 | 5000 | **红 baseline**（STATUS_POLL_MS） | 2 文件一致 |
| '标签操作失败' | '标签操作失败' | **红 baseline**（TAG_OP_FAILED） | 2 文件一致 |
| ITEM_STYLE（tailwind） | 同值 | **红 baseline** | 2 文件一致 |

结论：18 组全覆盖（8 红+3 warn+9 数字异名放行；'操作失败' 1 组拆 2 红+1 warn），
成员文件集与 dry-run 逐一吻合，零新增组。

## 5. 红证系列（变异法：临时 src/red-proof-{a,b}.ts 植入→跑→落盘→删；
git status 残留检查=零）

| 编号 | 场景 | 预期 | 实测 | 档案 |
| --- | --- | --- | --- | --- |
| RED-1 | 跨文件同名同值 RED_PROOF_SENTINEL | 红 | exit=1 | f-lint02-red-sentinel.raw.txt |
| RED-1r | 上者还原 | 绿 | exit=0 | f-lint02-red-sentinel-restore.raw.txt |
| RED-2 | 阴性对照：异名同值 RED_A=777/RED_B=777 | 不红 | exit=0 | f-lint02-red-negative.raw.txt |
| RED-3a | 矩阵：无插值模板（反引号 vs 单引号跨形态） | 红 | exit=1 | f-lint02-red-tpl.raw.txt |
| RED-3b | 矩阵：as const 包裹（一边裸字面量） | 红 | exit=1 | f-lint02-red-asc.raw.txt |
| RED-3c | 矩阵：同文件两处同名同值 | 不红 | exit=0 | f-lint02-red-samefile.raw.txt |
| RED-3d | 矩阵：trivial 值（=1）同名跨文件 | 不红 | exit=0 | f-lint02-red-trivial.raw.txt |
| RED-4 | 自裁加验：1_500≡1500 数字分隔符归一 | 红 | exit=1 | f-lint02-red-sep.raw.txt |

另：首跑（baseline 未建时）全红输出档=f-lint02-first-run.raw.txt。

## 6. 自裁申报（超票面/终裁口径偏差全录）

1. **红层 8 组≠终裁 §4 预估 6 组**：'操作失败' 组内 ACTION_FAILED（3 文件同名
   同值）与 OP_FAILED（4 文件）满足 §2.3「同名同文案入红层」判据——终裁 §4
   预分组把整组归 warn 系漏看同名子对。依 §4 自身「『6 组真命中』=待对拍结论，
   实现期以对拍通过为验收（非默认事实）」条款，以判据实测为准收 8 组入 baseline。
   ACTION_FAILED×3 本就是 B-1 票意欲拦的典型同值双常量。
2. **warn 3 组≠终裁 §4/§6「2 组/warn≤2」**：§2.3 修正案（长度≥4 即 warn，'ai-sensor'
   漏收修正）在判据层必然收入 'ai-sensor'（9 字符）——§4/§6 的 2 组为修正前残留
   数字。判据层优先，实测 3 组。
3. **baseline 指纹加 kind 维**（name+kind+value+文件集）：较终裁「name+value+文件集」
   收紧——同名同值但类型层变（'5' vs 5）不互抵，重审一次。
4. **剥壳口径**：终裁 §2.6 字面为「as const/satisfies 包裹计入」；实现为
   AsExpression 全剥（含 `as SomeType`）。当前存量两种口径零差分（shell 样本全为
   数组/对象 as const，非字面量不收）；边界行为差异留档。
5. **RED-4 加验**：票面矩阵四边界外自裁加数字分隔符归一证（§2.6 要求面）。
6. **并发踩踏申报**：①本席 unlock 后受锁面被并发会话（F-A9/F-A10 之一）re-apply
   回只读，二次 unlock 后完成；②本席 locks:apply 已将 F-A9 在途中间态
   （band-calibration.test.tsx 修改态+audits 下 4 个探针 .mjs）卷入 manifest 299——
   **F-A9/F-A10 收口时须自行 re-apply 收敛**（其探针若删除亦触发 manifest 再生）。
7. **package.json 受锁与否**：票面问号项——经 check-locks.mjs protectedFiles 逐行核对
   =不在受锁面，scripts 字段新增无需 unlock 流程（[locked-change]/[dep-change] 尾注
   需求均不触发；非依赖变更）。
8. **挂点解读**：终裁「挂 check-quality 链（eslint 后）」实现为 quality:check 宿主
   第 7 段（F-LINT-01 同位先例）+独立 npm script lint:dup-constants；verify 链顺序
   未动（「eslint 后」按案 A 原意=补充 eslint 之不足的第二道 lint 解读）。
9. **B-2 副产物**：默认 stderr 一行计数（实测 91 处），DUP_CONSTANTS_B2=1 展开
   全清单——不卡 CI、不定消费规则（终裁 §5 半合派）。

## 7. 疑虑

1. **AnnotationEditor.tsx 301 行（quality 计 302）超组件 250 上限**：HEAD
   a50e3c348d（F-A11 收口提交）即此状态且工作树无后续修改；该票面自称「verify
   exit=0 亲验」与 quality 第 4 段必红矛盾——非本票引入，主控统一 verify 时将
   遇红，需溯源 F-A11 的 verify 时序（是否提交前又有改动/verify 输出真伪）。
2. 终裁 §6 验收「verify 全链+check-quality 挂点即绿」在本仓当前场态无法达成：
   除上条欠账外 locks:check 依赖 F-A9/F-A10 收口收敛——本票面内自验面（§3）全绿。
3. 干燥跑脚本本体（f-lint02-dryrun.mjs）不在档，对拍以 raw.txt 输出为金标准
   （组级 100% 吻合已是最强可得证据；声明级 138 的正则口径细节不可完全逆向）。
