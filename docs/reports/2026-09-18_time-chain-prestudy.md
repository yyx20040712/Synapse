# [F-TIME-01] reading-time 链瘦身评估（产出呈裁，不实施）

> 评估票（裁决 6 域归位战役群四项之四；骨架=2026-09-18 立案，评估执行
> =2026-09-19 b24）。全部行数=wc -l 机器实测（落笔前实测口径）；裁决与
> 排程序=docs/design/2026-09-18_complexity-governance-ruling.md 裁决 6
> /§3 梯队四 F-TIME-01 行。**本报告只评估呈裁，零代码变更。**

## §0 结论速览

reading-time 链实现面 829 行（time/ 四件）+关联显示面 13 行，服务
「页码+秒数」两字段（`papers.updateReadPage(id, page, secondsDelta)`，
papers.repo.ts:201-204 原子累加）；配套测试面 1,202 行（七件）。复杂度
重心=**P7X-02 持久 outbox（387 行=T1~T6 态机 300+localStorage 适配 87），
且它同时承载页码进度账本**（三收尾口单入队点 enqueueReaderProgress，
reading-time-setup.ts:84）——拆除牵连页码链，非纯时长票。

四个降档选项（§4 详）：**主推荐=选项 2a（全拆 outbox 回 P7X-02 前直发
形态，净删约 −1,072 行）**；激进选项 3（tick 即发连 ledger 一并极简）收益
更大但有独立计时实现复杂点；保守选项 1（只拆持久层）治标。选项 0=维持
现状。**呈用户裁决（§5），裁决前零实施。**

> 口径对照（票面骨架原估 vs 本报告实测）：票面/裁决书「约 1,100 行」=
> 战役群一体估算口径（time/ 四件 829+相邻页码账本 scroll-progress 367
> =1,196）；纯时长链实测=829（time/）+13（显示件）。本报告以实测口径
> 分列，呈裁数字不再用约数合计。

## §1 全链盘点（wc 实测）

### 1.1 实现面（renderer time/ 四件+关联件）

| 件 | 行数 | 职责（头注自述） |
| --- | --- | --- |
| reader/time/reading-time.ts | 303 | 时长账本 ledger+计时门（ready×visible）+态机（零头结转 R4）+复合 flusher+useReadingTimeWiring 装配效应+formatReadingTime re-export（:61） |
| reader/time/reading-time-outbox.ts | 300 | T1~T6 持久 outbox 态机（at-least-once/指数退避共享计时器/dead-letter N=5/留驻上界 50） |
| reader/time/reading-time-setup.ts | 139 | ReaderPage 组合根装配 hook（outbox 单例+真 localStorage/timer/saveProgress 发送依赖/toast WARN）+enqueueReaderProgress 入队口（:84） |
| reader/time/reading-time-outbox-store.ts | 87 | localStorage 适配器（每条目独立 key+损坏自清） |
| **小计 time/** | **829** | |
| renderer/shared/reading-time-format.ts | 13 | 显示纯函数（「N 分钟/N 小时 M 分」） |
| reader/view/scroll-progress.ts | 367 | 页码进度账本（**共用 outbox 通道的相邻账本**——sp.dispose 尾账经 enqueue :128-131） |

### 1.2 main 侧写链（轻，非瘦身对象）

papers.repo.ts:99/:201-204（updateReadPage 三参原子累加）+reader.service.ts
:75-77 透传+schemas.ts:64（secondsDelta int 0..3600 optional）+migrations/
008_reading_time.sql——合计约 20 行，结构健康（INV-57 ①②锚定面）。

### 1.3 测试面（1,202 行七件）

| 件 | 行数 | 锚定内容 |
| --- | --- | --- |
| tests/unit/renderer/reading-time.test.ts | 287 | R1~R7+R10 态空间+跨格序列（INV-57 主锚） |
| tests/unit/renderer/reading-time-outbox.test.ts | 496 | T1~T6 逐格+CO/CR 不变量 |
| tests/e2e/reading-time-replay.spec.ts | 149 | T5 崩溃回放 e2e |
| tests/e2e/reader-reading-time.spec.ts | 96 | 存量库升级链+「阅读 0 分钟」显示面 |
| tests/unit/services/reader-time.test.ts | 61 | service 透传 |
| tests/unit/db/papers-reading-time.test.ts | 69 | 累加原子+R8 缺省 |
| tests/unit/db/migrate-reading-time.test.ts | 44 | R9 user_version=8 |

### 1.4 消费面

ReaderPage.tsx:55-56（useReaderReadingTime+useReadingTimeWiring 两 hook）
+PaperDetailPanel.tsx:39/:163（formatReadingTime 显示——从 shared 直取）。
**src 生产面对 reading-time.ts:61 re-export 零消费；但受锁测试
tests/unit/renderer/reading-time.test.ts:5-9 经该 re-export 消费
（门二 P1-1 实证）——删行=携 tests 面改动（[locked-change]
[test-refactor] 面），非零风险，登记 §3-E。**

## §2 复杂度成因（三层堆叠史）

1. **P7E-05（2026-09-03）**：时长账本 ledger+计时门+分片上界——需求本体
   （可见性感知+零头结转+原子累加），303 行中约七成是这层的态空间与防丢账。
2. **P7X-02（2026-09-04）**：invokeOne 直发吞错→**持久 outbox**（T1~T6
   at-least-once）——设计动因=崩溃/失败可恢复；**同时把页码进度旁路并入**
   （R7 卸载双 invoke 消除，页码两来源回退窗——seconds=0 合法载荷）。
3. **拆件配套**（宪法 ≤500/≤300 行）：outbox 拆出 store 适配器；setup 从
   reading-time 拆出（顶层 import api 毒化 node 纯测+组件 ≤250 配套）。

**通道性质错配（评估核心发现）**：at-least-once 持久队列是为**不可靠
通道**设计的形态；saveProgress 实际=本地 IPC invoke+主进程同步 SQLite 写
（better-sqlite3 同步单连接）——非网络调用，真实失败模式仅 main 崩溃/
卸载竞态，窗口=enqueue→ack 毫秒级。**且 ledger 本身驻内存**：tab 久开
不 flush 时账目在 ledger 积累（分片 3600s 上界内），renderer crash 全丢
——outbox 救不了这段（未 enqueue）。outbox 实际保护的账目窗口远小于
其 387 行实现+645 行测试的维护面。无生产数据可量化（负面清单=遥测
不做）——损失面判断是架构推断，如实申报。

## §3 存废与合并候选（逐模块）

| # | 模块/面 | 存废判定 | 依据 |
| --- | --- | --- | --- |
| A | T1~T6 outbox 态机（300） | **降档主候选**——全拆（选项 2）或仅内存化（选项 1） | §2 通道错配；本地通道 at-least-once 收益≈毫秒窗 |
| B | localStorage 适配器（87） | **拆除候选**（随 A） | 崩溃持久化价值=A 同证；损坏自清逻辑随之消失 |
| C | setup 装配（139） | 保留（若 A 拆则收缩） | 组合根职责正当（api 毒化隔离）；A 拆后约 −40 行 |
| D | ledger/计时门/零头结转（reading-time.ts 主体） | 选项 2a/2b 保留；选项 3 连带极简 | 需求本体（INV-57 ②③锚）；选项 3 见 §4 风险点 |
| E | reading-time.ts:61 re-export | **微删候选但非零风险**（删=tests 面改动 [locked-change][test-refactor]） | src 生产面零消费；受锁测试 reading-time.test.ts:5-9 经 re-export 消费（门二 P1-1 实证勘正——初版「零风险」表述失实） |
| F | 分片上界 chunkSeconds（3600）+三消费点 | 选项 3 随拆（tick 即发天然 15s/笔）；选项 2 保留 | INV-57 ④；选项 2 直发仍需防大笔 |
| G | e2e replay spec（149）+outbox.test（496） | 随 A/B 拆除删；INV-57 注记面同步修订 | 锚定对象消失 |

## §4 降档方案（损失面/收益/牵连面）

### 选项 0：维持现状
零风险零成本；829+1,202 行维护面与「两字段」需求失衡持续（裁决书立项
动因未消）。适用=用户判断 outbox 崩溃保护价值>复杂度成本。

### 选项 1：只拆持久层（store+replayOnStart）
实现 −87 行+outbox 态机内 replay 段；e2e replay 删（−149）。内存队列+
退避+dead-letter 保留。损失面=崩溃时**已 enqueue 未派发**账（毫秒窗）。
**治标**：300 行态机主体仍在，「两字段」失衡主体未动。

### 选项 2：全拆 outbox，回 P7X-02 前直发形态（主推荐）
- **净删**：实现 −427（outbox 300+store 87+setup 收缩约 40）；测试
  −645（outbox.test 496+replay e2e 149）；合计 **−1,072 行**（成分透明：
  427+645）。
- **两子档**：
  - **2a（推荐）**：完全恢复 P7X-02 前既有形态——invokeOne 直发+失败
    吞错强 WARN（零新增逻辑，纯删票成立）；损失面=直发失败即丢该笔
    （≤3600s 分片账，本地通道几乎不触发）。
  - **2b（加码可选）**：直发+轻量内存重试（短退避约 +20 行）——引入
    新增小逻辑，「纯删」声明不再严格成立，列此供对照。
- **页码链牵连（必须同批）**：三收尾口回改直发——①复合 flusher
  invokeOne（setup:120 enqueue 面）②onFlush 卸载兜底（setup:112）
  ③sp.dispose 页码尾账排干（setup:128-131）；scroll-progress 367 行
  本体不动，装配面约 ±30 行；「页码两来源回退窗」（P7X-02 消除的那
  个窗）重新出现于卸载竞态毫秒窗——损失面同 A。
- **INV-57 修订面**（[locked-change]）：注记面「④分片三消费点」改两
  消费点；T5/outbox 兜底句删；①②③主锚零触碰（ledger/原子累加/计时门
  保留）。R1~R7+R10 态空间测试保留（reading-time.test 287 行零改）。

### 选项 3：tick 即发极简（加码档）
每 tick（15s）可见即直发 +15s 增量，ledger/零头结转/分片全拆——
reading-time.ts 收敛约 150 行；实现净删约 −600（成分：outbox+store 387
+reading-time 303→150 收敛 −153+setup 收缩约 −60），测试 −645 同选项 2
（另 reading-time.test 287 行大改）。
- **损失面反而更小**：crash 损失≤1 tick（15s）——**优于现状**（现状
  ledger crash 丢整段未 flush 账）。
- **实现复杂点（如实申报）**：页码通道按防抖触发，纯阅读不翻页时页码
  面不触发——秒数增量需独立 15s 计或搭车改造，否则停页久读丢账；关
  tab 尾账仍需一次性 flush 尾笔（零头秒数）。**此项=选项 3 的真实设计
  面，非纯删票**，需 mini 设计链。
- INV-57 全面修订（②唯一宿主句/④分片句/R 系列态空间重定义——受锁
  测试 reading-time.test 大改=[locked-change][test-refactor] 双尾注）。

## §5 呈裁（Rulings 待用户）

| 裁项 | 选项 | 主控推荐 |
| --- | --- | --- |
| T1 降档档位 | 0 维持 / 1 拆持久层 / 2a 全拆 outbox（回 P7X-02 前直发+吞错 WARN，零新增）/ 2b 全拆+内存重试 / **3 tick 即发极简** | **2a**（收益/风险比最优：−1,072 行纯删票、恢复既有历史形态零新逻辑、INV-57 主锚零触碰）；若接受 mini 设计链成本则 3 收益更彻底 |
| T2 实施排期 | 随下波 / 单独小票 / 并入 F-SENSOR-01 波 | 随下波小票组（裁决 6 梯队四既有排程内） |

呈裁材料=本报告+INV-57 现文；用户裁决后按选项立项实施票（选项 2=
[locked-change] 单尾注 INV 修订+装配回改；选项 3=双尾注面另呈）。本票
（F-TIME-01）产出即毕，勾选不阻塞接力。
