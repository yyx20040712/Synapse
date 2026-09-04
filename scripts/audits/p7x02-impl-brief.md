# P7X-02 实现票简报——阅读时长落盘 outbox（终裁版设计书全量落地）

> 主控=GLM-5.3；实现者=子代理（**GLM5.3flash 定档申报**,环境统一档欠账披露）。
> 票：P7X-02（registry——设计链三跳毕注记在条目内）。**设计书=完整任务书**：
> docs/design/2026-09-04_p7x02-reading-time-outbox.md（终裁版——态空间 §3/
> 接口草图 §4/失败模式 §5/页码重放 §6/边界申报 §7 逐节照办;设计链过程件
> scripts/audits/p7x02-design-*.md 为背景可读非规约源）。

## ① 身份与禁令

禁 git add/commit/push；禁翻 tickets/registry；禁改设计书/交接书/ADR。卡点=
BLOCKED 停手不自裁。受锁触碰件=**docs/invariants.md（INV-57 注记面更新）+新测试
件诞生（locks:generate+apply 即时）**——改前 unlock 改毕 apply,条目数 283 起
（新测试件入锁后递增,报告精确数）。

## ② 必读序

1. `AGENTS.md`（宪法——状态机前置/TDD/受锁/Rule of Three）。
2. `docs/design/2026-09-04_p7x02-reading-time-outbox.md` **全文**（态空间表+
   不变量四条+接口草图=实现蓝本,照抄不改语义）。
3. `src/renderer/features/reader/reading-time.ts`（ledger/复合 flusher/
   chunkSeconds——invokeOne 为改写点;与 scroll-progress 互不 import 红线）。
4. `src/renderer/features/reader/reading-time-setup.ts`（onFlush 兜底+复合
   装配——改道点）。
5. `src/renderer/features/reader/scroll-progress.ts`（ProgressAccountView 结构
   类型+sp.dispose 消费面——R7 并入的页码来源;**禁 import 它**——结构类型同型）。
6. `src/renderer/main.tsx`+`src/renderer/app/App.tsx`（启动装配点选址——闸门
   await replayOnStart 挂点自裁申报）。
7. `tests/unit/renderer/reading-time.test.ts`（R1~R10 态空间+注入模式——新
   测试同型;收尾口改道的回归面）。
8. `docs/invariants.md` INV-57 行（注记面「分片级失败=部分静默丢失」句待更新
   ——受锁）。
9. `scripts/audits/p7x02-ls-probe.mjs`（localStorage 实证配方——e2e 双 launch
   参考,禁改）。

## ③ 主控裁决（实现者不再自裁）

1. **新模块 reading-time-outbox.ts**（renderer/features/reader/,≤300 行）:
   纯 TS 可单测——时间/定时器/store 全注入（reading-time.ts 同法禁真 timer）;
   态空间 T1~T6+排空闸门+队头阻塞+attempts 拦停（N=5）+死信留驻上限 50 逐老
   淘汰+dispose 不变量（§3 表逐格落;§4 接口签名照抄）。
2. **OutboxStore=localStorage 适配器**（每条目独立 key+元信息 key,CO-1——禁
   整表 JSON 重写）;注入形态（单测 mock localStorage;装配工厂真 window.
   localStorage——实证在档 file:// 可写+持久）。
3. **泵=受限并发**（CO-2）:每 paper 仅队头 in-flight,跨 paper 并行,共享退避
   计时器（指数,上界 5min）;T4 队头保持不越序。
4. **reading-time.ts invokeOne 改写**:直发+吞错→outbox.enqueue（发送依赖=
   deps.saveProgress 原签名注入 outbox——**单通道不变,零新 IPC**）;chunkSeconds
   单源不动。
5. **reading-time-setup.ts**:onFlush 卸载兜底改道 enqueue;**sp.dispose 页码
   落库改道 enqueue（R7 并入——seconds=0 合法载荷,页码旁路消除）**;装配点
   await outbox.replayOnStart()（闸门——resolve 前新 enqueue 只入队不派发）。
6. **WARN 接线**:死信/退化（localStorage 异常）→既有 toast 单源（toast-store
   info/error 形态自察）——禁新通道。
7. **INV-57 注记更新**（受锁 unlock→apply）:注记面「分片级失败=部分静默丢失
   （尽力而为吞错=scroll-progress 同规约,重试/outbox=v2 候选——门二 WARN）」
   →「分片级失败=outbox 兜底（at-least-once,重复界 N×3600s/条——T5 计 attempts
   拦停;P7X-02 落地）;localStorage 退化面=内存重试+强 WARN 申报」——**只改注记
   句,①~④ 锚条款零动**;R7 双 invoke 注记句同步更新（已并入单队列）。
8. **测试面**:新 reading-time-outbox.test.ts（T1~T6 逐格+闸门+队头阻塞越序
   拒绝+attempts≥N 死信+死信 50 上限+dispose 后回调仍更新+store 适配器
   mock——**always-active 不经 guardedDescribe**）;reading-time.test 回归绿
   （收尾口改道等价面——若断言 invoke 直发形态则按新语义更新=受锁流程,申报）;
   e2e=新 reading-time-replay.spec.ts（SYNAPSE_USER_DATA 双 launch:首轮阅读
   产生 pending→强杀（app.close() 模拟 ack 未达）→二轮启动重放落库断言——
   p7x02-ls-probe 配方; guardedDescribe 守卫=P7X-02 未 done skip）。
9. **变异红证 ≥3**:①删队头阻塞（放行越序）→顺序断言红;②删 T5 attempts++→
   拦停断言红;③enqueue 改回直发（旁路）→闸门/e2e 重放红。cp 备份法（禁 git
   checkout）。

## ④ 纪律

TDD 先红（新测试对现状红）→绿→变异红证;首红/变异原始输出各自落盘
`scripts/audits/p7x02-impl-first-red.raw.txt`/`-mutation-{1,2,3}.raw.txt`;
`npm run verify` 真退出码落盘 `p7x02-impl-verify.raw.txt`;多断言禁与行尾注释
同置;禁新依赖;≤500 行（新模块 ≤300）;UTF-8;e2e 新 spec 诞生即 locks;自裁
申报一切票面外决定。

## ⑤ 基线数字（自检参照）

verify=155 文件/**1398 用例**/locks **283**/e2e 42（+replay spec 后递增——
报告精确数）;新模块测试预估 +25~40 用例。

## ⑥ 报告契约

全文落 `scripts/audits/p7x02-impl.report.md`:实现摘要/文件清单/红证引证/
verify 真退出码/locks 实录（unlock/apply 全程+条目数变化）/装配点与 WARN
形态自裁申报/疑虑。回复五行内。
