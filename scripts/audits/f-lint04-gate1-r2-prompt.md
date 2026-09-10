# F-LINT-04 门一 R2 定点复核（回炉三小项核验）

你 R1 判 B×6/W×4/N×7 放行（W-2/W-1/W-3 回炉，W-4 主控已裁入档）。回炉处置如下，逐条 ADDRESSED/NOT ADDRESSED+新破坏扫描。中文 ≤800 字。

## W-2 修复（②同名 token 重定义假阳）——check-quality.mjs 回炉后 diff 全文

```diff
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index d18f275d17..5b6485cfca 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -2,12 +2,16 @@
 /**
  * check-quality.mjs —— 质量扫描关卡（受锁文件）。
  * 检查：Node 版本守卫 / 占位标记 / 乱码特征 / renderer features 跨域互引
- * / CSS 字号+颜色字面量消费负锚（第 6 段——COLOR_RE 与 eslint.config.js
- * B-5 内联 rule 双写面逐字一致，改一处必同步另一处）。
+ * / CSS 字号+颜色字面量消费负锚（第 6 段——[F-LINT-04 ③ 2026-09-10 起
+ * COLOR_RE 单源=scripts/color-re.mjs，本件与 eslint.config.js B-5 均
+ * import 该件；双写面物理消失，6b 哨兵段哨内联回退）/ 色值 token 同值
+ * 守卫（②）/ 内联回退哨兵（③，6b 段）/ 同值双常量（第 7 段）。
  * 退出码 1 = CI 红。规则依据 AGENTS.md（文档无强制等于没写）。
  */
 import { readdirSync, readFileSync, statSync } from 'node:fs'
 import { dirname, join, relative, resolve, sep } from 'node:path'
+import postcss from 'postcss'
+import { COLOR_RE, META_RE, stripUrlFunctions } from './color-re.mjs'
 import { scanDuplicateConstants, formatDupDetails, clipped } from './check-dup-constants.mjs'
 
 const root = process.cwd()
@@ -175,10 +179,18 @@ for (const { layer, forbids } of layerRules) {
 //    计数：>1 处=多处歧义哨兵红——单处 .match() 在多 FS_DECL 形态下静默取
 //    第一处，正则漂移即字号锚失明（0 处落入 match null 支双兜底）。
 //    [C-4 CSS 颜色字面量消费负锚 2026-09-10 F-CSS-03 落地] 颜色 token 化
-//    迁移毕（61+6 存量清零——终裁档 §5 立案顺延件兑现）后同循环落码：
-//    行级豁免=--name: 定义行（token 定义即字面量合法所在地，CR3a 改简——
-//    零 token 名清单依赖）；COLOR_RE 命中行=红。COLOR_RE 与 eslint.config.js
-//    B-5 内联 rule（tsx inline style 面）双写面逐字一致——改一处必改另一处。
+//    迁移毕（61+6 存量清零——终裁档 §5 立案顺延件兑现）后同循环落码。
+//    [F-LINT-04 T1 2026-09-10] ③COLOR_RE 单源化（本段与 eslint.config.js
+//    B-5 均 import scripts/color-re.mjs——双写面物理消失；import 失败
+//    fail-closed 抛错）+⑦url() 剥离（stripUrlFunctions——url(#x)=id 引用
+//    非色值）+⑥postcss 化（root.walkDecls 声明粒度替代行扫描：decl.prop
+//    以 -- 开头=token 定义豁免色值检查——minified 多声明/引号分号边界/
+//    行首豁免三题消解；注释面 walkComments 保持⑤裁决=注释色值同禁——
+//    F-CSS-03 曾实清 6 行注释色值，postcss 迁移不弱化该面）+②色值域
+//    token 同值守卫（值命中 COLOR_RE 的 token 声明归一分组，同值 ≥2 键
+//    =红——@theme var() 重绑值天然不命中 COLOR_RE 出域零假阳；#fff/
+//    #ffffff 缩写同色、red/#f00 命名等价、命名色裸词=终裁 §4 明示不检）。
+//    postcss 解析异常=push violation 非吞错（fail-open 统一，终裁 §1.6）。
 const themeTestPath = join(root, 'tests', 'unit', 'renderer', 'theme.test.ts')
 let fsDeclRe = null
 try {
@@ -196,10 +208,8 @@ try {
 }
 const cssAll = walk(join(root, 'src'), (p) => p.endsWith('.css'))
 if (cssAll.length === 0) violations.push('哨兵：src 下 walk 零 CSS 文件——结构失能（F-LINT-01 C-8/C-4）')
-// i 标志=CSS 函数名大小写不敏感（RGB(255,0,0) 合法渲染生效）——缺 i 则大写
-// 形态绕过负锚（补审 Kimi p1 B-1，2026-09-10）；hex 段已含 A-F 加 i 无副作用。
-// 与 eslint.config.js B-5 的 COLOR_RE 逐字一致（含标志位）——双写面纪律。
-const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i
+// ② 收集器：值（url 剥离后）命中 COLOR_RE 的 token 声明——循环后归一判定
+const tokenColorDecls = []
 for (const f of cssAll) {
   const rel = relative(root, f).replaceAll('\\', '/')
   const content = readFileSync(f, 'utf-8')
@@ -207,11 +217,75 @@ for (const f of cssAll) {
     const hits = content.match(fsDeclRe) ?? []
     if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
   }
-  content.split('\n').forEach((line, i) => {
-    if (/^\s*--[\w-]+\s*:/.test(line)) return
-    if (COLOR_RE.test(line)) violations.push(`${rel}:${i + 1}: CSS 颜色字面量消费（单源=--* token）：${line.trim().slice(0, 80)}`)
+  let ast
+  try {
+    ast = postcss.parse(content, { from: rel })
+  } catch (e) {
+    violations.push(`${rel}: postcss 解析异常（${e.message.split('\n')[0]}）——fail-open 上报非吞错（F-LINT-04 ⑥）`)
+    continue
+  }
+  ast.walkDecls((decl) => {
+    const stripped = stripUrlFunctions(decl.value)
+    const line = decl.source.start.line
+    if (decl.prop.startsWith('--')) {
+      // ⑥ token 定义=字面量合法所在地，豁免色值检查；② 但进同值守卫收集
+      if (COLOR_RE.test(stripped)) {
+        tokenColorDecls.push({ rel, line, prop: decl.prop, norm: stripped.replace(/\s+/g, '').toLowerCase() })
+      }
+      return
+    }
+    if (COLOR_RE.test(stripped)) {
+      violations.push(`${rel}:${line}: CSS 颜色字面量消费（单源=--* token）：${decl.prop}: ${decl.value.trim().slice(0, 80)}`)
+    }
+  })
+  ast.walkComments((c) => {
+    if (COLOR_RE.test(stripUrlFunctions(c.text))) {
+      violations.push(`${rel}:${c.source.start.line}: CSS 注释内颜色字面量（注释=文档面第二源，⑤ 裁决同禁）：${c.text.trim().slice(0, 60)}`)
+    }
   })
 }
+// ② 判定：同值守卫跨文件全局聚合（token 定义散布多文件时同值=第二源同性质）。
+// [门一 R1 W-2 2026-09-10] 同名 token 重定义非第二源——:root{--x:#fff}+
+// .dark{--x:#fff} 主题切换合法重绑会假阳。聚合改 Map<归一值, Map<prop,
+// 声明[]>>（同名合并为一键），判定=同值且不同名键 ≥2 才红（红证
+// f-lint04-red6-samename.raw.txt：修前假阳实锤→修后绿+异名红证复跑不弱化）。
+const tokenByNorm = new Map()
+for (const d of tokenColorDecls) {
+  if (!tokenByNorm.has(d.norm)) tokenByNorm.set(d.norm, new Map())
+  const byProp = tokenByNorm.get(d.norm)
+  if (!byProp.has(d.prop)) byProp.set(d.prop, [])
+  byProp.get(d.prop).push(d)
+}
+for (const [norm, byProp] of tokenByNorm) {
+  if (byProp.size >= 2) {
+    const parts = [...byProp.values()].map((ds) => ds.map((d) => `${d.prop}（${d.rel}:${d.line}）`).join('/'))
+    violations.push(
+      `色值 token 同值守卫：${parts.join(' = ')} 同值 ${norm.slice(0, 40)}——颜色 token 同值第二源，同值合并共享单 token（F-LINT-04 ②）`
+    )
+  }
+}
+
+// 6b) [F-LINT-04 ③哨兵] 内联回退哨——读 eslint.config.js+本件自身文本，
+//     matchAll(META_RE)（hex 正则特征形态，单源驻 color-re.mjs）计数>0=红：
+//     有人回退内联 hex 正则致单源失能。哨兵行自身以 import 的 META_RE
+//     执行，其行文本不含 hex 字符类+量词的无反斜杠形态=不自咬（探针实证
+//     2026-09-10）；color-re.mjs 是唯一合法宿主，不在扫描面；W3（FS_DECL
+//     哨兵）扫的是 theme.test.ts 字号正则，与本哨兵特征不重叠零互咬。
+//     [门一 R1 W-1 语义边界] 本哨兵=逐字副本检测（hex 字符类+{3,8} 量词
+//     裸形态的原样复制）——序换/量词变体/字符类简写等变形回退不在覆盖面
+//     （T2 候选扩展，勿当完备防线）。新增第三消费文件时必须同步扩
+//     SENTINEL_SCAN_FILES 枚举（漏扩=新消费面脱离哨兵监控——义务声明）。
+//     [门一 R1 W-3 盲区] walkDecls+walkComments 不覆盖 at-rule prelude
+//     （@supports/@import 等行内色值）——存量零命中+形态极罕见，明示
+//     盲区不检。
+const SENTINEL_SCAN_FILES = [join(root, 'eslint.config.js'), join(root, 'scripts', 'check-quality.mjs')]
+for (const sp of SENTINEL_SCAN_FILES) {
+  const text = readFileSync(sp, 'utf-8')
+  const hits = [...text.matchAll(META_RE)]
+  if (hits.length > 0) {
+    violations.push(`${relative(root, sp)}: 内联 hex 正则回退 ${hits.length} 处（哨兵[F-LINT-04 ③]：COLOR_RE 单源=scripts/color-re.mjs，禁内联回退/字符串拼正则——单源失能即红）`)
+  }
+}
 
 // 7) [F-LINT-02] B-1 同值双常量——同名同值跨 ≥2 文件即红（trivial/同文件豁免、
 //    异名同文案 warn 不卡 CI；baseline 棘轮=存量真命中放行待收敛）。判据与边界

```

## 红证 6（f-lint04-red6-samename.raw.txt 三段）

修前：同名同值重绑（:root --x + .dark --x 同 #123456）→红（假阳实锤）；修后：同名合并绿；异名同值复跑→仍红（不弱化证明）。

## W-1/W-3 注释入档

6b 哨兵段注释补「逐字副本检测边界+序换/量词变体不在面+SENTINEL_SCAN_FILES 扩展义务」；prelude 盲区入档（措辞已规避无反斜杠形态防自咬——diff 内可核注释文本）。

## 主控亲验

locks:check 317 一致；verify 全链 VERIFY-EXIT-R1=0（162/1579 对齐）；实现者申报 add -N 空 blob 占位=主控审包链产物，收口正常 add 覆盖。

输出：W-1/W-2/W-3 逐条判定+新破坏+总评。
