# F-VISFB-64「关闭入口无条件握手化」架构设计书（终稿 v1.2+终裁）

> 三段通道完链：Kimi 拟定（ops-drafter，v1.0→v1.1→v1.2 三轮）→deepseek 对抗审核
> （ops-auditor，r1 返工 B3W11N4→r2 返工 B2W11N4）→GLM 主控终裁（§⑪，2026-10-18）。
> 主控事实核验八项随轮入稿（requestId 载荷/异步确认框/clean 四步实测/bridge busy
> 既有能力/app 退出实链/main-window 458 行/INV 正身/测试 harness）。
> 实施批以此稿为唯一设计单源；票=F-VISFB-64（tickets/registry.ts）。

## ① 背景与缺陷链

现行 dirty 链为：

`用户输入 → renderer 三源聚合 → render/effect → setQuitDirty IPC → main 缓存`

缓存 clean 不能证明 renderer 当前干净，故本票取消 clean 直放，所有 close 均执行
`quitFlush`。另有两条必须同时闭合：

1. **回执新鲜性**：④查态后若仍能产生用户写，clean 回执与后续 dirty push 无因果序，
   不能授权安全销毁。
2. **取消可恢复性**：closing/busy 若因 save() 或 IPC 挂起而永置位，取消后可能永久
   冻结；简单复位又可能让旧 flush 与新关闭序列并发。

主控核验：正常 clean 路径①②②.5 空态 no-op，③在 `saveStatus==='clean'` 时跳过
save，④为同步 store 读、无盘 IO；一轮握手数十 ms 量级成立。

## ② 目标与非目标

### 目标

- close 一律 `preventDefault`、发送 quit-flush；缓存只决定等待分级。
- 仅「当前 requestId、未过 deadline、因果新鲜的 clean 回执」或用户显式确认可授权
  destroy。
- 用户写在入队前同步受 gate 约束；flush 内部收口动作按 origin 豁免。
- 取消后可解冻；旧 flush 未结算期间不得产生新的 clean 自动销毁面。
- policy 事件、副作用、时钟、计时器 generation、确认框及退订所有权完整可测。

### 非目标与 app 边界（主控核验）

- 不改三源聚合公式、push 链、四步顺序；不新增依赖或出网 host。
- 不处理系统强杀；OS session-end 当前无处理。不默认加入二次 close 强杀。
- `window-all-closed` 在窗已毁后调用幂等 shutdown+app.quit；`before-quit` 仅
  shutdown；另一 app 退出径为 pre-window 单实例失败。
- `app.exit` 唯一调用者为 `index.ts:29` 启动失败径，无用户数据；`win.destroy()`
  仅 `main-window.ts:239、385`，均在 close 链内，无 rogue 调用者。
- 窗口 close 保持唯一活入口。未来新增 app 级退出入口应路由 `win.close()`，列为
  INV/架构防线提案（§⑪-③随 INV-22 修订落档）。

## ③ 候选清单

### 甲：统一满额握手

所有 close 使用 `QUIT_FLUSH_TIMEOUT_MS=5000ms`；无 clean 短计时器和升级迁移。
有效 clean 回执销毁，dirty/超时/send-failed 进入确认。

### 乙：clean 短宽限，超时静默销毁

初始 clean 在短宽限无回执后静默 destroy；初始 dirty 走 5s。即使叠加 α，仍保留
「旧 dirty 尚未保存且无回执」的静默销毁面，故 **α 对乙是必要而非充分条件**。

### 丙：分级等待，超时仅确认

初始 clean 等 `QUIT_CLEAN_GRACE_MS`，初始 dirty 等至 `t0+5000ms`；WC 内 dirty
push 升级 WD，截止仍为 `t0+5000ms`，WD 不降级。超时只确认，不静默销毁。

grace 比较（终裁两案基础）：

| 方案 | 挂死且缓存 clean | 暂时繁忙 | 参数/状态成本 |
|---|---|---|---|
| 丙，grace=1000 | 约 1s 后确认 | 超过 1s 即提前确认 | 有 WC/WD 与升级边界 |
| 丙，grace=2000 | 约 2s 后确认 | 多给 1s 恢复、push 和回执机会 | 同上 |
| 甲 | 5s 后确认 | 等待最长 | 无 grace 参数及升级迁移 |

繁忙恢复时长分布数据缺（W-08 证据缺口，终裁接受——§⑪-⑧）；1000/2000 只影响
体验，不改变「超时不静默销毁」的安全性质。

## ④ 修法与关键权衡

### B1 修法族

| 修法 | 结论 |
|---|---|
| α 冻结编辑 | **采（终裁）**。收帧同步冻结用户写，①②③ settle 后④；clean 回执后保持冻结至 destroy/abort/安全复位 |
| β 版本纪元 | editSeq、查询基线及在途 seq 协议可闭合，但修改既有 payload，协议和测试成本更高——不采 |
| γ 接受残余 | 接受④至 destroy 的无固定上界调度窗，须用户显式接受——不采（呈裁位维持） |

### α 的同步 gate 与 origin 豁免

- `closing` 为 renderer 模块级单例布尔旗标，同步读写，**禁止 React state**。
- 所有用户写入口在 enqueue、store 变更或句柄修改**之前**同步检查；closing=true 时
  拒绝写入。
- gate 不放入 `flushAllNow/save` 等内部 API，避免 flush 自锁。②.5 定名为
  `fireLineageNoteCommit`：草稿入队属于内部收口，豁免 gate。
- 新 dirty 写面完备性不可绝对证明；治理=INV-22 修订新增条款（「新增写面须先登记
  收口并挂 gate」——INV-150 前置条件条款同族；§⑪-③）。

### 写源清单（gate 挂点与闭合论证）

| INV-22 写源 | 用户 gate 挂点 | 收口与闭合论证 |
|---|---|---|
| notes pendingEdit | 笔记输入/命令入口，在 pendingEdit 或自动保存入队前 | ①`flushAllNow` await 既有 pending；冻结后无新 pending |
| annotations 句柄、tab dirty | 标注增删改、挂载/卸载用户命令，在句柄和 tab dirty 变更前 | ②刷新既有句柄并 settle；④读取最终 tab dirty |
| lineage write-queue | lineage 用户操作，在 write-queue.enqueue 前 | ②.5 先入队草稿，③save 正道消费队列，④后查态 |
| noteDraft | 悬浮笔记输入入口，在草稿 store 写入前 | ②.5 将已有草稿转为收口队列，③继续处理 |

④后非用户异步写逐项核对（主控核验）：

| 写源 | 结论 |
|---|---|
| autosave 600s 计时器 | ①清空 pending 且输入冻结，之后 pending 空即 no-op；close 前已启动者由①等待或④查态覆盖 |
| write-queue flush 计时器 | ③正道消费；关闭前已在途者计入 busy/orphan，不得被 clean 回执遗漏 |
| undo 逆写 | 属用户动作，入队前被 gate 冻结 |
| corpus/figures 提取 | main 任务服务经 IPC 事件回写，不属 quit dirty 三源；不改聚合，不宣称冻结该非 dirty 域 |

### W-03：取消永冻的解法（终裁=A+B 双层）

- **A（主）：main→renderer abort/unfreeze**。新增局部事件 `quit-flush-abort`，
  载荷 `{requestId}`（终裁定名——比 quit-flush 帧加标志清晰）；触
  `api-surface.ts=[locked-change]`（shared schemas+preload+bridge+测试随改）。
  C→I 时发出 abort。requestId 为单调水线，bridge 废止不超过该 id 的活动 epoch，
  避免迟到 abort 误伤后续关闭序列。abort 后允许用户写，但旧 flush 若仍未 settle，
  登记为 `orphan-pending`；旧 epoch 不得再发 clean 回执。
- **B（兜底）：有界本地复位**。abort 丢失或发送失败时，bridge 最晚按 5000ms 上限
  解除 closing；busy 内部动作不能因此被视为已结束，仍保留 orphan-pending。

并发防护（A/B 共同前提）：只要 busy 或 orphan-pending 存在，新 quit-flush 立即
回执 `stillDirty=true`，不并发执行四步；旧动作 late-write-wins 后重新聚合 dirty，
orphan 全部 settle 才允许新的 clean 自动关闭。若旧动作永挂，用户可编辑，但每次
关闭均为保守确认，不会永冻或静默自动销毁。

（终裁澄清：busy 期间新帧立即 true=bridge 既有能力实证；orphan-pending 重聚合=
本设计新定义语义，非既有能力假设。）

## ⑤ 推荐、风险与回退

推荐（终裁采纳）**丙+α+A/B 安全网，grace=1000ms**；简化备选为 **甲+α+A/B**。
两者均具备：

- 正常 clean 快速握手；
- ④后用户写被同步 gate 排除；
- busy/orphan 未结算时不发 clean 自动销毁；
- 取消有明确解冻路径，abort 失效仍有有界兜底。

主要风险：漏登记写源（治理条款承接）、旧 flush 非幂等 late write（orphan 语义
承接）、abort 通道增加受锁面（如实计价）。

关闭策略回退仅限丙→甲（grace 常量切换），α 及取消安全网不得一并拆除。bridge
异常时的保守降级是禁止 clean 自动销毁、统一确认，**而非恢复 clean 直放**。

## ⑥ 推荐形态的 close 全态空间表

### renderer 子态

| 条件/事件 | 行为 |
|---|---|
| 新帧，无 busy/orphan | 同步 closing=true；执行四步，①②③ settle 后④ |
| 新帧，busy 或 orphan | 立即以新 requestId 回执 true；不并发四步，不产生 clean 自动销毁 |
| ④=false | 回执 false；保持 closing 至 destroy、abort 或安全复位 |
| ④=true/flush 异常 | busy 结束；按脏处理，无 clean 自动销毁面，可解冻 |
| abort/本地复位 | closing=false；未 settle epoch 转 orphan，旧 epoch 禁止回 false |
| orphan settle | 执行 late-write-wins 后重新聚合；全部 orphan 清空后才允许新 flush |

### main policy 态表

态：`I/WC/WD/C/D`。close 携带首快照；此后 dirty-push 只更新 policy 自持缓存。
receipt 仅在 id 当前、状态 WC/WD、`now<deadline` 时有效。

| 当前态 | 事件 | 迁移与 effects |
|---|---|---|
| I | close | preventDefault、新 id、sendQuitFlush；clean→WC，dirty→WD |
| WC/WD | send-failed | 清 timer、除名→C |
| WC | dirty-push，dirty 且未到期 | 换臂 timer→WD；同 id，截止 `t0+5000ms` |
| WC/WD/C/I | dirty-push | 仅更新自持快照；WD 不降级，C 不跳态 |
| WC/WD | 有效 receipt false | 清 timer、完成请求→D，destroy 恰一次 |
| WC/WD | 有效 receipt true | 清 timer、完成请求→C |
| WC/WD | 有效 timer-fired，或 receipt 时已过期 | 清 timer、除名→C |
| WC/WD | renderer-gone | 清 timer、除名→C，不按 clean |
| 任意非 D | window-destroyed | →D；C 态额外 closeConfirm；dispose |
| WC/WD | close | 忽略，不重发、不新建 id |
| C | close | 不叠 window-modal 确认框 |
| C | confirm-resolved=confirm | →D，destroy 恰一次 |
| C | confirm-resolved=reject | →I，unfreeze-renderer（发 abort）；下次 close 新 id |
| I/WC/WD/C/D | 旧、未知、已除名 receipt | 丢弃；I 的一切迟到回执均不作用 |
| I | abort send-failed | 保持 I，由 B 兜底解冻，不重试成循环 |
| D | 其余事件 | 忽略；dispose 幂等 |

确认框为 window-modal（showMessageBox 附 parent window——主控核验），C 期间用户
无法写；文案维持通用 `QUIT_CONFIRM_MESSAGE`，不随态变化。

### 清理规则

| 出口 | timer/request | renderer/确认框/listener |
|---|---|---|
| WC→WD 换臂 | clear `{旧deadline,旧generation}`；arm `{t0+5000ms,新generation}`；id 不变 | 原订阅保留 |
| WC/WD→C | clear 当前 `{deadline,generation}`；完成或除名 | showConfirm 单实例；C 中不提前 abort |
| WC/WD→D | clear、请求失效 | destroy；closed 后 dispose |
| C→I | 无活动 timer；确认 token 失效 | unfreeze-renderer；abort 水线生效 |
| C+窗毁 | 请求失效 | closeConfirm，再 dispose |
| I+迟到回执 | 不建 timer、不改 request | 不增删全局监听，仅丢弃 |
| D dispose | 清全部 timer、id、generation、confirm token | 退订全集，重复调用幂等 |

D 的订阅全集：win close/closed、webContents render-process-gone、ipcMain 两通道
（+abort 通道）、policy timer、confirm 适配回调，以及随窗销毁的 renderer
quit-flush/abort 监听。

关键序列：

1. `close→freeze→④false→D→dirty-push`：④后用户写不存在，迟到 push 不推翻新鲜
   性，destroy 不重复。
2. `timeout→C→cancel→abort→旧 flush 未毕→reclose→true→C`：无并发四步，旧 false
   永不被接受。
3. `close 前异步写已启动→close→①/③等待→④`：④必须看到该写结果。
4. `WC 999ms push→WD→1000ms 不确认→5000ms C`。
5. `C+push`：仅缓存变化；窗毁则 closeConfirm+dispose。

## ⑦ 接口、受锁面、拆件与测试

### policy 完整接口

事件严格为八类：

`close / dirty-push / receipt / timer-fired / send-failed / renderer-gone /
window-destroyed / confirm-resolved(confirm|reject)`。

- 废除 `getQuitDirty()` 活 getter。dirty-push 持续更新 policy 快照；close 的首快照
  由该单一状态源生成，reducer 不反向读取 main-window。
- `now()` 注入 Electron main 的单调 `performance.now`。
- requestId 沿用 `quit-flush-N` 进程内单调序，进程生命周期单例，跨取消唯一。
- effects：sendQuitFlush、arm/clear timer、retire、showConfirm、closeConfirm、
  unfreeze-renderer、destroy、dispose。arm/clear 均携 `{绝对 deadline,generation}`；
  旧 generation 回调无效。

### 事件源与所有权

| 事件源 | policy 事件 | 所有者/退订 |
|---|---|---|
| win close | close | main-window；dispose 退订 |
| ipcMain set-quit-dirty | dirty-push | main-window；按注册方式 removeHandler/removeListener |
| ipcMain report-quit-flush | receipt | 同上 |
| timer 回调 | timer-fired | main-window；clear 并废 generation |
| 发送端口异常 | send-failed | main-window 适配 |
| webContents render-process-gone | renderer-gone | main-window；dispose 退订 |
| win closed | window-destroyed | main-window；dispose 退订 |
| confirmQuit Promise | confirm-resolved | main-window 以 token 适配；reject 按 reject |

### INV/ADR 红线

INV-22 仅改尾句并增治理条款（终裁定稿）：

- before：「dirty 缓存仍为握手触发判定源（push 模式不变）」
- after：「缓存=分级等待判定源，非放行依据；关闭一律握手。新增 quit dirty 写面
  须先登记 flush 收口并挂 closing gate（INV-150 前置条件条款同族）」

`quitDirty = tabDirty || lineageDirty || noteDraft` 及原 push 链零改，聚合公式
不变。INV-150 正文不触；INV-141 不变（④仍实查态）。

ADR 以 **proposed** 入实施批（编号届时分配），内容五要素=「无条件握手、同步
closing gate、缓存仅分级、abort/orphan 取消安全网、app 退出统一路由」；随实施
验收翻 accepted。

### 拆件预算与 contingency

主控核验 `wc -l src/main/windows/main-window.ts`=458（2026-10-18 实测）。纯
policy（`quit-close-policy.ts`，终裁定名，src/main/windows/ 同域）不 import
Electron；main-window 仅保留端口和订阅。

- main-window：净减至少 40，目标 418，距 500 留 82 行。
- policy：新增不超过 180 行。
- policy 超 180：再拆 timer/confirm executor；main-window 超 418：继续拆订阅
  wiring，不以预算为由停在红线上。
- 实施后以同一 `wc -l` 命令复测留证。

常量单源（终裁）：`QUIT_FLUSH_TIMEOUT_MS`（现驻 main-window.ts:321）+
`QUIT_CLEAN_GRACE_MS`（新）上移 `src/shared/constants.ts`（AUTOSAVE_DEBOUNCE_MS
先例——bridge 兜底复位需 renderer 侧可读，禁跨层 import+禁复制）；
[locked-change] 随实施批。

### 测试清单

policy 全序列单测至少覆盖：

- `close→dirty-push→receipt` 与 `close→receipt→dirty-push`；
- busy、orphan、abort 丢失后的本地复位；
- 999/1000/1001ms（grace=1000 终裁口径）：分别保持 WC、恰一次 C、迟到 clean
  回执无效；
- timeout/cancel/reclose、旧 id 隔离、WD 不降级；
- send-failed、renderer-gone、window-destroyed；
- C 态 push 仅缓存、确认不叠、C 态窗毁 closeConfirm；
- destroy 恰一次、timer/listener 无泄漏、dispose 幂等。

renderer 侧逐写源断言 gate 在 enqueue 前同步生效，flush 内部 origin 不被自锁。
必设红测：**close 前启动非用户异步写，若④提前执行则红；正确实现须待其 settle
且④仍见结果。** busy/orphan 期间新帧必须 true，旧 epoch 不得 false。

tests/** 走 `[locked-change]`；新测试 always-active。quit-handshake 的 clean 放行
断言改写属于契约变更而非超集：**test-surface 豁免已终裁预批**（rulingLink=本档
§⑪；实施批在 `scripts/test-surface.exemptions.json` 登记 reason+rulingLink，提交
携带 `[locked-change][test-refactor]`）；不得自行重生 baseline 重绿。

e2e 使用 `waitFor` 条件等待握手后销毁，不用固定 sleep 冒充同步关闭。

## ⑧ 开放问题（终裁后余留）

- 用户呈裁位（实施批呈报，不阻塞）：乙的静默丢稿、γ 的残余窗、二次 close 强杀
  均须显式接受才可选；无「用户已倾向乙」预设。
- W-08 参数证据缺口=接受（§⑪-⑧）：实现批 e2e 观察误报率，频繁误确认则调 2000
  或回退甲（一行常量）。

## ⑨ r1 修订记录

| 项 | 处置 |
|---|---|
| B1/B2/B3 | 分别引入 α、bridge busy、app 级边界；v1.2 继续补强 |
| W1/W2/W3 | 清理表、术语及候选矩阵已建立 |
| W4/W5 | 撤重闸门，采用既有主侧 harness |
| W6 | 原 quit-flush/report 载荷不变；abort 安全网另行计价 |
| W7/W8 | 异常与异步确认入态表 |
| W9 | INV-22 为修订正身，INV-141 不变 |
| W10/W11 | 458 行拆件及 clean 实测口径入稿 |
| N1—N4 | 边界、呈裁、显式断言及 WD 不降级已登记 |

## ⑩ r2 处置记录

| 项 | v1.2 处置 |
|---|---|
| B-01 | closing 定为模块级同步单例；补四写源 gate/收口表、origin 豁免、非用户异步写逐项论证及治理提案 |
| B-02 | 事件改八类；废活 getter；补 closeConfirm/unfreeze/dispose、绝对 deadline+generation 和事件源所有权表 |
| W-01 | 补换臂、C→I 解冻、I 迟到回执、C 窗毁关框及 D 订阅全集 |
| W-02 | C push 仅缓存；window-modal、通用文案及 C 期间不可写入稿 |
| W-03 | A abort+B 有界兜底；orphan-pending 和旧 epoch 禁 false 防复位后并发；API 成本如实登记 |
| W-05 | 补 policy 全序列、busy/orphan 及「close 前异步写→④仍见」红测 |
| W-06 | 明写 test-refactor 裁决、exemptions 路径、reason+rulingLink |
| W-07 | INV-22 before/after 全文入稿，聚合公式零改；ADR=proposed |
| W-08/N-03 | 丙 1000/2000 与甲并列，参数证据缺口保留 |
| W-09 | app.exit、两处 win.destroy 主控核验盘点入稿，无 rogue |
| W-10 | α/β/γ 仅指修法，甲/乙/丙仅指候选；乙+α 仍留静默丢稿 |
| W-11 | 行级预算及超预算 contingency 入稿 |
| N-01 | 乙、γ、强杀呈裁位维持 |
| N-02 | 单调 now、quit-flush-N 单调 id、timer generation 入接口 |
| N-04 | e2e 改 waitFor；458 的 wc -l 实测作预算基线并要求复测 |

## ⑪ 主控终裁记录（GLM，2026-10-18，runId=20261018-fvisfb64）

逐字=账本 ruling 行同刻。八项：

1. **候选=丙+α，grace=QUIT_CLEAN_GRACE_MS=1000**。依据=票面实证繁忙窗「数百
   ms」（1000 覆盖有余界）+挂死 clean 约 1s 恢复符合票面设计点动机+误报确认可
   取消零损失（安全网在）。回退路径=甲+α（grace 常量切换，一行）。
2. **取消安全网=A+B 双层**：A=新事件 `quit-flush-abort` 载荷 {requestId}+epoch
   水线（api-surface/shared schemas/preload/bridge=[locked-change] 如实计价）；
   B=bridge 5000ms 有界复位兜底。orphan-pending 按 §④ 定义实施——busy∨orphan
   期间新帧立即 true 为 bridge 既有能力实证；orphan 重聚合=本设计新定义语义。
3. **写源治理条款采纳入 INV-22 修订**（新增写面须先登记 flush 收口+挂 closing
   gate——与 INV-150 前置条件条款同族）。
4. **INV-22 redline 按 §⑦ 定稿**；INV-141/INV-150 不变。
5. **ADR=proposed 随实施批翻 accepted**（五要素见 §⑦）。
6. **test-surface 豁免预批**：quit-handshake clean 放行断言改写=契约变更，实施
   批照登 exemptions（reason=契约变更随 F-VISFB-64 无条件握手化；rulingLink=本
   档本节）。
7. **常量单源**：QUIT_FLUSH_TIMEOUT_MS+QUIT_CLEAN_GRACE_MS 上移
   src/shared/constants.ts（[locked-change]）；policy 模块定名
   `quit-close-policy.ts`（src/main/windows/ 同域）。
8. **W-08 证据缺口接受**：实现批 e2e 观察误报率，频繁误确认→调 2000 或回退甲。

边界测试取 999/1000/1001ms。用户呈裁位维持三项（§⑧），不阻塞实施。
