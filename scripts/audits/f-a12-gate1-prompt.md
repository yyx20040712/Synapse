# F-A12 门一对抗深审（Kimi 链——事件类票：事件时间线逐帧推演=强制审项）

你是门一对抗审查员（隔离一审，零仓库接触）。审计包自包含，禁跑命令、禁臆测包外事实。只报告有代码/证据支撑的问题，每条给 file:line 或代码摘录；不确定的明确说不确定。中文输出，总输出 ≤3.5K 字。

## 铁律
只读审计；唯一可写=本回复文本；禁 npm/test/git。

## 票面（浓缩）
F-A10 G2 遗留：mouseup 释放点浅下探（实测 y+6 落行间隙/下段盒顶）且释放 x 处上一行无文本时，浏览器把选区终点送进下一段 span 文本位 offset>0（实据 end=1504 带下段头）——与「刻意深点」DOM 态零信号差异，锚定层不可辨，须事件层手势几何。方案=mouseup 真划选（位移≥3px）且释放点在 focus 行上方间隙、更近上一视觉行→focus 重定向上一行（释放 x 最近栏组）行尾（锚定侧原样）后 evaluate.full 同帧照常。手势态表/防误伤/量测守卫见实现头注。验收=单测（每例先红）+真机复测 G2 场景（end 不含下段首字符+paint 不跨段+G1 回归）+verify 全链。

## 主控预裁与授权（可攻击但推翻需更强依据）
1. 几何复用=export anchor-blank-snap 私有面（visualRows/columnGroups/rowEndOf/boxOf/Box）——几何单源禁复制。
2. 判据微调授权：实现者依实测微调+申报（微调实况=预裁定纯距离判据在实测 G2 几何不触发——段间间隙仅 2.5px，释放 y+6 距上一行盒底 2.0px>距 focus 盒顶 0.5px——紧间隙下距离分割失效；加 SHALLOW_PROBE_MAX_PX=4 余量兜底；大间隙刻意释放 19px 级零变单测锁定）。
3. e2e 替代已核准面：机械面可行但 G2 复现依赖浏览器 caret 下探非确定行为（F-A10 档案 1/4 次指纹）+需扩受锁 pdf-factory——替代=jsdom 实测几何复刻用例+真机矩阵。
4. 真机复测矩阵（f-a12-verify-real.raw.txt，temp 拷贝库配方）：G2 浅下探释放 y+6→focus=(Mohanty span, 36=行尾)、end_offset=1465（修复前 1504）、paint max bottom 540.3<段顶 542.8 不跨段；落库 end=1465+suffix=下段首；G1 回归 end=1465 原样不破。
5. verify 机器面：161 文件/1573 用例（基线 160/1562+11）/locks 315 一致/typecheck/lint/build 过——主控已亲跑 test+locks:check 复核。

## 核心实现 diff（4 文件：新件 release-affinity.ts 全文+SelectionLayer 接线+anchor-blank-snap export 扩面+新测试件 208 行）

```diff
diff --git a/src/renderer/features/reader/SelectionLayer.tsx b/src/renderer/features/reader/SelectionLayer.tsx
index caaf456547..d9e30b590a 100644
--- a/src/renderer/features/reader/SelectionLayer.tsx
+++ b/src/renderer/features/reader/SelectionLayer.tsx
@@ -42,6 +42,12 @@
  * 工具条语义零变。**AnnotationLayer 存量重锚域仍 DOM 量测域——INV-58 票外
  * 边界，同族化/域间换算守卫=独立票（门二 seam_ruling 在档）**。
  *
+ * **F-A12 划选释放点浅探 affinity（事件层重定向）**：mouseup 真划选（位移≥3px
+ * ——程序化零触）且释放点在 focus 行上方间隙、更近上一视觉行 → focus 经
+ * release-affinity.releaseAffinity 重定向上一行行尾（锚定侧原样）后 evaluate.full
+ * 同帧照常（G2 文本位下探——锚定层零 DOM 信号，事件层手势几何裁决；完整判据/
+ * 手势态表/时间线=release-affinity.ts 头注）。
+ *
  * ── 接口层 ── / ── 架构层 ──
  * - props 形状不变=挂载位契约零改；closestPageRoot/pageIndexOf 经本文件再
  *   导出（实现在 selection-geometry——F-A4 拆件，导出面零变）。锚定根=
@@ -61,7 +67,8 @@ import { pushUndo } from './annotation-undo'
 import { createEvaluate, type PaintSelection, type PendingSelection } from './selection-evaluate'
 import { SelectionToolbar } from './SelectionToolbar'
 import { SelectionPaint } from './selection-paint'
-import { createVisualScheduler } from './selection-geometry'
+import { createVisualScheduler, closestPageRoot } from './selection-geometry'
+import { releaseAffinity } from './release-affinity'
 import { useReaderStore } from './reader.store'
 
 // 纯函数页盒遍历（F-02）在 selection-geometry.ts——F-A4 拆件，导出面经本文件再导出（票面 §2）
@@ -121,6 +128,7 @@ export function SelectionLayer(props: {
       if (e.target instanceof Node && toolbarRef.current?.contains(e.target) === true) return
       scheduler.cancel()
       // F-12：位移过小=单击/双击误触不出条（自绘层留待防抖路径随选区坍缩清除）
+      let dragged = false
       if (Number.isFinite(downX)) {
         const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
         downX = downY = Number.NaN
@@ -128,6 +136,28 @@ export function SelectionLayer(props: {
           setPending(null)
           return
         }
+        dragged = true
+      }
+      // [F-A12] 浅探 affinity：真划选（dragged——程序化 mouseup 零触）且释放点
+      // 在 focus 行上方间隙、更近上一视觉行 → focus 重定向上一行行尾（锚定侧
+      // 原样）；随后 evaluate.full 同帧消费已重定向选区（时间线逐帧推演=
+      // release-affinity.ts 头注——mouseup→cancel→F-12 门→判定→setBaseAndExtent
+      // →evaluate.full(true)，排队的 selectionchange 由 visual 快路径幂等吸收）
+      if (dragged) {
+        const sel = window.getSelection()
+        if (sel !== null && sel.rangeCount > 0 && !sel.isCollapsed) {
+          const anchorRoot = closestPageRoot(sel.anchorNode)
+          if (anchorRoot !== null && closestPageRoot(sel.focusNode) === anchorRoot) {
+            const textLayer = anchorRoot.querySelector('.textLayer') as HTMLElement | null
+            if (textLayer !== null) {
+              const target = releaseAffinity(textLayer, sel, e.clientX, e.clientY)
+              if (target !== null) {
+                // 前置 rangeCount>0 且非坍缩守卫蕴含 anchorNode 必在
+                sel.setBaseAndExtent(sel.anchorNode!, sel.anchorOffset, target.node, target.offset)
+              }
+            }
+          }
+        }
       }
       evaluate.full(true)
     }
diff --git a/src/renderer/features/reader/anchor-blank-snap.ts b/src/renderer/features/reader/anchor-blank-snap.ts
index a0bf906984..ba18c805a3 100644
--- a/src/renderer/features/reader/anchor-blank-snap.ts
+++ b/src/renderer/features/reader/anchor-blank-snap.ts
@@ -32,6 +32,10 @@
  *   （side='start'|'end'——br 类吸附目标按边界侧区分；输入输出同构——未命中
  *   时返回等值新对象；锚定链消费=anchor-serialize selectionToAnchor 的输入
  *   归一化，快/慢路径最终锚定同源）
+ * - [F-A12] 几何复用面（几何单源，禁两处复制聚类逻辑）：export boxOf（量测
+ *   守卫盒——四零盒 null）/visualRows（中心聚类视觉行）/columnGroups（行内
+ *   栏聚类）/rowEndOf（最近栏组行尾边界）+ export type Box；消费方=
+ *   release-affinity（释放点浅探重定向——事件层判定，与锚定归一化互不替代）
  *
  * ── 架构层 ──
  * - 依赖单向 anchor-serialize→本模块→annotation-anchor（几何原语公共面
@@ -59,8 +63,9 @@ export interface DomBoundary {
 /** 归一化的边界侧（br 类吸附目标按此区分——C-1） */
 export type BoundarySide = 'start' | 'end'
 
-/** 像素盒（top/bottom/left/right——getBoundingClientRect 视口口径） */
-interface Box {
+/** 像素盒（top/bottom/left/right——getBoundingClientRect 视口口径）。
+ *  [F-A12] 起导出——release-affinity 事件层判定复用同型盒（几何单源） */
+export interface Box {
   top: number
   bottom: number
   left: number
@@ -84,8 +89,9 @@ function isBlankMarker(el: Element | null): boolean {
 
 /** 元素量测盒；无布局量测（jsdom 未打桩=含原点四零盒）或非函数 → null（归一化
  *  放弃）。真浏览器的零尺寸标记（br/空 span）原点真实（绝对定位 left/top 仍在）
- *  ——位置即信号（真机复测第一轮实证：按尺寸判会把真标记误杀） */
-function boxOf(el: Element | null): Box | null {
+ *  ——位置即信号（真机复测第一轮实证：按尺寸判会把真标记误杀）。
+ *  [F-A12] 起导出——release-affinity focus 盒/行盒同守卫口径 */
+export function boxOf(el: Element | null): Box | null {
   if (el === null || typeof el.getBoundingClientRect !== 'function') {
     return null
   }
@@ -117,8 +123,9 @@ function markerAt(node: Node, offset: number): Element | null {
 
 /** 中心聚类成视觉行：相邻中心差 ≤ max(2, 半高) 合并；输出按中心升序。
  *  [C-2] 最近单行制——容差内集在跨行居中标记下会同时纳入两行，改为聚类后
- *  取最近一行，等距并列取中心更小者（阅读序上行） */
-function visualRows(items: Array<{ span: NodeSpan; box: Box }>): Array<Array<{ span: NodeSpan; box: Box }>> {
+ *  取最近一行，等距并列取中心更小者（阅读序上行）。
+ *  [F-A12] 起导出——release-affinity 上一直觉行定位复用（输出中心升序=阅读序） */
+export function visualRows(items: Array<{ span: NodeSpan; box: Box }>): Array<Array<{ span: NodeSpan; box: Box }>> {
   const sorted = [...items].sort((a, b) => (a.box.top + a.box.bottom) / 2 - (b.box.top + b.box.bottom) / 2)
   const rows: Array<Array<{ span: NodeSpan; box: Box }>> = []
   for (const it of sorted) {
@@ -159,8 +166,9 @@ function nearestRow(root: HTMLElement, markerCy: number): Array<{ span: NodeSpan
   return best
 }
 
-/** 行内栏聚类：按 left 升序，x 间隙大于阈值断组（同视觉行的多栏文本互不吸附） */
-function columnGroups(row: Array<{ span: NodeSpan; box: Box }>): Array<Array<{ span: NodeSpan; box: Box }>> {
+/** 行内栏聚类：按 left 升序，x 间隙大于阈值断组（同视觉行的多栏文本互不吸附）。
+ *  [F-A12] 起导出——release-affinity 经 rowEndOf 间接消费（单源不改语义） */
+export function columnGroups(row: Array<{ span: NodeSpan; box: Box }>): Array<Array<{ span: NodeSpan; box: Box }>> {
   const sorted = [...row].sort((a, b) => a.box.left - b.box.left)
   const groups: Array<Array<{ span: NodeSpan; box: Box }>> = []
   for (const r of sorted) {
@@ -175,8 +183,10 @@ function columnGroups(row: Array<{ span: NodeSpan; box: Box }>): Array<Array<{ s
   return groups
 }
 
-/** 行尾边界：标记最近栏组内最右文本的末尾 */
-function rowEndOf(row: Array<{ span: NodeSpan; box: Box }>, box: Box): DomBoundary | null {
+/** 行尾边界：标记最近栏组内最右文本的末尾。
+ *  [F-A12] 起导出——release-affinity 重定向目标=上一视觉行（释放 x 最近栏组）行尾，
+ *  box 入参即释放点合成盒（left/right=upX）——语义同一：最近栏组定向 */
+export function rowEndOf(row: Array<{ span: NodeSpan; box: Box }>, box: Box): DomBoundary | null {
   const groups = columnGroups(row)
   let best: Array<{ span: NodeSpan; box: Box }> | null = null
   let bestDist = Number.POSITIVE_INFINITY
diff --git a/src/renderer/features/reader/release-affinity.ts b/src/renderer/features/reader/release-affinity.ts
new file mode 100644
index 0000000000..23449a2ccc
--- /dev/null
+++ b/src/renderer/features/reader/release-affinity.ts
@@ -0,0 +1,166 @@
+/**
+ * [F-A12] release-affinity —— 划选释放点浅探 affinity 重定向判定（纯函数）
+ *
+ * ── 行为层 ──
+ * - 缺陷机制（F-A10 G2 遗留，f-a10-impl.report §6.1 论证）：mouseup 释放点浅
+ *   下探（实测 y+6 落行间隙/下段盒顶）且释放 x 处上一行无文本（行尾空白区）时，
+ *   浏览器把选区终点送进下一段 span 内 offset>0（真机实据 end=1504 带下段头）
+ *   ——与「刻意深点到该处」DOM 态零信号差异，锚定层原理不可辨，须事件层
+ *   手势几何裁决（本模块）。
+ * - 判据（方向无关——只看 focus 与释放点几何，不依赖 down 坐标）：
+ *   · 触发门槛=选区非坍缩 + focus 在 root 内 + 释放点 upY < focus 盒顶 top_f
+ *     （释放点物理在 focus 行上方——正常划选释放点在 focus 行盒内/下方=零变）；
+ *   · 浅探=|upY − 上一视觉行盒底 bottom_p| ≤ max(top_f − upY, 浅探余量)：
+ *     距离主判据（更近上一行；等距取上一行——对齐 anchor-blank-snap C-2 等距
+ *     并列取阅读序上行精神）+ 运动过冲余量兜底——【判据微调申报】预裁定纯
+ *     距离判据在实测 G2 几何不触发（f-a10-verify-real2.raw.txt GEO：段间间隙
+ *     仅 2.5px，释放 y+6 距上一行盒底 2.0px > 距 focus 盒顶 0.5px——紧间隙
+ *     排版下距离分割失效，间隙带整体在人类瞄准精度之外），故加绝对余量
+ *     SHALLOW_PROBE_MAX_PX 吞释放过冲；大间隙底部刻意释放（距上一行盒底远
+ *     超余量）仍零变（单测锁定）；
+ *   · 重定向目标=上一视觉行（释放 x 最近栏组）行尾（rowEndOf 语义）。
+ * - 手势态表（状态机前置，票面口径）：
+ *   无 mousedown 记录（程序化）→调用方零触（SelectionLayer dragged 门）/
+ *   位移 <3px（单击双击）→现行 F-12 早退路径（判定不达）/ 释放点 ≥ focus 行
+ *   盒顶（正常/深点）→null 零变 / 释放点 <top_f 且距上一行盒底 ≤ max(距
+ *   top_f, 浅探余量)（浅探）→重定向 / 释放点 <top_f 但更近 focus 行且超出
+ *   浅探余量（深点=用户刻意）→null 零变 / jsdom 四零盒
+ *   无布局→量测守卫 null 零变（F-A10 兼容面同款）。
+ * - 防误伤：词间空格正常划选（释放点在 focus 行盒内）恒零触；重定向后
+ *   start>end 由 selectionToAnchor 翻转兜底（C-1 同族既有面）。
+ * - 事件时间线（mouseup 同帧序——门一强制审项）：
+ *   ① browser mouseup（原生 selection 已按释放点解析——可能已下探到下段）
+ *   ② SelectionLayer：scheduler.cancel → F-12 位移门（moved≥3px 真划选才开
+ *      dragged 门；否则早退零触）
+ *   ③ releaseAffinity 判定（本模块——纯读零 DOM 写）
+ *   ④ 命中→selection.setBaseAndExtent(anchor 原样, target=上一行行尾)——同步
+ *      写 selection；浏览器对 setBaseAndExtent 排队 selectionchange（异步派发）
+ *   ⑤ evaluate.full(true) 同步执行——消费已重定向选区，先于 ④ 排队的
+ *      selectionchange 派发，pending/paint 即终态
+ *   ⑥ 排队的 selectionchange 后续派发→scheduler.handler→rAF→evaluate.visual
+ *      幂等重渲（同选区同产物，零语义漂移）
+ *
+ * ── 接口层 ──
+ * - export function releaseAffinity(root, selection, upX, upY): DomBoundary | null
+ *   （root=选区所在页 textLayer；返回 null=零变，非 null=focus 重定向目标
+ *   （node+offset——锚定侧由调用方原样保留）；零 React 依赖纯函数）
+ *
+ * ── 架构层 ──
+ * - 几何单源：行聚类/栏聚类/行尾/量测守卫盒全部经 anchor-blank-snap 导出面
+ *   复用（visualRows/columnGroups/rowEndOf/boxOf——F-A12 扩面），文本域遍历
+ *   经 annotation-anchor collectSpans 公共面；依赖单向
+ *   release-affinity→anchor-blank-snap→annotation-anchor（零环）。
+ *   本模块与锚定归一化（snapBlankBoundary）互不替代：锚定层管标记槽位
+ *   （DOM 序≠视觉序），事件层管手势几何（释放点 vs focus 行）——G2 文本位
+ *   下探仅事件层可辨。
+ *
+ * ── 生命周期层 ──
+ * - 仅 mouseup 时刻调用（非每帧）；单页千级文本节点 O(n log n)（collectSpans+
+ *   行聚类+栏排序）只读一遍布局，与 anchor-blank-snap 同量级 <10ms 约束内。
+ *
+ * ── 文化层 ──
+ * - 测试：tests/unit/renderer/release-affinity.test.ts（always-active，jsdom
+ *   量测桩=getBoundingClientRect 逐元素打盒——F-A10 同款手法；覆盖面=G2 浅
+ *   下探重定向/深点零变/词间空格行盒内零触/向上浅上探对称/四零盒守卫/双栏
+ *   最近栏组定向/首行零变/坍缩零触/等距取上一行/紧间隙实测 G2 几何复刻/
+ *   大间隙底部刻意零变）
+ */
+import { collectSpans, type NodeSpan } from './annotation-anchor'
+import { boxOf, rowEndOf, visualRows, type Box, type DomBoundary } from './anchor-blank-snap'
+
+/** 浅探运动过冲余量（px）：紧间隙排版（实测段间 2.5px）下释放点距上一行盒底
+ *  2px 即为浅下探实态——纯距离判据会漏（头注申报）；4px=人类释放过冲量级
+ *  （与 SelectionLayer DRAG_SELECT_THRESHOLD_PX=3 同量级+1px 量测松弛），
+ *  大间隙底部刻意释放（~19px 级）不被误吞（单测锁定） */
+const SHALLOW_PROBE_MAX_PX = 4
+
+/** focus 边界盒：文本位=父 span 盒（pdf.js 文本层 span 单文本节点——G2 实测
+ *  focus 形态）；元素槽位=折叠 Range 插字符盒（真 Chromium 有行高；jsdom
+ *  四零→守卫 null）。无布局/异常 → null（判定放弃零变） */
+function focusBoxAt(node: Node, offset: number): Box | null {
+  if (node.nodeType === Node.TEXT_NODE) {
+    return boxOf(node.parentElement)
+  }
+  try {
+    const caret = document.createRange()
+    caret.setStart(node, offset)
+    caret.collapse(true)
+    const b = caret.getBoundingClientRect()
+    if (b.x === 0 && b.y === 0 && b.width === 0 && b.height === 0) {
+      return null
+    }
+    return { top: b.top, bottom: b.bottom, left: b.left, right: b.right }
+  } catch {
+    return null
+  }
+}
+
+/** focus 所在视觉行索引（visualRows 输出=中心升序阅读序）：文本节点同一性
+ *  优先（focus 即行内 span——G2 实测形态，零几何歧义）；回退=与 focus 盒垂直
+ *  重叠最大者（全零重叠→-1 保守零变——插字符盒不落任何行带时不可信） */
+function focusRowIndex(rows: Array<Array<{ span: NodeSpan; box: Box }>>, focus: Node, focusBox: Box): number {
+  for (let i = 0; i < rows.length; i += 1) {
+    if (rows[i]!.some((it) => it.span.node === focus)) {
+      return i
+    }
+  }
+  const focusCenter = (focusBox.top + focusBox.bottom) / 2
+  let best = -1
+  let bestOverlap = 0
+  let bestDist = Number.POSITIVE_INFINITY
+  for (let i = 0; i < rows.length; i += 1) {
+    const row = rows[i]!
+    const top = Math.min(...row.map((r) => r.box.top))
+    const bottom = Math.max(...row.map((r) => r.box.bottom))
+    const overlap = Math.min(bottom, focusBox.bottom) - Math.max(top, focusBox.top)
+    const dist = Math.abs((top + bottom) / 2 - focusCenter)
+    if (overlap > bestOverlap || (overlap === bestOverlap && overlap > 0 && dist < bestDist)) {
+      best = i
+      bestOverlap = overlap
+      bestDist = dist
+    }
+  }
+  return best
+}
+
+/**
+ * [F-A12] 释放点浅探 affinity 判定：释放点在 focus 行盒顶上方且距上一视觉行
+ * 盒底 ≤ max(距 focus 盒顶, 浅探余量)（更近/等距/紧间隙过冲）时返回上一行
+ * （释放 x 最近栏组）行尾作为 focus 重定向目标；其余形态（正常/深点/坍缩/
+ * 无上一行/无布局量测）返回 null=零变。
+ */
+export function releaseAffinity(root: HTMLElement, selection: Selection, upX: number, upY: number): DomBoundary | null {
+  if (selection.rangeCount === 0 || selection.isCollapsed) {
+    return null
+  }
+  const focus = selection.focusNode
+  if (focus === null || !root.contains(focus)) {
+    return null
+  }
+  const focusBox = focusBoxAt(focus, selection.focusOffset)
+  if (focusBox === null || upY >= focusBox.top) {
+    return null
+  }
+  const items: Array<{ span: NodeSpan; box: Box }> = []
+  for (const span of collectSpans(root).spans) {
+    const b = boxOf(span.node.parentElement)
+    if (b !== null) {
+      items.push({ span, box: b })
+    }
+  }
+  if (items.length === 0) {
+    return null
+  }
+  const rows = visualRows(items)
+  const idx = focusRowIndex(rows, focus, focusBox)
+  if (idx <= 0) {
+    return null
+  }
+  const prev = rows[idx - 1]!
+  const prevBottom = Math.max(...prev.map((r) => r.box.bottom))
+  // 距离主判据（更近/等距上一行）+ 浅探余量兜底（紧间隙实测 G2 几何——头注申报）
+  if (Math.abs(upY - prevBottom) > Math.max(focusBox.top - upY, SHALLOW_PROBE_MAX_PX)) {
+    return null
+  }
+  return rowEndOf(prev, { top: upY, bottom: upY, left: upX, right: upX })
+}
diff --git a/tests/unit/renderer/release-affinity.test.ts b/tests/unit/renderer/release-affinity.test.ts
new file mode 100644
index 0000000000..cb340a73f0
--- /dev/null
+++ b/tests/unit/renderer/release-affinity.test.ts
@@ -0,0 +1,208 @@
+// @vitest-environment jsdom
+import { afterEach, describe, expect, it } from 'vitest'
+import { releaseAffinity } from '../../../src/renderer/features/reader/release-affinity'
+import { selectionToAnchor } from '../../../src/renderer/features/reader/anchor-serialize'
+import type { SelectionAnchor } from '../../../src/renderer/features/reader/anchor-serialize'
+
+/**
+ * F-A12 划选释放点浅探 affinity（release-affinity 事件层重定向）——F-A10 G2 遗留：
+ * mouseup 释放点浅下探（行间隙/下段盒顶）且释放 x 处上一行无文本（行尾空白区）时，
+ * 浏览器把终点送进下一段 span 内 offset>0（与刻意深点零 DOM 信号差异——锚定层
+ * 原理不可辨，须事件层手势几何裁决）。判定=释放点在 focus 行盒顶上方且更近上一
+ * 视觉行（等距取上一行）→ 重定向 focus=上一行行尾；锚定侧原样。always-active。
+ */
+
+interface Box { top: number; bottom: number; left: number; right: number }
+
+/** 给元素打量测桩（真浏览器 getBoundingClientRect 的 jsdom 替身——F-A10 同款） */
+function rectOf(el: HTMLElement, b: Box): void {
+  el.getBoundingClientRect = () =>
+    ({ x: b.left, y: b.top, top: b.top, bottom: b.bottom, left: b.left, right: b.right, width: b.right - b.left, height: b.bottom - b.top, toJSON: () => ({}) }) as DOMRect
+}
+
+/** 造一个 pdf.js 文本层形态的 span（文本+量测盒） */
+function mkSpan(text: string, b: Box): HTMLSpanElement {
+  const s = document.createElement('span')
+  s.textContent = text
+  rectOf(s, b)
+  return s
+}
+
+interface Pt { node: Node; offset: number }
+
+/** 程序化设选区（anchor/focus 精确控制——backward 形态须 setBaseAndExtent） */
+function selOf(anchor: Pt, focus: Pt): Selection {
+  const sel = document.getSelection()
+  sel?.removeAllRanges()
+  sel?.setBaseAndExtent(anchor.node, anchor.offset, focus.node, focus.offset)
+  return sel as Selection
+}
+
+/** 接线等价链：判定→setBaseAndExtent（锚定侧原样）→selectionToAnchor 三元组 */
+function redirectedAnchor(root: HTMLElement, sel: Selection, upX: number, upY: number): SelectionAnchor | null {
+  const target = releaseAffinity(root, sel, upX, upY)
+  if (target === null) return null
+  // releaseAffinity 非 null 蕴含选区非坍缩（anchorNode 必在）
+  sel.setBaseAndExtent(sel.anchorNode!, sel.anchorOffset, target.node, target.offset)
+  return selectionToAnchor(root, sel)
+}
+
+afterEach(() => {
+  document.getSelection()?.removeAllRanges()
+  document.body.replaceChildren()
+})
+
+describe('F-A12 释放点浅探 affinity（release-affinity 重定向判定）', () => {
+  it('G2 浅下探：释放点在 focus 行上方间隙且更近上一行 → 重定向上一行行尾，落库终点不带下段头', () => {
+    // 视觉：row1「AB first」y[100,110]；row2「CD second」y[130,140]（间隙 [110,130]）
+    // 浏览器浅下探把 focus 送进 row2 span offset 3（实测 G2 形态）；释放点 y=115 更近 row1
+    const root = document.createElement('div')
+    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
+    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
+    root.append(s1, s2)
+    document.body.append(root)
+    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
+    const target = releaseAffinity(root, sel, 60, 115)
+    expect(target).not.toBeNull()
+    expect(target!.node).toBe(s1.firstChild)
+    expect(target!.offset).toBe(8)
+    const a = redirectedAnchor(root, sel, 60, 115)
+    expect(a).not.toBeNull()
+    expect(a!.end).toBe(8)
+    expect(a!.quote).toBe('AB first')
+    expect(a!.quote).not.toContain('CD')
+  })
+
+  it('深点（释放点更近 focus 行）= 用户刻意 → 零变 null', () => {
+    const root = document.createElement('div')
+    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
+    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
+    root.append(s1, s2)
+    document.body.append(root)
+    // 释放 y=125：距 row1 盒底 15 > 距 row2 盒顶 5 → 深点零变
+    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
+    expect(releaseAffinity(root, sel, 60, 125)).toBeNull()
+  })
+
+  it('词间空格正常划选（释放点在 focus 行盒内）→ 零触 null', () => {
+    const root = document.createElement('div')
+    const s = mkSpan('foo bar baz', { top: 100, bottom: 110, left: 10, right: 90 })
+    root.append(s)
+    document.body.append(root)
+    // 词间空格划选（offset 3..11 含空格），释放点 y=105 在行盒内（upY ≥ 行盒顶）
+    const sel = selOf({ node: s.firstChild!, offset: 3 }, { node: s.firstChild!, offset: 11 })
+    expect(releaseAffinity(root, sel, 50, 105)).toBeNull()
+  })
+
+  it('向上浅上探对称：backward 划选 focus 被解析到下侧行、释放点更近上一行 → focus 重定向上一行行尾', () => {
+    // 视觉：r0「EF third」y[80,90]；r1「AB first」y[100,110]；r2「CD second」y[120,130]
+    // 向上划选（anchor=r2 尾），释放点 y=93 在 r1 上方间隙、更近 r0（3 ≤ 7）
+    const root = document.createElement('div')
+    const r0 = mkSpan('EF third', { top: 80, bottom: 90, left: 10, right: 70 })
+    const r1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
+    const r2 = mkSpan('CD second', { top: 120, bottom: 130, left: 10, right: 70 })
+    root.append(r0, r1, r2)
+    document.body.append(root)
+    // 释放 x=75 在 r0 文本右缘外（行尾空白区——浏览器下探把 focus 送进 r1 offset 2）
+    const sel = selOf({ node: r2.firstChild!, offset: 9 }, { node: r1.firstChild!, offset: 2 })
+    const target = releaseAffinity(root, sel, 75, 93)
+    expect(target).not.toBeNull()
+    expect(target!.node).toBe(r0.firstChild)
+    expect(target!.offset).toBe(8)
+    // 接线等价链：全文 'EF thirdAB firstCD second'（25）——重定向后选区 [8,25)
+    const a = redirectedAnchor(root, sel, 75, 93)
+    expect(a).not.toBeNull()
+    expect(a!.start).toBe(8)
+    expect(a!.quote).toBe('AB firstCD second')
+  })
+
+  it('无布局量测（jsdom 未打桩=含原点四零盒）→ 量测守卫零变 null', () => {
+    const root = document.createElement('div')
+    const s1 = document.createElement('span')
+    s1.textContent = 'AB first'
+    const s2 = document.createElement('span')
+    s2.textContent = 'CD second'
+    root.append(s1, s2)
+    document.body.append(root)
+    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
+    expect(releaseAffinity(root, sel, 60, 115)).toBeNull()
+  })
+
+  it('双栏：上一视觉行双栏组，释放 x 定向最近（右）栏组行尾，不跨栏误吸', () => {
+    // row0 双栏：左「L1 tail」x[10,100]｜右「R1 end」x[150,240]，y[100,110]
+    // row1（focus 行）：右栏「CD second」x[150,240]，y[130,140]
+    const root = document.createElement('div')
+    const l0 = mkSpan('L1 tail', { top: 100, bottom: 110, left: 10, right: 100 })
+    const r0 = mkSpan('R1 end', { top: 100, bottom: 110, left: 150, right: 240 })
+    const s1 = mkSpan('CD second', { top: 130, bottom: 140, left: 150, right: 240 })
+    root.append(l0, r0, s1)
+    document.body.append(root)
+    // 释放 (200,115)：间隙更近 row0；x=200 落右栏组 → 右栏行尾（R1 end 长度 6）
+    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s1.firstChild!, offset: 3 })
+    const target = releaseAffinity(root, sel, 200, 115)
+    expect(target).not.toBeNull()
+    expect(target!.node).toBe(r0.firstChild)
+    expect(target!.offset).toBe(6)
+  })
+
+  it('focus 行=首行（无上一视觉行）→ 零变 null', () => {
+    const root = document.createElement('div')
+    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
+    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
+    root.append(s1, s2)
+    document.body.append(root)
+    // focus 在首行 s1，释放点 y=75 在其上方 → 无上一行可归
+    const sel = selOf({ node: s2.firstChild!, offset: 9 }, { node: s1.firstChild!, offset: 2 })
+    expect(releaseAffinity(root, sel, 60, 75)).toBeNull()
+  })
+
+  it('坍缩选区 → 零触 null', () => {
+    const root = document.createElement('div')
+    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
+    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
+    root.append(s1, s2)
+    document.body.append(root)
+    const sel = selOf({ node: s1.firstChild!, offset: 2 }, { node: s1.firstChild!, offset: 2 })
+    expect(releaseAffinity(root, sel, 60, 115)).toBeNull()
+  })
+
+  it('等距（距上一行盒底=距 focus 行盒顶）→ 取上一行重定向（对齐 blank-snap C-2 等距取上行精神）', () => {
+    const root = document.createElement('div')
+    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
+    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
+    root.append(s1, s2)
+    document.body.append(root)
+    // 释放 y=120：距 row1 盒底 10 = 距 row2 盒顶 10 → 等距取上一行
+    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
+    const target = releaseAffinity(root, sel, 60, 120)
+    expect(target).not.toBeNull()
+    expect(target!.offset).toBe(8)
+  })
+
+  it('紧间隙实测 G2 几何复刻（间隙 2.5px，释放仅高 focus 盒顶 0.5px、低于上一行盒底 2px）→ 浅探余量内重定向', () => {
+    // f-a10-verify-real2.raw.txt GEO 实测：last [532.3,540.3] / next [542.8,550.7]
+    // 释放 y+6=542.3——纯距离判据（2.0 > 0.5）不触发，须运动过冲余量兜住
+    const root = document.createElement('div')
+    const s1 = mkSpan('technologies (Mohanty et al., 2016).', { top: 532.3, bottom: 540.3, left: 748.9, right: 877.7 })
+    const s2 = mkSpan('With regard to urban water', { top: 542.8, bottom: 550.7, left: 760.9, right: 997.5 })
+    root.append(s1, s2)
+    document.body.append(root)
+    // 释放 x=907.7（s1 右缘外 30px 行尾空白区——浏览器下探 focus 进 s2 内部文本位）
+    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 20 })
+    const target = releaseAffinity(root, sel, 907.7, 542.3)
+    expect(target).not.toBeNull()
+    expect(target!.node).toBe(s1.firstChild)
+    expect(target!.offset).toBe(s1.textContent!.length)
+  })
+
+  it('大间隙底部刻意释放（深点：距上一行盒底 19px、距 focus 盒顶 1px）→ 零变 null', () => {
+    const root = document.createElement('div')
+    const s1 = mkSpan('AB first', { top: 100, bottom: 110, left: 10, right: 80 })
+    const s2 = mkSpan('CD second', { top: 130, bottom: 140, left: 10, right: 70 })
+    root.append(s1, s2)
+    document.body.append(root)
+    // 释放 y=129：距 row1 盒底 19 > max(距 row2 盒顶 1, 浅探余量) → 深点零变
+    const sel = selOf({ node: s1.firstChild!, offset: 0 }, { node: s2.firstChild!, offset: 3 })
+    expect(releaseAffinity(root, sel, 60, 129)).toBeNull()
+  })
+})

```

## 实现者自裁申报（超票面决定——报告 §7 全文）

1. 判据微调 SHALLOW_PROBE_MAX_PX=4（红证锁定缺口后微调——red2 对预裁定判据红）
2. 几何复用=export 路径未重建
3. dragged 局部旗标（程序化零触的实现形态——票面未规定）
4. focus 元素槽位盒=折叠 Range 插字符盒（jsdom 四零→守卫 null）
5. focusRowIndex 回退=文本同一性优先→垂直重叠回退（全零重叠 -1 保守零变）
6. 不变量登记候选留主控裁决（mouseup 事件层 focus 改写=新跨模块行为）
7. 探针/查询两 .mjs 诞生即 generate+apply（315）

## 实现者疑虑（报告 §8 全文——请裁决）

- SHALLOW_PROBE_MAX_PX=4 标定=单 PDF 实测+运动噪声量级类推，未扫全库形态；大间隙 PDF（段间距 ≥20px）体感未实测（单测已锁 19px 刻意零变面）。
- G1 形态若 Chromium 把 br 槽插字符盒解析到下段位置，F-A12 与 F-A10 归一化双覆盖（同目标 1465 无害叠加；两种解析形态终点一致已推演未逐一实测）。
- 释放点远高于上一行盒顶（跨多行）时判据恒真（prevBottom<top_f 蕴含 dist_prev<dist_f）——浏览器 caret 最近文本解析使该形态不可达（下探必先命中中间行），未加 prevTop 上界收紧；如门一认为需防御性收紧请回炉。

## 工单（A~E 逐项作答）

- A 母本符合度：实现与票面/主控预裁/手势态表逐条对拍（六态覆盖、方向无关主张、防误伤面、量测守卫）。
- B 宪法红线：纯函数分层（零 React 依赖）、几何单源（无聚类逻辑复制）、≤300/≤250 行红线、TDD 证据链形态（red/red2/green/mutation1/mutation2 在档索引）。
- C 代码与测试质量（事件类票强制审项——**事件时间线逐帧推演**）：mouseup→scheduler.cancel→F-12 门→releaseAffinity 判定→setBaseAndExtent→evaluate.full(true) 同帧序逐帧推演——①setBaseAndExtent 排队的 selectionchange 与 evaluate.full 的先后竞态 ②重定向后 visual 快路径幂等重渲主张 ③dragged 旗标与 F-12 早退路径的交互（moved<3 早退时 dragged=false 零触——与手势态表「位移<3px→现行路径」对拍）④setBaseAndExtent 的 anchorNode! 非空断言安全性（前置守卫蕴含论证）⑤focusRowIndex 两级回退的误判面。另：判据微调的正当性（red2 证据 vs 预裁定）、SHALLOW_PROBE_MAX_PX=4 的边界充分性、疑虑三的不可达论证是否成立（是否需 prevTop 防御性收紧）。
- D 报告诚实性：自裁 7 项逐条对 diff 核（尤其判据微调的 red2 是否真锁缺口）。
- E 接缝与后续：anchor-blank-snap 导出面扩 5 的接缝注释充分性、不变量登记候选的裁决建议（INV-37/58 修订 vs 新条目）、e2e 替代的恒真风险论证、后续票建议。

## 输出格式

[B|W|N] 逐条+file:line/代码摘录证据；统计行（B/W/N 计数）；总评（放行/回炉/终止）。
