# F-A11 门一审包（对抗深审——Kimi 链）

## 0. 票面（registry F-A11 原文）

笔记编辑 UX 双缺（2026-09-09 真机测试用户反馈原文:「添加笔记后关闭,保存选项未出现,也未找到撤回/恢复按钮」）;取证定性=非丢数据（当日 comment『我是奶龙』已落盘——自动保存在位但零反馈）;缺项①保存状态反馈（输入停顿后『已保存』标记）②编辑器撤回/恢复按钮对（textarea 原生 Ctrl+Z 在而无按钮面——加 undo/redo 按钮,值栈或 execCommand 实现,禁新依赖）;验收=e2e/DOM:输入→停顿→已保存标记在场;undo 点击回退/redo 复原;关闭重开笔记在（回读）

## 1. 实现者报告全文（scripts/audits/f-a11-impl.report.md——含状态迁移表 §6/自裁 12 项 §7/疑虑 4 项 §8）

# F-A11 实现者报告 —— 笔记编辑 UX 双缺（保存反馈 + 撤销/重做）

> 三屋实现者子代理产出。票面：registry F-A11（2026-09-09 真机反馈「添加笔记后关闭，
> 保存选项未出现，也未找到撤回/恢复按钮」）。定性：非丢数据（comment 已落盘，
> 自动保存在位但零反馈）——缺项①保存状态反馈 ②编辑器撤销/重做按钮对。

## 0. 技能清点（宪法开工纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| test-driven-development | 用 | 票面 TDD 铁律：先红→绿→断言级变异红证，全程照走 |
| verification-before-completion | 用 | 绿跑+全量回归+typecheck+lint+行数/计数脚本实测后收笔 |
| javascript-testing-patterns | 不用（吸收仓内先例替代） | jsdom/act/fake timers/native setter 惯例已由仓内 annotation-layer/annotation-menu/useDebounce/lineage-tag-edit 先例全覆盖，仓规优先 |
| frontend-ui-engineering | 不用 | 复用既有 btn 样式常量与弹层形态，无新视觉设计面（视觉决策零承担） |
| systematic-debugging | 备用未用 | 全程无阻塞调试面（一处实现 bug 由 TDD 红直接定位） |

配置自查：宿主 node=v24.20.0（Volta shim 亲验），vitest jsdom 正常（无 Node25 localStorage 破损面）。

## 1. 实现摘要

- **AnnotationEditor.tsx**（主改件，90→270 行 / code 216 行）：
  - 新 props `onAutosave(comment): Promise<boolean>`；内部状态机 clean/dirty/saving/saved/failed
    （表见 §6），800ms 防抖触发，saved/failed 态渲染 `data-testid="annotation-saved-flag"`
    小字标记（已保存/保存失败）。
  - 撤销/重做值栈：past/future 双数组上限 100 步（HISTORY_MAX），工具行按钮对
    （`annotation-editor-undo`/`annotation-editor-redo`，栈空 disabled，复用 const btn 样式）
    + 键盘 Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z（+Meta 对位）preventDefault 拦截接值栈。
  - 卸载清防抖 timer；保存串行化（在途中 timer 到期→重挂防抖，不并发写）。
- **AnnotationPopups.tsx**（+41 行）：`autosaveComment`=saveComment 静默变体——复用
  api 链（updateAnnotation+unwrap）+ store 同步（updateAnnotation）+ pushUndo
  （**会话单 entry**，见自裁③）+ clearTabDirty；**不** setEditing(null) 收层、**不**调
  onChanged（自裁②）、**不**动 busy（后台静默）；失败 markTabDirty+toast 返 false。
  JSX 接线 `onAutosave={(comment) => autosaveComment(editing.annotation, comment)}`。

## 2. 文件清单（改动面）

| 文件 | 性质 | 说明 |
| --- | --- | --- |
| src/renderer/features/reader/AnnotationEditor.tsx | 改（票面授权） | 状态机+防抖+值栈+标记+按钮对 |
| src/renderer/features/reader/AnnotationPopups.tsx | 改（票面授权「如需」） | autosaveComment+接线+头注 |
| tests/unit/renderer/annotation-editor-ux.test.tsx | 新增（票面授权路径） | 13 用例，always-active（无 guardedDescribe） |
| scripts/audits/f-a11-red.raw.txt / -green.raw.txt / -mutation.raw.txt | 新增（报告契约） | 三段证据原始输出 |

`git diff --stat`（我的面）：两实现件 +225/-5；测试与审计件为新增未跟踪。工作树另有
**并发会话残留**（非本票）：`M scripts/check-tickets.mjs`、`M locks/manifest.json`、
`?? scripts/audits/f-a9-*`——未触碰（见 §9-④）。

## 3. TDD 红证（scripts/audits/f-a11-red.raw.txt）

- 首红：**11 红 / 2 绿（13 用例）**，定向子集跑（`npm run test -- tests/unit/renderer/annotation-editor-ux.test.tsx`）。
  **降档申报**：新文件孤立新功能面，全量套跑不改变红面（其余 156 文件不受实现影响）；
  实现后已补全量套跑（§4）。
- 2 绿定性：「卸载时清防抖」旧件恒真（实现后转为真锁）、「Escape 原语义」=保留行为
  回归锁——均为合法绿灯，11 红全部命中新功能断言。
- 红期抓到 1 个实现真 bug：`setPast` 函数式更新子 flush 期读 `commentRef` 已是新值
  → past 全收新值、首 undo 恒 no-op（逐步错一位）。已修（旧值同步捕获入 const）。
  另修 2 处测试替身缺陷（unwrap mock 补 async/await 对齐真实语义；ApiClientError mock
  双参签名对齐）。

## 4. 测试证据（scripts/audits/f-a11-green.raw.txt）

- 目标文件：**13/13 绿**（describe①自动保存反馈 8 + describe②撤销/重做值栈 3 + 接线 2）。
- 全量单测：**157 文件 / 1479 用例全绿**（基线 156/1466 +1 文件 +13 用例，增量核对一致）。
- `npm run typecheck` 双 tsconfig 绿；`npx eslint` 三件（两实现+一测试）CLEAN。
- 行数口径（ESLint max-lines 同口径 skipComments/skipBlankLines，脚本实测）：
  AnnotationEditor **code=216 ≤250**（总行 270，含 54 行规约注释；未拆子件，申报于 §7-⑪）；
  AnnotationPopups code=130。
- 乱码自查：中文 grep 实测可读（编辑器件 10 处/测试件 19 处命中）；TODO/FIXME/placeholder
  grep 零命中（exit=1）。

## 5. 变异红证（scripts/audits/f-a11-mutation.raw.txt，cp 备份法）

| 变异 | 内容 | 结果 |
| --- | --- | --- |
| A | AnnotationEditor `AUTOSAVE_DEBOUNCE_MS` 800→1600 | **7 红**（防抖时序断言拦截） |
| B | AnnotationPopups pushUndo 会话守卫条件→`if (true)` | **1 红**（「成功链…会话单 entry」用例拦截） |

还原：双文件 `diff` 备份**空**（RESTORE DIFF EMPTY）；备份副本已清除（不驻留 repo）；
还原后 13/13 复绿。

## 6. 自动保存状态迁移表（宪法前置）

| 态 | 进入 | 行为/标记 |
| --- | --- | --- |
| clean | 挂载（comment=初始） | 无标记、无 timer |
| dirty | 输入/撤销/重做后值≠lastSaved | 无标记；起 800ms 防抖 timer |
| saving | timer 到期且值≠lastSaved 且无在途保存 | 调 onAutosave(值)；标记不在场 |
| saved | onAutosave resolve true 且期间无新输入 | 「已保存」标记；lastSaved=本轮值 |
| failed | resolve false 且期间无新输入 | 「保存失败」标记；再输入→dirty 可重试 |
| dirty（←saved/failed/saving） | 保存在途期间续输 | 在途结果不作废 dirty：resolve 后按「当前值≠本轮存值」判废落 dirty，防抖已由输入重挂 |
| clean（←dirty） | 值回退到 lastSaved（含初始值） | 撤 timer，零发出 |

跨格序列锁：测试「保存中续输」用例（d1 在途续输→d1 resolve 不显标记→800ms 后 d2 存新值→标记）
与「回退到初始值也再存」用例。串行化：在途中 timer 再到期→重挂 800ms（不并发写）。
手动「保存」按钮走原 onSave 语义（保存+收层），不进本状态机；Escape/「取消」原 onCancel
丢弃语义零改（不做 flush，防语义漂移）。

## 7. 自裁申报（一切超票面决定）

1. **触发判据=与 lastSaved（上次已存值）不同，非票面字面「与初始值不同」**。字面读法在
   「存 x 后 undo/删输回初始值」场景丢数据（自动保存已存 x，回初始后不再触发→库留 x）
   ——且该路径可由本票新增的 undo 按钮直达。lastSaved 初值=初始 comment，票面意图
   （未改不动）保持；测试「回退到初始值也再存」锁定此语义。
2. **onChanged 不调**（票面授权裁量）：唯一消费点 PagesOverlay 传 `() => undefined`；
   store.updateAnnotation 订阅链已驱动 UI 刷新；且自动保存高频触发下调宿主回调=语义噪声。
3. **pushUndo 会话单 entry**：同一编辑会话（editing 目标切换/重开为界）多次自动保存只推
   一条 comment-edit（before=预编辑快照）。理由：每次输入停顿各推一条会灌满
   UNDO_DEPTH_MAX=50 全局栈、挤出他操作条目，且产生同 before 的 no-op 连撤；单 entry 下
   一次 ctrl+z=整段笔记编辑回预编辑态，与手动保存单 entry 语义一致。变异 B 锁定。
4. **成功路径补 clearTabDirty**：票面只点名失败 markTabDirty；成功 clear 与 saveCommand
   对称（TABS-03 两写面纪律），落盘态=store 态时灰点应清。
5. **键盘拦截并入 metaKey**（macOS Cmd 对位），票面只列 Ctrl 三键。
6. **saving 态不显标记**：票面只规定 saved/failed 两文案；「保存中」无信息价值（防抖+
   本地写快），不造第三文案。
7. **undo/redo 按钮 busy 不禁用**：纯本地值操作、零 api 提交面；busy 只锁三个动作钮（原语义）。
8. **保存串行化+卸载清 timer**：票面未明写，属状态机跨格完备性（防并发写/卸载后触发）。
9. **值回退到 lastSaved→clean+撤 timer**：无谓写零发出（用户删回已存值不应再打 api）。
10. **测试替身两处对齐真实件**：unwrap mock 必须 async+await（真实件 client.ts L20-26 语义，
    非此 reject 被吞成同步 Error）；ApiClientError mock 双参 (code,message) 构造。
11. **行数**：AnnotationEditor 总行 270>250，按 ESLint max-lines 同口径（skipComments/
    skipBlankLines）code=216≤250 合规——54 行差额为头注规约+状态机表；未拆子件（拆件收益
    为负：工具行/标记与编辑器状态强耦合）。若门审认 250=物理行，回炉拆 EditorToolbar 子件。
12. **首红定向子集跑**（降档申报，见 §3）。

## 8. 疑虑（未处理项，交主控/门审裁量）

1. **手动保存在途+自动保存并发**：autosave 不查 busy（静默设计），手动「保存」亚秒窗口内
   续输→两 api 写完成序不定，终态=后完成者。正常路径两值同源（编辑器当前值）一致；
   残余风险窗口极窄，未加锁（加锁=自动保存阻塞收层交互，得不偿失）。
2. **自动保存已推 entry 后手动保存再推一条同 before 重复**→ctrl+z 一次 no-op 冗余。
   未动 saveComment 既有语句（避免动既有语义面）；如需消除，门审裁决后一行可加同会话守卫。
3. **验收面口径**：票面验收=e2e/DOM（输入→停顿→标记在场；undo 回退/redo 复原；关闭重开
   回读）。本件交付 jsdom DOM 断言层（13 用例全锁 DOM/行为面）；真机 e2e 面主控裁量
   （tests/e2e 受锁我无权；「关闭重开回读」依赖整链 api+db，建议收口时主控补 e2e 或人工
   真机走查）。
4. **工作树并发污染**（非本票）：`M scripts/check-tickets.mjs`、`M locks/manifest.json`、
   `?? scripts/audits/f-a9-*` 为并发会话产物；本票测试文件中途被外部 locks:apply 置只读
   （walk 面 tests/** 自动覆盖），已仅对该自建文件清 R 完成编辑，locks 面零触碰。
   **收口提醒**：新增 tests/unit/renderer/annotation-editor-ux.test.tsx 须 locks:generate
   登记+apply（manifest 当前不含它），staging 显式列文件防误扫并发残留。

## 9. 结论

缺项①②均落地且被 13 用例+双变异红证锁定；全量单测 157/1479 绿、typecheck/lint 绿、
改动面=票面授权两件+一新测试文件+三审计档。无 BLOCKED。


## 2. 实现 diff 全文

```diff
diff --git a/src/renderer/features/reader/AnnotationEditor.tsx b/src/renderer/features/reader/AnnotationEditor.tsx
index ce4170974d..086de96002 100644
--- a/src/renderer/features/reader/AnnotationEditor.tsx
+++ b/src/renderer/features/reader/AnnotationEditor.tsx
@@ -1,16 +1,41 @@
 /**
  * AnnotationEditor —— 标注批注编辑弹层（AnnotationLayer 的交互子件，纯展示）。
  *
- * 数据与副作用全在 AnnotationLayer：本件只收 textarea 文本并上交
- * （onSave(comment) / onDelete / onCancel），busy 期间按钮禁点防重复提交。
+ * 数据与副作用全在 AnnotationLayer/AnnotationPopups：本件只收 textarea 文本并
+ * 上交（onSave(comment) / onDelete / onCancel），busy 期间按钮禁点防重复提交。
  * 弹层挂载在页根内、文本层之上（z 高于划选工具条），按命中矩形的左下沿定位；
  * key 由父级按 annotation.id 传（换条编辑必经卸载重挂，comment 状态不串）。
+ *
+ * [F-A11] 笔记编辑 UX 双缺补齐：
+ * ① 自动保存反馈——输入停顿 800ms 且值≠上次已存值时调 onAutosave(comment)
+ *   （Promise<boolean>），true→「已保存」/false→「保存失败」小字标记
+ *   （annotation-saved-flag）；手动「保存」按钮走原 onSave 语义不进本状态机。
+ * ② 撤销/重做值栈（textarea 受控组件原生 undo 栈不可靠——值栈单源）：
+ *   past/future 双栈上限 100 步，按钮对+Ctrl+Z/Ctrl+Y/Ctrl+Shift+Z 键盘拦截。
+ *
+ * 自动保存状态机（宪法前置，跨格序列见 tests/unit/renderer/annotation-editor-ux.test.tsx）：
+ * | 态 | 进入 | 行为 |
+ * | clean | 挂载（comment=初始） | 无标记无 timer |
+ * | dirty | 输入/撤销/重做后值≠lastSaved | 起 800ms 防抖 timer |
+ * | saving | timer 到期且值≠lastSaved | 调 onAutosave；标记不在场 |
+ * | saved | onAutosave resolve true 且期间无新输入 | 「已保存」；lastSaved=值 |
+ * | failed | resolve false 且期间无新输入 | 「保存失败」；再输入回 dirty 可重试 |
+ * | dirty←saved/failed/saving | 保存期间续输 | 在途结果不作废当前 dirty（跨格：结果按「值已变」判废） |
+ * 值回退到 lastSaved（含初始值）→ clean 并撤 timer（无谓写零发出）。
+ * 保存串行化：在途中 timer 再到期→重挂 800ms（不并发写）。
  */
 import { useEffect, useRef, useState } from 'react'
 import type { Annotation, AnnotationRect } from '@shared/models/annotation'
 
 const btn = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'
 
+/** 自动保存防抖窗口（ms） */
+const AUTOSAVE_DEBOUNCE_MS = 800
+/** 撤销/重做值栈深度上限（步） */
+const HISTORY_MAX = 100
+
+type SaveState = 'clean' | 'dirty' | 'saving' | 'saved' | 'failed'
+
 export function AnnotationEditor(props: {
   annotation: Annotation
   rect: AnnotationRect
@@ -18,9 +43,19 @@ export function AnnotationEditor(props: {
   onCancel(): void
   onSave(comment: string): void
   onDelete(): void
+  onAutosave(comment: string): Promise<boolean>
 }): JSX.Element {
-  const { annotation, rect, busy, onCancel, onSave, onDelete } = props
+  const { annotation, rect, busy, onCancel, onSave, onDelete, onAutosave } = props
   const [comment, setComment] = useState(annotation.comment)
+  const [saveState, setSaveState] = useState<SaveState>('clean')
+  const [past, setPast] = useState<string[]>([])
+  const [future, setFuture] = useState<string[]>([])
+  // commentRef：fireAutosave 异步链里读最新值（闭包不捕旧 state）
+  const commentRef = useRef(annotation.comment)
+  // lastSaved：上次落盘值（初值=初始 comment）——回退到它即 clean，触发判据用它而非初始值
+  const lastSavedRef = useRef(annotation.comment)
+  const timerRef = useRef<number | null>(null)
+  const savingRef = useRef(false)
   const textareaRef = useRef<HTMLTextAreaElement | null>(null)
 
   // 打开即聚焦批注输入；Escape 收起（键盘可退出）
@@ -28,6 +63,100 @@ export function AnnotationEditor(props: {
     textareaRef.current?.focus()
   }, [])
 
+  // 卸载清防抖（防泄漏与卸载后触发保存）
+  useEffect(() => {
+    return () => {
+      if (timerRef.current !== null) {
+        clearTimeout(timerRef.current)
+      }
+    }
+  }, [])
+
+  function cancelTimer(): void {
+    if (timerRef.current !== null) {
+      clearTimeout(timerRef.current)
+      timerRef.current = null
+    }
+  }
+
+  function scheduleAutosave(): void {
+    cancelTimer()
+    timerRef.current = window.setTimeout(() => {
+      void fireAutosave()
+    }, AUTOSAVE_DEBOUNCE_MS)
+  }
+
+  async function fireAutosave(): Promise<void> {
+    timerRef.current = null
+    const value = commentRef.current
+    if (value === lastSavedRef.current) {
+      return
+    }
+    // 串行化：在途保存未完→重挂防抖（不并发写后端）
+    if (savingRef.current) {
+      scheduleAutosave()
+      return
+    }
+    savingRef.current = true
+    setSaveState('saving')
+    const ok = await onAutosave(value)
+    savingRef.current = false
+    if (ok) {
+      lastSavedRef.current = value
+    }
+    // 跨格守卫：保存期间又有输入→在途结果不作废 dirty（当前值≠本轮存值）
+    if (commentRef.current === value) {
+      setSaveState(ok ? 'saved' : 'failed')
+    } else {
+      setSaveState('dirty')
+    }
+  }
+
+  /** 值落地共尾：改 comment 值并按「是否等于 lastSaved」迁移保存态 */
+  function commitValue(next: string): void {
+    commentRef.current = next
+    setComment(next)
+    if (next === lastSavedRef.current) {
+      setSaveState('clean')
+      cancelTimer()
+    } else {
+      setSaveState('dirty')
+      scheduleAutosave()
+    }
+  }
+
+  /** 用户输入：推 past、清 future（redo 分支失效） */
+  function applyEdit(next: string): void {
+    if (next === commentRef.current) {
+      return
+    }
+    // 旧值须同步捕获：setPast 函数式更新子在 flush 期才执行，届时读 ref 已是新值
+    const prev = commentRef.current
+    setPast((p) => [...p, prev].slice(-HISTORY_MAX))
+    setFuture([])
+    commitValue(next)
+  }
+
+  function undoEdit(): void {
+    if (past.length === 0) {
+      return
+    }
+    const cur = commentRef.current
+    setPast(past.slice(0, -1))
+    setFuture([cur, ...future])
+    commitValue(past[past.length - 1]!)
+  }
+
+  function redoEdit(): void {
+    if (future.length === 0) {
+      return
+    }
+    const cur = commentRef.current
+    setPast([...past, cur])
+    setFuture(future.slice(1))
+    commitValue(future[0]!)
+  }
+
   return (
     <div
       data-testid="annotation-editor"
@@ -51,11 +180,61 @@ export function AnnotationEditor(props: {
         className="w-full resize-none rounded border p-1 text-xs"
         style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
         value={comment}
-        onChange={(e) => setComment(e.target.value)}
+        onChange={(e) => applyEdit(e.target.value)}
         onKeyDown={(e) => {
-          if (e.key === 'Escape') onCancel()
+          if (e.key === 'Escape') {
+            onCancel()
+            return
+          }
+          // 受控组件原生 undo 栈不可靠（F-A11）——拦截接值栈；metaKey=macOS Cmd 对位
+          const mod = e.ctrlKey || e.metaKey
+          if (mod && (e.key === 'z' || e.key === 'Z')) {
+            e.preventDefault()
+            if (e.shiftKey) {
+              redoEdit()
+            } else {
+              undoEdit()
+            }
+            return
+          }
+          if (mod && (e.key === 'y' || e.key === 'Y')) {
+            e.preventDefault()
+            redoEdit()
+          }
         }}
       />
+      {/* 工具行：撤销/重做按钮对 + 右角保存状态标记（栈空 disabled） */}
+      <div className="flex items-center gap-1">
+        <button
+          type="button"
+          className={btn}
+          style={{ borderColor: 'var(--border)' }}
+          data-testid="annotation-editor-undo"
+          disabled={past.length === 0}
+          onClick={undoEdit}
+        >
+          撤销
+        </button>
+        <button
+          type="button"
+          className={btn}
+          style={{ borderColor: 'var(--border)' }}
+          data-testid="annotation-editor-redo"
+          disabled={future.length === 0}
+          onClick={redoEdit}
+        >
+          重做
+        </button>
+        {(saveState === 'saved' || saveState === 'failed') && (
+          <span
+            data-testid="annotation-saved-flag"
+            className="ml-auto"
+            style={{ color: saveState === 'failed' ? 'var(--danger)' : 'var(--text-dim)' }}
+          >
+            {saveState === 'failed' ? '保存失败' : '已保存'}
+          </span>
+        )}
+      </div>
       <div className="flex items-center gap-1">
         <button
           type="button"
diff --git a/src/renderer/features/reader/AnnotationPopups.tsx b/src/renderer/features/reader/AnnotationPopups.tsx
index e30f14bcf4..28df60e5cd 100644
--- a/src/renderer/features/reader/AnnotationPopups.tsx
+++ b/src/renderer/features/reader/AnnotationPopups.tsx
@@ -13,6 +13,10 @@
  *   AnnotationLayer 持有，本件经 props 收值+set 函数回写；saveComment/
  *   copyQuote/deleteAnnotation 动作函数随弹层 JSX 迁入，busy 守卫/失败 toast
  *   （含 tab 灰点两写面 markTabDirty/clearTabDirty）/pushUndo 语句零改。
+ * - [F-A11] 批注编辑器自动保存接线：autosaveComment=saveComment 静默变体
+ *   （api 链+store 同步+pushUndo 会话单 entry；不收层不 onChanged 不动 busy；
+ *   失败 markTabDirty+toast 返 false）——编辑器内 800ms 停顿触发，反馈标记
+ *   「已保存/保存失败」在编辑器本件。
  *
  * ── 接口层 ──
  * - export function AnnotationPopups(props: { menu: PopupTarget | null;
@@ -24,6 +28,7 @@
  * - api 调用+store 三方法同步随弹层动作归本件（原 AnnotationLayer 头注「在
  *   本层」随迁——色块命中上抛与重锚编排留宿主）；AnnotationEditor 纯展示不变。
  */
+import { useEffect, useRef } from 'react'
 import { api, unwrap, ApiClientError } from '../../api/client'
 import { showToast } from '../../shared/ui/Toast'
 import { pushUndo } from './annotation-undo'
@@ -57,6 +62,16 @@ export function AnnotationPopups(props: {
 }): JSX.Element {
   const { menu, editing, busy, setMenu, setEditing, setBusy, onChanged } = props
 
+  // [F-A11] 自动保存 pushUndo 会话守卫：编辑会话（editing 目标切换）重置——
+  // 同一会话内多次自动保存只推一条 comment-edit（before=预编辑快照），避免
+  // 每次输入停顿灌满 UNDO_DEPTH_MAX=50 的全局撤销栈挤出他操作条目
+  const pushedSessionRef = useRef<string | null>(null)
+  useEffect(() => {
+    if (editing !== null) {
+      pushedSessionRef.current = null
+    }
+  }, [editing])
+
   /** 批注保存：api 成功 → store 同步 → 收起弹层 → onChanged 通知 */
   async function saveComment(a: Annotation, comment: string): Promise<void> {
     if (busy) {
@@ -80,6 +95,31 @@ export function AnnotationPopups(props: {
     }
   }
 
+  /**
+   * [F-A11] 自动保存（saveComment 的静默变体）：复用 api 链+store 同步+pushUndo
+   * （会话单 entry），但不 setEditing(null) 收层、不调 onChanged（唯一消费点
+   * PagesOverlay 传 noop，store 订阅已驱动 UI 刷新——主控裁量申报点）；不动
+   * busy（后台静默，不锁编辑器按钮）。失败 markTabDirty+toast（TABS-03 两写面）
+   * 并返回 false；成功 clearTabDirty 返回 true。
+   */
+  async function autosaveComment(a: Annotation, comment: string): Promise<boolean> {
+    try {
+      const next: Annotation = { ...a, comment, updatedAt: new Date().toISOString() }
+      const saved = await unwrap(api.reader.updateAnnotation({ annotation: next }))
+      useReaderStore.getState().updateAnnotation(saved)
+      if (pushedSessionRef.current !== a.id) {
+        pushUndo(a.paperId, { kind: 'comment-edit', before: a })
+        pushedSessionRef.current = a.id
+      }
+      useReaderStore.getState().clearTabDirty(a.paperId)
+      return true
+    } catch (e) {
+      useReaderStore.getState().markTabDirty(a.paperId)
+      showToast(e instanceof ApiClientError ? e.message : UPDATE_FAILED, 'error')
+      return false
+    }
+  }
+
   /** 复制引文：双路径失败 toast（同步异常/写入拒绝，INV-02 动作型）→ 收起菜单 */
   function copyQuote(a: Annotation): void {
     setMenu(null)
@@ -140,6 +180,7 @@ export function AnnotationPopups(props: {
           onCancel={() => setEditing(null)}
           onSave={(comment) => void saveComment(editing.annotation, comment)}
           onDelete={() => void deleteAnnotation(editing.annotation)}
+          onAutosave={(comment) => autosaveComment(editing.annotation, comment)}
         />
       )}
     </>

```

## 3. 新测试文件全文（tests/unit/renderer/annotation-editor-ux.test.tsx，13 用例 always-active）

```tsx
// @vitest-environment jsdom
/**
 * [F-A11] 笔记编辑 UX 双缺组件测试（新建，always-active——ADR-0017 裁决 3）。
 *
 * 锁两个缺项：
 * ① 自动保存反馈——输入停顿 800ms 触发 onAutosave（防抖合并、与已存值相同
 *   不触发），resolve true→「已保存」标记 / false→「保存失败」标记；
 *   保存中续输的跨格序列（宪法状态机前置：结果不作废 dirty 态）。
 * ② 撤销/重做值栈——按钮对（栈空 disabled）+ 键盘 Ctrl+Z/Ctrl+Y/
 *   Ctrl+Shift+Z 拦截接值栈 + 100 步上限。
 * 附 AnnotationPopups 接线面：自动保存=saveComment 静默变体（api 链+store
 * 同步+pushUndo 会话单 entry，不 setEditing 收层；失败 markTabDirty+toast）。
 * React act 环境对齐 annotation-layer.test.tsx 既有形态；输入模拟对齐
 * lineage-tag-edit.test.tsx（native value setter + input 事件）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationEditor } from '../../../src/renderer/features/reader/AnnotationEditor'

const mocks = vi.hoisted(() => ({
  // AnnotationPopups 接线面的模块替身（api/Toast/store/undo 栈）
  apiUpdate: vi.fn(),
  storeUpdateAnnotation: vi.fn(),
  storeMarkTabDirty: vi.fn(),
  storeClearTabDirty: vi.fn(),
  storeRemoveAnnotation: vi.fn(),
  storeNotifyNoteHighlight: vi.fn(),
  pushUndo: vi.fn(),
  showToast: vi.fn()
}))

vi.mock('../../../src/renderer/api/client', () => ({
  api: { reader: { updateAnnotation: mocks.apiUpdate, deleteAnnotation: vi.fn() } },
  // 对齐真实语义（client.ts unwrap：await call 后判 ok 再返 data）
  unwrap: vi.fn(async (call: Promise<{ ok: boolean; data: unknown }>) => {
    const r = await call
    if (!r.ok) throw new Error('unwrap: !ok')
    return r.data
  }),
  // 对齐真实签名 ApiClientError(code, message)（client.ts）——tsc 按真实类型检查
  ApiClientError: class extends Error {
    constructor(_code: string, message: string) {
      super(message)
    }
  }
}))

vi.mock('../../../src/renderer/shared/ui/Toast', () => ({ showToast: mocks.showToast }))

vi.mock('../../../src/renderer/features/reader/reader.store', () => ({
  useReaderStore: {
    getState: () => ({
      updateAnnotation: mocks.storeUpdateAnnotation,
      markTabDirty: mocks.storeMarkTabDirty,
      clearTabDirty: mocks.storeClearTabDirty,
      removeAnnotation: mocks.storeRemoveAnnotation,
      notifyNoteHighlight: mocks.storeNotifyNoteHighlight
    })
  }
}))

vi.mock('../../../src/renderer/features/reader/annotation-undo', () => ({
  pushUndo: mocks.pushUndo,
  undo: vi.fn(),
  clearStack: vi.fn(),
  stackDepth: vi.fn(() => 0),
  UNDO_DEPTH_MAX: 50
}))

/** 完整形态最小标注（comment 可覆写——lastSaved 语义用例需非空初值） */
function makeAnnotation(comment = ''): Annotation {
  return {
    id: 'anno-1',
    paperId: 'paper-1',
    page: 0,
    kind: 'highlight',
    color: 'yellow',
    quoteText: '被标注的引文内容',
    prefixText: '前',
    suffixText: '后',
    startOffset: 1,
    endOffset: 10,
    rects: [{ page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }],
    comment,
    createdAt: '2026-08-23T00:00:00Z',
    updatedAt: '2026-08-23T00:00:00Z'
  }
}

const RECT: AnnotationRect = { page: 0, x: 0.1, y: 0.2, w: 0.3, h: 0.05 }

let root: Root | null = null
let host: HTMLDivElement | null = null

beforeEach(() => {
  vi.useFakeTimers()
  ;(globalThis as unknown as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => {
    root?.unmount()
  })
  root = null
  host?.remove()
  host = null
  document.body.innerHTML = ''
  vi.useRealTimers()
  vi.clearAllMocks()
})

/** textarea 输入（lineage-tag-edit 同款：native setter + input 事件） */
function typeInto(el: HTMLTextAreaElement, text: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
  act(() => {
    setter?.call(el, text)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

/** textarea 上派发 keydown（cancelable——断言 defaultPrevented 用） */
function pressKey(el: Element, init: KeyboardEventInit): void {
  act(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init }))
  })
}

/** 可控 promise（保存中续输的跨格序列用） */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function renderEditor(
  props: Partial<Parameters<typeof AnnotationEditor>[0]> = {}
): { onAutosave: ReturnType<typeof vi.fn>; onCancel: ReturnType<typeof vi.fn> } {
  const onAutosave = vi.fn(() => Promise.resolve(true))
  const onCancel = vi.fn()
  act(() => {
    root!.render(
      <AnnotationEditor
        annotation={makeAnnotation()}
        rect={RECT}
        busy={false}
        onCancel={onCancel}
        onSave={vi.fn()}
        onDelete={vi.fn()}
        onAutosave={onAutosave}
        {...props}
      />
    )
  })
  return { onAutosave, onCancel }
}

function textarea(): HTMLTextAreaElement {
  const el = host!.querySelector('textarea')
  expect(el).not.toBeNull()
  return el as HTMLTextAreaElement
}

function undoBtn(): HTMLButtonElement {
  return host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-undo"]')!
}

function redoBtn(): HTMLButtonElement {
  return host!.querySelector<HTMLButtonElement>('[data-testid="annotation-editor-redo"]')!
}

function savedFlag(): Element | null {
  return host!.querySelector('[data-testid="annotation-saved-flag"]')
}

describe('F-A11 ① 自动保存反馈 —— AnnotationEditor', () => {
  it('初始态：无已保存标记、撤销/重做均禁用、800ms 后未输入不触发自动保存', async () => {
    const { onAutosave } = renderEditor()
    expect(savedFlag()).toBeNull()
    expect(undoBtn().disabled).toBe(true)
    expect(redoBtn().disabled).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('输入停顿 800ms → onAutosave 收值且 resolve true → 「已保存」标记在场', async () => {
    const { onAutosave } = renderEditor()
    typeInto(textarea(), '我是奶龙')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(700)
    })
    expect(onAutosave).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(100)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenCalledWith('我是奶龙')
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('防抖窗口内续输合并：只调一次、值=最后值', async () => {
    const { onAutosave } = renderEditor()
    typeInto(textarea(), '奶')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    typeInto(textarea(), '我是奶龙')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    expect(onAutosave).toHaveBeenCalledWith('我是奶龙')
  })

  it('resolve false → 「保存失败」标记', async () => {
    renderEditor({ onAutosave: vi.fn(() => Promise.resolve(false)) })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(savedFlag()?.textContent).toBe('保存失败')
  })

  it('保存中续输（跨格序列）：在途结果不作废 dirty → 下一轮存新值后才显「已保存」', async () => {
    const d1 = deferred<boolean>()
    const d2 = deferred<boolean>()
    const onAutosave = vi.fn((c: string) => (c === 'a' ? d1.promise : d2.promise))
    renderEditor({ onAutosave })
    typeInto(textarea(), 'a')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    typeInto(textarea(), 'ab')
    await act(async () => {
      d1.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(2)
    expect(onAutosave).toHaveBeenLastCalledWith('ab')
    await act(async () => {
      d2.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('回退到初始值也再存（lastSaved 语义）：存 x 后 undo 回初始 → 第二次调用收初始值', async () => {
    const { onAutosave } = renderEditor({ annotation: makeAnnotation('orig') })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(1, 'x')
    act(() => {
      undoBtn().click()
    })
    expect(textarea().value).toBe('orig')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'orig')
  })

  it('卸载时清防抖：到期后不调 onAutosave 不抛错', async () => {
    const { onAutosave } = renderEditor()
    typeInto(textarea(), 'x')
    act(() => {
      root?.unmount()
    })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).not.toHaveBeenCalled()
  })

  it('Escape 原语义保留：textarea keydown → onCancel 一次', () => {
    const { onCancel } = renderEditor()
    pressKey(textarea(), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})

describe('F-A11 ② 撤销/重做值栈 —— AnnotationEditor', () => {
  it('按钮对逐步回退/复原：三步输入 → 撤两步 → 重做一步，disabled 态随栈变化', () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    typeInto(ta, 'ab')
    typeInto(ta, 'abc')
    expect(undoBtn().disabled).toBe(false)
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('ab')
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('a')
    expect(redoBtn().disabled).toBe(false)
    act(() => {
      redoBtn().click()
    })
    expect(ta.value).toBe('ab')
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('a')
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
  })

  it('键盘拦截接值栈：ctrl+z 回退、ctrl+y / ctrl+shift+z 重做，均 preventDefault', () => {
    renderEditor()
    const ta = textarea()
    typeInto(ta, 'a')
    typeInto(ta, 'ab')
    const undoEvt = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })
    act(() => {
      ta.dispatchEvent(undoEvt)
    })
    expect(ta.value).toBe('a')
    expect(undoEvt.defaultPrevented).toBe(true)
    pressKey(ta, { key: 'y', ctrlKey: true })
    expect(ta.value).toBe('ab')
    pressKey(ta, { key: 'z', ctrlKey: true })
    expect(ta.value).toBe('a')
    pressKey(ta, { key: 'Z', ctrlKey: true, shiftKey: true })
    expect(ta.value).toBe('ab')
  })

  it('栈上限 100：105 步输入后撤 100 步达第 5 值且撤销禁用，重做可复 1 步', () => {
    renderEditor()
    const ta = textarea()
    for (let i = 1; i <= 105; i++) {
      typeInto(ta, String(i).padStart(3, '0'))
    }
    for (let i = 0; i < 100; i++) {
      act(() => {
        undoBtn().click()
      })
    }
    expect(ta.value).toBe('005')
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    expect(ta.value).toBe('006')
  })
})

describe('F-A11 接线 —— AnnotationPopups 自动保存（静默变体）', () => {
  it('成功链：api+store 同步、pushUndo 会话单 entry（两轮停顿仅一次）、不收层、标记已保存', async () => {
    const setEditing = vi.fn()
    mocks.apiUpdate.mockImplementation(async ({ annotation }: { annotation: Annotation }) => ({
      ok: true,
      data: annotation
    }))
    const { AnnotationPopups } = await import('../../../src/renderer/features/reader/AnnotationPopups')
    act(() => {
      root!.render(
        <AnnotationPopups
          menu={null}
          editing={{ annotation: makeAnnotation(), rect: RECT }}
          busy={false}
          setMenu={vi.fn()}
          setEditing={setEditing}
          setBusy={vi.fn()}
          onChanged={vi.fn()}
        />
      )
    })
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    expect(ta).not.toBeNull()
    typeInto(ta, '笔记一')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.apiUpdate.mock.calls[0]![0].annotation.comment).toBe('笔记一')
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
    expect(mocks.pushUndo).toHaveBeenCalledTimes(1)
    expect(mocks.pushUndo.mock.calls[0]![1]).toMatchObject({ kind: 'comment-edit' })
    expect(mocks.storeClearTabDirty).toHaveBeenCalledWith('paper-1')
    expect(setEditing).not.toHaveBeenCalled()
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    expect(savedFlag()?.textContent).toBe('已保存')
    typeInto(ta, '笔记一续')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(2)
    expect(mocks.pushUndo).toHaveBeenCalledTimes(1)
    expect(setEditing).not.toHaveBeenCalled()
  })

  it('失败链：api 抛 ApiClientError → markTabDirty+toast、编辑器在场、「保存失败」', async () => {
    const setEditing = vi.fn()
    const { ApiClientError } = await import('../../../src/renderer/api/client')
    const err = new ApiClientError('E_TEST', '保存失败测试')
    mocks.apiUpdate.mockRejectedValue(err)
    const { AnnotationPopups } = await import('../../../src/renderer/features/reader/AnnotationPopups')
    act(() => {
      root!.render(
        <AnnotationPopups
          menu={null}
          editing={{ annotation: makeAnnotation(), rect: RECT }}
          busy={false}
          setMenu={vi.fn()}
          setEditing={setEditing}
          setBusy={vi.fn()}
          onChanged={vi.fn()}
        />
      )
    })
    typeInto(host!.querySelector('textarea') as HTMLTextAreaElement, 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.storeMarkTabDirty).toHaveBeenCalledWith('paper-1')
    expect(mocks.showToast).toHaveBeenCalledWith('保存失败测试', 'error')
    expect(setEditing).not.toHaveBeenCalled()
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    expect(savedFlag()?.textContent).toBe('保存失败')
  })
})

```

## 4. 工单（A~E）

A 母本符合度：票面两缺项+验收面覆盖？自裁①lastSaved 判据/③会话单 entry 等是否越权？
B 宪法红线：状态机前置合规？行数口径（总 270/code 216）？UTF-8/新依赖（禁）？
C 代码与测试质量：状态机跨格（保存中续输/卸载 timer/串行化）实现与断言是否真锁？多断言与行尾注释同置？值栈边界（100 步/undo 回初始）？
D 报告诚实性：自裁 12 项逐条对 diff 核实。
E 接缝与后续单：与 pushUndo 全局栈/TABS-03 灰点两写面/AI 批注链（AiAnnotationLayer 是否共用本编辑器）接缝？e2e 面缺口（疑虑③）处置建议？

输出 [B|W|N] 逐条+file:line 证据+统计+一行总评。
