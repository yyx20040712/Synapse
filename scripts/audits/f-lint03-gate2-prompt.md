# F-LINT-03 门二终审（deepseek 位）——四清单+一

你是门二终审官（实证终审）。铁律：只读本文件内材料；唯一可写=终审报告；
禁 npm/test/git。对「说了没改」「申报失实」零容忍——逐条对 diff 核申报。
输出：①处置核对②母本符合度③宪法红线④机器面核对⑤总评，中文全文入档，
总输出 ≤5000 字。

背景：F-LINT-03=B-1 baseline 棘轮 8 组真命中收敛（纯重构票——值与文案
一字不动）。实现=GLM5.3flash 实现者（布局=跨域三组驻新件 shared/ui-
constants.ts+同域五组驻 tags.store/pdf-item-geometry/annotation-style 各
export 单源——合计 8 组全收敛）。门一两轮（Kimi kimi-main 真异构）：
首轮 B1/W4/N3（B-1=新件 diff 缺席[主控 add -N 失误]）→补证轮闭合
（B-1/W-3/W-4 降 N+W-1 转门二核 raw）→**放行附条件三项**：①closeout
verify raw 实物（apply 后 locks:check 311/lint/typecheck/test 1562/build
全绿）②提交尾注 [locked-change] ③ui-constants.ts 正常 add+旧名 grep=0
+chmod 痕迹。门一 N-1 口径澄清（主控）：「8 组真命中之三」=驻新件的三
组，其余五组驻域件——8 组全收敛（实现者报告 §2 文件清单 17 文件全列）。
门一 N-2 import 深度：四文件均 features/<域>/*.tsx 两级结构→'../../
shared' 同构正确，typecheck exit=0 实证。

**收口时序（本审之后执行）**：门二毕→locks:apply（chmod +w baseline
先——unlock/lock 集合不对称缺陷在案另案）→npm run verify raw 真值回读
→[locked-change] 提交（baseline+registry+17 文件+新件+证据件）。

═══ 材料一：门一首轮报告全文 ═══

[routing]: run=20260909233217-frs4 source=kimi-main model=kimi-k3 switches=0 usage=in=8953,out=4308 latency=129592ms (by ds-call.mjs 链)

门一对抗深审报告（仅读本文件；不执行 npm/test/git/仓库）

[B-1] 新单源 `src/renderer/shared/ui-constants.ts` 全量缺席于“全部代码改动 diff”，OP_FAILED/STATUS_POLL_MS/MENU_ITEM_STYLE 的值、导出形态、头注均不可独立核验；而这正是『操作失败』7 处、轮询 2 处、菜单类名 2 处的命根。终态绿证只能旁证存在，不能证明值一字未动。  
证据：材料三无 `diff --git a/src/renderer/shared/ui-constants.ts`；材料四 §2 却列“新增 ui-constants.ts”，且 §2 称 `git diff --stat`=17 files。

[W-1] baseline 已改但受锁闭环未证：票面要求 baseline [locked-change]，本包只见 entries 清空，不见 apply 后绿态/提交尾注；实现者自报“未 apply、locks:check 此刻红”。主控预裁接受绕行，故不定 B，收口必须补证。  
证据：baseline diff entries 8→[]；材料四 §5「未 apply…当前态 locks:check 必红」。

[W-2] btn 组采用 `import { ANNOTATION_BTN_CLASS as btn }`，组件内仍用裸 `btn`；单源值收敛成立，但消费点名未统一到票面新名，后续肉眼/检索仍以局部别名 `btn` 为锚，弱于 ACTION_FAILED→OP_FAILED 的显式改名纪律。实现者已披露“预裁未要求组件内改名”，可接受但建议收口确认。  
证据：AnnotationEditor.tsx @@ -14,0 +15 / AnnotationMenu.tsx @@ -41,2 +41 @@：`ANNOTATION_BTN_CLASS as btn`。

[W-3] 『操作失败』语义一致性只被部分证明：library/reader/settings-zcode 三处 diff 明确是 `ApiClientError ? e.message : ...` 兜底；SettingsPage/UiScale/WorkspaceSection/WorkspaceSwitcher 因同名 OP_FAILED 无引用行 diff，U0 下看不到全部消费上下文，不能排除同文案不同语义被并入。不确定，需补 4 文件使用点上下文。  
证据：SettingsPage/UiScale/WorkspaceSection/WorkspaceSwitcher diff 仅见 `import { OP_FAILED }` 与删本地 `const OP_FAILED`，无 showToast 上下文行。

[W-4] 报告“全部代码改动 diff”与新增件口径冲突：材料三标“全部”，但新增 ui-constants.ts、报告本体不在 diff；若因 untracked 未入 `git diff --stat` 则可解释，但审查包内应内联新件，否则 B-1 永远不可独立复核。  
证据：材料四 §2「新增（2）ui-constants.ts/本报告」「改动（17）」；材料三仅 17 个 tracked diff。

[N-1] 8 组映射与票面布局一致：跨域三组进 shared；TAG_OP_FAILED 驻 tags.store；COLUMN_GAP_* 驻 pdf-item-geometry 且 annotation-anchor 改 import；ANNOTATION_BTN_CLASS 驻 annotation-style。未见多余业务文件改动。  
证据：diff 覆盖 baseline+16 消费/单源件；annotation-anchor @@ -48,0 +51 新 import，pdf-item-geometry @@ -312,4 改 export。

[N-2] 分层/环依赖未见新红线：组件→store 为 TagEditor 并入既有 `tags.store` import；annotation-anchor→pdf-item-geometry 为值依赖，反向 PixelBox 自述 type-only 擦除。该点依赖头注陈述，未全证但无反证。  
证据：TagEditor @@ -23,4 并入 `useTagsStore, TAG_OP_FAILED`；annotation-anchor 头注改「type-only import 编译期擦除」。

[N-3] 棘轮机制保留且清空=全量生效的逻辑自洽；mut2 叙述与“baseline 外新增即红”的判据一致，属有效咬合证据链（raw 未内联全量，按摘要采信为低风险）。  
证据：baseline `_comment` 改「entries 清空=全量关卡生效」；材料四 §3 mut2 「baseline 外新增，exit=1→RESTORED-CLEAN」。

统计：B=1，W=4，N=3。  
总评：建议「暂缓放行/小回炉补证」而非推翻实现。核心不是已证行为变异，而是中央新件 ui-constants.ts 缺席导致“值一字不动”无法在本包内闭环；补齐该件 diff/全文、4 个 OP_FAILED 同名文件消费上下文、locks apply 与 [locked-change] 尾注后，B-1/W-1/W-3 可降级。若主控能当庭出示 ui-constants.ts 内容与 apply 后全链绿证，本票可转放行；unlock/lock 不对称按预裁 4 另案，不卡本票。
═══ 材料二：门一补证轮终裁全文 ═══

[routing]: run=20260909233511-6kta source=kimi-main model=kimi-k3 switches=0 usage=in=1375,out=2907 latency=93109ms (by ds-call.mjs 链)

# F-LINT-03 门一终轮裁决（补证复核）

## 一、逐条降级裁决

### B-1 → **闭合（降 N）**
补证一给出 ui-constants.ts 全文，三常量导出/值/头注现可独立核验：
`export const OP_FAILED = '操作失败'` / `STATUS_POLL_MS = 5000` / `MENU_ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'`。
内部自洽性核查通过：
- 头注消费清单 OP_FAILED×7 文件，与首轮所见「ACTION_FAILED×3+OP_FAILED×4 双名同文案」总数 7 精确吻合（3 旧名+4 新名→统一后 7 消费点）；
- `5000` 与头注「5s 门控轮询」一致；MENU_ITEM_STYLE 全串与头注描述一致。
**残留声明**：文件本体与仓库实物之间无 sha/哈希锚定，「此即实际落盘件」仍为主控陈述——但既有门二收口核对实物兜底，B-1 不再构成阻断。

### W-3 → **闭合**
补证二四文件消费上下文完全同构：
`showToast(e instanceof ApiClientError ? e.message : OP_FAILED, 'error')`（SettingsPage:59 / UiScaleSection:49 / WorkspaceSection:52 / WorkspaceSwitcher:56）。
与首轮已见三处（library/reader/settings-zcode）同语义=ApiClientError 兜底文案，「同文案不同语义被并入」之疑排除。四处均出现在 `e instanceof ApiClientError` 三元分支内，语义唯一，合并正当。

### W-1 → **降级为条件 N（未完全闭合）**
补证三给出的是**收口序申明**而非绿证实物：「门审毕→apply→verify→提交」，apply 后绿态 raw（f-lint03-closeout-verify.raw.txt）此刻仍不存在。原 W-1 要求的「apply 后绿态/提交尾注」**当庭依旧缺席**。
但：该时序本身符合 locks 设计（门审先于 baseline 棘轮更新，否则等于先锁后审），缺陷申报（unlock/lock 集合不对称需 chmod +w）如实。**裁决：不阻断放行，转为门二核对项**——门二必须核 raw 实物含 tickets/locks:check 311 + test 1562 全绿 + [locked-change] 尾注，缺一即回炉。另注：chmod +w 手工步骤为单点失败源，raw 中应见其执行痕迹。

### W-4 → **闭合（降 N）**
主控承认 `add -N` 失误并以补证一补全新增件本体，「全部改动 diff」口径冲突的根源已消除。**残留要求**：收口提交中 ui-constants.ts 须以正常 add 入库（非 intent-to-add 残留），门二核 git 状态确认。

## 二、新发现

**[N-1] 口径微张力——「8 组」两处用法不一。** 头注：「8 组真命中之三……全收敛」（本票收敛 3 组：OP_FAILED/轮询/菜单类名；TAG_OP_FAILED、COLUMN_GAP_*、ANNOTATION_BTN_CLASS 明言驻域件不动）。补证四：「lint:dup-constants 8→0」。若仅 3 组收敛，dup-constants 何以 8→0？合理解释=其余 5 组本为域内单源误报/已自洽，棘轮计数随规则重校归零——**逻辑可通但无 raw 支撑**，归收口绿证核对项，不独立阻断。

**[N-2] import 相对深度同构可疑（不确定）。** 补证二称四文件 import 均为 `'../../shared/ui-constants'`——四文件跨 settings/workspace 不同域，目录深度全同方可成立；若有任一文件嵌套更深（如 sections/ 子层），应为 `'../../../shared'`。grep 实录口径未含文件全路径，无法核验。**不确定，标记**：typecheck/build 在收口 raw 中必然捕获此类错误，故风险外溢可控。

**[N-3] W-2 收口接受 ANNOTATION_BTN_CLASS as btn 别名。** 单源已成立、别名仅为组件内短名，4 处引用少动——同意主控判断，维持 W 级知悉，不升级。

## 三、最终统计

| 条目 | 首轮 | 终轮 |
|---|---|---|
| B-1 | 阻断 | **闭合** |
| W-1 | 警告 | **条件 N**（转门二核 raw） |
| W-3 | 警告 | **闭合** |
| W-4 | 警告 | **闭合** |
| W-2 | 警告 | 维持知悉 |
| N-1/N-2 | — | 新增知悉×2，均挂收口 raw |

阻断项 0；警告残留 0（全部降级）；条件项 1（W-1→门二）；知悉 3。

## 四、终裁：**放行（附条件）**

B-1/W-3/W-4 补证充分闭合，无任何条目持阻断级证据。放行以门二强制核对以下为生效条件：
1. `f-lint03-closeout-verify.raw.txt` 实物——locks:apply 后 locks:check 311 / lint / typecheck / test 1562 / build 全绿 raw；
2. 提交尾注 `[locked-change]`（baseline+registry+证据件）；
3. ui-constants.ts 以正常 add 入库、旧名 grep=0、chmod +w 执行痕迹。

任一缺失→回炉。首轮「暂缓放行」之条件已满足至门一可证范围，余量移交门二实物核对。
═══ 材料三：本票全部代码改动 diff（U0 形态 17 文件）+新件全文 ═══

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
── 新增件全文（untracked 故不在 diff——门一 B-1 补证件）──
/**
 * [F-LINT-03] ui-constants —— 跨域 UI 字面量常量单一出处（B-1 收敛落点）。
 *
 * 收敛前形态=同值常量散布 4 域 7 文件（ACTION_FAILED×3+OP_FAILED×4 双名同文案
 * 『操作失败』）+轮询周期两文件+菜单项类名串跨域两文件——B-1 baseline 棘轮 8 组
 * 真命中之三，2026-09-10 全收敛（值零变，仅声明收敛+引用名统一）。
 *
 * 消费清单：
 * - OP_FAILED：usePaperDetailActions / AiNotesStatus / ZcodeLinkSection /
 *   SettingsPage / UiScaleSection / WorkspaceSection / WorkspaceSwitcher
 *   （意外异常[非 ApiClientError]时的兜底中文消息——toast error 载体；
 *   ACTION_FAILED 旧名退役，统一 OP_FAILED）
 * - STATUS_POLL_MS：AiNotesStatus / ZcodeLinkSection（5s 门控轮询周期
 *   ——组件挂载期间，卸载清 interval，INV-14 成对）
 * - MENU_ITEM_STYLE：LineageNodeMenu / TagLifecycleMenu（fixed 右键菜单
 *   菜单项类名串——两处同型菜单项；原 ITEM_STYLE 旧名退役）
 *
 * 同域单源不驻本件：TAG_OP_FAILED（tags.store）/ COLUMN_GAP_*（pdf-item-
 * geometry）/ ANNOTATION_BTN_CLASS（annotation-style）——域内语义常量驻域件。
 */
/** 意外异常（非 ApiClientError）时的兜底中文消息 */
export const OP_FAILED = '操作失败'
/** 门控轮询周期（组件挂载期间——INV-14 成对清理） */
export const STATUS_POLL_MS = 5000
/** fixed 右键菜单菜单项类名（block 全宽行式菜单项——hover 浮起） */
export const MENU_ITEM_STYLE = 'block w-full rounded px-3 py-1.5 text-left text-xs hover:bg-black/5'

═══ 材料四：实现者报告全文 ═══

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

═══ 材料五：终态绿证摘要（主控复核）═══

- lint:dup-constants：红层 0 组 baseline 待收敛（8→0）+warn 2 组不卡 CI
- test 160 文件/1562 用例与基线零漂移 exit=0（文案保真锚三断言直锁文本）
- typecheck/quality/eslint exit=0（本轮全亲验）
- 变异两支 raw：mut1 文案锚咬合/mut2 全量关卡咬合（exit 序列在档）
- 旧名残留 grep=0（仅注释历史说明）；值对照 baseline 指纹逐字零差

## 门二工单
① **处置核对**：门一两轮 B/W/N 逐条 vs 终态——「说了没改」hunting；
   放行附条件三项的落实路径是否成立（raw 时序=本审后 apply→verify→提交）。
② **母本符合度**：diff+新件 vs 票面 8 组+预裁布局；N-1 口径（8 组=3 新件
   +5 域件）与实现者报告 §2 对账。
③ **宪法红线**：分层单向（组件→store/annotation-anchor→pdf-item-geometry
   方向）；baseline 受锁 [locked-change] 叙事；行数；UTF-8；TDD 证据链
   （红证对照+变异两支+cp 备份还原零残留）。
④ **机器面核对**：1562 零漂移数理；8→0 与 baseline entries[]；mut2「baseline
   外新增即红」判据一致性；typecheck 对 import 路径的实证性。
⑤ **总评**：放行收口 / 回炉（理由+必改清单）。
