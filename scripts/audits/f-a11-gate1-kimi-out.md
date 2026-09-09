[routing]: run=20260909112529-se5w source=kimi-main model=kimi-k3 switches=0 usage=in=11507,out=9240 latency=263526ms (by ds-call.mjs 链)

# F-A11 门一深审结论

## B（阻断）

无。

## W（须修/须裁）

**W-1 状态机跨格缺陷：在途保存成功 × 期间值回退到 lastSaved → 落 dirty 但无 timer，静默丢写**

证据：`AnnotationEditor.tsx` fireAutosave 尾部（≈L108-113，新文件）：

```ts
if (commentRef.current === value) {
  setSaveState(ok ? 'saved' : 'failed')
} else {
  setSaveState('dirty')   // ← 仅置态，未重挂防抖
}
```

配合 commitValue clean 分支（≈L122）`setSaveState('clean'); cancelTimer()`。逐步轨迹：

1. 初始 comment=L，lastSaved=L；
2. 输入 v1 → dirty → 800ms 后 saving(v1) 在途（savingRef=true）；
3. 在途窗口内输入 v2 → commitValue 起 timer；**再删回/undo 回 L** → commitValue 判 `L===lastSaved` → clean + **cancelTimer**；
4. 在途 resolve ok=true → lastSaved=**v1**；`commentRef(L)≠value(v1)` → else 分支置 dirty，**但 timer 已在第 3 步被撤，无任何重挂**；
5. 终态：库=v1，UI=L，编辑器无标记（dirty 不显标记），用户关闭 → **回退内容永不落盘**。

报告 §6 声称「在途结果不作废 dirty：**防抖已由输入重挂**」——该断言在此序列不成立（最后一次输入是回退，走 clean 分支撤了 timer）。这恰是本票「非丢数据」定性下最不该出现的静默失败面。修复一行：else 分支补 `scheduleAutosave()`（对称地，ok=false 且 commentRef≠value 但值已等于 lastSaved 时会置出无谓 dirty，同样由此行顺带收敛）。窗口=api 在途时长，窄但真实可达（本票新增的 undo 按钮是直达路径之一）。**对应测试盲区：13 用例无此序列**——「保存中续输」用例只锁了「续输后保持 dirty」半格，未锁「续输再回退」半格。若门审按票面「非丢数据」定性从严，可升 B，我按窗口窄度暂记 W，交主控裁量。

**W-2 状态表声称的 failed→重试链零锁定**

报告 §6 表「failed｜再输入→dirty 可重试」——13 用例中 resolve false 只锁到「保存失败」标记在场（用例 4），**无「失败后→再输入→再次调 onAutosave→resolve true→已保存」的闭环用例**。状态机跨格序列号称被测试锁定，此格为空。证据：测试文件 describe① 8 用例清单无此项。

## N（申报/低危/不确定）

**N-1 pushUndo 会话守卫的「重开重置」路径无测试。** `AnnotationPopups.tsx` ≈L65-72 `useEffect(..., [editing])` 重置逻辑零覆盖——若重置失效（如 editing 对象身份不变的重开场景），同 id 标注终身只推一条 undo entry，撤销链缺口静默存在。当前接线两用例只锁「单会话单 entry」，未锁「跨会话再推」。

**N-2 自裁①引用了一个票面中不存在的字面。** 报告声称触发判据偏离「票面字面『与初始值不同』」——票面原文（本包 §0）并无此字样，只写「输入停顿后『已保存』标记」。lastSaved 语义本身更优且我认可，但自裁前提虚构，属报告措辞不严谨（D 项诚实性小疵，非代码缺陷）。

**N-3 验收第三支「关闭重开笔记在（回读）」无覆盖。** 实现者已于疑虑③自报并上交主控——门审确认缺口真实：13 用例全为 jsdom 单会话面，无重挂回读链。处置建议：收口时主控补真机走查或 e2e（tests/e2e 锁面），并在收口单显式核销此项。

**N-4 手动保存×自动保存竞态（自报疑虑①）核实属实。** `autosaveComment`（AnnotationPopups ≈L102 起）不查 busy；编辑器侧 savingRef 只串行化自动保存自身，与 saveComment 无互斥。窗口=api 延迟，两值同源时无害，自报透明，附议不加锁。

**N-5 clearTabDirty 无条件清灰点。** autosaveComment 成功路径 `clearTabDirty(a.paperId)`——若序列「A 自动保存失败 markTabDirty → 用户 Escape 丢弃 → 开 B 自动保存成功」，B 的成功会清掉 A 留下的脏标记（A 的改动已被用户丢弃，语义可说通，但脏点≠落盘态）。与 saveComment 对称属既有模式，低概率，记录备查。

**N-6 metaKey（Cmd）路径自裁⑤申报但无测试**（测试只锁 ctrlKey）；IME composition 未处理——React 是否抑制 composition 中间值的 onChange 我**不确定**，若不抑制，中文输入（本票原始反馈恰是中文「我是奶龙」）每个 composition 片段入栈，undo 粒度异常，建议主控真机走查时顺带验证。

**N-7 行数口径（自裁⑪）无法从 diff 验证。** 总行 270 > 250 字面；code=216 合规结论依赖仓内 ESLint max-lines 确为 skipComments/skipBlankLines 配置——报告 lint CLEAN 是旁证但非配置直证。若门禁按物理行，回炉拆 EditorToolbar，附议其实施者申报口径。

**N-8 接缝（工单 E）：AnnotationEditor 新增必填 prop `onAutosave`，其他调用点/AiAnnotationLayer 是否复用本编辑器无法从 diff 证实。** typecheck 绿旁证当前无断点；若 AI 批注链复用此编辑器，其自动保存行为是否期望（AI 生成批注也会被 800ms 防抖写库）需主控确认。

**N-9 变异面偏薄但合规**：仅 2 个变异（防抖常量、会话守卫），未覆盖「else 分支置 dirty 无重挂」这一恰是 W-1 所在的跨格面——变异 B 的 1 红依赖单用例，脆弱但现状成立。

## 自裁 12 项对 diff 核实（D 项速览）

① 语义属实（措辞瑕疵见 N-2）②③④⑤⑥⑦⑧⑨⑩⑫ 全部与 diff/测试件一致；⑪ 见 N-7。疑虑 4 项均属实，无瞒报。**报告诚实性整体良好。**

## 统计

B=0 / W=2 / N=9；自裁 12 项核实 11 属实 + 1 措辞瑕疵；疑虑 4 项核实 4 属实。

## 一行总评

双缺项落地、TDD 与变异证据链完整、自裁透明，但状态机存在「在途保存成功×期间回退至已存值」的跨格静默丢写缺陷（W-1）且恰落在测试与变异双盲区——建议 else 分支补 scheduleAutosave 一行修复并补锁该序列后放行。