[routing]: run=20260909113605-3de8 source=deepseek model=deepseek-v4-flash switches=0 usage=in=4876,out=26921 latency=230843ms (by ds-call.mjs 链)

0B / 1W / 3N

**处置复核**
- W-1：`fireAutosave` else 分支 `if (timerRef.current === null) scheduleAutosave()` 确实能锁门一序列；undo 回 lastSaved→clean 撤 timer→在途 resolve→重挂的路径成立。复核通过。
- W-2：failed 后 savingRef 已复位，重试链无显式锁；复核通过，但前提是 onAutosave 恒不 reject（见 N-A）。
- N-6：compositionstart 快照/期间不入栈/end 一步入栈的意图与实现一致；真实浏览器事件序风险见 N-B，复核有条件通过。

**新发现**

- **W-A（本次新，需回炉）：自动保存与手动“保存/删除”之间缺少串行化，存在并发写覆盖。**  
  `AnnotationPopups.tsx` 新增 `autosaveComment` 明确“不动 busy（后台静默，不锁编辑器按钮）”；因此 autosave 在途时，编辑器内的“保存/删除”按钮仍可用（原 busy 防线不生效）。若用户先触发一次 autosave（正在 await），随即手动保存/删除，则手动结果可能先落 store/后端，而较晚返回的 autosave 响应会无条件 `updateAnnotation(saved)`，把更新或删除后的状态覆盖回旧值。  
  证据：`fireAutosave` 的 `await onAutosave(...)` 没有与 `saveComment`/`deleteAnnotation` 共享同一互斥；autosave 完成后也不校验“期间是否发生过手动保存/删除”。同样地，删除与在途 autosave 竞态还可能“复活”已删除批注。  
  建议：autosave 走同一 busy/串行链，或手动保存/删除前等待并作废在途 autosave；至少要在 `updateAnnotation` 前按 updatedAt/删除标记丢弃过期响应。

- **N-A：fireAutosave 失败分支把“已回退到 lastSaved”误判为 dirty。**  
  `fireAutosave` 的判废逻辑只比较 `commentRef.current === value`，未比较 `commentRef.current === lastSavedRef.current`。  
  序列：lastSaved=L → 输入 v1 → autosave 在途失败 → 期间 user undo 回 L（`commitValue` 已 clean 并撤 timer）→ resolve false 后进入 else，`setSaveState('dirty')` 并重挂；随后 timer 到期时因 `value === lastSavedRef.current` 直接 return，saveState 停在不可见 dirty。与头注“值回退到 lastSaved → clean”不一致。无数据丢失，但内部状态机偏差，需补测。

- **N-B（不确定）：compositionend 是否总晚于最后一次 value 变更，未在代码中闭环。**  
  `handleCompositionEnd` 立即把 `composingRef` 置 false。若真实浏览器的 `compositionend` 后仍派发一个携带终值的 input/onChange，且此刻组件 state 尚未同步到同一终值，则该次 `applyEdit` 会把组词中间态额外压入 past，导致 undo 不再是“整段一步回退”。测试若仅模拟 start→change→end，不能覆盖此顺序。请用真实 IME/浏览器事件序补用例或显式做 end 后防重入。

- **N-C：本包附件未包含测试 diff/终态全文，测试面与 line-count 无法独立取证。**  
  「16 用例+变异 C 红证」「code=236」均依赖实现者自述，本审未看到 `tests/unit/renderer/annotation-editor-ux.test.tsx` 与终态完整文件，无法核实断言非恒真/行数合规。

**总评**：W-1/W-2/N-6 的处置基本成立，但自动保存“不动 busy”造成与手动保存/删除的并发写覆盖是一条新的中等偏上缺陷，需再次回炉；其余为状态机边界与取证性 N。