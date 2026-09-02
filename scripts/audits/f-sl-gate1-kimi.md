[routing]: run=20260902124707-bfd1 source=kimi-main model=kimi-k3 switches=0 usage=in=12770,out=6352 latency=198353ms (by ds-call.mjs 链)

# F-SL 门一对抗审查结论

**B:0 / W:2 / N:3** — 实现与票面五层规约逐条对账未发现硬偏差；两处存疑项（接线帧同步依赖 SelectionLayer 未证前提、no-op 与 pushUndo 错配面）无法自本材料包证伪，列为 W 而非 B；三处报告/证据层小瑕疵记 N。

---

## 一、母本符合度核验（六问 1-3，逐项过）

**1. 行为层三条全中**：
- per-paperId 寻址不读 activeId：reader.store.ts:397-404 实现体 `const tab = tabs[paperId]; if (tab === undefined) return; set({...})`——全文无 activeId 引用 ✓
- tab 缺席 no-op：`if (tab === undefined) return` + 边界注释（口径照 undo :458「DB 已落，重开自 DB 读对齐」）✓
- 接线闭包同帧捕获：ReaderPage.tsx:189 `onSaved={(a) => addAnnotation(paperId, a)}`，paperId 与 :190 props.paperId 同一 JSX 表达式同一渲染作用域 ✓
- 与 undo 范式同构：undo=await 前捕获+await 后 `tabs[paperId]` 核对；addAnnotation 为同步 action，「捕获」上移至接线层闭包、「核对」在实现体——结构对应成立 ✓
- SelectionLayer props 契约零改：diff 未触 SelectionLayer ✓；update/removeAnnotation 未动（票面声明在案）✓
- 死代码纪律：旧单参形态接口/实现同步消除，tsc 在 verify 链保证调用面清零（f-sl-verify exit=0）✓

**2. 红绿证据自洽性复核（重点演算）**：
- 首红 4 红构成可复现：红相=测试已改双参+实现未动。旧实现 `addAnnotation(a)` 收到 `'p-1'` 字符串入列表→undo-race :76 `a-2` 断言 false（与 red.raw 摘录:76 完全吻合）✓；:114 组（无 tab）旧新皆 no-op 故绿，报告解释成立 ✓。计数 4+1099=1103 ✓
- 变异 M1 恰 2 红的独立性核验：M1=保留双参签名但忽略 paperId 走 updateActiveTab（报告疑虑②「void paperId 占位」佐证此形态）。此形态下 :91 组 activeId=p-1 仍落对 tab→绿；undo-race 全程 activeId=p-1→绿；用例①落 p-2→红；用例② p-2 被污染（:509 `toEqual([])` 失败，与 mutation.raw 摘录行号吻合）→红。**恰 2 红与证据一致，变异锁定面独立成立** ✓
- 绿=1103=基线 1101+新 2 ✓

**3. 防恒真断言价值**：用例① `expect(activeId).toBe('p-2')` 先于写操作——若 activateTab 失效则测试在错误前提上绿；用例② `expect(tabs['p-1']).toBeUndefined()` 同理。两处前置断言位置正确 ✓

## 二、存疑项（W）

【W-1｜接线帧同步的未证前提——ReaderPage.tsx:189】票面与报告的核心推演「onSaved 闭包 paperId=发起帧值」成立**仅当** SelectionLayer 的 save 在 await 后从**发起帧渲染闭包**读取 onSaved/props.paperId。若 SelectionLayer 内部对 onSaved 采用 latest-ref 模式（每渲染刷新 ref，await 后取最新），则闭包捕获的是**切走后新帧**的 paperId，幽灵标注依旧——且本票全部新测试只锁 store 层签名行为，e2e=单 tab 语境，**无任何测试能捕获此形态**。材料包未含 SelectionLayer.tsx 源码摘录，无法证伪。注：若 SelectionLayer.save 为组件体内普通函数（每渲染新闭包、in-flight 调用绑定旧帧），则 paperId 与 onSaved 同源旧帧、修复完备——从「修复后测试全绿+既有语义无回归」间接支持该形态，但非直接证据。**不确定，建议主控要求补充 SelectionLayer save 函数对 onSaved 引用方式的一行源码佐证。**

【W-2｜no-op 与 pushUndo/clearTabDirty 的残余错配——SelectionLayer.tsx:214/:216（票面引用）】六问 2③：tab 已关路径下 addAnnotation no-op（内存无该标注），但 SelectionLayer 仍按 props.paperId pushUndo（create 型条目）+clearTabDirty。后果推演：undo 栈若随 closeTab 清除则无害；若不清除，重开 tab 后该 undo 条目可对一条「重开自 DB 读入、用户本次会话未见其诞生」的标注执行删除——语义可辩护（撤销其保存动作）但属新引入的不对称（修前同场景=错 tab 追加，更坏）。票面将此面声明为「既有正确不动」，扫描报告未覆盖 undo 栈跨关 tab 生命周期。材料包无 undo 栈清理时机证据，**存疑，倾向无害残余**。

## 三、报告/证据层瑕疵（N）

【N-1｜票面 §四.3 的 grep 义务未在报告中显式回执】票面要求「grep tests/ 确认是否有断言 onSaved 接线的既有测试，有则同步（预期无）」。实现报告 §一~§七无任何一句回执该 grep 是否执行及结果。后果轻微（若有此类测试，typecheck/全量绿必爆），属报告诚实性栏目漏项而非隐瞒——红绿证据本身旁证「预期无」成立。

【N-2｜行号引用小幅漂移】报告称头注改动在 :49（diff hunk 实为 @@ -46,9+46,12，落点 46-54）、接口声明 :154（hunk @@ -151,7+154,11，addAnnotation 新 JSDoc 起~:157）。均为同 hunk 内 1-3 行漂移，不影响定位，记 N 提醒后续票面引用习惯。

【N-3｜INV-52 行混入 diff 的计数表述】--stat「70 insertions」含 INV-52 一行（F-D4 面），报告 §二已如实声明「invariants.md 计数含 F-D4 既有未提交行，我的 INV-03 改动=单行替换」——披露充分，但材料包自身 diff 隔离声明（「已按 F-SL 文件清单隔离」）与该事实有张力：隔离到文件级而非 hunk 级。工作区声明已预告，不升级。另核：INV-03 扩写段格式（「写方向同族（2026-09-02 F-SL）：…双先例=…」）与既有 per-tab 变体段同构，先例列/锁定列同步更新 ✓。

## 四、宪法红线核验（六问 5）

- 受锁流程：unlock(237)→改→apply(exit=0)→check 绿，顺序在案；无新受锁路径未 generate ✓；F-D4 残留登记（236→237）=预裁项 5 已裁定保留，不重复攻击 ✓
- 新 describe always-active 不经 guardedDescribe，头注声明照 F-ARCH1 先例（K3 纪律）✓
- 禁裸 npx vitest：red/green/mutation 均声明 `npm run test` 全量口径，raw 尾部 exit 码在案 ✓
- 中文注释/UTF-8/禁新依赖：quality 关绿+文件清单无 package.json ✓
- 行数：store 483≤500、ReaderPage 228≤250 ✓

---

**放行判定：放行**。回炉点=无；两项 W 均非阻断（W-1 建议主控以一行 SelectionLayer save 源码佐证销项，W-2 建议登记为无害残余候选），三项 N 为报告层瑕疵不涉实现正确性。