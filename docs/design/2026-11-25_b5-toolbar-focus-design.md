# B5 设计稿——脉络工具栏与模式/聚焦改版

日期：2026-11-25  
状态：设计冻结候选；待用户过目与审查门，未进入实现  
范围基线：仓外 `plan-v1.md` §7；本稿同时落实任务给定的 B4 承接面与 2026-11-25 会话内用户裁决  
实施边界：本稿只规定 B5；不修改 B4 历史设计稿，不在本批实现 reader 域票 `F-ANNOSAVE-01` 或测试票 `F-UNDOTEST-01`

## 1. 代码事实、规划差异与设计边界

### 1.1 现行代码事实

以下事实均在 2026-11-25 只读核对现行工作树；行号是本次定位锚，不作为永久链接。

1. **工具栏仍是两宿主、按模式隐藏。** `LineageTimeline.tsx:158-162` 把 `LineageToolbar` 挂在 `.timeline` 内，`LineagePage.tsx:154-167` 另渲染 `LineageModeBar`。`LineageToolbar.tsx:68-79` 在 browse/focus 只返回 drag-hint；保存、历史和编辑工具只在 edit 可见。`ZoomBadge.tsx` 仍是右下角绝对定位角标，并监听 `.timeline` 横纵滚动做 transform 补偿。
2. **loading/error 会丢工具栏。** `LineagePage.tsx:129-151` 在 loading/error 早退；因此模式、保存、历史和侧栏开关没有稳定外壳。可见 loading、主图空态、子图空态、详情占位与底部教学文案仍分别存在于 `LineagePage.tsx`、`LineageTimeline.tsx:199-201`、`LineageSidePanel.tsx:92-101,213-218`。
3. **mount 与退聚焦仍执行旧 P-1/P-3。** `lineage-view.store.ts:176-185` 从 focus 切到 edit/browse 时清 `focusSet`；`:221-227` 的 `resetForMount` 恒把 mode 写成 browse。`LineageModeBar.tsx:59` 直接以 `focusSet.length` 显示「聚焦 N」。
4. **B4 已完成 per-folder 挂起，不应回退成全局单集合。** `lineage-session-registry.ts:278-287` 在切图时把活动 `focusSet` 挂到离场会话，再恢复目标图集合；活动图集合的存储仍是 `lineage-view.store`，挂起图集合在 `entry.data.focusSet`。这一归属由 INV-188 约束，B5 只改生命周期和成员有效性，不新建第二份 per-folder 状态。
5. **C3 死 id 路径成立。** `toggleFocus`、`clearFocus`、`setMode` 都不按图成员剪枝；`lineage-history-unit.ts:137-172` 成功回写 nodes/edges/floatingNotes 时也不处理 focusSet。聚焦已恢复卡后重做删除，会把已不存在的 node id 留在集合中；计数和 `.focused` 投影因此失真。
6. **C1 两源共用错误字段。** 普通写在 `lineage-write-queue.ts:258` 写 `saveStatus='error'` 与 `lastWriteError`；history 在 `lineage-history-unit.ts:212-225` 写同一对字段；reconcile/finalize 也在 `lineage-session-lane.ts:149-163,267-304` 复用它们。`lineage.store.ts:167-169` 的 `retrySave()` 恒调用 `finalize()`，`LineageToolbar.tsx:174-187` 又对任何 error 都显示该重试钮，因此 history/redo 失败后的通用重试会显式定稿并清 redo/U。
7. **C2 当前确为三相并集。** `lineage-io-phase.ts:34-36` 的 `ioUnsettled=Q∨F∨saveStatus!=='clean'`。它同时供 `registry.ioDirty`、`app/quit-flush.ts`、`app/workspace-switch.ts` 使用，`use-save-aggregates.ts` 又把同一 `lineageDirty` 分别送入 quitDirty 与 lineagePending。因此 Q0/F0 的 error 会同时卡退出、课题切换和 INV-91 结构写。
8. **Q0/F0 error 不只有 history 一个代码出口。** 除 history-unit 零写失败外，`runReconcile` 可在 Q0 时以 error 收尾；finalize 的 `conflictTouched` 分支也可能在队列已排空后写 error。用户已裁决 C2=B，本稿不擅自给这些路径保留例外，而是把它们列入同一两源语义的测试矩阵。此处的代码事实补充不改变裁决。
9. **focus dim 链比 §7.4 表多两层。** 除 `focus-bright.ts`、`timeline-interactions.ts`、`TimelineYears.tsx`、`LineageTimelineCard.tsx`、`EdgeOverlay.tsx` 和 CSS 外，`edge-overlay-geom.ts:96-104` 的 `edgeVisualOpacity` 也接收 `focusDim`；`lineage-edge-overlay.test.tsx`、`lineage-edge-edit-r2.test.tsx` 锁了旧参数或 `.dimmed-focus`。无 dim 必须一并删除这些旧契约。
10. **focus 态边 hover 不能随 dim 误删。** `EdgeOverlay.tsx` 目前以 `focusDim` 兼任 focus 模式 hoverScan 开关。新实现须把 `focusMode` 交互信号与 dim 视觉信号分开；拖拽时的 `.tl-edges.dimmed`、错峰 fade、选中边和 browse 线名 tooltip 不属于本次退役面。
11. **两侧栏状态来源不同。** 左栏 collapsed/width 在 `lineage-view.store`，`LineageNavPane` 自己读写 per-folder prefs；右栏 `useSidebarPane` 在 `LineageAsideHost` 内部持态并持久化。工具栏接管开关时，右栏 hook 必须上提到 Page 组合层，左栏收起动作必须继续写 prefs，不能只改 Zustand 而丢持久化。
12. **F-KEEPOPN-01 的现时实现仍是后置 local state。** `use-note-edit-session.ts:235-245` 先 `submitDraft` 写 store，再 `setKeepOpen(true)`；`LineageFloatingNotes.tsx:104-114` 以 `!saving||keepOpen||composing` 决定 textarea 是否在场。jsdom 的 `act` 合批不能证明真机不失焦。
13. **reader 局部保存钮仍存在。** `AnnotationEditorActions.tsx:72-78` 仍渲染 `annotation-editor-save`，`AnnotationPopups.tsx:101` 仍接 `saveComment`。2026-11-25 用户已把闭环方式改为**删除该局部保存钮**，由 `F-ANNOSAVE-01` 在 reader 域承接，不随 B5 改代码。

### 1.2 文档引用核对

- 任务输入把 INV-160 描述为 focusSet 的 per-folder 前后文；现行 INV-160 实际是「非自有 recovery 文件不自动删」。真正的 per-folder 会话写归属是 INV-188。本稿修正引用，不改 INV-160。
- 仓外规划 §14 仍有「保留 dim」旧终裁；本任务输入明确要求无 dim，并要求删除 bright/dim 链。本稿以 2026-11-25 本批任务输入为最新裁决，采用无 dim，不把它重新列为待裁决项。
- §7.5 的「26 文件」不是最终唯一条目数：26 个关键词文件之外又明确补了 `lineage-view-store`、`lineage-c1-viewstore`，必改段还另点名 `lineage-focus-bright`。本稿逐案覆盖 **29 个唯一条目**；新增依赖链测试另表登记。

### 1.3 不改变的边界

- 不新增依赖，不改 `package.json`/lockfile，不新增出网 host，不改 main IPC/schema、数据库结构或 migration。
- 不持久化 mode/focusSet；它们仍只活于应用运行期。导航宽、侧栏宽、收起态、线色等既有 localStorage 语义不动。
- 不回退 B4 的 per-folder 历史、U、queue、inflight、recoveryOwner；不把保存改成 idle-flush 别名；不让 C2 改变「显式保存才清 redo/U」。
- 不放宽 R3；其他写触发的 saving 窗仍卸载悬浮笔记 textarea。IME 合成期不让位与 compositionend 重排 1.5s 不动。
- 不做 B6 reader 工具栏排版、不实现 `F-ANNOSAVE-01`，不做 B7 虚拟化、B8 动画或统一撤销引擎批次。
- 所有方案切换删除旧实现、旧 props、旧 CSS 和旧视觉测试；不保留 dim/no-dim 双路，不保留右下角 ZoomBadge 兼容层。

### 1.4 B4 承接面逐项结论

| 承接项 | B5 结论 | 语义/落点 |
|---|---|---|
| ① C3 focusSet 死 id | **纳入 B5** | 选甲：图态回写单点按当前图 nodes 剪枝；见 §5 |
| ② C1 错误行重试混用 | **纳入 B5** | 选甲：一条告警按失败源分流；保存失败才有保存重试，history 失败指引重按原方向命令；见 §6 |
| ③ R2 偏差⑤ AnnotationEditor 局部保存钮 | **明确延后，`F-ANNOSAVE-01` 承接** | 用户产品裁决=删除批注编辑器保存钮；批注靠 idle 落库，定稿走界面级保存/Ctrl+S；B5 零 reader 改动 |
| ④ F-KEEPOPN-01 | **纳入 B5** | idle 提交与 keepOpen 置位进入同一 `flushSync` 提交批；见 §8 |
| ⑤ R4 browse/focus 无持久出口 | **纳入 B5** | 选甲：告警和 CONFLICT 丢弃出口三模式可见；见 §6、§9 |
| ⑥ R3 keepOpen 窄口径 | **评估后维持现状，无放宽实施面** | 其他写 saving 仍让位；只修自身 idle 提交的重挂缺陷 |
| ⑦ C2 INV-91 error 相位口径 | **纳入 B5，用户选 B** | `ioUnsettled=Q∨F`；Q0/F0 error 不再单独锁退出/切课题/结构写；见 §7 |
| ⑧ 六项测试缺口 | **两项随 B5，四项立票** | browse/focus 被拒呈现、聚焦态重做删除后集合收敛随 B5；其余四项归 `F-UNDOTEST-01` |

## 2. 统一状态模型与全迁移表

### 2.1 状态轴与不变量

| 轴 | 值域与宿主 | B5 不变量 |
|---|---|---|
| mode | `edit` / `browse` / `focus`，`lineage-view.store` | 冷启动=browse；页面挂载不覆写；同次应用运行内跨视图、跨 folder 保持；课题切换成功归 browse |
| focusSet | 有序、去重的 node id 数组；活动图在 view.store，挂起图在 registry entry | 每 folder 独立；只含该图当前 nodes 中的 id；模式切换不清；不写磁盘 |
| folder/session | registry 的 activeFolder + per-folder generation | A→B 只挂起 A、恢复 B；迟到响应只写原会话；成员剪枝也只写原会话 |
| mount/view | 脉络页挂载或卸载，应用其他视图可驻留 | 卸载不清 mode/focus/history/U；重挂只收 tool/palette |
| tool/palette | `select` / `draw-solid` / `draw-dashed` × `paletteFor` | 不同模式切换、切图、重挂时归 select/null；再点当前 mode 是完全 no-op |
| errorSource | `save` / `history-undo` / `history-redo` / `null`，与 lastWriteError 同批写入 | error 的呈现和重试入口只看最近失败源；非法缺源态绝不显示保存重试 |
| IO | queue Q、inflight F、saveStatus phase | `ioUnsettled=Q∨F`；phase 仍用于呈现，不能反推 Q/F |
| note edit | editingId/draft × saving × keepOpen × composing | keepOpen 仅覆盖自身 idle 提交随之而来的 saving 窗；其他写 saving 与 R3 旧口径一致 |

成员有效性采用不变量：

```text
focusSet(folder) ⊆ ids(session(folder).nodes)
```

同一 patch 同时改 nodes 与 focusSet 时，以**patch 后的 nodes**为准。无 id 被删时保留原数组引用；有死 id 时保持幸存 id 的相对加入顺序，不重排、不自动加入新恢复的卡。

### 2.2 mode × focusSet × folder × mount 全事件迁移枚举

记号：`M/N` 为任一模式，`F_A/F_B` 为各图集合，`P(F,nodes)` 为成员剪枝，`T` 为 tool/palette。

**挂载语义只有这一种：** Page 挂载流程会对目标活动集合做一次 `P` 防御剪枝，但 `resetForMount()` action 自身完全不读写 focusSet。挂载顺序固定为 `resetForMount()` 收工具 → registry 的活动会话投影同步口归一化并同步 focusSet；同图 ready 挂载也经过该同步口，但不发 graph IPC。若 F 已合法，`P` 必须保持同值同引用，即恒等 no-op；只有既有死 id 被移除时才生成新数组。Page 不得另写一份 filter，也不得把剪枝塞回 `resetForMount()`。

| # | 旧态与前置 | 事件 | 新态 | 必须保持/清除 |
|---:|---|---|---|---|
| 1 | 应用冷启动，无内存会话 | 创建 view store | mode=browse；主图 F=[]；T=select/null | 不读 localStorage 恢复 mode/focus |
| 2 | 脉络页外；活动图 A；mode=M；F_A 已驻留 | 挂载 LineagePage，目标仍=A | 先由 resetForMount 只收 T；再由 registry 活动投影同步口得到 mode=M、focusSet=P(F_A,nodes_A) | 合法 F_A 同值同引用；死 id 才剪；history/U/zoom/nav 宽和线色不动，ready 同图零新增 graph IPC |
| 3 | 脉络页外；活动图 A；库页目标=B | 挂载并同步目标图 | resetForMount 只收 T；A 的 F_A 挂起；激活 B；mode=M；focusSet=P(F_B,nodes_B) | 走既有 setFolder/flush-first 与统一活动投影同步口；不另写清聚焦逻辑 |
| 4 | 已挂载，M=focus，F 可空或非空 | 组件重渲染/同值效应重跑 | 全部不变 | 禁止把 mount 效应变成隐式 clearFocus 或重复剪枝写 |
| 5 | mode=M，tool/palette 为任意值，F 为任意数组 | 单独调用 `resetForMount()` | mode=M；focusSet 保持原值原引用；T=select/null | 即使 F 含既有死 id，本 action 也不剪；挂载流程的 P 只属于紧随其后的 registry 投影同步口；不覆写 nav/zoom/线色 |
| 6 | mode=M | `setMode(M)` | 完全 no-op | focusSet 与 T 均不变；同值点击不得暗中清集合或收工具 |
| 7 | mode=M，目标 N≠M，F 为当前图集合 | `setMode(N)` | mode=N；focusSet=F；T=select/null | edit↔browse↔focus 全组合都不清 F |
| 8 | focus，F 非空 | 切到 browse 或 edit | 目标模式；F 原样保留 | 再进 focus 时恢复同一集合，不重建第二份 |
| 9 | focus，点真实卡 id，id∉F | `toggleFocus(id)` | F 尾部加入 id；mode=focus | 同时保持既有选中详情联动 |
| 10 | focus，id∈F | 再点同卡 | 从 F 删除 id；mode=focus | 其他 id 次序不变 |
| 11 | edit 或 browse | `toggleFocus(id)` | no-op | 非 focus 不收聚焦事件 |
| 12 | focus，F 非空，图 ready | 点「清空聚焦」 | mode=focus；F=[]；计数消失；按钮禁用 | 只清当前图；不切 browse |
| 13 | 非 focus，或 focus/F=[]，或图非 ready | 点「清空聚焦」 | 控件禁用；若被程序直接调用则无用户语义变化 | 不把它变成模式切换钮 |
| 14 | focus/edit，palette 开或 draw armed | Esc 分层退出 | 先关 palette，再退 draw；mode/F 不变 | Esc 不是清空聚焦入口 |
| 15 | focus，F 非空 | 点画布空白 | no-op | 选中详情既有行为不因清空集合而改变 |
| 16 | A 活动，B 有挂起会话，mode=M | A→B | A.data.focusSet=P(F_A,nodes_A)；激活 B 的 P(F_B,nodes_B)；mode=M；T=select/null | 两图 history/U/queue 归属不动 |
| 17 | A 活动，B 无会话 | A→B | A 集合挂起；B 新会话 F_B=[]；mode=M | 新图不继承 A 的 id |
| 18 | B 活动，A 有挂起集合 | 返回 A | 恢复 P(F_A,nodes_A)；mode=M | 不清 A、不双取 ready 会话 |
| 19 | 任一 mode，活动会话 nodes 将变为 `nextNodes` | 普通删卡、graph load、权威和解、history 成功回写 | nodes 与 `P(F,nextNodes)` 在同一写提交生效 | 计数、清空钮与卡类同帧收敛 |
| 20 | 挂起会话 B，活动为 A | B 的迟到合法 history/graph 回写删节点 | 只剪 B.data.focusSet；A 集合不变 | 孤儿/换代响应仍由 B4 身份准入拒绝 |
| 21 | 某节点曾被聚焦，删除时已剪出集合 | undo 恢复该节点 | 节点恢复；不自动重新加入 F | 删除前的聚焦成员关系不复活 |
| 22 | undo 恢复卡后，用户重新聚焦该卡 | redo 再删除该卡 | 卡删除且 id 同帧从 F 移除 | 若 F 因此为空，停留 focus、计数不显示、其余卡全亮 |
| 23 | 任一 mode/F | graph loading 或 load error | mode/F 保留；数据控件禁用；palette 收起 | 不用状态切换清空内存会话 |
| 24 | 恢复替换某 folder，图代际更新 | `applyRecoverySession`/ghost remap | 目标图按新图态得到合法集合；恢复载入的默认集合为空；mode 不变 | 其他 folder 不动；这是内部图身份替换，不是用户显式清空入口 |
| 25 | 课题切换校验/flush 失败 | workspace switch 中止 | 旧 mode、全部 F、history/U 全保留 | 不执行半清理 |
| 26 | 全量 flush 成功，允许切换课题 | workspace reset | 全部会话与 F 清空；mode=browse；T=select/null | 随后既有 release/switch/reload；新课题不得带旧 id |
| 27 | 任意已登录会话 | 应用退出后再次冷启动 | 按 #1 | 运行期驻留不等于持久化 |

「清空聚焦按钮唯一入口」指**用户显式清空当前图的 UI 入口**；#24 的恢复替换、#26 的课题域重置属于既有内部生命周期，不新增第二个用户按钮，也不与此矛盾。

### 2.3 工具可用性与模式解耦

| 控件 | edit | browse | focus | loading/error 追加门 |
|---|---|---|---|---|
| 三模式钮 | 全部可用 | 全部可用 | 全部可用 | 仍可用 |
| 保存 | 由 B4 `canSave/saveState` 决定 | 同一判据 | 同一判据 | graph 非 ready 禁用 |
| 撤销/重做 | 三模式同一 `canUndo/canRedo`；busy 不禁止排队 | 同左 | 同左 | graph 非 ready/冻结禁用 |
| 选择/实线/虚线/色板 | 可见；flushing 时禁用 | 可见且禁用 | 可见且禁用 | 可见且禁用，不整组消失 |
| 缩放 −/%/+ | 可用，50%–200% | 同左 | 同左 | 非 ready 禁用 |
| 清空聚焦 | 禁用 | 禁用 | 仅 ready 且 F 非空可用 | 非 ready 禁用 |
| 图名、左右侧栏开关 | 可用 | 可用 | 可用 | 图名显示现值/主图兜底；侧栏开关可用 |

### 2.4 失败源与告警合法态

| saveStatus | lastWriteErrorSource | 告警 | 告警内动作 | 主命令语义 |
|---|---|---|---|---|
| clean/dirty/saving | 任意 | 不显示保存/history 告警 | — | 保存/历史仍按 B4 状态 |
| error | save | `保存失败：{message}` | 「重试」=`retrySave()`→finalize；若仍有合法 stale 标记，也保留丢弃出口 | 主保存钮只表示显式保存，不自动代替 history 重试 |
| error | history-undo | `撤销失败：{message}。历史栈未变化，重按撤销即可重试。` | **无保存重试**；CONFLICT 且标记仍在栈顶时显示丢弃出口 | 撤销钮重发 undo；peek 不 pop |
| error | history-redo | `重做失败：{message}。历史栈未变化，重按重做即可重试。` | **无保存重试**；CONFLICT 同上 | 重做钮重发 redo；失败不清 redo/U |
| error | null/不一致的非法态 | 显示通用真实错误，不显示任何重试钮 | 无 | 测试应使运行态不可达；UI 对缺源 fail closed，避免误定稿 |

### 2.5 C2 的 Q × F × phase 全表

| Q | F | phase | `ioUnsettled` | quitDirty 中 lineage 部分 | lineagePending | 说明 |
|---:|---:|---|---:|---:|---:|---|
| 0 | 0 | clean | false | false | false | 全净 |
| 0 | 0 | dirty/saving/error | false | false | false | phase 不再独立构成未落定；dirty/saving 无 Q/F 是非法相位夹具，error 是合法失败呈现 |
| ≥1 | 0/1 | 任意 | true | true | true | 普通写失败队首保留，仍锁退出与结构写 |
| 0 | ≥1 | 任意 | true | true | true | 即使 phase 错停 clean 也直判 F，保留 B4 防提前退出修复 |

悬浮笔记草稿仍单列并入 quitDirty，但不因本表改而加入 INV-91 lineagePending；reader 的失败/待写聚合也不改。

### 2.6 keepOpen × saving × composing 全表

| 已开编辑会话 | saving 来源 | composing | textarea | 新交互/blur 收口 |
|---|---|---:|---|---|
| 无 | 任意 | 任意 | 不创建 | 既有创建门不变 |
| 有 | 无 saving | false | 在场 | 正常输入、blur 收口 |
| 有 | 自身 idle 提交紧随的 saving | false | 同一 DOM 节点持续在场，不失焦 | 新交互仍锁；flushing 中 blur 不收口，草稿保留 |
| 有 | 其他写触发的 saving | false | 卸载，saving 结束回挂 | R3 窄口径不变 |
| 有 | 任意 saving | true | 不让位 | 防止卸载打断 IME；compositionend 后回到来源对应行 |

## 3. 单排工具栏与稳定页面外壳

### 3.1 最终 DOM 顺序

页面顶部只有一个工具控件轨道，顺序固定为：

```text
编辑/浏览/聚焦
｜ 保存 / 撤销 / 重做
｜ 选择 / 实线+色板 / 虚线+色板
｜ 缩放 − / 百分比复位 / +
｜ 清空聚焦
｜ 图名
｜ 左导航开关 / 右详情开关
```

- `LineageModeBar` 保留为模式子件，不再把图名塞在其末尾。同一文件可导出 `LineageFocusClearButton`，由父工具栏在规定槽位渲染，避免为了顺序复制 focus 状态。
- 保存/历史组复用 `LineageSaveButton`、`LineageHistoryButtons` 与 `useLineageCommandState`；不得在 Page 再推导一份可用性。
- 选择/线型/色板迁到 `LineageEditTools`；所有按钮三模式常驻，browse/focus 只禁用。
- 新 `LineageZoomControls` 直接读 view.store 的 zoom/zoomStep/resetZoom；`zoom-badge` testid 放在百分比复位钮，文本改为纯 `N%`。减/加钮新增 `lineage-zoom-out`/`lineage-zoom-in`，到 50%/200% 禁用；100% 复位钮仍可点击，等效 no-op。
- 图名继续来自 folders 单源；真实图名是允许保留的数据文案。
- 原 `lineage-mode-*`、`lineage-tool-*`、`lineage-save-btn`、`lineage-undo`、`lineage-redo`、`zoom-badge` 名称不变。

### 3.2 1024×768 横滚实现

采用原生横向滚动，不做第二排、溢出菜单或窗口最小宽度：

```text
.lg-toolbar-shell   = 页面 flex 列的 shrink-0 子件，min-width:0
.lg-toolbar-scroll  = overflow-x:auto; overflow-y:hidden; max-width:100%
.lg-toolbar         = display:flex; flex-wrap:nowrap; width:max-content;
                      min-width:100%; align-items:center
直接子组/分隔符      = flex:0 0 auto; white-space:nowrap
```

这里的 `min-width:100%` 只让内容在宽视口铺满工具栏，不是给应用或视口设置最小宽度。外层页面仍须 `min-width:0`，overflow 只发生在 `.lg-toolbar-scroll`，不得把 body、画布或侧栏一起撑宽。

- 滚动容器可键盘聚焦，`aria-label="脉络工具栏"`；按钮聚焦时由浏览器原生 scroll-into-view 保证可达，不新增 JS 滚动状态机。
- 1024×768 下验证 `scrollWidth>clientWidth`，编程滚到最右后真实点击右详情开关；1280×800 下验证轨道右缘与页面内容右缘一致。
- e2e 对控件先 `scrollIntoViewIfNeeded`，不能在 CI 窄视口用未锚定的绝对坐标点击。
- 错误告警是滚动区**外**的兄弟节点，不占工具控件轨道，不触发 `flex-wrap`；工具控件行的 top/height 不因告警出现而变化。

### 3.3 loading/error/ready 共壳

Page 始终渲染工具栏与主体框架：

- loading：中央保留 `[data-testid="lineage-timeline"]` 或等价画布占位宿主，`aria-busy=true`，提供 sr-only「正在加载脉络图」；删除可见教学式 loading 文案。数据控件按 §2.3 禁用。
- graph load error：同一工具栏仍在；中央 `role=alert` 显示「脉络图加载失败：真实原因」和独立 `lineage-load-retry`，只调用 `load()`，不能与保存/history 重试复用。
- ready：正常 Board/Timeline；空图仍保留 `.tl-content` 和 FloatingNotes 层，不渲染「暂无脉络图」或「该文件夹无脉络图」。
- graph loading/error 只收 palette，不覆写 mode/focusSet；write error 则使用 §6 的独立告警，不与 graph load error 合并。

### 3.4 侧栏单态与开关迁移

- 新增页面组合层 hook 汇总两侧控制：左栏仍读 `useLineageViewStore.navCollapsed`，toggle 时以当前 folderId+width 调 `writeNavPrefs`；右栏由 Page 调 `useSidebarPane()`，把同一对象传给工具栏和 `LineageAsideHost`。
- `LineageAsideHost` 不再内部调用 `useSidebarPane`，只接收受控 `SidebarPane`。拖宽、键盘 separator、200–480 clamp 和 localStorage 持久化仍在原 hook。
- 删除 NavPane 头部/窄条、SideCapRow、AsideHost rail 内的重复收起/展开按钮及死 props。收起后对应 pane 不再占 40px/48px 空 rail；从工具栏恢复时读回原宽。
- `LineageNavPane` 的 per-folder 读取效应与 resize 写点保留；收起不销毁 Page 的 folders 数据。左右 pane 的显示态只由各自单一状态源决定。
- 旧侧栏 testid 可移到工具栏对应动态按钮，减少 e2e 迁移；不再出现同一时刻两个同 testid 开关。

### 3.5 E3 文案边界与 ROADMAP 窄视口备注

删除：

1. drag-hint 三态与所有 `.drag-hint` CSS；
2. 「暂无脉络图」「该文件夹无脉络图」「点击卡片查看详情」；
3. 侧栏底部「编辑模式：调序 / 画线 / 调线」及其他纯操作教学文案；
4. 右下角角标相关提示，不把「滚动补偿」等机制词带入 UI。

保留：真实 load/write/history 错误、重试和过期历史丢弃；控件名称、title/aria-label、聚焦计数、图名、年月、篇数、卡片真实标题；`role=status`、`aria-busy` 和 sr-only loading。

ROADMAP 备注①由两处结构直接闭环：无错误时不再有 drag-hint 可挤成竖排；有错误时告警脱离控件 flex 轨道，旧 `has-save-error` 换行规则删除。1024×768 的工具控件高度不得再出现 172.75px，错误文本可换行完整显示，但只能影响自己的告警区高度。

## 4. 无 dim 的聚焦视觉规格

### 4.1 保留与删除

- 所有模式的所有卡、边在常态下均不应用 focus dim；空 focus 与非空 focus 都一样全亮。
- 仅在 **focus 模式**给 focusSet 本集卡片 `.focused` 的 accent 描边：`outline:2px solid var(--accent); outline-offset:1px`。非聚焦卡不加透明度假装层次。
- edit/browse 保留 focusSet 数据，但不显示聚焦描边；回 focus 后恢复描边。选中 `.sel` 的 inset ring、右键 `.ctx-hlt`、星标、拖拽态与 focus 描边可组合，不能用 dim 代替任何其一。
- 边不做聚焦集邻接加亮或变暗。focus 模式边 hoverScan 继续工作，并由独立 `focusMode` 信号控制；空 focus 也可 hover。
- 拖拽 `.tl-edges.dimmed`、错峰 fade、普通 hover 的既有 opacity 是独立视觉态，不属于被删的 focus dim。验收「全亮」必须在无拖拽、无错峰 fade、无 hover 的基态读取 computed opacity。

### 4.2 旧链删除清单

1. 删除 `focus-bright.ts` 及 `focusBrightSet/isEdgeDimmed`。
2. `useTimelineFocusSets(edges)` 收敛为只生成 focusIds 的 hook，不再依赖 edges，不计算 brightIds/dimActive。
3. 删除 TimelineYears 的 `brightIds/dimUnfocused`、Card 的 `dim`、EdgeOverlay 的 `focusDim/brightIds` 及其 JSX 分支。
4. `edgeVisualOpacity` 删除 `focusDim` 参数与 `.dim/.dim.hovered` 让位分支；保留 fade/hovered。
5. 删除 `.tl-card.dim`、`.tl-edge.dim`、`.dimmed-focus` 及旧注释；不留下无消费类名。
6. 删除 `lineage-focus-bright.test.ts`；`lineage-zoom-dim.test.tsx` 更名并重写为 `lineage-focus-visual.test.tsx`，覆盖非空/空聚焦全亮、accent、focus hover、缩放后不变；`lineage.spec` T13 同步翻案，而非只删红例。

### 4.3 性能结果

每次渲染不再为 focus 计算 O(E) 的一度邻接集，也不再给非 bright 卡/边逐条计算 dim 类。保留的 focusIds 为 O(N_focus) Set 构造；成员剪枝只在图态写点发生，不在每次 render 扫描 nodes。

## 5. C3：图态写点收口剪枝

### 5.1 选型

采用**写点收口**，不采用投影过滤。

理由：

1. 投影过滤只能让计数和视觉暂时好看，registry/view.store 中仍留死 id，违背「集合只含图成员」的状态合同。
2. 若只在 UI 投影过滤，undo 恢复同 id 时会把旧成员关系意外复活；写点剪枝明确删除旧成员关系，恢复卡不自动恢复聚焦。
3. per-folder 后台回写也需要剪枝。只在 LineageModeBar/Timeline 过滤无法处理非活动会话。
4. 统一写点可让 nodes、focusSet、计数、清空按钮和 accent 在同一提交收敛，避免一帧虚高。

### 5.2 落点

新增纯件 `lineage-focus-membership.ts`，提供 `pruneFocusMembers(focusSet,nodes)` 与 session patch 归一化助手。写路径分为「entry 数据归一化」与「活动投影同步」两半，二者共用同一纯函数，但不得只实现其中一半：

- **所有 entry 写。** `lineage-session-projection` 在 `apply` 与 `replace` 入口归一化。非活动 entry 从 `entry.data.focusSet` 或 patch 内 focusSet 读取，按 patch 后 nodes 过滤后写回同一 entry；活动 entry 的增量 apply 从 `useLineageViewStore.getState().focusSet` 读取，过滤结果与 nodes 在同一提交生效并同步 view.store。活动 focusSet 不加入 LineageStore 投影字段表。
- **统一活动整幅投影口。** projection/registry 提供 `projectActiveSession(entry)`，一次完成「按 entry.nodes 归一化目标集合 → `projection.setAll(entry.data)` → `useLineageViewStore.setState({focusSet})`」。合法集合保持引用。activate、活动 replace、mount 同图 ready 的重挂投影、rekey 切活动键后的整幅投影都必须走此口；禁止继续直接调用 `projector.set(projectAll(...))` 绕开 focusSet。
- **activate/mount。** activate 先挂起离场活动集合，再经 `projectActiveSession(目标entry)` 恢复目标集合。同图 ready 重挂不经过 graph loader，也不双取，但仍调用该投影同步口完成 §2.2 的恒等防御剪枝。
- **rekey 的特殊顺序。** 现行 rekey 在 fresh entry 仍非活动时执行 `core.apply(fresh,{...carried,...next})`，随后才 `setActiveFolder(target)`。因此必须：①在 depart 前从 view.store 捕获当时活动集合，作为 `carried.focusSet`，不得读可能尚未挂起同步的旧 entry.data.focusSet；②非活动 apply 阶段用该迁移集合与 patch 后 nodes 先剪 fresh.data.focusSet；③切活动键后调用 `projectActiveSession(fresh)`，由同一入口同步剪后的 view.store.focusSet 并投影其余 LineageStore 字段。不得把旧活动 view.store 的集合当作 fresh 已活动时的读源，也不得漏掉切键后的同步。
- **remap 的区别。** remap 经 `core.activate` 进入目标会话， activate 已包含统一切键与 `projectActiveSession`，不存在 rekey 的「非活动 apply → 手工切活动键 → 只投 LineageStore」时序缺口；不得为 remap 再复制一条专用剪枝分支。
- `resetWorkspace` 调独立的 `resetForWorkspace()`，清全部集合并归 browse；不得复用新的 `resetForMount()`，否则 mode 不会复位。

实现者不得把剪枝散加到 `removeNode`、undo、redo 三个表面调用点；那三种只是触发源。合同是：所有 entry 写经数据归一化，所有活动整幅投影经 `projectActiveSession`，二者没有绕口。

### 5.3 必测交错

1. A/B 各有聚焦，A 的后台回写在 B 活动时到达：只剪 A。
2. 普通删除、graph reload、权威和解、undo、redo 五类 nodes 写点都经过同一剪枝。
3. 聚焦态「删除→undo 恢复→点卡重新聚焦→redo 删除」后：`focusSet=[]`、无「聚焦 N」、清空钮禁用、停留 focus、其他真实卡标题可见且基态 opacity=1。
4. undo 恢复已删除卡时，不自动恢复删除前的聚焦关系。
5. 无死 id 的 patch 保留 focusSet 引用，避免无意义重渲染。
6. **rekey 同时改键并缩减 nodes：** 活动 A 的 nodes=[N1,N2]、view/store focusSet=[N1,N2]，植入 `{folderId:'B',nodes:[N1]}`；完成后 B.entry.data.focusSet 与活动 view.store.focusSet 都必须为 [N1]，「聚焦 1」而非 2，N2 不得在任一集合残留。前置须证明旧实现会出现 registry 已剪而 view.store 仍 [N1,N2] 的判别红。
7. **remap 对照：** 经 `core.activate` 的 remap 终态走统一 activate/projectActiveSession，不新增 rekey 专用时序；既有 remap owner/归属断言保留，并补同一成员收敛断言。
8. **重挂两例：** 合法 F 在同图 ready 重挂前后同值同引用且 graph IPC 增量=0；预置含死 id 的 F 时，resetForMount 单呼不动它，完整 Page 挂载经活动投影同步口只移除死 id，不重置 mode、不清其他成员。

## 6. C1 与 R4：单告警、失败源分流、三模式出口

### 6.1 错误来源单源

保留 `lastWriteError: string|null` 作为消息，新增判别枚举元数据：

```ts
type LineageWriteErrorSource = 'save' | 'history-undo' | 'history-redo' | null
```

新增 `lastWriteErrorSource` 到 renderer 的 LineageSession/LineageStore、fresh 初值、活动投影与 rekey/remap 携带面。它是消息元数据，不是第二份错误消息；`saveStatus`、message、source 必须在**同一 registry patch**写入或清除。抽 `lineage-write-failure.ts` 统一 error/clear patch 与告警投影，防止某个写点只改 message 忘改 source。

**reconcile 的来源由发起命令显式传入，不能一律写 save。** `runReconcile` 接受非 null 的来源参数；history 命令把 `history-undo`/`history-redo` 沿 `history.run(direction) → drain/reconcileAtTail → runReconcile(source)` 传递，覆盖初次前置和解及有界续拉。save/finalize/普通 flush 的和解传 `save`。不得依赖失败收尾时可能已清的 inflight 反推，也不得在 lane 持一个可被后续命令覆盖的可变 `currentSource`。

写点映射：

| 写点 | source/message 变化 |
|---|---|
| 普通 write queue 失败 | `save` + 原始 message；失败队首保留 |
| 普通 save/flush、显式 `reconcileNow` 的和解失败 | `save` + 原始 message；这些入口没有 undo/redo 方向 |
| save/finalize 链内的前置 reconcile、续拉 reconcile 失败 | `save` + 原始 message；保存重试经 finalize 重进 drain/和解 |
| **history undo 在 needsReload 下的前置/续拉 reconcile graph 失败** | `history-undo` + 原始 graph message；history-unit 尚未执行，undo/redo 两栈不动，不显示保存重试 |
| **history redo 在 needsReload 下的前置/续拉 reconcile graph 失败** | `history-redo` + 原始 graph message；history-unit 尚未执行，undo/redo 两栈不动，不显示保存重试 |
| history-unit undo/redo 自身系统失败或 CONFLICT | `history-undo`/`history-redo` + 原始 message；两栈不动 |
| finalize CONFLICT 尾 | `save` + 原始 message；不是 history 拒绝 |
| 普通写成功、history 成功 | message/source 同清 |
| 丢弃 stale 成功、恢复替换、discard/reset | 按既有终态同清或 fresh=null |
| rekey/remap | message 与 source 一起随原会话归属迁移，不落到别的 folder |

`retrySave()` 首先检查活动 entry 的 source；只有 `save` 才能调用 `finalize()`，其他来源 no-op。UI 条件渲染是第一道防线，store guard 是防陈旧闭包/直接调用的第二道防线。history 前置 reconcile 失败后，重试入口是重按原方向 undo/redo：它会重新执行既有 drain/needsReload 和解，再在成功后才发 history-unit；不能通过 finalize 绕过原命令。

### 6.2 告警最终形态

采用**一条告警、按源分流**，不拆成保存错误与 history 错误两条互相争抢位置的行。

- testid 继续为 `lineage-save-error`，以减少数据面 e2e 迁移；其可见标题按 §2.4 区分保存/撤销/重做。
- save 来源保留 `lineage-save-retry`，点击只做显式保存。主工具栏保存钮的 title/aria 不再随 failed 变成含糊的通用重试，而始终明确「保存全部修改（Ctrl+S——落库并标记为已保存）」。
- history 来源不渲染 `lineage-save-retry`，显示「历史栈未变化，重按撤销/重做即可重试」。history-unit 仍先 peek，成功才移栈；系统失败与 CONFLICT 都不 pop。
- CONFLICT 四种既有拒因继续写 staleHistory；`LineageStaleHistoryDrop` 只在 `staleHistoryAtTop` 且写链不在途时出现，确认后只丢该方向栈顶一项。系统失败不出现丢弃出口。
- 若一个较早的 stale 标记仍合法而最近一次失败来自 save，告警可同时提供保存重试和 stale 丢弃；两者含义不同，不得让一个按钮同时承担两事。

### 6.3 R4 三模式可达

告警和丢弃出口挂稳定 Page 外壳，不再位于 edit-only 工具组，因此 edit/browse/focus 都可见、可聚焦、可操作。浏览/聚焦模式的编辑工具仍禁用，保存/撤销/重做仍由 B4 命令面控制。

这取代 B4 设计稿 §14、ADR-0027/0032 中「只在 edit 可见」的旧限制；历史文档保留原决策，通过新 ADR 与注记指向新语义。toast 仍可作为即时反馈，但不再是 browse/focus 的唯一呈现。

### 6.4 旧锁定行为的保留方式

`lineage-history-stale-exit.test.tsx:169-185` 的「显式保存清 redo」用例已经在 `:181` 直接调用 `saveActiveFolder()`，并非点击错误行重试。该调用、redo 清空、stale 标记清除和 U=false 断言全部原样保留；只需随状态模型补 source 初值/终态断言，不虚构一个不存在的 locator 迁移。

新增判别覆盖分两类：① history-unit 自身失败后无保存重试、`retrySave()` 被 source guard 拒绝；② undo/redo × needsReload × graph 失败的前置 reconcile 同样归 history 来源、两栈不动、无保存重试。另以 save/finalize 的同类 graph 失败归 save 作负对照。不能用删除旧断言或把既有直接 saveActiveFolder 用例改写成别的东西来制造绿色。

## 7. C2=B：ioUnsettled 两源语义

### 7.1 决定与实现

2026-11-25 用户裁决选 B：

```text
ioUnsettled(session) = session.queue.length > 0 OR session.inflight !== null
```

`saveStatus` 不再作为第三输入。`settledIoPhase` 不变：在途收尾仍保留 error，否则按 Q 得 dirty/clean；错误可见性与「是否有实际待写」正式分离。

同批更新 `lineage-io-phase.ts` 头注、`registry.ioDirty` 注释、`lineage.store`、`use-save-aggregates`、`quit-flush`、`workspace-switch` 和 App 上报注释。main 仍消费同一 boolean `lineagePending`，IPC 载荷不变。

### 7.2 行为后果

- history-unit 在 Q0/F0 失败后：alert、message、source、stale 标记和两栈都保留；`quitDirty` 的 lineage 部分=false，`lineagePending=false`。文献库移动/删除与文件夹结构写不再被该历史失败连带锁住；退出不再只因此 error 弹确认。
- 普通写系统失败保留队首，Q≥1，因此仍两真，文献库结构写仍拒，退出仍要求处理失败写。
- Q0/F0 的 reconcile/finalize conflict 尾也严格服从同一函数，不新增「除 history 外仍算脏」的隐式例外。其 alert 仍可见、可重试；U/历史轴不变。
- 课题切换只等待 Q/F 会话；Q0/F0 error 不再单独把会话放入等待名单。若成功切课题，既有全域 reset 仍清内存错误与历史。
- ADR-0026 的「关闭一律握手」不变；变化的是握手后 `stillDirty` 的结果，不是跳过握手。

### 7.3 完整测试迁移清单

**必须红后绿、修改既有断言：**

1. `lineage-io-unsettled-queue.test.ts`：纯函数从三相并集翻为 Q/F 两源；Q0/F0 的 dirty/saving/error 全 false，Q 或 F 直判仍 true；`settledIoPhase` 三例原样。补 Q0/F0 error 不进退出/课题等待名单。
2. `app-quit-dirty.test.tsx`：`:215-227` 的「只置 saveStatus=dirty 即 lineagePending=true」改为真实 Q1 才 true；新增活动及挂起会话 Q0/F0 error 两假。`:305-334` 普通写失败 Q1 仍两真必须原样保留。
3. `workspace-switch.test.ts`：`:134-151` 的只置 dirty 相位不再足以触发 lane.save；改用真实队列驱动成功格，并新增 Q0/F0 error 不等待但 alert 状态在 reset 前仍存在的判别例。
4. `quit-flush.test.ts`：保留普通写失败 Q1→stillDirty=true；新增 history/Q0/F0 error→stillDirty=false、不得伪称把失败历史写再次落库。
5. `lineage-io-phase.test.ts`：在途 reconcile/history 仍 true；`:197` 附近 Q0 error 改 false；补 reconcile Q0/F0 error 同口径。相位发布/收口的其他断言不变。
6. `lineage-io-phase-quit.test.tsx`：history 在途仍阻提前退出；补 history 零写失败落定后仍 error、两栈不动，但 stillDirty=false。
7. `lineage/lineage-history-unit.test.ts`：history 系统失败与 CONFLICT 后都断言 source、message、Q0/F0、ioUnsettled=false；普通预 flush 失败 Q1 时仍为 true。
8. `lineage-conflict.spec.ts`：在真实 CONFLICT/Q0/F0 后验证保存告警仍在而结构写互斥信号已释放；再以普通写失败/Q1 作负对照，不能只测纯函数。

**零改但必须回归的相邻锁：**

- `quit-flush-multi-folder.test.ts`、`workspace-switch-multi-folder.test.ts`、`app-shell-workspace-flush.test.tsx`、`workspace-switch-recovery.test.ts`：多 folder 的普通失败写均有 Q/F，行为不变。
- `lineage-board.test.tsx`：Q1 的 App 载荷仍 `{dirty:true,lineagePending:true}`。
- `folders.service.test.ts`、`folders-move-paper.test.ts`、`papers-delete.test.ts`、`windows/quit-dirty-guard.test.ts`：main 对 boolean 的拒绝/透传合约零改。
- `move-paper.spec.ts`：已有 true/false 载荷路径保持；新增真实 history error 释放信号与 Q1 负对照可复用该入口。

## 8. F-KEEPOPN-01 与 R3

### 8.1 修复方案

`commitDraftKeepOpen` 是 idle scheduler 的非 render 回调。把 `submitDraft` 与成功后的 `setKeepOpen(true)` 放进同一个 `flushSync`：

```text
flushSync(() -> {
  applied = submitDraft(id, value)
  if applied then setKeepOpen(true)
})
return applied
```

这样 store 的 editRevision/queue/flushing 变化与 keepOpen=true 在同一次 React 提交落地，不会先渲染「saving=true且keepOpen=false」并卸载 textarea。只在这一个 idle 提交点使用同步 flush；不把全局 Zustand 写都改成 flushSync，也不在 render/effect 内调用它。

保留 saving=false 时复位 keepOpen 的 effect、flushing 中 blur 不收口、IME composing 例外和所有新交互锁。若 submitDraft 未产生编辑单元，keepOpen 不置位。

### 8.2 R3 评估结论

维持窄口径，无放宽实施面。其他写触发的 saving 仍卸载 textarea、保存组件草稿、结束回挂；F-KEEPOPN-01 是自身 idle 提交窗的批处理问题，不足以证明需要改变所有 saving 窗的交互合同。INV-149 不改。

### 8.3 验证

- 单测继续用挂起 IPC 确证 saving 窗，断言同一 DOM、activeElement、续写不丢；另以非 `act` 合批的真渲染序列覆盖回归，不只依赖 jsdom 既有绿例。
- `lineage-notes.spec.ts` 新增真机路径：输入唯一正文前给 textarea 加测试属性并安装 MutationObserver，记录 saving spinner 出现、textarea 是否被移除、焦点事件。等待真实落库后断言观察到了 saving、textarea 移除次数=0、同一节点仍聚焦、真实正文正确。
- e2e 不用固定 sleep 猜测 saving；若当前机器无法观察到 saving 窗，该验证记未闭环，不得仅凭 jsdom 绿把 INV-190 的限制删除。

## 9. 其余承接项与独立票

### 9.1 `F-ANNOSAVE-01`：删除式闭环，不入 B5

用户产品裁决：三个界面各一个界面级保存按钮，不为每条批注再加保存按钮。`AnnotationEditorActions` 删除自带保存钮；批注正文靠既有 1.5s idle/blur/flush 自动落库，定稿统一走 reader 界面级保存与 Ctrl+S；总评面板保存钮继续是 tab 级 finalize，脉络使用本批工具栏保存钮。

该票由主控登记为 open，建议落在 B6 阅读器工具栏批。票内至少要处理删除按钮后的动作行布局、dirty/failed 反馈、Ctrl+S 对当前草稿先提交再 finalize、失败不收层，以及原 `annotation-editor-save` 受锁测试。B5 不提前修改 reader 文件，也不改 INV-106 去迁就当前偏差。

### 9.2 `F-UNDOTEST-01`：四项独立测试债，不入 B5

主控以 open 票统一承接：

1. 导入 × 内存历史；
2. 保存→undo→再定稿闭环；
3. 连按两次 history 的排队；
4. 切目标结束编辑会话。

B5 自己必须新增并落地的两项不在该票：browse/focus 被拒呈现；聚焦态重做删除后的 focusSet 收敛。

### 9.3 本批不改的评估面

R3 已在 §8 闭合；C2 不再有 A/B 待裁项；无 dim、切图 per-folder 恢复、空 focus 留 focus 都是现行决定。实现者不得把这些项重新包装成临时产品选择。

## 10. 涉改文件与行数预算

### 10.1 测量纪律

以下为 2026-11-25 `wc -l` 实测。预算是实施后物理行上限，同时遵守组件≤250、repo≤300、ESLint 任意文件≤500。不得靠删注释达标；迁移代码时其约束注释随迁。实施开工若前批又改变行数，须再测并在工单申报。

### 10.2 原 §7.4 UI 文件及必要相邻件

除明确写出 `src/renderer/` 路径的 CSS 外，本表裸文件名均以 `src/renderer/features/lineage/` 为前缀。

| 文件 | 2026-11-25 实测 | B5 后预算/动作 |
|---|---:|---|
| `LineageToolbar.tsx` | 192 | 父≤140；只排槽、共壳与组合；保存/编辑/缩放/侧栏/告警分件 |
| `LineageModeBar.tsx` | 89 | ≤150；模式与可复位清空聚焦子件；不持第二份状态，图名移父栏 |
| `LineagePage.tsx` | 194 | ≤160；mount/load/快捷键/组合根；ready/loading/error UI 迁 PageBody |
| 新 `LineagePageBody.tsx` | — | ≤240；选中详情、folders 图名、三态主体与 pane 组合，不取第二次 graph |
| `LineageTimeline.tsx` | 232 | ≤200；移除 Toolbar/ZoomBadge/空图文案和 dim props，保留画布/FloatingNotes |
| `lineage-view.store.ts` | 259 | ≤300；mount 保 mode/F、setMode 不清、resetForWorkspace；prefs 不增长 |
| `LineageNavPane.tsx` | 137 | ≤170；删内部开关和空 rail，保留调宽与 per-folder prefs |
| `LineageAsideHost.tsx` | 157 | ≤200；受控 SidebarPane 注入，删 rail 开关 |
| `use-sidebar-pane.ts` | 183 | ≤200；保留拖宽/键盘/持久化，删不再使用的 rail 常量 |
| 新 `use-lineage-pane-controls.ts` | — | ≤140；Page 组合层的左右开关与左栏 prefs 写点，无第二 collapsed 态 |
| `LineageSidePanel.tsx` | 221 | ≤250；只删指定文案和 onCollapse 死链 |
| `SideCapRow.tsx` | 42 | ≤80；删收起按钮/prop，保留标题编号星标 |
| `ZoomBadge.tsx` | 44 | 删除；百分比复位迁新 ZoomControls，滚动补偿同删 |
| 新 `LineageEditTools.tsx` | — | ≤160；选择/线型/色板与 lock 接线 |
| 新 `LineageZoomControls.tsx` | — | ≤100；−/%/+ 与真实百分比 |
| 新 `LineagePaneToggles.tsx` | — | ≤100；左右开关，名称/aria 与状态同源 |
| `LineageSaveButton.tsx` | 57 | ≤80；保存动作名称不混作 history 重试 |
| `LineageHistoryButtons.tsx` | 51 | 零行为改；继续消费 B4 command state |
| `timeline-zoom-hook.ts` | 84 | ≤90；ctrl+wheel 保留，删除无消费者的 percent 返回面 |
| `timeline-interactions.ts` | 118 | ≤140；focusIds 单派生，删 bright/dim |
| `focus-bright.ts` | 34 | 删除 |
| `EdgeOverlay.tsx` | 248 | ≤250；删 focusDim/brightIds，保留拖拽 dimmed 与独立 focusMode hover |
| `edge-overlay-geom.ts` | 104 | ≤130；edgeVisualOpacity 去 focusDim |
| `TimelineYears.tsx` | 120 | ≤160；删 bright/dim props，保留年月篇数与真实卡文本 |
| `LineageTimelineCard.tsx` | 147 | ≤180；删 dim prop，focused/accent 保留 |
| `LineageStaleHistoryDrop.tsx` | 84 | ≤120；出口本体复用，宿主改三模式告警 |
| `src/renderer/shared/theme-lineage.css` | 411 | ≤500；删 drag-hint/focus-dim/旧角标，新增稳定 shell/横滚 |
| `src/renderer/shared/theme-lineage-tools.css` | 183 | ≤250；删 has-save-error 换行，新增独立告警样式 |
| `src/renderer/shared/theme-lineage-nav.css` | 171 | ≤230；模式/清空/图名与 focus-only accent；删空 rail |
| `src/renderer/shared/theme-lineage-card.css` | 248 | ≤250；删侧栏 rail 死样式，其他卡/侧板皮肤不动 |
| `src/renderer/shared/theme-lineage-drag.css` | 81 | 原则上零改；拖拽 dimmed 不得误删 |

### 10.3 C1/C2/C3/keepOpen 必要数据面文件

除明确写出 `src/renderer/app/` 的条目外，本表裸文件名均以 `src/renderer/features/lineage/` 为前缀。

| 文件 | 2026-11-25 实测 | 预算/动作 |
|---|---:|---|
| 新 `lineage-focus-membership.ts` | — | ≤120；纯成员剪枝与 patch 归一化 |
| `lineage-session-projection.ts` | 122 | ≤210；apply/replace 数据归一化 + `projectActiveSession` 整幅投影/focusSet 同步口 |
| `lineage-session-registry.ts` | 378 | ≤380；新增逻辑外移；activate/mount 投影统一走 projectActiveSession |
| `lineage-session-core.ts` | 37 | ≤60；RegistryCore 增加统一活动投影端口，不持第二状态 |
| `lineage-session-model.ts` | 199 | ≤230；错误来源类型单源消费，状态签名更新 |
| `lineage-session-fresh.ts` | 50 | ≤65；source 初值 null |
| 新 `lineage-write-failure.ts` | — | ≤140；source 类型、原子 patch、告警投影 |
| `lineage-write-queue.ts` | 317 | ≤340；普通写 error/success 同步 source，复用 helper |
| `lineage-history-unit.ts` | 231 | ≤270；history 方向 source 显式传入前置/续拉 reconcile；成功清理；不开 C3 旁路 |
| `lineage-session-lane.ts` | 327 | ≤360；runReconcile 接收发起来源；save/finalize 与 history 两族调用不混源 |
| `lineage-session-rekey.ts` | 76 | ≤105；message/source 同携带；改键后必须经 core.projectActiveSession 同步活动 focusSet |
| `lineage-session-remap.ts` | 100 | ≤125；remap 错误归属携 source；继续走 core.activate，不复制 rekey 时序分支 |
| `lineage.store.ts` | 263 | ≤290；retrySave source guard，resetForWorkspace 接线，注释更新 |
| 新 `LineageWriteErrorAlert.tsx` | — | ≤140；单告警按源呈现，零 IPC/零第二错误态 |
| `lineage-io-phase.ts` | 42 | ≤65；ioUnsettled=Q∨F；settledIoPhase 不变 |
| `src/renderer/app/use-save-aggregates.ts` | 48 | ≤70；注释与两源语义一致，U 仍分列 |
| `src/renderer/app/quit-flush.ts` | 114 | ≤135；等待名单按新 ioUnsettled |
| `src/renderer/app/workspace-switch.ts` | 104 | ≤125；同上，清史时机不变 |
| `src/renderer/app/App.tsx` | 173 | ≤180；只更新上报注释，不加派生逻辑 |
| `use-note-edit-session.ts` | 254 | ≤285；只改 idle 提交同步批及注释 |
| `LineageFloatingNotes.tsx` | 210 | 原则上零行为改；R3/IME 门保持 |

若新增完整状态字段导致手工测试夹具类型错误，只允许机械补 `lastWriteErrorSource:null` 或改用既有合法 fixture 工厂；不得借此改既有业务断言。所有 tests 变更在提交说明申报。

### 10.4 文档与工单

- 新增正式 `docs/adr/0033-lineage-mode-focus-toolbar.md`，正文取 §14；新 ADR 与代码同批。
- 更新 `docs/invariants.md`、`docs/ROADMAP.md`；ADR-0027/0032 对 R4、keepOpen 的失效限制加指向 0033 的演进注记，ADR-0026 核对不改。
- 更新 `tickets/registry.ts` 的 B5 工单与受锁测试申报；`F-ANNOSAVE-01`、`F-UNDOTEST-01` 由主控登记 open。
- B4 历史设计稿不改；仓外 plan/mockup 不改。README、architecture、security、DEVELOPMENT、DEV-SETUP 本次检索无对应工具栏段落，无触及时不新建文档章节。

## 11. 受锁测试迁移三分表

### 11.1 纪律与计数

- 下表完整覆盖 §7.5 点名的 29 个唯一条目：**24 个必改/删除并替换，5 个零改**。零改项仍须执行，不能因 DOM 搬迁而跳过。
- 「删除」只针对旧实现合同；删除的数学 dim 测试由全亮/accent DOM 测试替代，删除的旧角标几何由工具栏百分比和真实缩放替代。
- 新测试先红后绿；路径过滤后核对执行数非零。提交说明逐项申报 tests 变更原因。

### 11.2 规划点名的 unit 16 件

| 文件 | 断言迁移/新增 | 删除或零改 |
|---|---|---|
| `lineage-card-drag.test.tsx` | 回归真实拖拽与标题 | **零改**；focus dim 不是拖拽 dim |
| `lineage-detail-panel.test.tsx` | 空选中改断言详情根仍挂且无教学文字；有卡断言真实文献题名；底部改真实笔记/元数据 | 删「点击卡片查看详情」「编辑模式…」锁 |
| `lineage-edge-overlay-css.test.tsx` | 改锁单排 shell、`nowrap`、原生横滚、focus accent；保留拖拽 CSS 负锚 | 删 drag-hint 三组 CSS 正则 |
| `lineage-floating-note-rework.test.tsx` | 空图改 `.tl-content`/笔记层在场与真实笔记文本；R3 其他写 saving 让位断言保留 | 删「暂无脉络图」 |
| `lineage-mode-bar.test.tsx` | 新增清空钮 enabled/disabled、点击留 focus、计数收敛；图名断言迁 toolbar/page | 删图名必须由 ModeBar 末尾承载的结构锁 |
| `lineage-mode-canvas.test.tsx` | 点卡/空白保持；切图改 A/B 集合隔离恢复；三模式控件可见/禁用；全亮/accent 新断言 | 删 drag-hint 三态与「切图全局清空」旧表述 |
| `lineage-side-panel.test.tsx` | 空态只锁面板根/无占位教学文字；有卡真实文本与操作钮保留 | 删占位文案断言 |
| `lineage-timeline-edit.test.tsx` | 工具栏存在性迁 Page/Toolbar 测试；Timeline 只锁 editing 类和画布；告警测试迁稳定外壳 | 删 `.lg-toolbar 挂 .timeline` 与 drag-hint/通用重试锁 |
| `lineage-timeline-page.test.tsx` | loading 改 aria-busy+工具栏；空图改画布存在；子图空态无文字；load error 仍断言真实原因和 `lineage-load-retry`；重挂记忆 mode | 删三类可见空/loading 文案与 P-1 二次进页 browse 锁 |
| `lineage-timeline.test.tsx` | 空→非空改真实卡标题从 0 到有；Toolbar 不再要求驻 Timeline；保留 data-node-id | 删「暂无脉络图」和 Timeline 内工具栏锁 |
| `lineage-toolbar-session.test.tsx` | 三模式保存/历史/编辑工具常驻；非 edit 编辑工具禁用；save error 有重试，history error 无保存重试且有方向文案；保存/历史三模式命令面 | 删 browse/focus 整组消失、drag-hint、所有 error 都 retrySave 的旧断言 |
| `lineage-zoom-dim.test.tsx` | 更名 `lineage-focus-visual.test.tsx`：空/非空 focus 全亮、accent、focusMode hover、zoom 后不变、无 dim CSS | 旧文件名与全部 dim 合同退役；不是只删红例 |
| `ui-iconify-buttons.test.tsx` | 原 NavPane 内按钮断言迁到工具栏动态开关，继续断言 SVG、sr-only、真实开合 | 删除窗格内重复按钮的存在性前提 |
| `lineage-view-store.test.ts` | P-3 翻为模式切换保集合；新增 resetForMount 保 mode/F、清空留 focus、再进 focus 恢复原集、非 focus toggle no-op | 删「退出聚焦即清」「再进必空」 |
| `lineage-c1-viewstore.test.tsx` | 原 tool/palette 矩阵保留；resetForMount 增 mode/F 保持；不同 mode 才收 T，同 mode 完全 no-op；workspace reset 单列 | 色板/Esc/线色 localStorage 断言零改 |
| `lineage-focus-bright.test.ts` | 新视觉覆盖由 `lineage-focus-visual.test.tsx` 承担 | **整件删除**，因 `focus-bright.ts` 与数学 bright/dim 合同删除 |

### 11.3 规划点名的 e2e/辅助 13 件

| 文件 | 必改序列/新增 | 零改或删除 |
|---|---|---|
| `lineage.spec.ts` | T13 改全亮+accent；zoom 文本纯百分比；保存失败改显式命令分流；新增重挂记忆 focus、清空、重做删除集合收敛；删除旧 sticky 注入补偿 | 删 `.dimmed-focus`、`N% ▾`、通用保存重试和右下角补偿旧断言；真实卡标题/DB 回读保留 |
| `lineage-anchor-consistency.spec.ts` | 回归全部锚几何与真实卡文本 | **零改**；点击前按 CI 规则滚动锚定 |
| `lineage-autoscroll.spec.ts` | 回归横纵 autoscroll | **零改** |
| `lineage-conflict.spec.ts` | 参数化 edit/browse/focus 三模式被拒呈现；history 无保存重试，有方向文案和丢弃出口；窄视口改「告警独立、控件轨道不增高」；C2 Q0/Q1 对照 | 旧 `.lg-toolbar` 包错误行的几何比较删除，真实拒因与确认丢弃保留 |
| `lineage-lineui01.spec.ts` | LU-02 改工具栏自身横滚、百分比复位和实际 transform；LU-01 autoscroll 保留 | 删 `.lg-toolbar` 相对 `.timeline` sticky 钉住、ZoomBadge 双轴 transform 补偿 |
| `lineage-notes.spec.ts` | 新增 F-KEEPOPN-01 真机同 DOM/焦点/MutationObserver；既有 N4 真实 IME 文本保留 | R3 不放宽 |
| `lineage-route-slots.spec.ts` | 回归走线、槽位与真实文本 | **零改** |
| `lineage-visfb67-floor.spec.ts` | 百分比文本适配新 ZoomControls；空图断言改画布/笔记层存在；zoom/scroll 真实矩阵保留 | 删 `.tl-empty=暂无脉络图` |
| `lineage-topic-node.spec.ts` | 删除当前图后改主图画布存在且无旧空态文字，真实笔记/卡片文本为准 | 删「暂无/该文件夹无脉络图」锚 |
| `folders-crud.spec.ts` | 删除 folder 后改图名/画布/node count 等真实状态，不依赖教学空文案 | 旧空态文字替换，CRUD 数据断言不动 |
| `recovery.spec.ts` | 回归 write error 真实原因、单槽和恢复文本 | **零改**；告警 testid 保留，普通失败 Q1 的 C2 行为不变 |
| `workspaces.spec.ts` | 新课题空态改画布存在；history Q0 error 的保存重试分流适配；成功后 mode/F 全清，失败留旧态 | 删「暂无脉络图」与通用重试锚，真实 DB 落库/回读不动 |
| `geo-probes.ts` | `zoomProbe` 等稳定文本改纯 `N%`，点击工具栏控件前先滚动可见；仍读 `.tl-content` computed transform | 删除角标语义注释，不改探针几何算法 |

### 11.4 承接项引出的额外测试面

分类沿用四类口径：**断言翻转**=修改旧语义断言；**async 调用迁移**=只改异步命令驱动；**纯夹具默认值**=补合法初值、不碰业务断言；**原样保留**=文件需执行但相应断言不改。新增判别例单列，不能冒充旧断言迁移。

| 测试 | 分类与迁移动作 | 新增判别/保留面 |
|---|---|---|
| `lineage-history-stale-exit.test.tsx` / `boundary` / `fixture` / `new-unit` | **纯夹具默认值**：补 source；**断言翻转**仅限三模式出口和 history 来源按钮条件。`stale-exit:181` 直接 `saveActiveFolder()` 的显式保存用例为**原样保留**，不存在错误行 locator 迁移 | 保存清 redo/U/stale 的原断言不动；系统失败无 drop 不变 |
| `lineage-toolbar-save-error-class.test.tsx` | **断言翻转**：旧 `has-save-error` 类改告警在滚动区外、控件轨道不换行 | 不能因旧类删除而整件删除 |
| `lineage-edge-overlay.test.tsx` / `lineage-edge-edit-r2.test.tsx` | **断言翻转**：去 focusDim 参数和 `.dimmed-focus` | focusMode hover、无 dim、fade/drag 保留 |
| `lineage-session-registry.test.ts` + 新 focus-membership 纯测 | 新增数据写与活动投影矩阵；合法夹具属**纯夹具默认值** | 活动/挂起/无变化引用/replace/activate/mount；**rekey 改键+nodes 缩减**后 entry 与 view.store 同步收敛；合法重挂同引用零 IPC、死 id 重挂只剪枝 |
| `lineage-session-remap-owner.test.tsx` | **原样保留** owner/归属断言，新增 remap 对照 | remap 走 core.activate/projectActiveSession，无 rekey 的 inactive-apply 缺口；成员同样收敛 |
| `lineage/lineage-history-unit.test.ts` | **断言翻转** source 归因；既有异步链继续 **async 调用迁移**后的 await 口径 | 新增 **undo × needsReload × graph 失败**与 **redo × needsReload × graph 失败**：结果 false、historyUnit 未调用、两栈 peek 不动、source=对应 history 方向、无保存重试、retrySave 不 finalize；save/finalize 同 graph 失败归 save 为负对照。另保留 C2 Q0/Q1、C3 redo 删除收敛 |
| `lineage-io-phase.test.ts` | **断言翻转** Q0/F0 error 两源语义；reconcile 在途断言**原样保留** | 补 history 前置 reconcile graph 失败后的来源与 ioUnsettled=false，避免只测纯 UI |
| `lineage-write-queue.test.ts`、`lineage-session-store.test.ts` | **纯夹具默认值** + 必要的 source **断言翻转** | 保存失败/成功/rekey 的 message+source 原子迁移与归属 |
| `lineage-side-reskin.test.tsx` | **断言翻转**：`:186-201` 的 SidePanel `onCollapse`/内部 `lineage-sidebar-collapse` 改在 Page/Toolbar + 受控 AsideHost 装配层点击工具栏开关；SidePanel 不再收 onCollapse。其余皮肤与真实文本**原样保留** | 工具栏按钮有 SVG、`aria-label=收起/展开详情面板`，点击使 aside 实际闭合/展开；SideCapRow 内旧按钮零在场 |
| `uires04-b3d-button-surface.test.tsx` | **断言翻转**：`:206-213` SideCapRow 收起钮与 `:215-230` NavPane 内部双钮往返迁到 `LineagePaneToggles`/Page 组合层；设置页 Tab 等其他钮系**原样保留** | 工具栏左右开关保持 `collapse-btn/syn-icon-btn` 等公共钮类、SVG、sr-only/accessible name；收起→展开真实往返，原窗格内无重复按钮 |
| `lineage-nav-pane.test.tsx`、新 pane-controls 测试 | **断言翻转**内部重复按钮；prefs/调宽**原样保留** | 工具栏 toggle 仍写 per-folder prefs，恢复原宽 |
| `lineage-sidebar.spec.ts` | 新增工具栏开合端到端面 | 原宽恢复、键盘/拖拽调宽、真实详情文本 |
| `lineage-note-idle-commit.test.tsx` | R3 旧例**原样保留**；新增非 act 合批回归 | 同 DOM/焦点；其他写 saving 仍让位 |
| C2 清单 | 分类与逐文件动作见 §7.3 | 不缩减为「只改一个纯函数测试」 |

## 12. e2e 验收清单

| 编号 | 文件/视口 | 操作序列与真实断言 |
|---|---|---|
| B5-E01 | `lineage.spec`，1280×800 | 冷启动 browse→focus 甲卡→离开脉络→返回；mode 仍 focus、「聚焦 1」、甲真实标题与 accent 恢复；graph 不双取 |
| B5-E02 | `lineage.spec` | focus 多卡→切 browse/edit→回 focus；集合不丢；再点当前 mode 完全 no-op；Esc 只收工具 |
| B5-E03 | `lineage.spec` | 点清空聚焦→停留 focus、计数消失、按钮禁用、所有真实卡标题可见且基态 opacity=1；再聚焦其他链可用 |
| B5-E04 | `lineage.spec` | A/B 各聚焦不同真实卡，A→B→A；各自计数/accent/标题恢复；workspace 成功全清由 workspaces 覆盖 |
| B5-E05 | `lineage.spec` | 删除甲→undo 恢复→focus 甲→redo 删除；真实卡消失、集合收敛、无「聚焦 1」、其余卡全亮，DB 与 UI 一致 |
| B5-E06 | `lineage-conflict.spec`，1024×768 | undo 与 redo 各在 browse/focus 被拒；告警含 main 真实原因和正确方向文案，无保存重试；drop 可见，确认后更旧历史可撤 |
| B5-E07 | `lineage-conflict.spec`/`lineage.spec` | 普通写失败显示「保存失败」和保存重试；重试成功清告警。history 系统失败由 renderer 集成测补足，断言 retrySave 不 finalize |
| B5-E08 | `lineage-conflict.spec` + main 相邻回归 | Q0/F0 history error 后 lineagePending 释放，结构写可用；Q1 普通写失败仍 CONFLICT 拒绝；告警在两种情况下都不丢 |
| B5-E09 | `lineage.spec`/lineui01，1024×768 | 工具控件同一 top、不折行；scrollWidth>clientWidth；滚到最右点击详情开关；告警出现前后控件轨道高度不变；无 172.75px 高工具组 |
| B5-E10 | `lineage.spec`/lineui01，1280×800 | 工具栏满宽；−/+ 到边界禁用；点击百分比复位从 110%→100%，`.tl-content` transform 与真实卡文本同步正确 |
| B5-E11 | `lineage-sidebar.spec` | 左右栏从工具栏开合，旧内部按钮不存在；收起不占空 rail；重开恢复原宽；拖宽/键盘与 localStorage 跨挂载保持 |
| B5-E12 | **现有 `tests/e2e/lineage.spec.ts`**，新增测试块≤90行，1024×768 | 用既有 IPC 桩挂起首载 graph：同图 loading 下 `lineage-timeline` 的 aria-busy=true、三模式钮可达、保存/编辑/缩放数据控件禁用；再让 graph 以真实「db locked」失败，断言同一工具栏仍在、`role=alert` 含该原因，点击 `lineage-load-retry` 后真实卡标题出现。不得用固定 sleep 代替条件等待，不新增 spec 文件 |
| B5-E13 | `lineage-notes.spec` | 自身 idle 提交窗观察到 saving，textarea 未移除、同节点聚焦、真实正文落库；其他写 saving 仍按 R3 让位 |
| B5-E14 | **现有 `tests/e2e/lineage.spec.ts`**，新增测试块≤120行；unit 宿主另为 `tests/unit/renderer/lineage-focus-visual.test.tsx` | e2e 在 1024×768 与 1280×800 各跑 focus 非空/空集，先断真实卡标题、基态 computed opacity、无 dim 类和 accent，再依次写 `testInfo.outputPath('b5-focus-nonempty-1024x768.png')`、`b5-focus-empty-1024x768.png`、`b5-focus-nonempty-1280x800.png`、`b5-focus-empty-1280x800.png`。原始文件可由 `test-results/run-*/**/b5-focus-*.png` 检索；运行后复制到 `/home/yyx/synapse-archive/scripts-audits/20261125-b5/screenshots/` 同名归档。unit 只验 DOM/CSS、不冒充截图；四张图必须由视觉审查实际查看 |

所有 e2e 至少有一处渲染出的真实文本断言；只有几何、class 或 computed style 全绿不算完成。CI 窄视口的点击/拖拽先滚动锚定；flake 按既有台账纪律处理。

## 13. INV 修订清单与 ADR 核对

### 13.1 必修订：旧文 → 新文

以下摘录是需要替换的完整语义句；同一 INV 的无关条款原样保留。

#### INV-22

- 旧文：「lineage 全 registry IO……任一 folder 会话 `ioUnsettled=队列∨在途写∨相位非 clean`……」
- 新文：「lineage 全 registry 实际待写……任一 folder 会话 `ioUnsettled=队列非空∨在途写在场`；Q0/F0 的 error 只保留可见告警和重试，不单独构成 stillDirty。普通写失败因队首保留仍计入；U/历史仍恒不入 stillDirty。关闭仍一律走 ADR-0026 握手。」
- 机检：io-phase 两源全表、Q0 history error 退出不确认、Q1 普通写失败仍仍脏。

#### INV-91

- 旧文：「`lineagePending=任一会话 队列∨在途∨error`……」
- 新文：「`lineagePending=任一会话 队列非空∨在途写在场`；Q0/F0 的 history/reconcile/finalize error 不单独互斥结构写；普通写失败 Q≥1 继续互斥。U/历史不参与。」
- 机检：App 真实聚合载荷+Q0/Q1 对照+main folders/papers 既有拒绝面。

#### INV-145（整行重写）

不能只替换行为列②；实施时重写 INV-145 整行，同时保留与聚焦无关的既有条款：

- **标题旧文：**「脉络画线保持与聚焦 bright 集」。**标题新文：**「脉络画线保持、无 dim 聚焦视觉与拖拽/边交互」。
- **行为列：**①画线成功后 tool 保持 draw-X 连画及退出径原样保留。②改为「画布全亮；不计算 bright/dim，不给卡或边挂 focus dim。仅 focus 模式对 focusSet 本集卡使用 2px accent outline/offset 1px；focus 模式边 hoverScan 独立于 focusSet 是否为空」。③图例零残留、④拖拽候选槽、⑤框底连续跟随原样保留。⑥保留 browse 真实 label tooltip 和 focus 扫描修复，但明确 focus hoverScan 由 `focusMode` 驱动，不再引用 bright/dim；拖拽 dimmed、错峰 fade 与普通 hover 是独立视觉态。
- **登记位置旧文：**`focus-bright.ts` 为判定集单源，并只列 `useDrawLine.ts`、`TimelineYears.tsx/EdgeOverlay.tsx`。**登记位置新文：**`lineage-view.store.ts`（focusSet/mode）、`timeline-interactions.ts`（focusIds）、`TimelineYears.tsx`、`LineageTimelineCard.tsx`、`EdgeOverlay.tsx`、`edge-overlay-geom.ts`（无 focusDim 的 fade/hover）、`useDrawLine.ts`，以及 `theme-lineage-nav.css`/`theme-lineage.css`（accent 与无 dim 皮肤）；删除的 `focus-bright.ts` 不得再出现。
- **验证列旧文：**含 `lineage-focus-bright.test.ts` 与 `lineage-zoom-dim.test.tsx`。**验证列新文：**`tests/unit/renderer/lineage-focus-visual.test.tsx`（空/非空全亮、accent、缩放后不变）、`lineage-edge-overlay.test.tsx` 与 `lineage-edge-edit-r2.test.tsx`（focusMode hover/无 dim/fade 保留）、`tests/e2e/lineage.spec.ts` T13 与 B5-E14（真实文本、computed opacity、四张截图）；既有 drawline 连画、pull-follow、slot-visibility、edge-hover-name 和图例负锚继续保留。旧两文件不得作为现行验证锚。
- **状态：**只有上述新源码与新机检同批落地后才标「已锚定」。

#### INV-153

- 旧文：「出口只在 edit 模式工具组的保存错误行可见（R4）。」
- 新文：「history 失败告警按 undo/redo 来源呈现，不显示保存重试，指引重按原方向命令；栈顶 peek 在成功前不 pop。四种 CONFLICT 的 stale 标记与确认丢弃出口在 edit/browse/focus 三模式稳定外壳均可见；系统失败无 drop。Q0/F0 history error 不再单独构成 ioUnsettled。」
- 机检：三模式 e2e、source guard、redo 系统失败不清 redo/U、丢弃只移一项。

#### INV-177

- 旧文：「进页缺省 browse（挂载 resetForMount 恒走——mode/tool/paletteFor 重置……）；退出聚焦=点浏览/编辑钮……[隐含旧 P-3 集合清除]……」
- 新文：「仅应用冷启动缺省 browse；resetForMount 只重置 tool/paletteFor，不覆写 mode/focusSet。所有不同模式切换保集合，同模式点击完全 no-op；清空聚焦按钮是唯一用户显式清空当前图入口，点击后停留 focus。focusSet 按 folder 挂起恢复且只含图内现存 id，graph/history 写点原子剪枝；页面切换保留，课题切换成功清全部集合并归 browse，不写磁盘。」
- 机检：§2.2 全表、A/B/A、重挂 focus、空 focus、redo 删除收敛。

#### INV-182

- 旧文末句：「判据只驻挂载编排层（LineagePage 挂载效应；resetForMount 的 mode/focusSet/工具态 reset 不受影响）。」
- 新文末句：「判据只驻挂载编排层；resetForMount 恒走但只重置 tool/paletteFor，不读写 mode/focusSet。挂载随后经 registry 统一活动投影同步口对目标集合做恒等成员剪枝：合法集合同值同引用，既有死 id 才移除；同图 ready 挂载仍零新增 graph IPC，防御剪枝不得触发 reload 或双取。」
- 机检：`lineage-b2-remount-refetch.test.tsx`、`lineage-restored-await-mount.test.tsx` 原取数断言保留；`lineage-session-registry.test.ts`/`lineage-timeline-page.test.tsx` 新增合法集合引用不变零 IPC、resetForMount 单呼不动 F、完整重挂只剪死 id 三例。

#### INV-187

- 旧文：「机检含 `lineage-io-phase` 队列∨在途∨相位三相并集……quitDirty/stillDirty 只读 IO。」
- 新文：「IO 相位与 U 仍分轴；ioUnsettled 只由 Q/F 定义，error 的可见性不自动等于仍有待写。quitDirty/stillDirty 只读实际待写与其他既有 reader/draft IO 信号；显式保存清 redo/U 的条件不变。」
- 机检：两源全表、Q0 error 灰点/U 不被伪清、Q1 失败仍拦截。

#### INV-190

- 旧文：「已知限制……真机上 setKeepOpen 与 store 写入不在同一渲染批，textarea 被卸载后重挂并失焦一次……」
- 新文：「自身 idle 提交与 keepOpen 置位必须在同一 React 同步提交批；随之而来的 saving 窗内 textarea 保持同一 DOM 节点与焦点，续写不丢。其他写 saving 仍让位，IME 例外不变。」
- 机检：挂起 IPC 单测+真机 MutationObserver/focus e2e；只有真机证据成立才删除旧限制。

### 13.2 核对但不改

- **INV-106**：reader 保存协议目标不变；AnnotationEditor 偏差由 `F-ANNOSAVE-01` 删除局部钮闭环。
- **INV-149**：R3 窄口径与其他写 saving 新交互锁不变。
- **INV-160**：现行内容与非自有 recovery 文件有关，B5 零触及。
- **INV-188**：per-folder 归属和迟到响应身份键不变；B5 只加强 focusSet 成员有效性。
- **INV-153 之外的历史深度/保存合同**与 INV-94：不显式改其他句子，undo 保留、保存只清 redo/U 的规则不变。

### 13.3 既有 ADR

- ADR-0026 保留无条件 quit/close 握手；C2 只改 stillDirty 输入。
- ADR-0027/0032 的 R4 edit-only、F-KEEPOPN-01 已知限制由 0033 取代；以演进注记指向新 ADR，不改写成旧限制从未存在。
- B4 历史设计稿 §14 保留原文；本稿与 0033 是后续决策记录。

## 14. 新 ADR 草案正文

建议文件名：`docs/adr/0033-lineage-mode-focus-toolbar.md`。

### Status

Proposed（2026-11-25 B5 设计裁决；随 B5 实现、INV 与测试同批落地后改 Accepted）。本 ADR 翻案旧 P-1 进页 reset 与退出聚焦清集，并记录无 dim、单排工具栏和 R4 三模式错误出口；不回写历史 mockup 让旧决策消失。

### Context

旧 P-1/P-3 把每次进入脉络页都重置为 browse，并在退出 focus 时清空 focusSet。该行为使用户跨视图工作后反复重建模式与聚焦，且与 B4 已落地的 per-folder 会话挂起不一致。旧工具栏分驻 Page 与 Timeline，browse/focus 隐藏保存和编辑控件，loading/error 连模式栏也消失；窄视口的 drag-hint 和错误行把工具组挤成多排。

聚焦曾使用 focus∪一度邻接 bright 集，其余卡和边变暗。最新产品选择是画布全亮，仅以 accent 描边标识聚焦卡；因此 bright/dim 计算、参数和 CSS 不应继续作为无消费代码存在。B4 的 history 错误出口又只在 edit 可见，browse/focus 被拒后只有短 toast，无法持续处理过期栈顶项。

### Decision

1. 应用冷启动 mode=browse；`resetForMount` 不再覆写 mode/focusSet，只收 tool/palette。页面卸载、重挂和 folder 切换保留 mode。
2. 任意不同模式切换不清 focusSet；再点当前模式完全 no-op。清空聚焦按钮是唯一用户显式清空当前图入口，只在 focus 且集合非空时可用，点击后停留 focus、允许空聚焦。
3. focusSet 继续按 folder 挂起恢复，应用退出才整体消失，不写 localStorage/DB。课题切换成功清全部集合并归 browse；失败保旧态。
4. 所有图态 apply/replace 写点按 patch 后 nodes 原子剪枝 focusSet。删除节点不留下死 id；undo 恢复节点不自动恢复已删除的聚焦成员关系。
5. 聚焦视觉采用全亮无 dim。仅 focus 模式给本集卡 2px accent outline、offset 1px；删除 bright/dim 纯函数、props、CSS 和旧视觉合同。focus 模式边 hoverScan 与 dim 解耦，拖拽 dimmed 保留。
6. 页面顶部使用单一、满宽、不折行的工具控件轨道；空间不足由轨道自身横向滚动承担。保存/历史三模式可用性只读 B4 command state，编辑工具在非 edit 禁用而不消失；缩放上移，左右侧栏共用实际 pane 状态。
7. loading/error 保留同一工具栏外壳；删除教学性可见文案，保留真实错误、数据文本与无障碍状态。错误告警位于横滚轨道之外。
8. write/history error 使用同一持久告警但按来源分流；保存失败才提供保存重试，history 失败指引重按原方向命令。四种 CONFLICT 的确认丢弃出口三模式可达，取代 R4 edit-only 限制。
9. `ioUnsettled=Q∨F`，Q0/F0 error 不再单独阻退出、课题切换或结构写；R3 keepOpen 窄口径不变，自身 idle 提交的同 DOM/焦点问题由同一 React 提交批修复。

### Consequences

- 正向：跨视图和跨图保持用户工作上下文；死 id 不虚增计数；保存/历史重试不再混义；browse/focus 的失败可持续处理；1024×768 下工具栏不再被教学文案和错误行挤成竖排；移除 O(E) bright 集计算。
- 成本：需要迁移模式/聚焦、工具栏 DOM、侧栏、dim 和错误几何的受锁测试；活动 focusSet 与挂起 entry 的同步必须集中在 registry 写口，不能新增第二状态源。
- 行为取舍：Q0/F0 error 仍显示，但不再单独构成退出/结构写未落定；这与普通写失败 Q≥1 的继续拦截形成明确分界。mode/focus 仍不持久化，应用重启回 browse/空集合。
- 文档：同批修订 INV-22/91/145/153/177/187/190；ADR-0027/0032 加演进注记。历史 P-1 文档与 B4 设计稿保留。
- 回滚：store 生命周期、registry 剪枝、错误/IO 语义、工具栏 DOM、无 dim 视觉分别可回滚；ADR/INV 必须与代码同向，不得只回滚一半。

## 15. 实施顺序、验证门与回滚

### 15.1 实施顺序

1. **基线与纯拆件。** `git status`、重测行数、跑现有 lineage 核心测试；先拆 Toolbar/Page/EditTools/ZoomControls 与 PageBody，保持旧位置和行为，证明拆件本身无回归。
2. **状态红测先行。** 为 §2.2 全表、C3 剪枝、C1 source guard、C2 两源和 F-KEEPOPN-01 分别留下失败证据，再实现纯件与 registry/store 写点。核心模块修改前后各跑对应测试。
3. **C1/C2 数据面。** 一次性迁移 message+source 的全部写点、投影/rekey/remap 和 ioUnsettled 消费注释；先绿 unit，再接告警 UI。不得先做条件按钮再补来源。
4. **单排 DOM 与侧栏。** 移 Toolbar 到 Page、上提右栏 hook、迁移左栏 prefs toggle、保留 testid；完成 loading/error 共壳和 1024 横滚。
5. **文案/视觉方案切换。** 删教学文案、ZoomBadge 和整条 focus dim 链；以新视觉测试替代，不能保留旧文件等待以后清理。
6. **keepOpen 真机闭环。** 在独立逻辑提交中完成 flushSync 与真机 e2e，便于单独回滚。
7. **文档与全量门禁。** 回写 INV/ADR/ROADMAP/registry，运行全量 lineage e2e、C2 相邻结构写/退出测试与 `npm run verify`。

### 15.2 验证门

- 纯函数/状态：mode×focus×folder×mount 全表、成员剪枝全写点、错误 source 全写点、Q×F×phase 全表。
- UI unit：三模式控件可用性、loading/error 共壳、清空钮、告警按钮条件、侧栏单态、zoom 边界。
- e2e：§12 全表；真实文本和必要 DB 回读必须同时存在。
- 视觉：1024×768 与 1280×800，无错/保存错/history 错、focus 空/非空、左右栏开合，无头截图实际查看。
- 全量：所有 lineage e2e + `folders-crud`/`recovery`/`workspaces`/结构写相邻面 + `npm run verify`。CI 同口径含全量 e2e。
- 质量：无 `TODO|FIXME|placeholder`；无 dim/ZoomBadge/drag-hint/retrySave 旧路径死引用；无新增依赖与外部模型代号；显式路径跑测试核对非零执行数。

### 15.3 分层回滚

1. **store 生命周期层**：回滚 mode/focus/resetForWorkspace 与 ADR-0033/INV-177 同向；per-folder registry 本身不回退到 B4 前。
2. **成员剪枝层**：可独立撤 focus-membership/projection 归一化，但须保留生命周期；回滚后应恢复 C3 回归红证而非删除测试。
3. **错误/IO 层**：C1 source 与 C2 Q/F 可分别回到上一提交；INV-22/91/153/187 同步，无 DB 回滚。
4. **工具栏 DOM 层**：可回滚 Page/Toolbar/侧栏接线，不触碰 store 历史与保存语义。
5. **文案/视觉层**：无 dim 与文案删除作为同一方案切换回滚；ADR/INV-145 同向，不留双实现。
6. **keepOpen 层**：单独撤 flushSync 时恢复 INV-190 已知限制和真机红证。

## 16. 整批完成定义

- §2 全状态表与 §12 e2e 全通过，`npm run verify` 全绿；CI 结论为 success 后才算收尾。
- 工具栏在 1024×768 和 1280×800 均单排、满宽、可横滚；loading/error 不丢模式入口；错误出现不改变控件轨道高度。
- mode/focusSet 跨挂载、跨视图、跨图恢复符合全表；空 focus 合法；课题切换全清；集合无死 id。
- 保存写与 history 错误按源呈现；redo 失败后任何保存重试路径都不会误清 redo/U；三模式 stale 出口可达。
- `ioUnsettled` 只有 Q/F 两源；普通失败写仍锁，Q0/F0 error 不再卡退出/结构写。
- 自身 idle saving 窗真机同 DOM/焦点证据成立；R3 其他写 saving 行为未变。
- bright/dim、右下角 ZoomBadge、drag-hint、旧空态/教学文案及无消费 props/CSS 全删除；新视觉和真实文本测试已补位。
- INV/ADR/ROADMAP/tickets 同批更新；tests 变更理由全部申报；diff 无 reader 实现蔓延，`F-ANNOSAVE-01` 与 `F-UNDOTEST-01` 保持独立 open 票。

## 17. 裁决记录

### 17.1 已闭合裁决

| 编号 | 事项 | 决定 | 来源/日期 |
|---|---|---|---|
| B5-D01 | C2 ① | **B 案**：ioUnsettled=Q∨F；空队 error 不再单独锁退出/结构写，INV-22/91 同批改 | 用户裁决，2026-11-25 |
| B5-D02 | C1 ② | **甲**：单告警按失败源分流；save 有重试，history 无保存重试并指引重按原命令；CONFLICT 保 drop | 用户裁决，2026-11-25 |
| B5-D03 | C3 ③ | **甲**：图态回写单点剪枝，不用投影过滤 | 用户裁决，2026-11-25 |
| B5-D04 | R4 ④ | **甲**：错误行和 drop 三模式可达，旧 edit-only 限制退役 | 用户裁决，2026-11-25 |
| B5-D05 | R3 ⑤ | 保持窄口径；其他写 saving 仍卸载编辑器，无放宽实施面 | 用户裁决，2026-11-25 |
| B5-D06 | R2 偏差⑤ ⑥ | AnnotationEditorActions 删除局部保存钮；批注靠 idle，定稿走界面级保存/Ctrl+S；`F-ANNOSAVE-01` open，建议 B6，不入 B5 | 用户产品裁决，2026-11-25 |
| B5-D07 | 测试缺口 ⑦ | 两项随 B5；其余四项由 `F-UNDOTEST-01` open 承接 | 主控按用户范围裁决登记，2026-11-25 |
| B5-D08 | F-KEEPOPN-01 | 并入 B5；同 React 提交批修同 DOM/焦点，R3 不变 | 已裁决承接面，2026-11-25 |
| B5-D09 | 工具栏排布 | 单排、不折行、原生横滚；保存/历史三模式，编辑工具非 edit 禁用；loading/error 共壳 | plan §7.1 + 本稿落地 |
| B5-D10 | focus 生命周期 | mount 不覆写 mode/F，模式切换不清，清空留 focus，per-folder 恢复，课题全清 | plan §7.2 + B4 per-folder 现状 |
| B5-D11 | 无 dim | 画布全亮；仅 focus 模式本集卡 2px accent outline；旧 bright/dim 全删 | 本任务已裁决输入，2026-11-25 |
| B5-D12 | 错误行物理布局 | 一条语义告警、按源分流；DOM 在横滚轨道外，文本可完整换行但不撑工具控件轨道 | 本稿设计决定，落实 C1/R4/ROADMAP 备注① |
| B5-D13 | 收起侧栏形态 | 只留工具栏开关；收起不占空 rail；调宽与 prefs 保留 | 本稿设计决定，避免重复开关与死 CSS |
| B5-D14 | 三界面保存边界 | 每个界面只保留界面级保存按钮，不为每条批注添加保存按钮；reader 与 lineage 各自统一定稿入口 | 用户裁决，2026-11-25 |

### 17.2 待用户裁决

无。C2 已在 2026-11-25 闭案；本稿不把已决项重新开放。若实现发现新的业务冲突，停下报告，不由实现者自行改动上述语义。

## 18. 交付契约

```json
{
  "deliverable": "b5-design",
  "sections": 18,
  "pendingRulings": [],
  "fileBudgetChanges": [
    "2026-11-25 实测 LineageToolbar 231→192，父件预算仍为≤140并拆子件",
    "LineagePage 203→194；改由 Page≤160 + 新 PageBody≤240 承载",
    "LineageTimeline 214→232；移除 toolbar/角标/dim 后仍要求≤200",
    "lineage-view.store 254→259；预算收紧为≤300",
    "timeline-interactions 112→118，EdgeOverlay 243→248，LineageTimelineCard 144→147",
    "TimelineYears 231→120（B3 已拆月框/卡行），B5 后≤160",
    "theme-lineage.css 449→411；现役另有 tools 183/nav 171/card 248/drag 81，均单列预算",
    "无 dim 依赖实测新增 edge-overlay-geom 104；侧栏去重新增 SideCapRow 42 的涉改面"
  ],
  "invRevisions": [
    "INV-22",
    "INV-91",
    "INV-145",
    "INV-153",
    "INV-177",
    "INV-182",
    "INV-187",
    "INV-190"
  ],
  "blockedTests": [24],
  "notes": "§7.5 实际覆盖29个唯一条目、其中24个必改或删除替换；C2按B落地，reader删除批注局部保存钮由F-ANNOSAVE-01独立承接。"
}
```
