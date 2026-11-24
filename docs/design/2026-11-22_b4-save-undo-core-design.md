# B4 设计稿——两域保存、撤销、定稿灰点与文件夹挂起核心

- 日期：2026-11-22
- 设计基线：HEAD `d9d62581a3fed0ac9f2ca22b24db77194f7a3605`；本稿为工作树唯一未跟踪文件（2026-11-22 复核）。
- 规划单源：`/home/yyx/synapse-archive/scripts-audits/20261121-visual-review/plan-v1.md` §6、§11.1–11.2、§12.1、§14。
- 业务终版：`/home/yyx/synapse-archive/scripts-audits/20261121-visual-review/summary-draft.md` §10.1–10.5、§11；优先级高于本稿全部设计决定。
- 本稿性质：设计与后续红测试规格。本批设计阶段没有修改 `src/`、`tests/`、migrations 或共享合约，没有运行产品测试或 e2e；文中“红测试”均指实现阶段先写并证明失败的测试，不表示本稿已完成该验证。
- 体例：**事实**=当前代码/文档可核对；**决定**=已获裁决的设计，裁决记录单源=§17。全文不使用条件式选型状态：全部技术选型已闭合（§17）。
- 原始检索证据：`/home/yyx/synapse-archive/scripts-audits/20261122-b4/planner/`。其中 `lineage-command-callers-all.log` 为命令调用面，`async-consumers-rg.log` 为异步消费者，四个 `*-locked-tests-rg.log` 为受锁测试定位；行数为 2026-11-22 `wc -l` 实测。
- 修订来源：本稿为 2026-11-22 代码接地独立审查（总判 FAIL-可修：6 阻断+4 警告）处置后的修订版。审查证据=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/code-review/note.md`；逐条处置方式与落点节号见 §18 一轮表。D1/D2 已获用户终裁（2026-11-22：D1=A 窄例外+三段闭环、D2=A folder key 迁移，均与稿内既有方案一致）。二轮定点复审（2026-11-22，总判 FAIL：B1/B2/B4/B5 各剩一个窄缺陷+RW1–RW3 三警告+§18 计数观测）处置见 §18 二轮表；证据=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/code-review/recheck.md`。三轮定点复审（2026-11-23，总判 FAIL：仅剩 B1 普通写倒退链一项）处置见 §18 三轮表；证据=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/code-review/recheck2.md`。

## 1. 代码事实、规划差异与设计边界

### 1.1 已证实的现状

1. `lineage-write-queue.ts:448-528` 的 `flush()` 成功尾部在 `:513-516` 同时清空 undo/redo 并 release recovery；这与终版“只清 redo、undo 跨显式保存存活”冲突。
2. `SessionSnapshot` 在 `lineage-write-queue.ts:88-94` 含 `queue`；`lineage-session-ops.ts:49-64,77-111` 创建并恢复该 queue。它只能恢复内存待写序列，不能反向修改已经落库的行。
3. 当前共享 `writeActionSchema` 在 `src/shared/recovery/schemas.ts:40-69` 实测有 **7 种** kind；`lineage.store.ts` 与 `lineage-note-ops.ts` 的公开用户编辑入口实测有 **13 个**。复合入口不等于一种 queue action，必须逐入口定义可逆写。
4. `moveNode` 在当前生产 renderer 中没有外部调用命中，调用主要存在于测试；其余 12 个编辑入口有生产消费者。本稿仍覆盖全部 13 个公开编辑入口，避免留下“接口可撤销、实际没有逆写”的半套合约。
5. `reader/state/annotation-undo.ts` 只有 undo，没有 redo；标注操作类型实测为 create/delete/comment-edit **3 类**。批注文本 hook 使用 800ms 与 100 步（`use-annotation-draft.ts:45-48`），总评使用 600s（`constants.ts:60-65`）。
6. `TabState.dirty`、notes.pending、lineage.saveStatus 当前共同承担“未落库”和灰点；关闭失败路径还允许确认放弃（`tab-dirty.ts:148-185`）。这与终版“灰点=未定稿”和关闭二选不同。
7. 脉络只有一份活动图；`setFolder` 在 flushing 时拒绝切换并清全局 focusSet（`lineage.store.ts:346-359`），`LineagePage` 快捷键还只在 edit 模式生效（`LineagePage.tsx:92-113`）。
8. 课题切换当前在确认后立即 `discardAllPendingEdits()`，再 release recovery、switch、reload（`workspace.store.ts:134-149`），不是终版的“全量 flush 成功后清历史”。
9. B0 的恢复覆盖判定实际位于 `RecoveryBarHost.tsx:147-166`，`recoveryEntry.ts:220-255` 消费 `hasUnsettledWrites` 与 `settleUnsettledWrites`。B4 必须在这里拆分“需要 flush”与“恢复会替换有历史的会话”，不能只把 unfinalized 加进原布尔表达式。
10. B3 的布局屏障只拒绝新 pointerdown，并挂起路由/量测；flight finish 仍会写 `applyObstacleReroute`（`drag-layout-barrier.ts`、`useCardDrag.ts:68-102`）。它不是通用的 store 写锁，也没有 folder 身份守卫。

### 1.2 新发现的阻断差异

| 编号 | 规划要求 | 当前代码事实 | 影响与处置 |
|---|---|---|---|
| D1 | 删除节点 undo 必须恢复原 id 和完整字段 | INV-132 明确写明 restore/undo 不得复用已删 id；`deletion_events` 还有禁 DELETE/UPDATE 触发器（`026_baseline.sql:454-459`）；快照导入在读取本地行之前无条件跳过有删事件的 id（`import-snapshot.service.ts:156-180`） | **已终裁（2026-11-22 用户裁决=A，§17）。** 采纳 §7.5 的“限 history-unit 原 id 恢复 + 快照三段闭环（导出全集/活行 LWW/删事件代际判定）”方案；不得直接调现有 upsert 后宣称满足 INV-132 |
| D2 | 每个 folder 会话持有自己的图、历史与 unfinalized | `lineTypeNames` 虽出现在 graph 响应中，repo 实际读写固定全库 key `'lineTypeNames'`，无 folderId（`lineage.repo.ts:170-176,253-260`；DDL `026_baseline.sql:142-146`） | **已终裁（2026-11-22 用户裁决=A，§17）。** 采纳按 folder 迁移 meta key（027 一次性迁移），写读全链签名与 corpus export 取值、删夹清理见 §5.4；否则 A/B 图的色行名历史会互相冲突，不能把该字段简单装进 per-folder Map |
| D3 | 退出不被灰点误卡，结构写互斥只看真实待写 | INV-91 的 `lineagePending` 与 INV-22 当前共用 `useLineageDirty`；若直接把该 hook 改为 unfinalized OR，会让文件夹/文献结构写被灰点永久锁住 | **必须连带修订 INV-91。** `quitDirty` 与 `lineagePending` 都只消费 IO，不消费 unfinalized |
| D4 | 原 id、完整字段恢复 | 现有 `repo.upsertNode/upsertEdge/floatingNotes.upsert` 在新插入时自行生成 `createdAt/updatedAt`，不能保证恢复原 createdAt；普通 `patchNode` 还会归一 month/slot | history-unit 需要独立的精确恢复 repo 原语，不能复用公开 patch 通道冒充完整恢复 |
| D5 | 规划 §6.5 未列 migrations、snapshot import、INV-35/50/91/132 | 上述数据与生命周期事实使这些文件成为必要涉改面 | 本稿据实扩面；实现提交必须显式申报，不得当作无影响的 renderer 重构 |

### 1.3 不改变的边界

- 不新增依赖，不扩 recovery 多槽，不持久化 undo/redo/focusSet，不做 B5/B6 工具栏排版。
- 标注增删仍是即时写；reader 页进度、颜色、缩放、星标不进入 B4 保存对象或历史。
- 普通脉络编辑仍是乐观图态 + `WriteAction[]`；RecoveryPayload.schemaVersion=1 与其中 queue 的用途不扩成历史持久化。
- 一切 SQL 继续使用 `db.prepare` 与参数绑定；renderer 不新增通用节点创建入口。
- 文件硬上限以 `scripts/check-quality.mjs:189-209` 和 ESLint 为准：renderer `.tsx` ≤250、repo ≤300、其余源码 ≤500；本稿新件取更紧预算。

## 2. 统一状态模型与全迁移表

### 2.1 术语与状态轴

| 名称 | 定义 | 不表示 |
|---|---|---|
| `IO` | 一个保存对象的实际写状态：phase、待写集合、当前在途写、错误 | 是否被用户显式标记为已保存 |
| `unfinalized` | 当前 reader tab 或 lineage folder 自最近一次显式保存后有新编辑、undo 或 redo | queue 是否非空、DB 是否仍有在途写 |
| `idle-flush` | 1.5s 空闲信号触发的单元提交与落库，或立即收口链的后台 flush | 显式保存，不清 redo，不清灰点 |
| `finalize` | 显式 Ctrl+S/保存钮：提交文本单元、flush、成功后清 redo 与 unfinalized | 清 undo、额外写一份数据 |
| `history-unit` | 一次 undo/redo 的反向实体变化集；main 在一个事务中执行 | RecoveryPayload.queue 中的一组旧动作 |
| `reconcile` | lineage 权威和解链任务：needsReload=1 时单飞 keyed graph 读并在身份匹配时应用、清位（§2.6） | 显式保存；也不清 undo/redo/unfinalized |
| `closing` | reader tab 的 `none/flushing/confirm/error` 关闭子态 | 应用退出的全局 quit closing gate |
| `recoveryOwner` | 当前唯一 recovery 槽允许接收哪个 folder 会话的快照 | folder 的 DB 写锁，也不是多槽索引 |

保存对象固定为：reader=当前 tab 的标注操作、批注文本、总评；lineage=当前 folder 图。rail 阅读器角标为所有打开 tab 的 unfinalized OR，rail 脉络角标为注册表全部 folder 会话的 unfinalized OR。

### 2.2 reader tab 与 lineage folder 的共有字段

```ts
interface SaveObjectState {
  ioPhase: 'idle' | 'saving' | 'error'
  pendingCount: number       // 含已排队写；reader 还含已打开但未提交的文本单元
  inflight: { id: string; kind: 'write' | 'flush' | 'history' | 'reconcile' } | null
  lastWriteError: string | null
  editRevision: number       // 每次用户新编辑/undo/redo 同步递增
  unfinalized: boolean
  undoDepth: number          // 0..10
  redoDepth: number          // 0..10
}
```

reader 每个 tab 一条串行写命令链；lineage 每个 folder 一条串行写命令链，链任务顺序固定为：文本/普通写 →（needsReload=1 时）权威和解 → history → 后续新单元/操作 → finalize 清账（§2.6）。单个保存对象至多一个 `inflight`，不同 tab/folder 可并行。reader 在后台写期间允许继续输入，后续任务入链；lineage 保留既有同一会话 saving 编辑锁，但不再用该锁阻止切换到另一个 folder。

### 2.3 per-folder 会话注册表字段全表

**宿主决定：lineage 域（§17 主控终裁 3）。** `workspace` 只负责课题清单与切换确认，不持有图、queue 或 focusSet；App 经组合根调用全量 flush/reset。

| 字段 | 类型/初值 | 写入者与生命周期 |
|---|---|---|
| `workspaceId/folderId` | string | 创建时固定；workspace 切换使全部失效 |
| `sessionGeneration` | 单调整数 | 首次创建、恢复替换、删除后重建递增；所有迟到响应的身份键之一 |
| `graph` | `{nodes,edges,lineTypeNames,floatingNotes}` | 首次 graph、乐观编辑、写回显、history-unit 回显；不按 activeFolder 改写归属 |
| `derived` | `{paperMetrics,pubNos,tagNames}` | graph/恢复后派生读；不进入历史与 unfinalized |
| `status/error` | `loading/ready/error`、string|null | 每 folder 独立；旧 graph 失败也只写原会话 |
| `loadSeq/inflightGraph` | integer、Promise 外部句柄 | 防止同一 folder 重复取数与迟到覆盖；Promise 不进响应式快照；和解读复用同一单飞句柄 |
| `invalidationEpoch` | 单调整数，初值 0 | folders.changed/lineage.changed 空载荷事件到达时，全 registry 未删会话（含 loading）各 +1（§2.6 #41）；keyed 读（graph/reconcile 单飞）发起时捕获当前值；读的复用与 needsReload 清位要求读捕获值 ≥ 会话当前值（事件只增，等价于相等；§2.6 #34a/#43） |
| `queue` | `WriteAction[]` | 仅实际待落库普通编辑动作；不放历史项，不持久化进 SessionSnapshot |
| `inflight` | `{kind:'write'}`、`{kind:'flush'}`、`{kind:'history',unitId,direction}`、`{kind:'reconcile',epoch}` 之一，或 null | 回写前校验 folderId+generation（lineage-writeback-admission 唯一准入函数）。**字段级偏差（未按本行设计落地）**：普通 write/flush 的 `inflight` 没有 flight id。等价防护=同会话写链串行（响应只可能属于当前在途任务）＋generation 准入；history 响应另核 `folderId`/`unitId`，keyed 读另核 `loadSeq` 与读捕获的 `epoch` |
| `idleTimer` | 模块侧句柄 | 新编辑重排；显式保存/切换/关闭/退出先取消；不在恢复副本中 |
| `ioPhase/lastWriteError` | 上述 IO 状态 | 只由本 folder 写链迁移 |
| `undoStack/redoStack` | `LineageHistoryEntry[]`，各≤10 | 页面切换与 folder 切换保留；显式保存只清 redo；恢复替换/删夹/课题切换清 |
| `staleHistory` | `{direction, entryId, reason, message}` 或 null，初值 null | 过期历史标记：history-unit 以 CONFLICT 拒绝的方向栈顶历史项（方向＋历史项 id＋拒因与消息；判据=lineage-history-stale）。置位=history-unit 的拒绝分支；清除=成功移栈、显式保存清 redo（redo 方向）、新编辑单元入栈（recorder，R11）、用户在保存错误行出口确认丢弃；标记项不再位于其方向栈顶时读点判失效（§2.5 #18a） |
| `unfinalized` | boolean | 新编辑/undo/redo 置真；仅成功 finalize 按 revision 清；idle-flush 与 reconcile 不动 |
| `needsReload` | boolean | INV-175 的每 folder 权威和解位；不再是全局单槽；后台失效事件是它的新触发源，清位还要求清位读捕获 epoch ≥ 会话当前 epoch（§2.6 #35/#43） |
| `restoredAwaitingCommand` | boolean，初值 false | 恢复待令：真=恢复载入后、本会话写链尚无任务起步。置位=`applyRecoverySession`；清除=本会话写链任一任务起步（lineage-session-lane 的入链口——settleEdit、historyCommand、finalize、save、flushFirst、reconcileNow、idle 到期 flush 共七处）与会话替换/移除/课题切换 reset；读点=LineagePage 挂载效应与 #41 结构事件——为真时 needsReload=1 也不自动和解，和解时点=首次命令入链（§2.5 #34/#39、§2.6 #10a/#41） |
| `focusSet` | string[] | §14 终裁 2；按 folder 挂起，返回原图恢复，切 folder 不清其他图；课题切换全清 |
| `interaction` | `{dragging:boolean; settleFlight:Promise<void>\|null; layoutActive:boolean}` | B3 桥接两态：dragging=已激活未松手（无 FlightJob）；settleFlight=FlightJob 已建后的可等待句柄（600ms 兜底承诺域）；两态均阻塞同会话保存/历史命令起步，layoutActive 只继续 B3 指针与重算屏障（§9.3） |
| `lastProtectedRevision` | —（字段已删除） | 未落地：无消费者，已随 B4-B 删除（R-O1 裁定）；恢复副本的代际由物理账本 token/gen 承载 |

注册表另有 `activeFolder`、`switchSeq`、`workspaceGeneration` 与唯一 `recoveryOwner`。`useLineageStore` 可作为现有组件的活动投影保留，但所有写必须经 registry 的单一 `updateSession` 同步投影；后台响应禁止直接写活动投影。rail/quit 聚合读取 registry，不读取活动投影代替全集。

本表是设计口径，不是落地清单——不表示字段全部落地：`inflight` 无 flight id、`lastProtectedRevision` 已删除（两行内已写明）。字段的驻留位置（`entry.data`，或 `entry` 旁侧的 `inflightGraph`/`interaction`/`drag` 句柄与 lane 持有的 idle timer）以 `LineageSession` 接口与 lineage-session-registry 头注为准。

### 2.4 IO×queue/inflight 合法态全表

下表 Q 表示是否有待写，F 表示是否有 inflight（write/flush/history/reconcile 任一）；U/H/R 分别为 unfinalized/undo 非空/redo 非空。未列组合为非法状态，开发态断言与单测直接拒绝。

| phase | Q | F | 合法性 | U/H/R 约束 | 含义/下一出口 |
|---|---:|---:|---|---|---|
| idle | 0 | 0 | 合法 | U、H、R 任意 | 完全落定或仅灰点/历史驻留；显式保存可在无 Q 时定稿 |
| idle | 1 | 0 | 合法 | 通常 U=1；H/R 任意 | 等 idle timer，或 fire-first 尚未起步；任何收口可立即 flush |
| idle | 0/1 | 1 | 非法 | — | 有在途必须为 saving |
| saving | 0 | 1 | 合法 | U/H/R 不变 | 最后一笔写、history-unit 或权威和解读在途 |
| saving | 1 | 1 | 合法 | reader 可继续累积；lineage 同会话拒新编辑 | 串行处理后续 queue |
| saving | — | 0 | 非法 | — | 无在途不得停留在 saving |
| error | 1 | 0 | 合法 | U/H/R 不变 | 普通写失败，失败写保留，可重试 |
| error | 0 | 0 | 合法 | U/H/R 不变 | history-unit 冲突、CONFLICT 已出队但未获成功定稿、和解失败；错误可见 |
| error | — | 1 | 非法 | — | 重试先同步转 saving 并清本次重试错误；不并发两个状态 |

### 2.5 全事件迁移枚举

每行覆盖该行条件下所有 U/H/R 组合；“不变”明确包括 redo，不允许由 queue 推导任何一项。

| # | 起点/事件 | 条件 | IO 迁移 | unfinalized 与历史 | closing/其他副作用 |
|---:|---|---|---|---|---|
| 1 | 新读者文本输入 | 非 quit/closing；reader 可 saving | 打开/更新单元，Q=1；F 不变 | 立即 U=1、revision++；**单元提交时** push undo、清 redo，不逐键清 redo | 重排 1.5s；错误按目标清理，不清其他目标错误 |
| 2 | 新标注操作 | 命令通过 gate | 入 reader 链；空闲即 saving，否则排队 | 成功提交一个操作单元：U=1、undo≤10、redo 清 | 失败保留可重试写并显示错误 |
| 3 | 新 lineage 编辑单元 | 同会话非 saving（含 reconcile 在途）、非 recovery/quit/conflict 冻结、无未完成拖拽两态（§9.3） | 乐观应用+入队，Q=1 | 同一同步 recorder 完整完成后才 U=1、undo+1、redo 清；异常回滚本单元 | 排 1.5s idle-flush+300ms recovery trailing |
| 4 | 同 #3，但任一 gate 拒绝 | — | 不变 | 不变，零半成品历史 | 原因按现有 UI 可见；不得先清 redo 再拒写 |
| 5 | 1.5s 到期 | reader：有打开文本单元或 Q=1、F=0；lineage：活动会话有未收口的悬浮笔记草稿或 Q=1、F=0 | reader 提交文本单元；lineage 把草稿正文提交为编辑单元并入队（D-3）；随后同一信号启动 flush→saving/F=1 | 切一个单元并清 redo 一次；U 保持 1；undo 保留 | lineage 悬浮笔记：提交不关闭编辑器、不夺焦点；只有这次提交随之而来的 saving 窗不卸载 textarea（keepOpen 窄口径，R3），其他写触发的 saving 窗仍让位；输入法合成期不提交、compositionend 后重新计时 1.5s（R1，对齐阅读器文本单元），合成片段不进草稿快照、恢复副本与编辑单元（两项的已知限制见 §14）。提交被拒（同会话在途、拖拽两态、冻结、合成期）且 idle 提交句柄已挂载时重排 |
| 6 | 1.5s 到期 | 无单元且 Q=0 | 不变 | 不变 | 纯 no-op |
| 7 | 普通写单条成功 | 后续仍有 Q | 出队，继续 saving | U/H/R 全不变 | lineage 出队即存 recovery 最新剩余 queue |
| 8 | 普通写最后一条成功 | 无后续 Q | idle/Q0/F0 | **U 不变、undo 不变、redo 不变** | 可按 §8 释放/转移 recoveryOwner；不是定稿；needsReload=1 时链尾接和解任务（§2.6） |
| 9 | 普通写系统失败 | — | error/F0，失败写保留 | U/H/R 全不变 | 错误可见；后续重试从同一条开始 |
| 10 | 普通写 CONFLICT | 既有拒绝型 | 按既有规则丢弃该动作并继续；全部处理后可 idle/Q0 | U 与 redo 不因本次显式保存自动清；历史保留 | toast+needsReload；本次 finalize 记失败，和解完成后二次显式保存才定稿（§2.6） |
| 11 | idle-flush 迟到 timer | timer generation 已过期 | 不变 | 不变 | 显式保存/切换/退出已接管，旧 timer no-op |
| 12 | undo/redo 请求 | 栈空、PDF 未 ready、quit/closing/recovery 冻结 | 不变 | 不变 | no-op（真无效输入）；按钮禁用与快捷键同判据；同对象 reconcile/history busy 不属本行，按 #13d 排队不并发（RW1 处置） |
| 13 | undo/redo 请求 | 有栈、有打开文本/悬浮笔记草稿或 Q/F | 先提交草稿并 drain 当前对象写链 | 尚未弹栈，U/H/R 不变 | 后续新任务排在该 history 命令之后；lineage needsReload=1 时 drain 后先等和解（§2.6） |
| 14 | #13 的预 flush 失败 | — | error | 不弹栈、不改 redo、不改 U | 显示真实写失败；不得执行反向写 |
| 15 | 预 flush 成功，开始 history-unit | — | saving/F=history | U/H/R 暂不变 | 每对象一次恰一个 history-unit IPC；lineage 和解未完成前不启动（§2.6） |
| 16 | undo 成功（无后续任务） | 身份键（folder/tab+generation+flight id）全匹配；history 在途期间无新 revision/单元/queue | idle/Q0/F0 | U=1；undo−1、redo+1；截断≤10 | 应用服务器回显；不重新入普通 queue。lineage 本行 Q0 前提由 #3 同会话拒新编辑保证 |
| 16b | undo 成功（history 在途期间出现新编辑） | 身份键全匹配；reader 在途期间出现新 revision/打开单元/queue | 应用回显后按写链接管：有未完成任务→saving/F=下一任务；任务已清且仅剩草稿/已提交 Q→idle/Q1/F0 | U=1；undo−1、redo+1 不受新编辑影响 | 新输入的落库调度不丢、IO 不误报 clean；lineage 不出现本行（#3 gate 拒新编辑） |
| 17 | redo 成功（无后续任务） | 同 #16 | idle/Q0/F0 | U=1；undo+1、redo−1 | 同 #16 |
| 17b | redo 成功（history 在途期间出现新编辑） | 同 #16b | 同 #16b | U=1；undo+1、redo−1 | 同 #16b |
| 18 | history-unit 失败/冲突 | 同上 | error/F0 | **两栈不动，U 不改为已定稿** | 原历史可重试；文献消失等冲突给具体原因 |
| 18a | 过期历史项的标记与丢弃出口（D-1＝甲，适用面＝乙） | 撤销/重做被 history-unit 以 CONFLICT 拒绝，且拒因属四种拒因之一：HISTORY_STALE、HISTORY_PAPER_MISSING、HISTORY_FOLDER_MISSING、HISTORY_GRAPH_INVALID（值域单源=`src/shared/ipc/lineage-history.schemas` 的 `HISTORY_UNIT_CONFLICT_REASONS`） | error/F0（同 #18） | 两栈不动；按历史项 id 写入过期标记 `staleHistory`（方向＋历史项 id＋拒因＋消息） | 保存错误行内出现「丢弃这条过期历史」出口：须用户点击并确认才移除该方向栈顶项并清标记——纯内存操作，不写数据库，不自动执行更旧项。标记项已不在其方向栈顶、或写链在途=出口不出现、丢弃不适用。系统失败（非 CONFLICT）不标记、不给出口。出口只在 edit 模式工具组的保存错误行可见（R4，§14 限制） |
| 19 | 迟到的 history/flush 回显 | 任一身份键不匹配 | 只更新原会话的物理结果账本；活动投影不变 | 不弹新会话栈，不清新会话错误 | 可触发原会话下一次串行收尾，不写其他对象 |
| 20 | 显式保存 | tab/folder 可用；先取消 idle timer、提交所有打开单元 | drain 至该调用 revision 的写全部成功；无 Q 也进入定稿步骤 | 捕获 finalizeRevision；H 不动 | 仅同对象已有 finalize 或 history 在途时拒绝重复命令（busy 不含普通写 saving，普通写 saving 不排斥 #13 的 drain）；needsReload=1 时定稿步骤前先等和解（§2.6） |
| 21 | 显式保存成功 | 保存期间无 revision>finalizeRevision，且同 generation 权威和解已完成（needsReload=0） | idle/Q0/F0 | **redo 清空、undo 保留、U=0** | 灰点清；保存钮 saved 禁用 |
| 22 | 显式保存成功但期间有新编辑 | 有 revision>finalizeRevision，且和解已完成 | 按后续 queue 决定 idle/saving | redo 仍清（旧放弃分支死于定稿）；U=1；undo 含新单元 | 新编辑灰点不得被旧保存回执误清 |
| 23 | 显式保存失败/预 flush CONFLICT/和解失败 | — | error 或权威和解后的 idle+Q0+错误可见待重试 | redo/U/undo 全保留 | 无“已保存”成功反馈；和解失败不进入定稿清账（§2.6） |
| 24 | 关闭 tab 请求 | C=none | C=flushing；提交该 tab 文本并 flush | 暂不清 U/H/R | 重入只返回同一关闭 promise，不二次写 |
| 25 | 关闭预 flush 成功 | U=0 | idle | 关闭后清全部历史/文本注册表 | 直接移除 tab，不弹窗 |
| 26 | 关闭预 flush 成功 | U=1 | idle | 保持到用户选择 | C=confirm，显示指定二选文案 |
| 27 | 关闭确认“是” | C=confirm | 对象消亡 | 清 undo/redo、文本历史、U、草稿注册表 | 移除 tab；进度仍按既有通道收账 |
| 28 | 关闭确认“否” | C=confirm | 保持 idle | U/H/R 原样 | C=none，tab 留下 |
| 29 | 关闭预 flush 失败 | — | error | U/H/R 原样 | C=error，显示实际失败；只提供重试/留下，不提供“放弃未落库修改” |
| 30 | 页面切换 | 非 closing | 离场先提交并 fire flush，不等回执再切视图 | 所有 reader/lineage 历史、U、focusSet 保留 | 返回既有会话不重建历史 |
| 31 | reader 切 tab | 目标存在 | 离场 tab 提交+fire flush；activeId 同步切 | 两 tab 栈均不动 | 目标 tab 不错误消费离场 tab 的句柄 |
| 32 | folder 切换（含脉络页挂载时目标≠当前图的同步） | 任意 outgoing IO | 离场取消 timer、发最新 recovery 快照并 flush-first；activeFolder 随即切 | 每图 U/H/R/focusSet 保留 | 不弹弃改框；ownership 按 §8，不由 saving 阻切。脉络页挂载时目标≠当前图同样经本行切换：离场会话的未落定写由快照请求与 flush-first 承接，不以 IO 状态跳过目标图同步（R-W2） |
| 33 | 返回有内存 folder | ready 且 needsReload=0（不论图是否为空、不论 saveStatus） | 不 graph IPC | 恢复原图栈/focusSet | 不双取，不覆盖未落定值。「ready 空图挂载重取」例外已退役（R-W2）：只有悬浮笔记的图也是 ready 会话，后台失效由 #41 置 needsReload 承接 |
| 34 | 返回 needsReload 会话 | Q0/F0，且非恢复待令（`restoredAwaitingCommand`=假） | 允许一次 keyed graph 权威读（单飞，捕获发起时刻 `invalidationEpoch`） | 历史/U 不清；迟到响应只写原图 | 这是 INV-175 的必要例外，不是每次返回双取。恢复待令会话虽 needsReload=1 也不在本行和解——页面挂载与返回零 graph IPC（R-B9）；用户在图下拉显式重选同一图不经挂载效应，仍按本行和解 |
| 35 | 首次 graph 响应/和解解读应用成功 | 会话仍在、loadSeq 最新、读捕获 epoch ≥ 会话当前 epoch、Q0，且（F=0 或在途任务恰为本响应所属的 graph/reconcile 任务，身份键匹配） | idle | 新会话 H/R 空、U=0；已有会话 H/R/U 不变 | 写原 folder；权威应用分支=needsReload 唯一清位点；应用后本次任务完成并清本 F；已有会话的普通刷新不得清历史（B2 处置：本响应自身的 F=reconcile 不拦本回执） |
| 36 | graph 响应迟到/会话已有写 | 非最新或 Q>0，或读捕获 epoch < 会话当前 epoch，或在途任务存在但不是本响应所属的 graph/reconcile 任务 | 不写图态 | 不清栈 | 原会话保持 ready/现值；needsReload 保留并按 §2.6 显式续拉；本响应所属任务自身的在途不拦本回执（#35） |
| 37 | 应用退出握手 | 全局 closing gate 开 | 提交并 flush **所有 tab+所有 folder**；lineage 的等待名单=全部 IO 未落定的会话（`ioUnsettled`：队列非空 ∨ 在途 ∨ 相位非 clean——Q 与 F 直判，不经相位推断）；仍脏只由 IO/草稿判定 | 不做 finalize；U 不进入 stillDirty；历史直到进程销毁 | abort 只解冻，已完成的 idle-flush 不清灰点/栈；拖拽两态按 §9.3 有界收口；提交未能执行的悬浮笔记草稿残留经内部 settle 写路径落库（§9.3） |
| 38 | 课题切换 | 既有确认只以实际 IO 脏为触发；确认通过或无 IO 脏后，全量 flush 成功 | 全部会话 IO 落定（等待名单同 #37：`ioUnsettled`） | 然后清全部 H/R/U/focusSet，再 release、switch、reload | U 单独不触发确认；失败则保留全部状态并留旧课题，不执行 discard；草稿残留出口同 #37 |
| 39 | 恢复副本载入 | 目标 folder 当前写已落定且替换确认完成 | 目标会话 Q=payload.queue、U=1 | 目标 H/R 清（崩溃后内存史本就不存在）；其他 folder 不动 | needsReload=1，并置恢复待令 `restoredAwaitingCommand`=真：和解时点=首次命令入链，页面挂载、返回与 #41 结构事件都不自动和解（R-B9）；owner 按接管结果设置 |
| 40 | 删除 folder | 本域正常路径 | INV-91 保证注册表任一会话有 Q/F 时删除先被拒 | IO clean 的挂起会话可清；有未决写不得静默清 | 回退主图/既有冲突径；owner 安全转移或保留 chip |

### 2.6 权威和解链与后台事件失效补行（审查处置新增）

**范围声明：`reconcile` 链任务仅属 lineage per-folder 链。** reader CONFLICT 走既有单动作丢弃/重试，没有全图和解位。补行按「等待/失败/迟到/新编辑」四类给出，供 #10/#13/#20-23/#34-36 引用。

| # | 起点/事件 | 条件 | IO 迁移 | unfinalized 与历史 | closing/其他副作用 |
|---:|---|---|---|---|---|
| 10a | 和解链任务入链（等待） | flush 尾 conflictTouched∨needsReload=1，或显式保存/undo/redo 命令入链时发现 needsReload=1 | saving/F=reconcile；同 folder 单飞 keyed graph 读（folderId+sessionGeneration+loadSeq，捕获当前 `invalidationEpoch`），重复触发按 #34a 复用 | U/H/R 全不变 | needsReload 保持至权威应用；链内顺序=和解先于 history/finalize 清账。恢复待令会话在本行和解：本会话写链任一任务起步即清 `restoredAwaitingCommand`，随后按本行入和解链任务（§2.5 #39） |
| 10b | 和解成功（#35 应用分支） | 会话存在、generation 匹配、loadSeq 最新、读捕获 epoch ≥ 会话当前 epoch、应用时刻 Q0；在途即本和解任务自身（F=reconcile 不拦本回执，其余在途按 #10d 拒绝） | idle/Q0/F0；needsReload 清位 | U/H/R 全不变（和解≠定稿） | 此后 #21 才可清 redo/U，#13 的 history 在已和解图上执行 |
| 10c | 和解失败 | keyed 读失败或应用前会话失效 | error/F0；needsReload 保留 | U/H/R 全不变 | finalize 不定稿、history 不执行、不弹栈；重试=下次命令入链或返回触发单飞 |
| 10d | 和解响应迟到/被丢（迟到+新编辑） | 身份键任一不符、读捕获 epoch < 会话当前 epoch、应用时刻 Q>0，或存在非本和解任务的其他在途任务 | 不写图态；needsReload 保留 | U/H/R 全不变 | 链在 drain 完成后显式续拉（lineage-reconcile-tail；用户裁决 D-2＝甲）：先核会话存活——孤儿会话（恢复替换、删除、remap 离场）停止，不再发 keyed 读；drain 新 Q；再按当前 epoch 重新单飞（不并发两读）。上界 `RECONCILE_TAIL_MAX_ROUNDS`=3 轮和解（含首次；每轮和解任务体自身至多 2 次 keyed 读）——达上界即停止、位保留、写链让出，下一次命令入链时再续拉；续拉前新写系统型失败=停止（error、失败写保留）；和解失败（#10c）不续拉。接入点三处：flush 尾、finalize 前（#20c）、history 前（#13c）。lineage 同会话新编辑本就被 #3 gate 拒绝，gate 旁路（后台事件/恢复载入路径）由本行兜底 |
| 13a | history 前等待和解（等待） | #13 预 drain 成功且 needsReload=1 | saving/F=reconcile | 尚未弹栈，U/H/R 不变 | 和解成功后才开始 history-unit；本行使「正在返回的 graph 因 F=history 被丢」不再发生——graph 在 history 前落地 |
| 13b | history 前和解失败（失败） | 同 #10c | error/F0 | 不弹栈、不改 redo、不改 U | history 不执行；错误可见，可重试 |
| 13c | 和解读迟到（迟到） | 同 #10d 身份不符 | 不写图态；needsReload 保留 | 栈不动 | 链尾续拉（#10d 的存活核对、drain 与上界）；续拉成功才执行 history-unit，续拉仍未应用或续拉前新写失败=不执行、两栈不动；不得在未和解图上执行 history |
| 13d | 等待期间新 undo/redo 请求（新编辑） | 同对象 reconcile/history busy | 排队，不并发 | 不变 | busy 判据含 reconcile 在途；不破坏在途和解 |
| 20a | finalize 前等待和解（等待） | #20 进入定稿步骤时 needsReload=1 | saving/F=reconcile | H 不动 | 同 generation 权威 graph 成功应用后才允许 #21/#22 的清账 |
| 20b | finalize 前和解失败（失败） | 同 #10c | error/F0 | redo/U/undo 全保留 | 本次 finalize 记失败；无 saved 反馈；保存钮回可重试 |
| 20c | finalize 前和解响应迟到（迟到） | 同 #10d 身份不符 | 不写图态；needsReload 保留 | 不清账 | 链尾续拉（#10d 的存活核对、drain 与上界）成功后才定稿；续拉仍未应用=不定稿，redo/U 保留；续拉前新写失败=按预 flush 失败处置；续拉各轮 drain 的 CONFLICT 丢弃并入本次 finalize 的 #10 记失败判据；不按未和解图清 redo/U |
| 20d | 等待期间新编辑（新编辑） | lineage 同会话 gate 拒绝（#4）；gate 旁路路径按 #10d 兜底 | 和解照常完成 | 按 #22 revision 规则处理保存期间新编辑 | 和解不被拒绝的新编辑失效 |
| 34a | 和解读在途重复触发（等待） | #34 返回或 #41 事件命中已在途和解，且在途读捕获 epoch ≥ 会话当前 epoch | 复用在途单飞句柄；epoch 已被事件推进则旧读不可复用，按当前 epoch 重新单飞 | 不变 | 不并发第二次 keyed 读（B4 处置） |
| 34b | 和解读失败（失败） | 同 #10c | 会话 error；needsReload 保留 | 不变 | 返回/下次命令重试 |
| 34c | 和解响应迟到（迟到） | 身份键任一不符 | 丢弃，不写任何会话 | 不变 | 新会话 needsReload 不受旧响应影响 |
| 34d | 应用判据失败（新编辑） | 应用时刻 Q>0，或存在非本和解任务的其他在途任务 | 图态不写；needsReload 保留 | 不变 | drain 后链尾显式续拉（#10d 的存活核对与上界）；`reconcileNow`（#41 的活动会话立即和解）被丢后不续拉，位保留到下一次命令入链 |
| 41 | folders.changed/lineage.changed（后台失效） | 空载荷事件（`shared/ipc/schemas.ts:633-636` 实测）到达 | **全 registry 未删会话（loading/ready/error，非 deleted）标 needsReload=1 且各 `invalidationEpoch` +1（§2.3）**；活动会话 ready 且 IO clean（Q0、无在途写、无草稿）→立即按 #34 单飞和解（捕获新 epoch）；活动/缓存会话有 Q/F/草稿→位保留、链尾按 10a 自动续拉（新单飞捕获新 epoch）；loading 会话由 loader 按新 epoch 续拉（已有在途 keyed 读，不另发第二读） | 历史与 U 不动 | **恢复待令会话例外**：活动会话 `restoredAwaitingCommand`=真时同样位保留——它的和解时点是首次命令入链，#41 的立即和解是自动和解的另一条路径，对它同样不适用；该例外不并入 #42 的「IO clean 可清会话」判据。无会话 folder 不创建；默认方案不扩事件载荷——扩载荷携带源/目标 folder 列属另一 shared 合约变更，须主控裁决并申报，本稿不默认做 |
| 42 | 后台删夹 | 删夹成功事件命中 cached 会话 | 会话标 deleted；owner 会话按 §8.4 处置（IO clean 可清+转移；有未决写走冲突不静默清） | 目标会话历史清 | 返回该 folder 回退主图（现行 nav-graph-picker S4 路径 registry 化） |
| 43 | 后台失效的权威响应归属 | 任何迟到响应（含和解读与事件前发起的 graph 读） | 身份键（folderId+sessionGeneration+loadSeq）全部匹配、且读捕获 epoch ≥ 会话当前 epoch，才写原会话；任一不符丢弃 | 不写活动投影或其他会话 | 是 #19/#36 在 registry 的明确化；事件前发起的旧读不得清 needsReload、不得应用图态（B4 处置） |

现行 `nav-graph-picker.tsx:63-103` 只重拉活动图且 dirty 时跳过的行为，由 #41（活动会话立即和解、Q/F 会话链尾续拉）替代，不再依赖“活动图恰好新鲜”的偶然正确性。

## 3. 阅读器文本单元语义全表

共享常量命名为 `IDLE_FLUSH_MS=1_500` 与 `HISTORY_DEPTH_MAX=10`，删除旧 `AUTOSAVE_DEBOUNCE_MS=600_000` 及 hook 本地 800/100 常量。批注与总评共用一套 `TextTargetKey`：`{paperId,kind:'annotation-comment',annotationId}` 或 `{paperId,kind:'paper-note'}`。

| 输入/收口事件 | 单元边界 | 写与 redo 行为 | 特殊条件 |
|---|---|---|---|
| 普通连续输入/删除 | 无打开单元则以当前已提交值为 before 开单元；1.5s 内后续键只更新 after | 重排同一 timer；到期恰 push 一个 past 项、清一次 future，并启动 flush | 不在每个 onChange 清 redo |
| IME composition | start 记录 before；期间所有片段只更新显示值；end 以最终值整组提交一项 | compositionend 的同值后续 input 幂等；1.5s 后落库 | 组词期 Ctrl+Z/Y 不拦截；整组一步，不与前后普通输入合并 |
| 空格 | 空格并入当前单元，然后立即关闭该单元 | 下一字符开新单元；同一 idle 信号负责落库 | 不额外产生“空白单元” |
| 回车 | 换行并入当前单元，然后关闭 | 同上 | 多行 textarea 保持换行，不当成保存命令 |
| 粘贴 | 先关闭已有单元；粘贴内容单独构成并立即关闭一个单元 | 旧单元和粘贴单元都保留在 past；写链可只落最新值，但 undo 必须能逐步经过两值 | 使用 `beforeinput.inputType==='insertFromPaste'`/paste 事件同源判据，不把粘贴拆成逐字符步骤 |
| blur | 同步关闭当前单元，随后立即 flush | 提交时才清 redo；不等 1.5s | blur 由按钮按下引起时也只执行一次，不能双提交 |
| 切编辑目标/切 tab/页面切换 | 先关闭离场目标单元并 fire flush | 历史驻留注册表，不随组件卸载焚毁 | 返回后从对应 target 的栈继续 |
| 关闭 tab | 先关闭该 tab 全部打开单元，drain 写链，再按 §2.5 关闭 | 确认关闭才清栈 | 失败显示真实落库错误 |
| 显式保存 | 关闭当前 tab 全部打开单元，再 drain+finalize | 成功清该 tab 所有文本 redo 与操作 redo；文本/操作 undo 均保留 | 后续输入按 revision 保持 U=1 |
| 文本 undo/redo | 先关闭当前单元，再 drain；之后执行目标值反向写 | 成功才移动 past/future；失败两栈不变 | 新输入在命令后排入写链，提交后按新分支清 redo |
| 操作层 undo/redo | 走操作栈，不同时弹文本栈 | 成功恢复 annotation 后递增该 target 的 `contentGeneration`，使旧文本 past/future 失效 | 防止操作层恢复旧文后，文本层再把新一代值改回旧分支 |
| 非输入回显/load/idle-flush 成功 | 不开新历史单元 | 不清 redo | 服务器回显只更新基线与 IO |

每个 target 的 past/future 各≤10；每个 tab 的操作 undo/redo 也各≤10。`canRedo` 在存在未提交新输入时投影为 false，但真正销毁 future 的时点仍是该新单元提交。

## 4. 阅读器两层历史与串行写方案

### 4.1 决定：逻辑统一、物理分层（§17 主控终裁 4）

**决定（§17 主控终裁 4）：保留两层历史，用一个 per-tab coordinator 统一入口；不把文本值塞成 annotation 操作联合的第四类。**

- 操作层：create/delete/comment-edit，支持跨 idle-flush、显式保存、页面卸载的 undo/redo。
- 文本值层：批注 comment 与总评 contentMd 的 target 级 before/after；只在相应 textarea 焦点内接管 Ctrl+Z/Y。
- 协调层：per-tab 串行命令链、统一 finalize、redo 清理、关闭清理、target generation 和状态聚合。
- 快捷键：reader 页面非 editable 目标走操作层；批注/总评 textarea 走文本层；搜索等未接管输入仍用原生行为。Ctrl+S 在 reader 页面及上述 textarea 内都定稿当前 tab。

理由：两层撤销焦点和失效粒度不同，物理合并会制造“弹一个栈却写另一层值”的双源；完全不做协调又无法保证保存、redo 与代际失效同序。该选择已获 §17 主控终裁 4。

### 4.2 操作项形状与 redo/id remap

```ts
type ReaderOperationEntry =
  | { id: string; kind: 'create'; annotation: Annotation }
  | { id: string; kind: 'delete'; annotation: Annotation }
  | { id: string; kind: 'comment-edit'; before: Annotation; after: Annotation }
```

- create 的 undo=delete 当前映射 id，redo=saveAnnotation 重建；delete 的 undo=saveAnnotation 重建，redo=delete。
- comment-edit 的 undo=update before，redo=update after。
- reader 沿用现有“重建得新 id”的合约，不扩 B4 lineage 原 id 恢复到 annotations。每次重建成功后，对 undo/redo 两栈内所有同旧 id 引用做同一 remap，并更新活动 annotation id 引用；失败不做任何 remap。
- 删除/操作恢复使对应文本 target generation 失效。批注文本的普通单元提交不使自身文本栈失效；只有操作层命令写回旧文时才失效。
- 一个批注编辑会话只在操作层建立一条 comment-edit，后续 1.5s 文本单元更新它的 after；文本层仍保留逐步值。显式保存结束该操作合并会话，定稿后的新输入开启新操作项。blur/切目标也结束合并会话。
- 总评只有文本值层，不伪造 annotation 操作项。

### 4.3 per-tab 串行链的顺序

链任务顺序固定为：文本单元提交/即时操作 → 普通写 → history 请求前的 drain → history 写 → 后续新单元/操作。新输入可以更新受控草稿，但只有其单元提交任务进入链后才改历史栈。因此：

1. undo await 期间的新操作不会按下标误弹栈；它是链尾任务。
2. redo 与后续新编辑的顺序确定，后续单元提交才清 redo。
3. 同一 annotation 的 autosave、删除、undo 不并发；删除代际与 tombstone 仍保留作为回显防线。
4. `flush()`  fulfilled 不等于落库成功；调用方读取链尾每任务结果与最新 pending/error。
5. 现有 `annotation-popups-actions` 的 busy 等待、值复判与删除补偿迁移到链任务结果，不另建第二条直接 API 写路。
6. **history 在途输入是合法状态（§2.5 #16b/#17b 的依据）**：reader 没有也不新增全局输入锁，history-unit 在途时用户继续输入/打开新单元/排入 queue 均被允许，命令成功回显后由写链接管这些任务；lineage 的 #16/#17 Q0 前提成立的原因是 #3 同会话 saving 拒新编辑（INV-94 旧锁保留面），reader 无此前提，故必须分行。红测试两向：history 在途输入→history 成功（后续任务按写链接管，U=1、栈照常移动）；history 在途输入→history 失败（两栈不动，新任务照常落库，不错误归因）。

## 5. 脉络命令可逆性矩阵

### 5.1 历史项形态（§17 主控终裁 1）

**决定（§17 主控终裁 1）：采用“受影响实体的可逆命令对”，不采用整图 before/after 作为执行载荷。**

```ts
interface LineageHistoryEntry {
  id: string
  folderId: string
  command: LineageEditCommandKind // 下列 13 种
  changes: LineageEntityDelta[]    // 每项含 before/after 全实体；redo 顺向，undo 逆向
}

type LineageEntityDelta =
  | { kind: 'node'; id: string; before: LineageNode | null; after: LineageNode | null }
  | { kind: 'edge'; id: string; before: LineageEdge | null; after: LineageEdge | null }
  | { kind: 'floating-note'; id: string; before: FloatingNote | null; after: FloatingNote | null }
  | { kind: 'line-type-names'; before: string[]; after: string[] }
```

- redo 按数组顺序核对 before、写 after；undo 按反序核对 after、写 before。实现可在录制时物化 `undoOps/redoOps` 两数组，但二者必须由同一份 changes 派生，禁止手写两份不等价数据。
- 只记录受影响实体，不回放整图；因此期间无关的入库、移动、星标不会被旧整图快照覆盖。
- before/after 比较排除 `updatedAt` 和派生 `isStarred`，包含 id、paperId/folderId、全部用户字段、createdAt 与边端点/via/锚。排除 updatedAt 是因为普通 flush 回显会刷新它；其余字段用于检测分叉。
- 服务器写回可刷新 updatedAt，不改变历史项语义指纹。renderer 只增量应用响应实体并按 `lineageOrder` 重排 nodes，不用旧整图替换现图。

### 5.2 13 个编辑入口的反向写定义

下表“变化集”按 redo 顺序列出；undo 一律逆序写 before。N/E/F 表示完整节点/边/悬浮笔记，撇号表示操作后的完整值。

| # | store 命令 | 录制范围 | redo/普通编辑变化集 | undo 必须恢复的内容 |
|---:|---|---|---|---|
| 1 | `moveNode(id,x,y)` | 该节点 | `N→N'`，仅 x/y 改变 | 原 id、原 x/y 与全部其他字段 |
| 2 | `applyObstacleReroute(nodeIds)` | 月组全部传入节点 + 被清 via 的变化帧边 | 各 `N→N'`（slot 全序）+各 `E→E'`（via=null） | 逆序恢复原 via 和全部原 slot；一次拖放仍一项 |
| 3 | `drawEdge(...)` | 新边 | `null→E'`，id 在 renderer 创建时确定 | 删除同 id；redo 再恢复原 id/端点/视觉/via/双锚 |
| 4 | `editManualEdgeLabel` | 该边 | `E→E'`，仅 label | 完整旧边，不只回 label 后猜其他字段 |
| 5 | `applyEdgeLineStyle` | 该边 | `E→E'`，dashed/color | 完整旧虚线/颜色/via/锚 |
| 6 | `setEdgeVia` | 该边 | `E→E'`，含 via=null 显式清除 | 恢复原 via/自动路由状态及其余字段 |
| 7 | `reconnectEdge` | 该边 | `E→E'`，新端点、被抓锚、via=null | 原 from/to、双锚、via、label/视觉全恢复 |
| 8 | `saveLineTypeNames` | 当前 folder 的六行名 | `names→names'` | 恢复同一 folder 的原六行；存储前提见 §5.4 |
| 9 | `removeNode(id)` | 节点、全部相关边、同帧存留卡被清 via 的边 | 先记录存留边 `E→E'`；再相关边 `E→null`；最后 `N→null` | **先恢复原节点，再按原数组序恢复相关边，最后恢复存留边原 via**；节点与所有边均原 id |
| 10 | `removeEdge(id)` | 该边 | `E→null` | 原 id+完整字段插回；端点仍在才允许 |
| 11 | `addFloatingNote` | 新笔记 | `null→F'`，本地 id 即持久 id | 删除同 id；redo 恢复原 id/坐标/正文/folder |
| 12 | `updateFloatingNote` | 该笔记 | `F→F'`，全载荷 | 原正文/x/y/folder/createdAt；空 patch 仍无历史项 |
| 13 | `removeFloatingNote` | 该笔记 | `F→null` | 原 id+完整字段恢复；folder 不在则冲突不弹栈 |

`toggleNodeStar` 明确不入历史。所有实体变化集由 `lineage-history-commands.ts` 的单一 recorder 在 `beginUnit→enqueue…→commitUnit` 同步边界生成；任何 enqueue/物化抛错都回滚本次乐观图态与 queue，不留半项。

### 5.3 删除节点内部 restore 合约

1. history-unit 请求携带完整 before/after，不调用公开 `patchNode`；`put-node` 内部原语可插入指定 id，但仍只能由 `lineage/history-unit` 到达，不开放通用 upsert-node IPC。
2. 插入恢复时恢复原 id、paperId、folderId、title、year/month/slot、x/y、createdAt；updatedAt 由恢复点守卫计算：取恢复事务时间，同事务先读该 id 在 `deletion_events` 的 `MAX(deleted_at)`，若不大于它则进 1ms（§7.5），并随响应回显。更新既有行时 createdAt 不得被改写。恢复行「严格晚于该 id 全部既有 tombstone」的性质由普通写点守卫在后续一切写点保持（§7.5 三类写点统一不变量：可恢复实体每行 updated_at 在一切写点严格单调不减且新值>旧值）。
3. 相关边严格按历史数组序恢复；边 id、from/to、label、dashed/color、via、双锚、createdAt 全恢复。悬浮笔记同规则。
4. 事务前检查 folder 与 paper 仍存在；paper 已删、folder 已删、端点缺失、重复边/成环、语义指纹不符均返回 CONFLICT。整个 unit 不写任何行、两栈不弹、U 不假装已定稿。
5. 删除再恢复的 deletion_events 处置见 §7.5 三段闭环；该方案已获用户终裁（2026-11-22，A=采纳），L1 开工前提已满足。

### 5.4 lineTypeNames 的 folder 归属与全链签名

**决定：按 folder 存储，新增一次性数据迁移（D2；§17 用户终裁 A）。** 存储键 `lineTypeNames:<folderId>`（主图 folderId 同型同法）；graph/service/repo 全部显式携带 folderId；迁移把旧共享键值复制到每个现存 folder（含主图）以保持用户所见，再删除旧键。snapshot 的 TABLE_SPECS 已把 graph_meta 当通用 key/value 全量导出，无需扩表。

**终裁记录（2026-11-22）：D2 用户裁决=A（迁移为 folder key，§17 D2 行），本节方案为正式决定；workspace-global 备选退役，稿内不再保留其实现描述。**

D2 写读签名链（逐段落位；审查 B5 裁定：未完成本链前不得仅改 repo key 开工）：

1. 会话层：`saveLineTypeNames` 属当前 folder 会话；历史项 `line-type-names` delta 绑定该 folderId。
2. queue action 适配层：`upsert-line-type-names` action 的 `input` 保持 names 数组（`shared/recovery/schemas.ts` 不扩字段，queue 仍 7 kind）；renderer 发起 IPC 时由会话上下文注入 folderId，崩溃重放时由 `RecoveryPayload.folderId` 注入——两处必须走同一个适配函数，不得手写两份注入逻辑。
3. 请求 schema：`lineageUpsertLineTypesReqSchema` 由现行纯 names 数组（`src/shared/ipc/schemas.ts:403-408`）改为 `{folderId, names}`。
4. IPC：`main/ipc/lineage.ts:48-50` 由原样传递数组改为解构传 `folderId+names`。
5. service：`upsertLineTypeNames(folderId, names)`；graph 读 `listGraph(folderId)` 同步读 keyed meta。
6. repo：get/set 以 `lineTypeNames:<folderId>` 为键（`lineage.repo.ts:170-176,253-260` 现行固定 `'lineTypeNames'`）；新增 `removeMeta(key)` 原语供删夹事务使用。

涉改面（§11.2 同步列名）：`src/shared/ipc/schemas.ts`、`src/shared/ipc/api-surface.ts`、`src/main/ipc/lineage.ts`、`src/main/services/lineage/lineage.service.ts`、`src/main/db/repos/lineage.repo.ts`、`src/main/services/folders.service.ts`、`src/main/services/index.ts`（corpus export）、`src/main/db/migrations/027_lineage_meta_folder.sql`；契约测试 `tests/unit/services/lineage-assemble.test.ts:299-305`（现行锁 corpus 装配的全局 `getLineTypeNames()` 读）。

corpus export 取值契约（**已裁定 2026-11-22 主控确认=主图键，§17**）：corpus export 的 `lineTypeNames` 取主图键 `lineTypeNames:<主图 folderId>`。理由：corpus export 的 lineage.json 是全库派生资产（ADR-0011 口径），现行按全图语义取值；per-folder 后全局读失去唯一值，主图键是现行全局语义的直接后继，不引入按夹拼接或任意夹取值；分夹色行名仍可经各自 graph 读获得，export 契约无需扩夹列表。

folder 删除生命周期（B5 处置：删事件实体名为 collections）：删夹事务（`folders.service.ts:123-147` 现行只删 papers/nodes 与 folder 行、无 graph_meta 清理）在同事务内删除该夹 `lineTypeNames:<folderId>` 行（repo.removeMeta）。快照序列随之闭合：本库删除后导出不再携带该行；对端导入时对 payload.deletions 中 `entity='collections'` 的每个 id 执行派生清理 `DELETE FROM lineage_graph_meta WHERE key = 'lineTypeNames:' || id`（import-snapshot.service 删事件应用段新增，键前缀为单源常量），无孤儿残留、无复活路径。实体名实测依据：快照表名=collections（`snapshot.repo.ts:90-93`；folders.repo 即 collections 表的文件夹语义面），删事件触发器写 `VALUES('collections',OLD.id,…)`（`026_baseline.sql:433-436`）——卷内不存在 `entity='folders'` 的删事件。主图键不属于任何 folder，不受删夹影响。真库快照测试：真实删夹→导出→对端已有 keyed meta→导入后该 meta 缺席（§12.2 import-snapshot 行）。

## 6. queue、历史与 RecoveryPayload 的最终边界

### 6.1 SessionSnapshot 的迁移面

生产源码实测 `SessionSnapshot` 只由 `lineage.store.ts`、`lineage-write-queue.ts`、`lineage-session-ops.ts` 三件直接消费；测试还有显式快照夹具，集中于 `lineage-toolbar-session`、`lineage-recovery-authority:363`、`lineage-star-card:197-263`、`quit-gate-sources:288`，大量其余文件只是 `undoStack:[]` 初始化。

**决定：整体退役 SessionSnapshot，而不是保留一个去 queue 的旧壳。** `undoStack/redoStack` 改为 `LineageHistoryEntry[]`；`restore(snapshot)` 删除；queue 不再承担 saveStatus/clean 的推导。RecoveryPayload.graph 继续使用 shared `LineageGraphSnapshot`，与内存历史无类型复用。

具体迁移：

- `lineage-write-queue.ts`：删除 SessionSnapshot、undo/redo 字段与成功清栈；WriteQueueHost 只持图态、queue、IO 与 load 接口。
- `lineage-session-ops.ts`：从快照恢复器改为同步编辑单元 recorder；深度统一 10。
- `lineage.store.ts`：undo/redo 改调 async history-unit；不再读取 snap.queue，不再在 undo/redo 尾部按 clean release。
- 上述测试夹具改构造最小合法 HistoryEntry；纯空栈初始化可保留字段名，不断言旧载荷。
- `RecoveryPayload.queue`、`note-draft.planDraftRehydration`、恢复 preflight 仍读实际 WriteAction，不改读 history。

**discardSession 消费面澄清（审查 O2 裁定）：** 本稿删除的只是两个消费面——dirty 切图弃改确认框（`nav-graph-picker.tsx:194` 的确认分支）与 `restore(SessionSnapshot)`。「已恢复会话后放弃副本」入口保留等价目标会话清理：`RecoveryBarHost.tsx:146` 的 `discardLoadedSession` 与 `recoveryEntry.ts:379-383` 的 `restoredLoaded→discardLoadedSession()` 调用链不删，registry 化后它们清理的是目标恢复会话（queue/IO/历史），不是全局误删一切 discardSession 等价物。

### 6.2 普通 queue 的最终定义

- queue 只含当前 folder 尚未成功落库的普通 WriteAction；lazy 融合、inflight 项排除融合、按身份出队、系统失败保留、CONFLICT 处理全部保留。
- 新 idle-flush 只消费 queue，不重写、不重排、不清空历史项。显式保存调用同一 flush 后再 finalize。
- **权威和解是链任务，不是 fire-and-forget**：每 folder 串行链任务顺序=普通写 →（needsReload=1 时）和解（§2.6 10a）→ history → 后续任务 → finalize 清账。现行 `lineage-write-queue.ts:525-526` 的 `void get().load()` 收口退役；和解失败不得定稿、不得弹栈、不得清 U/redo（§2.6 10b/10c）。
- undo/redo 的 changes 不进入该 queue；它经同一 folder 写链执行一个 history-unit IPC，避免与迟到的普通写并发。
- 已落库动作不会仅因历史项存在重新入队。保存后 undo 是对 DB 的新反向写，不是恢复旧 queue。

### 6.3 RecoveryPayload.queue 保持单义

- schema、文件外覆层和单槽格式不增加 history/unfinalized/focusSet 字段；历史崩溃即失，DB 已 flush 值仍在。
- 恢复旧副本只把 `payload.queue` 放回目标 folder 的实际待写 queue，并按既有 generation、出队即存、冲突与幂等规则重放。
- 恢复时 graph 是乐观终态，queue 是仍需写 DB 的动作；两者继续同时存在。history-unit 已提交的事务不因旧副本而再次执行。
- deferred 恢复守卫拆为：
  - `hasUnsettledWrites = 任意目标 folder Q/F/draft`：决定是否先 flush；flush 不做 finalize。该谓词即 §8.1 恢复价值谓词，两处同源单义。
  - `hasReplaceableSession = 目标会话有 Q/F/draft 或 unfinalized 或 undo/redo 非空`：决定是否必须确认替换。**只看目标会话**（用户裁决 R2，2026-11-24）：活动会话≠目标会话时，活动会话的 U/H/R 不计——载入只替换目标会话，不触活动会话的历史与未保存标记。草稿属活动图：草稿在场恒真（它同时使 `hasUnsettledWrites` 为真，落定步先行）。
  - 有历史但 IO clean 时无需为了恢复先清 redo/灰点；只确认替换，成功载入后才清目标会话历史。
  - 替换守卫的落地形态：纯函数 `hasReplaceableSession(view, draftOpen)`（recovery-clean-lifecycle.ts，与 `hasUnsettledWrites` 同源）＋生产装配 `anyReplaceable(folderId)`（recovery-host-ports.ts：草稿在场→真；否则目标会话存在且该纯函数为真；无会话的 folder→假）。流程体（recovery-restore-flow.ts）在 read 到 payload 后以 `payload.folderId` 求值一次。仅 U/H/R（IO clean）时只弹一次替换确认、不调落定步；用户拒绝=不载入、条回 busy=false 可重试；宿主未提供该谓词=旧语义（不确认）。

## 7. history-unit IPC 与 main 事务方案

### 7.1 候选比较

| 方案 | 原子性 | 优点 | 缺点 | 结论 |
|---|---|---|---|---|
| renderer 逐条调用现有 patch/remove/upsert IPC | 无跨调用事务；中途失败会半写 | 不增 IPC | 直接违反 plan :331；删节点 restore 还无法表达 | 否决 |
| renderer for 循环外包一个“事务”名称 | 仍无 DB 原子性 | 表面改动少 | 名实不符，明确红线 | 否决 |
| 新增 `lineage/history-unit` → 独立 service → repo，`repos.withTransaction` 同步执行 | 一个 unit 全有或全无 | 可校验完整变化集、精确恢复、错误不弹栈 | 增共享 schema、service、repo 与装配测试 | **决定（§17 主控终裁 2）** |

### 7.2 请求/响应边界

新 shared 文件承载 schema，避免继续膨胀 `shared/ipc/schemas.ts` 或把历史塞进 recovery schema：

```ts
interface LineageHistoryUnitReq {
  folderId: string
  unitId: string
  direction: 'undo' | 'redo'
  changes: LineageEntityDelta[]
}
interface LineageHistoryUnitRes {
  folderId: string
  unitId: string
  nodes: LineageNode[]
  edges: LineageEdge[]
  floatingNotes: FloatingNote[]
  lineTypeNames: string[]
}
```

响应只含本次 touched 实体的服务器版本与当前 folder 色行名（按 §5.4 键 `lineTypeNames:<folderId>` 读取；`line-type-names` delta 的 before/after 同源同键）；空数组不表示整图清空。请求 strict 校验，所有 node/edge/note 的 folder 归属必须与 req.folderId 一致；unitId 用于回显去重，不作为跨重启幂等存储。

### 7.3 main 执行序

1. IPC 薄分发到独立 `lineage-history-unit.service`；service 内没有 async 步骤。
2. `repos.withTransaction` 开始；一次性读当前图、folder/paper 存在性和相关 meta。
3. 按 direction 对每个 change 核对当前实体与预期端态的语义指纹。任一不符抛 `CONFLICT/HISTORY_STALE`，在写前失败。
4. 在内存模拟最终 touched 图，复用/抽出的边守卫验证自环、悬空、跨图、重复、成环、via、锚；验证 folder/paper。禁止为了复用守卫而在每条写后读全图并留下半事务可见结果。
5. 按 undo 反序/redo 顺序调用新 history repo 的固定 prepared statements。删除相关边先于节点；恢复节点先于相关边。
6. 原 id 插入与防复活解释按 §7.5 三段闭环在同一事务语义内成立；恢复行 updated_at 由恢复点守卫计算（先读该 id `MAX(deleted_at)`，不大于则进 1ms，§7.5）；对既有行的反向更新（undo/redo 写 before/after）经 putExact UPDATE 分支的同一写点单调公式（§7.4/§7.5），updated_at 不倒退；不删除或更新 append-only 日志。
7. 提交后返回 touched 行。任一步抛错由 better-sqlite3 回滚，IPC 错误原样折叠为结构化 AppError。

### 7.4 repo 原语与安全

新 `lineage-history.repo.ts` 只提供 history 所需的 `putNodeExact/putEdgeExact/putFloatingNoteExact/remove*` 与读行原语，不暴露 SQL 字符串模板给 service。列名是源码固定常量，值全用命名/位置参数绑定；folderId、id、时间戳均作为参数。另提供只读原语 `readMaxDeletedAt(entity,id)`，供 §7.5 恢复点守卫在同一事务内取该 id 既有 tombstone 的最大 `deleted_at`。putExact 更新既有行的语句沿用三 repo upsert 的同一 SQL 标量 max 公式（§7.5 普通写点守卫；落地面含 COALESCE 包装——追认说明见 §7.5）：UPDATE 分支 `updated_at = max(@updatedAt, COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', <表名>.updated_at, '+0.001 seconds'), @updatedAt))`；INSERT 分支写调用方传入值（恢复插入=恢复点守卫计算值，普通反向更新=事务时间）——单一公式三处落位（三 repo upsert + putExact），不写第二份 TS 实现。主图/普通 folder 都经 folder 存在性检查。新 IPC 不接收路径、不新增出网 host、不改 CSP。

### 7.5 INV-132 冲突的解法：快照三段闭环与写点单调守卫（D1 已终裁，§17）

**事实（现行机制，2026-11-22 逐文件核读）：**

- 导出无条件携带全部活行与全部 deletion_events（`export-snapshot.service.ts:90-117`；`snapshot.repo.ts:162-163,189-190,265-267` 全量读、无剪枝）；append-only 触发器禁止删改删事件（`026_baseline.sql:454-459`）。
- 导入单事务内先按 IMPORT_TABLE_ORDER 逐行 upsert，再对 payload.deletions 逐项 `deleteDirect` 实删（`import-snapshot.service.ts:156-192`）；导入期 deletion_log_guard=1 抑制删事件触发器，导入删除不产生新 tombstone。
- payload.deletions 已携带 `seq/entity/id/deleted_at` 四字段（`envelope.codec.ts:60` 现行卷契约），接收端可读 deleted_at，无需扩卷。

**决定（2026-11-22 用户终裁=A 采纳）：不删 tombstone、不动 append-only，定义删事件与活行的代际关系，把导入闭合为三段判定。** 恢复行与删事件携带同源毫秒时钟时间戳——JS `toISOString()` 与 SQLite `strftime('%Y-%m-%dT%H:%M:%fZ','now')` 输出同格式定长串（`YYYY-MM-DDTHH:MM:SS.sssZ`），字典序=时间序——晚代际胜出；**三类写点单调守卫（删事件写点、恢复点、普通写点，2026-11-23 三轮复审把普通写点纳入，§18.3）使同库内平局不可达（见下）**，段三的相等分支因此降级为防御默认。

**段一 导出全集：** 导出恒携带全部活行与全部 deletion_events，不剪枝。理由：剪枝（丢弃被活行覆盖的 tombstone）会让持旧活行的对端库失去删除依据；全集交给接收端按其本地上下文判定才是完备契约。

**段二 活行 upsert（先读本地行，再判本地删事件）：**

1. 本地活行存在（无论本地有无 tombstone）→ 进入既有 updated_at LWW；不再因历史 tombstone 无条件跳过——本库存在活行即代表显式恢复/改写，是 INV-132 的受控例外。
2. 本地行缺席且有本地 tombstone → `skippedRevive`，现行防复活合同逐字保留。
3. 本地行缺席且无 tombstone → 插入。

**段三 删事件应用（接收端判定式，段二完成后的同事务内逐项执行）：**

```
输入：d = (entity, id, deleted_at) ∈ payload.deletions；row = readRow(entity, id)

row == null                            → no-op（幂等，无行可删）
String(row.updated_at) > deleted_at    → 跳过删除，stats.skippedSuperseded += 1
                                         （活行代际晚于删事件：恢复/改写胜出）
== deleted_at（相等分支）              → 同上跳过删除；写点单调守卫下单库内不可达，
                                         仅作守卫失效时的防御默认（不误删恢复行）；
                                         真库测试断言本分支不可达（§12.2）
否则                                    → deleteDirect(entity, id)
```

- 判定键用 `deleted_at` 而非 `seq`：seq 是源库本地自增，跨库、跨卷不可比；deleted_at 是唯一随卷传输的代际标记。
- 有 updated_at 的表（lineage_nodes/lineage_edges/floating_notes/papers/annotations/notes 等）按上式判定；`NO_UPDATED_AT` 表（collections/tags/paper_tags，`import-snapshot.service.ts:50`）无 updated_at 且不在任何恢复路径上，维持现行无条件删除。
- 恢复点守卫（history-unit service，TypeScript）：恢复行 updated_at=恢复事务时间；同事务先读该 id 在 `deletion_events` 的 `MAX(deleted_at)`（§7.4 `readMaxDeletedAt`），若恢复事务时间不大于它则进 1ms。由此恢复行 updated_at 严格大于该 id 全部既有 tombstone（§5.3、§7.3）。
- **普通写点守卫（2026-11-23 三轮复审 B1 处置）：** 恢复点守卫把恢复行推到未来毫秒后，现行普通 repo 写仍裸取 `new Date().toISOString()`（`floating-notes.repo.ts:90`、`lineage.repo.ts:182,207`），时间倒退使「再删除」的 `deleted_at` 可与既有 tombstone 同值被 UNIQUE 吞，或使导入段三误判（固定同毫秒真库重放反例=§18.3；本稿探针复现并闭合=ALL PASS/exit=0，主控与复审均独立复跑通过〔执行岗自报计数 26 与复审计数 25 系口径差，覆盖面无差异〕=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/rework3/probe-b1-r3-write-guard.mjs`）。处置=把写点单调守卫扩展到三个可恢复实体的全部写点，统一不变量：**「可恢复实体（lineage_nodes/lineage_edges/floating_notes）每行 updated_at 在一切写点严格单调不减且新写值>旧值」**。落位=三 repo upsert 语句 UPDATE 分支内 SQL 标量 max（选型 a；预编译+参数绑定不变，守卫表达式为源码固定常量非用户输入）：

  ```sql
  updated_at = max(excluded.updated_at,
                   COALESCE(strftime('%Y-%m-%dT%H:%M:%fZ', <表名>.updated_at, '+0.001 seconds'),
                            excluded.updated_at))
  ```

  〔2026-11-24 收尾追认（B4-B L1 裁决）〕落地面（`src/main/db/repos/updated-at-guard.ts`
  单源生成三 repo 语句）把「旧行+1ms」项包 `COALESCE`：合法 ISO 值与上式语义逐字等价；
  `strftime` 对畸形 `updated_at`（库外手改/历史脏值）返回 NULL 时，`max()` 会整体返回
  NULL 吞掉新值——`COALESCE` 使该项退化为 `excluded.updated_at`（新写值胜出），防 NULL
  吞没。删事件触发器同形（`max(now, COALESCE(OLD.updated_at+1ms, now))`）。

  INSERT 分支（新行）原样写 `@now`（无旧值可比）。选型理由：(a) 单语句内闭合——不变量由 SQL 语义保证，不依赖任何调用方记得先读旧行；(b) TS 侧写前读 existing 再计算 max 退役——需在热路径每写多一次预读 SELECT（现 repo 已有写后读作返回值），且把 028 已验证的 +1ms 进位算术复制成第二份 TS 实现，违背公式单源。两候选经 §18.3 处置单列为选型比对，(a) 为决定。

  **三表 updated_at 全部写点清单（2026-11-23 grep 实测：`rg "INSERT INTO lineage_nodes|INSERT INTO lineage_edges|INSERT INTO floating_notes|UPDATE lineage_nodes|UPDATE lineage_edges|UPDATE floating_notes" src/` 仅命中三句 repo 预编译语句，产品面无其他 INSERT/UPDATE 到这三表；026 DDL 三表 `updated_at` 均 NOT NULL 无 DEFAULT（`026_baseline.sql:129,138,297`），值必经应用层写入；测试夹具直插行属测试预置条件，非运行时写点）：**

  | 写点（语句锚） | updated_at 取值源 | 调用方（service 侧传值源核查：三个 Upsert 输入类型均 omit createdAt/updatedAt——`shared/models/lineage.ts:295-303,315-330,361-366`，调用方不能传时戳，值恒由 repo 方法体生成） |
  |---|---|---|
  | `lineage.repo.ts:133-141` `upsertNodeStmt`（UPDATE 分支 :140 `updated_at=excluded.updated_at`） | repo 方法体 :182 `now=new Date().toISOString()` 绑定 `@now` | `lineage.service.ts:211`（patchNode——moveNode 等 13 入口普通编辑 flush 面）、`library.service.ts:175`（文献年月改→节点同步，既有行）、`library.service.ts:268/276`（入图播种=新 id/改夹整行）、`import.service.ts:226`（文献导入播种=新 id） |
  | `lineage.repo.ts:142-151` `upsertEdgeStmt`（:150 同型） | repo 方法体 :207 同上 | `lineage.service.ts:292`（upsertEdge——画线/改线/重连/线形全部入口） |
  | `floating-notes.repo.ts:65-71` `upsertStmt`（:70 同型） | repo 方法体 :90 内联 `new Date().toISOString()` | `floating-notes.service.ts:66`（upsertNote——悬浮笔记新增/编辑，lineage-note-ops 提交面） |

  覆盖面与边界逐项：
  - flush lazy 物化合并路径的时戳取值点=repo 语句：`lazyInput`（`lineage-write-queue.ts:354-358`）与 `fullPatchBody`（:343-350）白名单不含时戳（:339「时间戳不在白名单——沿用库行」），DB updated_at 值源仍为 flush 执行时刻的 repo `@now`——守卫落 repo 语句即按构造覆盖该路径；出队成功回显把守卫后的真实值写回 store。renderer 乐观时戳（同件 :189-190/:205/:221-222/:236/:244-245）只写本地显示态、从不入 DB，且被写回显/恢复回显覆盖，§5.1 指纹比较排除 updatedAt——不在守卫面。
  - import `upsertRow` 不受影响（import-snapshot.service.ts:156-192 实读）：段二仅三分支——本地活行在场仅当 `inAt > local.updated_at` 才写（:179-181，LWW 保最大值，不产生倒退活行）；本地缺席+有 tombstone=`skippedRevive`（:160-163，不建活行）；本地缺席+无 tombstone=插入卷值（该 id 本地无 tombstone 可倒退）。段三 `deleteDirect` 的删事件落账由 028 守卫承担。
  - papers/annotations/notes 不在守卫面：三者无 history-unit 恢复路径，库内不存在把其 updated_at 推到未来的写点；其「倒退」只剩跨机时钟偏斜——既有 LWW 已声明的偏斜敏感面。
  - lineage_graph_meta 不在守卫面：meta 行无恢复路径；其唯一删除路径=删夹派生清理（§5.4），删后该键不再有任何写者，不存在「恢复→普通写」链；旧共享键由 027 删除后无残留写面。
  - history repo putExact 族受同一不变量约束（§7.4）：更新既有行的 UPDATE 分支用同一 SQL 公式（事务时间为基准），恢复插入写恢复点守卫值——history-unit 的 undo/redo 更新因此不倒退。
  - 边界申报（诚实面）：本不变量闭合的是 UPDATE 分支（既有行的普通更新点）。INSERT 分支撞「带 tombstone 的 id」仅两条理论路径：新 uuid 与旧墓碑 id 碰撞（repo 既有「uuid 彩票防雷」立场，`lineage.repo.ts:70-71`）；恢复副本重放落已删行（被 §8.2 末行/§8.4 后台删夹的冲突径拦截，不入队重放）。二者均非「既有行的普通更新点」，不在本不变量射程，如实申报不静默。
- 删事件写入点守卫（migration `028_deletion_log_write_guard.sql` 重建 7 个含 `updated_at` 表的 deletion_log 触发器：annotations/floating_notes/lineage_edges/lineage_graph_meta/lineage_nodes/notes/papers）：触发器体内 `deleted_at = max(now, OLD.updated_at+1ms)`——`now` 晚于 `OLD.updated_at` 时用 `now`，否则写 `strftime('%Y-%m-%dT%H:%M:%fZ', OLD.updated_at, '+0.001 seconds')`（进位含毫秒/秒边界，026 真库实测）；两分支都严格大于被删行删除前的 `updated_at`，平局不可达。`NO_UPDATED_AT` 三表（collections/tags/paper_tags）无 `updated_at` 可比，触发器保持原形态，其删事件在段三无条件删除、无平局概念。
- cascade 覆盖：SQLite FK ON DELETE CASCADE 的子行删除同样触发子表 AFTER DELETE 触发器（026 真库实测：删夹路径 papers→annotations/notes、collections→lineage_nodes→lineage_edges、collections→floating_notes 全部产生子表 tombstone，探针=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/rework2/probe-b1-real026.mjs`）。守卫在触发器体内比较 `OLD.updated_at`，cascade 子行与直删行同等覆盖；真库删夹须先删夹内 papers（papers.folder_id NOT NULL + `ON DELETE SET NULL` 使后删文献必败），与 `folders.service` 现行先删文献顺序一致。触发器体逐个核读依据=`026_baseline.sql:380-475`（annotations/floating_notes/lineage_edges/lineage_graph_meta/lineage_nodes/notes/papers/collections/tags/paper_tags 十个 deletion_log 触发器，前七个含 `updated_at`）。
- UNIQUE 不吞新删事件：`deletion_events` 有 `UNIQUE(entity,id,deleted_at)` 且触发器用 `INSERT OR IGNORE`（`026_baseline.sql:258,389…`）。在系统时钟单调（与既有 updated_at LWW 相同的信任级别）下，三类写点守卫使同 id 新 tombstone 严格大于其全部既有 tombstone：恢复行 updated_at>全部既有 tombstone（恢复点守卫）；此后该行一切更新新值>旧值、故恒保持>全部 tombstone（普通写点守卫+归纳——二轮稿「普通写 updated_at 为其后时钟值」的裸 now 前提已被反例证伪并由普通写点守卫替换，§18.3）；新删 deleted_at=max(now, OLD.updated_at+1ms)>该行删除前 updated_at（删事件写点守卫）。故同库内新删事件的 deleted_at 不与任何既有 tombstone 同值，INSERT OR IGNORE 恒插入新行不被吞。固定同毫秒反例链在守卫形态下实测闭合（§18.3；探针=rework3）。时钟回拨属既有 LWW 已声明的偏斜敏感面，非本守卫新增。
- 平局规则降级：段三相等分支保留取活行胜，作为守卫失效时的防御默认；真库测试断言其不可达（§12.2）。跨机时钟毫秒重合的平局仍受既有 LWW 偏斜信任限制（跨机时间戳比较本就信任时钟近似单调），非新引入敏感面。
- 对端派生清理：`entity='collections'` 的删事件项在段三同时执行 §5.4 的 graph_meta 派生清理（D2 已终裁采纳，§17）。

改动面=import 服务段二顺序、段三判定与 stats 一项（`skippedSuperseded`）、migration `028_deletion_log_write_guard.sql` 触发器重建（§11.2）、history-unit 恢复点守卫与 `readMaxDeletedAt` 原语（§5.3/§7.3/§7.4）、三 repo upsert 语句与 putExact 的普通写点守卫（§11.2；2026-11-23 三轮扩展）；不破坏 append-only、不删日志、不新增表列。曾评估备选（放弃原 id 恢复，改新 id+全历史 remap）已退役：闭环在现有协议字段上闭合，而 remap 会破坏业务终版“原 id”要求。2026-11-22 用户终裁采纳本方案（A）。

测试序列（真库；§12.2 import-snapshot 行同步列名）：

1. 本地三序列（保留）：删除未恢复→旧卷 `skippedRevive`；删除→history-unit 原 id 恢复→旧卷按段三不吞活行；恢复后再次删除→旧卷再次 `skippedRevive`。
2. **闭环序列 A：** 删除→history-unit 原 id 恢复→导出→全新库导入，断言活行存在且内容=恢复值（不被卷内旧 tombstone 删除）；对持旧活行（updated_at 更早）的对端库导入，断言其活行被恢复值 LWW 更新且不被删除。
3. **闭环序列 B：** 恢复→再次删除→导出→全新库导入不复活；对端持恢复行（updated_at=恢复值）被新删事件删除（新删事件胜）。
4. **同毫秒恢复序列：** 预置该 id tombstone `deleted_at`=T（直接插入 deletion_events，守卫恢复行 updated_at 严格大于 T，进 1ms 由守卫完成；守卫条件为 ≤，覆盖相等与更早，无需控时到同一毫秒）→history-unit 恢复落库→断言 `updated_at` 严格大于 T；导出→对端持更旧活行的库导入，活行存活并更新为恢复值。
5. **同毫秒再删除序列：** 恢复行 `updated_at`=U 后紧接真库 DELETE，断言新 tombstone 存在（UNIQUE 未吞，该 id deletion_events 行数 +1）且 `deleted_at` 严格大于 U（同毫秒时写点守卫进 1ms）；导出→对端持恢复行（updated_at=U）的库导入，该行被删（新删事件胜）。
6. **写点守卫不变式断言：** 对上述各库扫描 `deletion_events` 与行史，断言每条 tombstone 的 `deleted_at` 严格大于被删行删除前 `updated_at`、恢复行 `updated_at` 严格大于该 id 全部 tombstone——段三相等分支不可达（防御断言，测试断言不可达而非放宽段三）。
7. **cascade 断言：** 真实删夹（先删夹内 papers 再删夹）后，lineage_nodes/lineage_edges/floating_notes/annotations/notes 子表 tombstone 的 `deleted_at` 均严格大于其删除前 `updated_at`（守卫覆盖 FK CASCADE 路径）。
8. **「恢复→普通写→再删除」交错序列（2026-11-23 三轮新增）：** 删除→history-unit 原 id 恢复→普通 repo 写（patch-node/upsert-edge/悬浮笔记编辑任一真库写点）→再删除→导出→对端导入。同毫秒域用序列 4 同技术进入：预置远未来 tombstone 使恢复行 updated_at 落在未来毫秒区，普通写裸 now 必然早于它（repo 守卫 max 恒取「旧行+1ms」项，与 028 触发器 ELSE 分支同语义，确定性触发）。断言四层：本地普通写不倒退（updated_at 严格大于恢复值且内容=普通写值）；再删事件未被 UNIQUE 吞（该 id deletion_events 行数+1，新 deleted_at 严格大于全部既有 tombstone）；导出卷含全部 tombstone 且无该 id 活行；对端持恢复行或普通写行（updated_at=恢复值/普通写值）导入后均被删，终态无该 id 活行（新删事件胜、普通写值不复活）。

## 8. per-folder 挂起与 recoveryOwner 所有权图

### 8.1 切换算法

**恢复价值谓词（决定）：**`有恢复价值(S) = hasUnsettledWrites(S) = (S.queue.length > 0) ∨ (S.inflight ≠ null) ∨ (S 有未收口笔记/文本草稿)`。三源=待写 queue、在途写、草稿；**不含 unfinalized、undo、redo、历史**——已落库历史不是待写，不产生崩溃副本价值，也不阻 owner release。该谓词与 §6.3 的 flush 守卫同源单义，与 §8.2 各行的谓词输入列对应。

`switchFolder(A→B)` 的同步段：

1. 递增 switchSeq；提交 A 的悬浮笔记草稿，取消 A idle timer。
2. 若 `hasUnsettledWrites(A)` 为真，立即以 A+generation+revision 组最新 RecoveryPayload 并请求写；随后对 A 发 flush-first。均不等待用户、不弹弃改框。
3. B 有内存会话则直接投影；无会话才发带 folderId+generation+loadSeq 的 graph IPC。
4. activeFolder 同步变 B；A 的后续响应只回写 A。B 的编辑可继续，但在 ownership 未转移前不得覆盖 recovery 槽。

A flush 成功后：若 A 已是 activeFolder，owner 可留 A；否则若 B/其他会话需要保护，先用同一本会话 token 将最新 owner 快照替换为下一会话，成功回执后才改 recoveryOwner；若没有需保护会话，release A 的自有槽并置 null。切换挂起时必须置 `ownershipTransferPending`，抑制 A 普通 IO-clean release，先走上述转移裁决，避免出现 release→B save 的无副本空窗。A 失败则 owner 留 A，其他图编辑显示“当前编辑未受保护”chip，不覆盖旧槽。

### 8.2 activeFolder×outgoingFlush×incomingLoad×recoveryOwner 全表

本表实测 **14 个数据行**（2026-11-22 复核）；「恢复价值输入」列按 §8.1 谓词三源（Q/F/draft）标注 owner 判定所依赖的会话实况，U/H/R 不进入该列。

| activeFolder | outgoingFlush | incomingLoad | recoveryOwner | 恢复价值输入（Q/F/draft） | 允许行为与迁移 |
|---|---|---|---|---|---|
| A | none | A ready | A | A：无 | 正常编辑/快照；IO clean 可 release，U 不影响 owner 判定 |
| A | none | A ready | null | A：无 | 可编辑；首次需保护写时空槽则认领 A，外槽未决则 chip |
| A | none | A ready | foreign | A：实况不影响 owner 判定（owner=foreign） | 只允许 DB 写；recovery.save 不覆写，pendingChip 常驻 |
| B | A pending | B cached | A | A：有 | 立即显示 B 历史/focusSet；A 回写 A；B 可编辑但不写槽 |
| B | A pending | B fetching | A | A：有 | 允许一次 B graph；其响应只写 B；不重复发同图请求 |
| B | A success | B cached/fetching | A→B 过渡期 | A：曾有（成功后按算法转移/release） | 先成功写 B 快照才改 owner B；B 无恢复价值则 release A→null |
| B | A error | B cached/fetching/ready | A | A：有（失败写保留） | B 不覆盖槽；A 错误与 B 编辑分开显示；chip 表示 B 未受保护 |
| B | A pending | B error | A | A：有；B error 不入谓词 | B error 可重试；A flush 仍独立完成；不得把 B error 写成 A error |
| A | A pending（A→B→A） | A cached | A | A：随新编辑实况复查 | 不重复 flush、不 graph 双取；新编辑按 A revision 续队，成功不转移 owner |
| C | A pending，B 已挂起 | C cached/fetching | A | A：有；B/C 各按自身谓词 | 多会话可并存，owner 仍单值；B/C 都不抢槽 |
| B | none | B cached | A（A IO clean） | A：无；B：无 | 下一次 ownership 调度把需保护的 B 快照写入后转 B，或释放空 A；不新增第二槽 |
| B | none | B ready | B | A：无；B：无 | A/B 历史均在；仅 B 快照进入唯一槽 |
| 任意 | 任意 | folder 已删 | deleted folder | 按该会话实况；未决写→冲突 | 有未决写先走冲突，不能 release/覆写他图；IO clean 可清会话并按算法转移 |
| 任意 | quit/workspace reset | 不新建 incoming | 最后实际 owner | 全会话谓词并集=stillDirty 判定输入 | 先全量 DB flush；强退只保存单 owner 最新副本，不宣称保护全部失败会话 |

### 8.3 四条规划逐项落实

- **旧图响应只回写原会话：** graph、普通写、history-unit、恢复 save 全带 folderId+sessionGeneration+各自序号；activeFolder 只决定投影，不决定写归属。
- **离场 flush-first：** 同步提交草稿、快照、flush 后才切投影，但不 await；不是 fire-and-forget 丢弃，也不是等成功才允许切。
- **未成功前新图不覆盖旧槽：** owner 只有 A flush 成功且 B 快照 saved 后才从 A 到 B；失败留 A+chip。
- **返回不双取：** 有 ready 会话（needsReload=0）零 graph；needsReload 且 IO clean 仅允许一次权威读；同图重选不再恒重取。后台失效事件（§2.6 #41）给未删会话置位并推进 `invalidationEpoch`，不破坏本条——置位会话返回时仍走 #34 单飞例外，而非每次双取；事件前发起的旧读不得清位（#43）。
- **单槽不扩：** main recovery registry、文件数、token/epoch 全不变；per-folder 会话不是 per-folder recovery 文件。

### 8.4 recoveryOwner 自身迁移

| 事件 | 前置 | owner 迁移 | token/chip |
|---|---|---|---|
| 首次编辑 | 空槽、owner null | null→folder（saved 回执后生效） | 记 own/lastWritten token |
| 首次编辑 | 外会话槽未决 | 保持 null/foreign | pending 拒写，chip 真 |
| chip 显示判据 | 存在有未落库写的会话（`unlandedSessions`：Q>0 或在途 write/flush/history——仅和解读在途不算；草稿并入活动会话），且该会话既不是 owner、也不是认领在途的会话；正在 clean 的会话不计入自身 | owner 不变 | 「当前编辑未受保护」chip 为真，否则为假。认领、转移与 flush-first 仍读 §8.1 恢复价值谓词（Q∨F，含和解读在途） |
| idle/显式 flush 全成功 | owner=folder，其他会话无需保护 | folder→null（release 后；回执在途期来过编辑触发则不发布 null，见下一行） | 普通 clean 仍受 pendingChip gate |
| release 回执在途期同会话来新编辑 | owner=该会话，release 回执未落定 | 不发布 null，owner 留该会话 | 不清 chip；其快照写由那次编辑的触发面（trailing）派发；回执落定后不主动补发快照 |
| folder 离场成功 | owner=A，B 需保护 | A→B（B saved 后） | 复用本会话合法覆写；无“先删后写”空窗 |
| folder 离场失败 | owner=A | 保持 A | 其他图未受保护 chip |
| owner 迟到 save | owner generation 已变 | 不改变新 owner | 只按现有物理 token 账本记账；不得清 chip |
| 恢复 takeOver 成功 | payload.folderId=F | →F | 沿用原 token 双校验，原 payload 原样回写 |
| 恢复 takeOver pending/overflow | — | 不变 | 条保留可重试，不载入其他 folder 覆盖 |
| 放弃外槽 | 确认后 released | foreign→null | 只删旧槽；defer 后新图与其他会话不动 |
| 课题切换 | 全量 flush+本地 reset 已完成 | owner→null | 旧 workspaceId release 收束后才 switch |
| 后台删夹（§2.6 #42） | 目标 folder 已删且 owner 该夹 | IO clean→按算法转移或 null；有未决写→保持并走冲突 | 不静默清有未决写的 owner |

单槽的固有限制必须可见：多个 folder 同时有未落库写时，只有 owner 有崩溃副本；其他会话依靠 1.5s/切换/退出 flush，chip 不得暗示它们都受副本保护。

## 9. 异步搬移点与同步消费者交错序

### 9.1 实测消费者清单

`async-consumers-rg.log` 实测的主要同步消费者为：reader draft autosave、`switchTabFlushFirst`、`requestCloseTab`、`switchViewWithFlush`、`runQuitFlush`、`RecoveryBarHost.settleUnsettledWrites`、lineage `fireLineageNoteCommit`、NavGraphPicker/folders.changed、`prepareRecoveryWorkspaceSwitch`，以及 B3 flight finish 的 `applyObstacleReroute`。退出 main 侧仍由 ADR-0026 的 quit-close-policy 发事件，renderer 回执前查态。

### 9.2 三处异步化的交错序表

| 搬移点 | 必须在我之前 | 可与我并发 | 必须在我之后/不得提前 |
|---|---|---|---|
| undo/redo 前 flush | 当前文本单元/悬浮笔记 commit；当前对象此前所有普通写；取消旧 idle timer；捕获对象身份与 history entry；lineage 另需和解完成（§2.6 13a） | 其他 tab/folder 写、其他 folder graph、recovery 文件 IO、PDF 渲染 | 当前对象 history-unit 必须在 drain（与和解）成功后；后续新编辑任务在 history 后；弹栈和 U 更新只在 history 成功回显后 |
| idle-flush | 1.5s 单元边界与 editRevision；timer generation 校验 | 其他对象写、recovery trailing、视图切换；显式保存/关闭/退出可取消并接管同一写链 | 只清 queue/inflight；不得清 U/redo；链尾和解任务（§2.6 10a）在 drain 后；迟到回显不得覆盖新 revision |
| folder 切换 flush-first | 同步 `fireLineageNoteCommit`、最新 A recovery 快照、取消 A timer、捕获 switchSeq 与 A 写链 | A flush、B graph、B 活动投影与其他会话编辑同时进行；owner 仍按 §8 | A 回显只写 A；owner 转移在 A 成功+B saved 后；返回 A 不双取；任何新图的 recovery.save 不得早于 ownership 许可 |
| 显式保存 finalize | 与 undo 相同的 commit+drain，并捕获 finalizeRevision；needsReload=1 时另需和解完成（§2.6 20a） | 新读者输入可作为后续 revision；其他对象写并发 | redo/U 清理只在成功后；旧保存回执不得清后续新编辑灰点 |
| tab 关闭 | 当前 tab 全部文本 commit+drain，重入锁建立 | 非关闭 tab 可继续自己的写；关闭的是 active 时其编辑器禁输入 | 成功后才弹 U 二选或移除；失败只显示错误；确认是才清栈 |
| quit/workspace 全量 flush | 关闭新用户输入、提交全部草稿、拖拽两态有界收口（§9.3） | 各 tab/folder 写链可并行；同一对象内部仍串行 | quit stillDirty 在最后统一查 IO；workspace 清栈/reset 只在全成功后 |

### 9.3 与 B3 布局屏障的关系（拖拽两态拆分）

registry 交互态拆为两态，命令出口分别定义：

- **态一 pending/dragging（已激活、未松手、无 FlightJob）：** quit/folder 切换/页面切换的出口=按现行 pointercancel 同型**有界 settle**——以 `lastClient` 判定落位（`card-drag-session.ts` endSession 的 `judgeByLastClient` 路径），同步完成 pointer 批与 planSettle，构造 FlightJob 后转入态二。**决定=不提供零写 cancel。** 理由（RW2 处置重写）：激活期只写视觉/布局状态——`card.style.translate`、`--lg-pull` 与 React 拖拽预览（slot 的 `insertIdx/overFrame/extend`，实测 `card-drag-session.ts:151-167`），真实 store/queue 写发生在 settle 提交链（`useCardDrag` settle layout effect → `startFlight` → FlightJob `finish` 的 `onReorderMonthSlots`，`card-drag-session.ts:241-246`）；因此零写 cancel 并不弃任何已入 store/queue 的待写，其真实代价是制造第二种取消语义——现行 pointercancel 的取消判定用 `lastClient`，零写 cancel 会让同一拖拽出现「取消=丢布局意向」与「取消=有界落位」两套出口；有界 settle 复用现行 cancel 判定链，不新增机制。快捷键 save/undo/redo 在本态直接拒绝。
- **态二 settle-flight（FlightJob 已建）：** 600ms 数据写兜底承诺仅在本态成立（`card-drag-flight.ts` 定时器自 startFlight 起，pending/dragging 期间无此 timer——审查 W1 核实）。registry 挂可等待句柄 `settleFlight: Promise<void>`（finishOnce 触发 resolve）；quit/folder 切换/页面切换 await 该句柄后再 drain，600ms 是兜底上界不是常规耗时承诺。
- 内部 settle 写路径（`lane.settleEdit`）：两类写不经用户编辑闸（quit/recovery/conflict 冻结、同会话 saving 锁、未完成拖拽两态），以普通任务类串行入**原会话**写链，任务体内同步执行写体；写体仍经同一 recorder——历史项与队列写不另起一套。①拖拽落位的数据写：原缺陷是 quit closing 时落位被冻结门静默吞掉，退出握手仍按 clean 回执。②未收口草稿残留的出口（lineage-note-draft-settle）：提交因落库在途被跳过、或编辑器已卸载而草稿仍在时，正文经本路径落库——接在退出握手与课题切换的无句柄分支、恢复落定步、切 folder 四处。约束：不自带 drain——落位写留在暂存，落库由出口紧随其后的 flush（`save()`/`flushFirst()`）或 idle timer 承担；写失败=error 且队首保留，由 IO 查态承接。草稿残留出口入链后另 await `lane.save()`。
- `useCardDrag` 的回调必须捕获 folderId+sessionGeneration+drag id；组件因页面/folder 切换卸载后，兜底写仍只到原会话。若会话已因课题切换/恢复替换失效，则丢弃并记录冲突，不写新图。落位写准入=`registry.admitDragLanding`：会话在册且未删，且（代际相等，或该 entry 上已收尾的拖拽记录与「drag id＋激活时捕获的代际」全等）——后者覆盖 ghost remap 落库后存活主图会话就地换代的情形，落位按 drag id 重锚、不丢。`reorderMonthSlots` 返回 true=落位已被会话写链接纳，false=会话已失效。
- settle-flight 数据提交完成后，save/undo/redo 可执行；B3 的 `layoutActive` 继续只阻止新 pointerdown 并挂起路由/zoom，终局 routeEpoch/layoutEpoch 读取最新图态。无需把 padding 动画期扩成 DB 写锁。
- 新红测试必须覆盖两态四出口：激活未松手 quit（态一→有界 settle→数据写落原 folder）、settle 已启动 quit（await 句柄，≤600ms 兜底）、folder 切换两态、页面切换两态；既有「flight 未提交时切 folder、旧 flight 不写 B、不覆盖 undo 后值、布局终局只重算一次」断言保留。

## 10. 灰点、关闭与 B5/B6 接口

### 10.1 保存状态聚合

保留 `SaveUiState='dirty|saving|saved|failed'` 作为控件呈现枚举，但输入改为保存对象聚合：

- saving：当前对象有 finalize/flush/history 在途。
- failed：无在途且有可重试 IO 错误。
- dirty：无在途无 IO 错误且 unfinalized=true；即使 Q0 也可点。
- saved：unfinalized=false 且无 IO 工作；禁用。
- PDF status loading/error、closing、quit gate 令保存/undo/redo 禁用，但不清 unfinalized。history 冲突另行可见，不能伪装成 IO 已保存。

TabBar 灰点直接读 tab.unfinalized，不再把 `isTabDirty(annoDirty||notesPending)` 当灰点。App/Rail 通过 props 接收两个 OR 布尔，保持 Rail 不直接引 reader/lineage store 的现有边界。R2 阶段脉络角标经聚合接口恒 false（§15 R2 占位，主控终裁 7）；L1 起读 registry 真值。状态条“自动保存”槽继续只显示 IO，不把灰点改成永久“待保存”。

### 10.2 关闭对话框

成功 flush 且 U=1 时只显示：`当前文件未被标记为已保存，是否确认关闭？`，操作为“是/否”。是=关闭并清史；否=留在当前 tab。U=0 直接关闭。失败时改显示实际错误，例如 `有修改未能落库：<reason>。请重试保存后再关闭。`，只提供重试与“留在当前 tab”两项；旧的“放弃未落库修改”第二按钮及对应 discard 路径删除。

### 10.3 Ctrl+Z/Y 模式生效面（B4 统一裁定）

- lineage 的 Ctrl+Z、Ctrl+Y、Ctrl+Shift+Z 在 **edit/browse/focus 三模式都生效**，只按当前活动 folder 的历史、输入焦点、写 busy（含 reconcile/history 在途）、恢复/quit gate 判定。编辑工具是否可用仍由 mode 控制，二者不再共用一个 mode 门。
- 脉络 textarea/输入框内保留原生文本撤销；悬浮笔记的全局图历史只在焦点离开文本框后执行。Ctrl+S 在悬浮笔记编辑中也先 commit 再 finalize 当前 folder。
- reader 按 §4.1 焦点分层；Ctrl+S 在批注/总评 textarea 内也接管并定稿当前 tab。
- 其他页面不注册两域保存/历史快捷键。

### 10.4 B5/B6 只消费的命令接口

```ts
interface HistoryCommandState {
  saveState: SaveUiState
  canSave: boolean
  canUndo: boolean
  canRedo: boolean
  busy: boolean
}

interface ReaderHistoryCommands {
  saveActiveTab(): Promise<boolean>
  undoActiveTab(): Promise<boolean>
  redoActiveTab(): Promise<boolean>
}

interface LineageHistoryCommands {
  saveActiveFolder(): Promise<boolean>
  undoActiveFolder(): Promise<boolean>
  redoActiveFolder(): Promise<boolean>
}
```

布尔结果表示完整动作成功，不是 Promise 被兑现。busy 含 finalize/history（及 lineage 和解）在途，仅作运行中指示；普通写 saving 不置 busy。`canUndo/canRedo=false` 判据=#12 的 no-op 判据（栈空、PDF 未 ready、quit/closing/recovery 冻结）；reconcile/history 在途不禁用 undo/redo，点击按 #13d 排队不并发；保存钮在 finalize/history 在途时禁用（#20 拒绝重复命令）。B6 目录开关与翻页组之间的按钮、B5 单排工具栏只订阅这些状态和调用命令；本批不改其排版。既有 AnnotationEditor/ReaderNotesPanel 保存钮也改用同一 tab 级 finalize，避免局部 saveNow 与全局定稿并存。

## 11. 拆件方案与行数预算

### 11.1 reader、app 与 workspace

| 文件 | 2026-11-22 实测 | 拆件后预算 | 职责/动作 |
|---|---:|---:|---|
| `src/shared/constants.ts` | 121 | ≤150 | 1.5s/10 单源；shared 变更申报 |
| `reader/state/annotation-undo.ts` | 199 | ≤260 | 纯操作 undo/redo 栈、id remap；API 执行外移 |
| `reader/interact/use-annotation-draft.ts` | 309（收尾 197） | ≤200 | React 薄适配；值栈/timer/写链迁出。persist 与 persistRaw 两个端口出口在宿主回报「该值已在库」时清除阅读器草稿注册表的对应条目（annotationDraftSaved，等值才清）——总评正文写在途时离开阅读器后条目不清的 B4-A 遗留回归在此修复（B4-B·W-C） |
| 新 `reader/state/reader-text-history.ts` | — | ≤280 | target 值栈、generation、跨视图驻留 |
| 新 `reader/state/reader-text-unit.ts` | — | ≤220 | IME/1.5s/空白/粘贴纯状态机 |
| 新 `reader/state/reader-write-lane.ts` | — | ≤260 | per-tab 串行任务、drain、迟到身份 |
| 新 `reader/state/reader-history-commands.ts` | — | ≤340 | 操作写执行、undo/redo、finalize |
| 新 `reader/state/reader-save-coordinator.ts` | — | ≤260 | 纯 per-tab 协调与状态聚合；notes 访问经 ports 注入，不新增跨域 import |
| `reader/interact/SelectionLayer.tsx` | 167 | ≤210 | 创建标注写与 undo 记录改经 tab lane；选区几何/保存 rect 单源不动 |
| `reader/interact/annotation-popups-actions.ts` | 277 | ≤240 | busy 动作改 lane 任务；代际/删除补偿保留，API 直写收口外移 |
| `reader/interact/annotation-draft-registry.ts` | 164 | ≤220 | 草稿、flush 句柄、写代际与文本 target 身份适配；不持第二份历史 |
| `reader/view/AnnotationPopups.tsx` | 105 | ≤150 | 只接协调后的动作与 busy，不增状态机 |
| `notes/notes.store.ts` | 436 | ≤320 | 只留草稿/load/合并/pending 镜像；派发与收口迁出 |
| 新 `notes/notes.persistence.ts` | — | ≤260 | 参数化 notes 写适配与在途回显，不复制第二草稿态 |
| `reader/state/reader.store.ts` | 482 | ≤300 | store 薄壳；加载与 tab 生命周期先拆 |
| 新 `reader/state/reader-store-load.ts` | — | ≤240 | openPaper、loadSeq、迟到 graph/annotation 响应 |
| `reader/state/tab-state.ts` | 101 | ≤160 | TabState 增 U/IO/closing 投影类型，不持文本栈 |
| `reader/state/tab-dirty.ts` | 316 | ≤240 | 保留既有 notes 组合白名单，装配协调器 ports；IO/U 选择器与旧关闭复扫迁出 |
| 新 `reader/state/reader-close-tab.ts` | — | ≤260 | closing 状态机、flush、二选/失败决策 |
| `reader/view/AnnotationEditor.tsx` | 239 | 父≤140 | 先拆 textarea 与动作行，再接受控历史 |
| 新 `reader/view/AnnotationEditorTextarea.tsx` / `AnnotationEditorActions.tsx` | — | 各≤170 | 输入事件和按钮纯接线 |
| `reader/panels/ReaderNotesPanel.tsx` | 202 | ≤220 | 接共享文本控制器；不在组件写历史算法 |
| `reader/view/ReaderShortcuts.ts` | 123 | ≤170 | Ctrl+S/Z/Y/Shift+Z；其余键位不动 |
| `reader/view/reader-shortcut-handlers.ts` | 41 | ≤100 | 命令装配 |
| `reader/view/TabBar.tsx` | 178 | ≤210 | U 灰点；关闭 Dialog 宿主拆出 |
| 新 `reader/view/CloseTabDialogHost.tsx` | — | ≤180 | 二选与失败 Dialog，复用共享 Dialog |
| `renderer/shared/save-status.ts` | 132 | ≤200 | IO+U→SaveUiState 单源；保留按钮双编码 |
| 新 `renderer/shared/history-command.ts` | — | ≤100 | B5/B6 共有命令状态类型 |
| `app/Rail.tsx` | 175 | ≤200 | 两个 U 角标 props，不引域 store |
| `app/App.tsx` | 177 | ≤195 | 只组合；聚合 hook 外移 |
| 新 `app/use-save-aggregates.ts` | — | ≤180 | IO quitDirty、reader/lineage U OR、lineagePending 分列；R2 阶段脉络 U 输出恒 false 占位（§15） |
| `app/AppStatusBarHost.tsx` | 74 | ≤110 | 状态条只消费 IO |
| `app/quit-flush.ts` | 87 | ≤170 | 全 tab+全 folder flush；U 不入 stillDirty；拖拽两态有界收口 |
| `app/view-flush.ts` | 35 | ≤100 | 页面离场 commit+fire flush，不清历史 |
| `workspace.store.ts` | 152 | ≤180 | 移除 notes discard 依赖；注入全量 prepare |
| `WorkspacesPage.tsx` | 248 | 父≤180 | 先拆列表/新建行；更新“落库后切换”文案 |
| 新 `WorkspaceList.tsx` / `WorkspaceCreateRow.tsx` | — | 各≤180/140 | 纯 UI 拆件 |
| 新 `app/workspace-switch.ts` | — | ≤240 | 全量 flush→清所有历史/focusSet→release→switch 编排 |
| `app/ViewHost.tsx` | 51 | ≤90 | 注入新 workspace prepare，不在路由件持状态 |

`check-quality.mjs` 不新增 reader 白名单：现有 `tab-dirty.ts` 例外原位承担组合装配，纯协调器只接收 ports。检查脚本只删除 workspace.store 对 notes.store 的失效例外（537 行现状，改动为零新增、净减一行），随提交说明申报；不顺手重构检查器。

**实施注记（2026-11-23，R1/R2 落点偏差——只记事实不改语义）：**

1. R1 偏差（主控已核可，随 R1 报告）：① lane 下沉 `src/renderer/shared/tab-write-lane.ts`（设计路径 reader/state/reader-write-lane——notes.persistence 不得跨域 import reader 件故下沉）；② 表外件 `reader/state/reader-text-controller.ts` 324 行（§11.1 未列——use-annotation-draft 的非 React 内核）；③ notes.store persistNow 端口；④ canUndo 投影含未提交输入；⑤ PDF 未 ready 拒绝在 reader.store.applyOpHistory。
2. R2 偏差（本波）：① `reader-close-tab.ts` 自 tab-dirty.ts 拆出承载 closing 状态机（§11.1 表内件；任务简报枚举未点名，按「§11.1 的 R2 面文件」口径纳入）——check-quality 白名单随之新增该文件→notes.store 一行（tab-dirty 同型先例，非「零新增」：closing 收口组合点迁移的必要落位）；② `LINEAGE_UNFINALIZED_R2` 占位常量驻 use-save-aggregates.ts（命名避开检查器 placeholder 负锚字面量）；③ HistoryCommandState 的 canUndo/canRedo 投影=操作层栈深度非订阅读（B5 工具栏接线时随 L1 补全订阅面——R2 消费方〔ReaderNotesPanel 保存钮〕只读 saveState）；④ saveState 的 saving 判据含在途普通写（notes saving 镜像），HistoryCommandState.busy 仍只含 finalize/history（§10.4「普通写 saving 不置 busy」两口径分列）；⑤ AnnotationEditor 局部保存钮暂未改 tab 级 finalize（§10.4 该句的落点随 B5 工具栏接线，本波只迁 ReaderNotesPanel——受锁面 save-state 族仅列 notes panel 测试）；⑥ 课题切换清史在 prepare 成功段执行（reader.close()+lineage 快照栈 setState+clearFocus——单图旧机制，L2 扩 registry）；⑦ reader.store.ts 实测 334 行（R1 后 301、预算 ≤300 已超 1 行——R2 增 U/closing 三 action 后 334；超标面=接口注释+action 实现，未拆新件——拆件候选随 B5 前的 store 再瘦身立项，此处如实申报）。

### 11.2 lineage、recovery 与 main

| 文件 | 实测 | 拆件后预算 | 职责/动作 |
|---|---:|---:|---|
| `lineage.store.ts` | 607 | ≤280 | 活动投影+公开动作薄壳；数据写归 registry |
| 新 `lineage-session-model.ts` | — | ≤200 | 会话/IO/交互类型 |
| 新 `lineage-session-registry.ts` | — | ≤380 | 每 folder 会话（含 `invalidationEpoch`，§2.3）、active 投影、focusSet、聚合 |
| 新 `lineage-session-core.ts`（表外件） | 37 | ≤60 | 注册表内部面的类型契约——自 registry 外移的裁决件（rekey/remap/drag/projection）经它读写会话表、活动键、代际计数与单一写路径，不 import registry 运行时 |
| 新 `lineage-session-projection.ts`（表外件） | 122 | ≤160 | registry 的单一写路径（apply）与活动投影：PROJECT_KEYS、projectPatch/projectAll、投影宿主持有、活动投影写闸落地（W-D2a 拆件） |
| 新 `lineage-session-fresh.ts`（表外件） | 50 | ≤80 | 新建会话初值 freshSession——恢复替换、移除后重建、课题切换 reset 共用 |
| 新 `lineage-session-rekey.ts`（表外件） | 76 | ≤100 | 活动投影写闸的落地裁决：植入就地合并；携 folderId 的植入=当前会话换新身份（新代际、新 lane），只作用于当前会话 |
| 新 `lineage-session-remap.ts`（表外件） | 100 | ≤140 | ghost remap 落库后的会话终态迁移：主图恰一个会话并换代；被矫正会话移除（历史清、unfinalized 并入存活会话） |
| 新 `lineage-session-loader.ts` | — | ≤240 | keyed graph、单飞（含和解解读复用与读捕获 `invalidationEpoch`）、needsReload |
| 新 `lineage-writeback-admission.ts`（表外件） | 81 | ≤120 | 脉络域异步回写的唯一准入函数：folderId＋sessionGeneration（keyed 读另含 loadSeq 与读捕获 epoch）全匹配才写原会话 |
| 新 `lineage-session-lane.ts`（表外件） | 327 | ≤340 | 每 folder 一条串行写命令链：编辑单元闸、historyCommand/finalize/save/flushFirst/reconcileNow、内部 settle 写路径（§9.3）、恢复待令标记的入链清除点 |
| 新 `lineage-idle-scheduler.ts`（表外件） | 126 | ≤160 | 每会话 idle-flush 调度纯件：timer 句柄、代际、arm/cancel 与到期分发（W-D2a 拆件；到期分发可直接驱动） |
| 新 `lineage-io-phase.ts`（表外件） | 42 | ≤60 | IO 未落定判据 ioUnsettled 与在途收尾相位 settledIoPhase（§2.5 #37/#38 等待名单的单源） |
| 新 `lineage-edit-commands.ts` | — | ≤400 | 13 入口接线与同步单元边界 |
| `lineage-write-queue.ts` | 531 | ≤320 | queue/flush；删快照与清栈；flush 尾和解任务替代 `void load()` |
| 新 `lineage-write-executor.ts`（表外件） | 121 | ≤160 | 单条写动作的落库执行与实体回显：applyAction 七 kind（W-D2a 拆件；queue 只留融合、drain、chain/flush） |
| 新 `lineage-write-actions.ts` | — | ≤300 | 乐观应用、lazy 物化、API 映射；lineTypeNames 请求注入 folderId 适配函数（§5.4） |
| 新 `lineage-write-conflicts.ts` | — | ≤240 | CONFLICT/GHOST_FOLDER 策略与和解链任务（§2.6）：入链等待、失败不定稿、丢弃续拉 |
| `lineage-session-ops.ts` | 115 | ≤240 | 改 recorder；restore(SessionSnapshot) 删除 |
| `lineage-note-ops.ts`（表外件） | 91 | ≤120 | 悬浮笔记三操作的编辑单元接线（自 lineage.store 拆出的既有件；B4-B 由快照撤销域改接同步 recorder） |
| 新 `lineage-reconcile-tail.ts`（表外件） | 82 | ≤120 | 和解读被丢后的链尾续拉：核会话存活→drain 新 Q→按当前 epoch 重新单飞；上界 RECONCILE_TAIL_MAX_ROUNDS=3（§2.6 #10d） |
| 新 `lineage-history-commands.ts` | — | ≤300 | 13 命令 changes 构造与矩阵纯测试 |
| 新 `lineage-history-unit.ts` | — | ≤260 | renderer flush-then-unit、响应应用、失败不弹栈 |
| 新 `lineage-history-stale.ts`（表外件） | 91 | ≤120 | 过期历史项：拒因集合、标记类型、适用性判据 staleHistoryAtTop 与丢弃 dropStaleHistory（纯函数；§2.5 #18a） |
| 新 `LineageStaleHistoryDrop.tsx`（表外件） | 84 | ≤120 | 保存错误行内的「丢弃这条过期历史」出口与确认框（纯受控件，零 IPC） |
| `lineage-view.store.ts` | 254 | ≤260 | mode/tool；focusSet 数据移 registry，只保留 active 适配 |
| `nav-graph-picker.tsx` | 207（收尾 149） | ≤220 | 删 dirty 弃改框；切换调 registry；活动图重拉职责移交 #41 和解链；打开图下拉即重拉活夹清单（E4），清单落定后交 lineage-folder-reconcile 处置已删会话 |
| 新 `lineage-folder-reconcile.ts` | — | ≤220 | folders.changed/lineage.changed 全 registry 失效与 `invalidationEpoch` 推进（§2.6 #41，恢复待令会话位保留）、后台删夹会话处置与回退主图（#42）、迟到响应归属（#43，含读捕获 epoch 校验） |
| `LineagePage.tsx` | 219 | ≤200 | 页面组合；快捷键拆件 |
| 新 `use-lineage-history-shortcuts.ts` | — | ≤150 | 三模式 Ctrl+S/Z/Y，editable 分层 |
| `LineageToolbar.tsx` | 231（收尾 192） | ≤200 | 先拆保存/历史按钮；B5 再做排版。保存错误行在场时工具组挂 has-save-error 修饰类——错误行独占工具组下一行，布局规则只挂在出错态（R-D1 呈现修复，规则驻 theme-lineage-tools.css） |
| `LineTypeMenu.tsx`（表外件） | 172 | ≤200 | 线型列表与展开钮（自 LineageToolbar 拆出的既有件——色板族；行内改名=一编辑单元） |
| 新 `LineageSaveButton.tsx` / `LineageHistoryButtons.tsx` | — | 各≤140/120 | B4 状态纯受控件 |
| 新 `lineage-command-state-model.ts`（表外件） | 62 | ≤100 | 会话命令状态纯投影：isLineageBusy、lineageIoPhase、lineageCommandState（W-D2a 拆件；model 件 re-export 保既有导入面） |
| 新 `use-lineage-command-state.ts`（表外件） | 42 | ≤80 | HistoryCommandState 装配点：读活动会话 IO 与 unfinalized，供工具组的保存/撤销/重做钮消费 |
| `useCardDrag.ts` | 111 | ≤170 | flight 数据写携带 folder/generation/drag id；拖拽两态桥接 registry（dragging 置位/settleFlight 句柄，§9.3） |
| 新 `lineage-session-drag.ts`（表外件） | 143 | ≤160 | 拖拽两态桥接态（registry 侧）：awaitDragSettle 有界收口、落位写准入 admitLanding（按 drag id 重锚） |
| 新 `card-drag-registry.ts`（表外件） | 90 | ≤120 | 拖拽两态桥接 registry 的非 React 部分：拖拽身份捕获、dragStart/Flight/End 与 settle 桥（W-D2a 拆件；useCardDrag 只留 React 与 pointer 编排） |
| `card-drag-session.ts` | 335 | ≤350 | B3 件行为零改；endSession 判定链（judgeByLastClient）复用为态一有界 settle 出口 |
| `card-drag-flight.ts` | 138 | ≤150 | 600ms 兜底定时器保持 startFlight 起（态二承诺域）；finish 句柄供 registry settleFlight |
| `LineageTimeline.tsx` | 226 | ≤240 | 只透传交互状态/回调；B3 帧与布局屏障机制不改 |
| `LineageBoard.tsx` | 151 | ≤190 | `applyObstacleReroute` 回调捕获原图身份，不读切换后的 activeFolder |
| `drag-layout-barrier.ts` | 109 | 零改预算 | 继续负责指针锁与路由/zoom 挂起，不塞入 DB 事务职责 |
| `lineage-note-geom.ts` | 77 | ≤100 | `notesInteractive` 交互门改读活动 folder IO（审查 W2）；禁用全局 saveStatus 兼容壳 |
| `use-note-drag.ts` | 166 | ≤200 | saving 上升沿丢弃改读活动 folder IO（审查 W2） |
| `LineageFloatingNotes.tsx` | 242 | ≤250 | saving 订阅改读活动 folder IO（审查 W2）；只读与菜单关闭语义不变 |
| 新 `use-note-edit-session.ts`（表外件） | 254 | ≤280 | 悬浮笔记编辑会话 hook（自 LineageFloatingNotes 迁出）：恰一编辑会话、会话收口单点 closeEdit、idle 到期提交不关编辑器（keepOpen 窄口径）、输入法合成期不提交 |
| `lineage-note-draft.ts`（表外件） | 408 | ≤420 | 悬浮笔记草稿注册族：草稿四落定、内容快照单源（恢复副本 draft 字段的数据源）、残留再水化 |
| 新 `lineage-note-draft-settle.ts`（表外件） | 55 | ≤80 | 未收口草稿残留的出口 settleNoteDraftResidual：正文经内部 settle 写路径串行入所属会话写链并落库 |
| `RecoveryBarHost.tsx` | 225 | ≤160 | 组合根；ports/文案先拆；discardLoadedSession 恢复放弃入口保留（§6.1） |
| 新 `recovery-host-ports.ts` | — | ≤280 | registry 快照、flush/替换谓词、恢复载入 |
| 新 `recovery-decision-view.ts` | — | ≤180 | 决策文案纯函数 |
| `recoveryScheduler.ts` | 656 | ≤340 | 单槽 pump/token/gen；owner 逻辑外移 |
| 新 `recovery-dispatch.ts`（表外件） | 301 | ≤320 | 单槽写面派发：trailing 节流、单飞、最新快照合流、live settle 裁决、补发判定（W-D2b 拆件） |
| 新 `recovery-scheduler-triggers.ts`（表外件） | 229 | ≤240 | 调度器触发面与对外门面：notify 族、订阅/状态读面、clean 与 ws-entry 族转调、装配入参契约 RecoverySchedulerInit（W-D2b 拆件；recoveryScheduler 原名再导出） |
| 新 `recovery-owner.ts` | — | ≤280 | owner 状态机与切换握手 |
| 新 `recovery-owner-decision.ts`（表外件） | 90 | ≤120 | owner 转移/释放裁决的回执准入凭据（决策票与账本）与 release 回执落定裁决 releaseVerdict |
| 新 `recovery-clean-lifecycle.ts` | — | ≤240 | clean/drain/release/workspace reset |
| 新 `recovery-probe-controller.ts` | — | ≤260 | degraded/probe 编排；watchdog/backoff 既有件复用 |
| `recoveryEntry.ts` | 426 | ≤250 | enter/discard/defer；restore 流拆出；`restoredLoaded→discardLoadedSession` 保留（§6.1） |
| 新 `recovery-restore-contract.ts`（表外件） | 33 | ≤60 | 恢复决策、落定结果与预检结果的契约类型（自 recoveryEntry 迁出，原名再导出） |
| 新 `recovery-entry-model.ts`（表外件） | 98 | ≤120 | recoveryEntry 的呈现态与两端端口契约类型：RecoveryUiState、SchedulerPorts、RecoveryEntryHost（纯类型件；entry 原名再导出——W-D2b 拆件） |
| 新 `recovery-restore-flow.ts` | — | ≤320 | flush≠finalize、替换确认、preflight、takeOver |
| `shared/models/lineage.ts` | 366 | ≤400 | D2 校正 folder 色行名注释（§17）；历史 schema 不在模型件双写 |
| `shared/recovery/schemas.ts` | 250 | ≤280 | queue 仍是 WriteAction（7 kind 不变）；只校正注释，不增历史字段；lineTypeNames action 不扩 folderId 字段（§5.4 适配层注入） |
| `src/shared/ipc/schemas.ts` | 748 | ≤800 | D2：`lineageUpsertLineTypesReqSchema` 改 `{folderId,names}`（§5.4 签名链第 3 段）；shared 变更申报 |
| 新 `shared/ipc/lineage-history.schemas.ts` | — | ≤240 | history-unit 跨进程单源 |
| `shared/ipc/api-surface.ts` | 394 | ≤430 | 注册一个 history-unit 通道；upsert-line-types 通道载荷变更同步 |
| `main/ipc/lineage.ts` | 61 | ≤100 | 薄分发；upsert-line-types 解构传 folderId+names |
| `main/services/lineage/lineage.service.ts` | 391 | ≤310 | 不直接堆 history；graph 读装配件先拆；upsertLineTypeNames 带 folderId |
| 新 `lineage-graph-read.service.ts` | — | ≤280 | graph 子图与派生装配（含 keyed 色行名） |
| 新 `lineage-history-unit.service.ts` | — | ≤320 | 事务、语义指纹、最终图校验 |
| 新 `lineage-history-guards.ts` | — | ≤240 | 纯图守卫复用 |
| `main/db/repos/lineage.repo.ts` | 263 | ≤295 | folder 化 lineTypes（get/set keyed + removeMeta 原语）；upsertNode/upsertEdge 语句 UPDATE 分支增写点单调守卫（§7.5 普通写点守卫，B1 三轮）；精确恢复不塞本件 |
| `main/db/repos/floating-notes.repo.ts` | 107 | ≤130 | upsert 语句 UPDATE 分支增写点单调守卫（§7.5 普通写点守卫，B1 三轮） |
| 新 `main/db/repos/updated-at-guard.ts`（表外件） | 31 | ≤60 | 写点单调守卫的 updated_at 标量表达式单源 monotonicUpdatedAt——三 repo upsert 与 lineage-history.repo putExact 族的 UPDATE 分支共用（§7.4/§7.5） |
| 新 `main/db/repos/lineage-history.repo.ts` | — | ≤300 | prepared exact put/remove/read + `readMaxDeletedAt`（§7.4 恢复点守卫）；putExact UPDATE 分支同一 SQL max 公式（§7.4/§7.5） |
| `main/services/folders.service.ts` | 187 | ≤220 | 删夹事务同事务删除 keyed meta 行（§5.4；repo.removeMeta） |
| `main/services/index.ts` | 305 | ≤350 | 装配 history service/repo 依赖；corpus export lineTypeNames 取主图键（D2，§17 裁决行） |
| `main/db/repos/index.ts` | 125 | ≤155 | 新 repo 装配，withTransaction 复用 |
| `main/services/snapshot/import-snapshot.service.ts` | 320（收尾 353） | ≤355 | §7.5 三段闭环：段二顺序、段三删事件代际判定（含防御相等分支）+`skippedSuperseded`、删夹（`entity='collections'`）graph_meta 派生清理。导入结果为 applied 且非 noop 时，在事务返回之后、回执之前双播 folders.changed 与 lineage.changed（X-IMP——落点在 service 层，先 folders 后 lineage） |
| 新 `main/services/snapshot/import-snapshot.guards.ts`（表外件） | 49 | ≤80 | 快照导入的无状态校验助手：envelopeShapeOk、sameKeySet、contentEqual（自 import-snapshot.service 迁出，使该件回到预算内） |
| `scripts/check-quality.mjs` | 537 | 零新增、净减≥1 | 只删 workspace.store 旧 notes 例外；reader 复用现有白名单 |
| 新 `src/main/db/migrations/027_lineage_meta_folder.sql` | — | ≤100 | D2 folder 色行名数据迁移（§17 用户终裁 A） |
| 新 `src/main/db/migrations/028_deletion_log_write_guard.sql` | — | ≤120 | 重建 7 个含 `updated_at` 表的 deletion_log 触发器为写点单调守卫形态（§7.5）；`NO_UPDATED_AT` 三表触发器不改；migrations 变更申报 |
| `docs/architecture.md` / `docs/invariants.md` | 448 / 245 | 相关章节重写 | 同批回写保存、历史、防复活和会话归属 |

表外件登记与收尾实测（2026-11-24 `wc -l`）：标「表外件」的行在 2026-11-22 稿内没有预算——它们是实现与回炉各波新建的件，或稿内漏列的既有件；这些行的「实测」列是收尾时的实测行数。既有件的收尾实测写在原「实测」值后的括号里。预算列不带标注的取值是已采纳的建议（W-D2 拆件的八行）；标的取值由收尾批按收尾实测加余量提出，未经裁决，主控或用户确认后去掉标注。表内其余各件收尾实测均在预算内；例外=`scripts/check-quality.mjs` 540 行（B4-A R2 白名单新增的已申报偏差，见 §11.1 实施注记第 2 条①）。

## 12. 受锁测试迁移映射

### 12.1 迁移纪律与实测锚

- 当前锚点实测：`annotation-editor-ux.test.tsx:115-425` 锁 800/100/IME；`notes.store.test.ts:578-624` 锁 599_999/600_000；`lineage-session-store.test.ts:123-205,277-340` 锁快照、保存清栈、50 和 saving 禁切；`close-tab-flush.test.tsx:94-332` 锁失败确认放弃；`recovery-integration.test.tsx:152-209,329-409` 锁 undo clean release/defer。
- 主要文件现有用例数经 `rg -c '^\s*it\('` 实测：annotation-undo 15、annotation-editor-ux 18、notes.store 26、lineage-session-store 21、reader.store 44、reader-shortcuts 12、close-tab-flush 19、close-tab-flush-r1 9、quit-flush 19。这些数字只用于迁移范围核对，不是已运行结果。
- 下表“删除”均指删除失效断言/旧实现路径并给出裁决依据，不是删测试制造绿色。所有新测试先红后绿；路径过滤后核对非零执行数。
- 四类分列口径（审查 B6 处置）：**断言翻转**=旧语义断言改新语义断言；**async 调用迁移**=同步 undo/redo 直调改 await 真实链结果；**纯夹具默认值**=空栈初始化字段补默认值、不断言旧载荷；**原样保留**=实测不涉旧语义，不为其制造改动。

### 12.2 逐文件三分表

| 文件 | 断言迁移 | 新增 | 删除及依据 |
|---|---|---|---|
| `annotation-undo.test.ts` | 三逆操作改走 before/after 完整项；15 例的 LIFO、失败不弹栈、in-flight、并发篇、id remap 全保留并适配 async 链 | redo 三类型、保存只清 redo、深度 10、跨视图、关 tab 清理、保存→undo→redo | “redo 不做”头注与 50 上限；依据 summary §10.1/§10.4、plan §6.2.10–11 |
| `annotation-editor-ux.test.tsx` | 所有 800→1_500；100 步例→10 个**独立单元**（用空格/提交边界构造，不能把 105 次连续键错误当 105 单元）；async undo/redo 先 drain | 1_499/1_500、连续输入合并、空格、回车、粘贴独立、IME、blur、flush-then-undo、操作代际失效、非输入不清 redo | 逐键 push/future 即清与原生 textarea undo 依赖；依据 §3、summary §10.4 |
| `annotation-draft-flush.test.tsx` / `annotation-popups-busy.test.tsx` | 句柄 flush 改 per-tab lane 任务结果；保留删除代际、失败补偿、busy 等待和真实终态 | 删除/undo/普通 autosave 同目标不并发；迟到回显不复活 | 第二条绕过 lane 的直接写路径；依据 plan §6.2.10 |
| `notes.store.test.ts` | `:578,589` 的 599_999/600_000→1_499/1_500；其余合并、失败、代际、flushAll 串行断言保留并迁到 persistence 适配 | 总评文本历史、保存后 undo、idle 不清 U/redo | 600s 字面锁与普通 dirty timer 通道承接关闭；依据 summary §10.4 ④ |
| `reader.store.test.ts` / `reader-store-undo-race.test.ts` | undo 改 await coordinator；并发 addAnnotation 保留且不错弹 | redo、关 tab 清两层、页面切换不清、tab 隔离、失败不弹；**history 在途输入两向（§4.3）：成功回显后写链接管/失败两栈不动新任务照常** | store 内直接执行 API 的旧单口；依据 plan §6.6 与审查 B3 |
| `reader-shortcuts.test.tsx` | 原 ctrl+z 描述改“非 editable 操作层”；动作夹具加 save/redo | Ctrl+Y、Ctrl+Shift+Z、Ctrl+S、editable 避让/局部接管、卸载成对清理 | 只做 undo 的接口；依据 summary §10.4 |
| `tab-dirty.test.tsx` / `tab-bar.test.tsx` | 灰点输入由 annoDirty/notesPending 改 U；IO 两源另建 quitDirty 测试 | idle 后 Q0 灰点仍在、显式保存灰点清、后台 tab OR、PDF error 不清 U | “双净即无灰点”与 dirty 文案；依据 summary §10.2 |
| `close-tab-flush.test.tsx` | 普通 dirty 成功且 U=1 从零弹窗改为指定二选；clean/U0 仍直关；重入/Delete/叉保留 | 是关清史、否留史、失败真实错误、重试、后台 tab 不消费活动句柄 | `:140-165,298-332` 的弃改二选/失败可 discard；依据 summary §10.3、plan §6.2.7 |
| `close-tab-flush-r1.test.tsx` | 三轮复扫夹具迁为 lane 顺序与关闭 generation；保留“关 A 不越权写 Y”的核心判别 | 关闭 await 中切 tab/新输入、迟到写只写原 tab、失败不归因他 tab | 旧 800ms/三轮复扫实现锁，不删除其竞态覆盖；依据 §3/§4 |
| `save-state-button.test.tsx`、`save-status-slot.test.ts`、`reader-notes-panel-b3/visfb13.test.tsx` | SaveUiState 视觉四态保留；输入从三布尔扩为 IO+U；局部保存动作改 tab finalize | Q0+U1=dirty 可点、Q0+U0=saved、错误重试、状态条 IO 与灰点分离 | “落库后必然 saved”旧推导；依据 summary §10.1–10.2 |
| `lineage-session-store.test.ts` | `:123-150` undo/redo 改 history-unit 异步；`:164-188` 保存后 undo 无效翻转为有效且只清 redo；`:335` 50→10；`:314` flushing 禁切翻转为挂起切换 | 保存→undo→redo、保存后新编辑、无 Q 定稿、idle 跨灰点、失败不弹栈、每类保存后再 undo | SessionSnapshot.queue、undo 回基线=clean、save 清两栈；依据 plan §6.3、summary §10.1 |
| `lineage-store-write.test.ts` | 保留失败/CONFLICT/lazy/物化；flush 尾不再清栈；CONFLICT 的 explicit finalize 按 §2.5 #10 与 §2.6 断言 | 反向写不重复、历史原子失败不弹栈、queue 与 history 分离；**和解链四类迁移（§2.6）：等待 10a/失败 10c/迟到续拉 10d/新编辑 20d**；**和解读以 F=reconcile 在途身份应用自身回执（needsReload→0，#35 自身放行判据，B2 处置）** | 保存即历史基线重置；依据 plan §6.3 与审查 B2 |
| `lineage-write-queue.test.ts` / `lineage-write-queue-merge.test.ts` | WriteQueueHost 去 undo/redo 夹具；融合/inflight/身份出队全保留 | idle flush 成功历史引用不变、出队即存只反映剩余 queue；flush 尾和解任务替代 `void load()` 断言 | queue 负责清历史；依据 §6 |
| `lineage-conflict-resolution.test.ts` | 断言翻转：CONFLICT 本次不定稿、U/redo 保留、和解等待/失败/迟到/新编辑四类（§2.6）；和解成功后二次保存才定稿 | 二次显式保存定稿链、和解失败重试 | CONFLICT 处理后即 saved 禁用的旧推导；依据 §2.5 #10/#23 |
| `lineage-queue-service-integration.test.ts` | 断言翻转：flush 收口不清栈；`void load()` 改和解链任务断言 | 丢弃续拉（needsReload 保留+显式重发）、失败不定稿 | 清两栈与 fire-and-forget load；依据 §6.2 |
| 新 `lineage-history-commands.test.ts` | — | 13 命令矩阵逐项 before/after、复合删节点顺序、no-op、星标不入栈、深度 10 | — |
| 新 `lineage-history-unit.test.ts`（renderer+main 两件） | — | flush-then-unit、保存后全类型 undo/redo、第二语句失败全回滚、HISTORY_STALE、paper/folder 缺失、原 id/createdAt/相关边恢复、undo/redo 更新既有行 updated_at 单调不倒退（putExact UPDATE 分支，B1 三轮） | — |
| 新 `tests/unit/db/repos/lineage-write-guard.test.ts` | — | 三 repo upsert 写点单调守卫真库序列（§7.5 普通写点守卫，B1 三轮）：恢复值行→upsert→断言 updated_at 前进且内容更新；同毫秒连写逐步 +1ms 不撞平；轻微回拨取旧行+1ms；INSERT 分支新行原样写 now | — |
| `lineage-session-ui.test.tsx` | dirty 切图取消/弃改两分支改 flush-first 挂起；Ctrl+Z/Y 改三模式 | A/B 往返栈/focusSet/U 恢复、输入焦点分层、Ctrl+S | “放弃修改”Dialog 与 edit-only 历史；依据 summary §10.5、plan :409 |
| `lineage-rr14-saving-switch.test.tsx`、`lineage-nav-graph-picker.test.tsx`、`lineage-b2-remount-refetch.test.tsx` | saving 禁切改切图不等 flush；手工同值重选改有会话不双取；needsReload 例外保留 | 迟到 A graph 不写 B、A/B/A 不重复 flush/graph、B error 不污染 A | RR14 窗口禁切与 setFolder 恒重取；依据 plan §6.4 |
| `lineage-toolbar-session.test.tsx` | clean/dirty 钮态改 IO+U；saving 锁仍锁同会话编辑，不锁 folder picker | idle 后保存仍可点、finalize 后 undo 可点 redo 灰、三模式历史状态 | 保存后 undo 灰；依据 summary §10.1 |
| `lineage-view-store.test.ts` / `lineage-c1-viewstore.test.tsx` | focusSet 切图清改按图挂起；resetForMount 不再清注册表 focusSet（mode 的 B5 记忆不在本批偷做） | A/B focusSet 隔离恢复、显式清空只清当前图、课题全清 | 全局 focusSet 单槽；依据 plan §14 终裁 2 |
| `lineage-star-card.test.tsx` 及其他显式快照夹具 | 旧 SessionSnapshot 夹具改最小 HistoryEntry；星标现值 overlay/非历史语义保留 | 星标变化不被 undo 整图回滚 | queue 快照夹具；依据 §6.1 |
| `lineage-floating-notes.test.ts` | async 迁移+断言翻转：`:125-176` save clean+两栈清→保存只清 redo；同步 `state().undo()/redo()` 后立即断言→await 真实结果 | history 失败不弹栈、保存后 undo | 同步快照 undo 假设；依据 §5.1/§4.3（审查 B6） |
| `lineage-store-obstacle.test.ts` | async 迁移：`:152-236` 同步 undo/redo→await 真实结果；删卡障碍单撤销单元与 via 断言保留 | — | 同步 undo 假设（审查 B6） |
| `lineage-store-materialize.test.ts` | async 迁移：`:284-297` 同步 undo/redo→await 真实结果 | — | 同步 undo 假设（审查 B6） |
| `lineage-rr13-noop.test.tsx` | async 迁移：`:194-204` 同步 undo/redo 立即断言→await 真实结果；no-op 与「误走 beginUnit 必清 redo」锚保留 | — | 同步 undo 假设（审查 B6） |
| `annotation-popups-autosave.test.tsx` | 断言迁移：`:117-156` API 直写+800ms→lane 任务+1.5s；pushUndo 会话单 entry、同步收层语义迁 lane 结果 | — | 旧直写与 800ms 注册链；依据 §3/§4.3（审查 B6） |
| `annotation-draft-rework.test.tsx` | 断言迁移：`:197-309` 旧直写/800ms 注册链→协调器链；S2-busy 显式入注册表与重挂载重试迁 lane | — | 旧直写与 800ms 注册链（审查 B6） |
| `app-shell.test.tsx` | 断言翻转：`:262-286` 旧课题「丢弃未保存」确认→全量 flush 编排断言（switch IPC 前 DB 落库、失败不 switch） | — | `discardAllPendingEdits` 确认通道；依据 plan §6.2.13（审查 B6） |
| `app-shell-t3u1.test.tsx` | 装配锁迁移：`:109-220` AppStatusBarHost 真实装配断言迁 IO 单源输入 | — | saveStatus 全局三态源；依据 §10.1（审查 B6/W2） |
| `app-b2-host-isolation.test.tsx` | 夹具迁移：`:179-240` 旧状态/投影夹具→registry 投影夹具 | — | 单活动图投影夹具；依据 §2.3（审查 B6） |
| `lineage-floating-note-ui.test.tsx` / `lineage-floating-note-rework.test.tsx` | 断言迁移（W2）：`:205-226`/`:292-297` saving 让位/交互门/pointer-events 断言改读活动 folder IO | 其他 folder saving 不锁当前 folder 交互 | 全局 saveStatus 门；依据 §13.2 INV-149 |
| 新 `lineage-folder-reconcile.test.ts` | — | §2.6 #41-43 矩阵：A/B 均缓存→库页移动文献→分别返回各自权威图；后台删夹（owner 转移/回退主图）；迟到事件响应只写原会话；IO Q/F 会话不被权威响应覆盖；**请求已发→结构事件→事件前旧响应到达（旧响应不得清 needsReload、不得写图态；链尾按新 epoch 重新单飞，B4 处置）**；loading 会话 epoch 纳入（事件后旧 graph 响应不写图） | 无删除；依据 §2.6/§8.3（审查 B4） |
| `recovery-integration.test.tsx` | `:177-185` undo 回基线 release 改为 history 成功且 IO clean 后按 owner 判定；恢复载入 U=1、目标栈清 | 恢复 queue 不重复、idle 后 U 仍在、defer+U/history 恢复先落定再确认、其他 folder 不动 | “undo 到空 queue=clean/release”旧推导；依据 plan §6.3–6.4 |
| `recovery-rework-store.test.ts` / `lineage-recovery-authority.test.ts` | needsReload 改 per-folder；graph 权威落地不清历史/U；旧快照夹具迁移 | 迟到 graph/flush/history 不写新 owner、恢复替换只清目标 folder | 全局单 needsReload 与 clean 清栈；依据 plan §6.4 |
| `recovery-scheduler.test.ts`、`recovery-host-assembly.test.tsx`、`recovery-host-reentry.test.tsx` | snapshot 源改 owner keyed；hasUnsettledWrites 与 hasReplaceableSession 分流；保留 gen/token/epoch/watchdog | A→B 成功/失败/迟到、foreign slot、单槽不扩、恢复不 finalize 当前史 | 活动 store 单快照源；依据 plan §6.4 与 B0 扩展点 |
| `recovery-bar.test.tsx` / `RecoveryRestoreDialog` 相关测试 | available/deferred/conflict 既有三入口和文案保留；新增未受保护 owner 文案 | 多 folder 只有 owner 受保护的诚实提示 | 任何“全部挂起图均有副本”暗示；依据单槽裁决 |
| `app-quit-dirty.test.tsx` | quitDirty 与 lineagePending 都改 IO 聚合；U 单独进 Rail props | U=1/Q0→dirty=false、lineagePending=false；Q1→两 true；多 folder OR | 灰点参与 quit/结构写互斥；依据 plan §6.6 与 INV-91 |
| `quit-flush.test.ts` | 单活动 lineage save 改全 registry flush；U 不计 stillDirty；现有首载/失败/inflight/closing gate 保留 | 多 tab+多 folder 全 flush、abort 后灰点/栈在、拖拽两态有界先行（§9.3） | flush 即 finalize/清 redo；依据 summary §10.1、plan §6.2 |
| `quit-gate-sources.test.ts` / `quit-gate-realchain.test.ts` | 快照夹具迁 HistoryEntry；所有同步 gate 挂点保持，history-unit 用户入口同闸 | closing 中 reader/lineage redo/save 拒，内部 flush 放行 | 不得为通过新异步链删 gate；依据 ADR-0026 |
| `workspace.store.test.ts` / `workspaces-page.test.tsx` | “确认后丢弃”文案/断言改“先保存全部修改再切换”；onConfirmed 变全量 prepare | flush 失败不 switch/不清栈；成功后全清；取消零副作用 | `discardAllPendingEdits` 调用断言；依据 plan §6.2.13 |
| `workspace-switch-recovery.test.ts` | release 仍在 switch 前，但前面必须先全量 flush+reset | 多 folder 全成功才 release；失败保旧 ws 与全部历史 | 确认即 discard；依据 summary §10.5 |
| `import-snapshot.service.test.ts` / `snapshot-floating-notes.test.ts` | 现有 local 缺席防复活两例必须原样绿 | §7.5 序列 1–8：本地三序列+闭环 A/B+同毫秒恢复与同毫秒再删除双向+写点守卫不变式与段三防御分支不可达断言+cascade 子表 tombstone 断言+序列 8 交错链（删除→恢复→普通写→再删除→导出→对端导入；断言新删未吞/对端已删行被删/普通写值不复活，B1 三轮）；`skippedSuperseded` 计数；真实删夹→导出→对端导入后 keyed meta 缺席（`entity='collections'` 派生清理，B5 处置） | append-only 触发器不删；依据 §7.5（审查 B1） |
| `tests/unit/services/lineage-assemble.test.ts` | 契约迁移：`:299-305` corpus 装配全局 `getLineTypeNames()`→主图键读（D2，§17） | — | 全局键读；依据 §5.4（审查 B5） |
| `tests/utils/factories.ts` | TabState/lineage 空栈夹具补 IO/U 默认值（纯夹具默认值类）；不为通过测试伪造历史项 | 提供最小合法 HistoryEntry 工厂，供旧快照夹具机械迁移 | 旧 SessionSnapshot 直接字面量；依据 §6.1，受锁测试辅助面随批申报 |
| B3 `lineage-b3-frame/guard/recall/suspend-anchor` | 既有帧协议、布局屏障、保育与终局断言零弱化 | 拖拽两态四出口（§9.3）：激活未松手 quit/folder 切换/页面切换（有界 settle）、settle 已启动 await（≤600ms）；flight×undo 三交错、原 folder 写归属 | 不得用全局禁编辑替代 B3 帧协议；依据 §9.3（审查 W1） |

**原样保留（四类之四）：** `recovery-restore-preflight.test.ts` 实测为七 kind 纯函数测试且 queue 仍保持 WriteAction（`shared/recovery/schemas.ts` 不扩 kind），原样保留，不为其制造改动。quit-gate 两件与 B3 frame/guard/recall/suspend-anchor 四件的旧机制保留面见上表对应行。

### 12.3 e2e 覆盖

| 文件 | 必测序列与真实断言 |
|---|---|
| `reader-text.spec.ts` | 批注和总评各做“输入→1.5s idle→灰点仍在→显式保存→undo→redo→再显式保存”；保存后重开回读真实文本；关闭二选的是/否与失败提示；快捷键在 textarea 与非 editable 两层都测 |
| `lineage.spec.ts` | 代表操作做保存→undo→redo；删节点在显式保存后 undo，断言原卡片标题和相关边真实恢复；A 编辑→切 B→编辑→返回 A，分别 undo 且卡片文本/focusSet 正确；三模式快捷键 |
| `recovery.spec.ts` | R1–R5 与 defer 原样；恢复只重放 RecoveryPayload.queue，已落库 history 不双写；A owner 未 flush 成功时 B 不覆槽；恢复带 U/history 会话必须先落定并替换确认 |
| `workspaces.spec.ts` | 有未落库 reader+多 folder 写时切换：真实 DB 全部落库后才 reload，旧课题回读文本在；失败留旧课题；成功后内存史/focusSet 全清 |
| `reader-scroll.spec.ts` | `:240-249` 关闭确认由原生 `win.on('dialog')` 自动接受改为自绘二选 Dialog 点击「是」（创建标注后 U=1，原生 dialog 不再出现）；tab 移除 count=0 断言保留（审查 B6） |
| `lineage-conflict.spec.ts` | `:109-110/:128-130/:153-156` 三处「CONFLICT 处理后保存钮 disabled」改新语义断言：保存钮 dirty 可点或 failed 文案可见，不再断言 saved 禁用（本次不定稿、U/redo 保留）；冲突处理本体断言保留（审查 B6） |

e2e 必须断言渲染出的真实文本和必要 DB 回读，不接受只看按钮几何。CI 选区仍遵守 INV-170；1.5s 用条件轮询真实计时，不为测试把常量改回长窗口。

## 13. INV 处理清单与既有 ADR 核对

### 13.1 plan 指定的 13 条

| INV | 处理 | 同批修订要点 |
|---|---|---|
| INV-22 | 修订 | quitDirty=所有 tab/folder 实际 IO/草稿/inflight；U 排除；无条件握手、closing gate、abort 不变；全量 flush |
| INV-23 | 修订 | reader 操作 undo+redo、文本两层、深度 10、失败不弹、id remap、tab 生命周期 |
| INV-84 | 修订 | IO clean≠finalize；CONFLICT 与权威和解链（§2.6）保留；灰点/退出不再由 queue 单独推导 |
| INV-94 | 重写 | 13 命令可逆 changes；保存只清 redo；深度 10；同会话 saving 锁与跨 folder 挂起分离；该锁同时是 §2.5 #16/#17 lineage Q0 前提的保证 |
| INV-141 | 重写 | 1.5s 单源、文本单元、串行链、flush≠fulfilled≠finalize、关闭二选、保存聚合 |
| INV-150 | 修订 | Ctrl+S 已接线；悬浮笔记在保存/undo/切 folder/quit 前先 commit；草稿归属 folder |
| INV-153 | 重写 | undo 跨 flush/save；SessionSnapshot.queue 退役；history-unit 一事务；换端五元组由完整 delta 恢复 |
| INV-157 | 保留核心并补句 | 单槽恒一不变；per-folder registry 不产生多文件；owner 只决定唯一槽写归属 |
| INV-161 | 修订 | 删除“undo 回空 queue”clean 源；owner+IO clean 才 release；离场转移和 pendingChip gate |
| INV-162 | 修订 | 出队即存与重放幂等保留；只重放 RecoveryPayload.queue，history 不入队不双放 |
| INV-163 | 修订 | 恢复拆 flush/替换谓词；U/history 触发替换确认；目标 folder 载入、takeOver 与 opSeq |
| INV-164 | 修订 | 草稿 commit→queue→清快照顺序保留；folder keyed；history 不参与草稿去重 |
| INV-175 | 修订 | needsReload 每 folder；权威 load 不清内存历史/U；defer 放弃只删旧槽且不动其他会话；folders.changed/lineage.changed 是 needsReload 的新触发源（§2.6 #41） |

### 13.2 新发现必须连带处理的条目

- INV-35④、INV-50：课题切换不再是弃改入口；关闭失败不再有确认放弃径，完整弃改只保留未来真正显式放弃的合法入口。
- INV-91：`lineagePending` 只来自全 folder IO；U 不参与 folders/papers 结构写互斥。
- INV-106：保存钮四态输入改 IO+U；局部 notes.saveNow 不再等于 tab 定稿。
- INV-132：按 §7.5 三段闭环修订：history-unit 原 id 恢复为受控例外；导入段二活行 LWW、段三删事件按 deleted_at 代际判定（判定式见 §7.5；删事件写点、恢复点与普通写点三类单调守卫使同库平局不可达，相等分支为防御默认）；本地缺席行的防复活合同逐字保留；2026-11-22 用户终裁采纳（A）。
- INV-146：悬浮笔记 restore 的原 id/完整字段与防复活例外同批说明。
- INV-149：saving 交互门读活动 folder IO（`lineage-note-geom.ts`、`use-note-drag.ts`、`LineageFloatingNotes.tsx` 三件随批迁移，审查 W2）；**禁用全局 saveStatus 兼容壳**（防 A 的 saving 锁 B）；对应交互断言 `lineage-floating-note-ui.test.tsx:205-226`、`lineage-floating-note-rework.test.tsx:292-297` 随批迁移。
- INV-177：focusSet 改为 per-folder；mode 的进一步记忆与空聚焦视觉归 B5，不在本稿重复裁决。
- INV-182：同图不双取扩为 registry 会话；needsReload 权威读例外保留。
- INV-186：补拖拽两态（pending/dragging 与 settle-flight）出口与 folder 身份：态一有界 settle、态二 await 句柄，600ms 兜底仅限 FlightJob 已建后；布局屏障本身不扩成全局 DB 锁。

### 13.3 新增编号

`docs/invariants.md` 当前最大实号为 INV-186，故下一空号实测为 **INV-187、INV-188**：

- **INV-187「定稿≠落库」**：IO idle/saving/error 与 unfinalized 为独立轴；idle-flush 只清 IO；显式保存成功才清 redo/U；undo 留存；灰点、关闭、quit/INV-91 各自消费正确轴。机检=reader/lineage 状态矩阵+e2e 灰点跨 idle。
- **INV-188「per-folder 会话写归属」**：graph/queue/inflight/history/U/focusSet 全按 folder+generation；旧响应只写原会话；返回不双取；owner 单槽转移遵守 §8；folders.changed/lineage.changed 全 registry 失效（含 `invalidationEpoch` 代际推进与读捕获 epoch 校验）与和解链四类迁移遵守 §2.6。机检=A/B/A 延迟响应矩阵+ownership 单测+folder-reconcile 矩阵（含事件前旧读拒绝例）+e2e。

### 13.4 ADR-0014/0026/0027 逐个核对结论

- **ADR-0014**：图节点/边 DDL 和内部 repo upsert 可支撑大部分恢复，但 `:76` 仍写 autosave-first，需随 B4 改为 idle-flush+显式定稿；history-unit 不重新开放手动建点。D2 迁移使 graph_meta 的“图级”明确为真正 folder 级，迁移后果见 §5.4（§17 D2 行）。
- **ADR-0026**：无条件握手、同步 closing gate、缓存只分级、abort/orphan 安全网全部保留。本批只改 renderer flush 的全集和 stillDirty 的 IO 定义；不能因灰点常驻破坏 clean 回执，也不能为异步 history 绕过 gate。
- **ADR-0027**：集中管理、单槽、takeOver、token/epoch、append-only 副本文件策略保持。clean 四源与“undo 回基线”需重写；per-folder owner 是调度归属，不是多槽；RecoveryPayload.queue 不重定义为历史。

## 14. 新 ADR 草案正文（后续批次正式入库）

### Status

Proposed。决策记录＝本稿 §17 裁决单与 §14 Decision 段、ADR-0027 限制段；正式 B4 ADR 未随批建档，列入 B5 前文档债清理（D1 原 id 防复活例外与 D2 色行名 folder 存储已获用户终裁，§17）；不修改历史 ADR 让其看似从未包含旧语义。

### Context

旧实现把一次成功 flush 当作历史基线重置，清空 undo/redo；SessionSnapshot 同时携带图态和 queue，使“恢复旧快照”误看似能撤销已落库写。dirty 同时驱动未落库提示、灰点、关闭和退出。单活动图无法让迟到响应、后台 flush 与 recovery 单槽在 folder 切换后保持正确归属。

业务终版要求 idle-flush≠定稿、redo 死于定稿、undo 在应用运行期存活、folder 分栈挂起、单 recovery 槽不扩。删除节点的原 id 恢复又与 INV-132 和 append-only deletion_events 存在实现层冲突，lineTypeNames 也不是当前代码中的 per-folder 数据。

### Decision

1. 将 IO 与 unfinalized 分为两个状态轴。新编辑/undo/redo 置 U；idle-flush 只清 IO；显式保存 drain 成功后清 redo 和 U，保留 undo。
2. reader 使用操作层与文本值层两层历史，由 per-tab 串行命令链统一写、保存和代际失效；每层深度 10。
3. lineage 退役 SessionSnapshot，历史项只记录受影响实体的可逆 before/after changes；普通 queue 只表示实际待写动作。
4. 每次 lineage undo/redo 先 flush，再经 `lineage/history-unit` 在 main 的 repo 事务中执行一次反向 unit；失败全回滚且不弹栈。renderer for 循环不构成事务。
5. 删除节点/边/悬浮笔记按业务要求恢复原 id 和完整用户字段。快照协议按 §7.5 三段闭环修订：导出恒携带活行与删事件全集、导入先活行 LWW 再按 deleted_at 代际判定删事件（三类写点单调守卫：删事件 deleted_at=max(now, 行 updated_at+1ms)、恢复行 updated_at 严格晚于既有 tombstone、普通写 updated_at=max(now, 旧行 updated_at+1ms)——三 repo upsert 与 putExact 语句内 SQL 标量）、append-only 保持、本地缺席行仍防复活（2026-11-22 用户终裁采纳）。
6. 每 folder 会话持 graph、queue、inflight、历史、U、focusSet；页面/folder 切换挂起，课题切换全量 flush 后全清。
7. RecoveryPayload.queue 只用于崩溃重放，历史与 U 不写入副本；单槽以 recoveryOwner 串行转移，旧图未 flush 成功前新图不得覆槽。
8. lineTypeNames 按 §5.4 全链签名迁移为 folder key（D2 用户终裁 A，§17），corpus export 取主图键（§17）、删夹同事务清理 keyed meta；对端导入按 `entity='collections'` 删事件执行派生清理（§5.4）。

### Consequences

- 正向：已落库修改可撤销；删除复合操作可原子恢复；灰点不再阻塞退出；A/B 图历史与聚焦可独立驻留；恢复副本不会因历史快照重复写 DB。
- 成本：新增 reader 串行协调器、lineage registry、一个 IPC/service/repo、事务与延迟响应测试、D2 数据迁移与 028 触发器重建迁移。
- 限制：
  - 历史/focusSet 仍只活于应用运行期；单槽不能同时保护多个未落库 folder，非 owner 必须以 chip 明示。
  - 过期历史项的出口只在 edit 模式可见（用户裁决 R4）：保存错误行与「丢弃这条过期历史」出口都挂在 edit 模式工具组内；browse/focus 模式下撤销/重做被拒只有 toast，须切到 edit 模式才能丢弃。出口只在 history-unit 以 CONFLICT 拒绝的四种拒因下出现，丢弃范围是该方向栈顶一项且须用户确认；系统失败可重试、历史项未失效，不给出口。被拒的栈顶项在用户丢弃之前一直挡住其下更旧的历史。是否在 browse/focus 模式给入口留 B5 评估。
  - 其他写触发的 saving 窗仍卸载笔记编辑器（用户裁决 R3）：keepOpen 取窄口径——只有悬浮笔记自身 idle 提交随之而来的 saving 窗不卸载 textarea；其他写触发的 saving 窗沿用让位（textarea 卸载、草稿驻组件态、saving 结束回挂）。输入法合成期是另一个不让位条件（卸载会打断合成），合成结束即恢复让位。是否放宽留 B5 评估。
  - keepOpen 的真机缺口（F-KEEPOPN-01）：自身 idle 提交随之而来的 saving 窗内，textarea 在真机上被卸载后重挂并失焦一次（setKeepOpen 与 store 写入不在同一渲染批）；jsdom 测试因 act 合批看不到这次卸载，「同一 DOM 节点」断言只在 jsdom 成立。内容与编辑器不丢。B5 前评估修复。
  - 悬浮笔记与阅读器的合成期差异（用户裁决 R1）：两域都是合成期不提交、compositionend 后重新计时 1.5s。阅读器在 compositionend 立即以「组词前值→终值」切出一个历史项；悬浮笔记到下一次提交（idle 到期或收口）才成一个编辑单元，一次停顿内的多次组词合并为一步撤销。
  - 合成期收口提交的是编辑器里的实际文本：合成期的 blur、打断收口与离开页面仍立即提交，写入的文本可能含尚未确认的合成串——这是显式收口动作的既有语义，与 idle 提交「合成期不提交」不同。closeEdit 入口的合成标记复位位于全部早退之前：被 closing/recovery 门拒绝、或因落库在途而不收口的 blur 同样终止合成标记，否则门冻结期标记滞留、解冻后真稿永不提交（复审 review4 修复）。
- 回滚：shared/main/renderer 必须同一逻辑回滚点；若 D2 数据迁移已对用户库执行，代码回滚必须同时恢复事前 DB 备份或提供明确的前向兼容迁移，禁止只回滚 UI。
- 验证：§12 全矩阵、真库原子失败、snapshot 防复活与三段闭环序列 1–8、CONFLICT 和解链四类迁移、A/B/A 延迟响应、folder-reconcile 失效矩阵（含 epoch 判别例）、六个 e2e 文件和 `npm run verify`。

## 15. 四阶段实施顺序、验证门与回滚点

### R1——reader 文本历史、redo 与串行写

- **入口：** §3/§4 文本单元与分层方案获确认；共享 1.5s/10 单源可先落；现有 reader/notes 测试基线跑绿并记录执行数。
- **实施：** 纯拆件先行并证明行为不变；再写 1_499/1_500、IME/粘贴/空白、redo、flush-then-undo、代际失效红测试；最后接 per-tab lane 与总评受控历史。
- **验证门：** annotation-undo/editor/draft/popups、notes.store、reader.store/undo-race/shortcuts 全绿；`reader-text.spec.ts` 真实文本回读；所有新例有红证。
- **回滚边界：** R1 的共享常量、文本 registry、lane、notes persistence 与所有接线作为一个逻辑单元回滚；不得留下 1.5s 新常量却恢复 600s 局部写路。

### R2——unfinalized、保存聚合、灰点、关闭与 rail

- **入口：** R1 全绿；IO/U 状态表与关闭 Dialog 文案不再变动。
- **实施：** reader U/closing/rail；**lineage U 经聚合接口输出恒 false 占位（主控终裁 7，过渡契约）**：rail 脉络角标在本阶段恒 false，reader 角标正常工作；R2 阶段测试锁定占位行为（占位常量+角标断言）。lineage 真实 U/finalize/历史接线整体随 L1。App quitDirty、lineagePending、状态条严格保持 IO；workspace 全量 flush 编排可在本阶段先接，L2 再扩全 registry。
- **验证门：** tab-dirty/tab-bar/close-tab 两文件、save-state 族、app-quit-dirty、quit-flush、quit-gate 族、workspace 族；R2 占位测试（脉络角标恒 false、reader 角标随 reader U 正常翻转）；reader-text 灰点跨真实 idle 与二选关闭 e2e。
- **回滚边界：** R1 不回滚时，R2 必须同时回滚灰点、关闭、Rail、quit/workspace 编排、INV 与 lineage U 占位（占位属本阶段逻辑单元，随本阶段同进退；禁止只撤 Dialog 留下 U 控制退出，也禁止留下无消费者的占位常量）。

**实施注记（2026-11-23 R2 收尾）：** U 置位写点=reader.store.markTabUnfinalized 单写点（TextController.onUserEdit 端口经 use-annotation-draft 装配覆盖批注/总评两 target；操作层=SelectionLayer create/annotation-popups-actions delete 与 comment-edit 提交、reader.store.applyOpHistory undo/redo 成功）；finalize 的 revision 判据=TabState.editRevision（§2.2 字段的 TabState 落位，非独立注册表）。关闭失败原因派生=查态单源（标注写失败/笔记保存失败/笔记尚未落库三档——`<reason>` 的具体值来自 IO 查态，非透传 api 原文；真实 api 错误文本仍由写路径 toast 呈现）。quit-flush/view-flush/AppStatusBarHost 三件 R2 为语义确认+注释回写（行为已满足 #37/IO 单源——未扩全 folder registry 面，L2 接）。

**实施注记（2026-11-23 B4-A 收尾——审查回炉三轮终态）：** ①表外新件三枚：reader/state/reader-text-controller.ts（文本控制器内核——§11.1 原拆件方案在实现期收敛为此形态）、reader/state/tab-closing-gate.ts（按篇关闭冻结闸）、renderer/shared/tab-write-lane.ts（per-tab 串行写链——自 reader/state 下沉，notes 域不得跨域 import reader 件）。②裸写体端口：TextControllerPorts 增必选 persistRaw/historyWriteRaw、mirror 增 persisted 参——文本/操作层 history 命令均起步即入链复合任务（预 flush+反向写同体，laneDrain 退役）；预 drain 窗内新值排后落库（DB=最新值）为 R5 家族四站点（文本层/操作层/总评宿主/跨层代际）终态修法。③行数欠账（B5 前瘦身，票 F-SLIMB4A-01）：reader-text-controller 560 wc（ESLint 口径约 350；拆件切面=复合任务/代际校验胶水外抽）、annotation-draft-registry 239（预算 220）、notes.store 358（预算 320）、reader.store 340（预算 300）。④已知限制两笔（票 F-CLOSERETRY-01/F-NOTESRAW-01）：已卸载编辑器的保留失败写关闭重试恒 no-op（workaround=重开该标注编辑器保存；候选=句柄表 tab 归属+墓碑过滤或注册表 retry 闭包）；总评宿主 persistNowRaw 三怪癖（预 flush 写当前草稿非起步捕获值=冗余无害/回执前继续输入命令静默中止 write-failed/首载门控同形——修法方向=persistNowRaw 接受起步捕获值+回执按捕获值结算，属 notes.store 回执契约改动）。⑤touch 反向写失败不置 IO 错误旗标（无未落库修改——toast「标注保存失败，撤销/重做未生效」可见）。⑥审查弧：8 阻断→回炉一（12 项）→定点复审 R5 残留→回炉二（R5+总评宿主）→终验 FAIL 1→回炉三（操作层同族+B 旗标来源）→终验 PASS；verify 终态 454 文件/4611 例。

### L1——lineage 可逆命令、内部 restore 与事务

- **入口：** D1/INV-132、D2/lineTypeNames、历史项形态与 history-unit 事务方案全部已裁决（D1/D2=用户终裁 2026-11-22 A；历史项形态/事务承载=主控终裁 1/2）；删节点原 id 与防复活三段闭环方案在稿（§7.5）；**接管并移除 R2 占位**——聚合输入从占位常量换成真实 U 值，删除占位常量与占位断言。
- **实施：** 新 shared schema/main service/repo/装配与可选迁移先写红测试；renderer recorder 与 13 矩阵同事接入；权威和解链任务（§2.6）随写链接入；同一逻辑提交删除 SessionSnapshot、save 清两栈和旧 snapshot restore。
- **验证门：** 13 命令在 idle-flush 后与显式保存后各 undo/redo；删节点原 id/完整字段/相关边按序恢复；第二语句失败零半写；HISTORY_STALE/paper 缺失不弹栈；snapshot 防复活与三段闭环序列 1–8（§7.5，含序列 8 交错链）；CONFLICT 和解等待/失败/迟到/新编辑四类（§2.6）；lineage e2e 代表链。
- **回滚边界：** shared schema、IPC、service、repo、renderer recorder、migration/DB 备份与文档属同一逻辑点。若采用 D2 迁移且已触及真实库，只回滚代码不合格，必须恢复备份或前向迁移；禁止只回滚 UI 留半套历史语义。

### L2——per-folder registry、flush-first、recoveryOwner 与课题 reset

- **入口：** L1 单图保存后 undo/redo 全绿；registry 宿主、owner 状态表和 B3 桥接确认。
- **实施：** 先纯拆活动投影/loader，再引入 Map 会话；一次性迁移 setFolder、NavGraphPicker、focusSet、recovery scheduler/entry、quit/workspace 全集、后台失效接线（§2.6 #41-43）；删除 dirty 弃改框和 saving 禁切旧路。
- **验证门：** A/B/A 全延迟矩阵、owner 成功/失败/迟到、foreign/deferred slot、单槽文件数不变、focusSet 恢复、全量 quit/workspace flush、B3 flight 两态交错（§9.3）、folders.changed/lineage.changed 全 registry 失效（含 `invalidationEpoch` 推进与事件前旧读拒绝）与 A/B 缓存往返（§2.6）；lineage/recovery/workspaces e2e；最后 `npm run verify` 与全部相关 e2e。
- **回滚边界：** registry、folder 切换、owner、recoveryEntry、Rail 聚合、workspace reset 同点回滚至 L1；不得只恢复旧确认框而留下后台写仍按 registry 分发。

## 16. 整批完成定义

1. 每个新测试先有可复现红因，再转绿；定向命令核对实际执行数非零，核心 reader/lineage 测试在改动前后各跑。
2. `npm run verify` 全绿；按风险运行 `reader-text.spec.ts`、`lineage.spec.ts`、`recovery.spec.ts`、`workspaces.spec.ts`、`reader-scroll.spec.ts`、`lineage-conflict.spec.ts` 及 B3 相关 e2e，记录真实文本断言。
3. `rg 'TODO|FIXME|placeholder'` 无新增命中；所有新文件有消费者；旧 800/600s/50/100、SessionSnapshot.queue、保存清两栈、dirty 弃改框、失败确认放弃、全局 saveStatus 交互门代码全删。
4. `wc -l` 验证 §11 预算；`git diff --stat` 自查无范围蔓延；shared/tests/检查脚本/main 合约/migration 027/028 在提交说明逐项申报；`tickets/registry.ts` 按实际完成单元更新，设计稿本身不提前销项。
5. INV-187/188 与 §13 所有修订同批回写；正式 ADR、architecture、相关头注同步；无触及文档时不得虚假申报“已更新”。
6. 本稿设计阶段未运行上述实现验证，不能将本节写成已通过清单。

## 17. 裁决记录（全部已闭合）

| 项 | 裁决结果 | 裁决者/日期 |
|---|---|---|
| 历史项形态 | 受影响实体 before/after 的可逆命令对，不执行整图回放 | 主控终裁 1，2026-11-22 |
| 事务承载 | 新增一个 history-unit IPC/service，repo 层 `withTransaction`；否决逐条 IPC | 主控终裁 2，2026-11-22 |
| per-folder registry 宿主 | lineage 域；workspace 只编排课题切换，App 组合根聚合 | 主控终裁 3，2026-11-22 |
| reader 历史关系 | 操作/文本物理分层，per-tab coordinator 逻辑统一；不合并成单一栈类型 | 主控终裁 4，2026-11-22 |
| Ctrl+Z/Y 生效面 | lineage 三模式（edit/browse/focus）统一生效，与 mode 门分离 | 主控终裁 5，2026-11-22 |
| CONFLICT 定稿/课题切换确认 | CONFLICT 后二次显式保存才定稿；课题切换只以实际 IO 脏触发确认 | 主控终裁 6，2026-11-22 |
| R2 lineage U 占位 | R2 恒 false 占位+阶段测试，真实接线随 L1 | 主控终裁 7，2026-11-22 |
| D1 原 id×INV-132 | **A=采纳**：仅 history-unit 允许原 id；append-only 不动；快照三段闭环（导出全集/活行 LWW/deleted_at 代际判定+三类写点单调守卫〔删事件写点/恢复点/普通写点〕，测试序列见 §7.5） | **用户终裁**，2026-11-22 |
| D2 lineTypeNames | **A=采纳**：迁移为 folder key（027 一次性迁移，旧共享值复制到现存全部文件夹）；§5.4 全链签名、删夹同事务清理 | **用户终裁**，2026-11-22 |
| corpus export 色行名取值 | 主图键 `lineTypeNames:<主图 folderId>`（全库派生资产的现行全图语义直接后继） | 主控确认，2026-11-22 |

以下两项为直接实现规则：普通 CONFLICT 使本次显式保存不能定稿，权威和解完成后由用户再次显式保存；课题切换只以实际 IO 脏触发既有确认，U 单独不触发确认，但无论是否先确认，都必须全量 flush 成功后才清史并切换。

全部裁决已闭合，业务终版语义未重新开放。L1/L2 开工的裁决前提已满足。

## 18. 审查处置记录

### 18.1 一轮：代码接地独立审查（FAIL-可修，2026-11-22 处置回写）

审查对象为修订前稿（799 行）；证据=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/code-review/note.md`（主控已亲验六项阻断证据属实）。逐条处置如下；D1/D2 已于 2026-11-22 获用户终裁（均=A 采纳稿内推荐），相关「待终裁」标注已全部转为裁决记录（§17）。

| 项 | 审查结论 | 处置方式 | 落点节号 |
|---|---|---|---|
| B1（阻断） | D1 快照闭环不成立：恢复原 id 后再导出，旧删事件会把活行再次删除 | 按 D1 推荐闭合为三段快照闭环：段一导出全集不剪枝、段二先活行 LWW 再判 tombstone、段三删事件按 deleted_at 代际判定（接收端判定式+`skippedSuperseded`+平局保活行）；不破坏 append-only，不选新 id+remap 备选；新增闭环序列 A/B 两真库测试 | §7.5（整节重写）、§5.3 第 5 条、§7.3 第 6 步、§12.2 import-snapshot 行、§13.2 INV-132、§14 Decision 5、§17 D1 行 |
| B2（阻断） | CONFLICT 权威和解不在 finalize/history 等待链内，二次保存可提前定稿 | 和解成为每 folder 串行链任务（单飞 keyed 读、身份匹配应用、needsReload 唯一清位点）；丢弃续拉、失败不定稿不弹栈；`void load()` 收口退役；#10/#13/#20-23/#34-36 增等待/失败/迟到/新编辑四类补行与测试条目 | §2.6（新节 10a-10d/13a-13d/20a-20d/34a-34d）、§2.2/§2.4/§2.5 #3/#8/#10/#13/#15/#20-23/#34-36、§6.2、§11.2 write-conflicts/write-queue 行、§12.2 冲突三行、§13.1 INV-84、§15 L1/L2 |
| B3（阻断） | reader history 成功行强制 Q0/F0 与「saving 继续输入」冲突；#20 门自相矛盾 | #16/#17 各拆两行（无后续任务=Q0 行 / 在途新编辑=写链接管行）；#20 busy 收窄为仅 finalize/history 在途、不排斥普通写 saving 后 drain；lineage Q0 前提明写依赖 #3 同会话拒新编辑；history 在途输入成功/失败两向红测试 | §2.5 #16/#16b/#17/#17b/#20、§4.3 第 6 条、§12.2 reader 行、§13.1 INV-94 |
| B4（阻断） | 后台 folders.changed/lineage.changed 无会话失效迁移，缓存返回显示旧图 | 空载荷事件→全 registry cached 会话标 needsReload（默认方案；扩载荷携带源/目标列为另一 shared 合约裁决项，注记申报、不默认做）；IO Q/F 会话不被权威响应覆盖、返回按 #34 单飞和解；新增 #41-43 迁移行与 folder-reconcile 测试矩阵 | §2.6 #41-43、§2.3 needsReload/interaction 行、§8.3、§8.4 末行、§11.2 lineage-folder-reconcile 行、§12.2 新行、§13.1 INV-175、§13.3 INV-188 |
| B5（阻断） | D2 漏跨进程写合约、corpus export 消费者、folder meta 删除生命周期 | 完整六段写读签名链（会话→适配层→Req schema→IPC→service→repo keyed）；`src/shared/ipc/schemas.ts` 与契约测试 `lineage-assemble.test.ts:299-305` 入涉改面；corpus export 取主图键（后经主控确认采纳）；删夹同事务清理 keyed meta+对端导入派生清理 | §5.4（整节重写）、§7.2、§11.2 新行/改行、§12.2 契约行、§14 Decision 8、§17 D2 行+新行 |
| B6（阻断） | 受锁测试清单不完整：11 个 unit 文件+2 个 e2e 未列 | §12.2 按四类（断言翻转/async 调用迁移/纯夹具默认值/原样保留）补全全部文件；§12.3 补 reader-scroll 与 lineage-conflict 两行；recovery-restore-preflight 明写原样保留（七 kind 纯函数、queue 仍 WriteAction） | §12.1 口径句、§12.2 新增 14 行+保留说明、§12.3 新增 2 行 |
| W1（警告） | pending/dragging 无有界出口；600ms 兜底起点与「自拖拽激活起」表述不符 | 拖拽两态拆分：态一有界 settle（按 lastClient，决定+理由=激活后已有乐观写、零写即分叉）、态二 await settleFlight 句柄；600ms 兜底仅限 FlightJob 已建；registry interaction 字段改 dragging/settleFlight；两态四出口红测试 | §2.3 interaction 行、§9.3（整节重写）、§2.5 #37、§11.2 useCardDrag/card-drag-session/card-drag-flight 行、§12.2 B3 行 |
| W2（警告） | saveStatus 生产消费者漏三件悬浮笔记交互文件 | 三件改读活动 folder IO；明写禁用全局 saveStatus 兼容壳；对应交互断言（lineage-floating-note-ui/lineage-floating-note-rework）入迁移表 | §11.2 三行、§13.2 INV-149、§12.2 新行、§16 第 3 条 |
| W3（警告） | 「有恢复价值」谓词未定义；§8.2 行数未实测 | 谓词=`hasUnsettledWrites`（Q/F/draft 三源；不含 U/H/R）单源定义；§8.2 增「恢复价值输入」列逐行标注；表行数实测 14 并写入稿 | §8.1（谓词段）、§8.2（整表重写）、§6.3 同源句 |
| W4（警告，主控终裁 7） | R2 lineage U 接线时序未定义 | 采终裁方案：R2 阶段 lineage U 经聚合接口恒 false 占位（rail 脉络角标恒 false、reader 角标正常，R2 测试锁定）；lineage 真实 U/finalize/历史接线整体随 L1；L1 入口补「接管并移除 R2 占位」；R2 回滚边界含占位 | §15 R2/L1、§10.1 rail 角标句、§11.1 use-save-aggregates 行 |
| O2（观测） | discardSession 还有「已恢复会话后放弃副本」消费面，防全局误删 | 稿内明写删除面只限 dirty 切图弃改框与 restore(SessionSnapshot)；RecoveryBarHost.tsx:146 与 recoveryEntry.ts:379-383 的等价目标会话清理保留 | §6.1 澄清段、§11.2 RecoveryBarHost/recoveryEntry 行 |

连带自洽项（本稿同步完成）：§2.1 术语增 `reconcile`；§2.2 inflight kind 与链任务序；§2.4 F 语义；§3–§4 交叉引用；§11.2 涉改面行号与职责同步（B2/B4/B5/W1/W2 全部落表）；§13.1 INV-84/94/175、§13.2 INV-132/149/186、§13.3 INV-188 机检句；§14 Decision 5/8 与验证清单；§15 R1–L2 门与边界；§16 e2e 清单与清除清单；§17 D1/D2 行与 corpus export 新行。计划外新增裁决项一项：corpus export 取值推荐（§5.4/§17），属 D2 的连带契约细化，不扩业务范围。

计数申报（2026-11-22 命令实测）：修订后本稿 `wc -l`=939（修订前 799）；§8.2 数据行 14；§2.5 主表 42 行（#1-40+新增 #16b/#17b）+§2.6 补行 19 行（10a-10d/13a-13d/20a-20d/34a-34d 各 4+§2.6 #41-43 共 3）；§11.2 表 55 行（新增 7 行：shared/ipc/schemas.ts、folders.service.ts、W2 三件、card-drag-session、card-drag-flight；lineage-folder-reconcile 为既有行职责改写）；§12.2 表 46 行（新增 14 行）；§12.3 表 6 行（新增 2 行）；B6 补列受锁文件 unit 11+e2e 2，与审查单计数一致。

### 18.2 二轮：定点复审窄修（2026-11-22 复审 FAIL，2026-11-23 处置回写）

审查对象为一轮修订稿（实测 942 行）；证据=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/code-review/recheck.md`（总判 FAIL：B1/B2/B4/B5 各剩一个窄缺陷+RW1–RW3 三警告+§18 计数观测；主控已亲验 B1 UNIQUE/INSERT OR IGNORE、B5 collections 实名、RW2 store 写时点三项代码事实属实）。逐条处置如下：

| 项 | 复审结论 | 处置方式 | 落点节号 |
|---|---|---|---|
| B1（残留阻断） | 平局保活行使同毫秒「恢复→再删除」双向反例仍失败；`UNIQUE(entity,id,deleted_at)`（`026_baseline.sql:258`）+触发器 `INSERT OR IGNORE`（:389,435,464,470）会吞掉同 `deleted_at` 的新删事件 | 平局规则降级为防御断言（真库测试断言不可达）；以写点单调守卫使平局不可达：删事件写入点=migration 028 重建 7 个含 `updated_at` 表的 deletion_log 触发器，触发器体内 `deleted_at=max(now, OLD.updated_at+1ms)`；恢复点=history-unit service 先读该 id `MAX(deleted_at)`，不大于则进 1ms；触发器体逐个核读（`026_baseline.sql:380-475` 十个 deletion_log 触发器，前七个含 `updated_at`），SQLite FK CASCADE 触发子表触发器经 026 真库探针实测（探针=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/rework2/probe-b1-real026.mjs`），删夹 cascade 路径同样被覆盖；新增同毫秒恢复/同毫秒再删除双向真库序列+守卫不变式+cascade 断言（§7.5 序列 4–7）；append-only 不动 | §7.5（决定段/段三判定式/守卫条目/测试序列 4–7）、§5.3 第 2 条、§7.3 第 6 步、§7.4 `readMaxDeletedAt`、§11.2 新 028 行与 history.repo 行、§12.2 import-snapshot 行、§13.2 INV-132、§14 Decision 5、§17 D1 行括注 |
| B2（残留阻断） | #35「应用时刻 Q0/F0」与 #36 的 F 拒绝规则会拒绝自己的 reconcile 回执；#10b 只写 Q0，口径不一 | #35 放行条件=Q0 且（F=0 或在途任务恰为本响应所属 graph/reconcile 任务，身份键匹配），应用后清本 F；#36/#10d/#34d 只拦其他任务与过期响应（明确排除本和解任务自身）；#10b 补「F=reconcile 不拦本回执」与 epoch 口径；判别测试=真实 F=reconcile 回执驱动 needsReload→0 | §2.5 #35/#36、§2.6 #10a/#10b/#10d/#34d、§12.2 lineage-store-write 行 |
| B4（残留阻断） | 事件前启动的在途 keyed 读可被 #34a 复用并在事件后错误清 needsReload；loading 会话不在 #41 置位面 | §2.3 注册表新增每 folder `invalidationEpoch`：#41 全未删会话（含 loading）epoch++；keyed 读发起时捕获当时 epoch；#34a 复用与 #43 写图/清位仅当读捕获 epoch ≥ 会话当前 epoch，否则链尾按新 epoch 重新单飞；判别测试=「请求已发→结构事件→事件前旧响应到达」 | §2.3 新字段行+needsReload 行、§2.5 #34、§2.6 #34a/#41/#43、§8.3、§11.2 registry/loader/folder-reconcile 三行、§12.2 lineage-folder-reconcile 行、§15 L2 |
| B5（残留阻断） | 对端删夹派生清理等待 `entity='folders'`，真实表名/触发器实体=collections（`026_baseline.sql:55,433-436`；`snapshot.repo.ts:90-93`），清理永不触发 | §5.4 删夹派生清理与 §7.5 段三对端清理匹配条件改 `entity='collections'`，附实名实测依据；新增真实删夹→导出→对端导入 keyed meta 缺席的快照测试行 | §5.4 删夹生命周期段、§7.5 段三派生清理条目、§11.2 import-snapshot 行、§12.2 import-snapshot 行 |
| RW1（警告） | #12 同对象 history busy→no-op 与 #13d busy→排队互相矛盾 | 统一：栈空/PDF 未 ready/quit-closing-recovery 冻结=no-op（真无效）；reconcile/history busy=按 #13d 排队不并发；按钮禁用判据与快捷键同判据同步表述 | §2.5 #12、§10.4 |
| RW2（警告） | 态一「激活后已提交乐观写」理由误述现行代码：激活期仅写 DOM 样式与 React 拖拽态（`card-drag-session.ts:151-167`），store/queue 写在 settle 提交链（`finish` 的 `onReorderMonthSlots`，:241-246；`useCardDrag` settle→startFlight） | 保留「有界 settle」决定，理由换真实依据：激活期仅视觉/布局状态（translate/--lg-pull/insertIdx 预览）；零写 cancel 的实质代价=与现行 pointercancel（取消判定用 lastClient）形成第二种取消语义分叉；删除「激活后已提交乐观写」表述 | §9.3 态一条目 |
| RW3（警告） | §17 已全闭合，正文多处残留「推荐/待确认/留确认/若采纳」条件式与退役备选，削弱裁决记录 | 逐处改决定语态并引用 §17 裁决行；删除退役备选与过期条件句（§5.4 备选段、§11.2 D2 条件段、§14 Status/Decision 8/Consequences、§7.2/§11.2 027 行等「采纳时」措辞）；grep 自证残留仅 §18 一轮历史记录内的合法引用 | 头注体例行、§1.2 D1/D2 行、§2.3 宿主行、§2.5 #23、§3、§4.1、§5.1、§5.4、§7.1/§7.2、§10.2、§11.2、§12.2 close-tab 行、§12.3 recovery 行、§14、§16、§17 D1 行括注 |
| 计数（观测） | §18.1 自称 `wc -l`=939 与实测 942 不符 | 以本轮处置完成后的最终 `wc -l` 实测回填（含本轮增量），注明实测日期 | §18.2 计数申报 |

连带自洽项（二轮同步完成）：§2.6 #10a 单飞捕获 epoch 与 #34a 同源；§7.2 删除「D2 采纳时」条件式；§11.2 027 行「仅 D2 裁决采纳时」改决定语态、§11.2 D2 条件段删除；§15 L1 验证门序列计数、L2 实施门 epoch；§16 第 4 条「可选 migration」改 migration 027/028；§12.2 lineage-assemble 行措辞与 §17 同源。计划外新增涉改面一项：migration `028_deletion_log_write_guard.sql`——B1 写点守卫的必要落位（cascade 删事件只能由触发器写，service 层无法先行保证），属处置单第 1 项的推导需求，非范围自扩。

计数申报（2026-11-23 命令实测）：修订后本稿 `wc -l`=971（二轮处置前 942，一轮处置前 799）；§8.2 数据行 14；§2.5 主表 42 行（#1-40+#16b/#17b）+§2.6 补行 19 行（10a-10d/13a-13d/20a-20d/34a-34d 各 4+#41-43 共 3）；§2.3 注册表字段 17 行（二轮新增 `invalidationEpoch`）；§11.2 表 56 行（一轮新增 7 行，二轮新增 028 migration 行）；§12.2 表 46 行（一轮新增 14 行）；§12.3 e2e 6 行（一轮新增 2 行）；B6 受锁文件 unit 11+e2e 2 不变。一轮稿自称 939 系申报时未实测所致，本行以最终 `wc -l` 为准。

### 18.3 三轮：定点复审窄修（2026-11-23 复审 FAIL，处置回写）

审查对象为二轮修订稿（实测 971 行）；证据=`/home/yyx/synapse-archive/scripts-audits/20261122-b4/code-review/recheck2.md`（总判 FAIL：B2/B4/B5 已闭合、RW1–RW3 与 027/028 涉改面及计数闭合，仅剩 B1 一条普通写链路反例；主控已亲验 `floating-notes.repo.ts:90` 裸取 now、`lineage.repo.ts:134-150` upsert 族 excluded 值两项代码事实）。复审反例为固定同毫秒真库重放：tombstone=T+1ms→恢复=T+2ms→普通写倒退 T→再删 `deleted_at`=T+1ms 与首删同值→`UNIQUE(entity,id,deleted_at)`+`INSERT OR IGNORE` 吞掉新删事件（`newDeleteWasSwallowed=true`）。本稿处置探针独立复现反例并在守卫形态下闭合（ALL PASS/exit=0，复审与主控均独立复跑通过；计数口径差 26 vs 25 已订正为实测口径）：`/home/yyx/synapse-archive/scripts-audits/20261122-b4/rework3/probe-b1-r3-write-guard.mjs`。

| 项 | 复审结论 | 处置方式 | 落点节号 |
|---|---|---|---|
| B1（残留阻断，唯一项） | 恢复点守卫把可恢复实体（lineage_nodes/lineage_edges/floating_notes——history-unit 恢复仅此三表）updated_at 推到未来毫秒后，普通 repo 写（patch-node 移动、upsert-edge 画线/改线/重连/线形、悬浮笔记编辑）仍裸取 now 发生倒退；随后再删除时写点守卫算出的 deleted_at 可与既有 tombstone 同值被 UNIQUE 吞，或使导入段三误判；序列 4–7 未覆盖「恢复→普通写→再删除」链 | 写点单调守卫扩展到三个可恢复实体的全部普通更新点，不变量统一为「可恢复实体每行 updated_at 在一切写点严格单调不减且新值>旧值」（§7.5）；落位选型 (a)=三 repo upsert 语句 UPDATE 分支 SQL 标量 `max(excluded.updated_at, strftime(旧行,'+0.001 seconds'))`（与 028 同公式、预编译+参数绑定不变），(b)=TS 侧写前读 existing 计算 max 退役，逐点理由见 §7.5；grep 实测三表全部 updated_at 写点清单入稿（3 句 repo 语句+各调用方+值源核查，§7.5）；flush lazy 物化路径时戳取值点=repo 语句（载荷白名单无时戳，`lineage-write-queue.ts:339,343-358`）；import `upsertRow`/papers/annotations/notes/lineage_graph_meta 逐面论证不在守卫面；putExact 族受同一不变量（§7.4）；新增真库序列 8=删除→恢复→普通写→再删除→导出→对端导入（断言新删事件未吞、对端已删行被删、普通写值不复活） | §7.5（决定段、普通写点守卫条目+写点清单、UNIQUE 条目重写、改动面、测试序列 8）、§5.3 第 2 条、§7.3 第 6 步、§7.4 putExact 公式、§11.2 lineage.repo 行+floating-notes.repo 新行+history.repo 行、§12.2 import-snapshot 行+新守卫测试行+history-unit 行、§13.2 INV-132、§14 Decision 5、§15 L1 验证门、§17 D1 行括注、头注修订来源 |
| 连带自查 | 守卫扩展后 §7.5 全节与 §5.3 恢复点守卫表述一致性；§12.2 相关测试行同步 | 不变量统一「一切写点」口径：§5.3 恢复点守卫句补「性质由普通写点守卫在后续一切写点保持」；§7.3 第 6 步补 putExact 反向更新不倒退；§13.2「双向」改「三类写点」；§14 Decision 5 补普通写公式；§15 L1/§14 验证序列计数 1–7→1–8；§12.2 三行同步 | 见上行落点列 |

连带自洽项（三轮同步完成）：§14 验证清单与 §15 L1 验证门序列计数同步 1–8；§12.2 lineage-history-unit 行补 putExact 单调断言；§17 D1 行括注扩为三类写点。计划外新增涉改面一项：`main/db/repos/floating-notes.repo.ts`（原不在 §11.2 表内）——处置单第 1 项「三个可恢复实体全部普通更新点」的直接落位需求，非范围自扩。`lineage-write-queue.ts` 的 renderer 乐观时戳经实读核实为显示态不入 DB，不入涉改面（论证=§7.5 写点清单覆盖面首条）。

计数申报（2026-11-23 命令实测）：修订后本稿 `wc -l`=1011（三轮处置前 971，二轮处置前 942，一轮处置前 799）；§7.5 测试序列 8 条（三轮新增序列 8）；§7.5 三表写点清单 3 行（grep 实测全量）；§11.2 表 57 行（三轮新增 floating-notes.repo 行 1）；§12.2 表 47 行（三轮新增 lineage-write-guard 行 1）；§8.2 数据行 14、§2.5 主表 42 行、§2.6 补行 19 行、§2.3 注册表字段 17 行、§12.3 e2e 6 行均不变。
