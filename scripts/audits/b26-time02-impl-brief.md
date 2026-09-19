# F-TIME-02 实现者六段简报（batch 26 增补二·手动领批）

工作区根：E:\class\智慧水务\Synapse_remake（相对路径以此为基）。
票：F-TIME-02（registry:316 前后——阅读时长功能移除，owner strong，中票）。
派发档位：ops-executor 绑定（GLM5.3flash $max）。

## ① 目标与边界（用户裁决 2026-09-19 第六档）

移除阅读时长统计功能（查证 Zotero/Mendeley/EndNote/ReadCube 均无内置→用户条件
裁决生效）。**页码进度链（last_read_page）零触碰保留**；**outbox 机制保留**
（P7X-02 后为页码三收尾口通道），仅删时长载荷。

## ② 移除/改造面清单（主控侦察预列——以实勘为准，超预列先停报告）

**A. renderer 删除/改造**
- `src/renderer/features/reader/time/reading-time.ts` ——整件删除（计时器本体+
  visibility 门+tick+chunkSeconds+createCompositeProgressFlusher+
  formatReadingTime re-export）
- `src/renderer/shared/reading-time-format.ts` ——整件删除（显示纯函数无消费者）
- `reading-time-setup.ts`（票面载体）改造：去 createReaderReadingTime/chunkSeconds/
  复合 flusher；`enqueueReaderProgress(paperId, page, secondsDelta)` 三参化二参；
  保留 getReaderOutbox（outbox 单例装配）/enqueueReaderProgress（页码入队）/
  spView（dispose 页码尾账改道——R7 面保留页码半边）；头注改写说明沿革
  （[F-TIME-02] 时长移除后=outbox 页码通道装配件，件名保留防改名面扩大）
- `reading-time-outbox.ts` 改造：OutboxEntry 删 seconds 字段；send 回调签名
  (paperId,page,secondsDelta)→(paperId,page)；队列/at-least-once/replay 本体保留；
  localStorage 存量条目含 seconds 字段=回放时忽略（向后兼容，头注申报）
- `reading-time-outbox-store.ts`：OutboxEntry 类型随动
- `PaperDetailPanel.tsx`：删「阅读」Row（:163）+import formatReadingTime（:39）
- `ReaderPage.tsx`：装配面随动（rt/复合 flusher 消费删——页码 flusher 形态以
  reader.store ProgressFlusher 接口实勘为准，最薄退化自裁申报）
- `main.tsx`：getReaderOutbox replayOnStart 保留（outbox 留）

**B. shared+main 落库链（全受锁 [locked-change]）**
- `src/shared/models/paper.ts`：PaperDetail.readingSeconds 字段删
- `src/shared/ipc/schemas.ts`：saveProgress 载荷 secondsDelta 删（:63-64）
- `src/main/db/repos/papers.repo.ts`：updateReadPage 第三参删（:97 注释/:203 SQL）
  +readingSeconds 映射删（:266）——SQL 改「SET last_read_page=?」单参
- `src/main/db/repos/papers.queries.ts`：SQL 面列清单 reading_seconds 删
- `src/main/db/migrations/009_reading_time_drop.sql` 新增：
  `ALTER TABLE papers DROP COLUMN reading_seconds;`（008 已合入不可改=CI 锁硬
  规则只能新增——008 头注明文同款约束；SQLite DROP COLUMN 3.35+，better-sqlite3
  v12/v13 内置版本足够）
- `src/main/db/migrate.ts`：登记 {version:9,name:'reading_time_drop',...}
- `src/main/services/reader.service.ts`：saveProgress secondsDelta 透传删

**C. 测试面（受锁 [locked-change][test-refactor]）**
- 删：tests/unit/renderer/reading-time.test.ts；tests/unit/services/reader-time.test.ts
  （透传测试对象消失）；tests/unit/db/papers-reading-time.test.ts（第三参对象消失
  ——若含页码更新独立断言则改存页码半边，实勘自裁）
- 改：tests/unit/renderer/reading-time-outbox.test.ts（seconds 断言面删，页码队列
  /at-least-once/replay 断言保留）；tests/unit/db/migrate-reading-time.test.ts
  （008 加列+009 删列双跳链断言——009 后列不存在）
- e2e：tests/e2e/reader-reading-time.spec.ts 删（显示面+迁移冒烟对象消失）；
  tests/e2e/reading-time-replay.spec.ts 实勘裁量——纯时长重放则删、页码重放承重
  则改（自裁申报）
- fixtures 路过面：corpus.assemble/enrich.service/export.service/library.service/
  markdown.report 五 test 的 PaperDetail 构造 readingSeconds 行删+tests/utils/
  factories.ts 随动；全仓 grep readingSeconds 收尾清零
- **指纹门收紧豁免**：scripts/test-surface.exemptions.json 追加条目（reason=
  F-TIME-02 用户裁决功能移除（2026-09-19 relay.md batch 26 增补二）+rulingLink
  =docs/handoff/relay.md）——C_after ⊉ C_before 的合法面=删除的时长用例/文件

**D. 配置/登记面（受锁）**
- `scripts/check-quality.mjs`：reading-time 相关白名单/路径行随迁清理（实勘——
  G5 迁移时 time/ 路径与 reading-time-format 下沉位可能有白名单位）
- `eslint.config.js`：INV-16 路径若含 reading-time 删件则随迁清理
- `docs/invariants.md` INV-57（时长账本唯一宿主）：标 retired（2026-09-19
  F-TIME-02 功能移除）——保留历史行勿删，加退役注记
- registry：done 票 file 锚指向被删文件（P7E-05/P7X-02 等 reading-time.ts 锚）
  →实勘 check-tickets 规则（file 不存在红/豁免清单），按 G10「镜像面红豁免」
  先例处理或 file 随迁——自裁申报

## ③ 受锁面（全链 unlock→改→即时 generate+apply 单链）

shared/models+shared/ipc/schemas+migrations+migrate.ts+services/reader.service+
invariants+tests/**+test-surface.exemptions+check-quality.mjs+eslint.config.js。
提交尾注（主控收口）：[locked-change][test-refactor] 双尾注（diff 含 tests/** 白
名单内+src/** 同批——CI 范围闸以白名单机制核，b25 P1-1 单尾注先例仅适用纯 src+
tests/utils 微改；本票 tests 面大改=TR 战役票机制，双尾注+豁免档由主控收口核）。

## ④ TDD 义务

- 基线锚：b26-time02-filing-verify.log 已档（207 票/open 5/170·1744/指纹门
  187·1789·5411·skip15——注意 filing 版 EXIT=2 系 area 枚举首写错已修+提交，
  实现者开工自跑 npm run verify 取新锚 EXIT=0）
- 定向回归：migrate 系+papers.repo+reader.service+library/export 系列（fixtures
  面动过）+renderer outbox 系全绿
- **变异红证 M1（显示面）**：PaperDetailPanel 临时加回 formatReadingTime 调用
  →模块解析红（文件已删）→cp 备份法还原（禁 git checkout）→复绿；
  log=scripts/audits/b26-time02-mutation1.log
- **变异红证 M2（迁移面）**：migrate.ts 临时移除 version 9 登记→
  migrate-reading-time.test 红（009 断言）→还原→复绿；
  log=b26-time02-mutation2.log
- 退出码变量法物理在档；e2e 不跑（主控收口跑默认门+对账用例数降）

## ⑤ 禁令与纪律

- 禁 git 写操作/registry 翻票（主控收口）；禁新依赖；方案切换=删除旧方案
  （reading-time.ts 删净禁留壳）；文件 ≤500 行；中文 UTF-8 Write 工具；
  计数落笔前实测；探针写前 lint 自查+写毕即时入锁+临时件置仓外。
- localStorage 存量 outbox 条目向后兼容（旧 seconds 字段忽略不炸 replay）。

## ⑥ 交付物

1. 移除/改造面全部落地+verify 全绿（tickets 红=F-TIME-02 open 预期态）
2. scripts/audits/b26-time02-impl-report.md：逐件清单（±行数 wc 实测）/定向
   回归/变异双红证全过程/指纹门豁免条目原文/超票面自裁逐条申报
   （ReaderPage flusher 退化形态/e2e replay spec 处置/registry file 锚处理/
   fixtures 面实测清单）
