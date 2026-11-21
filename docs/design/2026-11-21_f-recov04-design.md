# F-RECOV-04 设计稿——recovery 死锁止血与编辑解锁（B0 批）

日期：2026-11-21。工单：F-RECOV-04（B0 批第一单元产出的设计先行件）。
输入：规划单源 plan-v1.md §2/§11.1/§11.2；summary-draft.md §4.2/§10；工单六件。
本稿只定语义与状态迁移；实现细节归实施单元。

## 1. 现状与缺陷（代码事实，行号实测于 HEAD=0c239898）

以下为事实（代码现状），非推断。

### 1.1 缺陷一：pendingChip 在场时 clean 化会 release 未决策旧槽

- `src/renderer/features/lineage/recoveryScheduler.ts:470-474`：`markRecoveryClean(reason)` 是 clean 四源唯一入口，直接调 `markCleanAwaitable(reason)`，无任何 pendingChip 守卫。
- `recoveryScheduler.ts:423-468`：`markCleanAwaitable` 在 drain 后取 `lastWrittenToken ?? ownToken` 发 `api.recovery.release`。release=删除槽文件（main 侧唯一删除径）。
- clean 四源挂点（事实）：
  - flush 全成功：`src/renderer/features/lineage/lineage-write-queue.ts:516` `markRecoveryClean('clean')`；
  - undo 回基线：`src/renderer/features/lineage/lineage.store.ts:512`；
  - redo 回基线：`lineage.store.ts:528`；
  - discardSession（脏切图弃置）：`lineage.store.ts:541` `markRecoveryClean('discard')`。
- 退出窗的 quit clean 经 `save()→flush()` 汇入同一挂点（write-queue:516），无独立 release 口。
- 工作区切换域级 release 走 `recoveryScheduler.ts:487-497` `prepareRecoveryWorkspaceSwitch`，直调 `markCleanAwaitable('discard')`，不经 `markRecoveryClean`（事实——两调用方当前同权）。

后果（推断）：用户 defer 后，任何一次 flush 收尾 / undo·redo 回基线 / 切图弃置都会无守卫地 release 掉账本持有的槽——用户未对旧副本做决策，副本即被删。

### 1.2 缺陷二：恢复无条件 loadPayload 覆盖当前图

- `src/renderer/features/lineage/recoveryEntry.ts:145-198` `restoreRecoverySlot`：`read → folder 校验 → :165 getHost()?.loadPayload(payload) → takeOver 循环`。`:165` 无任何「当前图是否有新队列/草稿」判定。
- defer 已存在：`recoveryEntry.ts:221-228` `deferRecoverySlot` = `setGateOpen(true) + emit({phase:'open', pendingChip:true})`。defer 后 `restoredLoaded=false`（:224），编辑期开始。
- defer 后新会话保存的行为面（事实）：main 侧 save 在槽属他者会话且无 takeOverToken 时返回 pending（`src/main/services/recovery/recovery.service.ts:161-168`）；renderer 收 pending 只亮 chip（`recoveryScheduler.ts:293-295` `emit({ pendingChip: true })`），槽不被覆写。

后果（推断）：defer→编辑→重开条→恢复，旧副本整体覆盖内存图（含未落定队列），新编辑丢失；这是 defer 打开后新可达的路径。

### 1.3 放弃无确认

- `recoveryEntry.ts:200-219` `discardRecoverySlot`：busy 置位后立即 `ports.release(token, 'discard')`，无确认步骤。available 槽（唯一副本）一经确认即物理删除。

### 1.4 defer 入口对 available 不可见

- `src/renderer/features/recovery/RecoveryBar.tsx:82-86`：defer 钮仅 `state.deadFolder` 分支渲染；available 行只有恢复/放弃（:68-81）。invalid/foreign-version 只有放弃（:66-71 同形）。

### 1.5 冻结原因不外显

- 冻结期编辑被拒的机制（事实）：`recoveryScheduler.ts:590-592` `recoveryBlocked()`；消费点 `lineage.store.ts:274`（beginUnitGated）、`:507/:523`（undo/redo）。
- RecoveryBar 确认条文案（`RecoveryBar.tsx:56-63`）只呈现会话摘要（时间/动作数/草稿），无「为什么现在不能编辑」说明。按钮可点而 store 静默拒写。

## 2. 状态迁移全表

轴定义：

- phase：`idle | checking | await-decision | open`（`RecoveryPhase`，recoveryEntry.ts:42）。
- pendingChip：`false | true`。true=「恢复副本待处理，当前编辑未受保护」。
- currentWrites（当前会话未落定写）：`空`（queue 空 ∧ 无草稿 ∧ 未 flushing）| `queue 非空` | `草稿在` | `flushing`。
- conflicts（恢复预检结果轴，仅在恢复流程窗内有意义）：`—`（未预检）| `无` | `有` | `读取失败`。
- busy：恢复/放弃等确认条动作在途。

可达格排除（推断，逐一核对 emit 面）：`checking × pendingChip=true` 不可达（enter emit 清 chip，recoveryEntry.ts:120）；`idle × 任一编辑态` 不可达（未装配一切入口 no-op）；conflicts 轴在非恢复窗恒 `—`；`await-decision × pendingChip=true` 可达（defer 后经查看重开，`:237-238` 只 patch phase 不清 chip 字段）。

表中「恢复」=restoreRecoverySlot，「放弃」=discardRecoverySlot，「defer」=deferRecoverySlot，「查看」=reopenRecoveryBar。行号=现状代码；标〔本批新增〕的行为为设计决定。

### 2.1 屏障与决策面（available 槽）

| # | 现态（phase/chip/writes/conflicts/busy） | 事件 | 动作 | 次态 | 可观测断言 |
|---|---|---|---|---|---|
| A1 | idle/busy=f | init+enter | bumpGen+冻结+peek | checking | recoveryBlocked=true（W9 装配即冻结） |
| A2 | checking/busy=f | peek available | adoptEpoch+resetTokens+emit | await-decision, chip=f | 条呈现「脉络图暂存会话·时间·动作 N」；blocked=true |
| A3 | await-decision, chip=f, writes=空, conflicts=—, busy=f | 恢复 | read→folder 校验→〔本批新增〕预检→loadPayload→takeOver 循环 | open, chip=f, writes=恢复载荷 queue | loaded=载荷；save 带 takeOverToken；blocked=false；真实文本在（e2e R1 不变） |
| A4 | await-decision, busy=f | 放弃 | 〔本批新增〕确认框→确认→release(discard)→epoch 采纳→（restoredLoaded 时）清 store 恢复态 | open, chip=f | release(token,'discard') 仅在确认后；取消则零调用（现 :200-219 无确认=缺陷） |
| A5 | await-decision, busy=f | 放弃确认框取消 | 无 | await-decision 不变 | release 零调用；条保留 |
| A6 | await-decision, busy=f | defer | 开门+emit | open, chip=t | blocked=false；chip 文案「当前编辑未受保护」常驻（available 行 defer 钮本批解锁，现 :82-86 仅 deadFolder 渲染=缺陷） |
| A7 | await-decision, busy=t | 恢复/放弃/defer | 守卫拦截（st.busy） | 不变 | 零新 IPC（既有 ：147/:202 busy 守卫） |

### 2.2 chip 期编辑与 clean 化（缺陷一修复面）

| # | 现态 | 事件 | 动作 | 次态 | 可观测断言 |
|---|---|---|---|---|---|
| B1 | open, chip=t, writes=空 | 编辑单元 | beginUnit 放行+enqueue | open, chip=t, writes=queue 非空 | saveStatus=dirty |
| B2 | open, chip=t, writes=queue 非空 | flush 全成功→markRecoveryClean('clean') | 〔本批新增 clean-gate〕gen++/复位照旧；**release 不发** | open, chip=t, 旧槽仍在 | release 零调用；chip 仍 true（当前实现 release=缺陷一，红1） |
| B3 | open, chip=t, writes=queue 非空 | undo 回基线（store:512） | 同 B2 gate | open, chip=t | 同 B2 |
| B4 | open, chip=t, writes=queue 非空 | redo 回基线（store:528） | 同 B2 gate | open, chip=t | 同 B2 |
| B5 | open, chip=t, writes=queue 非空 | discardSession（store:541） | 同 B2 gate（reason=discard 同拦） | open, chip=t | 旧槽仍在；新图弃置不影响旧槽决策 |
| B6 | open, chip=t（quit 窗 flush 收口） | 退出 clean | 同 B2 gate | 副本留驻 | release 零调用；下次启动屏障承接（INV-167 无害族）——设计决定，见 §5 待判 4 |
| B7 | open, chip=t, 任一 writes | 工作区切换确认弃置 | prepareRecoveryWorkspaceSwitch 直连 markCleanAwaitable('discard')——**豁免 gate** | 域级 release 照发 | release(token,'discard')；下进该 ws 屏障承接（recoveryScheduler.ts:487-497 不动） |
| B8 | open, chip=t, writes=queue 非空 | save 收 pending（槽属他者） | emit pendingChip=t（既有 recoveryScheduler.ts:295） | 不变 | chip 持续（槽未被新写覆写的事实呈现） |

### 2.3 defer 后恢复（缺陷二修复面）

| # | 现态 | 事件 | 动作 | 次态 | 可观测断言 |
|---|---|---|---|---|---|
| C1 | open, chip=t, slotKind≠null | 查看 | 重冻结 | await-decision（chip 字段仍 t） | blocked=true；恢复/放弃/defer 三入口再现 |
| C2 | open, chip=t, slotKind=null | 查看 | 重新 peek（Z7 既有） | open+chip 清 或 await-decision | 空槽→chip 清；有槽→条再现 |
| C3 | open, chip=t, writes=queue 非空 或 草稿在 → 查看→恢复 | 恢复 | 〔本批新增〕覆盖守卫：未落定写在场→不 read、不 loadPayload；进入落定步（§3.4 复审修正序） | busy 落定中 | loadPayload 零调用；queue 保留（当前实现 ：165 无条件载入=缺陷二，红2） |
| C4 | C3 落定步 | 落定执行 | 草稿收口（既有 commit 入口）+save()；四条件核验（clean∧!flushing∧queue 空∧draft 无）全过→弹单次替换确认→〔继续恢复〕→read→folder→预检→（D2 冲突再确认）→loadPayload→takeOver；任一不过或失败→停条 busy=f 可重试 | 确认分支或停条 | 落定期与失败分支 read/loadPayload/release 零调用；取消分支零调用 |
| C5 | open, chip=t, writes=空（已落定）→ 查看→恢复 | 恢复 | 预检→〔本批新增〕替换确认（defer 过必确认一次）→loadPayload→takeOver | open, chip=f, writes=恢复载荷 queue | 恢复成功清 chip（W2 既有锚）；替换确认在 loadPayload 之前 |
| C6 | open, chip=t, writes=queue 非空 → 查看→放弃 | 放弃（过确认框）→ release(discard) | 只删旧槽；**不清 defer 后新图**（restoredLoaded=false 既有 ：224） | open, chip=f | release(token,'discard')；store queue/floatingNotes 原样；saveStatus 保持 dirty |
| C7 | C6 后 undo 回基线（writes=空） | flush/undo clean | gate 已放行（chip=f） | release('clean') 正常 | 新会话自己的槽照常收口 |

### 2.4 预检与异常面

| # | 现态 | 事件 | 动作 | 次态 | 可观测断言 |
|---|---|---|---|---|---|
| D1 | 恢复流程中，conflicts=无 | 预检通过 | 继续（defer 过加替换确认） | 按 C5 | 冲突清单不呈现 |
| D2 | 恢复流程中，conflicts=有 | 呈现冲突清单（哪些动作不能原样恢复） | 继续恢复须再次明示确认；取消 | 条保留可重试 | 取消→loadPayload/release 零调用；副本保留 |
| D3 | 恢复流程中，conflicts=读取失败 | graph 读面 reject | 与冲突不同态：不呈现冲突清单，呈现「无法预检」〔归哪态=待判，见 §5-2〕 | busy=f、条保留 | 与 D2 文案不同；可重试 |
| D4 | read reject/超时 | restore catch | busy=f，条保留（既有 ：196） | await-decision | 可重试恢复（既有 W3 锚） |
| D5 | folder 校验不过 | deadFolder=t | 恢复禁用+放弃/defer（既有 ：161-163） | await-decision, deadFolder | 整图级冲突与 D2 动作级冲突分层，不混态 |
| D6 | slotKind=invalid/foreign-version | 任一事件 | 仅知情放弃（确认后 release）；不提供 defer 后自动覆写 | — | 与现状同形；放弃须过新确认框 |

### 2.5 冻结原因外显

| # | 现态 | 事件 | 可观测断言 |
|---|---|---|---|
| E1 | await-decision（frozen），用户触发编辑/undo/redo | beginUnitGated/undo/redo 拒（既有） | RecoveryBar 确认条呈现冻结原因说明〔本批新增文案〕；不重构 LineageToolbar |
| E2 | open, chip=t | — | chip「当前编辑未受保护」+查看钮（既有文案保留） |

## 3. 六件套语义规格

### 3.1 件一：available 槽 defer 可见入口

决定：`RecoveryBar.tsx` available 行（`slotKind==='available' && !deadFolder`）渲染 defer 钮，与恢复/放弃并列；deadFolder 行既有 defer 保留；invalid/foreign-version 不提供 defer（副本不可读，defer 后每次启动屏障重复阻挡，无收益——沿用仅知情放弃）。pendingChip 语义沿用 W-07：「恢复副本待处理，当前编辑未受保护」常驻，不扩多槽（INV-157/158/159/160 不变）。

### 3.2 件二：放弃不可逆确认

决定：确认框（复用 `src/renderer/shared/ui/Dialog.tsx`，现状 102 行）挂 RecoveryBarHost 组合层。文案含：动作数（`file.actionCount`）与是否含未收口草稿（`file.draftPresent`）与「放弃不可恢复」。确认前不得调用 release（事件面 A4/A5）。确认框打开期间 scheduler busy 语义由宿主承载（恢复/放弃钮禁用沿既有 busy 形）。

### 3.3 件三：clean-gate（pendingChip 时普通 clean 化不 release）

决定：新增 `src/renderer/features/lineage/recovery-clean-gate.ts`（≤120 行，纯判定件：输入=RecoveryUiState（或其窄形 pendingChip），输出=是否放行 release）。挂点=`recoveryScheduler.ts` 的 `markRecoveryClean` 单口（:470-474）：gate 判不过时跳过 release，gen++/写面复位照旧（bumpGenFullReset 语义不变）。`prepareRecoveryWorkspaceSwitch`（:487-497）直连 `markCleanAwaitable`，天然豁免——工作区切换=域级弃置，不受 chip 阻塞（plan §2.1）。`lineage.store.ts` / `lineage-write-queue.ts` 零改动（四源挂点调用形不变）。

账本处理（设计决定）：gate 拦截时保留 ownToken/lastWrittenToken 不清。理由：pendingChip 期账本 token 至多=本会话自己的新写（旧会话槽 token 在 peek 成功时经 resetTokens 清出账本，recoveryEntry.ts:127，从未入账）；保留使后续工作区切换/放弃确认仍可收口自己写的槽。旧槽文件在 gate 期不被任何 release 触及。

### 3.4 件四：恢复覆盖守卫

判定源（设计决定）：「当前会话未落定写」单源=宿主注入的判定回调（`RecoveryEntryHost` 增窄形谓词，宿主=RecoveryBarHost 装配 store+草稿观测）：`queue 非空 ∨ noteDraftSnapshot()≠null ∨ flushing`。entry 层不 import store（依赖方向不变）。B4 引入 unfinalized/history 后须同步扩展此判定源（plan §2.1 预告，登记入实施批）。

确认流（主控终裁 2026-11-21 复审修正版——修正原「合并确认」序：落定未达成前不得进确认与载入）：恢复请求到达时按未落定写分序：
- 未落定写在场（defer 与否同序）→ 恢复不执行（不 read 不 loadPayload），先进入**落定步**（busy 态）：草稿经既有 commit 入口转入队列 + `save()` flush；落定四条件核验 `saveStatus==='clean' ∧ !flushing ∧ queue 空 ∧ noteDraftSnapshot()===null` 全过才算落定成功（任一不过=停条 busy=f 可重试，不弹确认、不自动续）。落定成功 → 弹**单次替换确认**：「已保存当前 N 项修改〔+草稿〕。恢复将用副本替换当前图。」〔取消〕〔继续恢复〕。继续=read→folder 校验→预检→（冲突则 D2 再次确认）→loadPayload→takeOver；取消=零调用回条。**无「不落定直接替换」选项**——plan「先让当前写入落定」为强制序（落定在前、提示在后，plan §2.1 原序）。
- 未落定写空且 defer 过（pendingChip=t）→ 预检→替换确认（defer 过的槽必确认一次「恢复将替换当前图」）→ loadPayload→takeOver。
- 未落定写空且非 defer（启动屏障直达的 available，chip=f）→ 沿用既有恢复语义（零确认），e2e R1-R5 不变。

替换语义说明（事实链）：确认替换=接受内存图被旧副本覆盖；applyRecoverySession 置 needsReload=true（lineage.store.ts:576，INV-175），库态权威经既有重拉机制和解。flush 已落库的动作不因覆盖而丢失（DB 已收）；确认文案呈现队列动作数与草稿情况。

### 3.5 件五：恢复前冲突预检

数据面（事实）：payload=`LineageRecoveryPayload{folderId, graph{nodes,edges,lineTypeNames,floatingNotes}, queue, draft}`（src/shared/recovery/schemas.ts:91-99）；queue 元素=七 kind 判别联合（writeActionSchema，schemas.ts:40-69）；对照读面=`api.lineage.graph({folderId})`（Res=nodes/edges/floatingNotes 库态行集，src/shared/ipc/schemas.ts:333-346）+`api.folders.list`。

新件 `recovery-restore-preflight.ts`（≤220 行，纯数据冲突清单，输入=payload+读面结果，输出=冲突项数组）。七 kind 逐类判据：

| WriteAction kind | 引用实体 | 预检判据（对照库态读面） |
|---|---|---|
| patch-node {id} | 节点 id | id 不在读面 nodes → 冲突（重放将 CONFLICT 丢弃） |
| remove-node {id} | 节点 id | id 不在读面 nodes → 列示级（删除已亡实体=重放按 CONFLICT 丢弃语义收口） |
| upsert-edge {input.fromNode, input.toNode} | 两端节点 id | 任一端不在读面 nodes → 冲突（边无法重建） |
| remove-edge {id} | 边 id | id 不在读面 edges → 列示级 |
| upsert-line-type-names {input} | 无实体（6 行色名整替） | 恒无冲突 |
| upsert-floating-note {input.folderId} | 文件夹 id | folderId≠MAIN_GRAPH_ID 且不在 folders 读面 → 冲突（GHOST_FOLDER 重放=询问 remap/丢弃） |
| remove-floating-note {id} | 笔记 id | id 不在读面 floatingNotes → 列示级 |

边界（决定）：`payload.folderId` 整图级校验=既有 folderAlive/deadFolder 面（D5），不入动作级清单；`draft.noteId` 引用=既有水化计划容错（noteId 不在图→asNewNote，planDraftRehydration），不入清单。冲突呈现=「哪些动作不能原样恢复」计数+类型清单；继续恢复须再次明示确认；取消=副本保留可重试（D2）。冲突确认与读取失败不得混为一态（D3）。

### 3.6 件六：冻结原因外显

决定：承载位置=RecoveryBar 文案（不动 LineageToolbar，E 批统一控件禁用形态）。确认条（await-decision）补说明行：决策前编辑暂不可用及原因（恢复副本待决策）；defer 后 chip 既有文案已承载「当前编辑未受保护」。editor-gate 既有冻结期拒写断言全保留。

## 4. 涉改文件与行数预算、测试迁移清单、边界

### 4.1 涉改文件与行数（wc -l 实测；预算经主控随批修订——原估算与终态差=B-2 修正序展开+B-3 opSeq 守卫+R2 三修复，硬红线〔文件≤500/组件≤250〕全部未破；复审 R2-N1 处置）

| 文件 | U1 估算时点 | 终态实测（R2 修复后） | 预算（修订版）/动作 |
|---|---:|---:|---|
| src/renderer/features/recovery/RecoveryBar.tsx | 118 | 128 | ≤180；available/deferred/conflict 展示态+冻结说明文案 |
| src/renderer/app/RecoveryBarHost.tsx | 109 | 225 | ≤250（=组件硬红线；原 ≤190 作废——确认框文案单源 restoreDecisionView 上移+落定四条件核验装配所致）；app 组合层聚合合法 |
| src/renderer/features/recovery/RecoveryRestoreDialog.tsx（U2 拆件，R2-B1 后纯 props 化） | — | 60 | 组件 ≤250；确认框呈现（零 lineage/app import） |
| src/renderer/features/lineage/recoveryEntry.ts | 255 | 426 | ≤500（=文件硬红线；原 ≤380 作废——B-2 先落定序+opSeq 逐 await 守卫+R2 三修复展开；B4 拆 lineage 会话域时同域收敛拆件）；恢复前守卫（覆盖守卫+预检接线+操作身份） |
| src/renderer/features/lineage/recoveryScheduler.ts | 643 | 656 | max-lines 码行口径 lint 绿（物理行含头注；B0 仅净增 13=类型透传+clean-gate 挂口）；不另膨胀 |
| src/renderer/features/lineage/recovery-clean-gate.ts（新增） | — | 26 | ≤120；纯判定件 |
| src/renderer/features/lineage/recovery-restore-preflight.ts（新增） | — | 113 | ≤220；纯数据冲突清单 |
| src/renderer/features/lineage/lineage.store.ts | 607 | 607 | **零改动**（gate 挂 scheduler 层）——兑现 |
| src/renderer/features/lineage/lineage-write-queue.ts | 531 | 531 | **零改动**——兑现 |
| src/renderer/features/lineage/recoveryBackoff.ts | 40 | 58 | 计时纯函数族归置（withTimeout 迁入——计划外文件，随批申报） |
| src/renderer/shared/ui/Dialog.tsx | 102 | 102 | 复用；零改动 |
| src/shared/recovery/schemas.ts | 250 | 250 | 零改动（契约面不变）——兑现 |

### 4.2 测试迁移清单（沿 plan §2.4 逐文件）

- tests/unit/renderer/recovery-bar.test.tsx（实测 169 行/7 用例）：既有 ：56-64「available 仅恢复/放弃且无 defer」须改为三入口——**既有断言修改，实施时申报**；保留 invalid 限制（:66-71）与 chip 文案（:88-106）。新增：available 行 defer 可见、确认框态、冻结说明行。
- tests/unit/renderer/recovery-scheduler.test.ts（1263 行/54 用例）：保留 ：272,298,459 的 release/重开/放弃主链；新增 F-RECOV-04：红1 绿化（defer→clean 不删旧槽）、defer→undo 回基线同面、gate 不拦 prepareRecoveryWorkspaceSwitch、恢复覆盖守卫 scheduler 形。
- tests/unit/renderer/recovery-editor-gate.test.tsx（318 行/9 用例）：冻结原因可见与 defer 后解锁；不删既有冻结期拒写断言。
- tests/unit/renderer/recovery-integration.test.tsx（275 行/9 用例）：补 defer→编辑→save/undo/discard 真实 store+scheduler 序列；红2 绿化；放弃只删旧槽不清新图。
- tests/unit/renderer/recovery-rework-store.test.ts（255 行/8 用例）：补 defer→discardSession 不 release。
- tests/e2e/recovery.spec.ts（266 行/5 用例）：R1-R5 保持；新增 available defer、新编辑后旧槽仍存在、确认放弃才删除；恢复内容断言真实笔记文本。

### 4.3 已知边界与本批不做

- 不做 G 临时显著性补丁（B3）、不做 C1 排版（B6）、不重构 LineageToolbar（E 批）、不扩多槽（单槽制维持）。
- 不改 LineageRecoveryPayload 契约（B4 unfinalized/history 引入后再扩展守卫判定源）。
- INV-161/163/164/166/175 的 docs/invariants.md 修订随实施批同批（plan §11.2；本稿为设计先行件不直接改 INV）。

## 5. 主控终裁（2026-11-21，对 U1 六项待判的裁定——实施按此执行）

1. **busy 期 defer 钮禁用**：禁用（busy 在途时 defer 与恢复/放弃同禁——A7 行全钮一致）。
2. **预检读取失败归态**：阻断可重试（D3 形态——预检目的是防静默丢动作，fail-open 会复刻该风险；与冲突清单不同文案不同态）。
3. **clean-gate 拦截时账本 token 保留**：保留（§3.3 理由成立——账本至多持本会话新写 token，域级切换与放弃确认仍可收口 own 槽）。
4. **退出窗 quit clean 受 gate**：受（副本留驻=下次启动屏障承接，INV-167 无害族；不为 quit 开独立 release 出口）。
5. **放弃确认框补一句**：「放弃后，新的编辑将重新受副本保护」（chip 清除后的保护恢复说明，事实成立——槽空后新编辑正常建副本）。
6. **C3/C4 确认序（2026-11-21 复审修正，原「落定+替换合并单次确认」作废）**：先落定后确认——未落定写在场（defer 与否同序）→busy 落定步（草稿收口+save()+四条件核验）→成功才弹单次替换确认→继续才 read→预检→（冲突再确认）→loadPayload；落定不过/失败=停条可重试不自动续（见 §3.4/§2.3 修正版）。无「不落定直接替换」选项。复审触发=独立审查 B-2（flushing 早退被误判成功+草稿未收口）。
