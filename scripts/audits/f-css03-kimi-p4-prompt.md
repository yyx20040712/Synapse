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
## 片四：tsx 迁移面 diff（13 tsx——12 消费+PdfPageCanvas 裁决 1）

diff --git a/src/renderer/features/lineage/LineageEdges.tsx b/src/renderer/features/lineage/LineageEdges.tsx
index 4592cb8808..98b389bd36 100644
--- a/src/renderer/features/lineage/LineageEdges.tsx
+++ b/src/renderer/features/lineage/LineageEdges.tsx
@@ -42 +42 @@ const INFERRED_MARK = '推断'
-const INFERRED_STROKE = '#8a94a6'
+const INFERRED_STROKE = 'var(--edge-inferred)'
diff --git a/src/renderer/features/lineage/LineageNodeCard.tsx b/src/renderer/features/lineage/LineageNodeCard.tsx
index 5040236eaf..9cba4c857f 100644
--- a/src/renderer/features/lineage/LineageNodeCard.tsx
+++ b/src/renderer/features/lineage/LineageNodeCard.tsx
@@ -121 +121 @@ export function LineageNodeCard(props: {
-        fill="#ffffff"
+        fill="var(--panel)"
diff --git a/src/renderer/features/lineage/LineageNodeMeta.tsx b/src/renderer/features/lineage/LineageNodeMeta.tsx
index 42dbd09d65..b1de0f4954 100644
--- a/src/renderer/features/lineage/LineageNodeMeta.tsx
+++ b/src/renderer/features/lineage/LineageNodeMeta.tsx
@@ -36 +36 @@ const TAG_CHIP_STYLE = {
-  background: 'rgba(179, 64, 58, 0.08)',
+  background: 'var(--danger-a08)',
@@ -46 +46 @@ const TAG_BOX_STYLE = {
-  border: '1px solid #dfa84a',
+  border: '1px solid var(--node-meta-border)',
diff --git a/src/renderer/features/lineage/LineageSideAiNotes.tsx b/src/renderer/features/lineage/LineageSideAiNotes.tsx
index 53fa4a7fd7..5deb72221b 100644
--- a/src/renderer/features/lineage/LineageSideAiNotes.tsx
+++ b/src/renderer/features/lineage/LineageSideAiNotes.tsx
@@ -34,2 +34,2 @@ const NOTE_CARD = {
-  background: '#ffffff',
-  borderColor: 'rgba(151, 160, 187, 0.28)'
+  background: 'var(--panel)',
+  borderColor: 'var(--note-border)'
diff --git a/src/renderer/features/lineage/LineageSideManualNote.tsx b/src/renderer/features/lineage/LineageSideManualNote.tsx
index d743e0afd5..cd766cdce3 100644
--- a/src/renderer/features/lineage/LineageSideManualNote.tsx
+++ b/src/renderer/features/lineage/LineageSideManualNote.tsx
@@ -24,2 +24,2 @@ const NOTE_CARD = {
-  background: '#ffffff',
-  borderColor: 'rgba(151, 160, 187, 0.28)'
+  background: 'var(--panel)',
+  borderColor: 'var(--note-border)'
diff --git a/src/renderer/features/lineage/LineageSidePanel.tsx b/src/renderer/features/lineage/LineageSidePanel.tsx
index e140f0d4ba..ba6595f67c 100644
--- a/src/renderer/features/lineage/LineageSidePanel.tsx
+++ b/src/renderer/features/lineage/LineageSidePanel.tsx
@@ -101 +101 @@ const SIDE_GLASS: CSSProperties = {
-  background: 'rgba(255, 255, 255, 0.92)',
+  background: 'var(--panel-a92)',
@@ -103 +103 @@ const SIDE_GLASS: CSSProperties = {
-  border: '1px solid #e4ded1',
+  border: '1px solid var(--border)',
diff --git a/src/renderer/features/lineage/LineageSideTags.tsx b/src/renderer/features/lineage/LineageSideTags.tsx
index 14053aca23..92c9a1a7bf 100644
--- a/src/renderer/features/lineage/LineageSideTags.tsx
+++ b/src/renderer/features/lineage/LineageSideTags.tsx
@@ -22,2 +22,2 @@ const SIDE_TAG_CHIP: CSSProperties = {
-  background: 'rgba(179, 64, 58, 0.08)',
-  border: '1px solid rgba(179, 64, 58, 0.25)'
+  background: 'var(--danger-a08)',
+  border: '1px solid var(--danger-a25)'
diff --git a/src/renderer/features/reader/AnnotationEditor.tsx b/src/renderer/features/reader/AnnotationEditor.tsx
index 6d785013ce..8f275a691c 100644
--- a/src/renderer/features/reader/AnnotationEditor.tsx
+++ b/src/renderer/features/reader/AnnotationEditor.tsx
@@ -48 +48 @@ export function AnnotationEditor(props: {
-        boxShadow: '0 2px 12px rgba(0, 0, 0, 0.18)'
+        boxShadow: 'var(--shadow-pop-md)'
@@ -122 +122 @@ export function AnnotationEditor(props: {
-          style={{ background: 'var(--accent)', color: '#ffffff', borderColor: 'var(--accent)' }}
+          style={{ background: 'var(--accent)', color: 'var(--panel)', borderColor: 'var(--accent)' }}
diff --git a/src/renderer/features/reader/PageBox.tsx b/src/renderer/features/reader/PageBox.tsx
index 0ad3471301..e5325f24a7 100644
--- a/src/renderer/features/reader/PageBox.tsx
+++ b/src/renderer/features/reader/PageBox.tsx
@@ -49 +49 @@ export function PageBox(props: {
-      style={{ width: boxWidth, height: pageBoxHeight(size, zoom), background: 'var(--panel)', boxShadow: '0 1px 4px rgba(0,0,0,.12)' }}
+      style={{ width: boxWidth, height: pageBoxHeight(size, zoom), background: 'var(--panel)', boxShadow: 'var(--shadow-page)' }}
@@ -56 +56 @@ export function PageBox(props: {
-          <div className="relative h-fit" style={{ background: '#ffffff', isolation: 'isolate' }}>
+          <div className="relative h-fit" style={{ background: 'var(--panel)', isolation: 'isolate' }}>
diff --git a/src/renderer/features/reader/PdfPageCanvas.tsx b/src/renderer/features/reader/PdfPageCanvas.tsx
index 18ff48f7f6..56d9d66f9e 100644
--- a/src/renderer/features/reader/PdfPageCanvas.tsx
+++ b/src/renderer/features/reader/PdfPageCanvas.tsx
@@ -139 +139 @@ export function PdfPageCanvas(props: {
-        background: 'rgba(255,255,255,0)'
+        background: 'transparent'
diff --git a/src/renderer/features/reader/SelectionToolbar.tsx b/src/renderer/features/reader/SelectionToolbar.tsx
index 6777ce4bef..de031b89fe 100644
--- a/src/renderer/features/reader/SelectionToolbar.tsx
+++ b/src/renderer/features/reader/SelectionToolbar.tsx
@@ -43 +43 @@ export function SelectionToolbar(props: {
-        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
+        boxShadow: 'var(--shadow-pop-sm)'
diff --git a/src/renderer/features/reader/selection-paint.tsx b/src/renderer/features/reader/selection-paint.tsx
index 632b28d2b8..42c151b500 100644
--- a/src/renderer/features/reader/selection-paint.tsx
+++ b/src/renderer/features/reader/selection-paint.tsx
@@ -38 +38 @@ import { PAGE_LAYER_Z } from './page-layer-z'
-const PAINT_BG = 'rgba(0, 0, 0, 0.20)'
+const PAINT_BG = 'var(--reader-selection-paint)'
diff --git a/src/renderer/shared/ui/SplitPane.tsx b/src/renderer/shared/ui/SplitPane.tsx
index 3e2735f307..0f45ba2a1b 100644
--- a/src/renderer/shared/ui/SplitPane.tsx
+++ b/src/renderer/shared/ui/SplitPane.tsx
@@ -175 +175 @@ export function SplitPane(props: {
-      style={{ background: 'linear-gradient(180deg, rgba(201,168,106,.15), rgba(201,168,106,.5), rgba(201,168,106,.15))' }}
+      style={{ background: 'linear-gradient(180deg, var(--border-gold-a15), var(--border-gold-a50), var(--border-gold-a15))' }}

主控裁决 1 背景：PdfPageCanvas render 参数 background rgba(255,255,255,0)
→'transparent'（pdfjs render 参数非 JSX style——不在 B-5 AST 面；alpha 0
渲染零差；像素差分三 lineage 态+reader 态逐字节同实证）。
工单：①13 文件迁移点值等价性（常量对象/内联 style/SVG attr/渐变串）；
②SVG presentation attribute 上 var() 的支持面判断（lineage 白卡 fill/
推断边 stroke——像素差分已证真机渲染零差，请从规范/引擎角度给独立意见）；
③B-5 AST 面外的常量对象/SVG attr 长期防回退缺口评估。输出 [B|W|N]+统计+总评。
