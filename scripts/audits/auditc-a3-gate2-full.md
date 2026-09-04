你是终审门二（对抗式二审+独立复算）。对象=A3 悬置写修票（notes 防抖弃改三件套）。门一=Kimi k3 条件 PASS（0B/3W/8N——放行条件二）。本包=门一报告+主控三条件处置+实现 diff+报告+证据。你无仓库访问，独立复算以包内为准，不确定的明确说不确定。

# 主控对门一三 W 的处置（逐条裁决 ADDRESSED / NOT ADDRESSED）

**W1（.catch 代际守卫零测试锚）——已补**：主控压缩票直做（F-R3 同场模式）——
notes.store.test.ts 文末 always-active 块追加「序列②-reject」用例（save 在途
rejectSave 可控 reject→discard→reject 落地→断言条目未被 .catch 重建）。绿
=20 passed exit=0（19+1）；变异=「仅摘 .catch 回调首行守卫保留 .then 守卫」
→恰 1 failed（新用例）→还原 diff 空（证据=auditc-a3-w1-green2/-mutation 尾摘
在本包末）。过程如实披露：首版追加锚误落 guardedDescribe 块（SERVER_NOTE
作用域 ReferenceError 红+违反 always-active 宪法条款）→移入文件尾
always-active 块+内联字面量→绿——首红本身非产品缺陷，为测试放置面自纠。

**W3（switchTo clean 直达=no-op 依赖 App 聚合假设）——已核验（代码面摘录）**：
App.tsx:112-114：
```ts
const tabDirty = useTabDirtyAggregate()
const lineageDirty = useLineageDirty()
const quitDirty = tabDirty || lineageDirty
```
useTabDirtyAggregate（tab-dirty.ts:74-79，包外但门一已见该文件 diff 上下文）：
`tabIds.some((id) => noteByPaper[id]?.pending === true)`——**含 notes pending**
（扫开 tab 键集）。故 dirty=false ⇒ 开 tab 零 notes pending ⇒ clean 直达
discardAll=no-op 成立。残余面=closeAll（App 切视图）后残留草稿不在开 tab 集
→聚合不可见→切课题无确认即 discardAll——**主控定性：非新增丢失面**（pre-A3
同窗 reload 即蒸发该草稿；discardAll 与 reload 等效收口，方向=确定化）。
N1（并集遍历）连带维持 pendingEdit 快照遍历（全清=reload 等效语义）。

**W2（load in-flight × discard 无守卫）——裁定：明文登记接受残余**：弃改内容
仅存内存（pendingEdit/touched/草稿条目），discard 全清；load 回调到达后因
pendingEdit 已清必走**整版落地**（服务器基线），重建的条目=服务器内容+pending
false+不触发 saveSoon 补存——**复活不可能**（重建非弃改内容）；可达窗=面板
重挂载触发的 load 在途 × ms 级关 tab，后果=无害陈旧条目（重开 load 覆写）。
登记入票面态空间表补注（收口时随 INV-45 文档面落）。

**N7（discardAll 在 await switch 前的 switch 失败丢稿窗）——维持现序**：弃改
经 confirm 显式确认（文案明示「丢弃」），switch 失败后草稿不回滚=用户已同意
丢弃的语义自洽；改 after-await 序会重开 ≤1.5s 悬置派发窗（与票面目标相悖）
——两害取轻维持票面 3.0③ 原序。

# 审计工单（门二四清单+一）

①处置核对：上述四处置 vs 包内证据（W1 绿/变异红真实性；W3 摘录与论证；W2
「复活不可能」的推理链是否成立——load 整版落地路径的推理前提=pendingEdit 已清
你可在 diff 的 load 实现里核）。②母本符合度：diff vs 票面（态空间表 3.0 逐格）。
③宪法红线终审：受锁五件追加面/白名单机器锚/行数/UTF-8/TDD 证据链四档。
④机器面核对：数字对账（A3 报告 1091=1084+7；主控 W1 补锚后=1092——包内 green2
=20 passed 是单文件口径；全量数字收口时主控亲验）。⑤成本账本行：实现者 GLM5.3
统一档 6.18M tok/85 工具/1011s；门一 kimi-main in≈36k/out=12807/563s switches=0
（in 口径含全包）；门二=你（deepseek 按量）。

输出：[B|W|N] 逐条+统计+总评（PASS/FAIL/条件 PASS——条件须票内可销项）。用中文。
=== 门一报告全文 ===
[routing]: run=20260902044726-8p1b source=kimi-main model=kimi-k3 switches=0 usage=in=0,out=12807 latency=563366ms (by ds-call.mjs 链)

# 门一审查报告：A3 悬置写修票

**裁决：条件 PASS**（0B/3W/8N；实现与票面高度贴合、证据链完整诚实，卡点=.catch 代际守卫零测试锚+两处需主控核验的假设）

---

## A. 母本符合度 —— 符合

- **3.0 态空间表逐格核**：discard 动作体（clearTimer+四元数据 delete+gen 自增+删键）与票面逐字对应（notes.store.ts discardOne）；saving×gen 变=全 no-op 两回调首行守卫在位 ✓。
- **跨格序列锚**：①=用例2（整版落地+save 零调用）✓ ②=用例3（Deferred 未 resolve→discard→resolve→条目 undefined+load 复核）✓ ③=用例4+7（零 timer/零条目/switch+reload 断言面）✓ ④=票面明示「测试不动」，实现未触 closeAll 路径，合规——仅注记（见 N3）。
- **confirmCloseDirty 布尔短路等价性**：逐路径核——clean（`!isTabDirty` 短路不弹窗→allow→no-op discard→true）、dirty 取消（confirm 调用→false→不弃改→false）、dirty 接受（confirm→discard→true）三路与原 if-early-return 结构行为全等；文案逐字未动 ✓。等价性成立。
- **3.1~3.3 逐点**：gen 快照时机（派发处、draft 早退之后）✓；discardAll `[...pendingEdit]` 快照防变异 ✓；tab-dirty 汇合处收口 ✓；workspace.store discardAll 位于 confirm 后/await 前（票面原序）✓；check-quality.mjs 白名单+理由段（票面模板原文）✓。

## B. 宪法红线 —— 零违反

- 白名单新增机器锚定（COMPOSITION_ROOT_ALLOW 一行+头注段），verify quality 步绿证。
- 受锁五件：四测试件均文末追加；notes.store.test.ts 第 1 行 import 增 `describe`——门一指引已豁免 import 段，合规。workspace test import 增补已由自裁 5 申报。
- ≤500 行：最大件 notes.store.ts 279 行 ✓。状态机前置=票面 3.0 在册 ✓。

## C. 代码与测试质量

**[W1] .catch 代际守卫零测试锚——变异存活洞。** notes.store.ts .catch 块首行守卫（diff：`if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return`）是票面 3.1 明文要求，但全部 7 新用例中序列②只 **resolve**（`resolveSave({ ok: true, ... })`），无一 reject-after-discard 用例。变异「仅摘 .catch 守卫、保留 .then 守卫」→ 全绿：in-flight save→discard→reject→`setDraft(paperId, { saving: false })` 经 draftOf **重建已删条目**——恰是本票要杀的回调复活面。M2 红证（报告原文「摘 .then 回调首行代际守卫」）只覆盖 .then 半面。**修订点：补一个 reject 版序列②用例（一行变异即可验证）。**

**[W2] load in-flight × discard 无守卫——代际守卫结构不对称（报告 §8 已自报，定性如实）。** save 回调有 gen 守卫、load 回调无；报告自述「load 合并路径会重建条目+补存排程」——若属实，discard 后到达的 load 回调可重建条目甚至排程补存，即同族复活面留缝。票面 3.0 态空间表本无此格（票面层遗漏），实现者未擅修=正确处置。可达性**不确定**（本地 IPC 毫秒级+须先编辑才能关 tab，现实窗极窄），但「不可达」未经证明。建议主控裁定：态空间表补格+load 回调同挂 gen 守卫，或明文登记为接受残余。

- 用例 5 真锚「不误伤」：discard 后重编辑链，savedAt 推进+pending 清除断言——若 gen 快照机制有误（闭包陈旧/未重取），savedAt 不推进即红 ✓。
- discard 幂等：用例 6 clean 直通（无条目）不抛 ✓；gen 单调自增无害 ✓。
- 接缝论证（守门内 vs closeOne）成立：tab-dirty→reader.store import 已在，reader.store 接 notes.store 犯白名单、接 tab-dirty 成环——两路封死论证自洽，守门单点收口=正解 ✓。
- e2e「已保存」载入锚有效且失败方向安全：内存回填 bug→pending=true→「未保存」→锚超时红；DB 复活 bug→值=输入→toHaveValue('') 红。无双 bug 假绿路径 ✓。
- 自裁 1（getTimerCount）解释成立：diff 上下文可见 timer 回调 `if (draft === undefined) return` 早退——M1 下条目已删、残留 timer 派发不出，票面字面断言「save 未被调」确实不红。加强后 M1 红证在档（m1 raw：2 failed=用例1+序列③，与 clearTimer 缺失影响面一致）✓。

## D. 报告诚实性 —— 诚实

- 自裁 1~6 逐条对 diff 全部坐实（#1/#2/#3/#5 直接可见；#4 typecheck 首红→修桩→绿与 verify EXIT=0 终态一致；#6 触碰面与 8 件 diff 吻合，F-R3 同场文件切割声明合理）。
- 基线算术自洽：1081+F-R3 新增=实测 1084，+7=1091 ✓。变异红证计数与变异影响面逐一吻合（m2=1 failed、m3=1/10、m4=1/9）。
- 疑虑 2 项定性如实：W2 未粉饰为「已修复」；e2e 时序敏感声明了失败指纹且失败方向=红（非静默假绿）✓。

## E. 接缝与后续单

**[W3] switchTo「clean 直达=no-op」依赖未证明的假设。** 票面 3.3「dirty=false 时无 pending」——workspace.store.ts 的 discardAll 在 confirm 门后**无条件**执行。若 App 注入的 dirty 聚合不含 notes pending 信号（SWITCH_DIRTY_TEXT 文案仅提「标注/脉络」），则 notes 悬置稿存在+dirty=false→无确认→discardAll **静默弃稿**。本包内无法核验 App 聚合面（零仓库访问），**不确定**——需主控核验聚合含 notes 脏信号，否则 clean 直达路径是未确认丢稿口。

- main 归属核验声明：与票面 ②7（notes.service.ts:46-51 findById→NOT_FOUND）行号语义一致，「git diff 0 行亲验」可查；本包外无法独立核验，信任级接受 [N9]。

**[N 级注记]**
- N1：discardAll 仅遍历 pendingEdit——「有 timer 无 pending」假想态会漏清（当前 edit→saveSoon 链不可达此态；票面口径即 pendingEdit 快照，实现合规；更稳为并集遍历，留主控）。
- N2：tab-dirty 头注「一切 tab 关闭路径必经本守门」与序列④（closeAll 无确认不 discard=必经不成立）有表述张力——括号已限缩「TabBar 双点」，且系票面 3.2 原文，文档级。
- N3：序列④零测试锚=票面明示「测试不动」，合规注记。
- N4：INV-35④ 兑现的 invariants.md 修档（及 INV-45 登记面）票面未排、报告未提——主控收口勿漏，防代码-档案漂移。
- N5：全量 e2e 未跑（verify 流程无 e2e 步，仅定向 1 passed）——新 test 独立种子+app.close，交叉感染面低；票面④「全量 verify」已兑现（EXIT=0），全量 e2e 归主控收口，风险可接受。
- N6：getTimerCount 全局计数——当前零背景 timer 成立（绿证）；未来 store 引入背景 timer 则假红，失败方向安全。
- N7：switch IPC 失败窗——discardAll 在 await 前，unwrap 抛错则稿已弃+未切换+未 reload=静默丢稿。**票面 3.0③ 即此序，实现合规**；更优序=switch 成功后/reload 前 discard（失败后草稿存活），建议主控裁定是否修票面。
- N8：组合序列「in-flight(gen0)→discard→re-edit→redispatch(gen1)→旧回调迟到」未单测——用例 3+5 分锚两端，gen 比较逻辑覆盖性高。

---

**统计：0B / 3W / 8N（共 11 条）**

**总评：条件 PASS。** 实现面零偏差、纪律面零红线、报告诚实度满分档。放行条件二：①补 .catch 代际守卫的 reject-after-discard 用例（W1，低成本，变异可验）；②主控核验 W3 的 App dirty 聚合假设与 W2 的 load×discard 格处置（修票或明文登记接受残余二选一）。N 级随档备查。
=== A3 实现面 diff（重发）===
diff --git a/scripts/check-quality.mjs b/scripts/check-quality.mjs
index 426f03171..a81c69969 100644
--- a/scripts/check-quality.mjs
+++ b/scripts/check-quality.mjs
@@ -59,14 +59,18 @@ for (const f of [...srcFiles, ...testFiles, join(root, 'AGENTS.md'), join(root,
 //    是脉络侧板的 AI 笔记分节（蓝图 N3 四区之一），分色/中文标签消费
 //    ai-note-style 单源（INV-11——跨域复用与域内复写二害取轻：白名单受控
 //    例外防映射双源；数据面走 window.api 直连不经 reader store，见该域
-//    W4 裁决），lineage 域其余文件引用 reader 仍是红线
+//    W4 裁决），lineage 域其余文件引用 reader 仍是红线。A3（2026-09-02）：
+//    workspace.store 是课题切换弃改收口点（INV-35④ 显式防悬置写兑现——切课题
+//    确认后 discardAll notes 悬置编辑，聚合职责即消费 notes.store），
+//    workspaces 域其余文件引用 notes 仍是红线
 const COMPOSITION_ROOT_ALLOW = new Map([
   ['src/renderer/features/library/PaperDetailPanel.tsx', ['tags/TagEditor']],
   ['src/renderer/features/library/FilterBar.tsx', ['tags/TagFilter']],
   ['src/renderer/features/reader/tab-dirty.ts', ['notes/notes.store']],
   ['src/renderer/features/reader/ReaderNotesPanel.tsx', ['notes/notes.store']],
   ['src/renderer/features/settings/useExportCorpusEvents.ts', ['reader/CorpusExtractor']],
-  ['src/renderer/features/lineage/LineageSideAiNotes.tsx', ['reader/ai-note-style']]
+  ['src/renderer/features/lineage/LineageSideAiNotes.tsx', ['reader/ai-note-style']],
+  ['src/renderer/features/workspaces/workspace.store.ts', ['notes/notes.store']]
 ])
 
 const featuresRoot = join(root, 'src', 'renderer', 'features')
diff --git a/src/renderer/features/notes/notes.store.ts b/src/renderer/features/notes/notes.store.ts
index 2b990910c..5aacd7a92 100644
--- a/src/renderer/features/notes/notes.store.ts
+++ b/src/renderer/features/notes/notes.store.ts
@@ -17,6 +17,16 @@
  *   最新内容；首载落地前挂起——从未成功载入且草稿含用户编辑时不排程，重开
  *   面板不受影响：既有草稿是完整基线非半成品，正常防抖；save 成功仅在派发
  *   后无新编辑（编辑序号守卫）时清未保存标记与触碰记录）
+ * - discardPendingEdit(paperId)（单篇弃改收口——关脏 tab 确认丢弃后调）：清
+ *   防抖句柄+全部模块级编辑元数据（pendingEdit/touchedFields/lastEditedAt/
+ *   editSeq）+noteByPaper 条目（幂等——不存在亦无害），discardGen 自增使在途
+ *   save 回调按代际守卫全 no-op；discardAllPendingEdits()（全量弃改收口——
+ *   切课题确认后调）：遍历 pendingEdit 快照逐篇同收口。代际守卫一句话：弃改
+ *   后到达的保存回调不得复活任何本地状态（条目/pending 镜像/未保存标记——
+ *   in-flight 残余仅剩 DB 落地毫秒窗，票面已接受；跨格序列语义见锁定测试
+ *   「discard 族（A3 悬置写修票）」：①discard→重开=整版落地②discard→回调
+ *   到达=零状态变更③discardAll=零 timer 零草稿④App 切视图不 discard——
+ *   autosave-first 草稿存活）
  * - 错误契约（全 store 统一）：load 属动作型——失败上抛（unwrap 的 ApiClientError），
  *   由 NotesPanel catch 后 toast；saveSoon 失败时 saving 必须复位且 savedAt 不推进
  *   （= 仍有未保存内容，不静默丢稿），下一次 edit 再次触发 saveSoon 即自然重试
@@ -54,6 +64,10 @@ export interface NotesStore {
   load(paperId: string): Promise<void>
   edit(paperId: string, patch: { title?: string; contentMd?: string }): void
   saveSoon(paperId: string): void
+  /** 单篇弃改收口（关脏 tab 确认丢弃后调）——幂等，条目/元数据不存在亦无害 */
+  discardPendingEdit(paperId: string): void
+  /** 全量弃改收口（切课题确认后调）——遍历 pendingEdit 快照逐篇同收口 */
+  discardAllPendingEdits(): void
 }
 
 /** 自动保存防抖窗口（毫秒） */
@@ -79,6 +93,11 @@ const pendingEdit = new Set<string>()
  *  新编辑（序号前进）则不清未保存标记，新编辑由重排的防抖保存收尾 */
 const editSeq = new Map<string, number>()
 
+/** 每篇文献的弃改代际（discard 自增）——save 回调比对"派发快照"：弃改后到达的
+ *  保存回调不得复活任何本地状态（代际已变即全 no-op；gen 在每次派发时重取，
+ *  discard 后的新编辑链不受误伤）。in-flight 残余=仅 DB 落地毫秒窗（票面已接受） */
+const discardGen = new Map<string, number>()
+
 export const useNotesStore = create<NotesStore>()((set, get) => {
   // 每篇文献一个防抖句柄；换文献互不干扰
   const timers: Record<string, ReturnType<typeof setTimeout>> = {}
@@ -105,6 +124,24 @@ export const useNotesStore = create<NotesStore>()((set, get) => {
     })
   }
 
+  // 弃改收口私有实现（单篇，discardPendingEdit 与 discardAllPendingEdits 共用）：
+  // 清防抖句柄+全部模块级编辑元数据+条目；discardGen 自增使在途 save 回调按
+  // 代际守卫全 no-op（防回调重建条目/pending 镜像）。全操作幂等——条目/元数据
+  // 不存在亦无害。跨格序列：①此后 load 走整版落地（pendingEdit 已清，不合并
+  // 回填）②在途 save 回调到达=零状态变更③discardAll 逐篇调用=零 timer 零草稿
+  // ④App 切视图（无确认）不经此处——autosave-first 草稿存活（既有语义保持）
+  const discardOne = (paperId: string): void => {
+    clearTimer(paperId)
+    pendingEdit.delete(paperId)
+    touchedFields.delete(paperId)
+    lastEditedAt.delete(paperId)
+    editSeq.delete(paperId)
+    discardGen.set(paperId, (discardGen.get(paperId) ?? 0) + 1)
+    const rest = { ...get().noteByPaper }
+    delete rest[paperId]
+    set({ noteByPaper: rest })
+  }
+
   return {
     noteByPaper: {},
 
@@ -186,13 +223,19 @@ export const useNotesStore = create<NotesStore>()((set, get) => {
         if (draft === undefined) {
           return
         }
-        // 派发快照：本次保存对应的编辑序号（派发后若又有 edit，序号前进）
+        // 派发快照：本次保存对应的编辑序号（派发后若又有 edit，序号前进）与
+        // 弃改代际（弃改后到达的回调按代际守卫全 no-op）
         const seqAtDispatch = editSeq.get(paperId) ?? 0
+        const genAtDispatch = discardGen.get(paperId) ?? 0
         setDraft(paperId, { saving: true })
         void unwrap(
           api.notes.save({ paperId, title: draft.title, contentMd: draft.contentMd })
         )
           .then((saved: Note) => {
+            // 代际守卫（首行）：discard 已发生——全 no-op，不 setDraft、不动
+            // pendingEdit/touchedFields（setDraft 会经 draftOf 重建已删条目+置
+            // pending 镜像，即"回调复活"；既有 editSeq 守卫在其后保持原位）
+            if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return
             // 编辑已落库：清"未保存编辑"标记与触碰记录（草稿自此等于服务器基线）
             // ——仅当派发后无新编辑（编辑序号未前进）；有新编辑则不清（新编辑仍
             // 受合并保护，由重排的防抖保存收尾）。失败路径不清——仍是未保存，
@@ -209,11 +252,26 @@ export const useNotesStore = create<NotesStore>()((set, get) => {
             }
           })
           .catch(() => {
+            // 代际守卫（首行）：discard 已发生——全 no-op（条目已删，setDraft 会
+            // 重建它）；失败复位语义只对"未弃改"的保存链生效
+            if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return
             // 失败不推进 savedAt（未保存态延续）；saving 复位后下次 edit→saveSoon 重试；
             // pendingEdit 与镜像 pending 均保留——内容未落库，面板继续显示未保存
             setDraft(paperId, { saving: false })
           })
       }, SAVE_DEBOUNCE_MS)
+    },
+
+    discardPendingEdit(paperId) {
+      discardOne(paperId)
+    },
+
+    discardAllPendingEdits() {
+      // 遍历 pendingEdit 快照逐篇调同一私有实现（防遍历中变异——discardOne
+      // 会 delete pendingEdit 键）
+      for (const paperId of [...pendingEdit]) {
+        discardOne(paperId)
+      }
     }
   }
 })
diff --git a/src/renderer/features/reader/tab-dirty.ts b/src/renderer/features/reader/tab-dirty.ts
index cda763104..c11aeba07 100644
--- a/src/renderer/features/reader/tab-dirty.ts
+++ b/src/renderer/features/reader/tab-dirty.ts
@@ -93,6 +93,13 @@ export function useNotesDrafts(): Record<string, boolean> {
 /**
  * 关闭脏 tab 守门：clean 直接放行；dirty 弹 confirm（文案含文献名）——
  * 取消不放行/确认放行。TabBar 关闭叉的唯一入口。
+ * 兼任弃改收口点（A3 悬置写修票/INV-35④）：守门通过（confirm 返回 true 或
+ * clean 直通——两路汇合处）即 discardPendingEdit 弃置该篇 notes 悬置编辑
+ * （clean 直通=no-op 幂等），确认丢弃后 ≤1.5s 防抖不得再落笔 DB。
+ * **一切 tab 关闭路径必经本守门**（TabBar 双点两位在案——关闭叉与 Delete 键；
+ * 未来新增关闭路径同此约束——接缝归责）。reader.store.closeOne 不直接接：
+ * reader.store 无法直引 notes.store（白名单外）且反向接会成 import 环，
+ * 守门内收口=单点覆盖全部关闭路径。
  */
 export function confirmCloseDirty(paperId: string): boolean {
   const tab = useReaderStore.getState().tabs[paperId]
@@ -100,8 +107,11 @@ export function confirmCloseDirty(paperId: string): boolean {
   // fileName 去扩展名，fileName 亦空（tab 缺失/异常）兜底 paperId
   const fileNameTitle = tab === undefined || tab.fileName === '' ? paperId : tab.fileName.replace(/\.pdf$/i, '')
   const title = tab !== undefined && tab.title !== '' ? tab.title : fileNameTitle
-  if (!isTabDirty(paperId, tabDirtySignals(paperId))) {
-    return true
+  // clean 直通短路（不弹窗）；dirty 走 confirm——两路在 allow 汇合
+  const allow = !isTabDirty(paperId, tabDirtySignals(paperId)) || window.confirm(`「${title}」有未保存的修改（灰点标记），关闭后将丢失未落库部分。确认关闭？`)
+  if (allow) {
+    // 弃改收口：守门通过即弃置该篇悬置编辑（含在途 save 的代际守卫打点）
+    useNotesStore.getState().discardPendingEdit(paperId)
   }
-  return window.confirm(`「${title}」有未保存的修改（灰点标记），关闭后将丢失未落库部分。确认关闭？`)
+  return allow
 }
diff --git a/src/renderer/features/workspaces/workspace.store.ts b/src/renderer/features/workspaces/workspace.store.ts
index 813939ecf..5b969f945 100644
--- a/src/renderer/features/workspaces/workspace.store.ts
+++ b/src/renderer/features/workspaces/workspace.store.ts
@@ -10,10 +10,14 @@
  *   若被 dirty 取消，新课题仍须出现在侧栏/设置面列表）
  * - rename(id, name)：成功后 items 内即时改名（侧栏与设置面同源生效）
  * - switchTo(id, { dirty })：dirty 聚合值由 App 经 props/回调注入（禁跨域 store
- *   互引——本文件不 import reader/lineage 域）。流程：
+ *   互引——本文件不 import reader/lineage 域；唯一受控例外=notes.store：本
+ *   函数兼任切课题弃改收口点，A3/INV-35④ 显式防悬置写——check-quality
+ *   COMPOSITION_ROOT_ALLOW 白名单在案，workspaces 域其余文件引 notes 仍是
+ *   红线）。流程：
  *   幂等（id===currentId 直返）→ dirty 且未确认 → 取消（false，零 IPC）；
- *   确认或无 dirty → api.switch → window.location.reload()（ADR-0018 裁决：
- *   全新 stores 零 stale 态）→ true
+ *   确认或无 dirty → discardAllPendingEdits（弃置全部 notes 悬置编辑——
+ *   reload 前零 timer 零内存草稿，clean 直达=no-op 幂等）→ api.switch →
+ *   window.location.reload()（ADR-0018 裁决：全新 stores 零 stale 态）→ true
  *
  * ── 接口层 ──
  * - export const useWorkspaceStore / selectCurrentName（当前课题名推导 helper）
@@ -32,6 +36,7 @@
 import { create } from 'zustand'
 import { api, ApiClientError, unwrap } from '../../api/client'
 import type { WorkspaceItem } from '@shared/ipc/schemas'
+import { useNotesStore } from '../notes/notes.store'
 
 /** dirty 确认文案（沿用 main-window 退出守卫「说明+确认？」风格） */
 export const SWITCH_DIRTY_TEXT = '切换课题将丢弃未保存的标注/脉络修改。确认切换？'
@@ -99,6 +104,10 @@ export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => {
     switchTo: async (id, { dirty }) => {
       if (id === get().currentId) return false
       if (dirty && !window.confirm(SWITCH_DIRTY_TEXT)) return false
+      // 弃改收口（A3/INV-35④ 显式防悬置写）：确认通过即弃置全部 notes 悬置
+      // 编辑（含清防抖句柄+在途 save 代际守卫打点）——reload 前零 timer 零内存
+      // 草稿，切课题悬置写 renderer 面闭（clean 直达=no-op 幂等）
+      useNotesStore.getState().discardAllPendingEdits()
       await unwrap(api.workspaces.switch({ id }))
       // ADR-0018：reload 出全新 stores，跨课题零 stale 态
       window.location.reload()

=== W1 补锚 diff（notes.store.test.ts 相对 A3 实现者交付的增量——主控压缩票）===
+  // A3 门一 W1 补锚（主控压缩票直做）：reject 版序列②——.catch 代际守卫单独承载面。
+  // 变异「仅摘 .catch 守卫保留 .then 守卫」时本用例红：setDraft(saving:false) 经
+  // draftOf 重建已删条目（回调复活面——本票要杀的正是它）
+  it('序列②-reject：saving→discard→save 拒绝到达=零状态变更（.catch 守卫面）', async () => {
+    let rejectSave!: (e: Error) => void
+    const save = vi.fn().mockImplementation(() => new Promise((_, rej) => { rejectSave = rej }))
+    const get = vi.fn(async () => ({ ok: true as const, data: SERVER_NOTE }))
+    const useStore = await loadStore({ notes: { get, save } })
+    await useStore.getState().load('p-1')
+    useStore.getState().edit('p-1', { contentMd: '在途草稿' })
+    useStore.getState().saveSoon('p-1')
+    await vi.advanceTimersByTimeAsync(1600) // 派发：save 已调未 settle（in-flight）
+    expect(save).toHaveBeenCalledTimes(1)
+    useStore.getState().discardPendingEdit('p-1')
+    expect(useStore.getState().noteByPaper['p-1']).toBeUndefined()
+    rejectSave(new Error('保存失败'))
+    await vi.advanceTimersByTimeAsync(0) // catch 回调落地：代际守卫=全 no-op
+    expect(useStore.getState().noteByPaper['p-1']).toBeUndefined() // 条目未被 catch 重建
+  })
+})

=== W1 证据尾摘 ===
--- green2（追加后全绿 20 passed）---
 [32m✓[39m tests/unit/renderer/notes.store.test.ts [2m([22m[2m20 tests[22m[2m)[22m[90m 96[2mms[22m[39m

[2m Test Files [22m [1m[32m1 passed[39m[22m[90m (1)[39m
[2m      Tests [22m [1m[32m20 passed[39m[22m[90m (20)[39m
[2m   Start at [22m 12:59:57
[2m   Duration [22m 659ms[2m (transform 56ms, setup 0ms, collect 84ms, tests 96ms, environment 0ms, prepare 163ms)[22m

exit=0
--- mutation（仅摘 .catch 守卫→恰新用例红）---
[31m   [31m×[31m notes.store discard 族（A3 悬置写修票）[2m > [22m序列②-reject：saving→discard→save 拒绝到达=零状态变更（.catch 守卫面）[90m 6[2mms[22m[31m[39m
[31m⎯⎯⎯⎯⎯⎯⎯[1m[7m Failed Tests 1 [27m[22m⎯⎯⎯⎯⎯⎯⎯[39m
[2m      Tests [22m [1m[31m1 failed[39m[22m[2m | [22m[1m[32m19 passed[39m[22m[90m (20)[39m
exit=1

=== 实现者报告全文 ===
# A3 悬置写修票 实现报告（AUDIT-C 二波修票场 · 实现者子代理）

> 单号=A3（audit-c-scan.md §1.2-a/§5-1 主候选，ds-审 W-5 三件套补强）。
> 票面=scripts/audits/auditc-a3-brief.md。开工技能清点：TDD/verification 用、
> systematic-debugging 备用（未触发）、subagent-driven-development 不用（本人即
> 实现者，无再派发）、其余 web/前端类不用（纯 store 层任务无 UI 测试面）。

## 1. 实现摘要（按简报③三件套）

- **notes.store.ts（改动一）**：新增 `discardPendingEdit(paperId)` /
  `discardAllPendingEdits()` 两公开动作（NotesStore 接口+实现）；私有
  `discardOne`=clearTimer+pendingEdit/touchedFields/lastEditedAt/editSeq 四元数据
  delete+`discardGen` 自增+noteByPaper 删键（全幂等）；discardAll 遍历
  `[...pendingEdit]` 快照逐篇调同一私有实现（防遍历中变异）。模块级新增
  `discardGen = Map<string, number>()`；saveSoon 派发处快照
  `genAtDispatch`，**.then/.catch 回调首行**代际守卫
  `if ((discardGen.get(paperId) ?? 0) !== genAtDispatch) return`（全 no-op，
  既有 editSeq 守卫原位其后）。头注行为层/行内注释按票面声明四跨格序列语义
  （①重开整版落地②回调到达零变更③discardAll 零 timer 零草稿④closeAll 不
  discard——autosave-first 保持）。
- **tab-dirty.ts（改动二）**：confirmCloseDirty 改两路汇合形态
  `const allow = !isTabDirty(...) || window.confirm(...)`，汇合处调
  `useNotesStore.getState().discardPendingEdit(paperId)`（clean 直通=no-op 幂等）；
  头注声明「兼任弃改收口点——一切 tab 关闭路径必经本守门（接缝归责）+
  reader.store.closeOne 不接的理由（白名单外+反向成环）」。白名单现状零改动
  （tab-dirty.ts 已在表）。
- **workspace.store.ts（改动三）**：switchTo 内 confirm 通过后、
  `await unwrap(api.workspaces.switch)` 前接
  `useNotesStore.getState().discardAllPendingEdits()`（clean 直达=no-op）；
  import notes/notes.store；头注域边界声明同步补受控例外句。
  check-quality.mjs COMPOSITION_ROOT_ALLOW 增
  `['src/renderer/features/workspaces/workspace.store.ts', ['notes/notes.store']]`
  +头注区理由段（票面模板原文）。

## 2. main 归属校验核验声明（简报 3.4——本单零改动）

`src/main/services/notes.service.ts:46-51`：`save` handler 首行
`if (papers.findById(req.paperId) === null) throw new NotesDomainError('NOT_FOUND', …)`
——repos 经 facade 绑**当前课题库**（liveProxy 访问即取当前），即跨课题归属
校验，已在职；`git diff -- src/main/services/notes.service.ts` 输出 0 行
（亲验），本单零改动。扫描报告「FK 偶然兜底」口径修档归主控收口。

## 3. 文件清单（绝对路径，10 件触碰+证据）

实现（3）：`src/renderer/features/notes/notes.store.ts`（221→279 行）、
`src/renderer/features/reader/tab-dirty.ts`（107→117）、
`src/renderer/features/workspaces/workspace.store.ts`（108→117）。
受锁追加（5）：`tests/unit/renderer/notes.store.test.ts`（+117 行文末新
describe，5 it）、`tests/unit/renderer/tab-dirty.test.tsx`（+27，1 it）、
`tests/unit/renderer/workspace.store.test.ts`（+33，1 it）、
`tests/e2e/reader-text.spec.ts`（+47，文末 1 test）、
`scripts/check-quality.mjs`（白名单 1 行+头注段）。全部 ≤500 行红线内。

## 4. 测试面（简报 3.5——always-active，全部不经 guardedDescribe）

单测 +7：①discard 清 timer/条目（save 零调用）②序列①重开整版落地③序列②
in-flight 代际 no-op（Deferred 桩未 resolve→discard→resolve→条目未被重建+
load 复核）④序列③两篇 discardAll 零 timer 零调用⑤discard 后再 edit 正常
重新起步（gen 派发时重取不误伤）⑥confirmCloseDirty 弃改收口（真实 store
状态断言：接受→条目删/取消→不弃改/clean 直通幂等）⑦switchTo discardAll
（取消不弃改/接受→两篇零条目+switch+reload 既有断言面/clean 直达幂等）。
e2e +1：复活面端到端（种子→开文献→笔记输入→「未保存」锚→confirm 自动接受
先例关脏 tab→跨 2.2s 防抖窗→重开→「已保存」载入锚→textarea='' 且
≠输入值）。跨格序列①②③④逐一有锚（④=既有语义显式不触碰+用例组头注声明）。

## 5. 首红 / 绿 / 变异红证（.raw.txt 证据文件）

- 基线：`npm run test`=126 文件 **1084** 全绿 EXIT=0（简报预期 1081+F-R3
  新增=实测 1084，如实报告）。
- 首红：`scripts/audits/auditc-a3-first-red.raw.txt`——7 新用例全红
  （discardPendingEdit is not a function 族），既有 31 绿，EXIT=1。
- 绿：`scripts/audits/auditc-a3-green-unit.raw.txt`——126 文件 **1091**
  （=1084+7）全绿 EXIT=0；`auditc-a3-e2e-targeted.raw.txt`——新增 e2e
  1 passed EXIT=0（先 `npm run build` EXIT=0，`auditc-a3-build.raw.txt`）。
- 变异红证（cp 备份法，还原后 diff 空四连，禁 git checkout 遵守）：
  - M1 摘 discardOne 内 clearTimer→`auditc-a3-mutation-m1.raw.txt` EXIT=1
    （用例1 红+序列③ 红）；
  - M2 摘 .then 回调首行代际守卫→`auditc-a3-mutation-m2.raw.txt` EXIT=1
    （序列② 红：条目被回调重建）；
  - M3 摘 confirmCloseDirty 内 discard 接线→`auditc-a3-mutation-m3.raw.txt`
    EXIT=1（用例6 红）；
  - M4 摘 switchTo 内 discardAll→`auditc-a3-mutation-m4.raw.txt` EXIT=1
    （用例7 红，票面可选档已做）。

## 6. verify 真退出码（含 locks）

受锁面改完即时 locks:apply（`auditc-a3-locks-apply.raw.txt` /
  `auditc-a3-locks-apply2.raw.txt`，233 件两连 EXIT=0，manifest 同步）。
**`npm run verify` EXIT=0**（`auditc-a3-verify.raw.txt`）：quality（占位/
乱码/跨域白名单）✓ / tickets ✓ / locks 233 一致 ✓ / lint ✓ / typecheck ✓ /
test 126 文件 1091 ✓ / build ✓。

## 7. 自裁申报（超票面决定，全部一处一行）

1. **用例 1 形态加强**：票面字面「advance 1600→save 未被调」在 M1 变异下
   **不红**——timer 回调首部既有 `draft === undefined` 早退（条目已删则残留
   timer 派发不出）。为兑现票面意图「M1→用例1红」，加强为
   `vi.getTimerCount()` 直接断言 timer 清除（vitest 2.1.8 支持，先例无——
   属断言面自裁）。
2. **confirmCloseDirty 改两路汇合结构**（票面「两路汇合处」原文落地）：
   `!isTabDirty || confirm` 短路——既有锁定用例（clean 不弹窗/取消不放行/
   文案）全绿，行为面零变化。
3. **e2e 补「已保存」载入完成锚**：entry 未落地时 textarea 恒空串，直接断
   toHaveValue('') 在 bug 场景会假绿（52 绿但文字不可见教训同族面）——先锚
   load 已整版落地再断值。
4. **verify 首跑 typecheck 红**（TS2493：用例5 save 桩未声明参数致
   `mock.calls[0]?.[0]` 索引错）→ unlock→修桩签名→apply→重跑全绿。tsc 关口
   拦住 esbuild 不查的类型面（宪法条款同场实证一次）。
5. **workspace.store.test.ts 增一行 import useNotesStore**（受锁件文末追加
   语义内，票面 3.5 允许）。
6. **删减面 diff 自查**：本单触碰=上述 8 代码/测试件+locks/manifest.json+
   本单证据文件，无蔓延；同场 F-R3 单文件（CorpusExtractor.ts/
   corpus-extractor.test.ts/f-r3-* 证据）开工前已在工作区，非本单触碰；
   main 侧零改动（§2 亲验）；tickets/registry 未翻（只读查工单状态以选
   e2e skipIfPending 依赖面）。

## 8. 疑虑（上报门一审，未擅修）

- **load 回调 × discard 窄窗**：discard 发生在 load in-flight 期间时，load
  合并路径会重建条目+补存排程——此面不在票面态空间（3.0 只含 save 回调代际
  守卫）。现实时序不可达（load 于面板挂载即发、本地 IPC 毫秒级落地，用户
  须先输入再关 tab），单测/e2e 均未构造；未修，如实上报。
- **e2e 时序敏感**：fill→关 tab 须 <1.5s 防抖窗（两动作典型 <300ms，5 倍
  余量）；CI 极慢超窗则 save 先落库→红——失败指纹=「未保存」锚超时或重开
  值不匹配，按 e2e 非确定性立案线（同用例 2 次）处置。
