# 门一定点复核：Kimi 补审 findings 修复轮（F-TESTREF-00）

你是门一（对抗式审查员）。你此前的全量独立补审（scripts/audits/f-testref00-kimi-sup.md 结论=需修复：B-1/W-1/W-2/N-1）已由主控修复。本趟=**定点复核修复**（不重审全量）。修复者=主控本人（GLM，同源申报——你的复核独立性即主要防线，从严）。

## 修复声明（逐条）
- B-1：NEW_FILE 分支循环头部补 only 判定（ONLY_FORBIDDEN+continue，不再落 NEW delta）。
- W-1：judge 返回前输出级**计数感知去重**——一条 SKIP_ADDED 抵一条同 path+title 的 MISSING_CASE（判定逻辑与 exit 零变化；两态比对未触碰）。
- W-2：extract.mjs 增 ALIAS_WATCHED=三词∪{expect}，仅 importAliasCheck 换用（哨兵面仍 THREE_API）；存量 expect 别名预检=0。
- N-1：exemptHitKeys 改存**豁免条目对象**（Set 身份计——同条目多命中计一/跨 kind 不虚计；stale=零命中条目数）。

## 变异证据（scripts/audits/f-kimi-fix-mutations-raw.txt）
- M11 新文件 it.only→ONLY_FORBIDDEN exit 1/删除复绿；M12 既有用例+skip→恰一条 SKIP_ADDED、MISSING_CASE 计数=0、exit 1；M13 新文件 expect as exp→UNRESOLVABLE exit 1/删除复绿；M14 伪豁免条目→entries:1 hits:0 stale:1 exit 0；终态绿零残留。

## 复核指令（三点）
1. 修复 diff vs 声明逐条核（附 1=完整 diff）；变异证据 vs raw 对拍（附 2）。
2. 新破坏扫描：修复代码自身引入的新问题（重点：去重块的倒序 splice 正确性/ALIAS_WATCHED 对哨兵面零影响/postJson 传输层替换对重试与退避语义的影响——若 diff 外不可见标不确定）。
3. 结论：维持收口/再修（附票面）。输出 ≤2500 tokens；[B|W|N]+证据+总评；末行机读 FINDINGS: B=n W=n N=n VERDICT=PASS|FAIL。中文。

---
## 附 1 修复 diff

diff --git a/scripts/check-test-surface.mjs b/scripts/check-test-surface.mjs
index 1e3f8b3aa5..56d1d737e7 100644
--- a/scripts/check-test-surface.mjs
+++ b/scripts/check-test-surface.mjs
@@ -101,7 +101,9 @@ function fmtRelLine(file, line) {
   return line === undefined ? file : `${file}:${line}`
 }
 
-/** 主判定：返回 { failures:[], deltas:[], exemptHits:Set, statsLine } */
+/** 主判定：返回 { failures:[], deltas:[], exemptHits:Set, statsLine }。
+ * exemptHitKeys 存**豁免条目对象**（Kimi 补审 N-1：按条目身份计——同条目多次
+ * 命中只计一、一条跨 kind 命中不虚计；stale=零命中条目数）。 */
 function judge(baseFiles, cur) {
   const failures = []
   const deltas = []
@@ -142,6 +144,12 @@ function judge(baseFiles, cur) {
         }
       }
       for (const cs of c.cases) {
+        // Kimi 补审 B-1：新文件分支缺 only 判定=逃逸通道（新文件 it.only 走
+        // NEW delta 绿——only 聚焦语义使全仓测试静默缩水）。only 恒红含新文件。
+        if (cs.markers.includes('only')) {
+          failures.push({ kind: 'ONLY_FORBIDDEN', path, line: cs.line, text: cs.title })
+          continue
+        }
         if (cs.markers.includes('skip') && exemptionHits(loadExemptionsCache, 'case', path, cs).length === 0) {
           failures.push({ kind: 'SKIP_ADDED', path, line: cs.line, text: cs.title })
         } else {
@@ -176,7 +184,7 @@ function judge(baseFiles, cur) {
       const curN = cCond.get(text) ?? 0
       for (let i = 0; i < n - curN; i++) {
         const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
-        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        if (hit.length > 0) { for (const h of hit) exemptHitKeys.add(h) }
         else failures.push({ kind: 'SKIPSITE_REMOVED', path, line: undefined, text })
       }
     }
@@ -184,7 +192,7 @@ function judge(baseFiles, cur) {
       const baseN = bCond.get(text) ?? 0
       for (let i = 0; i < n - baseN; i++) {
         const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
-        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        if (hit.length > 0) { for (const h of hit) exemptHitKeys.add(h) }
         else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
       }
     }
@@ -197,7 +205,7 @@ function judge(baseFiles, cur) {
       const curN = cHard.get(text) ?? 0
       for (let i = 0; i < n - curN; i++) {
         const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
-        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        if (hit.length > 0) { for (const h of hit) exemptHitKeys.add(h) }
         else deltas.push(`ACTIVATED ${path} 「${text}」（hardSkipSite 删除）`)
       }
     }
@@ -205,7 +213,7 @@ function judge(baseFiles, cur) {
       const baseN = bHard.get(text) ?? 0
       for (let i = 0; i < n - baseN; i++) {
         const hit = exemptionHits(loadExemptionsCache, 'skipsite', path, { text })
-        if (hit.length > 0) exemptHitKeys.add(`skipsite:${path}:${text}`)
+        if (hit.length > 0) { for (const h of hit) exemptHitKeys.add(h) }
         else failures.push({ kind: 'SKIPSITE_ADDED', path, line: undefined, text })
       }
     }
@@ -243,7 +251,7 @@ function judge(baseFiles, cur) {
         // 基线签名无配对 → MISSING_CASE（先试豁免，再 MISSING_ASSERT 细化）
         const hit = exemptionHits(loadExemptionsCache, 'case', path, bcs)
         if (hit.length > 0) {
-          exemptHitKeys.add(`case:${path}:${bcs.title}`)
+          for (const h of hit) exemptHitKeys.add(h)
           continue
         }
         // MISSING_ASSERT 细化：当前同 key 存在 markers 同、断言为其子集的签名
@@ -261,7 +269,7 @@ function judge(baseFiles, cur) {
           if (missing.length > 0 && missing.length < bcs.assertions.length) {
             for (const a of missing) {
               const ahit = exemptionHits(loadExemptionsCache, 'assert', path, { assertionText: a, title: bcs.title })
-              if (ahit.length > 0) exemptHitKeys.add(`assert:${path}:${a}`)
+              if (ahit.length > 0) { for (const h of ahit) exemptHitKeys.add(h) }
               else failures.push({ kind: 'MISSING_ASSERT', path, line: bcs.line, text: a })
             }
             detailed = true
@@ -297,7 +305,7 @@ function judge(baseFiles, cur) {
         }
         if (cs.markers.includes('skip')) {
           const hit = exemptionHits(loadExemptionsCache, 'case', path, cs)
-          if (hit.length > 0) exemptHitKeys.add(`case:${path}:${cs.title}`)
+          if (hit.length > 0) { for (const h of hit) exemptHitKeys.add(h) }
           else failures.push({ kind: 'SKIP_ADDED', path, line: cs.line, text: cs.title })
           continue
         }
@@ -306,6 +314,28 @@ function judge(baseFiles, cur) {
     }
   }
 
+  // Kimi 补审 W-1：既有用例加 skip 时上半场 MISSING_CASE 与下半场 SKIP_ADDED
+  // 双报（同因复述）——输出级去重（计数感知：一条 SKIP_ADDED 抵一条同
+  // path+title 的 MISSING_CASE；判定与 exit 不变，两态比对逻辑零触碰）。
+  {
+    const skipAddedCounts = new Map()
+    for (const f of failures) {
+      if (f.kind !== 'SKIP_ADDED') continue
+      const k = `${f.path} ${f.text}`
+      skipAddedCounts.set(k, (skipAddedCounts.get(k) ?? 0) + 1)
+    }
+    for (let i = failures.length - 1; i >= 0; i--) {
+      const f = failures[i]
+      if (f.kind !== 'MISSING_CASE') continue
+      const k = `${f.path} ${f.text}`
+      const n = skipAddedCounts.get(k) ?? 0
+      if (n > 0) {
+        skipAddedCounts.set(k, n - 1)
+        failures.splice(i, 1)
+      }
+    }
+  }
+
   const statsLine = `files: ${Object.keys(baseFiles).length} base / ${cur.size} cur | cases: ${baseCaseTotal} base / ${curCaseTotal} cur` +
     ` | assertions: ${baseAssertTotal} base / ${curAssertTotal} cur | skipSites: ${baseSkipTotal} base / ${curSkipTotal} cur`
   return { failures, deltas, exemptHitKeys, statsLine }
diff --git a/scripts/test-surface/extract.mjs b/scripts/test-surface/extract.mjs
index f6eeb12dad..7d474cb01c 100644
--- a/scripts/test-surface/extract.mjs
+++ b/scripts/test-surface/extract.mjs
@@ -39,6 +39,9 @@ const WHITELIST_RE = /\.(test\.ts|test\.tsx|spec\.ts|spec\.tsx)$/
 const TS_LIKE_RE = /\.(ts|tsx)$/
 const TEST_API_SOURCE_RE = /^['"](vitest|@playwright\/test)['"]$/
 const THREE_API = new Set(['it', 'test', 'describe'])
+// 别名监视集（Kimi 补审 W-2）：import 检测面=三词+expect（expect as exp 形态
+// 会使断言收集零指纹——新文件以别名书写断言即整面逃逸）；哨兵面沿用 THREE_API
+const ALIAS_WATCHED = new Set([...THREE_API, 'expect'])
 const DESCRIBE_PLAIN = new Set(['describe', 'test.describe'])
 const DESCRIBE_SKIP = new Set(['describe.skip', 'test.describe.skip', 'xdescribe'])
 const DESCRIBE_ONLY = new Set(['describe.only', 'test.describe.only'])
@@ -160,10 +163,10 @@ function printfExpand(template, cells, index) {
 }
 
 /**
- * import 别名检测（门一 W6）：vitest/@playwright/test 源的 it/test/describe
- * 说明符被别名（imported≠local）或伪装本地名（local∈三词但 imported∉）→
+ * import 别名检测（门一 W6+Kimi 补审 W-2）：vitest/@playwright/test 源的
+ * it/test/describe/expect 说明符被别名（imported≠local）或伪装本地名 →
  * UNRESOLVABLE；namespace import（v.it() 形态 calleeText 不匹配白名单）同红
- * （超裁决保守向，回炉申报）。存量全部直名 import（预检 grep 实证）。
+ * （超裁决保守向，回炉申报）。存量全部直名 import（预检 grep 实证含 expect）。
  */
 function importAliasCheck(sf, relPath, unresolvable) {
   for (const stmt of sf.statements) {
@@ -173,8 +176,8 @@ function importAliasCheck(sf, relPath, unresolvable) {
     if (!clause) continue
     const line = lineOf(stmt, sf)
     if (clause.name) {
-      // default import：imported='default'——local∈三词即伪装形态
-      if (THREE_API.has(clause.name.text)) {
+      // default import：imported='default'——local∈监视集即伪装形态
+      if (ALIAS_WATCHED.has(clause.name.text)) {
         unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（default import as ${clause.name.text}）` })
       }
     }
@@ -189,10 +192,10 @@ function importAliasCheck(sf, relPath, unresolvable) {
         if (!ts.isIdentifier(spec.name)) continue
         const imported = spec.propertyName && ts.isIdentifier(spec.propertyName) ? spec.propertyName.text : spec.name.text
         const local = spec.name.text
-        if (THREE_API.has(imported) && local !== imported) {
-          unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（${imported} as ${local}）` })
-        } else if (THREE_API.has(local) && !THREE_API.has(imported)) {
-          unresolvable.push({ file: relPath, line, reason: `用例 API 别名 import 不可静态判定（${imported} as ${local}——伪装本地名）` })
+        if (ALIAS_WATCHED.has(imported) && local !== imported) {
+          unresolvable.push({ file: relPath, line, reason: `用例/断言 API 别名 import 不可静态判定（${imported} as ${local}）` })
+        } else if (ALIAS_WATCHED.has(local) && !ALIAS_WATCHED.has(imported)) {
+          unresolvable.push({ file: relPath, line, reason: `用例/断言 API 别名 import 不可静态判定（${imported} as ${local}——伪装本地名）` })
         }
       }
     }

---
## 附 2 变异 raw


===== M11 new-file it.only -> ONLY_FORBIDDEN =====
exit=1
[test-surface] FAIL ONLY_FORBIDDEN tests/unit/tmp-m11-only-probe.test.ts:2 「m11 only case」
after-delete exit=0

===== M12 existing case +skip -> SKIP_ADDED only (no MISSING_CASE) =====
exit=1
[test-surface] FAIL SKIP_ADDED tests/unit/renderer/theme.test.ts:175 「body 视觉底换新 --bg 且保留 html/body/#root overflow 锁（Q1 不变量）」
MISSING_CASE count=0 (expect 0)

===== M13 new-file expect alias -> UNRESOLVABLE =====
exit=1
UNRESOLVABLE tests/unit/tmp-m13-expalias-probe.test.ts:1 用例/断言 API 别名 import 不可静态判定（expect as exp）
[test-surface] 检查未通过：UNRESOLVABLE（hint: 动态形态改写为静态，或走 scripts/test-surface.exemptions.json 豁免通道）
after-delete exit=0

===== M14 stale exemption -> stale:1 exit 0 =====
exit=0
[test-surface] exemptions entries: 1 hits: 0 stale: 1

===== final =====
exit=0
[test-surface] exemptions entries: 0 hits: 0 stale: 0
[test-surface] 检查通过：C_after ⊇ C_before（指纹门绿）
NO_RESIDUE
