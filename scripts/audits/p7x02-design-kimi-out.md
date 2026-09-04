[routing]: run=20260904160314-435x source=kimi-main model=kimi-k3 switches=0 usage=in=1540,out=5400 latency=102279ms (by ds-call.mjs 链)

# P7X-02 设计书:阅读时长落盘重试/outbox(设计首跳,Kimi K3 拟定)

> 仓库不可达,仅依据票面材料。假设显式标注 **[假设]**。

## 0. 设计判读(先行表态)

- 失败重心在 renderer 侧:F3/F4/F5 均为「invoke 未达或结果未知」,main 侧 outbox 表对此类无能为力;故主案必须是 renderer 持久 outbox。
- 时长的**累加语义**与页码的**last-write-wins 语义**在同一通道、同一缓冲内重放,处理规则不同——这是本设计的核心难点,§6 专节处理。
- INV-57 注记定位 retry/outbox 为 v2 候选:本设计按「可分期」组织,期一只落 renderer outbox,期二(main 侧兜底)仅留接口位。

## 1. 方案对比表

| 案 | F1 | F2 | F3 | F4 | F5 | 复杂度 | 约束冲突面 | 重启恢复语义 | 测试成本 | 风险 |
|---|---|---|---|---|---|---|---|---|---|---|
| A 纯内存重试(进程内 pending+退避) | 覆盖 | 部分(达上限后丢) | 不覆盖 | 不覆盖 | 不覆盖 | 低 | 无 | 无 | 低 | 只解决最轻的一类,等于没解票 |
| B renderer 持久 outbox(localStorage,同步写)+启动重放+内存退避 | 覆盖 | 部分(dead-letter+WARN) | 覆盖 | 部分(仅已入队条目) | 部分(重放,歧义双计有界) | 中 | 需论证约束1/2(§2 论证通过) | 启动时重放 pending/in-flight | 中(状态机+注入 store 可单测) | localStorage 损坏/配额(§7 申报) |
| C main 侧 outbox 表(事务写入+后台重试) | 覆盖 | 覆盖(退避+死信) | 不覆盖 | 不覆盖 | 覆盖(invoke 到达前提下) | 高(DB 迁移+main 新逻辑) | 约束2 可满足(service 内部),但触 DB schema 面 | 进程内+重启后重放 | 高(需 main 集成测试) | 不覆盖 renderer 侧三主类,性价比倒置 |
| D 收尾同步化(before-quit 阻塞 flush) | 不覆盖 | 不覆盖 | 部分(Electron 退出窗不可靠等待 async IPC) | 不覆盖 | 不覆盖 | 低 | 无 | 无 | 低 | [假设] will-quit 延迟窗口内 renderer 可能已拆,语义脆弱 |
| E B+C 复合 | 全覆盖(除 F4 未入队段) | 覆盖 | 覆盖 | 部分 | 覆盖 | 高 | 同 B+C | 双侧重放需去重协议 | 高 | 期二候选,非本期 |

## 2. 推荐案:B(renderer 持久 outbox)+ 分期论证

**选 B**:
- 唯一同时命中 F1/F3/F5、并部分命中 F4/F2 的单期方案;F3(正常退出)恰好是最高频形态。
- **约束1(禁双账本)**:outbox 条目只在 flusher 已决意落库时生成,是「已切出的账」的传输缓冲;ledger 的累积、切分(chunkSeconds)、收尾决策全部留在 reading-time.ts,outbox 永不回写 ledger。通过。
- **约束2(单通道)**:发送函数签名即 `deps.saveProgress` 原样注入,outbox 不产生新 IPC;存储面用 localStorage(renderer 原生同步 API),不经主进程、不触 DB。通过。
- **约束3**:不动 schemas.ts(payload 仍是 {paperId,page,secondsDelta})、不动 repo SQL、chunk≤3600 由既有 chunkSeconds 保证。零受锁面触碰。
- **不选 A**:F3~F5 全空,不解票。**不选 C**:覆盖不到 renderer 侧三类主失败,且引入 DB 迁移;留作期二(§7)。**不选 D**:Electron 退出窗对 async IPC 无可靠阻塞语义,属伪覆盖。**不选 E**:双侧重放需跨进程去重协议(无幂等键前提下不可干净实现),本期不做。

## 3. 态空间(outbox 条目状态机)

条目:`{id, paperId, page?, seconds, seq, attempts, state, createdAt, lastError?}`

| # | 迁移 | 触发 | 断言 |
|---|---|---|---|
| T1 | ∅→pending | flusher/onFlush 决意发送 | 约束1:仅 flusher 产条目;seconds≤3600;**先同步落 store,后 dispatch**(写前日志序) |
| T2 | pending→in-flight | 派发(严格按 paperId 内 seq 升序) | 同 paper 同时刻至多一条 in-flight(顺序性根源) |
| T3 | in-flight→done | saveProgress resolve(ack) | 立即从 store 移除,无 tombstone;ledger 无任何联动 |
| T4 | in-flight→pending | saveProgress reject 或同步抛错 | attempts++;lastError 记录;进入退避(指数,上界如 5min) |
| T5 | in-flight→pending | **启动恢复**:发现驻留 in-flight | 歧义态:发送结果未知,按「未达」处理→重放;时长双计风险见 §6,页码安全见 §6 |
| T6 | pending→dead-letter | attempts≥N(建议 N=5) | 保留于 store(不静默丢),触发 onWarn(承接 INV-57 门二 WARN 要求);不再自动派发 |
| T7 | dead-letter→pending | 下次启动时一次性再试一轮(可选,建议做) | 仍受 N 上限;再死则留驻+WARN |

不变量:①任一时刻 store 中条目均可序列化复原(同步写);②单 paper 派发顺序=seq;③outbox 不持有任何「未切分」的时长——时长真相仍在 ledger(约束1)。

## 4. 接口草图(TS 签名级,非实现)

```ts
// 新文件:reading-time-outbox.ts(存储面+状态机,纯 TS 可单测)
type OutboxEntry = { id: string; paperId: string; page?: number;
  seconds: number; seq: number; attempts: number;
  state: 'pending'|'in-flight'|'dead-letter';
  createdAt: number; lastError?: string }
interface OutboxStore {              // localStorage 适配,全部同步
  loadAll(): OutboxEntry[]; put(e: OutboxEntry): void;
  update(e: OutboxEntry): void; remove(id: string): void }
interface ReadingTimeOutbox {
  enqueue(e: Omit<OutboxEntry,'state'|'attempts'>): void  // T1
  pump(): void                        // 驱动 T2;内部退避调度
  replayOnStart(): Promise<void>      // T5+T7+按序排空,**resolve 前闸门不开**
  dispose(): void }                   // 停泵,不丢已持久条目

// 装配面(触碰既有文件):
// reading-time.ts:复合 flusher 的 invokeOne 由「直发+吞错」改为
//   outbox.enqueue({paperId,page,seconds:chunk,seq:nextSeq(paperId)})
//   发送依赖仍为 deps.saveProgress(注入给 outbox,签名不变)
// reading-time-setup.ts:onFlush 卸载兜底改走同一 outbox.enqueue
//   (localStorage 同步写,卸载期安全;原 fire-and-forget invoke 由泵接管)
// 启动钩子[假设=renderer 入口存在装配点]:await outbox.replayOnStart()
//   完成前,ledger flusher 的新 enqueue 只入队不派发(排空闸门,§6)
```

触碰文件清单:`reading-time.ts`(flusher 改写)、`reading-time-setup.ts`(onFlush 改道)、新增 `reading-time-outbox.ts`、renderer 启动装配点 1 处、WARN 上报接线 1 处。**受锁面触碰:零**(schemas.ts/repo SQL/IPC 契约均不动)。

## 5. 失败模式表(态×类)

| | F1 瞬时错 | F2 持久错 | F3 退出期 in-flight | F4 renderer crash | F5 main crash |
|---|---|---|---|---|---|
| pending(未派发) | 不适用 | 不适用 | 随进程停,条目已在 store→下次启动 T5 重放 | 同左(已入队部分存活) | 同左 |
| in-flight | reject→T4 退避重试,恢复路径=泵 | 反复 T4→T6 dead-letter+WARN,人工/期二恢复 | 进程死,ack 永不到→启动 T5 按「未达」重放(**时长歧义双计,有界≤3600s/条**) | 同 F3 | 同 F3(invoke 排队中丢失=结果未知) |
| dead-letter | 不适用 | 留驻+WARN,T7 每启动一轮再试 | 不受影响 | 不受影响 | 不受影响 |

F4 中「tick 粒度内未 flush 的内存账」(≤15s/tab+尾账)任何 outbox 均不可恢复——真相在内存,见 §7 申报。

## 6. 页码重放语义(约束4 专节)

同一队列里两类载荷语义相反,显式规则如下:

1. **时长(累加)**:重放即再加。reject 后重放安全(确知未落);T5 歧义重放存在「实际已落+重放再加」的双计窗,上界=单 chunk≤3600s,且仅发生在 crash/强杀场景。**本期接受该有界过计**,申报于 §7;彻底消除需幂等键(chunkId)进 payload=schemas 受锁面改动,列为期二 [locked-change] 候选。
2. **页码(last-write-wins)**:重放旧页码会回退 `last_read_page`。防线=**顺序性**:
   - 单 paper 内 seq 单调、严格升序派发(T2 断言),新写永远排在旧条目之后;
   - 启动时 `replayOnStart` 排空闸门关闭前,新 flusher 产出只入队(seq 续增)不派发;
   - 由此任一 paper 的落库页码序列单调于产生顺序,重放不构成回退。
   - 跨重启:旧条目 seq<新条目 seq,闸门保证先旧后新。成立。
3. **页码+时长同条目**(saveProgress 复合载荷):一并受上述两条规则约束;页码规则靠顺序、时长规则靠「确知失败才重放+歧义有界」。

## 7. 边界申报(诚实清单)

1. **F4 tick 粒度内损失不可恢复**:≤15s/tab 在账+未收尾尾账,crash/强杀即丢。本期不修;若不可接受,候选=缩短 tick 或 ledger 定期 checkpoint 到 localStorage——但 checkpoint 会使 outbox 逼近「第二计时真相源」,触碰约束1 红线,需主控裁决,本期不做。
2. **F2 持久性 DB 错**:仅做到 dead-letter+WARN 不静默丢,无自动恢复;main 侧重试(方案C)为期二。
3. **T5 歧义双计**:有界(≤3600s/条,仅 crash 形态),接受;幂等键方案属 schemas [locked-change],期二评估。
4. **R7 卸载双 invoke**:**建议顺带收编**——进度侧 dispose 的页码落库改经同一 outbox 入队(seconds=0 合法,schemas 下界含 0),单队列 seq 序使「页码两来源」从并发不确定变为确定顺序,理论回退窗闭合。标注:可独立拆分为子票,不阻塞本期。
5. **localStorage 风险**[假设:渲染进程 origin 的 localStorage 可用且未被禁用]:同步写适配卸载期;损坏/超配额时 outbox 退化为方案A(内存重试)+WARN,不阻断阅读。
6. **[假设] 单窗口单实例**:多窗口并发时 seq 需按 paperId 分命名空间且跨窗协调,超本期;若实际多窗,此设计需复议。
7. **[假设] saveProgress 的 promise resolve=DB 已提交**(service 同步 better-sqlite3,通常成立);若存在 fire-and-forget 层,ack 语义需核实。

——设计首跳完。请 deepseek 对抗审核重点:§6 顺序性论证是否有反例、T5 双计界是否真闭、约束1「outbox 不回写 ledger」在 replayOnStart 闸门期的实际表现。