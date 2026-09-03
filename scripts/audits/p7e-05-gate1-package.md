# P7E-05 门一审材料包（阅读时长统计）

## 0. 材料包构成与审查对象
- 工单=票面 §2；实现=diff（§3 完整 patch——13 改+9 新，其中 12 件受锁测试=主控 [locked-change] 配套）；实现者自报=§4。
- 基线：单测 142 文件/1231→本单后 **146 文件/1251**（+4 文件+20 用例实测：4 新测试文件 19 用例+R1 回炉新锚 1；主控已亲复跑 verify 全链 146/1251 exit=0）；locks 259→**265**（+4 unit+1 e2e spec+1 sql——migrate.ts 不在锁面为该仓常态）；e2e 37→38（定向 1 passed，全量主控亲验中）。
- **主控 12 件受锁测试配套（[locked-change]，诚实申报）**：票面落地撞受锁 golden 双死结——①migrate.test.ts:10 `appliedVersions=[1..7]` 字面断言与 MIGRATIONS 追加 version 8 互斥（改 [1..8]）；②PaperDetail 必填 readingSeconds 使 10 件受锁测试 `: PaperDetail` 字面量 typecheck 红（各补 `readingSeconds: 0`）；③续作中发现同型第 12 件 lineage-tags.test.ts:63 `readUserVersion=7`（改 8+测试名同步）。变更性质=票面核心内容（新迁移+新必填字段）在受锁测试面的必然投影，零断言语义弱化——请审此论断。
- **主控收口前修复（诚实申报，材料含全部 diff）**：e2e 全量 38 中 tag-lifecycle.spec 确定性红（两次复跑同位：乙文献 Enter 打标签 chip 未现）——对照实证=回退本票 Panel 加行即绿。根因=既有竞态被本票加行时序踩宽：TagEditor 有状态（input/busy）且 PaperDetailPanel 挂接点无 key，切文献不重挂，Enter 可落进「新选中已示、新 detail 未返回」窗口读到旧文献上下文（挂错文献=正确性缺陷非仅测试面）。修复=挂接点 `key={detail.id}`（会话身份语义，切文献强制重挂；定向 tag-lifecycle 绿实证）。TagEditor 本体/spec/契约零改。
- 实现流程：首轮 BLOCKED（上述死结申报）→主控配套 11 件→续作 TDD 全流程（首红 5 failed/1235 exit=1→绿→变异 M1~M4）→第 12 件通报补改→主控亲验发现 R1 缺陷回炉（settle force 结算不检查 isVisible——hidden 段虚计 R3×R6 跨格）→修复+R3×R6 跨格锚+M5 变异→verify 全绿。
- 审计重点面（主控点名）：①**R1 回炉修复正确性**（settle 门控：visible 段 force 结算行为须不变、hidden 段零虚计、零头留存 liveMs 语义——请对 diff 推演）；②**复合 flusher 丢账面**（takePending/collectAndZero 合并单 invoke 的三收尾口 R5 关 tab/R6 closeAll/R7 卸载——漏一即丢账的结构性防线是否闭合）；③**主控 12 件配套的纯净性**（非断言弱化论证是否成立）；④自裁申报三项合理性（formatReadingTime 下沉 renderer/shared+re-export 单源性/reading-time-setup 拆分 window.api 隔离/R4 离开段窗口测试设计）；⑤secondsDelta optional 与旧载荷兼容（缺省 0 路径+e2e 存量库降级构造）。

## 1. 宪法硬规则摘要（AGENTS.md 关键条目）
- 分层单向：renderer→window.api→ipc→services；跨 feature 互引红线（COMPOSITION_ROOT_ALLOW 白名单）；测试是锁定合约（受锁面改动必须票面/裁决声明最小增量——本票=schemas/models 两件票面声明+12 件测试主控配套声明）；文件 ≤500/组件 ≤250/repo ≤300；禁新增依赖；禁字符串拼接 SQL（一切 db.prepare 预编译+参数绑定）；已合入迁移不可修改（001~007 零改——新增 008 唯一路径）。
- 态空间前置（R1~R10 逐格锚+跨格序列）；不变量登记制（INV-57 收口主控：reading_seconds 唯一写点=updateReadPage 第三参原子累加/时长账本唯一宿主=reading-time.ts ledger/计时门=ready×visible 双条件）。

## 2. 票面（完整任务书）

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

## 3. 完整 diff（新文件 add -N 全文）
```diff
diff --git a/locks/manifest.json b/locks/manifest.json
index 887a76b348..e11f508276 100644
--- a/locks/manifest.json
+++ b/locks/manifest.json
@@ -1,5 +1,5 @@
 {
-    "generatedAt":  "2026-09-03T07:00:38.3890145Z",
+    "generatedAt":  "2026-09-03T11:12:40.7440593Z",
     "files":  [
                   {
                       "path":  ".github/workflows/ci.yml",
@@ -321,6 +321,10 @@
                       "path":  "src/main/db/migrations/007_lineage_node_tags.sql",
                       "sha256":  "8c8d331addeec993c802ca2c82fbf0c3f3828b1c14873eecad2c8439dd697bd9"
                   },
+                  {
+                      "path":  "src/main/db/migrations/008_reading_time.sql",
+                      "sha256":  "0b096f12238996ee0b6a3b29426dbc423576f5588e7ccd9d937200daa73b0fd9"
+                  },
                   {
                       "path":  "src/shared/annotation-order.ts",
                       "sha256":  "631b37d85a9e94c6966059255ecaac8e1bd94735d502ab201ca792348f6ddee9"
@@ -339,7 +343,7 @@
                   },
                   {
                       "path":  "src/shared/ipc/schemas.ts",
-                      "sha256":  "72a8463dd38049318c263b8927d741d2500ba2fbe333eba5f0f1148200d880d3"
+                      "sha256":  "8df9e6fbda30ccd5bb3db8cf79ddba1934c6b13f362245945d057b61734b3071"
                   },
                   {
                       "path":  "src/shared/models/ai-note.ts",
@@ -363,7 +367,7 @@
                   },
                   {
                       "path":  "src/shared/models/paper.ts",
-                      "sha256":  "75d65533cd3230988cade3cac01d0d858f94c6ba8b85a32ce829e3b5da479fc3"
+                      "sha256":  "d23abc6e6ebdc04ffa849c1c6fd865d9987574aeafe36cb037b6cb29eb426570"
                   },
                   {
                       "path":  "src/shared/models/tag.ts",
@@ -409,6 +413,10 @@
                       "path":  "tests/e2e/lineage.spec.ts",
                       "sha256":  "ddcf62550b0809b8bd0215c5d869369da789e46690c36e19e0bea63fd0a5e1bf"
                   },
+                  {
+                      "path":  "tests/e2e/reader-reading-time.spec.ts",
+                      "sha256":  "ab91d6ce027ffbff488400b863ca28b23023029d5fc2c91c15c69055ee1cad11"
+                  },
                   {
                       "path":  "tests/e2e/reader-scroll.spec.ts",
                       "sha256":  "b8e52a82bc44b33407d5d1bf248572deed5446386521af9ed9913b9917cd22cc"
@@ -471,7 +479,15 @@
                   },
                   {
                       "path":  "tests/unit/db/migrate.test.ts",
-                      "sha256":  "af9466964dc797d846d7b3783267d25538752e8af6d4065ddaf38edf89fd0d14"
+                      "sha256":  "a87e3d0db473edbad1da758d145974d0377e80a92534181962865818ebc8b782"
+                  },
+                  {
+                      "path":  "tests/unit/db/migrate-reading-time.test.ts",
+                      "sha256":  "083b9d69e8b47cfc02b842c1d9845ee703b3f7e52b03e62c209da83b643bbc66"
+                  },
+                  {
+                      "path":  "tests/unit/db/papers-reading-time.test.ts",
+                      "sha256":  "ef145100b7f62c89759103e6768252219eb6a915ae4d4c9960de48a753bc7cd8"
                   },
                   {
                       "path":  "tests/unit/db/repos/ai_notes.repo.order.test.ts",
@@ -731,19 +747,19 @@
                   },
                   {
                       "path":  "tests/unit/renderer/paper-detail-cited.test.tsx",
-                      "sha256":  "e7364b3787649905cebbba06e4bb398599022512340648bca3c9d5c8807f8ed2"
+                      "sha256":  "065bea4e31af31f6e383f648352e2231f52c982c101547618bdcd5cf6ee90054"
                   },
                   {
                       "path":  "tests/unit/renderer/paper-detail-clip.test.tsx",
-                      "sha256":  "be4f8bc5912956b891a5edd68d812e2a087bee9a260a78c3d08c368ed64f5aca"
+                      "sha256":  "a2e4f1ac3335a7f0e85634913727cb13e402e39fae7063cfbf1aa27a238102d5"
                   },
                   {
                       "path":  "tests/unit/renderer/paper-detail-export.test.tsx",
-                      "sha256":  "a6066aae93b557e2dc98c506362cc1b8d24c636977e50ad22d724474d7ab3ee7"
+                      "sha256":  "b7dd637523fa5c327507fc39f3ad6e76bb83adaecb02339da94e484f6760d730"
                   },
                   {
                       "path":  "tests/unit/renderer/paper-detail-notes-off.test.tsx",
-                      "sha256":  "afd0f1092c10ddaa1ea67e5dbc34a00af7227a982c7fdea5255d9d75dc3667d3"
+                      "sha256":  "1a9750a6d03a014da9a82311c4797ee688e74a803470afe995e5feacc62c0c35"
                   },
                   {
                       "path":  "tests/unit/renderer/pdf-page-canvas.test.tsx",
@@ -793,6 +809,10 @@
                       "path":  "tests/unit/renderer/reader-store-undo-race.test.ts",
                       "sha256":  "49516a94b61d5f716f6b50480ae653433fbcd026e0dbc12e000f67c72c95cb9b"
                   },
+                  {
+                      "path":  "tests/unit/renderer/reading-time.test.ts",
+                      "sha256":  "c409beab1101c8178d8603ec330442f48b0d06146550688476d382d3d0a07bf7"
+                  },
                   {
                       "path":  "tests/unit/renderer/scroll-converge.test.ts",
                       "sha256":  "0046759b1c0bc8c6c5d53a7e90199f1b1e47473c303e4959257ad2368c7b7f8d"
@@ -887,7 +907,7 @@
                   },
                   {
                       "path":  "tests/unit/services/corpus.assemble.test.ts",
-                      "sha256":  "94c5c7b34f796064011ce8108160877cd14c80fc71f1555eaa500e122b843c51"
+                      "sha256":  "993a5c6f084b2ed63de63001afafd95988f5652f999d748e465123d8ebabab38"
                   },
                   {
                       "path":  "tests/unit/services/corpus.export.test.ts",
@@ -895,11 +915,11 @@
                   },
                   {
                       "path":  "tests/unit/services/enrich.service.test.ts",
-                      "sha256":  "26f0ec475d61bd3a2e061eb12cef3568dd35eeb528b85fa0f4097bd7536c3353"
+                      "sha256":  "a3956b3754da3804a66a87c4a57c85aebb26131bcb143708507f7be1146436af"
                   },
                   {
                       "path":  "tests/unit/services/export.service.test.ts",
-                      "sha256":  "057861c47b0e8dbf70a262dd7548b8cf1b56654b38c34edffe7055ddba79fe78"
+                      "sha256":  "7bffa25a66492ead0692ea80195cd54473eaeaad07106c8e4545344da8482d48"
                   },
                   {
                       "path":  "tests/unit/services/file-store.test.ts",
@@ -911,7 +931,7 @@
                   },
                   {
                       "path":  "tests/unit/services/library.service.test.ts",
-                      "sha256":  "af85e5456644e8e64112324b1629c8b2c8631917c6f797c74b0713730b907998"
+                      "sha256":  "a52120eed09010e3f21eaf498f20887717fbb0261f6f959a1c6f9ea02c76423b"
                   },
                   {
                       "path":  "tests/unit/services/lineage-import.test.ts",
@@ -923,11 +943,11 @@
                   },
                   {
                       "path":  "tests/unit/services/lineage-tags.test.ts",
-                      "sha256":  "830149a00ec11743411a7ebc608841acca2a9b1e8485183495ccd8df0881ab47"
+                      "sha256":  "04a4366e324b138d356c08e3f258abf58a3c76c637bbf8e3d7d644812768952b"
                   },
                   {
                       "path":  "tests/unit/services/markdown.report.test.ts",
-                      "sha256":  "67bb1092b7dbb9d53a6f626d8b9c431cfea48ae266f5a4180ea27fc3802b4de1"
+                      "sha256":  "dca43a6c13bda54a0fd9f7c795f4b5b2e8950634b2039784895b8eabbe281e26"
                   },
                   {
                       "path":  "tests/unit/services/notes.service.test.ts",
@@ -951,7 +971,11 @@
                   },
                   {
                       "path":  "tests/unit/services/reader.service.test.ts",
-                      "sha256":  "5051cc12ca26cc6b87e4577bd1c24e169e2600c0a9c377597942575442d00b80"
+                      "sha256":  "cfb3247305167520c35b9b786304d1811f1ad19727896f80f5cd9512a83be47d"
+                  },
+                  {
+                      "path":  "tests/unit/services/reader-time.test.ts",
+                      "sha256":  "00b6d6d37806d15f86c666fec405ebfe25a9a067a7e1444f422312023a4a656d"
                   },
                   {
                       "path":  "tests/unit/services/tags.service.test.ts",
diff --git a/src/main/db/migrate.ts b/src/main/db/migrate.ts
index 0b4d630cc2..2b9b65f449 100644
--- a/src/main/db/migrate.ts
+++ b/src/main/db/migrate.ts
@@ -15,6 +15,7 @@ import lineageSql from './migrations/004_lineage.sql?raw'
 import citedBySql from './migrations/005_cited_by.sql?raw'
 import refEdgesSql from './migrations/006_lineage_ref_edges.sql?raw'
 import nodeTagsSql from './migrations/007_lineage_node_tags.sql?raw'
+import readingTimeSql from './migrations/008_reading_time.sql?raw'
 
 export interface Migration {
   version: number
@@ -30,7 +31,8 @@ export const MIGRATIONS: readonly Migration[] = [
   { version: 4, name: 'lineage', sql: lineageSql },
   { version: 5, name: 'cited_by', sql: citedBySql },
   { version: 6, name: 'lineage_ref_edges', sql: refEdgesSql },
-  { version: 7, name: 'lineage_node_tags', sql: nodeTagsSql }
+  { version: 7, name: 'lineage_node_tags', sql: nodeTagsSql },
+  { version: 8, name: 'reading_time', sql: readingTimeSql }
 ]
 
 export interface MigrateResult {
diff --git a/src/main/db/migrations/008_reading_time.sql b/src/main/db/migrations/008_reading_time.sql
new file mode 100644
index 0000000000..6146fca1fa
--- /dev/null
+++ b/src/main/db/migrations/008_reading_time.sql
@@ -0,0 +1,9 @@
+-- 008_reading_time：P7E-05 阅读时长列（reader.service.ts 生命周期层预留兑现）
+-- 设计裁决（p7e-05-brief §1 主控 Design）：
+-- - reading_seconds=累计阅读秒数；唯一写点=papers.repo updateReadPage 第三参
+--   （原子累加 reading_seconds=reading_seconds+?，禁 read-modify-write 两步）
+-- - INTEGER NOT NULL DEFAULT 0（001:25 last_read_page 同型；存量行自动补 0=
+--   升级路径天然幂等——R9）
+-- - 预留注记勘误：reader.service.ts 原写「002 迁移加列」时 002 已被 indexes
+--   占用，实际落位=008（已合入迁移不可修改=CI 锁硬规则，只能新增）
+ALTER TABLE papers ADD COLUMN reading_seconds INTEGER NOT NULL DEFAULT 0;
diff --git a/src/main/db/repos/papers.queries.ts b/src/main/db/repos/papers.queries.ts
index 699f20377e..948e95e76b 100644
--- a/src/main/db/repos/papers.queries.ts
+++ b/src/main/db/repos/papers.queries.ts
@@ -3,7 +3,7 @@
  * 从 papers.repo 拆出的查询 SQL 常量+行形状+行映射（repo ≤300 行关卡配套，
  * 纯查询/映射无行为逻辑）；消费面=papers.repo 的 searchSummaries/
  * listSummariesByIds/detailById。ENR-01：DETAIL_SQL 三缓存列与
- * DetailRow 三字段在此维护。
+ * DetailRow 三字段在此维护；P7E-05：reading_seconds 同此（DETAIL_SQL 直读）。
  */
 import { escapeFtsQuery } from '../fts'
 import type {
@@ -37,6 +37,7 @@ export const LIST_SQL = `SELECT p.id, p.title, p.authors_json, p.year, p.venue,
 export const DETAIL_SQL = `SELECT p.file_ref, p.abstract, p.arxiv_id, p.source, p.enrich_status, p.updated_at,
   p.id, p.title, p.authors_json, p.year, p.venue, p.doi, p.added_at, p.last_read_page,
   p.cited_by_count, p.cited_by_fetched_at, p.cited_by_count_source,
+  p.reading_seconds,
   ${AGG_COLS.trim()}
   FROM papers p WHERE p.id = ?`
 
@@ -56,6 +57,8 @@ export interface DetailRow extends SummaryRow {
   cited_by_count: number | null
   cited_by_fetched_at: string | null
   cited_by_count_source: string | null
+  /** P7E-05 阅读时长秒数（008 迁移列 NOT NULL DEFAULT 0——读面恒有值） */
+  reading_seconds: number
 }
 
 /** LIKE 兜底转义：% _ 与转义符 \ 本身 */
diff --git a/src/main/db/repos/papers.repo.ts b/src/main/db/repos/papers.repo.ts
index 4cb9401ee0..739fdf6a1e 100644
--- a/src/main/db/repos/papers.repo.ts
+++ b/src/main/db/repos/papers.repo.ts
@@ -94,7 +94,9 @@ export interface PapersRepo {
     e: { source: PaperSource; enrichStatus: EnrichStatus; patch: PaperMetaPatch },
     citedBy?: CitedByWrite
   ): PaperRow | null
-  updateReadPage(id: string, page: number): void
+  /** P7E-05：第三参=时长增量秒（原子累加 reading_seconds=reading_seconds+?——
+   * INV-57 唯一写点，禁 read-modify-write 两步；缺省 0=旧调用方零破坏） */
+  updateReadPage(id: string, page: number, secondsDelta?: number): void
   searchSummaries(q: LibraryQuery): Paged<PaperSummary>
   listSummariesByIds(ids: string[]): PaperSummary[]
   listAllIds(): string[]
@@ -196,8 +198,10 @@ export function createPapersRepo(db: SqliteDb): PapersRepo {
       }
       return updateColumns(id, columns, values)
     },
-    updateReadPage(id, page) {
-      stmt('UPDATE papers SET last_read_page = ? WHERE id = ?').run(page, id)
+    updateReadPage(id, page, secondsDelta = 0) {
+      stmt(
+        'UPDATE papers SET last_read_page = ?, reading_seconds = reading_seconds + ? WHERE id = ?'
+      ).run(page, secondsDelta, id)
     },
     searchSummaries(q) {
       const { cond, params } = buildFilters(q)
@@ -258,6 +262,8 @@ export function createPapersRepo(db: SqliteDb): PapersRepo {
               citedByCountSource: r.cited_by_count_source as PaperDetail['citedByCountSource']
             }
           : {}),
+        // P7E-05 阅读时长（008 列 NOT NULL DEFAULT 0——读面恒有值直读）
+        readingSeconds: r.reading_seconds,
         tags,
         collections
       }
diff --git a/src/main/services/reader.service.ts b/src/main/services/reader.service.ts
index 4ba70b5ef8..31a93b2ba2 100644
--- a/src/main/services/reader.service.ts
+++ b/src/main/services/reader.service.ts
@@ -18,7 +18,10 @@
  * - 只依赖 repos 桶
  *
  * ── 生命周期层 ──
- * - 预留：阅读时长统计（002 迁移加列）
+ * - P7E-05 已兑现：阅读时长统计——saveProgress 搭车 secondsDelta（可选，缺省
+ *   0）透传 updateReadPage 第三参原子累加（单通道单事务面，Design 裁决）。
+ *   勘误：原预留注记写「002 迁移加列」时 002 已被 indexes 占用，实际落位
+ *   =008_reading_time（已合入迁移不可修改=CI 锁硬规则，只能新增）
  * - 不做：多设备同步进度
  *
  * ── 文化层 ──
@@ -76,9 +79,10 @@ export function createReaderService(deps: { repos: Repos }): ApiHandlers['reader
       return annotations.listByPaper(req.paperId)
     },
 
-    // 页码从 0 计，范围合法性已由上游 zod（int min 0）保证，此处薄转调
+    // 页码从 0 计，范围合法性已由上游 zod（int min 0）保证，此处薄转调；
+    // secondsDelta 缺省 0（P7E-05 时长搭车——旧调用方零破坏）
     async saveProgress(req) {
-      papers.updateReadPage(req.paperId, req.page)
+      papers.updateReadPage(req.paperId, req.page, req.secondsDelta ?? 0)
       return { ok: true as const }
     }
   }
diff --git a/src/renderer/features/library/PaperDetailPanel.tsx b/src/renderer/features/library/PaperDetailPanel.tsx
index c9487200e1..32d221195a 100644
--- a/src/renderer/features/library/PaperDetailPanel.tsx
+++ b/src/renderer/features/library/PaperDetailPanel.tsx
@@ -36,6 +36,7 @@ import { useAsync } from '../../shared/hooks/useAsync'
 import { Button } from '../../shared/ui/Button'
 import { DiamondRule } from '../../shared/ui/DiamondRule'
 import { requestOpenPaper } from '../../shared/open-paper-bus'
+import { formatReadingTime } from '../../shared/reading-time-format'
 import { TagEditor } from '../tags/TagEditor'
 import { MetaEditDialog } from './MetaEditDialog'
 import { usePaperDetailActions } from './usePaperDetailActions'
@@ -154,6 +155,7 @@ export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element
         <Row label="增强">{ENRICH_LABEL[detail.enrichStatus]}</Row>
         <Row label="DOI">{detail.doi ?? ''}</Row>
         <Row label="统计">{`标注 ${detail.annotationCount} · 笔记 ${detail.noteCount} · 读至第 ${detail.lastReadPage + 1} 页`}</Row>
+        <Row label="阅读">{formatReadingTime(detail.readingSeconds)}</Row>
       </div>
       {detail.abstract !== '' && (
         <p className="lib-detail-abs line-clamp-6 text-xs leading-5" style={{ color: 'var(--text-dim)' }}>
@@ -191,7 +193,11 @@ export function PaperDetailPanel(props: { paperId: string | null }): JSX.Element
           </Button>
         )}
       </div>
+      {/* key=会话身份：切文献强制重挂——TagEditor 有状态（input/busy），换文献
+          延续旧实例会让 Enter 落进旧 detail 上下文窗口（tag-lifecycle e2e 实证：
+          P7E-05 加行放大的既有竞态——挂错文献的正确性缺陷非仅测试面） */}
       <TagEditor
+        key={detail.id}
         paperId={detail.id}
         tags={detail.tags}
         onChanged={() => setReloadKey((k) => k + 1)}
diff --git a/src/renderer/features/reader/ReaderPage.tsx b/src/renderer/features/reader/ReaderPage.tsx
index 22a19a03ae..78b6441ac2 100644
--- a/src/renderer/features/reader/ReaderPage.tsx
+++ b/src/renderer/features/reader/ReaderPage.tsx
@@ -26,6 +26,9 @@
  *   期望：切布局不丢位置）
  * - P7E-03 页内搜索装配：useReaderSearch（fileUrl 键效应清面板/ctrl+f/
  *   翻页联动注入/受控面板节点）→ ReaderToolbar searchBox slot
+ * - P7E-05 阅读时长装配：useReaderReadingTime（时长账本+复合 flusher——
+ *   进度页+时长账单通道合并）+useReadingTimeWiring（ready×active 计时门/
+ *   visibilitychange/卸载 dispose）；装配块驻 reading-time.ts（组件行数关卡）
  * ── 接口层 ──
  * - export function ReaderPage(): JSX.Element
  * ── 架构层 ──
@@ -52,6 +55,8 @@ import { useReaderSearch } from './useReaderSearch'
 import { useReaderStore } from './reader.store'
 import { readActiveTab, useActiveTab } from './useActiveTab'
 import { createReaderScrollProgress, useScrollProgressWiring } from './scroll-progress'
+import { useReaderReadingTime } from './reading-time-setup'
+import { useReadingTimeWiring } from './reading-time'
 import { showToast } from '../../shared/ui/Toast'
 
 export function ReaderPage(): JSX.Element {
@@ -83,7 +88,11 @@ export function ReaderPage(): JSX.Element {
   const scrollAreaRef = useRef<HTMLDivElement | null>(null)
   // F-03 滚动进度状态机（装配工厂闭包 scrollAreaRef；接线见 useScrollProgressWiring）
   const spProg = useMemo(() => createReaderScrollProgress(scrollAreaRef), [])
-  useScrollProgressWiring(spProg, fileUrl, paperId, columnScroll)
+  // P7E-05 时长账本+复合 flusher（装配块驻 reading-time.ts——组件行数关卡配套；
+  // 计时门接线 R3/R4/R7/R10+进度时长单通道合并 Design 裁决）
+  const { rt: rtTime, flusher: compositeFlusher } = useReaderReadingTime(spProg)
+  useScrollProgressWiring(spProg, fileUrl, paperId, columnScroll, compositeFlusher)
+  useReadingTimeWiring(rtTime, paperId, fileUrl !== null)
   // N4：SelectionLayer 挂载盒=内容级稳定包装盒（滚动不重挂→工具条不闪收）
   const [selectionMount, setSelectionMount] = useState<HTMLDivElement | null>(null)
 
diff --git a/src/renderer/features/reader/reading-time-setup.ts b/src/renderer/features/reader/reading-time-setup.ts
new file mode 100644
index 0000000000..2041a27d20
--- /dev/null
+++ b/src/renderer/features/reader/reading-time-setup.ts
@@ -0,0 +1,48 @@
+/**
+ * reading-time-setup —— P7E-05 ReaderPage 组合根装配 hook（拆自 reading-time.ts：
+ * 顶层 import api（window.api 模块级求值）会毒化 node 环境纯模块单测——拆出后
+ * reading-time.ts 零 window 依赖；scroll-progress 装配工厂同型的细化形态）。
+ * 装配块驻模块文件=组件 ≤250 行关卡配套（组件只持引用）。
+ */
+import { useMemo } from 'react'
+import { api } from '../../api/client'
+import { useReaderStore } from './reader.store'
+import type { ProgressFlusher } from './reader.store'
+import {
+  createCompositeProgressFlusher,
+  createReaderReadingTime,
+  type ProgressAccountView,
+  type ReadingTime
+} from './reading-time'
+
+/** 时长账本+复合 flusher 一次构建：onFlush 兜底=dispose 尾账单通道
+ *  saveProgress（R7 卸载收尾）；sec=0 省略字段=旧载荷形状（ipc 兼容锚） */
+export function useReaderReadingTime(
+  sp: ProgressAccountView
+): { rt: ReadingTime; flusher: ProgressFlusher } {
+  const rt = useMemo(
+    () =>
+      createReaderReadingTime((paperId, seconds) => {
+        void api.reader
+          .saveProgress({
+            paperId,
+            page: useReaderStore.getState().tabs[paperId]?.page ?? 0,
+            secondsDelta: seconds
+          })
+          .then(() => undefined, () => undefined)
+      }),
+    []
+  )
+  const flusher = useMemo(
+    () =>
+      createCompositeProgressFlusher(sp, rt, {
+        saveProgress: (paperId, page, secondsDelta) =>
+          api.reader
+            .saveProgress({ paperId, page, ...(secondsDelta > 0 ? { secondsDelta } : {}) })
+            .then(() => undefined),
+        currentPageOf: (paperId) => useReaderStore.getState().tabs[paperId]?.page ?? 0
+      }),
+    [sp, rt]
+  )
+  return { rt, flusher }
+}
diff --git a/src/renderer/features/reader/reading-time.ts b/src/renderer/features/reader/reading-time.ts
new file mode 100644
index 0000000000..ec839428df
--- /dev/null
+++ b/src/renderer/features/reader/reading-time.ts
@@ -0,0 +1,280 @@
+/**
+ * [P7E-05] reading-time —— 阅读时长账本（工单：本票实现）。
+ *
+ * ── 行为层 ──
+ * - 计时门（可计时的充要条件）：active tab 就绪（status ready——装配面效应
+ *   只在 ready 调 start）且 document.visibilityState==='visible'（visibilitychange
+ *   暂停/恢复）；不做输入级 idle 检测（v1 边界：挂后台标签页不算、亮屏不看算
+ *   ——诚实申报，票面§4 已知边界①）。
+ * - 态空间（per-tab ledger Record<paperId,seconds> + 当前段 {currentPid,liveMs,
+ *   lastMark}）：
+ *   | 态 | 迁移 | 断言 |
+ *   | --- | --- | --- |
+ *   | 未计时 | start(pid)（ready×active） | 段起 lastMark=now，tick 循环起 |
+ *   | 计时中 | tick 到（门开）→整 tick 入 ledger | 不足 tick 留 liveMs（零头） |
+ *   | 计时中 | visibilitychange→hidden | 已计量零头留存，刻度推到当下（hidden 段零累积） |
+ *   | hidden | 恢复 visible | lastMark=恢复点起算（续算，零头续接） |
+ *   | 计时中 | stop()（切 tab/换文档） | 零头按实结转入 ledger（账留存——R4） |
+ *   | 任意 | collectAndZero(pid) | 返回并清零该 tab 账（不 invoke——页码未知，invoke 归复合 flusher） |
+ *   | 任意 | dispose() | 清 timer+尾账逐笔经 onFlush 上抛（R7 卸载收尾） |
+ * - 跨格序列 R1~R7+R10 见 tests/unit/renderer/reading-time.test.ts（票面§1 表）。
+ * - tick=READING_TICK_MS（15s）；不足 tick 的零头随 flush 按实结转（now 注入
+ *   差值计，floor 秒——宁少勿多）；节流下长间隔一次入账整段（都是可见段——
+ *   不可见段被 onVisibilityChange 刻度隔离）。
+ *
+ * ── 接口层 ──
+ * - createReadingTime(deps:{isVisible,now,timers,onFlush})——时间全注入（禁真
+ *   timer，scroll-progress 同法）；
+ * - createReaderReadingTime(onFlush)——装配工厂（真 Date.now/setInterval/
+ *   document.visibilityState）；
+ * - createCompositeProgressFlusher(sp,rt,deps)——装配面复合 flusher（进度页
+ *   +时长账一次 invoke=单通道单事务面，Design 裁决）；
+ * - useReadingTimeWiring——装配效应集（ready 效应 start/stop+visibilitychange
+ *   监听+卸载 dispose）；
+ * - formatReadingTime(seconds)——显示纯函数（<60min「N 分钟」按分钟取整；
+ *   ≥60min「N 小时 M 分」）单源导出（PaperDetailPanel 消费）。
+ *
+ * ── 架构层 ──
+ * - 与 scroll-progress 互不 import（票面§3 红线）——复合器消费 ProgressAccountView
+ *   结构类型（ScrollProgress 加 takePending/pendingIds 口后结构满足），装配面
+ *   ReaderPage 同时持两模块复合；依赖单向同惯例。
+ * - 落库搭车 saveProgress（secondsDelta 可选）——继承其完整生命周期钩子链
+ *   （防抖/关 tab/closeAll/卸载收尾），禁独立通道（两账本两通道=漏一即丢账）。
+ * - INV-57（收口主控登记）：时长账本唯一宿主=本模块 ledger；reading_seconds
+ *   唯一写点=papers.repo updateReadPage 第三参。
+ *
+ * ── 生命周期层 ──
+ * - 不做：输入级 idle 检测（v2 另立票）、跨设备时长合并（单机单库）。
+ *
+ * ── 文化层 ──
+ * - 测试：tests/unit/renderer/reading-time.test.ts（R1~R7+R10+零头结转+复合
+ *   flusher+formatReadingTime 边界，时间全注入）；e2e reader-reading-time.spec
+ *   （显示面+迁移升级链冒烟——时间流逝不加速不断言）。
+ */
+import { useEffect } from 'react'
+
+// formatReadingTime 定义驻 renderer/shared（quality 跨 feature 关卡指定的下沉
+// 位——PaperDetailPanel 直 import shared；此处 re-export 单源转发=受锁测试
+// import 面零改，定义唯一）
+export { formatReadingTime } from '../../shared/reading-time-format'
+
+/** tick 间隔：15s（票面①——READING_TICK_MS 常量单源） */
+export const READING_TICK_MS = 15_000
+
+/** 注入定时器（禁真 timer——测试经 fake timers 驱动） */
+export interface ReadingTimeTimers {
+  setInterval(fn: () => void, ms: number): unknown
+  clearInterval(handle: unknown): void
+}
+
+export interface ReadingTimeDeps {
+  /** 可见性门（装配注入 document.visibilityState==='visible'） */
+  isVisible(): boolean
+  now(): number
+  timers: ReadingTimeTimers
+  /** dispose 尾账上抛口（装配面接 saveProgress 兜底——R7） */
+  onFlush(paperId: string, seconds: number): void
+}
+
+export interface ReadingTime {
+  /** active tab 就绪（装配面 ready 效应调用；换文档旧段零头先结转） */
+  start(paperId: string): void
+  /** 切 tab/换文档/失焦（零头按实结转留存 ledger——账不丢） */
+  stop(): void
+  /** visibilitychange 接线（hidden=刻度隔离零累积；visible=恢复点起算） */
+  onVisibilityChange(): void
+  /** flush 用：返回并清零该 tab 账（页码未知不 invoke——invoke 归复合 flusher） */
+  collectAndZero(paperId: string): number
+  /** flushAll 用：取走全账并清零 */
+  collectAllAndZero(): Record<string, number>
+  /** 观察口（测试/装配诊断）：该 tab 已入账秒数 */
+  ledgerOf(paperId: string): number
+  /** 清 timer+尾账逐笔 onFlush 上抛（卸载/切视图收尾） */
+  dispose(): void
+}
+
+export function createReadingTime(deps: ReadingTimeDeps): ReadingTime {
+  const ledger: Record<string, number> = {}
+  let currentPid: string | null = null
+  /** 当前连续可见段内已计量未入账的毫秒（零头） */
+  let liveMs = 0
+  /** 上次计量刻度（ms——now 注入） */
+  let lastMark = 0
+  let handle: unknown = null
+
+  /** 段结算：liveMs 吸收 now-lastMark——吸收与入账同受 isVisible 门控
+   *  （R1 回炉：force 路径 stop/collectAndZero/collectAllAndZero/dispose 在
+   *  hidden 段被调时不得吸收 hidden 时长——票面「挂后台标签页不算」全路径
+   *  生效，非仅 tick；lastMark 无条件推进刻度）；force=零头一并入账
+   *  （flush/stop 用），否则只入整 tick（≥READING_TICK_MS 全入——节流长
+   *  间隔一段清）。hidden 期 force 结算：零头留存 liveMs 不入账（恢复后续算
+   *  或终局丢弃——<tick 秒级，票面§4 已知边界③口径） */
+  const settle = (force: boolean): void => {
+    const now = deps.now()
+    if (currentPid !== null && deps.isVisible()) {
+      liveMs += Math.max(0, now - lastMark)
+      if (force || liveMs >= READING_TICK_MS) {
+        ledger[currentPid] = (ledger[currentPid] ?? 0) + Math.floor(liveMs / 1000)
+        liveMs = 0
+      }
+    }
+    lastMark = now
+  }
+
+  /** tick：门关（无 active/不可见）零累积直接返回（刻度不动——hidden 段隔离
+   *  由 onVisibilityChange 承担，此处防御冗余） */
+  const tick = (): void => {
+    if (currentPid === null || !deps.isVisible()) return
+    settle(false)
+  }
+
+  return {
+    start(paperId) {
+      if (currentPid !== null) settle(true) // 换文档：旧文档零头先结转（不丢）
+      currentPid = paperId
+      liveMs = 0
+      lastMark = deps.now()
+      if (handle === null) handle = deps.timers.setInterval(tick, READING_TICK_MS)
+    },
+
+    stop() {
+      if (currentPid !== null) settle(true) // 零头按实结转留存（R4 账留存）
+      currentPid = null
+      if (handle !== null) {
+        deps.timers.clearInterval(handle)
+        handle = null
+      }
+    },
+
+    onVisibilityChange() {
+      if (deps.isVisible()) {
+        // 恢复：从恢复点起算（liveMs 零头保留续算）
+        lastMark = deps.now()
+      } else {
+        // 进入 hidden：已计量零头留存，刻度推到当下——hidden 段零累积
+        if (currentPid !== null) liveMs += Math.max(0, deps.now() - lastMark)
+        lastMark = deps.now()
+      }
+    },
+
+    collectAndZero(paperId) {
+      if (currentPid === paperId) settle(true) // 当前段零头一并结转
+      const sec = ledger[paperId] ?? 0
+      delete ledger[paperId]
+      return sec
+    },
+
+    collectAllAndZero() {
+      if (currentPid !== null) settle(true)
+      const out = { ...ledger }
+      for (const key of Object.keys(ledger)) delete ledger[key]
+      return out
+    },
+
+    ledgerOf(paperId) {
+      return ledger[paperId] ?? 0
+    },
+
+    dispose() {
+      if (currentPid !== null) settle(true)
+      currentPid = null
+      if (handle !== null) {
+        deps.timers.clearInterval(handle)
+        handle = null
+      }
+      for (const paperId of Object.keys(ledger)) {
+        const sec = ledger[paperId] ?? 0
+        delete ledger[paperId]
+        if (sec > 0) deps.onFlush(paperId, sec)
+      }
+    }
+  }
+}
+
+/** 进度账视图（结构类型——ScrollProgress 满足；互不 import 红线，票面§3） */
+export interface ProgressAccountView {
+  /** 取走该 tab 的待落页码（不落库——落库归复合 flusher 单通道） */
+  takePending(paperId: string): number | undefined
+  /** 待落账 pid 清单（flushAll 并集遍历） */
+  pendingIds(): string[]
+}
+
+export interface CompositeFlusherDeps {
+  /** 单通道落库口（装配注入 api.reader.saveProgress） */
+  saveProgress(paperId: string, page: number, secondsDelta: number): void | Promise<void>
+  /** 页码缺席时该 tab 的当前页（store tab.page） */
+  currentPageOf(paperId: string): number
+}
+
+/** 复合 flusher（装配面注册进 store.registerProgressFlusher——closeTab/close
+ *  消费）：进度页+时长账一次 invoke（sec>0||page 在场才发；两账皆空零 invoke） */
+export function createCompositeProgressFlusher(
+  sp: ProgressAccountView,
+  rt: ReadingTime,
+  deps: CompositeFlusherDeps
+): { flush(paperId: string): void; flushAll(): void } {
+  const invokeOne = (paperId: string, page: number | undefined, sec: number): void => {
+    if (page === undefined && sec <= 0) return
+    try {
+      // 尽力而为（进度/时长非关键数据，同步抛错/拒绝均吞——scroll-progress 同规约）
+      void Promise.resolve(
+        deps.saveProgress(paperId, page ?? deps.currentPageOf(paperId), sec)
+      ).then(
+        () => undefined,
+        () => undefined
+      )
+    } catch {
+      /* 吞错 */
+    }
+  }
+  return {
+    flush(paperId) {
+      invokeOne(paperId, sp.takePending(paperId), rt.collectAndZero(paperId))
+    },
+    flushAll() {
+      const rtAll = rt.collectAllAndZero()
+      const pids = new Set([...Object.keys(rtAll), ...sp.pendingIds()])
+      for (const pid of pids) invokeOne(pid, sp.takePending(pid), rtAll[pid] ?? 0)
+    }
+  }
+}
+
+/** 装配工厂：真实 deps（Date.now/setInterval/document.visibilityState） */
+export function createReaderReadingTime(
+  onFlush: (paperId: string, seconds: number) => void
+): ReadingTime {
+  return createReadingTime({
+    isVisible: () => document.visibilityState === 'visible',
+    now: () => Date.now(),
+    timers: {
+      setInterval: (fn, ms) => setInterval(fn, ms),
+      clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>)
+    },
+    onFlush
+  })
+}
+
+/** 装配效应集（ReaderPage 组合根消费）：
+ * - ready 效应：paperId 就绪（ready×fileUrl 在场）start，否则 stop（R10：
+ *   loading/error 零累积；R4：切 tab stop→start 成对）；
+ * - visibilitychange 监听成对（hidden 暂停/visible 恢复——R3）；
+ * - 卸载：dispose 尾账经 onFlush 上抛（R7）。 */
+export function useReadingTimeWiring(
+  rt: ReadingTime,
+  paperId: string | null,
+  ready: boolean
+): void {
+  useEffect(() => {
+    if (paperId !== null && ready) rt.start(paperId)
+    else rt.stop()
+    return () => rt.stop()
+  }, [rt, paperId, ready])
+  useEffect(() => {
+    const onVis = (): void => rt.onVisibilityChange()
+    document.addEventListener('visibilitychange', onVis)
+    return () => {
+      document.removeEventListener('visibilitychange', onVis)
+      rt.dispose()
+    }
+  }, [rt])
+}
diff --git a/src/renderer/features/reader/scroll-progress.ts b/src/renderer/features/reader/scroll-progress.ts
index f1c6dd288a..44f1c214e5 100644
--- a/src/renderer/features/reader/scroll-progress.ts
+++ b/src/renderer/features/reader/scroll-progress.ts
@@ -49,6 +49,7 @@ import { nearestPage } from './PageColumn'
 import { effectiveZoom } from './scroll-converge'
 import { api } from '../../api/client'
 import { useReaderStore } from './reader.store'
+import type { ProgressFlusher } from './reader.store'
 
 /** 滚动位置状态机六态（票面字面） */
 export type ScrollStateName = 'idle' | 'scrolling' | 'pending' | 'writing' | 'restoring' | 'loading'
@@ -85,6 +86,11 @@ export interface ScrollProgress {
   beginProgramScroll(page: number): void
   /** 关 tab：该 tab 的 pending 立即落库（store.closeTab 经 flusher 接线调用） */
   flushPending(paperId: string): void
+  /** P7E-05 复合 flusher 消费口：取走该 tab 的待落页码（不落库——落库归
+   *  复合 flusher 单通道合并时长账一次 invoke；无账返回 undefined） */
+  takePending(paperId: string): number | undefined
+  /** P7E-05 复合 flusher 消费口：待落账 pid 清单（flushAll 并集遍历） */
+  pendingIds(): string[]
   /** 全关/卸载：整账本一次收 */
   flushAll(): void
   stateOf(paperId: string): ScrollStateName
@@ -249,6 +255,16 @@ export function createScrollProgress(deps: ScrollProgressDeps): ScrollProgress {
       void saveOne(pid, page)
     },
 
+    takePending(pid) {
+      const page = pending[pid]
+      delete pending[pid]
+      return page
+    },
+
+    pendingIds() {
+      return Object.keys(pending)
+    },
+
     flushAll() {
       flushLedger()
     },
@@ -313,23 +329,26 @@ export function createReaderScrollProgress(
 /**
  * 装配效应集（ReaderPage 组合根消费；wheel/pointerdown 接管经 JSX 内联 prop，
  * keydown 因 keymap 全局而挂 document）：
- * - flusher 注册/注销成对（store.closeTab/close 经回调立即收账——拆链接线）；
+ * - flusher 注册/注销成对（store.closeTab/close 经回调立即收账——拆链接线；
+ *   P7E-05 起注册体=装配面注入的复合 flusher：进度页+时长账单通道合并，
+ *   裸 sp 落库形态退役）；
  * - 换文献 beginLoading；scrollRequest（程序跳页/恢复）→beginProgramScroll。
  */
 export function useScrollProgressWiring(
   sp: ScrollProgress,
   fileUrl: string | null,
   paperId: string | null,
-  columnScroll: { page: number } | null
+  columnScroll: { page: number } | null,
+  flusher: ProgressFlusher
 ): void {
   const register = useReaderStore((s) => s.registerProgressFlusher)
   useEffect(() => {
-    register({ flush: (pid) => sp.flushPending(pid), flushAll: () => sp.flushAll() })
+    register(flusher)
     return () => {
       register(null)
       sp.dispose()
     }
-  }, [register, sp])
+  }, [register, sp, flusher])
   useEffect(() => {
     // 换文献/首开：丢弃旧页文本后进入 loading（页列就绪前 scroll 不记账）
     if (paperId !== null) sp.beginLoading(paperId)
diff --git a/src/renderer/shared/reading-time-format.ts b/src/renderer/shared/reading-time-format.ts
new file mode 100644
index 0000000000..2fcefb5775
--- /dev/null
+++ b/src/renderer/shared/reading-time-format.ts
@@ -0,0 +1,13 @@
+/**
+ * 阅读时长显示纯函数（P7E-05）——定义单源驻 renderer/shared（check-quality
+ * 跨 feature 关卡指定的共享下沉位：library/PaperDetailPanel 与
+ * reader/reading-time 双 feature 消费；reader/reading-time.ts re-export
+ * 转发=受锁测试 import 面零改）。
+ */
+/** <60min「N 分钟」（按分钟取整=floor，宁少勿多）；≥60min「N 小时 M 分」 */
+export function formatReadingTime(seconds: number): string {
+  const totalMin = Math.floor(seconds / 60)
+  if (totalMin < 60) return `${totalMin} 分钟`
+  const hours = Math.floor(totalMin / 60)
+  return `${hours} 小时 ${totalMin % 60} 分`
+}
diff --git a/src/shared/ipc/schemas.ts b/src/shared/ipc/schemas.ts
index 9a3a763fd5..0e8af6465d 100644
--- a/src/shared/ipc/schemas.ts
+++ b/src/shared/ipc/schemas.ts
@@ -56,7 +56,13 @@ export const annotationIdReqSchema = z
 export const annotationListResSchema = z.array(annotationSchema)
 
 export const saveProgressReqSchema = z
-  .object({ paperId: z.string().min(1), page: z.number().int().min(0) })
+  .object({
+    paperId: z.string().min(1),
+    page: z.number().int().min(0),
+    // P7E-05 阅读时长搭车（可选=旧载荷零兼容破坏；上限 3600=单次 flush
+    // 上界防异常大值；缺省 0=reading_seconds 不动）
+    secondsDelta: z.number().int().min(0).max(3600).optional()
+  })
   .strict()
 export const trueAckSchema = z.object({ ok: z.literal(true) }).strict()
 
diff --git a/src/shared/models/paper.ts b/src/shared/models/paper.ts
index 3523db943a..368892b7d8 100644
--- a/src/shared/models/paper.ts
+++ b/src/shared/models/paper.ts
@@ -45,7 +45,10 @@ export const paperDetailSchema = paperSummarySchema
     // detailById 配对透出，无缓存时省略；ENR-02 装配数据通道）
     citedByCount: z.number().int().optional(),
     citedByFetchedAt: z.string().optional(), // ISO 8601（缓存抓取时间）
-    citedByCountSource: paperSourceSchema.optional() // 命中的瀑布源
+    citedByCountSource: paperSourceSchema.optional(), // 命中的瀑布源
+    // P7E-05 阅读时长（008 迁移列 reading_seconds；detailById 直读——必填：
+    // NOT NULL DEFAULT 0 读面恒有值）
+    readingSeconds: z.number().int().min(0)
   })
   .strict()
 export type PaperDetail = z.infer<typeof paperDetailSchema>
diff --git a/tests/e2e/reader-reading-time.spec.ts b/tests/e2e/reader-reading-time.spec.ts
new file mode 100644
index 0000000000..b10ac421c3
--- /dev/null
+++ b/tests/e2e/reader-reading-time.spec.ts
@@ -0,0 +1,98 @@
+import { test, expect } from '@playwright/test'
+import { copyFile, mkdtemp, readdir, readFile, writeFile } from 'node:fs/promises'
+import { mkdirSync, writeFileSync } from 'node:fs'
+import { createHash } from 'node:crypto'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+import { spawn } from 'node:child_process'
+import { isTicketDone } from '../../tickets/registry'
+import { createTinyPdf } from '../utils/pdf-factory'
+import { launch, seedPaperRow } from './e2e-env'
+
+/**
+ * P7E-05 阅读时长 e2e（装配级显示面冒烟，1 综合用例）。
+ * 链：建库 v8→种子 1 篇真实 PDF→**降级 v7**（DROP COLUMN reading_seconds+
+ * user_version=7——存量库形态）→重启应用（migrate 补 008 加列，存量行补 0=
+ * 升级链不崩）→文献库选中→详情面板「阅读」行「0 分钟」在场（008→repo→
+ * PaperDetail→UI 全链，DEFAULT 0 直读）。时间流逝不加速不断言（票面申报：
+ * 计时面以注入 now 单测全锚，本 spec 只做显示面+迁移升级链冒烟）。
+ * 降级子进程=spawn -e（不落盘脚本；ABI 切换照 e2e-env.seedPaperRow 形态——
+ * 受锁件禁改，本地第二份，Rule of Three 保持重复）。
+ * 激活条件：库列表/详情面板链既有工单（本票面随实现原子生效）。
+ */
+const DEPS = ['SR-LIB-01', 'SR-LIB-02', 'SR2-C-06'] as const
+
+test.setTimeout(120_000)
+
+/** 子进程把库降级为 v7 形（DROP COLUMN+PRAGMA user_version=7——存量库模拟） */
+async function downgradeToV7(userData: string): Promise<void> {
+  const pkgDir = join(process.cwd(), 'node_modules', 'better-sqlite3')
+  const releaseBinding = join(pkgDir, 'build', 'Release', 'better_sqlite3.node')
+  const cacheDir = join(pkgDir, 'abi-cache')
+  const wanted = `node-v${process.versions.modules}`
+  const dirs = (await readdir(cacheDir)).filter((d) => d.startsWith('node-v'))
+  const pick = dirs.includes(wanted) ? wanted : (dirs.sort().at(-1) ?? '')
+  if (!pick) throw new Error('abi-cache 缺 node 绑定——先跑 npm ci（postinstall 会 setup）')
+  const electronBinding = await readFile(releaseBinding)
+  await copyFile(join(cacheDir, pick, 'better_sqlite3.node'), releaseBinding)
+  try {
+    const sql = 'ALTER TABLE papers DROP COLUMN reading_seconds; PRAGMA user_version = 7;'
+    await new Promise<void>((resolve, reject) => {
+      const child = spawn(
+        process.execPath,
+        [
+          '-e',
+          'const D=require("better-sqlite3");const db=D(process.argv[1]);try{db.exec(process.argv[2])}finally{db.close()}',
+          join(userData, 'synapse.db'),
+          sql
+        ],
+        { env: process.env, stdio: 'inherit' }
+      )
+      child.on('exit', (code) => {
+        if (code === 0) {
+          resolve()
+        } else {
+          reject(new Error(`降级子进程退出码 ${code ?? 'null'}`))
+        }
+      })
+      child.on('error', reject)
+    })
+  } finally {
+    await writeFile(releaseBinding, electronBinding)
+  }
+}
+
+test('P7E-05 阅读时长：存量库升级链不崩+详情面板「阅读 0 分钟」在场', async () => {
+  const pending = DEPS.filter((d) => !isTicketDone(d))
+  test.skip(pending.length > 0, `延期：依赖工单未完成 [${pending.join(', ')}]`)
+
+  const title = '智慧水务 阅读时长 e2e 文献'
+  const userData = await mkdtemp(join(tmpdir(), 'synapse-rt-'))
+
+  // 第一跳：让应用自己完成建库迁移（不 import src 内部模块——export-clipboard 同型）
+  const seedApp = await launch(userData)
+  await (await seedApp.firstWindow()).waitForTimeout(500)
+  await seedApp.close()
+
+  // 种子：1 篇真实单页 PDF（sha 唯一约束——content-addressed files/ 布局）
+  const bytes = createTinyPdf(title)
+  const sha = createHash('sha256').update(bytes).digest('hex')
+  const fileRef = `${sha.slice(0, 2)}/${sha.slice(2, 4)}/${sha}.pdf`
+  const abs = join(userData, 'files', ...fileRef.split('/'))
+  mkdirSync(dirname(abs), { recursive: true })
+  writeFileSync(abs, bytes)
+  await seedPaperRow(userData, fileRef, sha, title, 'e2e-reading-time-paper')
+
+  // 降级 v7（存量库形态：无 reading_seconds 列+user_version=7）
+  await downgradeToV7(userData)
+
+  // 重启：migrate 补 008（加列+存量行补 0）——升级链不崩=应用可进列表
+  const app = await launch(userData)
+  const win = await app.firstWindow()
+  await expect(win.getByRole('button', { name: '文献库' })).toBeVisible({ timeout: 20_000 })
+  await win.getByText(title).first().click()
+  // 显示面冒烟：meta 区「阅读」行「0 分钟」在场（DEFAULT 0 直读全链）
+  await expect(win.getByText('阅读', { exact: true })).toBeVisible({ timeout: 20_000 })
+  await expect(win.getByText('0 分钟', { exact: true })).toBeVisible()
+  await app.close()
+})
diff --git a/tests/unit/db/migrate-reading-time.test.ts b/tests/unit/db/migrate-reading-time.test.ts
new file mode 100644
index 0000000000..327b09b03b
--- /dev/null
+++ b/tests/unit/db/migrate-reading-time.test.ts
@@ -0,0 +1,44 @@
+import { describe, expect, it } from 'vitest'
+import { openDatabase } from '../../../src/main/db/connection'
+import { MIGRATIONS, migrate, readUserVersion } from '../../../src/main/db/migrate'
+
+/**
+ * P7E-05 R9：008 reading_time 迁移锁定测试（新文件——migrate.test.ts 受锁零改）。
+ * 覆盖：新库全量到 8（列在位+DEFAULT 0）+存量 v7 库升级路径（仅应用 008、
+ * 存量行补 0、user_version=8）。always-active（不经 guardedDescribe）。
+ */
+describe('db/migrate —— 008 reading_time（P7E-05 R9）', () => {
+  it('新库：全量应用到 8，papers.reading_seconds 列在位且 DEFAULT 0', () => {
+    const db = openDatabase(':memory:')
+    const result = migrate(db)
+    expect(result.currentVersion).toBe(8)
+    expect(readUserVersion(db)).toBe(8)
+    db.prepare(
+      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at)
+       VALUES ('p1', 'a/b/c.pdf', 'sha-1', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')`
+    ).run()
+    const row = db.prepare('SELECT reading_seconds FROM papers WHERE id = ?').get('p1') as {
+      reading_seconds: number
+    }
+    expect(row.reading_seconds).toBe(0)
+    db.close()
+  })
+
+  it('存量 v7 库升级：仅应用 008，存量行 reading_seconds 补 0，user_version=8', () => {
+    const db = openDatabase(':memory:')
+    // 构造存量库：只应用 1..7（migrations 参数注入=测试合法面，migrate() 契约）
+    migrate(db, MIGRATIONS.filter((m) => m.version <= 7))
+    db.prepare(
+      `INSERT INTO papers (id, file_ref, sha256, added_at, updated_at)
+       VALUES ('legacy-1', 'x/y.pdf', 'sha-legacy', '2025-06-01T00:00:00Z', '2025-06-01T00:00:00Z')`
+    ).run()
+    const result = migrate(db)
+    expect(result.appliedVersions).toEqual([8])
+    expect(readUserVersion(db)).toBe(8)
+    const row = db.prepare('SELECT reading_seconds FROM papers WHERE id = ?').get('legacy-1') as {
+      reading_seconds: number
+    }
+    expect(row.reading_seconds).toBe(0)
+    db.close()
+  })
+})
diff --git a/tests/unit/db/migrate.test.ts b/tests/unit/db/migrate.test.ts
index 15480c2c8d..dcda1200d9 100644
--- a/tests/unit/db/migrate.test.ts
+++ b/tests/unit/db/migrate.test.ts
@@ -7,7 +7,7 @@ describe('db/migrate —— 迁移执行器', () => {
   it('新库：全量应用，user_version = 最新版本', () => {
     const db = openDatabase(':memory:')
     const result = migrate(db)
-    expect(result.appliedVersions).toEqual([1, 2, 3, 4, 5, 6, 7])
+    expect(result.appliedVersions).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
     expect(result.currentVersion).toBe(Math.max(...MIGRATIONS.map((m) => m.version)))
     expect(readUserVersion(db)).toBe(result.currentVersion)
     db.close()
diff --git a/tests/unit/db/papers-reading-time.test.ts b/tests/unit/db/papers-reading-time.test.ts
new file mode 100644
index 0000000000..ec02b45a6b
--- /dev/null
+++ b/tests/unit/db/papers-reading-time.test.ts
@@ -0,0 +1,69 @@
+import { beforeEach, describe, expect, it } from 'vitest'
+import { createPapersRepo, type PaperRow } from '../../../src/main/db/repos/papers.repo'
+import type { SqliteDb } from '../../../src/main/db/connection'
+import { createTestDb } from '../../utils/fixtures'
+
+/**
+ * P7E-05：papers.repo reading_seconds 读写锁定测试（新文件——papers.repo.test
+ * 受锁零改）。覆盖：updateReadPage 第三参原子累加（两次 +30+45=75，非覆盖）+
+ * R8 缺省第三参=0（旧调用方兼容锚——reading_seconds 不变）+detailById 回读
+ * readingSeconds。always-active（不经 guardedDescribe）。
+ */
+function row(over: Partial<PaperRow> = {}): PaperRow {
+  return {
+    id: over.id ?? 'p-1',
+    file_ref: over.file_ref ?? 'ab/cd/aaa.pdf',
+    sha256: over.sha256 ?? 'sha-aaa',
+    title: over.title ?? '阅读时长测试文献',
+    authors_json: over.authors_json ?? '["张三"]',
+    year: over.year ?? 2025,
+    venue: over.venue ?? '水利学报',
+    doi: over.doi ?? null,
+    arxiv_id: over.arxiv_id ?? null,
+    abstract: over.abstract ?? '',
+    source: over.source ?? 'local',
+    enrich_status: over.enrich_status ?? 'pending',
+    added_at: over.added_at ?? '2026-01-01T00:00:00Z',
+    updated_at: over.updated_at ?? '2026-01-01T00:00:00Z',
+    last_read_page: over.last_read_page ?? 0
+  }
+}
+
+describe('papers.repo —— reading_seconds（P7E-05）', () => {
+  let db: SqliteDb
+  let repo: ReturnType<typeof createPapersRepo>
+
+  beforeEach(() => {
+    db = createTestDb()
+    repo = createPapersRepo(db)
+  })
+
+  it('updateReadPage 第三参原子累加：两次 +30+45=75（非覆盖）', () => {
+    repo.insert(row())
+    repo.updateReadPage('p-1', 3, 30)
+    repo.updateReadPage('p-1', 5, 45)
+    const r = db.prepare('SELECT last_read_page, reading_seconds FROM papers WHERE id = ?').get('p-1') as {
+      last_read_page: number
+      reading_seconds: number
+    }
+    expect(r.last_read_page).toBe(5)
+    expect(r.reading_seconds).toBe(75)
+  })
+
+  it('R8：第三参缺省=0——reading_seconds 不变（旧调用方兼容锚）', () => {
+    repo.insert(row())
+    repo.updateReadPage('p-1', 3, 30)
+    repo.updateReadPage('p-1', 7)
+    const r = db.prepare('SELECT reading_seconds FROM papers WHERE id = ?').get('p-1') as {
+      reading_seconds: number
+    }
+    expect(r.reading_seconds).toBe(30)
+  })
+
+  it('detailById 回读 readingSeconds（008 迁移列→PaperDetail 必填字段）', () => {
+    repo.insert(row())
+    expect(repo.detailById('p-1')?.readingSeconds).toBe(0)
+    repo.updateReadPage('p-1', 3, 30)
+    expect(repo.detailById('p-1')?.readingSeconds).toBe(30)
+  })
+})
diff --git a/tests/unit/renderer/paper-detail-cited.test.tsx b/tests/unit/renderer/paper-detail-cited.test.tsx
index cbd50c1e4a..eb227d4aea 100644
--- a/tests/unit/renderer/paper-detail-cited.test.tsx
+++ b/tests/unit/renderer/paper-detail-cited.test.tsx
@@ -46,6 +46,7 @@ function makeDetail(): PaperDetail {
     annotationCount: 0,
     noteCount: 1,
     lastReadPage: 0,
+    readingSeconds: 0,
     addedAt: 't',
     abstract: '',
     arxivId: null,
diff --git a/tests/unit/renderer/paper-detail-clip.test.tsx b/tests/unit/renderer/paper-detail-clip.test.tsx
index 2c2f17141d..c0ae12ca31 100644
--- a/tests/unit/renderer/paper-detail-clip.test.tsx
+++ b/tests/unit/renderer/paper-detail-clip.test.tsx
@@ -51,6 +51,7 @@ function makeDetail(): PaperDetail {
     annotationCount: 2,
     noteCount: 1,
     lastReadPage: 0,
+    readingSeconds: 0,
     addedAt: '2026-08-24T00:00:00Z',
     abstract: '摘要内容',
     arxivId: null,
diff --git a/tests/unit/renderer/paper-detail-export.test.tsx b/tests/unit/renderer/paper-detail-export.test.tsx
index 54299b2e8b..be883aa655 100644
--- a/tests/unit/renderer/paper-detail-export.test.tsx
+++ b/tests/unit/renderer/paper-detail-export.test.tsx
@@ -49,6 +49,7 @@ function makeDetail(): PaperDetail {
     annotationCount: 2,
     noteCount: 1,
     lastReadPage: 0,
+    readingSeconds: 0,
     addedAt: '2026-08-24T00:00:00Z',
     abstract: '摘要内容',
     arxivId: null,
diff --git a/tests/unit/renderer/paper-detail-notes-off.test.tsx b/tests/unit/renderer/paper-detail-notes-off.test.tsx
index e1dd8ba4e8..8d2243f036 100644
--- a/tests/unit/renderer/paper-detail-notes-off.test.tsx
+++ b/tests/unit/renderer/paper-detail-notes-off.test.tsx
@@ -48,6 +48,7 @@ function makeDetail(): PaperDetail {
     annotationCount: 0,
     noteCount: 1,
     lastReadPage: 0,
+    readingSeconds: 0,
     addedAt: 't',
     abstract: '',
     arxivId: null,
diff --git a/tests/unit/renderer/reading-time.test.ts b/tests/unit/renderer/reading-time.test.ts
new file mode 100644
index 0000000000..4e01735c69
--- /dev/null
+++ b/tests/unit/renderer/reading-time.test.ts
@@ -0,0 +1,235 @@
+import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
+import {
+  createCompositeProgressFlusher,
+  createReadingTime,
+  formatReadingTime,
+  READING_TICK_MS,
+  type ReadingTime,
+  type ReadingTimeDeps
+} from '../../../src/renderer/features/reader/reading-time'
+
+/**
+ * P7E-05：reading-time 时长账本+复合 flusher 锁定测试。
+ * 覆盖：态空间跨格序列 R1~R7+R10（ready×visible 计时门/tick 累账/hidden 零
+ * 累积/切 tab stop-start/关 tab flush/关应用 flushAll/卸载 dispose 尾账/
+ * 未就绪零累积）+零头按实结转+复合 flusher 单通道合并语义+formatReadingTime
+ * 边界。时间全注入（now 可控+fake timers 经 deps.timers——禁真 timer，
+ * scroll-progress.test 同法）；always-active（不经 guardedDescribe）。
+ */
+
+/** 全注入测试台：时钟/可见性/onFlush 可操纵；advance 同步推 now 与 fake timer */
+function makeHarness() {
+  let nowMs = 0
+  let visible = true
+  const flushed: Array<{ paperId: string; seconds: number }> = []
+  const deps: ReadingTimeDeps = {
+    isVisible: () => visible,
+    now: () => nowMs,
+    timers: {
+      setInterval: (fn, ms) => setInterval(fn, ms),
+      clearInterval: (h) => clearInterval(h as ReturnType<typeof setInterval>)
+    },
+    onFlush: (paperId, seconds) => {
+      flushed.push({ paperId, seconds })
+    }
+  }
+  const rt: ReadingTime = createReadingTime(deps)
+  return {
+    rt,
+    flushed,
+    advance(ms: number): void {
+      nowMs += ms
+      vi.advanceTimersByTime(ms)
+    },
+    setVisible(v: boolean): void {
+      visible = v
+    },
+    ledger(pid: string): number {
+      return rt.ledgerOf(pid)
+    }
+  }
+}
+
+/** 进度账视图桩（ScrollProgress 结构子集——takePending 取走不落库语义） */
+function makeSpView(pending: Record<string, number>) {
+  return {
+    takePending: (pid: string): number | undefined => {
+      const page = pending[pid]
+      delete pending[pid]
+      return page
+    },
+    pendingIds: (): string[] => Object.keys(pending)
+  }
+}
+
+/** 复合 flusher 测试台：saved 记录单通道 invoke 三元组 */
+function makeFlusher(
+  pending: Record<string, number>,
+  rt: ReadingTime,
+  currentPage = 9
+): {
+  flush(paperId: string): void
+  flushAll(): void
+  saved: Array<{ paperId: string; page: number; secondsDelta: number }>
+} {
+  const saved: Array<{ paperId: string; page: number; secondsDelta: number }> = []
+  const flusher = createCompositeProgressFlusher(makeSpView(pending), rt, {
+    saveProgress: (paperId, page, secondsDelta) => {
+      saved.push({ paperId, page, secondsDelta })
+    },
+    currentPageOf: () => currentPage
+  })
+  return { ...flusher, saved }
+}
+
+beforeEach(() => {
+  vi.useFakeTimers()
+})
+
+afterEach(() => {
+  vi.useRealTimers()
+})
+
+describe('reading-time 态空间跨格序列（R1~R7+R10）', () => {
+  it('R1：ready+visible tick 3 次→ledger=45s；无 invoke（防抖归进度管线）', () => {
+    const h = makeHarness()
+    h.rt.start('p-1')
+    h.advance(READING_TICK_MS)
+    h.advance(READING_TICK_MS)
+    h.advance(READING_TICK_MS)
+    expect(h.ledger('p-1')).toBe(45)
+    expect(h.flushed).toHaveLength(0)
+  })
+
+  it('R2：R1 后复合 flush(pid)→单次 saveProgress(pendingPage, 45)；ledger 清零', () => {
+    const h = makeHarness()
+    const pending: Record<string, number> = { 'p-1': 3 }
+    const f = makeFlusher(pending, h.rt)
+    h.rt.start('p-1')
+    h.advance(45_000)
+    f.flush('p-1')
+    expect(f.saved).toEqual([{ paperId: 'p-1', page: 3, secondsDelta: 45 }])
+    expect(h.ledger('p-1')).toBe(0)
+  })
+
+  it('R3：visible→hidden→visible——hidden 段零累积（门关）；恢复后续算', () => {
+    const h = makeHarness()
+    h.rt.start('p-1')
+    h.advance(READING_TICK_MS)
+    h.setVisible(false)
+    h.rt.onVisibilityChange()
+    h.advance(60_000)
+    h.setVisible(true)
+    h.rt.onVisibilityChange()
+    h.advance(READING_TICK_MS)
+    expect(h.ledger('p-1')).toBe(30)
+  })
+
+  it('R4：切 tab（A→B）A stop 账留存+B start；离开段不计任何账', () => {
+    const h = makeHarness()
+    h.rt.start('A')
+    h.advance(30_000)
+    h.rt.stop()
+    h.advance(15_000)
+    h.rt.start('B')
+    h.advance(15_000)
+    h.rt.stop()
+    h.rt.start('A')
+    h.advance(15_000)
+    expect(h.ledger('A')).toBe(45)
+    expect(h.ledger('B')).toBe(15)
+  })
+
+  it('R5：关 tab flush(pid) 消费 sp 账——随后 flushAll 对该 pid 零二次 invoke（不双写）', () => {
+    const h = makeHarness()
+    const pending: Record<string, number> = { 'p-1': 2 }
+    const f = makeFlusher(pending, h.rt)
+    h.rt.start('p-1')
+    h.advance(15_000)
+    f.flush('p-1')
+    f.flushAll()
+    expect(f.saved).toEqual([{ paperId: 'p-1', page: 2, secondsDelta: 15 }])
+  })
+
+  it('R6：flushAll 遍历全 ledger——纯时长/纯页码/双账三形（page 缺席取当前页）', () => {
+    const h = makeHarness()
+    const pending: Record<string, number> = { 'p-page': 4 }
+    const f = makeFlusher(pending, h.rt, 9)
+    h.rt.start('p-sec')
+    h.advance(30_000)
+    h.rt.stop()
+    h.rt.start('p-both')
+    h.advance(15_000)
+    h.rt.stop()
+    f.flushAll()
+    expect(f.saved).toContainEqual({ paperId: 'p-sec', page: 9, secondsDelta: 30 })
+    expect(f.saved).toContainEqual({ paperId: 'p-page', page: 4, secondsDelta: 0 })
+    expect(f.saved).toContainEqual({ paperId: 'p-both', page: 9, secondsDelta: 15 })
+    expect(f.saved).toHaveLength(3)
+  })
+
+  it('R7：dispose 尾账 flush（onFlush 上抛装配面——卸载/切视图收尾）', () => {
+    const h = makeHarness()
+    h.rt.start('p-1')
+    h.advance(30_000)
+    h.rt.dispose()
+    expect(h.flushed).toEqual([{ paperId: 'p-1', seconds: 30 }])
+    h.advance(60_000)
+    expect(h.flushed).toHaveLength(1)
+  })
+
+  it('R10：tab 未就绪（loading/error——start 缺席）零累积', () => {
+    const h = makeHarness()
+    h.advance(60_000)
+    expect(h.ledger('p-1')).toBe(0)
+  })
+
+  it('R3×R6 跨格：hidden 中 force 结算零吸收——collectAllAndZero/collectAndZero 仅含 visible 段', () => {
+    const h = makeHarness()
+    h.rt.start('p-1')
+    h.advance(30_000)
+    h.setVisible(false)
+    h.rt.onVisibilityChange()
+    h.advance(60_000)
+    expect(h.rt.collectAllAndZero()).toEqual({ 'p-1': 30 })
+    expect(h.ledger('p-1')).toBe(0)
+    h.setVisible(true)
+    h.rt.onVisibilityChange()
+    h.advance(15_000)
+    h.setVisible(false)
+    h.rt.onVisibilityChange()
+    h.advance(30_000)
+    expect(h.rt.collectAndZero('p-1')).toBe(15)
+  })
+
+  it('零头按实结转：不足 tick 的零头随 flush 结转（now 差值计，floor 秒）', () => {
+    const h = makeHarness()
+    const pending: Record<string, number> = {}
+    const f = makeFlusher(pending, h.rt)
+    h.rt.start('p-1')
+    h.advance(READING_TICK_MS)
+    h.advance(7_000)
+    f.flush('p-1')
+    expect(f.saved).toEqual([{ paperId: 'p-1', page: 9, secondsDelta: 22 }])
+  })
+
+  it('tick 常量=15s（票面：READING_TICK_MS）', () => {
+    expect(READING_TICK_MS).toBe(15_000)
+  })
+})
+
+describe('reading-time formatReadingTime 边界（纯函数）', () => {
+  it('<60min 按分钟取整：0/59/60/61/125', () => {
+    expect(formatReadingTime(0)).toBe('0 分钟')
+    expect(formatReadingTime(59)).toBe('0 分钟')
+    expect(formatReadingTime(60)).toBe('1 分钟')
+    expect(formatReadingTime(61)).toBe('1 分钟')
+    expect(formatReadingTime(125)).toBe('2 分钟')
+  })
+
+  it('≥60min：N 小时 M 分', () => {
+    expect(formatReadingTime(3_600)).toBe('1 小时 0 分')
+    expect(formatReadingTime(3_661)).toBe('1 小时 1 分')
+    expect(formatReadingTime(4_525)).toBe('1 小时 15 分')
+  })
+})
diff --git a/tests/unit/services/corpus.assemble.test.ts b/tests/unit/services/corpus.assemble.test.ts
index e423e077b3..75cfea9e42 100644
--- a/tests/unit/services/corpus.assemble.test.ts
+++ b/tests/unit/services/corpus.assemble.test.ts
@@ -38,6 +38,7 @@ const detail: PaperDetail = {
   annotationCount: 2,
   noteCount: 1,
   lastReadPage: 0,
+  readingSeconds: 0,
   addedAt: '2026-01-01T00:00:00Z',
   abstract: 'abs',
   arxivId: null,
diff --git a/tests/unit/services/enrich.service.test.ts b/tests/unit/services/enrich.service.test.ts
index f3cfc675a0..451908fd20 100644
--- a/tests/unit/services/enrich.service.test.ts
+++ b/tests/unit/services/enrich.service.test.ts
@@ -49,6 +49,7 @@ const detail: PaperDetail = {
   annotationCount: 0,
   noteCount: 0,
   lastReadPage: 0,
+  readingSeconds: 0,
   addedAt: 't',
   abstract: '',
   arxivId: null,
diff --git a/tests/unit/services/export.service.test.ts b/tests/unit/services/export.service.test.ts
index dbfecf5ca8..63a8ab2fb0 100644
--- a/tests/unit/services/export.service.test.ts
+++ b/tests/unit/services/export.service.test.ts
@@ -16,6 +16,7 @@ const detail: PaperDetail = {
   annotationCount: 0,
   noteCount: 0,
   lastReadPage: 0,
+  readingSeconds: 0,
   addedAt: 't',
   abstract: 'abs',
   arxivId: null,
diff --git a/tests/unit/services/library.service.test.ts b/tests/unit/services/library.service.test.ts
index 23d23538b2..9a45c16a3b 100644
--- a/tests/unit/services/library.service.test.ts
+++ b/tests/unit/services/library.service.test.ts
@@ -28,6 +28,7 @@ const detail: PaperDetail = {
   annotationCount: 0,
   noteCount: 0,
   lastReadPage: 0,
+  readingSeconds: 0,
   addedAt: 't',
   abstract: '',
   arxivId: null,
diff --git a/tests/unit/services/lineage-tags.test.ts b/tests/unit/services/lineage-tags.test.ts
index 85597af37c..8c82250123 100644
--- a/tests/unit/services/lineage-tags.test.ts
+++ b/tests/unit/services/lineage-tags.test.ts
@@ -58,9 +58,9 @@ beforeEach(() => {
 // ── 迁移 007：tags 列+存量兼容 ─────────────────────────────────
 
 describe('F-LG14 迁移 007（lineage_nodes.tags）', () => {
-  it('版本接续：MIGRATIONS 含 version 7 且 user_version=7（新库全量）', () => {
+  it('版本接续：MIGRATIONS 含 version 7 且 user_version=8（新库全量，008 落地后）', () => {
     expect(MIGRATIONS.some((m) => m.version === 7)).toBe(true)
-    expect(readUserVersion(db)).toBe(7)
+    expect(readUserVersion(db)).toBe(8)
   })
 
   it('tags 列在场（TEXT 可空）；存量行缺列写入=tags NULL=无标签（零迁移兼容）', () => {
diff --git a/tests/unit/services/markdown.report.test.ts b/tests/unit/services/markdown.report.test.ts
index fc96237083..33a123e51b 100644
--- a/tests/unit/services/markdown.report.test.ts
+++ b/tests/unit/services/markdown.report.test.ts
@@ -16,6 +16,7 @@ const paper: PaperDetail = {
   annotationCount: 2,
   noteCount: 1,
   lastReadPage: 3,
+  readingSeconds: 0,
   addedAt: '2026-01-01T00:00:00Z',
   abstract: '',
   arxivId: null,
diff --git a/tests/unit/services/reader-time.test.ts b/tests/unit/services/reader-time.test.ts
new file mode 100644
index 0000000000..1b854b0102
--- /dev/null
+++ b/tests/unit/services/reader-time.test.ts
@@ -0,0 +1,61 @@
+import { expect, it } from 'vitest'
+import { createReaderService } from '../../../src/main/services/reader.service'
+import type { Repos } from '../../../src/main/db/repos'
+import type { PaperDetail } from '../../../src/shared/models/paper'
+
+/**
+ * P7E-05：reader.service saveProgress secondsDelta 透传锁定测试（新文件——
+ * reader.service.test 受锁零改）。覆盖：透传第三参到 updateReadPage+R8 缺省 0。
+ * always-active（不经 guardedDescribe）。
+ */
+const detail: PaperDetail = {
+  id: 'p-1',
+  title: 't',
+  authors: [],
+  year: null,
+  venue: '',
+  doi: null,
+  tagNames: [],
+  collectionNames: [],
+  annotationCount: 0,
+  noteCount: 0,
+  lastReadPage: 3,
+  readingSeconds: 0,
+  addedAt: 't',
+  abstract: '',
+  arxivId: null,
+  source: 'local',
+  enrichStatus: 'pending',
+  fileUrl: 'app-file://p-1',
+  fileName: '论文 v2 final.pdf',
+  updatedAt: 't',
+  tags: [],
+  collections: []
+}
+
+/** 桩 repos：宽松类型专供测试（repos 接口同步；updateReadPage 记参） */
+function stubRepos(calls: Array<[string, number, number]>): Repos {
+  const papers = {
+    detailById: () => detail,
+    updateReadPage: (id: string, page: number, secondsDelta: number): void => {
+      calls.push([id, page, secondsDelta])
+    }
+  }
+  return { papers, annotations: {} } as unknown as Repos
+}
+
+it('saveProgress 透传 secondsDelta 第三参到 updateReadPage（时长搭车单通道）', async () => {
+  const calls: Array<[string, number, number]> = []
+  const svc = createReaderService({ repos: stubRepos(calls) })
+  await expect(
+    svc.saveProgress({ paperId: 'p-1', page: 5, secondsDelta: 45 })
+  ).resolves.toEqual({ ok: true })
+  expect(calls).toEqual([['p-1', 5, 45]])
+})
+
+it('R8：secondsDelta 缺省→第三参 0（旧调用方零破坏）', async () => {
+  const calls: Array<[string, number, number]> = []
+  const svc = createReaderService({ repos: stubRepos(calls) })
+  await expect(svc.saveProgress({ paperId: 'p-1', page: 2 })).resolves.toEqual({ ok: true })
+  expect(calls).toEqual([['p-1', 2, 0]])
+})
diff --git a/tests/unit/services/reader.service.test.ts b/tests/unit/services/reader.service.test.ts
index 286f8cace5..53ca99e0ae 100644
--- a/tests/unit/services/reader.service.test.ts
+++ b/tests/unit/services/reader.service.test.ts
@@ -17,6 +17,7 @@ const detail: PaperDetail = {
   annotationCount: 0,
   noteCount: 0,
   lastReadPage: 3,
+  readingSeconds: 0,
   addedAt: 't',
   abstract: '',
   arxivId: null,

```

## 4. 实现者报告（三轮全程含 R1 回炉）

# P7E-05 实现报告 —— 阅读时长统计（TDD 全流程完成+主控回炉 R1 已修）

> 状态：**DONE**（verify 全绿 exit=0；BLOCKED 前史=首轮票面×受锁测试互斥申报，
> 主控 11+1 件配套解除后续作完成；主控亲验回炉 R1（settle hidden 段虚计）已修
> ——本报告覆盖全程）
> 开工技能清点：test-driven-development/verification-before-completion/
> javascript-testing-patterns/e2e-testing-patterns=用；systematic-debugging=
> 备用（回炉期 2 次 quality/typecheck 红按流程定位）；其余=不用（纯功能票，
> 无部署/云/安全加固面；禁新增依赖故无依赖管理面）。

## 0. 主控回炉 R1 修复记录（2026-09-03 第 1 轮）

- **缺陷**：settle(force=true) 吸收无 isVisible 门——force 路径
  （stop/collectAndZero/collectAllAndZero/dispose）在 hidden 段被调时把
  lastMark→now 整段 hidden 时长虚计入账（可达路径：hidden 中 app 退出→
  closeAll→flushAll→collectAllAndZero；或卸载 dispose）——违背票面①计时门
  「挂后台标签页不算」全路径声明（R3 只锚了 tick 路径，force 是跨格缝）。
- **修复**：settle 吸收与入账同受 `currentPid !== null && deps.isVisible()` 门控；
  lastMark 无条件推进。hidden 期 force 结算=零头留存 liveMs 不入账（恢复续算或
  终局丢弃——<tick 秒级，票面§4 已知边界③口径）。visible 段 force 结算行为
  零变（现有 R1~R7/R10/零头用例无 hidden+force 组合，亲核零破坏）。
- **新锚**：R3×R6 跨格用例（visible 攒账→hidden 推进→collectAllAndZero 仅含
  visible 段 30≠90；变体断言 collectAndZero 同门控语义 15）。
- **M5 变异红证**：删 settle 门控→新用例红（90≠30），cp 备份还原 diff 空
  ——scripts/audits/p7e-05-mutation-m5.raw.txt。
- **锁序**：generate+apply（265 不变；tests/unit/renderer/reading-time.test.ts
  hash 随新用例更新=预期）——scripts/audits/p7e-05-locks-apply-r1.raw.txt。
- **verify R1**：146 文件/1251 用例（+1 新锚）全链绿 exit=0
  ——scripts/audits/p7e-05-verify-r1.raw.txt。


## 1. 实现摘要

按票面①Design 裁决全量落地：搭车 saveProgress 单通道落库+独立时长模块+
复合 flusher。

- **迁移**：`008_reading_time.sql`（`ALTER TABLE papers ADD COLUMN reading_seconds
  INTEGER NOT NULL DEFAULT 0`，001:25 last_read_page 同型）+migrate.ts 清单追加
  `{version:8,name:'reading_time',sql}`（?raw import 七先例同型）。
- **契约**：saveProgressReqSchema +`secondsDelta`（int 0..3600 optional——旧载荷
  零兼容）；PaperDetail +`readingSeconds: number`（必填，008 列 NOT NULL DEFAULT 0
  读面恒有值）；api-surface 零改（trueAck/通道形状不变）。
- **repo/service**：updateReadPage 第三参原子累加
  （`reading_seconds = reading_seconds + ?` 预编译参数绑定，INV-57 唯一写点）；
  DETAIL_SQL+DetailRow+detailById 映射 readingSeconds；reader.service saveProgress
  透传 `req.secondsDelta ?? 0`+头注 :20 预留注记兑现修订（含 002→008 勘误说明）；
  ipc/reader.ts 零改（req 直传形态亲验）。
- **renderer**：`reading-time.ts` 新模块（deps 注入 {isVisible,now,timers,onFlush}
  禁真 timer——scroll-progress 同法；ledger+tick 循环 15s+visibility 门+
  collectAndZero/collectAllAndZero/dispose）；`reading-time-setup.ts` 装配 hook
  （useReaderReadingTime：时长账本+复合 flusher 构建，onFlush 兜底=dispose 尾账
  单通道）；scroll-progress.ts +`takePending/pendingIds` 两口（复合 flusher 消费，
  结构类型不 import——互不 import 红线保持）+useScrollProgressWiring 注册体
  参数化（flusher 注入，裸 sp 落库形态退役）；ReaderPage 装配（复合 flusher 注册
  store+ready 效应 start/stop+visibilitychange+卸载 dispose）；PaperDetailPanel
  meta 区 +「阅读」行（formatReadingTime）。

## 2. 文件清单

改动（22 files/121+/33-，其中 12 件=主控配套）：见 `git diff --stat`；本实现面
=src/main/db/{migrate.ts,repos/papers.repo.ts,repos/papers.queries.ts}、
src/main/services/reader.service.ts、src/shared/ipc/schemas.ts、
src/shared/models/paper.ts、src/renderer/features/reader/{ReaderPage.tsx,
scroll-progress.ts}、src/renderer/features/library/PaperDetailPanel.tsx、
locks/manifest.json（锁序产物）。

新文件（7）：
- src/main/db/migrations/008_reading_time.sql
- src/renderer/features/reader/reading-time.ts（~250 行纯模块）
- src/renderer/features/reader/reading-time-setup.ts（装配 hook，§4.2 拆分）
- src/renderer/shared/reading-time-format.ts（§4.1 下沉）
- tests/unit/db/migrate-reading-time.test.ts（R9×2）
- tests/unit/db/papers-reading-time.test.ts（累加原子/R8/回读×3）
- tests/unit/services/reader-time.test.ts（透传/R8×2）
- tests/unit/renderer/reading-time.test.ts（R1~R7+R10+零头+复合 flusher+
  formatReadingTime 边界，12 用例）
- tests/e2e/reader-reading-time.spec.ts（存量升级链+显示面冒烟 1 用例）

## 3. 测试证据（红→绿→变异→verify）

| 阶段 | 证据 | 摘要 |
|---|---|---|
| 首红（全量 npm run test） | scripts/audits/p7e-05-red/p7e-05-first-red.raw.txt | 5 failed/1235（4 新文件红+migrate.test:10 golden 中间态——主控裁决 2 语义），exit=1；注：首次落盘 exit=0 系管道取 tee 退出码，PIPESTATUS 修正重跑补 exit=1 铁证 |
| 绿（全量） | scripts/audits/p7e-05-green-unit.raw.txt | 146 文件/1250 用例全绿，exit=0（主控补 lineage-tags 第 12 件后） |
| verify（全链真退出码） | scripts/audits/p7e-05-verify.raw.txt | quality+tickets+locks+lint+typecheck+test+build 全过，146/1250，exit=0 |
| e2e 定向 | scripts/audits/p7e-05-e2e-targeted.raw.txt | reader-reading-time.spec 1 passed（3.3s）exit=0；全量 e2e（37+1）归主控亲验 |
| locks generate | scripts/audits/p7e-05-locks-generate.raw.txt | 259→265（+4 unit+1 e2e spec+1 sql——主控修正预期 265 实证一致） |
| locks apply | scripts/audits/p7e-05-locks-apply.raw.txt | 265 件锁定+manifest 同步，exit=0；locks:check 绿 |

变异红证（cp 备份法，全部还原 diff 空）：
- **M1** repo 删累加改赋值：75→45 红（R8 同红 30→0）——p7e-05-mutation-m1.raw.txt
- **M2** reading-time 删 visibility 门：R3 hidden 段累积 90≠30 红——p7e-05-mutation-m2.raw.txt
- **M3** 复合 flusher 删 collectAndZero：R2 secondsDelta 45→0 红（R5/R6 同红 3 用例）——p7e-05-mutation-m3.raw.txt
- **M4** 切 tab 忘 stop（stop 体清空）：R4 离开段虚计 60≠45 红——p7e-05-mutation-m4.raw.txt
- **M5**（回炉 R1 补）删 settle isVisible 门控：R3×R6 跨格 hidden force 虚计 90≠30 红——p7e-05-mutation-m5.raw.txt

## 4. 自裁申报（超票面/裁决点处置，全部因关卡硬约束触发）

1. **formatReadingTime 落位**：主控③-3 裁「驻 reading-time.ts 单源导出
   （PaperDetailPanel import 消费）」→撞 check-quality 跨 feature 关卡
   （library→reader import 禁，COMPOSITION_ROOT_ALLOW 在受锁脚本内禁改）；
   票面第二选项「models」（src/shared/models/paper.ts）撞 locks:apply 后只读
   （Permission denied 实证）。处置=定义下沉 **renderer/shared/reading-time-format.ts**
   （quality 错误信息自身指定的「共享代码下沉 renderer/shared」合法位）
   +reading-time.ts `export {} from` re-export 转发（受锁 reading-time.test.ts 的
   import 面零改——定义唯一=「单源」精神保持，export 面两入口）。
2. **reading-time.ts 拆分**：useReaderReadingTime 装配 hook 顶层 import api
   （client.ts:29 `window.api` 模块级求值）毒化 node 环境单测（受锁
   reading-time.test.ts 需加 jsdom 行——已被我 generate/apply 的锁面设只读，
   Permission denied 实证）→拆 reading-time-setup.ts（ReaderPage 改 import）。
   拆分同时解决 ReaderPage 274 行超组件 250 行关卡（245 收口）。
3. **R4 用例增强**（加 stop 后 15s 离开段窗口）：原序列 stop→start 零窗口，
   M4 变异（忘 stop）不红=变异无载体；首红证据为 collection error 级（整文件红），
   用例增强不破坏首红证据链。新文件未入锁前的本票工作面完善。
4. **e2e 存量库构造**：DROP COLUMN reading_seconds+PRAGMA user_version=7 降级
   子进程（spawn -e 不落盘脚本；ABI 切换照 e2e-env.seedPaperRow 受锁件禁改——
   本地第二份，Rule of Three 保持重复）。
5. **formatReadingTime 返回串不含「阅读」前缀**（'0 分钟'/'1 小时 0 分'）：
   Row label=「阅读」与前缀双写问题；行视觉=label+值拼合=票面「阅读 N 分钟」。
6. locks/manifest.json CRLF 警告：generate 产物自带（check-locks hash 校验绿），
   提交时 .gitattributes 归一——主控收口注意非本实现面引入。

## 5. 首轮 BLOCKED 记录（历史，主控已解除）

死结 1（migrate.test.ts:10 golden [1..7]）+死结 2（PaperDetail 必填字段×10 件
受锁字面量）——主控 [locked-change] 11 件配套解除；续作中发现同型第 12 件
（lineage-tags.test.ts:61-63 toBe(7)），通报后主控同批补改（7→8+测试名同步），
主控全受锁面 grep 复核无第 13 件。三方（主控配套/我的实现/两批红转绿）在
verify exit=0 汇合。

## 6. 疑虑

- e2e 定向 3.3s 偏快（断言全链走完，疑热缓存）；全量 e2e 主控亲验时留意
  reader-reading-time.spec 的 electron 双 launch 稳定性。
- INV-57 登记与 registry 翻 done 归主控收口单写（本票面⑤声明，未越权）。
- 计数申报：verify=146 文件/**1251** 用例（基线 142/1231+20 新用例：
  migrate-reading-time 2+papers-reading-time 3+reader-time 2+reading-time 13
  （12+R1 回炉新锚 1）=20 ✓）；locks 265（R1 后不变，reading-time.test.ts
  hash 更新）；e2e 37+1=38（主控跑）。

## 7. 成本自述

- 三轮合计工具调用 ~70 次（首轮调研 12+续作实现/测试/变异/锁/verify ~48+
  回炉 R1 门控/新锚/M5/锁/verify ~10）。
- 大耗时命令：npm run test×5（~90s/次）、npm run verify×3（~4min/次，首红
  quality 阶段折损一次+R1 后全绿两次）、e2e 定向 3.9s+复用 verify 的 build、
  lint/typecheck 快检×3。变异定向跑 5 次（~10s/次）。
