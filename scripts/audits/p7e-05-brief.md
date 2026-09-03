# P7E-05 工单票面——阅读时长统计（五层规约）

> registry：`P7E-05` / file `src/main/services/reader.service.ts` / area service / owner strong / open
> 排程真相源=v33 §2 第 1 项（=ROADMAP §P7-E 内序第 5 位——前四项 P7E-01~04 已毕）。
> 开工记录：本票段技能清点延续本段开场（subagent-driven-development/TDD/
> verification-before-completion/systematic-debugging/loop-engineering 已加载；
> 门审外链 gate-call.py 在位——deepseek 64k 档直起纪律生效中）。

## ⓪ 出处（无出处默认不工单化——三链在档）

1. B1 报告 §3（docs/reports/2026-08-23_v2-blueprint-b1.md:47）：`reader.service.ts
   生命周期层（阅读时长统计，新迁移加列——001 已冻结）`。
2. ROADMAP §P7-E 内序第 5 位：「… > 导出剪贴板 > 阅读时长统计 > …」。
3. reader.service.ts:20-21 生命周期层预留注记：「预留：阅读时长统计（002 迁移
   加列）」——注：预留写「002」时 002 已被 indexes 占用，实际落位=008 新迁移
   （migrate.ts 清单追加，已合入迁移不可修改=CI 锁硬规则）。

- **价值**：文献库「读没读/读了多久」是学术管理的核心元数据——与 lastReadPage
  （读到哪）互补构成阅读行为双维度；详情面板直读无需新 UI 面。
- **依赖**：scroll-progress flush 管线（进度防抖/关 tab flush/closeAll 既有链
  ——时长账本搭车同口落库）；saveProgress 通道既有；零新依赖。
- **风险**：①**新迁移**（008_reading_time.sql+migrate.ts 清单追加——双受锁面，
  迁移 DB 断言先读 DDL：papers 表 001:25 last_read_page 同型 INTEGER NOT NULL
  DEFAULT 0）；②shared 模型/schema 两受锁件最小增量；③renderer 时长账本与
  scroll-progress 的职责边界（拆文件不做第二职责混装）；④e2e 时间流逝不可
  加速——时间面以注入 now 单测全锚，e2e 只做显示面冒烟。
- **验收**：见 ⑥。

## ① 行为层（态空间表先行）

### 主控 Design 裁决：搭车 saveProgress 单通道落库+独立时长模块+复合 flusher

- **采**：时长账本=renderer 新模块 `reading-time.ts`（deps 注入 {now, timers,
  onFlush}——crib scroll-progress 形态，时间全注入禁真 timer）；**落库搭车
  saveProgress**——schema 扩可选 `secondsDelta`（int 0..3600，缺省 0=既有
  调用方零兼容破坏），装配面复合 flusher：flush(pid)=进度页+时长账一次
  invoke（单通道单事务面，repo `UPDATE papers SET last_read_page=?,
  reading_seconds=reading_seconds+? WHERE id=?` 原子累加）。
- **否决**（独立通道 reader/add-time）：两通道两账本=关 tab/关应用两处 flush
  漏一即丢账；saveProgress 已有完整生命周期钩子链（防抖/关 tab/closeAll/
  卸载收尾），搭车即继承全部。
- **否决**（时长并入 scroll-progress 模块）：348 行+账本职责=第二职责混装
  （AGENTS 拆文件红线）；两模块经装配面复合，依赖单向。
- **计时门**（可计时的充要条件）：active tab 就绪（status ready）且
  `document.visibilityState==='visible'`——visibilitychange 暂停/恢复；
  **不做输入级 idle 检测**（v1 边界：挂后台标签页不算、亮屏不看算——诚实
  申报）；tick=READING_TICK_MS 常量（15s，不足 tick 的零头随 flush 按实
  结转，`now` 注入差值计）。
- **显示**：PaperDetail 增 `readingSeconds`（int≥0）；详情面板 meta 区一行
  「阅读 N 分钟」（<60min 按分钟取整；≥60min「N 小时 M 分」）。

### 迁移（受锁面——DB 断言先读 DDL 已核）

- `008_reading_time.sql`：`ALTER TABLE papers ADD COLUMN reading_seconds
  INTEGER NOT NULL DEFAULT 0;`（单语句；存量行自动补 0=升级路径天然幂等）。
- migrate.ts：MIGRATIONS 清单 +`{ version: 8, name: 'reading_time', sql }`
  （import ?raw 同型七先例）。

### IPC/契约（受锁面最小增量）

- schemas.ts：saveProgressReqSchema +`secondsDelta: z.number().int().min(0)
  .max(3600).optional()`（可选=旧载荷兼容；上限 3600=单次 flush 上界防
  异常大值）。
- shared/models/paper.ts：PaperDetail +`readingSeconds: number`。
- api-surface.ts：Res 零变（trueAck 不动——saveProgress 通道形状不变）。

### repo/service

- papers.repo：updateReadPage(paperId, page, secondsDelta=0) 第三参扩
  （原子累加 SQL 如上——预编译参数绑定）；detailById SELECT +reading_seconds
  列。
- reader.service：saveProgress 透传第三参（一行）；:20-21 预留注记兑现修订。
- ipc/reader.ts：透传（零改——req 直传 service）。

### renderer 装配

- reading-time.ts（~130 行）：createReadingTime(deps)——start(paperId)/
  stop()（切 tab/换文档）、ledger Record<paperId,seconds>、tick 循环+
  visibilitychange 门、collectAndZero(paperId)（flush 用，返回并清零该
  tab 账——页码未知不 invoke）、dispose()（尾账经 onFlush 回调上抛装配面）。
- ReaderPage 装配：复合 flusher——flush(pid)={ page=sp.peekPending(pid)，
  sec=rt.collectAndZero(pid)，sec>0||page 在场→saveProgress(pid,page??当前,
  sec) }；flushAll 同构遍历；active tab ready 效应→rt.start/stop。
- PaperDetailPanel：meta 区+「阅读 N 分钟」行（formatReadingTime 纯函数
  驻 reading-time.ts 或 models——单源导出）。

### 态空间跨格序列表（R1~R10——验收=逐格测试锚）

| # | 序列 | 期望 |
|---|---|---|
| R1 | ready+visible→tick 3 次 | ledger[paperId]=45s；无 invoke（防抖归进度管线） |
| R2 | R1 后 flush(pid) | 单次 saveProgress(pid, pendingPage, 45)；ledger 清零 |
| R3 | visible→hidden→visible | hidden 段零累积（门关）；恢复后续算（tick 重启） |
| R4 | 切 tab（A→B） | A stop（账留存 ledger）+B start；回 A 不重算离开段 |
| R5 | 关 tab | flusher.flush(pid)——R2 语义（store.closeTab 既有接线） |
| R6 | 关应用/closeAll | flushAll 遍历全 ledger（既有链继承） |
| R7 | 卸载 ReaderPage（切视图） | dispose 尾账 flush（onFlush 上抛） |
| R8 | secondsDelta 缺省（旧调用方） | repo 第三参=0——reading_seconds 不变（兼容锚） |
| R9 | 存量库升级 | 008 迁移后 reading_seconds 全 0（DEFAULT 幂等） |
| R10 | tab 未就绪（loading/error） | 零累积（start 只在 ready） |

## ② 接口层

一迁移+一 schema 字段+一模型字段+repo 第三参+一 renderer 模块+一行显示；
无新通道（saveProgress 搭车=Design 裁决）；formatReadingTime 纯函数单源。

## ③ 架构层

- 分层不变；reading-time 与 scroll-progress 互不 import（装配面 ReaderPage
  复合——依赖单向同惯例）；migrate 清单追加循七先例。
- **INV-57 新登记**（收口主控）：阅读时长单口累加——reading_seconds 唯一写
  点=papers.repo updateReadPage 第三参（原子 SQL 累加，禁 read-modify-write
  两步）；时长账本唯一宿主=reading-time.ts 模块 ledger（关 tab/closeAll/
  卸载三收尾口经复合 flusher 与进度账同批落库——漏一即丢账的结构性防线）；
  计时门=ready×visible 双条件（输入级 idle 不做=v1 申报边界）。
- 受锁面清单（主控预解锁）：migrations/008 新文件+migrate.ts+schemas.ts+
  models/paper.ts 四件最小增量；新测试收口入锁。

## ④ 生命周期层

- reader.service.ts:20-21 预留注记兑现修订（含「002→008 实际落位」勘误说明）。
- 已知边界（票面外不修只记）：①亮屏不看的虚计（idle 检测 v2——可用输入
  信号启发式，另立票）；②跨设备时长合并不做（单机单库）；③tick 间隔与
  flush 时点间的秒级误差（实转不丢——collectAndZero 按 now 差值）。

## ⑤ 文化层（测试规约——TDD 红→绿→变异红证）

新测试全 always-active：

| 文件 | 覆盖 |
|---|---|
| tests/unit/db/migrate-reading-time.test.ts | R9（008 后新库/存量库升级路径：column 存在+DEFAULT 0+user_version=8）——新文件（migrate.test.ts 受锁零改） |
| tests/unit/db/papers-reading-time.test.ts | repo 累加原子性（两次 +30+45=75）+缺省 0（R8）+detailById 回读 readingSeconds |
| tests/unit/services/reader-time.test.ts | service 透传第三参（新文件——reader.service.test 受锁零改） |
| tests/unit/renderer/reading-time.test.ts | R1~R7 全序列（now/timers 注入禁真 timer——scroll-progress.test 同法）+formatReadingTime 边界（0/59/60/61/125） |
| tests/e2e/reader-reading-time.spec.ts | 显示面冒烟：开文献→详情面板「阅读 0 分钟」在场（时间流逝不加速不断言——票面申报）；迁移升级链（存量库启动不崩+详情可开） |

- **变异红证 ≥4 组**（cp 备份法）：M1=repo 删累加改赋值（两次 flush 值
  75→45 红）；M2=reading-time 删 visibility 门（R3 hidden 段累积红）；
  M3=复合 flusher 删 collectAndZero（R2 secondsDelta=0 红）；M4=切 tab 忘
  stop（R4 离开段虚计红）。
- 先红纪律：全量套跑口径先红落盘 scripts/audits/p7e-05-red/；证据 .raw.txt。
- **锁序纪律**：新测试+新迁移文件诞生即 locks:generate+apply 先于 verify
  （预期 259→264：+4 unit+1 e2e spec；008_reading_time.sql+migrate.ts 在
  既有锁面内 hash 变更）。
- **主控预解锁**：本轮已亲验只读位摘除后才派发（v33 §3 纪律——上轮 chmod
  教训）。

## ⑥ 验收

- `npm run verify` 全绿（基线 142 文件 1231 用例滚动，新增数实测申报）。
- e2e 全量（37+1 新 spec）全绿。
- 门一 Kimi 外链+门二 deepseek 64k 档异构终审（材料含新文件全文+diff 包）。
- grep 无 TODO/FIXME/placeholder；中文 UTF-8 验证。
- INV-57 登记+预留注记修订+registry P7E-05 翻 done（收口主控单写）。
- 提交尾注：受锁件 [locked-change]（四预解锁件+新测试+迁移）。

## ⑦ 派发与成本申报

- 三屋：实现者=子代理（GLM5.3 统一档——环境无 model 参数欠账披露）；门一=
  Kimi K3；门二=deepseek 64k 档直起。
- 实现者禁 git/registry/locks；禁新增依赖；超票面决定停下申报（BLOCKED）。
- 主控亲验 verify 真退出码+变异红证抽查+diff 范围核对。
