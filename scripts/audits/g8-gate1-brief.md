# F-GEOM-01-G8 门一审包（隔离对抗审——自包含，零仓库访问）

> 岗位：门一 gate1-reviewer（ops-gate1-k2 绑定，kimi k3 $max，zipoo 源——用户指令 2026-09-18 起 k1 周额度封顶 k2 承载）。
> 票面：F-GEOM-01-G8 目录化 M5=panels/ 域迁移，**零行为纯迁移**，[locked-change][test-refactor]。
> 实现者：ops-executor（GLM5.3flash $max）；主控：GLM5.3 max（派发+侦察+本包组装）。

## ① 任务书要点（审计基准=主控六段简报，G4-G7 同构）

8 文件 reader/ → reader/panels/（git mv 保 rename）：OutlineAside/OutlinePanel/OutlineThumb/ReaderNotesPanel/AiNotesSection/AiNoteGroupList/AiNotesStatus/FragmentNotesList。
- **A 段深修恰 21 行**（迁移前行号）：OutlineAside :46/:49/:50；OutlinePanel :22；OutlineThumb :6；ReaderNotesPanel :47/:48/:49/:52/:55；AiNotesSection :50/:53/:54/:55；AiNoteGroupList :37；AiNotesStatus :30/:31/:32/:33/:34；FragmentNotesList :12
- **B 段 src 入边恰 1**：ReaderPageView.tsx:35 './OutlineAside'→'./panels/OutlineAside'
- **C 段 tests 受锁 5 行/4 件**：ai-note-collapse.test:16 / ai-notes-section.test:48 / reader-notes-panel.test:23+:24 / outline-aside.test:18
- **D 段跨特性**：零（lineage 命中系注释组件名提名非 import——主控 fullscan2 实测）
- **E 段 config 恰 1 行**：check-quality.mjs:97 COMPOSITION_ROOT_ALLOW 键路径（票面「96-97 两路径」实勘勘正=单行 :97）
- **F 段 registry 随迁 6 行**（status 零触碰）：SR-RDR-08/SR2-C-03/SR2-C-04/SR2-AI-08/SR2-AI-11/F-GEOM-01-G8 自身
- **G 段字符串面**：readFileSync 形态全仓 0 命中（板注预扫义务前置兑现）；baseline.json 命中全为用例标题禁触碰；e2e/docs/dist_new 零动作

主控派发前侦察（入边五形态全表 13 行）：域内互引 7（OutlinePanel:23→OutlineThumb；AiNotesSection:51/:52；OutlineAside:47/:48；ReaderNotesPanel:53/:54）+src 消费 1（ReaderPageView:35）+tests 5 行/4 件+scripts/其他域 0。

## ② 实现者申报（对抗拷问对象——报告全文见 ⑤ 附）

- 七关卡全绿：typecheck EXIT=0/lint EXIT=0/unit 170/1744 基线零漂移/build EXIT=0+产物同名同尺寸（index-D3egZtl2.js 1,392.72kB sha256 9c3b8b84…3f2a / index-BfpEygSE.css 52.49kB sha256 dcace2e7…8a97d5）/指纹门 187·1789·5411·skip15 零漂移/locks:check 359 一致/verify 全链 G8_IMPL_VERIFY_EXIT=0
- 变异红证 M1：ReaderPageView:35 回退→typecheck TS2307 EXIT=2（恰中 :35）→cp 还原（M1_RESTORE_EXIT=0）→diff 空→复绿 EXIT=0
- 变异红证 M2：outline-aside.test:18 回退旧径→定向 vitest EXIT=1（Failed to resolve import '../../../src/renderer/features/reader/OutlineAside'）→还原（EXIT=0）→复锁（M2_RELOCK_EXIT=0）→复绿 4 passed/4→终态 locks:check EXIT=0
- §3.1 探针（g8-s31-check）：panels→anchors 4 边+panels→state 10 边=14（与主控预判逐边对上）；反向边 0；全仓旧径残留 0；S31_FINAL_PASS=true
- 中探针：C 面待改时点 typecheck EXIT=2 恰 5 错全 tests 面、src 面 0 错（A+B 段先行闭合的独立实证）
- panels 回归定向：4 文件/41 用例绿 EXIT=0
- numstat 实测：A=21（3/1/1/5/4/1/5/1）+B 1+C 5+E 1+F 6=34 行；8 rename 全识别（相似度 99%）
- wc -l 八件各 -1（设计书 §3.2 口径=无尾换行计数）→登记 G11 对账债（G5/G6/G7 同口径先例）
- 自裁 6 条：①自产探针 g8-s31-check.mjs 独立成件（lint+locks 同批，358→359）②额外证据件 g8-impl-midprobe.log ③wc -l -1 G11 债登记 ④E 段票面勘误备案 ⑤registry diff 逐行目验 status 零变（grep 计数 38 系上下文行假象）⑥开工前遗留态申报（relay.md M+manifest 主控探针两件）

## ③ 基线/终态对账数字（主控亲跑+复核）

| 指标 | 基线（迁移前） | 终态（实现者跑+主控将终跑） |
| --- | --- | --- |
| verify | G8_BASELINE_VERIFY_EXIT=0 | G8_IMPL_VERIFY_EXIT=0 |
| 工单 | 206 票 open 13 | 同（G8 翻 done 归主控收口） |
| locks | 358 | 359（+1=g8-s31-check.mjs 探针入锁） |
| unit | 170 文件/1744 用例 | 170/1744 零漂移 |
| 指纹门 | 187 files/1789 cases/5411 assertions/skip15 | 同值零漂移（exemptions 2/2/0） |
| build 产物 | index-D3egZtl2.js 1,392.72kB + index-BfpEygSE.css 52.49kB | 同名同尺寸（G5-G7 恒等链延续） |

## ④ 审计指令（对抗式）

1. **逐 hunk 零行为断言**：⑤ 附 patch 每个 +/- 行是否纯路径/相对深度改写？有无任何语义变化（含隐藏面：import 顺序/类型导出形式/注释）？
2. **计数数学独立复算**：A 段 21=3+1+1+5+4+1+5+1？C 段 5=1+1+1+2？F 段 6 对 ±？patch 中 import 行改写数与申报逐项对上？（G6 W1/G7 W1 誊录失实族检查）
3. **§3.1 方向性**：patch 改写能否独立推出 panels→{anchors,state} 出边形态？域内互引 7 边零改（patch 不出现即证）？反向边 0 的证明力评估（typecheck+grep 探针双证）。
4. **完整性反面拷问**：若存在未改写的消费面，typecheck EXIT=0+unit 1744 全绿是否足以证明闭合？残留扫描探针（FACE3 residue=0）覆盖形态是否完备（绝对/相对/vi.mock）？
5. **G 段零动作核对**：指纹门零漂移对「baseline.json 零触碰」的证明力；字符串面 0 命中与板注预判（theme.test 零命中）的互证。
6. **自裁 6 条逐条裁决**（充分/不足+理由）。
7. e2e 不跑口径（零行为迁移——G1-G7 同裁，义务归 G11 收官）认可与否。

**输出格式**：B（阻断）/W（警告）/N（注记）分级发现+逐条证据；结尾一行 `VERDICT: PASS | PASS_WITH_WARNINGS | FAIL`。发现须引用 patch 行文为证，禁泛断言。

## ⑤ 附 A：diff patch 全文（git diff HEAD -M，src/tests/config 三域；registry 巨行裁展见附 B；manifest 358→359 机械面不入包）
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index 5a47746636..e6cefccb32 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -94,7 +94,7 @@ const COMPOSITION_ROOT_ALLOW = new Map([
   ['src/renderer/features/library/PaperDetailPanel.tsx', ['tags/TagEditor']],
   ['src/renderer/features/library/FilterBar.tsx', ['tags/TagFilter']],
   ['src/renderer/features/reader/state/tab-dirty.ts', ['notes/notes.store']],
-  ['src/renderer/features/reader/ReaderNotesPanel.tsx', ['notes/notes.store']],
+  ['src/renderer/features/reader/panels/ReaderNotesPanel.tsx', ['notes/notes.store']],
   ['src/renderer/features/settings/useExportCorpusEvents.ts', ['reader/state/CorpusExtractor']],
   ['src/renderer/features/lineage/LineageSideAiNotes.tsx', ['reader/anchors/ai-note-style']],
   ['src/renderer/features/workspaces/workspace.store.ts', ['notes/notes.store']]
diff --git a/src/renderer/features/reader/ReaderPageView.tsx b/src/renderer/features/reader/ReaderPageView.tsx
index 96299d5034..428f7a0ceb 100644
--- a/src/renderer/features/reader/ReaderPageView.tsx
+++ b/src/renderer/features/reader/ReaderPageView.tsx
@@ -32,7 +32,7 @@ import type { Annotation } from '@shared/models/annotation'
 import type { PageScrollRequest } from './PageColumn'
 import type { PageLayout } from './page-column-geometry'
 import type { createReaderScrollProgress } from './scroll-progress'
-import { OutlineAside } from './OutlineAside'
+import { OutlineAside } from './panels/OutlineAside'
 import { SplitPane } from '../../shared/ui/SplitPane'
 import { TabBar } from './TabBar'
 import { PdfDocProvider } from './state/PdfDocProvider'
diff --git a/src/renderer/features/reader/AiNoteGroupList.tsx b/src/renderer/features/reader/panels/AiNoteGroupList.tsx
similarity index 99%
rename from src/renderer/features/reader/AiNoteGroupList.tsx
rename to src/renderer/features/reader/panels/AiNoteGroupList.tsx
index bf82551991..c5ffe2d3b9 100644
--- a/src/renderer/features/reader/AiNoteGroupList.tsx
+++ b/src/renderer/features/reader/panels/AiNoteGroupList.tsx
@@ -34,7 +34,7 @@
 import { useEffect, useRef, useState } from 'react'
 import { AI_NOTE_QUESTIONS } from '@shared/models/ai-note'
 import type { AiNote, AiNoteQuestion, AiNoteRole } from '@shared/models/ai-note'
-import { QUESTION_COLOR, QUESTION_LABEL, QUESTION_TEXT, ROLE_LABEL, ROLE_ORDER } from './anchors/ai-note-style'
+import { QUESTION_COLOR, QUESTION_LABEL, QUESTION_TEXT, ROLE_LABEL, ROLE_ORDER } from '../anchors/ai-note-style'
 
 /** question 分组（呈现序=AI_NOTE_QUESTIONS；空组剔除；组内条目按 ROLE_ORDER 排序） */
 export function groupNotes(notes: AiNote[]): Array<{ question: AiNoteQuestion; items: AiNote[] }> {
diff --git a/src/renderer/features/reader/AiNotesSection.tsx b/src/renderer/features/reader/panels/AiNotesSection.tsx
similarity index 95%
rename from src/renderer/features/reader/AiNotesSection.tsx
rename to src/renderer/features/reader/panels/AiNotesSection.tsx
index b1ea9fd4d6..84659d8355 100644
--- a/src/renderer/features/reader/AiNotesSection.tsx
+++ b/src/renderer/features/reader/panels/AiNotesSection.tsx
@@ -47,12 +47,12 @@
  *   +e2e ai-notes-section.spec.ts（均受锁，always-active）
  */
 import { useEffect } from 'react'
-import { locateAnchor } from './anchors/anchor-locate'
+import { locateAnchor } from '../anchors/anchor-locate'
 import { AiNoteGroupList } from './AiNoteGroupList'
 import { AiNotesStatus } from './AiNotesStatus'
-import { derivePhase } from './state/ai-notes-phase'
-import { useAiNotesStore } from './state/ai-notes.store'
-import { useActiveTab } from './state/useActiveTab'
+import { derivePhase } from '../state/ai-notes-phase'
+import { useAiNotesStore } from '../state/ai-notes.store'
+import { useActiveTab } from '../state/useActiveTab'
 import type { AiNote } from '@shared/models/ai-note'
 
 /** 空数组稳定引用（selector 快照引用稳定——防 useSyncExternalStore 无限重渲染） */
diff --git a/src/renderer/features/reader/AiNotesStatus.tsx b/src/renderer/features/reader/panels/AiNotesStatus.tsx
similarity index 95%
rename from src/renderer/features/reader/AiNotesStatus.tsx
rename to src/renderer/features/reader/panels/AiNotesStatus.tsx
index a8a1244669..5a80f91f33 100644
--- a/src/renderer/features/reader/AiNotesStatus.tsx
+++ b/src/renderer/features/reader/panels/AiNotesStatus.tsx
@@ -27,11 +27,11 @@
  *   missing 三态分离在 06 服务）；按钮动作型失败 toast（INV-02 两型分清）
  */
 import { useEffect, useRef, useState } from 'react'
-import { ApiClientError } from '../../api/client'
-import { showToast } from '../../shared/ui/Toast'
-import { OP_FAILED, STATUS_POLL_MS } from '../../shared/ui-constants'
-import { useAiNotesStore } from './state/ai-notes.store'
-import { derivePhase } from './state/ai-notes-phase'
+import { ApiClientError } from '../../../api/client'
+import { showToast } from '../../../shared/ui/Toast'
+import { OP_FAILED, STATUS_POLL_MS } from '../../../shared/ui-constants'
+import { useAiNotesStore } from '../state/ai-notes.store'
+import { derivePhase } from '../state/ai-notes-phase'
 
 /** 连续轮询失败阈值（≥ 此值显示离线提示行） */
 const POLL_FAIL_THRESHOLD = 3
diff --git a/src/renderer/features/reader/FragmentNotesList.tsx b/src/renderer/features/reader/panels/FragmentNotesList.tsx
similarity index 98%
rename from src/renderer/features/reader/FragmentNotesList.tsx
rename to src/renderer/features/reader/panels/FragmentNotesList.tsx
index 678979b0e5..adbda9f4ee 100644
--- a/src/renderer/features/reader/FragmentNotesList.tsx
+++ b/src/renderer/features/reader/panels/FragmentNotesList.tsx
@@ -9,7 +9,7 @@
 import { useEffect, useMemo, useRef } from 'react'
 import type { Annotation } from '@shared/models/annotation'
 import { sortByDocumentOrder } from '@shared/annotation-order'
-import { COLOR_SWATCH } from './anchors/annotation-style'
+import { COLOR_SWATCH } from '../anchors/annotation-style'
 
 /** 引文/批注摘要截断（显示策略） */
 const EXCERPT_MAX = 60
diff --git a/src/renderer/features/reader/OutlineAside.tsx b/src/renderer/features/reader/panels/OutlineAside.tsx
similarity index 97%
rename from src/renderer/features/reader/OutlineAside.tsx
rename to src/renderer/features/reader/panels/OutlineAside.tsx
index 5b6bd508d5..8d8e0f9f9b 100644
--- a/src/renderer/features/reader/OutlineAside.tsx
+++ b/src/renderer/features/reader/panels/OutlineAside.tsx
@@ -43,11 +43,11 @@
  *   笔记 tab 挂载/目录跳页经 store/片段单击页级定位/空态
  */
 import { useEffect, useState } from 'react'
-import { locateAnchor } from './anchors/anchor-locate'
+import { locateAnchor } from '../anchors/anchor-locate'
 import { OutlinePanel } from './OutlinePanel'
 import { ReaderNotesPanel } from './ReaderNotesPanel'
-import { useReaderStore } from './state/reader.store'
-import { useActiveTab } from './state/useActiveTab'
+import { useReaderStore } from '../state/reader.store'
+import { useActiveTab } from '../state/useActiveTab'
 
 type AsideTab = 'outline' | 'thumbs' | 'notes'
 
diff --git a/src/renderer/features/reader/OutlinePanel.tsx b/src/renderer/features/reader/panels/OutlinePanel.tsx
similarity index 98%
rename from src/renderer/features/reader/OutlinePanel.tsx
rename to src/renderer/features/reader/panels/OutlinePanel.tsx
index 9720d2af54..e1bb07065d 100644
--- a/src/renderer/features/reader/OutlinePanel.tsx
+++ b/src/renderer/features/reader/panels/OutlinePanel.tsx
@@ -19,7 +19,7 @@
  *   本组件在途请求失败一律静默降级（目录/缩略图缺席不影响主阅读）
  */
 import { useEffect, useState } from 'react'
-import type { PDFDocumentProxy } from './state/PdfDocProvider'
+import type { PDFDocumentProxy } from '../state/PdfDocProvider'
 import { Thumbnail } from './OutlineThumb'
 
 /** 目录树节点（pdfjs OutlineItem 结构子集） */
diff --git a/src/renderer/features/reader/OutlineThumb.tsx b/src/renderer/features/reader/panels/OutlineThumb.tsx
similarity index 96%
rename from src/renderer/features/reader/OutlineThumb.tsx
rename to src/renderer/features/reader/panels/OutlineThumb.tsx
index 5f916f8a4f..88f0804122 100644
--- a/src/renderer/features/reader/OutlineThumb.tsx
+++ b/src/renderer/features/reader/panels/OutlineThumb.tsx
@@ -3,7 +3,7 @@
  * 卸载取消在途任务。渲染调用全走句柄方法，不引入 pdfjs 运行时依赖。
  */
 import { useEffect, useRef } from 'react'
-import type { PDFDocumentProxy, RenderTask } from './state/PdfDocProvider'
+import type { PDFDocumentProxy, RenderTask } from '../state/PdfDocProvider'
 
 /** 缩略图渲染比例（规约：scale 0.2） */
 export const THUMB_SCALE = 0.2
diff --git a/src/renderer/features/reader/ReaderNotesPanel.tsx b/src/renderer/features/reader/panels/ReaderNotesPanel.tsx
similarity index 97%
rename from src/renderer/features/reader/ReaderNotesPanel.tsx
rename to src/renderer/features/reader/panels/ReaderNotesPanel.tsx
index 2432166a8e..44de067562 100644
--- a/src/renderer/features/reader/ReaderNotesPanel.tsx
+++ b/src/renderer/features/reader/panels/ReaderNotesPanel.tsx
@@ -44,15 +44,15 @@
  * - 组件 ≤250 行（两层拆 FragmentNotesList 守恒）
  */
 import { useEffect, useRef, useState } from 'react'
-import { ApiClientError } from '../../api/client'
-import { showToast } from '../../shared/ui/Toast'
-import { deriveSaveStatus, detectSaveFailed } from '../../shared/save-status'
+import { ApiClientError } from '../../../api/client'
+import { showToast } from '../../../shared/ui/Toast'
+import { deriveSaveStatus, detectSaveFailed } from '../../../shared/save-status'
 import { NOTE_TITLE_MAX } from '@shared/ipc/schemas'
 import type { Annotation } from '@shared/models/annotation'
-import { useNotesStore } from '../notes/notes.store'
+import { useNotesStore } from '../../notes/notes.store'
 import { AiNotesSection } from './AiNotesSection'
 import { FragmentNotesList } from './FragmentNotesList'
-import { useActiveTab } from './state/useActiveTab'
+import { useActiveTab } from '../state/useActiveTab'
 
 /** 意外异常（非 ApiClientError）时的兜底中文消息 */
 const LOAD_FAILED = '笔记加载失败'
diff --git a/tests/unit/renderer/ai-note-collapse.test.tsx b/tests/unit/renderer/ai-note-collapse.test.tsx
index d61eae08ce..fce2c562f3 100644
--- a/tests/unit/renderer/ai-note-collapse.test.tsx
+++ b/tests/unit/renderer/ai-note-collapse.test.tsx
@@ -13,7 +13,7 @@ import { act } from 'react'
 import { createRoot, type Root } from 'react-dom/client'
 import { afterEach, beforeEach, expect, it } from 'vitest'
 import type { AiNote, AiNoteRole, AiNoteQuestion } from '../../../src/shared/models/ai-note'
-import { AiNoteGroupList } from '../../../src/renderer/features/reader/AiNoteGroupList'
+import { AiNoteGroupList } from '../../../src/renderer/features/reader/panels/AiNoteGroupList'
 
 function note(id: string, role: AiNoteRole, question: AiNoteQuestion): AiNote {
   return {
diff --git a/tests/unit/renderer/ai-notes-section.test.tsx b/tests/unit/renderer/ai-notes-section.test.tsx
index 58747fa844..d711564cd7 100644
--- a/tests/unit/renderer/ai-notes-section.test.tsx
+++ b/tests/unit/renderer/ai-notes-section.test.tsx
@@ -45,7 +45,7 @@ vi.mock('../../../src/renderer/features/reader/anchors/anchor-locate', async (im
 })
 
 import { showToast } from '../../../src/renderer/shared/ui/Toast'
-import { AiNotesSection } from '../../../src/renderer/features/reader/AiNotesSection'
+import { AiNotesSection } from '../../../src/renderer/features/reader/panels/AiNotesSection'
 import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
 import { useAiNotesStore } from '../../../src/renderer/features/reader/state/ai-notes.store'
 import { QUESTION_COLOR } from '../../../src/renderer/features/reader/anchors/ai-note-style'
diff --git a/tests/unit/renderer/outline-aside.test.tsx b/tests/unit/renderer/outline-aside.test.tsx
index 2afd4d187d..e37f51b30d 100644
--- a/tests/unit/renderer/outline-aside.test.tsx
+++ b/tests/unit/renderer/outline-aside.test.tsx
@@ -15,7 +15,7 @@ import { makeTab } from '../../utils/factories'
 
 const stubApi = makeApiStub({ notes: { get: vi.fn(), save: vi.fn() } })
 
-import { OutlineAside } from '../../../src/renderer/features/reader/OutlineAside'
+import { OutlineAside } from '../../../src/renderer/features/reader/panels/OutlineAside'
 import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
 import type { Annotation } from '../../../src/shared/models/annotation'
 
diff --git a/tests/unit/renderer/reader-notes-panel.test.tsx b/tests/unit/renderer/reader-notes-panel.test.tsx
index 8f31358537..2da97559ef 100644
--- a/tests/unit/renderer/reader-notes-panel.test.tsx
+++ b/tests/unit/renderer/reader-notes-panel.test.tsx
@@ -20,8 +20,8 @@ stubApi.notes.get = notesGet
 const notesSave = vi.fn()
 stubApi.notes.save = notesSave
 
-import { ReaderNotesPanel } from '../../../src/renderer/features/reader/ReaderNotesPanel'
-import { FragmentNotesList } from '../../../src/renderer/features/reader/FragmentNotesList'
+import { ReaderNotesPanel } from '../../../src/renderer/features/reader/panels/ReaderNotesPanel'
+import { FragmentNotesList } from '../../../src/renderer/features/reader/panels/FragmentNotesList'
 import { useReaderStore } from '../../../src/renderer/features/reader/state/reader.store'
 import { useNotesStore } from '../../../src/renderer/features/notes/notes.store'
 

## ⑤ 附 B：registry F 段裁展（summary 字段整剥；主控已全目验=唯一差异 file 路径，status 值全原样）
-  { id: 'SR-RDR-08', file: 'src/renderer/features/reader/OutlinePanel.tsx', area: 'reader', owner: 'weak', status: 'done'
+  { id: 'SR-RDR-08', file: 'src/renderer/features/reader/panels/OutlinePanel.tsx', area: 'reader', owner: 'weak', status: 'done'
-  { id: 'SR2-C-03', file: 'src/renderer/features/reader/ReaderNotesPanel.tsx', area: 'reader', owner: 'strong', status: 'done'
-  { id: 'SR2-C-04', file: 'src/renderer/features/reader/OutlineAside.tsx', area: 'reader', owner: 'strong', status: 'done'
+  { id: 'SR2-C-03', file: 'src/renderer/features/reader/panels/ReaderNotesPanel.tsx', area: 'reader', owner: 'strong', status: 'done'
+  { id: 'SR2-C-04', file: 'src/renderer/features/reader/panels/OutlineAside.tsx', area: 'reader', owner: 'strong', status: 'done'
-  { id: 'SR2-AI-08', file: 'src/renderer/features/reader/AiNotesSection.tsx', area: 'reader', owner: 'strong', status: 'done'
+  { id: 'SR2-AI-08', file: 'src/renderer/features/reader/panels/AiNotesSection.tsx', area: 'reader', owner: 'strong', status: 'done'
-  { id: 'SR2-AI-11', file: 'src/renderer/features/reader/AiNoteGroupList.tsx', area: 'reader', owner: 'strong', status: 'done'
+  { id: 'SR2-AI-11', file: 'src/renderer/features/reader/panels/AiNoteGroupList.tsx', area: 'reader', owner: 'strong', status: 'done'
-  { id: 'F-GEOM-01-G8', file: 'src/renderer/features/reader/ReaderNotesPanel.tsx', area: 'reader', owner: 'strong', status: 'open'
+  { id: 'F-GEOM-01-G8', file: 'src/renderer/features/reader/panels/ReaderNotesPanel.tsx', area: 'reader', owner: 'strong', status: 'open'

## ⑤ 附 C：实现者报告全文
# F-GEOM-01-G8 实现者报告（目录化 M5=panels/ 域迁移，零行为纯迁移）

> 票面=tickets/registry.ts:299 F-GEOM-01-G8（status 仍 open——翻 done 归主控收口）。
> 简报=scripts/audits/g8-impl-brief.md；设计书=docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md §3.4 M5。
> 本票无 commit（简报铁律：禁 git commit/push，主控收口统一提交）——git mv 的 8 个 rename 已入 index（R 标记），实现进度以工作树+本报告为准。

## 0. 开工技能清点（宪法会话开工纪律）

- 用：executing-plans（六段简报逐步执行）；verification-before-completion（七关卡+变量法物理落档）；test-driven-development（零行为迁移票的红绿闭环=变异红证 M1/M2 形态）。
- 不用：subagent-driven-development（单一调用者铁律，禁派子代理）；git-workflow-and-versioning（禁 commit/push）；browser/webapp/e2e 系技能（零行为口径，e2e 不跑——义务归 G11）；frontend-design（零行为纯迁移，无视觉面）；systematic-debugging（全程零卡点未启用）；其余语言/框架技能（非本票面）。
- 配置自查：ops-executor 绑定档 GLM5.3flash $max（派发简报头注同口径）。

## 1. 交付清单（按单元）

| 单元 | 内容 | 产物 |
| --- | --- | --- |
| U1 | git mv 八件 reader/ → reader/panels/（R rename 入 index）+A 段 21 行深度修正+B 段 1 行 | 8 rename + ReaderPageView.tsx:35 |
| U2 | 受锁面：unlock → C 段 tests 5 行/4 件 + E 段 check-quality:97 + F 段 registry 6 行 → generate+apply（358→359） | tests×4 / check-quality.mjs / registry.ts / locks/manifest.json |
| U3 | §3.1 单向核验探针（自产受锁件，同批 lint+generate+apply） | scripts/audits/g8-s31-check.mjs + .log |
| U4 | 全量 verify 七关卡 | scripts/audits/g8-impl-verify.log |
| U5 | 变异红证 M1/M2（cp 备份法，零 git checkout） | g8-impl-mutation1.log+restore / g8-impl-mutation2.log+restore |
| U6 | build 哈希档+panels 回归定向 | g8-build-hash.log / g8-panels-regression.log |
| U7 | 本报告 | g8-impl-report.md |

### git diff --numstat 逐行实测（-M rename 检测，2026-09-19 实跑）

```
1	1	scripts/check-quality.mjs                                    ← E 段
1	1	src/renderer/features/reader/ReaderPageView.tsx              ← B 段
1	1	src/renderer/features/reader/{ => panels}/AiNoteGroupList.tsx
4	4	src/renderer/features/reader/{ => panels}/AiNotesSection.tsx
5	5	src/renderer/features/reader/{ => panels}/AiNotesStatus.tsx
1	1	src/renderer/features/reader/{ => panels}/FragmentNotesList.tsx
3	3	src/renderer/features/reader/{ => panels}/OutlineAside.tsx
1	1	src/renderer/features/reader/{ => panels}/OutlinePanel.tsx
1	1	src/renderer/features/reader/{ => panels}/OutlineThumb.tsx
5	5	src/renderer/features/reader/{ => panels}/ReaderNotesPanel.tsx
1	1	tests/unit/renderer/ai-note-collapse.test.tsx
1	1	tests/unit/renderer/ai-notes-section.test.tsx
1	1	tests/unit/renderer/outline-aside.test.tsx
2	2	tests/unit/renderer/reader-notes-panel.test.tsx
6	6	tickets/registry.ts                                           ← F 段
```

合计：8 rename（A 段改写 21 行=3+1+1+5+4+1+5+1，与简报 ②A「恰 21 行」逐文件对上）+B 1+C 5+E 1+F 6=34 改写行；八件 rename 检测全保（相似度 99%，仅 import 行差异）。域内互引 7 边零改写（OutlinePanel→OutlineThumb 等——同迁同层）。D 段跨特性=零（实勘复核：lineage 命中系注释提名非 import）。

### wc -l 八件对照表（迁移前后同值=纯移动零增删）

| 文件 | 设计书 §3.2 | wc -l 实测 | 差 |
| --- | --- | --- | --- |
| OutlineAside.tsx | 157 | 156 | -1 |
| OutlinePanel.tsx | 184 | 183 | -1 |
| OutlineThumb.tsx | 78 | 77 | -1 |
| ReaderNotesPanel.tsx | 208 | 207 | -1 |
| AiNotesSection.tsx | 108 | 107 | -1 |
| AiNoteGroupList.tsx | 198 | 197 | -1 |
| AiNotesStatus.tsx | 156 | 155 | -1 |
| FragmentNotesList.tsx | 92 | 91 | -1 |
| 合计 | 1181 | 1173 | -8 |

## 2. 验证证据（七关卡+附加关，全部真退出码）

| # | 关卡 | 结果 | 证据 |
| --- | --- | --- | --- |
| 1 | typecheck | EXIT=0 | verify 链内绿 + M1 复绿独立跑 M1_REGREEN_TYPECHECK_EXIT=0 |
| 2 | lint | EXIT=0 | verify 链内 `eslint .` 绿（G8_IMPL_VERIFY_EXIT=0） |
| 3 | unit 全量 | Test Files 170 passed (170) / Tests 1744 passed (1744)=基线零漂移 | g8-impl-verify.log:3835-3836 |
| 4 | build+产物哈希恒等 | EXIT=0；index-D3egZtl2.js 1,392.72 kB（sha256 9c3b8b84…3f2a，1,402,437 B）+index-BfpEygSE.css 52.49 kB（sha256 dcace2e7…8a97d5，59,923 B）与基线同名同尺寸（产物名即内容哈希，恒等成立） | g8-impl-verify.log 尾 + g8-build-hash.log |
| 5 | 指纹门 | cur=187 files·1789 cases·5411 assertions·skipSites 15（base 183/1757/5334/15，C_after ⊇ C_before 绿）=187/1789/5411/15 零漂移 | g8-impl-verify.log:27,68 |
| 6 | locks:check | EXIT=0，359 受锁件与 manifest 一致（358→359=自产 s31 探针 +1，已 generate+apply 同步） | verify 链内 + M2_FINAL_LOCKSCHECK_EXIT=0 |
| 7 | verify 全链 | **G8_IMPL_VERIFY_EXIT=0**（变量法物理落档） | g8-impl-verify.log 末行 |
| + | panels 回归定向 4 件 | 4 files/41 tests 全绿，G8_PANELS_REGRESSION_EXIT=0 | g8-panels-regression.log |
| + | §3.1 单向核验 | S31_FINAL_PASS=true（详见 §2.1） | g8-s31-check.log |
| + | 中探针（C 面待改时点） | MIDPROBE_TYPECHECK_EXIT=2 恰 5 错全 tests 旧径、src 面 0 错（A+B 段闭合独立实证） | g8-impl-midprobe.log |
| + | e2e | 不跑（零行为口径，义务归 G11——G1-G7 同裁） | — |

### 2.1 §3.1 单向核验出边表（探针全表，与主控预判 14 边逐边对上）

anchors 4 边：OutlineAside→../anchors/anchor-locate；AiNotesSection→../anchors/anchor-locate；AiNoteGroupList→../anchors/ai-note-style；FragmentNotesList→../anchors/annotation-style。

state 10 边：OutlineAside→../state/reader.store、OutlineAside→../state/useActiveTab；OutlinePanel→../state/PdfDocProvider；OutlineThumb→../state/PdfDocProvider；ReaderNotesPanel→../state/useActiveTab；AiNotesSection→../state/ai-notes-phase、../state/ai-notes.store、../state/useActiveTab；AiNotesStatus→../state/ai-notes.store、../state/ai-notes-phase。

反向边（state|anchors|time|interact→panels）=0；全仓旧径残留（src/tests/scripts/tickets 活代码域，绝对形态 features/reader/X+reader 域内 './X'|'../X' 相对形态+vi.mock 全形态，8 名逐一）=0。

### 2.2 变异红证还原链

- **M1（src 面）**：cp 备份→ReaderPageView:35 回退 './panels/OutlineAside'→'./OutlineAside'→typecheck **EXIT=2**（TS2307: Cannot find module './OutlineAside' 恰中 :35）→cp 还原（M1_RESTORE_EXIT=0）→diff 空（M1_RESTORE_DIFF_EXIT=0）→备份删除（M1_BACKUP_CLEANUP_EXIT=0）→复绿 EXIT=0。四退出码物理落 g8-impl-mutation1.log+g8-impl-mutation1-restore.log。
- **M2（tests 面）**：cp 备份→unlock（只读拦前置解，M2_UNLOCK_EXIT=0）→outline-aside.test:18 回退旧径→定向 vitest **EXIT=1**（Failed to resolve import "../../../src/renderer/features/reader/OutlineAside"——恰为旧径模块解析红）→cp 还原（M2_RESTORE_EXIT=0）→diff 空（M2_RESTORE_DIFF_EXIT=0）→备份删除→**复锁 locks:apply（M2_RELOCK_EXIT=0）后**定向复绿 4 passed/4（M2_REGREEN_VITEST_EXIT=0）→终态 locks:check（M2_FINAL_LOCKSCHECK_EXIT=0，359 一致）。全退出码物理落 g8-impl-mutation2.log+g8-impl-mutation2-restore.log。
- 全程 cp 备份法，零 git checkout；备份副本已删（禁驻留）。

## 3. 自裁申报（超票面决定逐条）

1. **自产探针 g8-s31-check.mjs**（简报 ⑤ 允许"可并入 impl-verify"，我选择独立探针件）：三面核验（出边表/反向边/残留）+lint 自查（S31_LINT_EXIT=0）+locks 同批 generate+apply（manifest 358→359）。理由：可复跑、输出结构化落档。
2. **额外证据件 g8-impl-midprobe.log**：C 面待改时点的 typecheck 中探针（EXIT=2/5 错全 tests/src 面 0 错），不在简报点名日志清单内，属红绿闭环补强证据。
3. **wc -l 八件各 -1（合计 -8）登记 G11 对账债**（简报 ① 明示非本票修正义务，G5/G6/G7 同口径）：设计书 §3.2 行数=无尾换行计数口径，与 wc -l 恒差 1/件。
4. **E 段票面勘误登记**（简报 ②E 已自带勘正，此处报告备案）：票面原文"check-quality.mjs:96-97 两路径"实勘=**单行 :97 键**（:96 tab-dirty=已迁态零触碰）。
5. registry.ts 六行 +/- 逐行目验：唯一差异=file 路径，status 字段值全原样（G8=still open）；grep 计数 38 系 diff 上下文行含 "status" 字样所致（改动行本身含 status 字段文本但值零变化）。
6. 工作树遗留申报：docs/handoff/relay.md（M）与 locks/manifest.json 中主控 recon 探针两件（g8-recon-edges.mjs/g8-fullscan2.mjs 登记）为开工前既有态，非本实现者改动；manifest 现含三件新增（上述两件+我的 s31 探针）=359。

## 4. 边界声明

- 禁区全守：零 commit/push、零 registry status 变更、零断言/用例结构变更（指纹门零漂移实证）、零 test-surface.baseline.json/docs/e2e 注释/dist_new 触碰、零 git checkout。
- 票面与实勘完全相符（A/B/C/E/F 段行号逐一预核后才动刀），无行号漂移、无停工事件。
