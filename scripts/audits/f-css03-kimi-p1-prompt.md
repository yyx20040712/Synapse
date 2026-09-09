# F-CSS-03 补审·Kimi 分片（U0 diff——零上下文行号锚 @n 形态）

背景：F-CSS-03（颜色 token 化战役+颜色负锚双关卡）已收口提交 682c646f1e。
首轮门一 131K 审包超 Kimi 网关窗 504 耗尽落 deepseek 兜底（同源欠账）——
本补审=Kimi 独立对抗，分四片（关卡/测试断言/CSS 迁移/tsx 迁移），主控拼装。
铁律：只读本文件材料；禁 npm/test/git；只报有代码证据的问题（file:line/
摘录）；不确定明说；中文。
**输出纪律（网关窗约束）**：每条 [B|W|N] 最多 3 行+证据 1 行；总输出控制在
3000 字内；结尾给统计行+一句总评。禁止长篇推演——推演要点化。

终态事实（供判断）：像素差分八态 0 带+sha 逐字节同+COMPARE PASS（settings
首采瞬态 1 次复采零差）；verify 全链 exit=0（160 文件/1562 用例/locks 311）；
主控亲改 6 测试件 12 断言改点（[locked-change] 域——受锁断言随 var() 载体
迁移+2 处 not.toBe 变异锚随迁保活）；实现=上轮迁移+本轮关卡落地（蓝本=
f-lint01-impl 报告 §3 临时实现）+主控测试处置。
## 片一：关卡面 diff（check-quality C-4+W3/eslint B-5/invariants INV-11）

## 0. 三跳裁决记录

| 上游项 | 终裁 | 理由 |
| --- | --- | --- |
| 选型 B+C 组合、A 否决 | **维持** | 双源背书一致；A 跨节点断言不可表达 |
| CR1 C-8 正则单源提取（主控预裁案被双源 endorse） | **采纳+强化** | 提取失败=关卡硬红（哨兵）；零正则复制 |
| CR2 B-1 移出 MVP | **采纳** | 2/100/0.2s 假阳面+eslint 单文件 lint 隔离模型下跨文件 state 需前置设计（攻击面 6）——降扩展面 warn 试运行 |
| CR3a C-4 token 清单提取 | **改简**：检测面=「CSS 颜色字面量**消费**负锚」——豁免=行级 `--name:` 定义行（token 定义即字面量合法所在地），**零 token 名清单依赖**——比两轮外跳案都简且无清单漂移面 | 终裁权行使：原案「清单豁免」解决的是伪问题（消费面检测不需要知道 token 名，只需要排除定义行） |
| CR3b B-6 同名豁免（Props/State/T 通用名+tests/ 面） | 采纳（扩展面生效时） | React 组件文件同名 type Props 本能合法 |
| 攻击面 1 CSS-in-JS | **显式 out-of-scope 登记** | 本仓架构=纯 CSS 文件+inline style（AGENTS），无 styled-components 形态 |
| 攻击面 2 七件数组完整性哨兵 | **不动作** | C-8 全量关卡（lint 红先于测试弱化暴露）+七件数组=纵深防御并存；删数组=用例数变化必过门审 |
| 攻击面 3 spacing/z-index/duration 双源 | **备案池不扩本票** | spacing token 体系不存在——负锚前先有 token 化战役（新票候选 F-CSS-03） |
| 攻击面 4 !important/media 重定义 | 不动作 | 假想敌面（现状零形态）；INV 注记边界一句 |
| 攻击面 5 空集哨兵 | **采纳（厘清版）** | 哨兵只哨「工具失能」态：提取失败/walk 零文件=红；「检查结果零命中」=正常绿态不哨 |
| 攻击面 6 B-1 并发缓存 | 随 B-1 降级注记 | 扩展面立项时设计（独立聚合 pass） |

## 1. MVP 终态（本票实现面——三项）

### C-8 全量 CSS 字号负锚关卡（check-quality.mjs）

- **正则单源**：readFileSync(tests/unit/renderer/theme.test.ts) 文本提取
  `/FS_DECL = \/(.+)\/gi/`→new RegExp(capture,'gi')；**读文件失败或提取
  null=关卡硬红**（「FS_DECL 提取失败——theme.test.ts 变更加哨兵」）。
- walk `src/**/*.css`（**零文件=硬红**——结构失能哨兵）；每文件 match 计数
  >0=红（文件名+匹配样例前 3）。
- 效果：F-CSS-02 W1 通道闭合（新增第八件 CSS 自动入锚）；与 theme.test.ts
  七件测试锚=纵深防御（lint 全量+测试深检），互不替代。

### C-4 CSS 颜色字面量消费负锚（check-quality.mjs）

- 同一 walk 循环内：行级豁免 `/^\s*--[\w-]+\s*:/`（token 定义行——颜色
  字面量合法所在地）；命中 `/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/` 的行
  =红（文件:行号+样例）。
- `content: "#"` 类不咬（# 后非 hex 字符）；注释内示例=W4 同族严格性非
  缺陷（知悉面）。
- 零 token 名清单依赖（见 §0 CR3a 改简）。

### B-5 tsx inline style 颜色负锚（eslint.config.js 内联本地 rule）

- **内联不另立文件**（终裁：零新文件零 import 耦合；eslint.config.js
  已受锁单件变更）。
- flat config `plugins: { synapse: { rules: { 'no-inline-color': … } } }`；
  files 限 `src/renderer/**/*.tsx`；severity error。
- AST：JSXAttribute[name='style']→JSXExpressionContainer→ObjectExpression
  →Property.value=Literal 命中 C-4 同款颜色正则→report（node+样例）。
  var() 载体 Literal 值不命中颜色正则天然豁免；模板串/表达式值不检
  （单文件态面）。

### MVP 验收（票面）

1. **先红证四支**（植入反例→各关卡红→还原，cp 备份法）：
   ①新 CSS 第八件含 `font-size: 12px`→C-8 红；②既有 CSS 非 定义行含
   `color: #aabbcc`→C-4 红；③tsx inline style `style={{ color: '#fff' }}`
   →B-5 红；④**哨兵支**：临时改 theme.test.ts FS_DECL 行（如重命名常量）
   →C-8 提取失败红（防「空集绿灯」退化）。
2. **存量零误报**：全仓现状全绿（verify 全链）。
3. verify 全链绿+locks apply。

## 2. 扩展面（本票不实现——registry/invariants 注记备案）
## 3. 红证四支索引（各 raw 含 exit 真值，先写文件后 echo exit=$?）

| 支 | raw | 关键行（实测） |
| --- | --- | --- |
| ① C-4 红 | f-css03-red1-c4.raw.txt | `src/renderer/shared/theme-buttons.css:115: CSS 颜色字面量消费（单源=--* token）：.f-css03-red-probe { color: #aabbcc; }`（theme-buttons.css 追加探针→file:line 精确断言）exit=1；还原后探针行 grep=0 |
| ② B-5 红 | f-css03-red2-b5.raw.txt | `184:97  error  inline style 颜色字面量 "#fff"——颜色消费单源=--* token（INV-11）  synapse/no-inline-color` exit=1；还原 grep=0 |
| ③ W3 哨兵红 | f-css03-red3-w3.raw.txt | `哨兵：theme.test.ts FS_DECL 多处（2 处）歧义——哨兵[W3]：静默取第一处风险，人工消歧（F-CSS-03）` exit=1；还原 grep=0 |
| ④ 提取失败哨兵红 | f-css03-red4-c8sentinel.raw.txt | `哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）` exit=1（W3 改造后原哨兵仍在——验证目的达成）；还原 grep=0 |

## 4. 变异红证三支索引（cp 备份法，全部还原后双零残留 grep 实测）

| 支 | raw | 咬合证明（exit 序列） |
| --- | --- | --- |
| mut1 C-4 | f-css03-mut1-c4.raw.txt | C-4 检查体行注释掉+反例植入→`exit(mutated-gate+probe)=0`（放行=关卡有咬合）→还原关卡（反例保留）→`exit(restored-gate+probe-still)=1` |
| mut2 B-5 | f-css03-mut2-b5.raw.txt | rules 行 error→off+tsx 反例→`exit(mutated-rule+probe)=0`→还原→`exit(restored-rule+probe-still)=1` |
| mut3 W3 | f-css03-mut3-w3.raw.txt | `if (declCount > 1)`→`if (false)`+双 FS_DECL（探针置声明行**之前**）→`exit(mutated-w3+double-fsdecl)=0`（静默取第一处=放行风险实证）→还原→`exit(restored-w3+probe-still)=1`（W3 哨兵红） |

diff --git a/docs/invariants.md b/docs/invariants.md
index 7eb5133f6a..b47e6f6e82 100644
--- a/docs/invariants.md
+++ b/docs/invariants.md
@@ -25 +25 @@
-| INV-11 | 类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐） | AGENTS 代码组织 | 机器锚定（字号面 quality 段全量 CSS 负锚）+审查（颜色/数值面——颜色 F-CSS-03 立案） | 部分→机器面扩展（2026-09-09 F-LINT-01 C-8：quality 段全量 CSS 字号负锚——新文件自动入锚+提取/零文件哨兵[字号面已锚];颜色消费负锚 C-4/B-5 设计毕[终裁档 §1+§5]因存量 61+6 命中未清[同值多源=真违规子集+一次性字面量=严于字面的 token 化未达]顺延 F-CSS-03 颜色 token 化战役票——清理毕即落;人审残留=结构等价类型/文案双源/泛化魔法值） |
+| INV-11 | 类型/颜色/文案/数值单一真相源（禁止两份等价声明靠注释对齐） | AGENTS 代码组织 | 机器锚定（字号+颜色面——quality 段全量 CSS 负锚+eslint B-5 tsx inline 色）+审查（数值面） | 颜色面已锚定（2026-09-10 F-CSS-03：quality 段 CSS 颜色消费负锚 C-4+eslint B-5 tsx inline 色——迁移毕即落+50 值 token 驻 theme.css :root+theme.test.ts TOKENS 正锚）;字号面已锚（2026-09-09 F-LINT-01 C-8 quality 段全量负锚——新文件自动入锚+提取/零文件哨兵）;人审残留=结构等价类型/文案双源/泛化魔法值 |
diff --git a/eslint.config.js b/eslint.config.js
index 72ce11ec3b..6b53a17eeb 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -10,0 +11,4 @@ import tseslint from 'typescript-eslint'
+ * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——tsx inline style
+ *    颜色字面量负锚（INV-11 颜色消费单源=--* token）。COLOR_RE 与
+ *    scripts/check-quality.mjs 第 6 段 C-4 双写面逐字一致——改一处必同步
+ *    另一处（§8.6 双写面纪律）。
@@ -185,0 +190,39 @@ export default tseslint.config(
+  {
+    // [F-CSS-03 B-5] tsx inline style 颜色字面量负锚（设计=终裁档 §1 B-5，
+    // 2026-09-10 迁移毕落地）。AST 面：JSXAttribute[name='style']→
+    // JSXExpressionContainer→ObjectExpression→Property.value=Literal 命中
+    // COLOR_RE→report；var() 载体 Literal 不命中正则天然豁免；模板串/表达式
+    // 值不检（单文件态面）。COLOR_RE 与 check-quality.mjs C-4 消费正则双写面
+    // 逐字一致+两文件头注互指（§8.6 纪律）
+    files: ['src/renderer/**/*.tsx'],
+    plugins: {
+      synapse: {
+        rules: {
+          'no-inline-color': {
+            create(context) {
+              const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/
+              return {
+                JSXAttribute(node) {
+                  if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
+                  const v = node.value
+                  if (!v || v.type !== 'JSXExpressionContainer') return
+                  const obj = v.expression
+                  if (!obj || obj.type !== 'ObjectExpression') return
+                  for (const prop of obj.properties) {
+                    if (prop.type !== 'Property') continue
+                    const val = prop.value
+                    if (!val || val.type !== 'Literal') continue
+                    const s = String(val.value)
+                    if (COLOR_RE.test(s)) {
+                      context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
+                    }
+                  }
+                }
+              }
+            }
+          }
+        }
+      }
+    },
+    rules: { 'synapse/no-inline-color': 'error' }
+  },
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index 67fc9ae493..6869e0a7f2 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -4 +4,3 @@
- * 检查：Node 版本守卫 / 占位标记 / 乱码特征 / renderer features 跨域互引。
+ * 检查：Node 版本守卫 / 占位标记 / 乱码特征 / renderer features 跨域互引
+ * / CSS 字号+颜色字面量消费负锚（第 6 段——COLOR_RE 与 eslint.config.js
+ * B-5 内联 rule 双写面逐字一致，改一处必同步另一处）。
@@ -172,2 +174,8 @@ for (const { layer, forbids } of layerRules) {
-//    颜色消费负锚 C-4/B-5 设计毕（终裁档 §1）因存量 61+6 真违规未清顺延
-//    F-CSS-03 颜色 token 化战役票——清理毕即落（终裁档 §5 修正终裁 1/2）。
+//    [W3 哨兵 2026-09-10 F-CSS-03] 提取前对文本 matchAll(/FS_DECL = \//g)
+//    计数：>1 处=多处歧义哨兵红——单处 .match() 在多 FS_DECL 形态下静默取
+//    第一处，正则漂移即字号锚失明（0 处落入 match null 支双兜底）。
+//    [C-4 CSS 颜色字面量消费负锚 2026-09-10 F-CSS-03 落地] 颜色 token 化
+//    迁移毕（61+6 存量清零——终裁档 §5 立案顺延件兑现）后同循环落码：
+//    行级豁免=--name: 定义行（token 定义即字面量合法所在地，CR3a 改简——
+//    零 token 名清单依赖）；COLOR_RE 命中行=红。COLOR_RE 与 eslint.config.js
+//    B-5 内联 rule（tsx inline style 面）双写面逐字一致——改一处必改另一处。
@@ -177,3 +185,9 @@ try {
-  const m = readFileSync(themeTestPath, 'utf-8').match(/FS_DECL = \/(.+)\/gi/)
-  if (m) fsDeclRe = new RegExp(m[1], 'gi')
-  else violations.push('哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）')
+  const themeTestText = readFileSync(themeTestPath, 'utf-8')
+  const declCount = [...themeTestText.matchAll(/FS_DECL = \//g)].length
+  if (declCount > 1) {
+    violations.push(`哨兵：theme.test.ts FS_DECL 多处（${declCount} 处）歧义——哨兵[W3]：静默取第一处风险，人工消歧（F-CSS-03）`)
+  } else {
+    const m = themeTestText.match(/FS_DECL = \/(.+)\/gi/)
+    if (m) fsDeclRe = new RegExp(m[1], 'gi')
+    else violations.push('哨兵：theme.test.ts FS_DECL 提取失败（match null）——哨兵正则或常量行变更（F-LINT-01 C-8）')
+  }
@@ -184 +198,2 @@ const cssAll = walk(join(root, 'src'), (p) => p.endsWith('.css'))
-if (cssAll.length === 0) violations.push('哨兵：src 下 walk 零 CSS 文件——结构失能（F-LINT-01 C-8）')
+if (cssAll.length === 0) violations.push('哨兵：src 下 walk 零 CSS 文件——结构失能（F-LINT-01 C-8/C-4）')
+const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/
@@ -186 +200,0 @@ for (const f of cssAll) {
-  if (!fsDeclRe) break
@@ -188,2 +202,9 @@ for (const f of cssAll) {
-  const hits = readFileSync(f, 'utf-8').match(fsDeclRe) ?? []
-  if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
+  const content = readFileSync(f, 'utf-8')
+  if (fsDeclRe) {
+    const hits = content.match(fsDeclRe) ?? []
+    if (hits.length > 0) violations.push(`${rel}: CSS 字号字面量 ${hits.length} 处（单源=--fs-* token；样例：${hits.slice(0, 3).join(' / ')}）`)
+  }
+  content.split('\n').forEach((line, i) => {
+    if (/^\s*--[\w-]+\s*:/.test(line)) return
+    if (COLOR_RE.test(line)) violations.push(`${rel}:${i + 1}: CSS 颜色字面量消费（单源=--* token）：${line.trim().slice(0, 80)}`)
+  })

工单：①C-4/W3/B-5 vs 设计原文逐点（行级豁免/COLOR_RE/AST 面/哨兵形态）；
②正则误报漏报推演（url(#hex)/content/嵌套对象/常量引用）；③W3 matchAll
vs .match 口径差；④头注互指+双写纪律落面。输出 [B|W|N]+统计+总评。
