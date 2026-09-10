# 门一定点复核（R2 轮）——F-LINT-04-T2 回炉轮 1

你是门一对抗式审查员（与首轮同一职责位，本轮=定点复核+新破坏扫描）。铁律：只读、逐条 ADDRESSED/NOT ADDRESSED、末尾总评（收口放行/再回炉）。中文输出。

## 背景

你首轮审 F-LINT-04-T2（eslint.config.js B-5 扩展）给出 B0/W4/N7 放行附条件。主控处置：W2（COLOR_RE 状态性）与 W4（dryrun raw 纯净性）由主控亲证销项——color-re.mjs 的 `COLOR_RE = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/i` 仅 i 标志无 g（T1 头注禁令驻在），.test 零 lastIndex 行为；dryrun-recheck.raw.txt 原件 tail 干净（sum-check=0/exit=0，无 build 输出——首轮材料中的 build 行系主控拼包追加 verify 尾的伪影）。

## 回炉指令（主控下发实现者的 5 项）

1. W1：EXPLICIT_ATTRS 上提至 create() 级（与 hitsColor/unwrapInit 同级）。
2. W3：unwrapInit 的 `depth > 4` 改 `depth >= 4`——对齐票面字面「深度上限 4」。
3. N2 主控裁决加码（超票面字面，报告 §6.7 申报）：JSXAttribute 域内属性 value 增判 JSXExpressionContainer 包裹形态（fill={'#fff'} 与 fill="#fff" 同罪）；style 分支不动。
4. 红证补强三支：R12 单对象双色值属性恰 2 error；R13 container 包裹恰 1 error（改前探针 r13-preimpl 0 error=TDD 红）；R14 双层嵌套（Object.freeze({...} as const)）恰 1 error。
5. 报告更新：§8 回炉节+§6.6 更正+§6.7 N2 申报+§3 矩阵补三行+行数实测 345。

## 实现者回炉回执（五行摘要）

W1（EXPLICIT_ATTRS 上提 create 级）+W3（depth>=4）+N2（container 包裹同检，style 分支不动）落盘 eslint.config.js（239→345 行实测，头注③补 N2 注记）。R13 改前探针 0 error→补强三支全中（R12 恰 2/R13 恰 1/R14 恰 1），临时文件零残留。全链复验：lint exit=0 全绿+dry-run self-check OK 四面全 0+verify 段跑（locks:check 预期红唯一红因）+test 162/1579=基线。报告 §8/§6.6/§6.7/§3 更新毕。

## 复核材料

下方内联：①终版全量 diff（176 行——注意这是对 HEAD 的全量 diff，含首轮已审部分+回炉增量，回炉增量均有 [W1 回炉]/[W3 回炉]/[N2 回炉=主控裁决加码] 注释锚）②补强证据抽样（R12/R13/R14/r13-preimpl）。

请逐条复核 5 项指令是否 ADDRESSED，并扫描回炉增量是否引入新破坏（特别是：EXPLICIT_ATTRS 位置变更后作用域正确性；depth>=4 后 R14 双层是否仍可解——嵌套层数账目；N2 container 分支对 fill={{对象}} 形态是否误报——lit.type 必须非 ObjectExpression 才 skip）。

---

# 终版全量 diff（eslint.config.js 239→345 行）

```diff
diff --git a/eslint.config.js b/eslint.config.js
index 4cc0c0f154..f80339f4fb 100644
--- a/eslint.config.js
+++ b/eslint.config.js
@@ -9,8 +9,9 @@ import { COLOR_RE, stripUrlFunctions } from './scripts/color-re.mjs'
  * 3. renderer 禁 Node/Electron——最小权限（安全 §6.1）
  * 4. 禁 any / eval——弱模型幻觉的第一道闸
  * 5. features 跨域互引由 scripts/check-quality.mjs 静态检查（glob 表达不了的相对路径规则）
- * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——tsx inline style
- *    颜色字面量负锚（INV-11 颜色消费单源=--* token）。[F-LINT-04 ③
+ * 6. [F-CSS-03 B-5 2026-09-10] synapse/no-inline-color——[F-LINT-04-T2
+ *    2026-09-10 扩义] tsx 面颜色字面量负锚（原=tsx inline style 面；
+ *    INV-11 颜色消费单源=--* token）。[F-LINT-04 ③
  *    2026-09-10] COLOR_RE/stripUrlFunctions 单源=scripts/color-re.mjs，
  *    本件与 check-quality.mjs 第 6 段均 import 该件——双写面物理消失；
  *    内联回退哨兵=check-quality 6b 段对本文件文本 matchAll 计数>0 即红；
@@ -191,34 +192,140 @@ export default tseslint.config(
     }
   },
   {
-    // [F-CSS-03 B-5] tsx inline style 颜色字面量负锚（设计=终裁档 §1 B-5，
-    // 2026-09-10 迁移毕落地）。AST 面：JSXAttribute[name='style']→
-    // JSXExpressionContainer→ObjectExpression→Property.value=Literal 命中
-    // COLOR_RE→report；var() 载体 Literal 不命中正则天然豁免；模板串/表达式
-    // 值不检（单文件态面）。[F-LINT-04 ③⑦ 2026-09-10] COLOR_RE/
-    // stripUrlFunctions import 自 scripts/color-re.mjs 单源（本文件头注
-    // 互指；url(#x)=id 引用非色值，剥离后再检）
+    // [F-CSS-03 B-5] tsx 颜色字面量负锚（设计=终裁档 §1 B-5，2026-09-10
+    // 迁移毕落地）。[F-LINT-04-T2 2026-09-10] 语义扩义：原「tsx inline
+    // style 面」→「tsx 面」（终裁档 §2 T2 行+§1.1 修正条款），新增两条
+    // visitor 路径，AST 三路径全貌：
+    // ① JSXAttribute[name='style']（原路径保留不动）→JSXExpressionContainer
+    //   →ObjectExpression→Property.value=Literal 命中 COLOR_RE→report；
+    //   var() 载体 Literal 不命中正则天然豁免；模板串/表达式值不检。
+    // ② VariableDeclarator：init 递归 unwrap（TSAsExpression/
+    //   TSSatisfiesExpression→expression；Object.freeze(...)→arguments[0]；
+    //   深度上限 4 防御——超限原样返回即不判，不误报）后两形态判定：
+    //   ObjectExpression=逐属性判定（弃「全 Literal 门」——混计算属性/
+    //   引用值不豁免整对象；key=Identifier 或 string Literal 均入判，
+    //   属性名只用于报错信息）+单值 string Literal 命中即报（主控裁决
+    //   扩展：单值常量与对象表同绕过通道，对称闭合）。SpreadElement/
+    //   嵌套对象/模板串/二元式等非 Literal 值=明示不检残留面（与 style
+    //   面语义对称）。
+    // ③ JSXAttribute 属性名域（style 外）：显式表 fill|stroke|color|
+    //   stop-color|flood-color|lighting-color ∪ endsWith('Color') 后缀
+    //   （camelCase 表 stopColor/floodColor/lightingColor 天然命中）；
+    //   value=string Literal 命中即报（[N2 回炉] 含 JSXExpressionContainer
+    //   包裹形态 fill={'#fff'} 同检——主控裁决加码）；域外属性名（data-x
+    //   等）不报。属性域判定用字符串方法非正则——rule 内零内联 hex
+    //   特征正则（check-quality 6b 哨兵扫本文件文本，内联 hex 正则=
+    //   哨兵红）。
+    // [F-LINT-04 ③⑦ 2026-09-10] COLOR_RE/stripUrlFunctions import 自
+    // scripts/color-re.mjs 单源（本文件头注互指；url(#x)=id 引用非色值，
+    // 剥离后再检）
     files: ['src/renderer/**/*.tsx'],
     plugins: {
       synapse: {
         rules: {
           'no-inline-color': {
             create(context) {
+              const hitsColor = (s) => COLOR_RE.test(stripUrlFunctions(s))
+              // [W1 回炉 2026-09-10] EXPLICIT_ATTRS 上提 create 级（与
+              // hitsColor/unwrapInit 同级——代码实物与报告 §6 申报一致）
+              const EXPLICIT_ATTRS = [
+                'fill',
+                'stroke',
+                'color',
+                'stop-color',
+                'flood-color',
+                'lighting-color'
+              ]
+              // init 层递归 unwrap（as const/satisfies/Object.freeze——
+              // Object.freeze({...} as const) 双层等嵌套均经此递归）。
+              // [W3 回炉 2026-09-10] depth >= 4 对齐票面字面「深度上限 4」
+              //（最多解 4 层包裹；第 5 层起原样返回即不判，不误报）
+              const unwrapInit = (node, depth = 0) => {
+                if (!node || depth >= 4) return node
+                if (node.type === 'TSAsExpression' || node.type === 'TSSatisfiesExpression') {
+                  return unwrapInit(node.expression, depth + 1)
+                }
+                if (
+                  node.type === 'CallExpression' &&
+                  node.callee.type === 'MemberExpression' &&
+                  node.callee.object.type === 'Identifier' &&
+                  node.callee.object.name === 'Object' &&
+                  node.callee.property.type === 'Identifier' &&
+                  node.callee.property.name === 'freeze'
+                ) {
+                  return unwrapInit(node.arguments[0], depth + 1)
+                }
+                return node
+              }
               return {
+                VariableDeclarator(node) {
+                  const init = unwrapInit(node.init)
+                  if (!init) return
+                  const name = node.id.type === 'Identifier' ? node.id.name : '(destructured)'
+                  if (init.type === 'ObjectExpression') {
+                    // 逐属性判定：仅 string Literal 值入判——SpreadElement/
+                    // 嵌套对象/模板串/二元式/调用式=明示不检残留面
+                    for (const prop of init.properties) {
+                      if (prop.type !== 'Property') continue
+                      if (prop.key.type !== 'Identifier' && prop.key.type !== 'Literal') continue
+                      const val = prop.value
+                      if (!val || val.type !== 'Literal' || typeof val.value !== 'string') continue
+                      if (hitsColor(val.value)) {
+                        const keyName =
+                          prop.key.type === 'Identifier' ? prop.key.name : String(prop.key.value)
+                        context.report({
+                          node: val,
+                          message: `模块常量色值字面量 "${val.value}"（${name}.${keyName}）——颜色消费单源=--* token（INV-11）`
+                        })
+                      }
+                    }
+                  } else if (
+                    init.type === 'Literal' &&
+                    typeof init.value === 'string' &&
+                    hitsColor(init.value)
+                  ) {
+                    context.report({
+                      node: init,
+                      message: `模块常量色值字面量 "${init.value}"（${name}）——颜色消费单源=--* token（INV-11）`
+                    })
+                  }
+                },
                 JSXAttribute(node) {
-                  if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
-                  const v = node.value
-                  if (!v || v.type !== 'JSXExpressionContainer') return
-                  const obj = v.expression
-                  if (!obj || obj.type !== 'ObjectExpression') return
-                  for (const prop of obj.properties) {
-                    if (prop.type !== 'Property') continue
-                    const val = prop.value
-                    if (!val || val.type !== 'Literal') continue
-                    const s = String(val.value)
-                    if (COLOR_RE.test(stripUrlFunctions(s))) {
-                      context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
+                  if (node.name.type !== 'JSXIdentifier') return
+                  const attr = node.name.name
+                  if (attr === 'style') {
+                    // 原 B-5 style 路径（行为保留不动——仅 guard 子句拆分接入新域）
+                    const v = node.value
+                    if (!v || v.type !== 'JSXExpressionContainer') return
+                    const obj = v.expression
+                    if (!obj || obj.type !== 'ObjectExpression') return
+                    for (const prop of obj.properties) {
+                      if (prop.type !== 'Property') continue
+                      const val = prop.value
+                      if (!val || val.type !== 'Literal') continue
+                      const s = String(val.value)
+                      if (COLOR_RE.test(stripUrlFunctions(s))) {
+                        context.report({ node: val, message: `inline style 颜色字面量 "${s}"——颜色消费单源=--* token（INV-11）` })
+                      }
                     }
+                    return
+                  }
+                  // [F-LINT-04-T2] SVG/attr 面属性名域：显式表 ∪ camelCase 后缀
+                  //（EXPLICIT_ATTRS 已上提 create 级——W1 回炉）
+                  if (!EXPLICIT_ATTRS.includes(attr) && !attr.endsWith('Color')) return
+                  // [N2 回炉=主控裁决加码 2026-09-10] value 增判
+                  // JSXExpressionContainer 包裹形态：fill={'#fff'} 与
+                  // fill="#fff" 同罪（域内常见绕过通道）；style 分支不动
+                  //（其本就走 container 判 ObjectExpression）
+                  const v = node.value
+                  if (!v) return
+                  const lit = v.type === 'JSXExpressionContainer' ? v.expression : v
+                  if (!lit || lit.type !== 'Literal' || typeof lit.value !== 'string') return
+                  if (hitsColor(lit.value)) {
+                    context.report({
+                      node: lit,
+                      message: `SVG/attr 颜色字面量 "${lit.value}"（${attr}）——颜色消费单源=--* token（INV-11）`
+                    })
                   }
                 }
               }

```

# 补强证据抽样

```
=== r12 ===
  1:40  error  模块常量色值字面量 "#222222"（DUAL.b）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 2 problems (2 errors, 0 warnings)
exit=1
=== r13 ===
  1:36  error  SVG/attr 颜色字面量 "#abcdef"（fill）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r14 ===
  1:41  error  模块常量色值字面量 "#333333"（NEST.bg）——颜色消费单源=--* token（INV-11）  synapse/no-inline-color
✖ 1 problem (1 error, 0 warnings)
exit=1
=== r13-preimpl ===
$ npx eslint src/renderer/lint-red-probe-r13-pre.tsx (R13 pre-impl: container-wrapped fill literal, expect 0 errors = N2 detection missing, TDD red)
exit=0

```
