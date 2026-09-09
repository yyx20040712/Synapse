[routing]: run=20260909121546-avje source=deepseek model=deepseek-v4-flash switches=0 usage=in=17401,out=27513 latency=235922ms (by ds-call.mjs 链)

## 门二复核结论

### 1. W-A：busyRef 实时读能否封双向竞态 —— 主竞态已封

代码证据（`AnnotationPopups.tsx`）：

```ts
const busyRef = useRef(busy)
busyRef.current = busy
```

且 `autosaveComment` 开头：

```ts
if (busyRef.current) {
  return true
}
setBusy(true)
```

时序核对成立：

- 手动保存先启动 → `setBusy(true)` → 宿主重渲染 → `busyRef.current` 被新渲染更新。
- 编辑器侧 800ms timer 虽持有旧渲染闭包，但走到 `onAutosave` 时读取的是 `busyRef.current`，能实时读到 `true`，反向竞态被挡。
- autosave 在途时 `setBusy(true)` 至 `finally setBusy(false)` 区间内保存/删除/取消按钮 `disabled`，正向按钮路径无并发入口。
- 变异 D 与「W-A 反向」用例的判定链有效，不是恒真测试。

`[N]` 残余边界一个：`busy` 时返回乐观 `true` 会把 `fireAutosave` 推进到「已保存」与 `lastSaved` 前进，但此时实际写并未由 autosave 发出。若手动保存链随后**失败**，编辑器仍可能显示「已保存」且 `lastSaved` 已前进到未落盘值，后续不再自动重试。这属于手动失败交互残余，不推翻主竞态修复；若收口后要处理，可考虑手动失败时通知编辑器状态回退。

### 2. N-A：三分支与状态机头注一致性 —— 一致

代码：

```ts
if (commentRef.current === value) {
  setSaveState(ok ? 'saved' : 'failed')
} else if (commentRef.current === lastSavedRef.current) {
  setSaveState('clean')
} else {
  setSaveState('dirty')
  if (timerRef.current === null) scheduleAutosave()
}
```

与头注表格一致：

- 失败轮在途回退：`ok = false` → `lastSavedRef` 未前进 → `commentRef === lastSavedRef` → `clean`，不重挂，零多余写。
- 成功轮同一路径不可达：`ok = true` → `lastSavedRef` 已前进到本轮值 → 回退目标不等于 `lastSaved` → 走 dirty + 重挂，正好保存“回退后的新意图”。

### 3. N-B：幂等短路边界 — 可接受

```ts
function applyEdit(next: string): void {
  if (next === commentRef.current) {
    return
  }
```

end 后浏览器补发同值 change 被短路，不会重复压栈；composition 整段仍是一步入栈。该边界可接受。

`[N]` 一个相关问题：该短路只挡“同值再入栈”，**不挡 composition 中途的防抖自动保存**。`applyEdit` 即使 `composingRef.current === true` 也会走 `commitValue` → `scheduleAutosave()`；若 IME 组词中停顿 >800ms，中间态（如拼音串或候选片段）可能被实际持久化。真机 IME 走查应覆盖该场景；若需要更稳语义，应在 composition 期间不调度/挂起 autosave，待 `compositionend` 后统一判一次。

### 4. annotation-popups-autosave.test.tsx 断言非恒真 —— 有效

逐条核对：

- 成功链断言 `apiUpdate` 1 次、`pushUndo` 1 次、二次停顿不重复 pushUndo、不收层、标记在场——任一环节缺失都会红。
- 失败链断言 `markTabDirty`、`showToast`、编辑器在场、「保存失败」——若 catch 缺失或返回值错误都会红。
- W-A 正向用例：若 autosave 不置 busy，则「保存」按钮不禁用、点击会产生第二次 `apiUpdate`，`toHaveBeenCalledTimes(1)` 会红，不是恒真。
- W-A 反向用例：若 busyRef 守卫被破坏，1600ms 窗口内会产生第二次 API 调用，`toHaveBeenCalledTimes(1)` 会红，变异 D 红证也印证了这点。

另：报告 §2 表格写“接线面 6 用例”，但附录 B 实际为 4 用例，数字口径有小出入，不影响测试效力。

---

**总评：0B/0W/4N。四项门二复核点（W-A 主竞态、N-A 三分支、N-B 幂等边界、拆件测试有效性）均与 diff 及红绿证据相符，可放行收口；4 条 N 均非阻断。收口后建议补一次真机 IME 走查，重点看组词中停顿是否触发中间态保存。**