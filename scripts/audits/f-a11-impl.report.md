# F-A11 实现者报告 —— 笔记编辑 UX 双缺（保存反馈 + 撤销/重做）

> 三屋实现者子代理产出。票面：registry F-A11（2026-09-09 真机反馈「添加笔记后关闭，
> 保存选项未出现，也未找到撤回/恢复按钮」）。定性：非丢数据（comment 已落盘，
> 自动保存在位但零反馈）——缺项①保存状态反馈 ②编辑器撤销/重做按钮对。
> **门一回炉轮（Kimi 0B/2W/9N）已处置**：W-1 跨格静默丢写修复 / W-2 failed 闭环
> 用例 / N-6 IME composition 值栈粒度——见 §1a/§3a/§5a/§7 追加段。
> **门二回炉轮（deepseek 0B/1W/3N）已处置**：W-A busy 串行互斥 / N-A 失败轮回退
> clean / N-B end 后同值 change 幂等锁——见 §1b/§3b/§5b/§7 追加段；N-C 取证
> 缺口以附录 A/B 测试全文补齐。

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

## 1a. 门一回炉修复（2026-09-09 二轮）

- **W-1（升必修）跨格静默丢写**：fireAutosave else 分支（在途 resolve 时值已变）原只
  `setSaveState('dirty')`——若期间值回退到 lastSaved 走 clean 分支撤了 timer，resolve 后
  无任何重挂→当前值（回退态）永不落盘。修复=else 分支补 `if (timerRef.current === null)
  scheduleAutosave()`（timer 已撤才挂，不重置 dirty 路径既有防抖计时）。新用例锁全序列：
  输入 x→在途→undo 回 lastSaved→resolve（lastSaved 前进为 x）→防抖重挂→800ms 后第二次
  onAutosave 收到回退值→已保存。
- **W-2** failed 闭环用例补齐：failed 标记→再输入（标记清除、dirty）→再存 true→已保存。
  该用例在现实现上**即绿**（闭环后半格首给实现已正确）——作回归锁，其可失败性由状态机
  面任一破坏触发（failed 不回 dirty/标记不清除即红）。
- **N-6** IME composition 值栈粒度：React 受控 textarea 组词期每片段一次 onChange，原实现
  会把「我是奶龙」拆碎入栈。修复=composingRef+preComposeRef：compositionstart 快照组词前
  值、期间 onChange 不入栈（值/防抖照常）、compositionend 以「快照→终值」整段一步入栈。
  新用例：jsdom CompositionEvent 模拟两片段，断言组词期 undo 禁用、end 后 undo 一步回退
  整段、redo 复原整段。

## 1b. 门二回炉修复（2026-09-09 三轮）

- **W-A（必修）autosave×手动写并发覆盖**：autosaveComment 走 busy 毫秒级串行——开头
  `busyRef.current` 挡（实时读，非 prop 直读：编辑器防抖 timer 闭包捕获旧渲染 props，
  直读 busy 会漏挡反向竞态）→ `setBusy(true)` … `finally setBusy(false)`。autosave 在途
  =「保存/删除/取消」按钮 disabled 即互斥（用户无感）；手动链在途时 autosave 到期被
  busyRef 挡（返回乐观 true，见自裁⑰）。undo/redo 按钮照旧不禁用（本地值操作，
  savingRef 已挡并发写）。**原「后台静默不动 busy」语义经门二裁决变更为 busy 串行**。
  竞态用例×2（正向：autosave 在途→手动按钮禁用 click 零写；反向：手动在途→autosave
  被挡→store 终值=手动值+收层）。
- **N-A 失败轮回退误置 dirty**：fireAutosave 结果三分支化——值=本轮存值→saved/failed；
  值=lastSaved（仅失败轮可达，成功轮 lastSaved=本轮值已被首分支排除）→clean 不重挂；
  否则 dirty+W-1 重挂。补序列用例（失败轮在途回退已存值→resolve false 后零写零标记
  →再输入重试链正常）。**区分性申报**：该用例在修复前后行为面等价（clean 与 dirty
  在无标记/零写观测上同形），修复=内部状态卫生；用例锁回归面防退化。
- **N-B end 后同值 change 幂等**：首给 applyEdit 的「值未变短路」（`next ===
  commentRef.current` return）已天然覆盖——end 后携带终值的 change 被短路不入栈。
  本轮补用例锁「start→change→end→再同值 change→undo 仍一步整段回退」（即绿回归
  锁）。**真机走查项**（jsdom 无法全仿真 IME）：真机中文输入→undo 一步回整段、
  保存标记正常——交主控收口走查。

## 2. 文件清单（改动面）

| 文件 | 性质 | 说明 |
| --- | --- | --- |
| src/renderer/features/reader/AnnotationEditor.tsx | 改（票面授权） | 状态机+防抖+值栈+标记+按钮对+composition |
| src/renderer/features/reader/AnnotationPopups.tsx | 改（票面授权「如需」） | autosaveComment+接线+busy 串行+头注 |
| tests/unit/renderer/annotation-editor-ux.test.tsx | 新增（票面授权路径） | 编辑器件 14 用例，always-active（无 guardedDescribe） |
| tests/unit/renderer/annotation-popups-autosave.test.tsx | 新增（门二轮拆件） | 接线面 6 用例（成功/失败链+W-A 竞态×2 等） |
| scripts/audits/f-a11-red.raw.txt / -green.raw.txt / -mutation.raw.txt | 新增（报告契约） | 三段证据原始输出 |
| scripts/audits/f-a11-mutation2.raw.txt | 新增（回炉轮） | 变异 C（W-1 修复面）红证 |
| scripts/audits/f-a11-mutation3.raw.txt | 新增（门二轮） | 变异 D（W-A 修复面）红证 |

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

## 3a. 回炉轮 TDD 增补

- 三新用例先跑：**W-1 红、N-6 红、W-2 即绿**（16 用例 14 绿 2 红）——W-2 定性见 §1a
  （闭环后半格首给已正确的回归锁，非恒真：状态机破坏即红）。
- 修复后 16/16 绿；全量套 **157 文件 / 1482 用例**（1479+3，增量=新用例数一致）；
  typecheck 双 tsconfig 绿、eslint 两改件 CLEAN。
- 行数复测：AnnotationEditor 总行 298 / **code=236 ≤250**（ESLint skipComments/
  skipBlankLines 同口径）；测试件 512 行。

## 3b. 门二轮 TDD 增补

- 四新用例先跑定性：**W-A×2 红**（无 busy 串行——正向按钮不禁用/反向二写并发）、
  **N-A/N-B 即绿**（行为面回归锁：N-A 见 §1b 区分性申报；N-B 首给 applyEdit 幂等
  短路已覆盖）→ 实现 W-A（busyRef 串行）+N-A（clean 分支）→ **20/20 绿**。
- W-A 用例 harness 裁量：busy 是宿主单向 props——测试以 props-holder+setBusy/
  setEditing 回灌重渲染模拟宿主 state 往返（否则按钮禁用/收层断言结构性不可达）；
  setEditingSpy 以链式包裹保断言面。
- 全量套 **158 文件 / 1486 用例**（1482+4；文件 +1=门二轮拆件，见自裁⑲）。

## 4. 测试证据（scripts/audits/f-a11-green.raw.txt）

- 目标文件：**20/20 绿**（annotation-editor-ux 16=①自动保存反馈 11+②撤销/重做值栈
  含 IME×2 5；annotation-popups-autosave 4=成功链/失败链/W-A 竞态×2）。
- 全量单测：**158 文件 / 1486 用例全绿**（基线 156/1466 +2 文件（拆件）+20 用例，
  增量核对一致）。
- `npm run typecheck` 双 tsconfig 绿；`npx eslint` 四件 CLEAN。
- 行数口径（ESLint max-lines 同口径 skipComments/skipBlankLines，脚本实测）：
  AnnotationEditor **code=238 ≤250**（总行 302）；AnnotationPopups code=138（总行 203）；
  测试件 445/295 总行均 <500。
- 乱码自查：中文 grep 实测可读（编辑器件 10 处/测试件 19 处命中）；TODO/FIXME/placeholder
  grep 零命中（exit=1）。

## 5. 变异红证（scripts/audits/f-a11-mutation.raw.txt，cp 备份法）

| 变异 | 内容 | 结果 |
| --- | --- | --- |
| A | AnnotationEditor `AUTOSAVE_DEBOUNCE_MS` 800→1600 | **7 红**（防抖时序断言拦截） |
| B | AnnotationPopups pushUndo 会话守卫条件→`if (true)` | **1 红**（「成功链…会话单 entry」用例拦截） |

还原：双文件 `diff` 备份**空**（RESTORE DIFF EMPTY）；备份副本已清除（不驻留 repo）；
还原后 13/13 复绿。

## 5a. 回炉轮变异红证（scripts/audits/f-a11-mutation2.raw.txt，cp 备份法）

| 变异 | 内容 | 结果 |
| --- | --- | --- |
| C | fireAutosave else 分支 W-1 重挂 `scheduleAutosave()` → `undefined` | **1 红**（「在途保存×期间回退 lastSaved」跨格用例拦截） |

还原：`diff` 备份**空**；备份清除；还原后 16/16 复绿。（注：回炉轮先红跑中 W-1 用例在
未修复代码上的红，与变异 C 互为印证——同一路径的两端证据。）

## 5b. 门二轮变异红证（scripts/audits/f-a11-mutation3.raw.txt，cp 备份法）

| 变异 | 内容 | 结果 |
| --- | --- | --- |
| D | autosaveComment busyRef 守卫 `if (busyRef.current)` → `if (false)` | **1 红**（「W-A 竞态（反向）」用例拦截：autosave 不再被 busy 挡→二写并发） |

还原：`diff` 备份**空**；备份清除；还原后 20/20 复绿。（W-A 正向用例在未修复代码上的
先红跑与变异 D 同理互为印证。）

## 6. 自动保存状态迁移表（宪法前置）

| 态 | 进入 | 行为/标记 |
| --- | --- | --- |
| clean | 挂载（comment=初始） | 无标记、无 timer |
| dirty | 输入/撤销/重做后值≠lastSaved | 无标记；起 800ms 防抖 timer |
| saving | timer 到期且值≠lastSaved 且无在途保存 | 调 onAutosave(值)；标记不在场 |
| saved | onAutosave resolve true 且期间无新输入 | 「已保存」标记；lastSaved=本轮值 |
| failed | resolve false 且期间无新输入 | 「保存失败」标记；再输入→dirty 可重试 |
| dirty（←saved/failed/saving） | 保存在途期间续输 | 在途结果不作废 dirty：resolve 后按「当前值≠本轮存值」判废落 dirty；若防抖已被回退路径撤除则**重挂**（W-1），防抖已由输入重挂 |
| clean（←saving，N-A） | 失败轮在途期间值回退到 lastSaved（resolve false） | 无待存落 clean 不重挂（成功轮不可达：lastSaved=本轮值已被首分支排除） |
| clean（←dirty） | 值回退到 lastSaved（含初始值） | 撤 timer，零发出 |

跨格序列锁：测试「保存中续输」用例（d1 在途续输→d1 resolve 不显标记→800ms 后 d2 存新值→标记）
与「回退到初始值也再存」用例。串行化：在途中 timer 再到期→重挂 800ms（不并发写）。
手动「保存」按钮走原 onSave 语义（保存+收层），不进本状态机；Escape/「取消」原 onCancel
丢弃语义零改（不做 flush，防语义漂移）。

## 7. 自裁申报（一切超票面决定）

1. **触发判据=与 lastSaved（上次已存值）不同**。**措辞更正（门一 N-2）**：此判据为
   实现者自裁优化，票面原文并无「与初始值不同」字样——首给报告 §7-① 中「非票面字面」
   的表述系对照派发转述材料所致，本节更正。裁量理由不变：若以初始值为静止参照，
   「已自动保存 x 后回退到初始值」场景不再触发→库留 x 而回退永不落盘，且回退路径可由
   本票新增的 undo 按钮直达；lastSaved 初值=初始 comment，未改不动语义保持。测试
   「回退到初始值也再存」+W-1 跨格用例锁定。
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
13. **W-1 重挂取条件式**（`timer 已撤才挂`）而非无条件 scheduleAutosave：无条件版会把
    dirty 路径的既有防抖计时重置到 resolve 时刻（功能对但语义漂移）；条件式精准只补
    「clean 回退撤 timer」的丢写路径。
14. **N-6 入栈时机取 compositionend 同步点**：Chrome/Firefox 组词终值在最后片段的
    input/change 里已就位、end 后无额外 onChange，end 同步入栈即可一步整段；end 后若有
    浏览器再补一次同值 change，被 applyEdit 的「值未变」短路挡住，不产生碎步。
15. **composition 期间不拦 undo/redo 按钮**：真实 IME 中点击工具行会先由浏览器结束
    composition（自动 end，快照-终值序保持）；jsdom 手造「组词中点按钮」序列属病理面
    不测不挡（挡=给本地值栈加 composing 锁，收益为负）。
16. **W-A busy 挡读 busyRef 而非 prop**：编辑器防抖 timer 闭包捕获旧渲染的 props
    （onAutosave 箭头→旧 autosaveComment 闭包→旧 busy prop），prop 直读在反向竞态
    （手动先、autosave 后到）漏挡；busyRef 每渲染同步、调用时读现值，旧闭包亦命中。
17. **busy 时 autosave 返回乐观 true**（非 false）：busy 只来自手动保存（将存同值——
    lastSaved 前进与手动链终值一致）或删除（编辑器将收层，无观测面）；返回 false 会
    在用户无过错的毫秒窗内闪「保存失败」+markTabDirty 假信号。
18. **W-A 用例 harness=props 回灌重渲染**：busy/editing 是宿主单向 props，静态 mock
    setBusy 不回灌则按钮禁用/收层断言结构性不可达——测试内以 props-holder+重渲染
    模拟宿主 state 往返（测试形态裁量，非产品面）。
19. **门二轮拆件**：annotation-editor-ux.test.tsx 达 587 行超 ESLint max-lines 500——
    接线面（describe③+mocks+W-A）拆出 annotation-popups-autosave.test.tsx（新文件
    属票面「新增测试文件 tests/unit/renderer/ 下」授权路径）；拆后 445/295 双合规。

## 8. 疑虑（未处理项，交主控/门审裁量）

1. ~~**手动保存在途+自动保存并发**~~ **已消解（门二 W-A）**：busy 串行互斥落地
   （busyRef 挡+按钮 disabled），双向竞态用例×2+变异 D 锁定。残余边界：autosave
   setBusy(true) 同步段至 React flush 间的微任务窗内单线程无并发入口，安全。
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

缺项①②均落地且被 20 用例+四变异红证（A/B/C/D）锁定；全量单测 158/1486 绿、
typecheck/lint 绿。两轮回炉（门一 W-1/W-2/N-6；门二 W-A/N-A/N-B）全数处置。
改动面=票面授权两件+两新测试文件+五审计档。无 BLOCKED。

## 附录 A：tests/unit/renderer/annotation-editor-ux.test.tsx 全文（门二 N-C 取证缺口补齐）

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
 *   Ctrl+Shift+Z 拦截接值栈 + 100 步上限 + IME composition 整段一步。
 * AnnotationPopups 接线面（含 [W-A 门二] busy 串行竞态）在
 * annotation-popups-autosave.test.tsx（门二轮拆件——本件曾超 max-lines 500）。
 * React act 环境对齐 annotation-layer.test.tsx 既有形态；输入模拟对齐
 * lineage-tag-edit.test.tsx（native value setter + input 事件）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationEditor } from '../../../src/renderer/features/reader/AnnotationEditor'

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

  it('在途保存×期间回退 lastSaved（W-1 跨格）：resolve 后防抖重挂 → 第二次收当前值落盘', async () => {
    const d1 = deferred<boolean>()
    const onAutosave = vi.fn((c: string) => (c === 'x' ? d1.promise : Promise.resolve(true)))
    renderEditor({ annotation: makeAnnotation('orig'), onAutosave })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    // 在途（saving(x) 未 resolve）时 undo 回初始值=lastSaved → clean 分支撤 timer
    act(() => {
      undoBtn().click()
    })
    expect(textarea().value).toBe('orig')
    await act(async () => {
      d1.resolve(true)
      await vi.advanceTimersByTimeAsync(0)
    })
    // lastSaved 已随 resolve 前进为 x，当前值 orig≠x——无标记且必须重挂防抖
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(2)
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'orig')
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('failed 闭环（W-2）：失败标记 → 再输入 dirty 无标记 → 再存 true → 已保存', async () => {
    const outcomes = [false, true]
    const onAutosave = vi.fn(() => Promise.resolve(outcomes.shift() ?? true))
    renderEditor({ onAutosave })
    typeInto(textarea(), 'a')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(savedFlag()?.textContent).toBe('保存失败')
    typeInto(textarea(), 'ab')
    expect(savedFlag()).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'ab')
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

  it('失败轮在途回退已存值（N-A）：resolve false 后零写零标记，再输入重试链正常', async () => {
    const d1 = deferred<boolean>()
    const outcomes = [d1.promise, Promise.resolve(true)]
    const onAutosave = vi.fn(() => outcomes.shift() ?? Promise.resolve(true))
    renderEditor({ annotation: makeAnnotation('orig'), onAutosave })
    typeInto(textarea(), 'x')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    // 失败轮在途：undo 回初始值=已存值（clean 撤 timer）
    act(() => {
      undoBtn().click()
    })
    expect(textarea().value).toBe('orig')
    await act(async () => {
      d1.resolve(false)
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(savedFlag()).toBeNull()
    // 值已回退到已存值：不再重试不再空写
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(onAutosave).toHaveBeenCalledTimes(1)
    // 再输入：重试链恢复正常
    typeInto(textarea(), 'y')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(onAutosave).toHaveBeenNthCalledWith(2, 'y')
    expect(savedFlag()?.textContent).toBe('已保存')
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

  it('IME composition（N-6）：两片段期间不入栈，end 后整段一步——undo 一步回退整段', () => {
    renderEditor()
    const ta = textarea()
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    typeInto(ta, '我是')
    typeInto(ta, '我是奶龙')
    // 组词期间：片段不入栈（undo 禁用）
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(undoBtn().disabled).toBe(false)
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    expect(ta.value).toBe('我是奶龙')
  })

  it('IME end 后同值 change（N-B）：幂等不入栈——undo 仍一步整段回退', () => {
    renderEditor()
    const ta = textarea()
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    })
    typeInto(ta, '我是')
    typeInto(ta, '我是奶龙')
    act(() => {
      ta.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    // 浏览器序变体：end 后再派发携带终值的 input/onChange
    typeInto(ta, '我是奶龙')
    act(() => {
      undoBtn().click()
    })
    expect(ta.value).toBe('')
    expect(undoBtn().disabled).toBe(true)
    act(() => {
      redoBtn().click()
    })
    expect(ta.value).toBe('我是奶龙')
  })
})
```

## 附录 B：tests/unit/renderer/annotation-popups-autosave.test.tsx 全文（门二 N-C 取证缺口补齐）

```tsx
// @vitest-environment jsdom
/**
 * [F-A11] AnnotationPopups 自动保存接线面测试（自 annotation-editor-ux.test.tsx
 * 拆出 2026-09-09 门二轮——该件超 ESLint max-lines 500；本件锁接线行为）。
 *
 * 锁：自动保存=saveComment 静默变体（api 链+store 同步+pushUndo 会话单
 * entry、不 setEditing 收层；失败 markTabDirty+toast）+ [W-A 门二] busy
 * 毫秒级串行互斥（autosave 在途→手动按钮禁用零写；手动在途→autosave 被
 * busyRef 挡、store 终值=手动值）。模块替身：api/client、Toast、reader.store、
 * annotation-undo（unwrap 对齐真实语义 await 后判 ok；ApiClientError 双参）。
 * React act 环境对齐 annotation-layer.test.tsx；输入模拟对齐 lineage-tag-edit。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Annotation, AnnotationRect } from '../../../src/shared/models/annotation'
import { AnnotationPopups } from '../../../src/renderer/features/reader/AnnotationPopups'
import { ApiClientError } from '../../../src/renderer/api/client'

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

/** 完整形态最小标注（comment 可覆写——终值断言用） */
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

/** 可控 promise（在途写挂起用） */
function deferred<T>(): { promise: Promise<T>; resolve: (v: T) => void } {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

function savedFlag(): Element | null {
  return host!.querySelector('[data-testid="annotation-saved-flag"]')
}

describe('F-A11 接线 —— AnnotationPopups 自动保存（静默变体）', () => {
  it('成功链：api+store 同步、pushUndo 会话单 entry（两轮停顿仅一次）、不收层、标记已保存', async () => {
    const setEditing = vi.fn()
    mocks.apiUpdate.mockImplementation(async ({ annotation }: { annotation: Annotation }) => ({
      ok: true,
      data: annotation
    }))
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
    const err = new ApiClientError('E_TEST', '保存失败测试')
    mocks.apiUpdate.mockRejectedValue(err)
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

  /** W-A 竞态用挂载器：setBusy/setEditing 回灌 props 重渲染（模拟宿主 state 往返） */
  async function mountPopupsRace(): Promise<{ setEditingSpy: ReturnType<typeof vi.fn> }> {
    const props: Parameters<typeof AnnotationPopups>[0] = {
      menu: null,
      editing: { annotation: makeAnnotation(), rect: RECT },
      busy: false,
      setMenu: vi.fn(),
      setEditing: vi.fn(),
      setBusy: vi.fn(),
      onChanged: vi.fn()
    }
    const rerender = (): void => {
      act(() => {
        root!.render(<AnnotationPopups {...props} />)
      })
    }
    const setEditingSpy = props.setEditing as unknown as ReturnType<typeof vi.fn>
    props.setBusy = (v: boolean): void => {
      props.busy = v
      rerender()
    }
    props.setEditing = (v: typeof props.editing): void => {
      setEditingSpy(v)
      props.editing = v
      rerender()
    }
    rerender()
    return { setEditingSpy }
  }

  it('W-A 竞态（正向）：autosave 在途置 busy → 手动保存按钮禁用、click 零写', async () => {
    await mountPopupsRace()
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    mocks.apiUpdate.mockImplementation(() => d1.promise)
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    typeInto(ta, '自动值')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    const saveBtn = [...host!.querySelectorAll('button')].find((b) => b.textContent === '保存')!
    expect(saveBtn).toBeDefined()
    expect(saveBtn.disabled).toBe(true)
    act(() => {
      saveBtn.click()
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.resolve({ ok: true, data: { ...makeAnnotation('自动值') } })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
    expect(host!.querySelector('[data-testid="annotation-editor"]')).not.toBeNull()
    expect(savedFlag()?.textContent).toBe('已保存')
  })

  it('W-A 竞态（反向）：手动保存在途 busy → autosave 到期被挡，store 终值=手动值', async () => {
    const { setEditingSpy } = await mountPopupsRace()
    const d1 = deferred<{ ok: boolean; data: Annotation }>()
    mocks.apiUpdate.mockImplementation(() => d1.promise)
    const ta = host!.querySelector('textarea') as HTMLTextAreaElement
    typeInto(ta, '手动值')
    const saveBtn = [...host!.querySelectorAll('button')].find((b) => b.textContent === '保存')!
    expect(saveBtn.disabled).toBe(false)
    act(() => {
      saveBtn.click()
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(saveBtn.disabled).toBe(true)
    // 手动链在途（busy）期间 autosave 防抖到期——被 busy 挡，不并发写
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1600)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    await act(async () => {
      d1.resolve({ ok: true, data: { ...makeAnnotation('手动值') } })
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(mocks.apiUpdate).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation).toHaveBeenCalledTimes(1)
    expect(mocks.storeUpdateAnnotation.mock.calls[0]![0].comment).toBe('手动值')
    expect(setEditingSpy).toHaveBeenCalledWith(null)
    expect(host!.querySelector('[data-testid="annotation-editor"]')).toBeNull()
  })
})
```
