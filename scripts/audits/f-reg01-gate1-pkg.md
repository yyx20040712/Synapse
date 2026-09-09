# F-REG-01 门一审包（对抗深审——Kimi 链）

## 0. 审查对象

scripts/check-tickets.mjs 工单一致性关卡全域化（受锁文件，已 unlock→改→
apply，manifest 288 条同步）。diff=35 insertions/11 deletions，见随附
f-reg01-review.diff。

## 1. 票面原文（registry F-REG-01）

check-tickets 工单号校验全域化（F-TOOL-01/F-CSS-02 两票门二独立提出的
防作弊链盲区——objRe 只捕 SR2?- 前缀工单号,F 系等 38+ 工单翻 done=平凡绿
[工单文件存在性不校验]）;扩展=①全工单号格式全域校验（id 前缀白名单枚举
[S 系/F 系/P 系——以 registry 现存 158 票实测前缀全集为准]）②done 票 file
字段有效性抽验或全验（三形态兼容:具体文件存在/目录存在[如 scripts/
audits/]/前缀说明性字段——形态语义先盘点再定校验强度）;先红证:临时把某
done 票 file 指向不存在路径→红→还原;受锁 scripts/*.mjs 即时 locks:
generate+apply;存量零误报（158 票全过）+verify 全链

## 2. 主控侦查实证（设计输入）

- registry 实测 165 票（8 open+157 done，与 v54 交接书一致）；前缀全集
  =SR(74)/SR2(45)/R1(2)/R2(6)/R3(3)/F(19)/P7A(1)/P7D-01(1)/P7E(7)/P7X(3)/
  B7(1)/C-A3(1)。
- **第二盲区（票面未预判，实现中发现）**：旧 objRe 的 `[^{}]` 在 summary
  含行内自平衡花括号时提前截断——7 票静默漏检（行级花括号平衡检查确认
  非跨行嵌套）。165-119=46 票脱检=前缀限定 39 票+花括号截断 7 票。
- done 票 file 形态盘点（行级全量）：FILE 163/DIR 2（F-AUDIT-01=
  scripts/audits/、P7X-03=docs/reports/）/不存在 0/空 0——「前缀说明性
  字段」形态实际不存在，校验强度定为存在性（existsSync 覆盖 FILE+DIR）。
- src/tests 非 SR 票号引用实测：大量规约头注形态（R2-SH1 在 constants.ts、
  P7E-05 在 paper.ts、F-LG14 在 lineage.ts/schemas.ts 等）——引用一致性
  扫描若纳入非 SR 票即大面积误报。

## 3. 实现设计（diff 要点）

1. 解析层：块级 objRe → **行级正则** `^\s*\{ id: '([^']+)', file: '([^']*)'`
   （registry 条目单行、id/file/area/owner/status 均在 summary 前字段序
   稳定——实测 165/165 匹配）。
2. 新增规则 0：id 白名单 `^(SR2?|R[123]|F|P7[A-Z]?|B7|C)(-[A-Z0-9]+)*$`
   （裸前缀 B7/P7A 实存故 P7[A-Z]? 与 B7 直列）。
3. 规则 1（文件存在）：随 tickets 全域化自动全域（DIR 形态 existsSync 过）。
4. 规则 3/4b：加 `statSync(p).isDirectory()` continue 守卫——DIR 票
   readFileSync 会 EISDIR 崩（旧版 SR-only 票无 DIR 故未暴露）。
5. 规则 4（data-ticket 骨架占位）：限定 `^SR2?-` ——F 系 open 票（F-A9/
   F-A10/F-A11）是立案时已实现真组件，纳入即误报。
6. 规则 2/5（引用扫描/guardedDescribe 绑定）：扫描正则维持 SR2?- 不变
   （有意限定，注释在案）。

## 4. 主控预裁项（可攻击，推翻需更强依据）

- 规则 2/4 的 SR-only 限定=票面「全域化」的有意收窄：票面授权面=「工单号
  格式校验+done file 有效性」两扩展项；规则 2/4 是弱模型骨架票防线语义，
  全域纳入与存量事实冲突（头注引用/已实现 open 票）。
- 主控直改未派实现者子代理（流程自裁）：受锁脚本单文件小改+侦查证据链
  （形态盘点/引用盘点）由主控掌握，派发实现者=纯传话成本；红证链完备
  （下节）。此自裁可攻击——若判 B 级流程违规则打回派实现者重做。

## 5. 证据日志（scripts/audits/）

- f-reg01-redproof-a.raw.txt：**盲区直证**——F-A6（done,F 系）file 变异
  指向不存在路径，旧版 exit=0 绿（统计只见 119 票）→还原 diff 空。
- f-reg01-stock-run.raw.txt：新版存量全量 165 票绿零误报。
- f-reg01-redproof-b1.raw.txt：同一变异新版 exit=1 红（F-A6 被点名）
  ——同变异旧绿新红=修复直接证据→还原。
- f-reg01-redproof-b2.raw.txt：临时植入白名单外假票 T-99 →exit=1 红
  →还原（165 票绿复核）。
- f-reg01-verify.raw.txt：verify 全链（跑毕后附）。

## 6. 工单

A. 母本符合度：diff 是否覆盖票面两扩展项+先红证？「158 票存量零误报」
   基线已被本票自身推进到 165（F-DOC-01 收口）——数字漂移是否可解释？
B. 宪法红线：受锁流程（unlock→改→apply 同步）是否合规？行数/UTF-8？
C. 代码质量：行级解析的鲁棒性（字段序假设/行内正则回退风险）？白名单
   正则的边界（漏匹配/过匹配）？DIR 守卫完备性（规则 6 SR2 票是否也需）？
D. 诚实性：第 2/4 节申报与 diff 是否逐条对得上？
E. 接缝：locks:check/CI/check-quality 对该脚本的调用面是否受影响？

输出：[B|W|N] 逐条+file:line 证据+一行总评。

## 7. diff 全文（f-reg01-review.diff 同文）

```diff
diff --git a/scripts/check-tickets.mjs b/scripts/check-tickets.mjs
index 89593b2967..ec6cbbd244 100644
--- a/scripts/check-tickets.mjs
+++ b/scripts/check-tickets.mjs
@@ -8,6 +8,10 @@
  * 6. v2 工单防线（B4 条款，2026-08-23）：SR2-* 工单文件头必须携带 "// b3: P7-X"
  *    裁决指针注释行，且 P7-X 必须是 docs/ROADMAP.md Phase 7+ 的已裁决候选——
  *    增量候选须经 B3 增量裁决先落 ROADMAP，再开工单（防工单化阶段任意加塞）
+ * 7. v3 全域化（F-REG-01，2026-09-10）：行级解析（免疫 summary 行内自平衡
+ *    花括号的块级漏捕）+ id 前缀白名单 + 文件存在性全域——旧块级 objRe 只捕
+ *    SR2?- 前缀，F/P/R/B/C 系 46 票+嵌套花括号 7 票完全脱检（F 系 done 票
+ *    file 指向不存在路径曾平凡绿，红证 f-reg01-redproof-a.raw.txt）
  */
 import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs'
 import { join, relative } from 'node:path'
@@ -17,22 +21,23 @@ const registryPath = join(root, 'tickets', 'registry.ts')
 const registry = readFileSync(registryPath, 'utf-8')
 
 const tickets = []
-// 键序无关解析：先按对象字面量切块，再逐字段提取（旧版单正则锁 id→file→owner→status
-// 顺序，键序重排的工单会从所有检查中静默消失）
-const objRe = /\{[^{}]*?\bid:\s*'(SR2?-[A-Z]+-\d+)'[^{}]*?\}/g
-let m
-while ((m = objRe.exec(registry)) !== null) {
-  const body = m[0]
+// 行级解析（F-REG-01 全域化）：registry 条目为单行对象（id/file/area/owner/status
+// 均在 summary 字段前、字段序稳定），行级提取天然免疫 summary 内行内自平衡
+// 花括号——旧块级 objRe 的 [^{}] 在 summary 含 {...} 时提前截断（7 票曾静默
+// 漏检），且其 SR2?- 前缀限定使 F/P/R/B/C 系票整体脱检
+for (const line of registry.split('\n')) {
+  const m = /^\s*\{ id: '([^']+)', file: '([^']*)'/.exec(line)
+  if (!m) continue
   const fieldOf = (name) => {
-    const fm = new RegExp(`\\b${name}:\\s*'([^']+)'`).exec(body)
+    const fm = new RegExp(`\\b${name}:\\s*'([^']+)'`).exec(line)
     return fm === null ? null : fm[1]
   }
   const id = m[1]
-  const file = fieldOf('file')
+  const file = m[2]
   const owner = fieldOf('owner')
   const status = fieldOf('status')
-  if (file === null || owner === null || status === null) {
-    console.error(`工单 ${id} 缺少 file/owner/status 必填字段`)
+  if (owner === null || status === null) {
+    console.error(`工单 ${id} 缺少 owner/status 必填字段`)
     process.exit(1)
   }
   tickets.push({ id, file, owner, status })
@@ -52,6 +57,18 @@ function walk(dir, filter, acc = []) {
 
 const violations = []
 
+// 0) 全工单号格式白名单（F-REG-01）：前缀全集=registry 165 票实测（SR/SR2/
+//    R1/R2/R3/F/P7A/P7D/P7E/P7X/B7/C——裸前缀 B7/P7A 实存）。新增前缀须同步
+//    本白名单，防工单号格式跑偏后从所有检查中静默消失
+const ID_WHITELIST = /^(SR2?|R[123]|F|P7[A-Z]?|B7|C)(-[A-Z0-9]+)*$/
+for (const t of tickets) {
+  if (!ID_WHITELIST.test(t.id)) {
+    violations.push(
+      `工单 ${t.id} 的 id 不在白名单（SR/SR2/R1~R3/F/P7x/B7/C）——新前缀须同步 check-tickets.mjs ID_WHITELIST`
+    )
+  }
+}
+
 // 1) 工单文件必须存在
 for (const t of tickets) {
   if (!existsSync(join(root, t.file.replaceAll('/', '\\')))) {
@@ -65,6 +82,9 @@ for (const t of tickets) {
 //    - tests：guardedDescribe('号') 是激活机制的合法引用（guard.ts：翻 done 即激活，
 //      注释与断言同理）；仅占位调用受限——unimplementedObject('号')/NotImplementedError('号')
 //      的号必须存在，且不得指向 done 工单（防样例挂真实号随工单完成而失效）
+// 引用一致性扫描维持 SR 系（F-REG-01 终裁）：非 SR 票号在 src/tests 以规约
+// 头注形态大量注释引用（R2-SH1/P7E-05/F-LG14 等实测），无占位桩语义，
+// 纳入扫描即大面积误报；全域票（含非 SR）受规则 0/1/3/4b 覆盖
 const srcFiles = [
   ...walk(join(root, 'src'), (p) => /\.(ts|tsx)$/.test(p)),
   ...walk(join(root, 'tests'), (p) => /\.(ts|tsx|mjs)$/.test(p))
@@ -107,6 +127,7 @@ for (const f of srcFiles) {
 for (const t of tickets.filter((x) => x.status === 'done')) {
   const p = join(root, t.file.replaceAll('/', '\\'))
   if (!existsSync(p)) continue
+  if (statSync(p).isDirectory()) continue // 目录形态票（F-AUDIT-01/P7X-03）无文件内容可检
   const content = readFileSync(p, 'utf-8')
   if (/unimplementedObject|NotImplementedError\(/.test(content)) {
     violations.push(`${t.id} 已 done，但文件仍含未实现占位：${t.file}`)
@@ -114,7 +135,9 @@ for (const t of tickets.filter((x) => x.status === 'done')) {
 }
 
 // 4) open 且 .tsx 的 UI 工单文件必须渲染 data-ticket 占位（骨架可见性）
-for (const t of tickets.filter((x) => x.status === 'open' && x.file.endsWith('.tsx'))) {
+//    F-REG-01：限定 SR 系——本防线为骨架票设计，F 系 open 票（F-A9/F-A10/
+//    F-A11）是立案时已实现的真组件，无骨架占位语义，纳入即误报
+for (const t of tickets.filter((x) => /^SR2?-/.test(x.id) && x.status === 'open' && x.file.endsWith('.tsx'))) {
   const p = join(root, t.file.replaceAll('/', '\\'))
   if (!existsSync(p)) continue
   const content = readFileSync(p, 'utf-8')
@@ -130,6 +153,7 @@ for (const t of tickets.filter((x) => x.status === 'open' && x.file.endsWith('.t
 for (const t of tickets.filter((x) => x.status === 'done')) {
   const p = join(root, t.file.replaceAll('/', '\\'))
   if (!existsSync(p)) continue
+  if (statSync(p).isDirectory()) continue // 目录形态票无文件内容可检
   const content = readFileSync(p, 'utf-8')
   if (content.includes(`data-ticket="${t.id}"`)) {
     violations.push(`${t.id} 已 done，但文件仍含自身 data-ticket 骨架占位：${t.file}`)
```
