# P7X-02 实现票报告——阅读时长落盘 outbox（实现者：GLM5.3flash 定档申报，Agent 工具面无 model 参数=环境统一档欠账披露，如实记账）

> 票：P7X-02；规约源=docs/design/2026-09-04_p7x02-reading-time-outbox.md（终裁版，
> 态空间/接口/失败模式/页码重放/边界申报逐节照办）；任务书=scripts/audits/p7x02-impl-brief.md。
> 状态：**DONE**（初轮 verify exit=0 + 回炉一轮 verify3 exit=0——见 §9）。

## 1. 实现摘要

- **新模块 reading-time-outbox.ts（298 行 ≤300）**：纯 TS 队列态机，store/send/now/timers/onWarn
  全注入（禁真 timer，reading-time 同法）。态空间逐格落地：T1 写前日志序（先落 store 后入
  调度）/T2 per-paper 队头+先持久化 in-flight 再发 invoke（CO-3）/T3 resolve 即 remove 无
  tombstone/T4 attempts+++指数退避（共享计时器 1s→2s→…上界 5min）+队头保持/T5 启动恢复
  in-flight 残留 attempts++ 后按未达重放（attempts≥N→T6）/T6 死信留驻+onWarn（不自动重放，
  T7 取消）+上限 50 逐最老淘汰/排空闸门（replayOnStart resolve 前 seq 续增只入队不派发）。
  四不变量落地：①每条目独立 key 同步写（store=落盘投影）②per-paper seq 严格升序（队头
  阻塞保证）③永不回写 ledger ④dispose 停扫描不停已发回调（回调照常更新 store）。
  localStorage 退化：任一 store 操作抛错→内存重试+强 WARN（一次性）。
- **新模块 reading-time-outbox-store.ts（87 行）**：localStorage 适配器（CO-1 每条目独立
  key `synapse.outbox.entry.<id>`+元信息 key `synapse.outbox.meta`，禁整表 JSON 重写）；
  损坏条目丢弃+onCorrupt+自清（key 移除防重复告警）；拆独立件=≤300 行票面+两职责两文件。
- **reading-time.ts**：invokeOne 直发+吞错→`deps.enqueue`（CompositeFlusherDeps.saveProgress
  改名 enqueue，签名同形三元组）；页码在 enqueue 时点定死（重放期不取「当前页」防
  last_read_page 回退）；chunkSeconds 分片单源不动。
- **reading-time-setup.ts**：outbox 单例装配（真 window.localStorage/真定时器/send=api.
  reader.saveProgress 原签名注入——单通道零新 IPC）；三收尾口全改道：复合 flusher enqueue/
  onFlush 卸载兜底 enqueue/**sp.dispose 页码尾账 enqueue（R7 并入，seconds=0 合法载荷——
  页码旁路消除）**；id/seq 铸造单源（seq 自 store 存量 max 续增，id=ob-<seq> 跨会话唯一）；
  WARN=toast 单源（error/info 分级）；导出 `getReaderOutbox`（main.tsx 消费）+
  `useReaderReadingTime` 返回 `spView`（dispose 改道包装视图，其余面 spread 直通）。
- **ReaderPage.tsx**：`useScrollProgressWiring(spView, …)`——wiring 消费包装视图
  （spProg 其余消费面零改）。
- **main.tsx**：启动闸门——渲染前 `await getReaderOutbox().replayOnStart()`（导航可见即
  重放毕=e2e 同步点；空 outbox 同步即 resolve 零首帧负担）。
- **INV-57 注记面更新（受锁 unlock→apply）**：R7 双 invoke 句→「已并入 outbox 单队列」；
  分片级失败句→「outbox 兜底（at-least-once,重复界 N×3600s/条——T5 计 attempts 拦停；
  P7X-02 落地）+localStorage 退化面=内存重试+强 WARN 申报」。逐句 diff 核验=仅注记面两句，
  ①~④ 锚条款/锚定/测试列零动。

## 2. 文件清单

修改（git diff 面）：
- `src/renderer/features/reader/reading-time.ts`（invokeOne 改道+头注）
- `src/renderer/features/reader/reading-time-setup.ts`（单例装配+三收尾口改道+spView）
- `src/renderer/features/reader/ReaderPage.tsx`（spView 消费一行）
- `src/renderer/main.tsx`（启动闸门）
- `tests/unit/renderer/reading-time.test.ts`（受锁：等价面更新——makeFlusher deps
  saveProgress→enqueue、数组 saved→enqueued、4 处断言/标题「invoke→入队」同形改写）
- `docs/invariants.md`（受锁：INV-57 注记两句）
- `locks/manifest.json`（283→286）

新增：
- `src/renderer/features/reader/reading-time-outbox.ts`（298 行）
- `src/renderer/features/reader/reading-time-outbox-store.ts`（87 行）
- `tests/unit/renderer/reading-time-outbox.test.ts`（468 行，**23 用例**，always-active
  不经 guardedDescribe）
- `tests/e2e/reading-time-replay.spec.ts`（130 行，P7X-02 未 done skip 守卫）
- `scripts/audits/p7x02-impl-e2e-probe.mjs`（159 行，e2e 链路无守卫探针）
- 证据件：`scripts/audits/p7x02-impl-first-red.raw.txt`、`-mutation-{1,2,3}.raw.txt`、
  `-verify.raw.txt`、`-e2e-probe-out.json`、`-e2e-probe-run2.raw.txt`

## 3. TDD 红绿证链（raw 引证）

- **首红**：`scripts/audits/p7x02-impl-first-red.raw.txt`（exit=1——新测试对现状红：
  Failed to load url …/reading-time-outbox，模块未诞生）。
- **绿**：23/23（模块实现后；测试侧三次自修均测试面缺陷非实现面：T1 断言改队头阻塞
  观察面/退避闸门测试补微任务冲刷/测试台快照对抛错 store 容错）。
- **变异红证 ≥3（cp 备份法，禁 git checkout；均于终态树采集，还原 diff 空）**：
  - M1 删队头阻塞（pump 放行越序）→ 3 红（T2 顺序断言红）：
    `scripts/audits/p7x02-impl-mutation-1.raw.txt`（exit=1）
  - M2 删 T5 attempts++ → 2 红（T5 重放/T5×T6 死信双红）：
    `scripts/audits/p7x02-impl-mutation-2.raw.txt`（exit=1）
  - M3 enqueue 改回直发旁路（不落 store 不入队直接 send）→ 10 红（含排空闸门/T1 持久化）：
    `scripts/audits/p7x02-impl-mutation-3.raw.txt`（exit=1）
  - 每次变异后 cp 备份还原+`diff` 确认空（输出实录 m1/m2/m3-restore-ok）。

## 4. verify 真退出码与基线对账

- `scripts/audits/p7x02-impl-verify.raw.txt`：**exit=0**（quality+tickets+locks+lint+
  typecheck+test+build 全绿；原始 stdout 重定向非转述）。
- 基线对账：verify 单测 **156 文件/1421 用例**（基线 155/1398，+1 文件/+23 用例=新
  outbox 测试件，脚本实测 wc/grep 口径）；locks **286**（基线 283，+3=新测试件+新 spec
  +新探针脚本，`locks:check` 在 verify 内过「286 个受锁文件与 manifest 一致」）。
- 行数关卡：新模块 298+87（≤300 票面经拆件达成）；reading-time.ts 303/ReaderPage 248
  （≤500/组件 ≤250 内）；lint max-lines 过。

## 5. e2e

- **spec**：`tests/e2e/reading-time-replay.spec.ts`（守卫=P7X-02 未 done skip——票面指定；
  主控翻状态后 CI 首跑激活）。流程：建库→种子真实 PDF→首轮 launch 后 evaluate 注种
  LS 崩溃残留（pending ob-1=120s+in-flight ob-2=90s，T5 面）→app.close() 强杀→二轮
  启动（main.tsx 闸门 await replayOnStart——导航可见即重放毕）→子进程读活库断言
  reading_seconds=210/last_read_page=1（读库经 better-sqlite3 node-ABI 绑定切换，
  downgradeToV7 同型本地件）。
- **全量 e2e**：`npx playwright test` → **42 passed + 1 skipped（新 spec 守卫）**，
  基线 42 零回归（reader 系/进度系/spec 全绿——invokeOne 改道无行为面破坏实证）。
- **链路探针（实现者实证，两轮）**：`scripts/audits/p7x02-impl-e2e-probe.mjs`（spec
  同流程无守卫复制件）→ row={s:210,p:1} VERDICT PASS exit=0；第二轮在 verify 终构建
  产物上复跑 PASS（`-e2e-probe-run2.raw.txt`）。

## 6. locks 全程实录

1. 新测试件诞生即 `locks:generate`+`apply` → **284**（+1 reading-time-outbox.test.ts）。
2. 受锁件修改前 `locks:unlock` → reading-time.test.ts 等价面+INV-57 注记+探针/spec
   诞生 → `generate`+`apply` → **286**（+spec+探针；期间一次中间 apply 后因测试 import
   拆分再 unlock→edit→apply，最终 286 一致）。
3. verify 内 `locks:check` 过（286 一致）。提交需 [locked-change] 尾注（主控收口）。

## 7. 装配点与 WARN 形态自裁申报

1. **启动装配点=main.tsx**（渲染前 await replayOnStart——非 App.tsx useEffect）：理由=
   e2e 同步点（导航可见=重放毕）+严格「resolve 前新 enqueue 只入队」（App 级挂点会引入
   渲染先行窗）。代价=持久错存量下首帧延迟至 attempts 拦停（~31s 上界，见疑虑①）。
2. **WARN 形态**：死信/退化/损坏条目=toast `error`（强 WARN——设计 §7.5）；死信 50 淘汰=
   toast `info`（证据面有界通知）。onWarn(message, kind) 双级单通道，装配接 toast-store。
3. **共享退避=单闸门语义**：任一 T4 失败后退避窗内**全部**派发暂停（含其他 paper 新
   条目首派发）——CO-2「共享计时器」最简可测实现；单测显式锁定该语义（测试名申报）。
4. **id/seq 铸造点=装配面 setup**（enqueue 签名照抄设计草图——载荷含 id/seq/createdAt，
   生成单源在 setup：seq 自 store 存量 max 续增、id=ob-<seq> 唯一性由 seq 唯一性保证）。
5. **新模块拆两件**（outbox 队列态机 298 行+store 适配器 87 行）：≤300 票面+宪法「第二
   职责拆文件」；接口零增删（草图四成员照抄）。
6. **ReaderPage.tsx 触碰（票面触碰清单外）**：R7 并入要求 sp.dispose 改道在装配面接线
   （scroll-progress.ts 零动=红线保持，ReaderPage 仅 wiring 首参 spProg→spView）。
7. **e2e 首轮「产生 pending」形态**：LS 注种崩溃残留替代「真实阅读→强杀 ack 竞态」——
   竞态形态天然非确定（IPC ack 快于 teardown 则无残留可断言，伪绿风险）；注种条目=
   真实 store 格式，重放链（store 载入→T5→send→真 IPC→真 sqlite）全真；真实 enqueue 链
   由 23 用例单测全锚。探针件补 spec 生而 skip 的实证空窗（两轮 PASS）。
8. **活库定位 liveDbPath**（spec/探针读库）：workspace.service 态② M 迁移后活库=
   `workspaces/default/synapse.db`（迁移前=根）——既有 e2e 种子配方受锁兼容面，读库
   子进程按存在性定位。
9. **T5 lastError 缺省填 'startup-recovery'**（区分崩溃残留与运行期失败证据面）。

## 8. 疑虑（主控裁量项）

1. **持久错存量下首帧延迟 ~31s 上界**（1+2+4+8+16s 退避链→死信→闸门开）：F2 罕见路径
   （本地 better-sqlite3）；若不可接受可改后台重放（闸门语义不变，e2e 同步点改 DB 轮询）。
2. **send 永不 settle（IPC 挂起）=闸门不 resolve→渲染永阻**：现实面本地 IPC 即败即还，
   申报为 F3 歧义窗同族边界（未加超时——加超时引入新定时器语义，超票面）。
3. **e2e spec 生而 skip**：CI 首跑在主控翻 registry 后；链路已由探针两轮实证（同流程
   复制件），残余风险=playwright runner 与探针脚本环境差异（低——同一 electron.playwright
   API 面）。
4. **共享退避单闸门**：多 paper 并发失败时无 per-paper 独立退避——一个 paper 的失败推迟
   其他 paper 新条目首派发至多一个退避窗（≤5min）；若门审认为需 per-paper 化=态空间
   扩展票。
5. **verify 的 e2e 面不在 verify 内**（仓库既定口径 verify 无 e2e）——本票 e2e 证据=
   全量 `npx playwright test`（42+1 skipped）+探针两轮，均在本报告节 5。

## 9. 回炉一轮（主控 C-1/C-2 亲证闭环后三项 W——≤2 内第 1 轮）

落点与红证（受锁流程：spec/探针/测试件 unlock→改→apply 全程实录，最终 locks 286 一致）：

- **W1 渲染先行+后台回放**（`src/renderer/main.tsx`）：createRoot().render 先行、
  `void getReaderOutbox().replayOnStart()` 后台执行（不再 await 阻塞首帧）。B-1
  （send 挂起=白屏无防护）与 B-3（pre-render toast 的 3.5s 自动消失计时从调用点起、
  回放>3.5s 即丢——ToastHost 在 App 子树）结构性消除：回放期 WARN 实时可见、挂起只
  停在后台排空循环（UI 活）。头注声明 replayOnStart 无 reject 面（store 异常=退化
  WARN、send 失败=T4），void 即可——实现面复核无 throw 路径。
- **W2 排空闸门时间语义**（`reading-time-outbox.ts`，300 行仍 ≤300）：gateMaxSeq
  （seq 阈值）→ `replaying` 活跃标志+`oldIds`（回放开始镜像 id 快照）。pump 拦截
  条件=「replaying && 非旧集合」——回放期新 enqueue **不论 seq** 一律只入队不派发；
  排空判据/尾泵同换。修复的必要性=seq 阈值语义依赖「新条目 seq 恒大于存量 max」的
  铸造单调假设（enqueue 载荷 seq 由调用者提供——设计签名如此；铸造种子兜底路径
  loadAll 失败时从 1 重铸，即存在 seq≤存量 max 的新条目形态），非单调载荷会在回放期
  被立即派发=「新条目（页码新）先于旧积压（页码旧）落库」页码回退窗重开。**首红**
  =新单测「排空闸门时间语义：回放期新 enqueue 不论 seq 一律不派发；resolve 后派发」
  （seed 旧 seq=5→回放 send 未决→enqueue 新条目 seq=1→现状 seq 阈值放行=2 次派发
  红断言 toHaveLength(1)）落盘 `p7x02-impl-mutation-4.raw.txt`（exit=1，Tests 1
  failed|23 passed）；修复后 24/24 绿。测试为永久新增（非临时变异，无还原面——
  「cp 备份法还原」按此理解执行并申报）。
- **W3 e2e 同步点切换**（`tests/e2e/reading-time-replay.spec.ts`+探针 .mjs）：「导航
  可见即重放毕」前提随 W1 失效→改**有界 DB 轮询**（pollReadingRow：500ms 间隔×
  20s 上界，读活库行到 {s:210,p:1} 即过，超时抛末值）。**裁决理由（二选一自裁）**：
  DB 轮询而非 evaluate store 清空——最终裁判面=真 sqlite 落账（真 IPC→service→
  repo 提交链直证），与最终断言同源；evaluate store 清空只证 renderer 队列态且需
  在 production 面加观察探针口（超票面）。
- **探针复跑一轮留档**：`scripts/audits/p7x02-impl-e2e-probe-run3.raw.txt`——
  verify3 终构建产物上 PASS（row={s:210,p:1}，exit=0；W1 渲染先行+W3 轮询链路）。
- **verify3**：`scripts/audits/p7x02-impl-verify3.raw.txt` **exit=0**（quality/tickets/
  locks 286 一致/lint/typecheck/test/build 全绿）。
- **回炉后基线数字**（脚本实测口径）：单测 **156 文件/1422 用例**（初轮 1421，
  +1=W2 新单测）；locks **286**（无新增受锁件——改动均在已入锁件内）；e2e spec
  守卫形态不变（P7X-02 未 done skip，主控翻状态后 CI 首跑）。
- 回炉后疑虑更新：初轮疑虑①（~31s 白屏上界）随 W1 消除（后台回放 UI 活）；疑虑②
  （send 挂起=闸门不 resolve）降级为「后台排空循环停驻」（UI 不再受阻，条目留驻
  待下次启动 T5）；W2 后闸门不再依赖 seq 单调（初轮自裁申报④的稳健性缺口闭合）。
