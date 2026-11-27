# B6 阅读器保存入口和工具栏 v2 设计

## 1. 范围与依据

本批实施 `F-ANNOSAVE-01`，并交付三项写入时序设计。依据：

- 2026-11-26 用户裁决：下一批为 B6，落实阅读器工具栏保存收口和三个写入时序工单设计。
- B4 设计稿 §10.4：`HistoryCommandState` 和 reader 命令接口是工具栏的唯一状态与入口。
- B5 设计稿：脉络工具栏已建立单排原生横滚先例；本批沿用阅读器自身的皮肤和控件语汇。
- `F-ANNOSAVE-01`：批注编辑器删除局部保存钮；显式保存只在工具栏和 Ctrl+S。
- `F-UNDOTEST-01` 整票另行处理；本批只新增当前改动直接需要的回归。
- `F-UNDOHIST-02` 仍在 B6 之后。

范围外：不迁移数据库，不改跨进程契约，不新增依赖，不重写历史引擎。

## 2. 阅读器工具栏

### 2.1 界面结构

`ReaderToolbar` 保持目录开关在左端、研究面板开关在右端，中间是翻页、缩放、适应宽度、双页、颜色、选择模式和搜索槽。新增 `ReaderToolbarCommands` 放在目录开关与翻页组之间，内容为：

1. `SaveStateButton`，testid `reader-toolbar-save`。
2. 操作层撤销按钮，testid `reader-toolbar-undo`。
3. 操作层重做按钮，testid `reader-toolbar-redo`。

工具栏外壳继续保留 `.rdr-toolbar` 皮肤。新增 `.rdr-toolbar-shell` 与 `.rdr-toolbar-scroll`：外壳持面板底色和下边线，轨道横滚，内容行不折行。1024×768 时通过原生横滚到达右侧；目录和研究面板开关可先滚动再交互。搜索浮层不在横滚裁剪域内，仍由装配面定位。

### 2.2 保存语义

工具栏保存、总评面板文字态、批注编辑器 Ctrl+S、阅读器 Ctrl+S 都调用 `finalizeActiveTab()`。定稿顺序不变：提交挂载草稿、drain per-tab 写链、复查 IO，然后按 `editRevision` 决定 U 清理并清除 redo。成功后操作层合并会话结束；失败时 U、undo、redo 和草稿保留。

`ReaderNotesPanel` 不再渲染保存钮。它继续通过 notes store 显示保存中、保存失败、未保存和已保存文字态；保存动作只来自工具栏或 Ctrl+S。

`AnnotationEditorActions` 删除局部保存钮、`onSave` 接线和 `saveComment` 动作。它保留 saved/failed 图标反馈、文本层撤销/重做、删除和取消。失败态 Escape 继续触发 flush 重试；删除和取消按钮在 busy 中禁用。`AnnotationPopups` 不再消费 `saveComment`，因此 `AnnotationPopupActions` 同步删除该接口成员。

## 3. 活动 tab 命令态

### 3.1 状态归属

真相继续驻留原模块：

- undo/redo 双栈：`annotation-undo.ts`。
- finalize 在途：`reader-save-coordinator.ts`。
- 操作历史在途：`reader-history-commands.ts`。
- 全局退出冻结：`quit-closing-gate.ts`。
- per-tab 关闭冻结：`tab-closing-gate.ts`。
- tab 的 PDF、IO、U 状态：reader store 和 notes store。

新件 `reader-command-state.ts` 只持 per-tab 订阅者和递增版本号；`command-freeze-events.ts` 只广播全局冻结事实变化。它们不复制命令真值，也不承担守卫。

### 3.2 投影

`useActiveTabCommandState()` 用 `useSyncExternalStore` 订阅当前 `activeId`。快照是该 paperId 的稳定整数版本号；每次可能改变命令态的同步写点递增版本号并通知订阅者。活动 tab 变化时换订阅。Zustand 继续负责 activeId、tab、notes entry 的响应式读取。

通知点覆盖：

- 栈可达性变化：`pushUndo`（清 redo 同一通知）、`settleUndo`、`settleRedo`、`clearStack`、`clearRedo`。
- finalize 进入和退出。
- 操作历史进入和退出。
- per-tab 关闭冻结进入和退出。
- 全局退出冻结置位和解除。

仅推进载荷、终止合并会话或 remap id 等不改变 canSave/canUndo/canRedo/busy/saveState 的动作不通知。

投影条件：

- `canSave = activeId != null && tab.status === 'ready' && !finalize/history busy && !quitUserCommandFrozen() && !tabWriteBlocked(activeId)`。
- `canUndo/canRedo = activeId != null && tab.status === 'ready' && !frozen && 对应操作层栈深度 > 0`。
- 操作历史命令在途时 `busy=true`，但不额外禁用对应 undo/redo；点击继续按原队列排队。
- `saveState` 仍由 IO 和 U 聚合，`saving` 显示态允许普通写在场。禁用条件和显示态是两个投影。

loading、error 或无活动 tab 时所有命令禁用；既有空态结构保留。

### 3.3 冻结边界

退出冻结事件只面向按钮投影；真正的同步豁免仍由原命令门管理。per-tab 关闭冻结只影响当前 paperId，不同 tab 互不影响。恢复遮挡沿用应用层现有命令拒绝路径；当前没有证据表明 reader 需要独立恢复门，本批不新增。

## 4. 行为与迁移表

| 条件或事件 | UI 与写入结果 |
| --- | --- |
| 无可用 tab、打开中、打开文献失败 | 保留既有空态和 TabBar；保存/撤销/重做禁用，栈按会话规则保留 |
| ready 且无 IO、U、历史 | 保存禁用为已保存；undo/redo 空栈方向禁用 |
| 普通输入、粘贴、IME 组词提交、失焦 | 复用文本单元边界；版本推进与 U 置真由现有控制器负责；组词中不提交 |
| idle 写成功 | IO 回到空闲；U、历史和保存意图保留；工具栏保存仍可点 |
| idle 或预提交写失败 | 草稿、U、undo 和 redo 保留；面板/批注显示失败；已挂载批注可再次 Escape，工具栏保存可重试 |
| 点击工具栏保存或 Ctrl+S | 活动 tab 进入 finalize；先结算挂载草稿，再等 per-tab 写链，最后复查 IO |
| 失败总评已随面板卸载 | finalize 结算 `notes.flushNow`；成功且 revision 未前进则清 pending/saveFailed/U，失败保留可重试态 |
| finalize 或操作历史在途 | 保存拒绝重复命令；undo/redo 继续按既有队列；按钮态随在途变化 |
| 关闭或退出冻结 | 对应用户命令禁用；关闭流程内部 flush 仍走原收口面 |
| 定稿成功且 revision 未前进 | 清 U 和 redo，保留 undo；结束批注操作层合并会话 |
| 定稿期间有新输入 | 新输入更新 revision；旧保存回执不清新 U，排队写按写链结算 |
| 定稿失败 | U、undo、redo 和失败草稿保留；失败通过既有错误通道可见 |
| 操作层 undo/redo 或文本层 undo/redo | 各自按作用域执行和排队；成功后可再次定稿 |

## 5. 写入时序设计交付

三项工单保持 open；设计作为 B6 设计稿记录，实现仍须另行验收。

### 5.1 F-NOTEFOCUS-01

现状：新建悬浮笔记的创建写 saving 窗属于“其他写”，会让刚聚焦的编辑器卸载重挂并失焦。自身 idle 提交窗已经由 `F-KEEPOPN-01` 修复。

状态与迁移：实现只持一条 `focusIntent`。创建写任务进入写链时置位 `{ noteId, requestSeq, focusReason: 'create-write' }`，并保存当前会话代际；成功回执、用户取消、目标失效或代际失效都清除同一条意图。成功落库且 `noteId`、`requestSeq`、会话代际仍最新时，在重挂后的同一节点上于结算回执的同一微任务 tick 调用 focus；focus 后无条件清除意图。`focusReason` 目前只有一个创建写值；失败重试不新增恢复焦点意图。

取消判别：blur 处理读取 `event.relatedTarget`；若它非空且指向当前编辑器重挂容器之外的可聚焦控件，或紧随的 `document.activeElement` 已是其他控件，则这是用户主动移焦，立即取消。saving 预期卸载不取消意图：卸载 cleanup 检查该创建写仍在链上、草稿身份未变且当前无新的用户移焦，才保留意图。目标删除、`noteId` 改变、切换图、tab 冻结或请求被更新代际判废都直接取消。滚动不派发 blur，也不改变 activeElement，因此不取消。非 saving 卸载（切目标、删除、关闭或用户取消路径）按目标身份/代际条件取消，不等待成功回执。

验收：创建写完成后同节点获得焦点；用户已主动移焦时不抢焦点；目标删除、改 id 或切换图不恢复焦点；saving 预期卸载保留意图而普通卸载取消；滚动后仍复焦；tab 冻结不复焦；失败不静默丢失编辑器存在性。

### 5.2 F-CLOSERETRY-01

现状：普通写或预 flush 写失败且编辑器已卸载时，失败写条目保留在草稿注册表；重挂载可成功重试。关闭对话框重试没有挂载句柄，因此恒 no-op。

候选方案比较：①给句柄表加 tab 归属并保留卸载句柄，可精确复用写链，但要处理重挂替换、删除墓碑和同对象在途；②注册表保留按 paperId/annotationId/草稿身份寻址的 retry 闭包，影响面更小但仍必须经过同一条 per-tab 写链。

定案方向：采用方案②的寻址闭包，但闭包只调用现有裸写体或 flush 收口，不新增第二条写路径。键为 `{paperId, annotationId, draftId}`。墓碑、目标删除或代际失效时清除条目并报告不可恢复；同对象在途则进入既有 busy 排队；tab 冻结时拒绝用户重试；关闭流程内部的收口调用仍可执行。成功按原回执结算并清条目；失败保留条目并把真实错误送回关闭错误态。不扩大恢复能力，不支持跨 tab 或已关闭 tab 的后台重试。

验收：未挂载失败条目在关闭重试时真实派发；重挂载后旧闭包被新身份替换；删除/墓碑不再复活；其他 tab 关闭不影响本条目；同对象在途不并发。

### 5.3 F-NOTESRAW-01

现状：`persistNowRaw` 在预提交时可能写当前草稿而不是命令起点捕获值；回执前继续输入会因当前草稿与已写值不等而返回 false；首载门控也有同形静默中止。

迁移与实现方案：预提交命令在入口捕获 `{generation, snapshot, revAtStart}`，写体只使用 snapshot；回执按 generation 和 snapshot 结算。命令期间的新输入驻留草稿，不参与本次回执比较。成功且 generation 未变时允许操作层历史继续；generation 前进或后继写已排队时按写链顺序结算。真实写失败必须把 failed 状态暴露给面板和历史入口，禁止静默吞掉。

判别：未载/加载失败不发起命令；无变化返回 no-op；旧回执按代际判废；并发新输入保留为下一次写；重试只能由用户命令或收口面发起。

验收：起步快照落库；回执前新输入不清 U；旧代际回执不误判；失败可见且历史不静默推进；写链不出现并发裸写。

## 6. 测试设计

### 6.1 单测

新增和适配的定向面：

- `reader-command-state.test.tsx`：空 tab、ready 空栈、pushUndo→settleUndo→settleRedo→clearRedo/clearStack 分步中间态、finalize 成功/失败在途与退出、操作历史成功/失败在途与退出、首帧 layout effect 订阅、异 tab 栈通知隔离、activeId 切换、订阅失效与末位退订版本清理、per-tab 关闭冻结、退出冻结内部豁免、loading。
- `reader-toolbar-commands.test.tsx`：按钮顺序、禁用态、命令 mock 接线、横滚轨道。
- `reader-toolbar-save-race.test.tsx`：普通笔记写 saving 中，真实面板+命令组的 mousedown→focus→click 和 textarea Ctrl+S 都进入同一 finalize 并清 U。
- `reader-toolbar-note-retry.test.tsx`：面板打开时 finalize 首次失败只写一次并保留可见失败；面板关闭后复用 notes.flushNow 补写并按 revision 清 U。
- `reader-toolbar-key-routing.test.tsx`：保存、撤销、重做的 Enter/Space 不触发 PDF 滚动，Space 的 keydown/keyup 默认动作不被取消，各按钮只在可用态执行自身命令。
- `save-state-button.test.tsx`、annotation 编辑器测试：局部保存钮不在场、失败标记可见、Escape 重试仍可用、busy 时删除/取消禁用、显式 saving 命令门可点击且键盘激活可用。
- 既有 finalize、busy、tab-dirty、close、quit 测试继续锁写链和冻结语义。

新回归先红后绿；对本批裁决而过时的局部保存断言直接删除或改锁新结构，不保留恒真占位。

### 6.2 e2e

真实入口面：

- 保留 idle 落库、灰点跨 idle、Ctrl+S、undo/redo、关闭重开回读和面板失败态。
- 面内保存点击改为工具栏保存；批注动作行断言没有 `annotation-editor-save`。
- 新增 B6 工具栏用例：1024×768 用控件垂直中心线锁单排、DOM 顺序、无横向溢出和命令可见，并实际打开页内搜索验收输入、计数、active 高亮和真实匹配文本；800×768 锁原生横滚正距离；双侧栏默认展开→实际隐藏→展开，已知正文保持可见。

### 6.3 返工验证记录

实现评审驱动四项行为修正：订阅建立立即重读真值；退出冻结按钮只读 closing 持续冻结，不看内部 flush 豁免；普通写在途时 saving 显示与保存命令门分列；面板关闭后的总评经既有 notes.flushNow 补写。工具栏按钮阻止默认夺焦，保存、撤销、重做的 Space 不冒泡到 PDF 快捷键，Enter/Space 保留原生激活。

finalize 的失败语义最终收窄为专用选项：挂载句柄传 `retryFailed=false`，首次失败保留可见反馈并等待显式重试；无参 flush 保留在途失败后的自动重试，关 tab、Escape、切目标、quit 和课题切换行为不变。面板打开时首次失败只写一次，面板关闭后的总评重试继续复用 `flushNotesForTab`。

最终回归覆盖保存竞态、首帧订阅、退出冻结、面板开闭两种失败路径、Enter/Space、撤销和重做、activeId 切换及非 finalize 默认重试。独立定点复审 `bde35869aab7461aac713a2c1072c8d5` 为 PASS；私有副本 12 件 78 例通过，并对“无参 flush 也禁重试”和“移除 finalize 专用参数”两种变异分别取得失败证据。

2026-11-27 主控对最终工作区执行 `npm run verify` 退出 0：515 个测试文件、5217 个用例全部通过，生产构建成功。显式 X11 下 `npm run test:e2e -- tests/e2e/reader-text.spec.ts` 退出 0，23/23 通过，覆盖 1024 单排与页内搜索、800 原生横滚、双侧栏实际显隐、工具栏保存与 Ctrl+S、灰点和重开回读。执行端沙箱的 EROFS 与 Electron socket 限制未用于修改产品或测试；最终结论取自主控本机退出码。

## 7. 文档与工单映射

- INV-106：工具栏保存入口协议、saving 显示与命令门分列、批注局部保存退役。
- INV-194：reader 命令态模块化订阅、首帧订阅失效和退出冻结按钮投影。
- `docs/architecture.md`：reader 命令投影和工具栏收口。
- `tickets/registry.ts`：`F-ANNOSAVE-01` 翻 done；`F-NOTEFOCUS-01`、`F-CLOSERETRY-01`、`F-NOTESRAW-01` 补 B6 设计指针并保持 open。
- 本设计稿为三项写入时序设计的范围依据和验证映射单源。
