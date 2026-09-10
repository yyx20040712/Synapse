# F-LINT-04（T1）门一对抗深审（Kimi 链——受锁面+关卡类票）

你是门一对抗审查员（隔离一审，零仓库接触）。审计包自包含，禁跑命令/禁臆测包外事实。只报有代码证据支撑的问题，每条给 file:line/代码摘录；不确定的明说。中文输出 ≤3K 字。

## 铁律
只读审计；唯一可写=本回复文本；禁 npm/test/git。

## 票面浓缩
T1=③COLOR_RE 单源化（新件 color-re.mjs+两消费文件 import 化+META_RE 哨兵+fail-closed）+⑦url() 剥离顺修+②⑥postcss 化（C-4 CSS 面迁 root.walkDecls+色值域 token 同值守卫）。完整任务书=终裁档 §2 T1+§3 验收+§4 不做面（见下附摘录）。

## 终裁档摘录（任务书核心）

- §1.3 ③哨兵第三副本闭合：META_RE 驻 color-re.mjs 导出；哨兵扫描面显式枚举=两消费文件（eslint.config.js+check-quality.mjs）；哨兵行自身以 import 的 META_RE 执行不自咬；import 失败 fail-closed 抛错禁 try/catch 回退内联；COLOR_RE 禁 g/y（共享 lastIndex 污染）。
- §1.4 ⑥⑦②载体 postcss（8.5.26 树内）：C-4 CSS 面整体迁 root.walkDecls（decl.prop 以 -- 开头=token 定义天然豁免——行级豁免/单行多声明/引号分号边界三题消解）；⑦ url() 剥离经 value 解析；②色值域 token 同值守卫（value 命中 COLOR_RE 的声明行同值对红——@theme var() 重绑天然出域）。
- §3 验收：先红证五支（同值 token/minified 多声明/url 不红+#face 红/内联回退恰一条哨兵红+import 改名 fail-closed 红）+存量零误报（82 声明行等价+全 CSS 零新红）+W3/③注入式并存测试+verify 全链+[locked-change]+locks。
- §4 不做面：⑦独立哨兵/⑤十进命名色穷举/②跨文件同值与其他 CSS 硬编码重复建设/命名色表/#fff vs #ffffff 缩写等价。

## 实现者红证表（报告 §3——raw 在档索引）

| # | 植入 | 实测 |
| 1 | theme.css 加 --flint04-t1/--flint04-t2 同值 #123456 | 恰一条同值守卫红（键名对+行号+值）|
| 2 | :root 单行 --flint04b: var(--x); color: #fff | 检出 color:#fff（声明粒度）|
| 3a | fill:url(#face) | 不红 |
| 3b | color:#face | 红 |
| 4 | eslint B-5 植内联 hex 正则 | 恰一条哨兵红（W3 不咬）|
| 5 | color-re.mjs 改名 | fail-closed ERR_MODULE_NOT_FOUND |
| 并存 | 双注入（FS_DECL 副本+内联 hex） | 恰两条互不干扰 |
| 存量 | 无 | EXIT=0（8 CSS/650 decl/109 token 豁免/同值 0/注释 0）|

## 实现者自裁 5 项（报告 §9）

1. walkComments 补充（⑤裁决「注释色值也禁」在档——纯 walkDecls 丢注释面=迁移弱化，补齐保行为等价）2. ②聚合域=跨文件全局（Kimi 原文文件内聚合；walkDecls 天然全域，两种口径存量皆零同值）3. META_RE 带 g 例外（matchAll 必需+内部克隆不动 lastIndex+头注禁挪作 test）4. tsx B-5 面同步剥离（inline style 字符串与 CSS value 同构共用 stripUrlFunctions）5. 报文格式（②含键名对+file:line+归一值；C-4 改 decl.prop: decl.value 锚）

## 实现者疑虑 4 项（报告 §10）

1. postcss=传递依赖 hoisting 风险（主控已裁决本票不显式化，风险入档）2. manifest CRLF 常态 3. W3 检测域窄（改名副本不触发——既有面观察）4. shell 四坑又一实证（node -e 变形残留文件已删）

## 核心实现 diff（3 文件：新件 color-re.mjs 全文+check-quality.mjs 238→289+eslint.config.js）

```diff
diff --git a/eslint.config.js b/eslint.config.js
index 490e479075..4cc0c0f154 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -1,4 +1,5 @@
 import tseslint from 'typescript-eslint'
+import { COLOR_RE, stripUrlFunctions } from './scripts/color-re.mjs'
 
 /**
  * ESLint 扁平配置 —— 架构规则的可执行化（教训 C1：文档无强制等于没写）。
@@ -9,9 +10,11 @@ import tseslint from 'typescript-eslint'
  * 4. 禁 any / eval——弱模型幻觉的第一道闸
  * 5. features 跨域互引由 scripts/check-quality.mjs 静态检查（glob 表达不了的相对路径规则）
  * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——tsx inline style
- *    颜色字面量负锚（INV-11 颜色消费单源=--* token）。COLOR_RE 与
- *    scripts/check-quality.mjs 第 6 段 C-4 双写面逐字一致——改一处必同步
- *    另一处（§8.6 双写面纪律）。
+ *    颜色字面量负锚（INV-11 颜色消费单源=--* token）。[F-LINT-04 ③
+ *    2026-09-10] COLOR_RE/stripUrlFunctions 单源=scripts/color-re.mjs，
+ *    本件与 check-quality.mjs 第 6 段均 import 该件——双写面物理消失；
+ *    内联回退哨兵=check-quality 6b 段对本文件文本 matchAll 计数>0 即红；
+ *    import 失败 fail-closed 抛错（禁 try/catch 回退内联）。
  */
 export default tseslint.config(
   {
@@ -192,17 +195,15 @@ export default tseslint.config(
     // 2026-09-10 迁移毕落地）。AST 面：JSXAttribute[name='style']→
     // JSXExpressionContainer→ObjectExpression→Property.value=Literal 命中
     // COLOR_RE→report；var() 载体 Literal 不命中正则天然豁免；模板串/表达式
-    // 值不检（单文件态面）。COLOR_RE 与 check-quality.mjs C-4 消费正则双写面
-    // 逐字一致+两文件头注互指（§8.6 纪律）
+    // 值不检（单文件态面）。[F-LINT-04 ③⑦ 2026-09-10] COLOR_RE/
+    // stripUrlFunctions import 自 scripts/color-re.mjs 单源（本文件头注
+    // 互指；url(#x)=id 引用非色值，剥离后再检）
     files: ['src/renderer/**/*.tsx'],
     plugins: {
       synapse: {
         rules: {
           'no-inline-color': {
             create(context) {
-              // i 标志=CSS 函数名大小写不敏感（补审 Kimi p1 B-1）——与
-              // check-quality.mjs C-4 的 COLOR_RE 逐字一致（含标志位）
-              const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i
               return {
                 JSXAttribute(node) {
                   if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
@@ -215,7 +216,7 @@ export default tseslint.config(
                     const val = prop.value
                     if (!val || val.type !== 'Literal') continue
                     const s = String(val.value)
-                    if (COLOR_RE.test(s)) {
+                    if (COLOR_RE.test(stripUrlFunctions(s))) {
                       context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
                     }
                   }
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index d18f275d17..76ab3dbd2a 100644
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
@@ -207,11 +217,61 @@ for (const f of cssAll) {
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
+// ② 判定：同值守卫跨文件全局聚合（token 定义散布多文件时同值=第二源同性质）
+const tokenByNorm = new Map()
+for (const d of tokenColorDecls) {
+  if (!tokenByNorm.has(d.norm)) tokenByNorm.set(d.norm, [])
+  tokenByNorm.get(d.norm).push(d)
+}
+for (const [, ds] of tokenByNorm) {
+  if (ds.length >= 2) {
+    violations.push(
+      `色值 token 同值守卫：${ds.map((d) => `${d.prop}（${d.rel}:${d.line}）`).join(' = ')} 同值 ${ds[0].norm.slice(0, 40)}——颜色 token 同值第二源，同值合并共享单 token（F-LINT-04 ②）`
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
diff --git a/scripts/color-re.mjs b/scripts/color-re.mjs
new file mode 100644
index 0000000000..1d39492b50
--- /dev/null
+++ b/scripts/color-re.mjs
@@ -0,0 +1,68 @@
+/**
+ * color-re.mjs —— [F-LINT-04 ③] 色值检测正则/剥离器单源（受锁文件）。
+ * 消费方（均 import 本件，双写面物理消失）：
+ *   - scripts/check-quality.mjs 第 6 段（C-4 CSS 面 postcss walkDecls +
+ *     ② 色值域 token 同值守卫 + ③ 哨兵的 META_RE）
+ *   - eslint.config.js B-5 rule（tsx inline style 面）
+ * import 失败=fail-closed 自然抛错——消费方禁 try/catch 回退内联正则
+ * （回退=③静默失效）；check-quality 6b 哨兵段对两消费文件文本 matchAll
+ * (META_RE) 计数>0 即红。本件是 COLOR_RE 字面量的唯一合法宿主，不在
+ * 哨兵扫描面（哨兵扫描面显式枚举=两消费文件）。
+ *
+ * 禁令：COLOR_RE 禁 g/y 标志——RegExp 实例被多消费方共享，g/y 的
+ * lastIndex 跨调用残留=随机漏报（deepseek 审核硬约束，2026-09-10）。
+ * 现行标志=i（CSS 函数名大小写不敏感：RGB(255,0,0) 合法渲染生效——
+ * 补审 Kimi p1 B-1；hex 段已含 A-F 加 i 无副作用）。
+ *
+ * META_RE=③哨兵特征正则（第三副本闭合——识别「内联 hex 正则文本形态」，
+ * 即 hex 字符类紧随 {3,8} 量词的无反斜杠文本序列）：正则字面量与
+ * new RegExp('...') 字符串形态都命中；自身 source 是带反斜杠形态，
+ * 即使被误扫也不自咬。带 g——matchAll 消费所必需，且 matchAll 内部
+ * 克隆正则不动原实例 lastIndex；仅限 matchAll 只读遍历，禁挪作 test。
+ *
+ * stripUrlFunctions=[F-LINT-04 ⑦] url() 剥离（url(#x)=SVG filter/gradient
+ * 的 id 引用非色值——`fill: url(#face)` 不红/`color: #face` 红双验收）。
+ * 实现选择（申报）：检测使用处剥离而非 COLOR_RE 内负向后顾——url(
+ * data:...#abc) 中段 hex 与 url("...#fff") 引号隔断形态，后顾断言
+ * 盖不住，剥离为语义正解；引号感知状态机而非 /url\([^)]*\)/ 正则
+ * （引号内 ) 截断坑——deepseek 审核 §6；postcss 主包不含独立 value
+ * parser，树内无 postcss-value-parser，手写状态机零依赖语义等同）。
+ */
+export const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i
+export const META_RE = /\[0-9a-fA-F]\{3,8\}/g
+
+/** 剥离 value 中全部 url(...) 片段（引号感知；CSS 面 postcss decl.value
+ *  与 tsx 面 inline style 字符串共用）。 */
+export function stripUrlFunctions(value) {
+  let out = ''
+  let i = 0
+  while (i < value.length) {
+    const m = /^url\(/i.exec(value.slice(i))
+    if (m) {
+      i += m[0].length
+      let quote = null
+      while (i < value.length) {
+        const c = value[i]
+        if (quote) {
+          if (c === '\\') {
+            i += 2
+            continue
+          }
+          if (c === quote) quote = null
+          i++
+        } else if (c === '"' || c === "'") {
+          quote = c
+          i++
+        } else if (c === ')') {
+          i++
+          break
+        } else i++
+      }
+      out += 'url()'
+    } else {
+      out += value[i]
+      i++
+    }
+  }
+  return out
+}

```

## 主控亲验事实

- locks:check 317 一致；verify 全链 exit=0（f-lint04-verify-full.raw.txt 末行 VERIFY-EXIT=0）；check-quality 存量绿亲跑；162 文件/1579 用例对齐基线。

## 工单 A~E

- A 母本符合度：T1 范围五件（③⑦②⑥+locks 流程）逐条对终裁档；自裁 5 项越权与否（尤其 1 walkComments 与 2 跨文件聚合——票面/终裁未明示处实现者扩张是否合理+申报义务履行）。
- B 宪法红线：受锁流程（unlock→改→generate+apply 时序——报告 §7 可信度）；fail-closed 主张（diff 中有无 try/catch 吞错点）；禁新依赖（postcss 传递依赖使用是否越 AGENTS 红线——主控预裁=树内物理存在零新增,你可攻击）。
- C 代码质量：META_RE 不自咬论证（source 带反斜杠形态）；stripUrlFunctions 状态机边界（嵌套括号/转义/未闭合 url 的行为）；walkDecls+walkComments 的豁免语义（--prop 豁免是否引入新逃检面——如 CSS 变量声明值里的色值是否该检[②接管=同值对才红,单值不红——口径弱化了吗？原 C-4 行级对 --name: 行整体豁免=同值也不红,现在②接管=色值 token 同值红——行为差异声明]）；postcss 解析错误的 fail-open。
- D 报告诚实性：红证表 raw 索引与 diff 对拍；存量数字（8 CSS/650 decl/109 token）自洽性。
- E 接缝：两消费文件头注互指更新；color-re.mjs 头注禁令完备性（g/y/挪用/合法宿主）；后续 T2/T4 候选的衔接面。

输出：[B|W|N] 逐条+证据；统计行；总评（放行/回炉/终止）。
