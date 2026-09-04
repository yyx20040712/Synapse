# P7X-02 终裁版设计书——阅读时长落盘 outbox（renderer 持久队列）

> 设计链三跳（第四次 Ruling 位）：Kimi K3 拟定（p7x02-design-kimi-out.md,10.6KB
> 包入窗 102s/switches=0）→deepseek v4flash 对抗审核（ENDORSE_WITH_CHANGES——
> 4CR+4CO,p7x02-design-ds-out.md）→**GLM5.3 主控终裁（本文）**。
> 假设④实证：p7x02-ls-probe.mjs 双 launch——file:// origin localStorage 可写
> 且跨重启持久（firstRun writable/readback ✓+afterRestart persisted ✓,exit=0）。

## 0. 终裁判读

- 失败重心在 renderer（F3/F4/F5=invoke 未达或结果未知）——主案=renderer 持久
  outbox（Kimi 判读维持;main 侧表覆盖不到三类主失败,期二）。
- 时长累加语义×页码 last-write-wins 语义同队列重放=核心难点（§6）。
- **投递语义=at-least-once,诚实申报**（CR-2 裁决:删「双计≤3600s/条有界」伪界
  表述;真实界=attempts 上限 N×3600s/条[T5 计数后闭合]+仅歧义窗场景）。

## 1. 方案对比（Kimi §1 表维持——A 纯内存/C main 侧表/D 退出阻塞/E 复合均不选,
论据在档 p7x02-design-kimi-out.md §1/§2）

**B 案当选**:renderer localStorage 持久 outbox+启动重放+内存退避。
约束 1/2/3 论证维持（outbox=已切出账的传输缓冲,永不回写 ledger;发送口=
注入的 deps.saveProgress 原签名;零受锁面——schemas/repo SQL/IPC 契约不动）。

## 2. 终裁修正（deepseek 4CR+4CO 处置）

| # | 处置 | 落点 |
| --- | --- | --- |
| CR-1 | **接受**——态空间改 per-paper **有序队列+队头阻塞**（head-of-line）:单 paper 至多一条 in-flight 且必为最小 seq 未决条目;旧条目未终态（done/dead-letter）不得派发新 seq。**T7 自动复活取消**（dead-letter 留驻+WARN 不再自动重放——复活重放 page 即回退反例成立;手动修复路径=期二候选） | §3 |
| CR-2 | **接受 at-least-once 方向**——T5 重放**计入 attempts++**（崩溃循环被 N 上限拦停→重复加计真实界=N×chunk≤N×3600s/条）;「歧义仅 crash」表述修正=F3 正常退出 ack 未达同触发;幂等键（schemas 改动）=期二 [locked-change] 候选 | §3/§6 |
| CR-3 | **接受——R7 并入本期**:sp.dispose 进度页码落库改经同一 outbox.enqueue（seconds=0 合法载荷）——单队列 seq 序使「页码两来源」回退窗闭合;§6 页码安全声明以本并入为前提（不再挂「子票不阻塞」） | §4/§6 |
| CR-4 | **已实证 PASS**（主控探针双 launch:file:// 可写+跨重启持久;localStorage 同步写语义=写返回即落盘,crash-after-write 不丢）。损坏/配额退化路径维持（退化为内存重试+强 WARN=F3/F5 失效面诚实申报） | §7 |
| CO-1 | **采纳**——OutboxStore=**每条目独立 key**+元信息 key（禁整表 JSON 重写）;dead-letter 留驻上限 **50 条**（超限逐最老淘汰+WARN——证据面有界,pending 为暂态实践上排空） | §4 |
| CO-2 | **采纳**——泵=受限并发:每 paper 仅队头可 in-flight,跨 paper 并行;单调度扫描+共享退避计时器（无 per-entry 独立 timer——态空间可测） | §4 |
| CO-3 | **采纳**——dispose 不变量显式化:dispose 停扫描不停已发 invoke 回调（进程未死→回调照常更新 store;进程死→T5 接管）;T2 恒先持久化 in-flight 态再发 invoke | §3 |
| CO-4 | **采纳**——F4 损失界申报改「≤(开卷 tab 数)×15s+各尾账」（非固定 15s）;checkpoint 方案维持不做（触约束 1 红线,需另裁） | §7 |

## 3. 态空间（终裁版 v2——条目 `{id,paperId,page?,seconds,seq,attempts,state,createdAt,lastError?}`）

| # | 迁移 | 触发 | 断言 |
| --- | --- | --- | --- |
| T1 | ∅→pending | flusher/onFlush/sp.dispose 决意发送（R7 并入） | 仅三收尾口产条目;seconds≤3600（chunkSeconds 单源）;先同步落 store 后入调度（写前日志序） |
| T2 | pending→in-flight | 泵取 **per-paper 队头**（最小 seq 未决条目） | **先持久化 in-flight 态再发 invoke**（CO-3）;同 paper 至多一条 in-flight 且为队头（CR-1 队头阻塞） |
| T3 | in-flight→done | saveProgress resolve | 立即 remove（无 tombstone）;ledger 零联动 |
| T4 | in-flight→pending | reject/同步抛错 | attempts++;退避（指数,上界 5min,共享计时器）;**队头保持**——新 seq 不得越序 |
| T5 | in-flight→pending | 启动恢复发现驻留 in-flight | **attempts++**（CR-2:崩溃循环受 N 拦停）;按未达重放;attempts≥N→T6 |
| T6 | pending→dead-letter | attempts≥N（N=5） | 留驻+onWarn（INV-57 门二 WARN 兑现）;**不自动重放**（T7 已取消）;留驻上限 50 条逐老淘汰 |
| — | 排空闸门 | replayOnStart resolve 前 | 新 enqueue 只入队不派发（seq 续增）——页码顺序性前提（§6） |

不变量:①store 任一时刻可序列化复原（同步写,每条目独立 key）;②单 paper 派发序=seq 严格升序（队头阻塞保证）;③outbox 永不回写 ledger（约束 1）;④dispose 后已发 invoke 回调仍可更新 store（进程未死）/进程死由 T5 接管（CO-3）。

## 4. 接口草图（v2）

```ts
// 新文件:reading-time-outbox.ts(纯 TS 可单测,时间/定时器注入)
type OutboxEntry = { id: string; paperId: string; page?: number; seconds: number;
  seq: number; attempts: number; state: 'pending'|'in-flight'|'dead-letter';
  createdAt: number; lastError?: string }
interface OutboxStore {              // localStorage 适配:每条目独立 key+元信息 key
  loadAll(): OutboxEntry[]; put(e: OutboxEntry): void;
  update(e: OutboxEntry): void; remove(id: string): void }
interface ReadingTimeOutbox {
  enqueue(e: Omit<OutboxEntry,'state'|'attempts'>): void   // T1
  pump(): void                        // T2 驱动:per-paper 队头,跨 paper 并行,共享退避
  replayOnStart(): Promise<void>      // T5+按序排空;resolve 前闸门不开
  dispose(): void }                   // 停扫描不停已发回调(CO-3)
```

装配面:reading-time.ts invokeOne 改 enqueue（发送依赖=注入的 deps.saveProgress,
签名不变）;reading-time-setup.ts onFlush 改道 enqueue+**sp.dispose 页码落库改道
enqueue（CR-3/R7 并入,seconds=0 载荷）**;renderer 启动装配点 await replayOnStart()
（闸门）;onWarn 接线（toast/日志单源）。
触碰文件:reading-time.ts/reading-time-setup.ts/新 reading-time-outbox.ts/启动
装配 1 处/WARN 接线 1 处。**受锁面预估:零**（schemas/repo/IPC 零动;新测试件
诞生即 locks）。

## 5. 失败模式表（v2）

| | F1 瞬时 | F2 持久 | F3 退出 in-flight | F4 crash | F5 main crash |
| --- | --- | --- | --- | --- | --- |
| pending | 随进程停→重启重放 | 同左 | 同左 | 同左（已入队存活） | 同左 |
| in-flight | T4 退避队头保持 | 反复 T4→T6 死信+WARN | ack 未达→T5 重放+attempts++（重复加计界=N×3600s/条,at-least-once 申报） | 同 F3 | 同 F3 |
| dead-letter | — | 留驻≤50+WARN,期二/人工 | — | — | — |

F4 内存段（tab×15s+尾账）不可恢复——§7 申报维持。

## 6. 页码重放语义（v2——CR-1/CR-3 闭环版）

1. **时长（累加）**:at-least-once——确知失败重放安全;歧义窗（ack 未达）重放
   可能重复加计,界=N×3600s/条（T5 attempts 拦停崩溃循环）;幂等键=期二。
2. **页码（last-write-wins）**:顺序性=per-paper seq 严格升序+队头阻塞（T4 不
   越序）+排空闸门（旧条目先于新 flush 产出）+**R7 并入**（进度 dispose 同队
   列——无旁路直发,反例源消除）+T7 取消（死信不自动复活重放 page）。四条件
   合成:重放不构成 last_read_page 回退。
3. 复合载荷（page+seconds 同条目）:同受上两条;page 缺席条目（纯时长 chunk）
   只受规则 1。

## 7. 边界申报（v2）

1. F4 tick 粒度内损失:≤(开卷 tab 数)×15s+各尾账,不可恢复;checkpoint=另裁
   候选（触约束 1,本票不做）。
2. F2 持久错:死信+WARN 不静默丢;自动恢复=期二（main 侧/幂等键）。
3. 歧义重复加计:at-least-once,N×3600s/条界;幂等键 [locked-change]=期二。
4. R7 已并入（CR-3）;卸载双 invoke 注记面将随实现收口更新 INV-57 注记。
5. localStorage:实证 PASS（双 launch 探针在档）;损坏/配额→退化内存重试+强
   WARN（F3/F5 失效面诚实申报）。
6. 单窗口单实例（repo 负面清单 B3:OS 级多窗口禁——假设成立不需复议）。
7. saveProgress resolve=DB 已提交（service 同步 better-sqlite3——源码可证,
   reader.service.ts:84 直调 repo）。

## 8. 测试面预估（实现票面展开）

reading-time-outbox.test（态空间 T1~T6+闸门+队头阻塞+attempts 拦停+dispose
不变量+store 适配[注入 localStorage mock]——时间/定时器注入）;reading-time.test
回归（收尾口改道的等价面）;e2e 候选（重启重放链——SYNAPSE_USER_DATA 双 launch
配方在档 p7x02-ls-probe.mjs）;INV-57 注记更新（分片级失败句改「outbox 兜底
已落地」）。

## 9. 分期

期一=本设计全量（含 R7 并入）;期二候选=幂等键（schemas [locked-change]）+
main 侧兜底（F2 自动恢复）+F4 checkpoint（另裁）。
