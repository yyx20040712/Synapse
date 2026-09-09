# F-LINT-03 门一对抗深审（Kimi 位）——全部材料已内联本文件

你是门一对抗审查员（隔离一审）。铁律：只读本文件内材料；唯一可写=审计报告；
禁 npm/test/git/仓库访问。只报告有代码证据支撑的问题，每条给 file:line 或
代码摘录；不确定的明确说不确定。输出 [B|W|N] 分级逐条+统计+总评，中文全文
入档。**输出纪律**：每条最多 4 行+证据 1 行；总输出 ≤4000 字。

## 材料一：票面（registry F-LINT-03 全文）

F-LINT-03=B-1 baseline 棘轮 8 组真命中收敛（F-LINT-02 立案候选——终裁
「baseline 内打印待收敛放行，收敛子票 F-LINT-03」）。8 组=①ACTION_FAILED×3
+OP_FAILED×4（同文案『操作失败』跨 library/reader/settings/workspaces 4 域
7 文件）②TAG_OP_FAILED（tags 域×2）③COLUMN_GAP_H_FACTOR 1.5+④COLUMN_GAP_
PAGE_RATIO 0.02（reader 域×2）⑤btn 类名串（reader 域×2）⑥STATUS_POLL_MS
5000（reader/settings 跨域×2）⑦ITEM_STYLE 类名串（lineage/tags 跨域×2）。
主控预裁布局：跨域共享驻新件 src/renderer/shared/ui-constants.ts（『操作
失败』统一 OP_FAILED 双名退役+STATUS_POLL_MS+ITEM_STYLE→MENU_ITEM_STYLE
中性名）；同域单源=tags.store.ts export TAG_OP_FAILED/pdf-item-geometry.ts
export COLUMN_GAP_*（annotation-anchor import）/annotation-style.ts export
ANNOTATION_BTN_CLASS（两组件 import）。验收=lint:dup-constants 零待收敛
（8→0）+baseline entries 清空棘轮机制保留+全量 test 绿（既有测试=行为零变
保真锚）+verify 全链。纪律=三屋+baseline 受锁 [locked-change]+重构票无新
行为面（F-A11 拆件先例）。不做面=门审备案四件（B-5 扩展/C-4 token 重复
守卫/COLOR_RE 双写哨兵/消费点语义锚——后续票）。

## 材料二：B-1 关卡判据（check-dup-constants.mjs 头注节选）

红层=同名同值跨 ≥2 文件（跨文件两处即红）；trivial 豁免；文案不豁免
（同名同文案入红；异名同文案 warn）；同文件豁免；AST 归一化（引号/数字
分隔符/1e3/负数剥壳/as const 剥壳；computed key/对象常量/插值模板排除；
收集面=模块级 const）；baseline 棘轮=存量指纹（name+kind+value+文件集）
放行待收敛，新增/漂移 exit 1。

## 材料三：本票全部代码改动 diff（U0 零上下文形态——@@n 行号锚）

diff --git a/scripts/dup-constants.baseline.json b/scripts/dup-constants.baseline.json
index f6d26116e8..0326bc6bdb 100644
--- a/scripts/dup-constants.baseline.json
+++ b/scripts/dup-constants.baseline.json
@@ -2,78 +2,2 @@
-  "_comment": "F-LINT-02 baseline 棘轮（终裁书 f-lint02-design-final.md §3）：存量真命中指纹=name+kind+value+文件集（无行号）。任何变更（收敛删减/漂移）须更新本文件并带 [locked-change] 提交尾注——棘轮位=人类审查。实测 8 组（对拍修正：终裁 §4 预估 6 组漏算了 '操作失败' 组内的 ACTION_FAILED×3/OP_FAILED×4 同名子对，按 §2.3 判据同名同文案跨文件入红层，以 §4『对拍通过为验收』为准）。",
-  "entries": [
-    {
-      "name": "ACTION_FAILED",
-      "kind": "string",
-      "value": "操作失败",
-      "files": [
-        "src/renderer/features/library/usePaperDetailActions.ts",
-        "src/renderer/features/reader/AiNotesStatus.tsx",
-        "src/renderer/features/settings/ZcodeLinkSection.tsx"
-      ]
-    },
-    {
-      "name": "OP_FAILED",
-      "kind": "string",
-      "value": "操作失败",
-      "files": [
-        "src/renderer/features/settings/SettingsPage.tsx",
-        "src/renderer/features/settings/UiScaleSection.tsx",
-        "src/renderer/features/workspaces/WorkspaceSection.tsx",
-        "src/renderer/features/workspaces/WorkspaceSwitcher.tsx"
-      ]
-    },
-    {
-      "name": "COLUMN_GAP_H_FACTOR",
-      "kind": "number",
-      "value": "1.5",
-      "files": [
-        "src/renderer/features/reader/annotation-anchor.ts",
-        "src/renderer/features/reader/pdf-item-geometry.ts"
-      ]
-    },
-    {
-      "name": "COLUMN_GAP_PAGE_RATIO",
-      "kind": "number",
-      "value": "0.02",
-      "files": [
-        "src/renderer/features/reader/annotation-anchor.ts",
-        "src/renderer/features/reader/pdf-item-geometry.ts"
-      ]
-    },
-    {
-      "name": "btn",
-      "kind": "string",
-      "value": "rounded border px-2 py-0.5 text-xs disabled:opacity-50",
-      "files": [
-        "src/renderer/features/reader/AnnotationEditor.tsx",
-        "src/renderer/features/reader/AnnotationMenu.tsx"
-      ]
-    },
-    {
-      "name": "STATUS_POLL_MS",
-      "kind": "number",
-      "value": "5000",
-      "files": [
-        "src/renderer/features/reader/AiNotesStatus.tsx",
-        "src/renderer/features/settings/ZcodeLinkSection.tsx"
-      ]
-    },
-    {
-      "name": "TAG_OP_FAILED",
-      "kind": "string",
-      "value": "标签操作失败",
-      "files": [
-        "src/renderer/features/tags/TagEditor.tsx",
-        "src/renderer/features/tags/tags.store.ts"
-      ]
-    },
-    {
-      "name": "ITEM_STYLE",
-      "kind": "string",
-      "value": "block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5",
-      "files": [
-        "src/renderer/features/lineage/LineageNodeMenu.tsx",
-        "src/renderer/features/tags/TagLifecycleMenu.tsx"
-      ]
-    }
-  ]
+  "_comment": "F-LINT-03 收敛毕 2026-09-10：8 组全收敛 entries 清空=全量关卡生效（新命中即红）。机制保留（F-LINT-02 §3）。",
+  "entries": []
diff --git a/src/renderer/features/library/usePaperDetailActions.ts b/src/renderer/features/library/usePaperDetailActions.ts
index bfedd94762..e7c2ac56c8 100644
--- a/src/renderer/features/library/usePaperDetailActions.ts
+++ b/src/renderer/features/library/usePaperDetailActions.ts
@@ -31,3 +31 @@ import { showToast } from '../../shared/ui/Toast'
-
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const ACTION_FAILED = '操作失败'
+import { OP_FAILED } from '../../shared/ui-constants'
@@ -103 +101 @@ export function usePaperDetailActions(
-        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
+        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
diff --git a/src/renderer/features/lineage/LineageNodeMenu.tsx b/src/renderer/features/lineage/LineageNodeMenu.tsx
index d58d51f97c..4446fa78c5 100644
--- a/src/renderer/features/lineage/LineageNodeMenu.tsx
+++ b/src/renderer/features/lineage/LineageNodeMenu.tsx
@@ -15,0 +16 @@ import type { LineageEdge, LineageNode } from '@shared/models/lineage'
+import { MENU_ITEM_STYLE } from '../../shared/ui-constants'
@@ -42,2 +42,0 @@ export interface LineageNodeMenuProps {
-const ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'
-
@@ -63 +62 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onLinkTo(node.id)}>
+        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onLinkTo(node.id)}>
@@ -66 +65 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onReparent(node.id)}>
+        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onReparent(node.id)}>
@@ -73 +72 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-          className={ITEM_STYLE}
+          className={MENU_ITEM_STYLE}
@@ -80 +79 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onLinkManualParent(node.id)}>
+        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onLinkManualParent(node.id)}>
@@ -87 +86 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-            className={ITEM_STYLE}
+            className={MENU_ITEM_STYLE}
@@ -94 +93 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onEditIdea(node.id)}>
+        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onEditIdea(node.id)}>
@@ -97 +96 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-        <button type="button" role="menuitem" className={ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onAddTag(node.id)}>
+        <button type="button" role="menuitem" className={MENU_ITEM_STYLE} style={{ color: 'var(--text)' }} onClick={() => props.onAddTag(node.id)}>
@@ -104 +103 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-            className={ITEM_STYLE}
+            className={MENU_ITEM_STYLE}
@@ -114 +113 @@ export function LineageNodeMenu(props: LineageNodeMenuProps): JSX.Element {
-          className={ITEM_STYLE}
+          className={MENU_ITEM_STYLE}
diff --git a/src/renderer/features/reader/AiNotesStatus.tsx b/src/renderer/features/reader/AiNotesStatus.tsx
index 8cdb50e01a..e7a7c52846 100644
--- a/src/renderer/features/reader/AiNotesStatus.tsx
+++ b/src/renderer/features/reader/AiNotesStatus.tsx
@@ -14,2 +14,2 @@
- *   卸载清 interval，INV-14 成对同族；轮询常量仍为本域私有——Rule of Three
- *   第 2 次保持重复，第 3 处出现时抽 shared）
+ *   卸载清 interval，INV-14 成对同族；轮询常量 [F-LINT-03] 已抽
+ *   shared/ui-constants 与 ZcodeLinkSection 同源）
@@ -31,0 +32 @@ import { showToast } from '../../shared/ui/Toast'
+import { OP_FAILED, STATUS_POLL_MS } from '../../shared/ui-constants'
@@ -35,2 +35,0 @@ import { derivePhase } from './ai-notes-phase'
-/** 轮询周期（组件域私有——头注行为层声明） */
-const STATUS_POLL_MS = 5000
@@ -39,2 +37,0 @@ const POLL_FAIL_THRESHOLD = 3
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const ACTION_FAILED = '操作失败'
@@ -101 +98 @@ export function AiNotesStatus(props: { paperId: string; hasNotes: boolean }): JS
-        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
+        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
@@ -118 +115 @@ export function AiNotesStatus(props: { paperId: string; hasNotes: boolean }): JS
-        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
+        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
diff --git a/src/renderer/features/reader/AnnotationEditor.tsx b/src/renderer/features/reader/AnnotationEditor.tsx
index 8f275a691c..9f602576fe 100644
--- a/src/renderer/features/reader/AnnotationEditor.tsx
+++ b/src/renderer/features/reader/AnnotationEditor.tsx
@@ -14,0 +15 @@ import type { Annotation, AnnotationRect } from '@shared/models/annotation'
+import { ANNOTATION_BTN_CLASS as btn } from './annotation-style'
@@ -17,2 +17,0 @@ import { useAnnotationDraft } from './use-annotation-draft'
-const btn = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'
-
diff --git a/src/renderer/features/reader/AnnotationMenu.tsx b/src/renderer/features/reader/AnnotationMenu.tsx
index 1e869523e7..a3a1b7c59d 100644
--- a/src/renderer/features/reader/AnnotationMenu.tsx
+++ b/src/renderer/features/reader/AnnotationMenu.tsx
@@ -41,2 +41 @@ import type { Annotation, AnnotationRect } from '@shared/models/annotation'
-
-const btn = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'
+import { ANNOTATION_BTN_CLASS as btn } from './annotation-style'
diff --git a/src/renderer/features/reader/annotation-anchor.ts b/src/renderer/features/reader/annotation-anchor.ts
index 09e7bb7519..7e3d3fd26d 100644
--- a/src/renderer/features/reader/annotation-anchor.ts
+++ b/src/renderer/features/reader/annotation-anchor.ts
@@ -37 +37,3 @@
- *   单向 anchor-serialize→本模块→annotation-merge，零环）
+ *   单向 anchor-serialize→本模块→annotation-merge；[F-LINT-03] 本模块另值
+ *   import pdf-item-geometry 的 COLUMN_GAP_*（其对 PixelBox 为 type-only
+ *   import 编译期擦除——运行时单向，零值环）
@@ -48,0 +51 @@ import { mergeRects } from './annotation-merge'
+import { COLUMN_GAP_H_FACTOR, COLUMN_GAP_PAGE_RATIO } from './pdf-item-geometry'
@@ -271,3 +274,2 @@ const Y_OVERLAP_RATIO_MIN = 0.25
-/** 簇内 x 大间隙断段阈值：max(1.5×主导矩形高, 页宽 2%)——防多栏/大缩进桥接成一个矩形 */
-const COLUMN_GAP_H_FACTOR = 1.5
-const COLUMN_GAP_PAGE_RATIO = 0.02
+// 簇内 x 大间隙断段阈值（[F-LINT-03] 单源驻 pdf-item-geometry——max(1.5×主导
+// 矩形高, 页宽 2%) 防多栏/大缩进桥接成一个矩形；本地同值声明退役）
diff --git a/src/renderer/features/reader/annotation-style.ts b/src/renderer/features/reader/annotation-style.ts
index 092f3e2abf..7429c00056 100644
--- a/src/renderer/features/reader/annotation-style.ts
+++ b/src/renderer/features/reader/annotation-style.ts
@@ -27,0 +28,4 @@ export const COLOR_LABEL: Record<AnnotationColor, string> = {
+/** 标注弹层小按钮类名串（[F-LINT-03] reader 域单源——AnnotationEditor/
+ *  AnnotationMenu 两处同值本地声明退役；同一视觉元件族：弹层内动作小按钮） */
+export const ANNOTATION_BTN_CLASS = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'
+
diff --git a/src/renderer/features/reader/pdf-item-geometry.ts b/src/renderer/features/reader/pdf-item-geometry.ts
index 7e1c6c1fd5..c3ab47b0b0 100644
--- a/src/renderer/features/reader/pdf-item-geometry.ts
+++ b/src/renderer/features/reader/pdf-item-geometry.ts
@@ -312,4 +312,4 @@ export function itemRects(
-/** 簇内 x 大间隙断段阈值（与 annotation-anchor 私有常量同值——跨件私有常量，
- *  值域契约由两处测试锚定；Rule of Three 第 2 次保持重复） */
-const COLUMN_GAP_H_FACTOR = 1.5
-const COLUMN_GAP_PAGE_RATIO = 0.02
+/** 簇内 x 大间隙断段阈值（[F-LINT-03] reader 几何单源——annotation-anchor
+ *  同值本地声明退役改 import；值域契约由两处测试锚定不变） */
+export const COLUMN_GAP_H_FACTOR = 1.5
+export const COLUMN_GAP_PAGE_RATIO = 0.02
diff --git a/src/renderer/features/settings/SettingsPage.tsx b/src/renderer/features/settings/SettingsPage.tsx
index c7e1abf52c..f7e729e017 100644
--- a/src/renderer/features/settings/SettingsPage.tsx
+++ b/src/renderer/features/settings/SettingsPage.tsx
@@ -25,0 +26 @@ import { showToast } from '../../shared/ui/Toast'
+import { OP_FAILED } from '../../shared/ui-constants'
@@ -33,2 +33,0 @@ import type { AppSettings } from '@shared/ipc/schemas'
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const OP_FAILED = '操作失败'
diff --git a/src/renderer/features/settings/UiScaleSection.tsx b/src/renderer/features/settings/UiScaleSection.tsx
index 6da7b8fb8a..b9387329cc 100644
--- a/src/renderer/features/settings/UiScaleSection.tsx
+++ b/src/renderer/features/settings/UiScaleSection.tsx
@@ -28,0 +29 @@ import { showToast } from '../../shared/ui/Toast'
+import { OP_FAILED } from '../../shared/ui-constants'
@@ -32,3 +32,0 @@ import { SettingsSection } from './SettingsSection'
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const OP_FAILED = '操作失败'
-
diff --git a/src/renderer/features/settings/ZcodeLinkSection.tsx b/src/renderer/features/settings/ZcodeLinkSection.tsx
index 820f9b12b4..6b7f7bd69d 100644
--- a/src/renderer/features/settings/ZcodeLinkSection.tsx
+++ b/src/renderer/features/settings/ZcodeLinkSection.tsx
@@ -25,0 +26 @@ import { showToast } from '../../shared/ui/Toast'
+import { OP_FAILED, STATUS_POLL_MS } from '../../shared/ui-constants'
@@ -28,5 +28,0 @@ import type { ZcodeLinkDetectRes } from '@shared/ipc/schemas'
-/** 轮询周期（组件域私有——Rule of Three 第 2 次保持重复；第 3 处出现时抽 shared） */
-const STATUS_POLL_MS = 5000
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const ACTION_FAILED = '操作失败'
-
@@ -76 +72 @@ export function ZcodeLinkSection(): JSX.Element {
-        showToast(e instanceof ApiClientError ? e.message : ACTION_FAILED, 'error')
+        showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')
diff --git a/src/renderer/features/tags/TagEditor.tsx b/src/renderer/features/tags/TagEditor.tsx
index dbff14764c..c8d060938e 100644
--- a/src/renderer/features/tags/TagEditor.tsx
+++ b/src/renderer/features/tags/TagEditor.tsx
@@ -23,4 +23 @@ import { showToast } from '../../shared/ui/Toast'
-import { useTagsStore } from './tags.store'
-
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const TAG_OP_FAILED = '标签操作失败'
+import { useTagsStore, TAG_OP_FAILED } from './tags.store'
diff --git a/src/renderer/features/tags/TagLifecycleMenu.tsx b/src/renderer/features/tags/TagLifecycleMenu.tsx
index f7c30c0dff..0dc6c24cc8 100644
--- a/src/renderer/features/tags/TagLifecycleMenu.tsx
+++ b/src/renderer/features/tags/TagLifecycleMenu.tsx
@@ -9,0 +10 @@ import { useEffect } from 'react'
+import { MENU_ITEM_STYLE } from '../../shared/ui-constants'
@@ -12,2 +12,0 @@ import type { TagWithCount } from './tags.store'
-const ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'
-
@@ -54 +53 @@ export function TagLifecycleMenu(props: {
-          className={ITEM_STYLE}
+          className={MENU_ITEM_STYLE}
@@ -63 +62 @@ export function TagLifecycleMenu(props: {
-          className={`${ITEM_STYLE} disabled:opacity-50`}
+          className={`${MENU_ITEM_STYLE} disabled:opacity-50`}
@@ -73 +72 @@ export function TagLifecycleMenu(props: {
-          className={ITEM_STYLE}
+          className={MENU_ITEM_STYLE}
diff --git a/src/renderer/features/tags/tags.store.ts b/src/renderer/features/tags/tags.store.ts
index f516513c40..e2a0c19b80 100644
--- a/src/renderer/features/tags/tags.store.ts
+++ b/src/renderer/features/tags/tags.store.ts
@@ -40,2 +40,3 @@ export type TagsMutationResult = { ok: true } | { ok: false; error: AppError }
-/** 意外异常（非 ApiClientError）时的兜底中文消息 */
-const TAG_OP_FAILED = '标签操作失败'
+/** 意外异常（非 ApiClientError）时的兜底中文消息（[F-LINT-03] tags 域单源
+ *  ——TagEditor 同文案本地声明退役，组件→store import） */
+export const TAG_OP_FAILED = '标签操作失败'
diff --git a/src/renderer/features/workspaces/WorkspaceSection.tsx b/src/renderer/features/workspaces/WorkspaceSection.tsx
index d5bdeb40d8..9e85eafcd1 100644
--- a/src/renderer/features/workspaces/WorkspaceSection.tsx
+++ b/src/renderer/features/workspaces/WorkspaceSection.tsx
@@ -23,0 +24 @@ import { showToast } from '../../shared/ui/Toast'
+import { OP_FAILED } from '../../shared/ui-constants'
@@ -26,2 +26,0 @@ import { useWorkspaceStore } from './workspace.store'
-const OP_FAILED = '操作失败'
-
diff --git a/src/renderer/features/workspaces/WorkspaceSwitcher.tsx b/src/renderer/features/workspaces/WorkspaceSwitcher.tsx
index 1491e533d0..91cd0fa1d4 100644
--- a/src/renderer/features/workspaces/WorkspaceSwitcher.tsx
+++ b/src/renderer/features/workspaces/WorkspaceSwitcher.tsx
@@ -31,0 +32 @@ import { showToast } from '../../shared/ui/Toast'
+import { OP_FAILED } from '../../shared/ui-constants'
@@ -35,2 +35,0 @@ import './workspace.css'
-const OP_FAILED = '操作失败'
-

## 材料四：实现者报告全文

# F-LINT-03 实现报告（B-1 baseline 棘轮 8 组真命中收敛）

- 实现者：F-LINT-03 实现者子代理（GLM5.3flash 统一档）
- 日期：2026-09-10
- 票面：tickets/registry.ts:255（F-LINT-03，open）
- 性质：纯重构票，行为零变——值与文案一字不动，仅「声明收敛+引用名统一」

## 1. 实现摘要

B-1 baseline 棘轮登记的 8 组跨文件同值双常量全部收敛：跨域三组（『操作失败』
双名 7 文件组 / STATUS_POLL_MS / ITEM_STYLE 类名串）统一驻新件
`src/renderer/shared/ui-constants.ts`（双名退役统一 OP_FAILED、ITEM_STYLE
中性名 MENU_ITEM_STYLE）；同域三组驻域件单源（TAG_OP_FAILED→tags.store.ts
export、COLUMN_GAP_*→pdf-item-geometry.ts export、btn→annotation-style.ts
export ANNOTATION_BTN_CLASS）。baseline entries 清空（8→0）=全量关卡生效。
`npm run lint:dup-constants` 验收：零待收敛+零新增红，exit=0。

## 2. 文件清单

### 新增（2）
- `src/renderer/shared/ui-constants.ts`——跨域 UI 字面量常量单一出处
  （OP_FAILED / STATUS_POLL_MS / MENU_ITEM_STYLE，头注含消费清单）
- 本报告

### 改动（17）
| 文件 | 改动 |
| --- | --- |
| `scripts/dup-constants.baseline.json` | entries 8→[]；_comment 按主控预裁 3 文本更新 |
| `src/renderer/features/library/usePaperDetailActions.ts` | 删本地 ACTION_FAILED+注释→import OP_FAILED；引用 1 处改名 |
| `src/renderer/features/reader/AiNotesStatus.tsx` | 删本地 ACTION_FAILED/STATUS_POLL_MS→import；引用 3 处改名；头注「本域私有」声明同步 |
| `src/renderer/features/settings/ZcodeLinkSection.tsx` | 同上双常量删→import；引用 1 处改名 |
| `src/renderer/features/settings/SettingsPage.tsx` | 删本地 OP_FAILED+注释→import |
| `src/renderer/features/settings/UiScaleSection.tsx` | 同上 |
| `src/renderer/features/workspaces/WorkspaceSection.tsx` | 删裸声明→import |
| `src/renderer/features/workspaces/WorkspaceSwitcher.tsx` | 同上 |
| `src/renderer/features/tags/TagEditor.tsx` | 删本地 TAG_OP_FAILED→并入既有 tags.store import |
| `src/renderer/features/tags/tags.store.ts` | TAG_OP_FAILED export 化+单源注释 |
| `src/renderer/features/reader/annotation-anchor.ts` | 删本地两 COLUMN_GAP_*→新 import 行 from pdf-item-geometry（该文件原无此 import 故新加非并入）；头注「零环」声明同步 |
| `src/renderer/features/reader/pdf-item-geometry.ts` | 两常量 export 化+单源注释 |
| `src/renderer/features/reader/AnnotationEditor.tsx` | 删本地 btn→import ANNOTATION_BTN_CLASS as btn |
| `src/renderer/features/reader/AnnotationMenu.tsx` | 同上 |
| `src/renderer/features/reader/annotation-style.ts` | 新增 export ANNOTATION_BTN_CLASS（域单源） |
| `src/renderer/features/lineage/LineageNodeMenu.tsx` | 删本地 ITEM_STYLE→import MENU_ITEM_STYLE；引用 10 处改名 |
| `src/renderer/features/tags/TagLifecycleMenu.tsx` | 同上（含模板串 `${MENU_ITEM_STYLE} disabled:opacity-50`） |

`git diff --stat`：17 files，+49/−139——零蔓延（F-CSS-03 两个遗留未跟踪件
非本票面未触碰）。

## 3. 红证+变异索引（scripts/audits/ 下 raw 件）

| raw | 关键行 | 结论 |
| --- | --- | --- |
| `f-lint03-before.raw.txt` | 「红层 8 组 baseline 待收敛」逐组列名+文件集；exit=0 | 收敛前态在档 |
| `f-lint03-after.raw.txt` | 「红层 0 组 baseline 待收敛 / warn 2 组」；扫描 216 文件/131 声明；exit=0 | 8→0+零新增红；『操作失败』warn 组（7 声明/7 文件）随收敛消失 |
| `f-lint03-mut1.raw.txt` | `Tests 1 failed | 15 passed (16)`：zcode-link-section.test.tsx:272 断言 expected `'操作失败'` actual `'操作失败X'`，exit=1 → RESTORED-CLEAN → `Tests 16 passed`，exit=0 | 文案保真锚咬合（改一字即红） |
| `f-lint03-mut2.raw.txt` | `[红] OP_FAILED = '操作失败' 跨 2 文件（LineageNodeMenu.tsx, ui-constants.ts）——baseline 外新增`，exit=1 → RESTORED-CLEAN → 检查通过，exit=0 | baseline 清空后全量关卡咬合（回归即红） |

mut1/mut2 均用 cp 备份法（变异→红→cp 还原→diff 确认空→复绿→备份删除，
零残留）。

## 4. 测试证据

| raw | 结果 |
| --- | --- |
| `f-lint03-test.raw.txt` | `Test Files 160 passed (160)` / `Tests 1562 passed (1562)`，exit=0——与基线 160/1562 **零漂移** |
| `f-lint03-typecheck.raw.txt` | exit=0 |
| `f-lint03-quality.raw.txt` | 「dup-constants：红层 0 组、新增 0 组、warn 2 组」+「quality 检查通过」，exit=0 |
| `f-lint03-lint.raw.txt`（指令外补充） | eslint exit=0（新文件+import 面自检） |

npm run test 用 `npm run test -- <file>` 跑定向（sqlite-abi 前置保留，非裸
vitest）；全量走 `npm run test` 原样。

## 5. locks 实录

- `npm run locks:unlock` 已跑（「已解锁 310 个文件」）——**但 baseline 仍
  只读**，见 §6-1 缺陷；对 `scripts/dup-constants.baseline.json` 单文件手动
  清只读位后改写（等价 unlock 本应覆盖的动作；locks:apply 的先解锁段幂等，
  不破坏机制）。
- baseline 改动=entries 清空+_comment 更新（预裁 3 逐字）。
- **未 apply**（主控收口统一）——当前态 `locks:check` 必红（manifest 仍为
  旧 sha），属已知中间态。
- 新文件 `src/renderer/shared/ui-constants.ts` 在 src/renderer 下，不在
  lock-protected.ps1 Get-ProtectedFiles 收集面（该面=tests/src/shared/
  src/main/db/migrations/*.test/8 配置+baseline/scripts mjs+ps1），无需
  locks 动作。

## 6. 自裁申报

### 预裁 1-5 逐条照办情况
1. ui-constants.ts 三常量（OP_FAILED/STATUS_POLL_MS/MENU_ITEM_STYLE）
   ——照办；头注一段+各常量 doc 注释（语义注释从消费处搬入）。
2. 同域单源三处——照办；btn 语义一致性核对通过（两组件均为标注弹层内
   动作小按钮族=同一视觉元件）；annotation-anchor 原无 pdf-item-geometry
   import 故按预裁附注「新加 import 行」（无既有语句可并入）。
3. baseline 清空——照办（entries:[]+_comment 预裁文本逐字）；未 apply。
4. 消费文件改动形态——照办（删声明+注释搬/删+import 按各文件既有风格
   插入+引用名替换；值与文案一字不动，test 1562 全绿佐证保真）。
5. 不做面——check-dup-constants.mjs 本体零改、门审备案四件零触碰、
   tickets/registry 零触碰、git 零操作。

### 超出「搬声明+改引用名」的改动逐条列（全为注释级，行为零变）
1. AnnotationEditor/AnnotationMenu 用 `import { ANNOTATION_BTN_CLASS as
   btn }` 别名——组件内 btn 引用（5/4 处）零改动、diff 最小；预裁仅要求
   「两组件 import」未要求组件内改名（与 ACTION_FAILED→OP_FAILED 的显式
   改名要求不同）。
2. AiNotesStatus.tsx 头注行为层「轮询常量仍为本域私有——Rule of Three
   第 2 次保持重复，第 3 处出现时抽 shared」声明失效→同步为「已抽
   shared/ui-constants 与 ZcodeLinkSection 同源」（接缝归责：头注与新
   事实互斥必须改）。
3. annotation-anchor.ts 头注架构层「依赖单向……零环」声明补 type-only
   import 说明（pdf-item-geometry→本件的 PixelBox 为 type import 编译期
   擦除，值依赖单向 annotation-anchor→pdf-item-geometry，运行时零环）。
4. pdf-item-geometry.ts 原「跨件私有常量，Rule of Three 第 2 次保持重复」
   注释→更新为单源声明；annotation-anchor 本地声明处留一行断段公式语义
   注释指向单源。
5. tags.store.ts/annotation-style.ts 单源处各加一句单源注释。
6. ZcodeLinkSection 原「轮询周期（组件域私有——Rule of Three 第 2 次
   保持重复…）」注释随声明删除（语义已由 ui-constants 头注承载）。

## 7. 疑虑（供主控/门审）

1. **unlock/lock 脚本集合不对称缺陷（建议后续票）**：
   `scripts/lock-protected.ps1:21` 的 Get-ProtectedFiles 显式含
   `'scripts/dup-constants.baseline.json'`，而 `scripts/unlock-protected.ps1`
   的同构收集面没有它（只收 scripts/*.mjs/*.ps1+tests/src/shared/migrations/
   *.test/8 配置）——`npm run locks:unlock` 永远解不开 baseline 只读位。
   本次单文件手动绕行；两脚本收集逻辑重复维护，建议收敛单源或同步。两脚本
   均为受锁件，本票未动它们。
2. 过程事故两起（均已零残留还原）：①mut1 首次变异用 PowerShell
   Set-Content 写出 GBK 乱码——cp 备份即时还原（diff 空）后改用 Edit 工具
   完成变异（Windows 中文写文件工具选择教训复现实证）；②LineageNodeMenu
   一次 Edit 误吞换行——cp 备份还原后重做。
3. 中间态声明：locks 未 apply（预裁 3），`locks:check` 此刻红=已知；
   主控收口 apply 后 verify 全链预期绿（quality/typecheck/lint/test 四面
   本票已单独全绿）。

## 8. 技能清点（开工纪律留档）

- test-driven-development：用（红证+变异红证四支全落 raw）
- verification-before-completion：用（终态绿证四件+exit 真值）
- systematic-debugging：用（unlock 不生效→脚本集合对比定位根因）
- subagent-driven-development：不用（本人即实现者，无再派发）
- browser/webapp 测试类：不用（纯常量搬运零视觉面）
- git 类：不用（实现者禁 git 操作）

## 材料五：终态绿证摘要（主控复核）

- lint:dup-constants：红层 0 组 baseline 待收敛（8→0）+warn 2 组不卡 CI
- test 160 文件/1562 用例与基线零漂移 exit=0（文案保真锚=zcode-link-section
  .test.tsx:272 + ai-notes-section.test.tsx:386/398 三断言直锁『操作失败』
  文本——与常量名无关）
- typecheck/quality/eslint exit=0
- 变异两支：mut1 文案锚咬合（OP_FAILED 改一字→定向测试红→还原绿）+mut2
  全量关卡咬合（植入同名同值本地 const→lint:dup-constants 红→还原绿）
- locks：baseline unlock 态（lock/unlock 脚本集合不对称——unlock 收集面
  漏 baseline json，实现者单文件手动清只读——已报异常项；主控收口 apply）

## 主控已预裁项（可攻击但推翻需更强依据）
1. 布局三件套+命名（OP_FAILED 统一/MENU_ITEM_STYLE/ANNOTATION_BTN_CLASS）。
2. 值与文案一字不动是命根——任何值面变化=回炉。
3. baseline entries 清空但机制保留（空=全量生效）。
4. unlock/lock 不对称=基础设施缺陷另案——本票绕行可接受（如实申报）。

## 工单 A~E
A **母本符合度**：diff vs 票面 8 组+预裁布局——遗漏组/多余改动/未收敛残留。
B **宪法红线**：分层单向（组件→store 方向/shared 摆位）；受锁面 baseline
   [locked-change]；行数 ≤500；UTF-8；死代码（旧声明删净/注释误导）。
C **重构质量**：import 形态一致性；注释搬迁语义保真；『操作失败』7 消费处
   上下文语义一致性（误收敛语义不同的同文案会埋雷）；COLUMN_GAP_* 收敛后
   使用方向合理性。
D **报告诚实性**：自裁申报逐条对 diff 核；两起过程事故（GBK/Edit 吞换行）
   还原零残留声明可信度；红证/变异 raw 与叙述一致。
E **接缝与后续单**：unlock/lock 不对称立案建议；B-2 副产物 66 处未 export
   常量观察。

## 输出格式
逐条 [B|W|N]+证据→统计→总评（放行/回炉建议+理由）。
