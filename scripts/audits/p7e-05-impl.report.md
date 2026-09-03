# P7E-05 实现报告 —— 阅读时长统计（TDD 全流程完成+回炉 R1/R2/R3 已修）

> 状态：**DONE**（verify 全绿 exit=0；BLOCKED 前史=首轮票面×受锁测试互斥申报，
> 主控 11+1 件配套解除后续作完成；回炉 R1（主控亲验）+R2（门一 Kimi FAIL）+
> R3（门二 deepseek FAIL）均已修——本报告覆盖全程）
> 开工技能清点：test-driven-development/verification-before-completion/
> javascript-testing-patterns/e2e-testing-patterns=用；systematic-debugging=
> 备用（回炉期 2 次 quality/typecheck 红按流程定位）；其余=不用（纯功能票，
> 无部署/云/安全加固面；禁新增依赖故无依赖管理面）。

## 0. 回炉记录（R1=主控亲验；R2=门一 FAIL；R3=门二 FAIL——均收净）

### R3（门二 deepseek FAIL：1 BLOCKING+1 WARN，scripts/audits/p7e-05-gate2.json）

- **BLOCKING 已修**：R7 dispose 尾账未接分片（门一漏面）——dispose→onFlush
  直发 secondsDelta 原值，>1h 卸载回吐>3600 被 zod 拒+吞错=同型静默丢账。
  修复=**分片单源** `chunkSeconds(sec): number[]` 纯函数（3600 整数片+尾片；
  sec=0→[0]）三消费点共用：invokeOne（R5/R6）、**dispose 逐笔分片 onFlush**
  （R7）、setup 侧 onFlush 回调（防御深度——上游已分片则单片透传）。新锚：
  账 4000s→dispose→onFlush 两次（3600+400）。**M7 变异红证**：删 dispose
  分片→单笔 4000≠两片红（cp 备份还原 diff 空）——p7e-05-mutation-m7.raw.txt。
- **WARN 已修**：settle 吸收/结转绑死（R1 修复过度面——hidden 中 force 结算连
  hidden 前已计量的可见零头也不结转，start 重置/dispose=可避免的可见段损失）。
  修复=解耦：**吸收**仅 visible（防 hidden 虚计不变）；**结转**（force 或 ≥tick
  入账+清零）不依赖当前可见性。锚配套：NIT1 锚语义随缺陷修复变更（门二裁决
  丢弃=缺陷）——「hidden 中 stop 结转可见零头入 A 账」（A=20/B=15）；新锚
  「可见 5s 零头→hidden→collectAndZero 返回含 5s」（=20）。
- **M2 变异点失效申报（与主控指令预期「M2 应仍红」不符）**：解耦后删 tick
  visibility 门→settle 吸收门兜底→R3 用例仍绿（17/17，实测
  p7e-05-mutation-m2-recheck-r3.raw.txt）——防线冗余实证（tick 门+吸收门双层，
  单删一层不红=防御纵深生效）。hidden 虚计防线的变异载体=**M5（删 settle
  吸收门）**，解耦版复验仍红（90≠30——p7e-05-mutation-m5-recheck-r3.raw.txt）。
- **verify R3**：146 文件/**1255** 用例全链绿 exit=0（中文 UTF-8 落盘亲验）
  ——scripts/audits/p7e-05-verify-r3.raw.txt；locks generate+apply 265 不变
  （reading-time.test.ts hash 随锚变更/新增更新=预期）。

### R2（门一 Kimi FAIL：1 BLOCKING+3 NIT，裁决档 scripts/audits/p7e-05-gate1.json）

- **BLOCKING 已修**：secondsDelta max(3600)×「仅收尾口回吐无周期 flush」结构
  冲突——连续阅读>1h 后关 tab 回吐>3600 被 zod 拒收+吞错=整段静默丢失。修复
  =invokeOne 分片（`PROGRESS_SECONDS_CHUNK=3_600` 与 schemas 单次 invoke 上界
  同值对齐——受锁面禁动保持）；sec>3600 拆 3600 整数片+尾片依次 invoke（页码
  同一 pending page 重复写幂等无害；物理上界 24 片/24h）。新锚：账 4000s→flush
  →两次 invoke（3600+400）+账清零。**M6 变异红证**：删分片→单 invoke 4000≠
  两片红（cp 备份还原 diff 空）——p7e-05-mutation-m6.raw.txt。
- **NIT1 已修**：settle 注释口径补实（hidden 中 stop 后 start 他篇的 liveMs=0
  重置=旧可见零头终局丢弃路径——closeTab 无恢复场景）+测试锚（hidden+stop 后
  start 他篇→A=15/B=15 零头不入任何账）。注：NIT1 首版序列（advance 20000
  非整倍数）暴露 harness 粒度特性（advance 先推 now 再跑 timer 回调——tick
  读段末值=「节流一段清」等价语义，既有 13 用例全依赖该语义且全绿）——用例
  改 15000+5000 两段表达同语义，harness 不动。
- **NIT2/NIT3 不修只登记（主控收口 INV-57 注记面）**：①R7 卸载双 invoke
  （时长 onFlush 与进度 sp.dispose 各自落库，非「单事务面」字面——两账各自
  尽力而为，丢账面=单账独立不放大）；②页码两来源（sp pending vs store
  tab.page）理论回退窗口（takePending 与 currentPageOf 读点间翻页）；③
  reading-time.ts ~330 行 vs 票面 ~130 估算（拆分 setup/format 后主模块承担
  账本+复合器+wiring 三职责，250 组件关卡下的形态）。
- **verify R2**：146 文件/**1253** 用例全链绿 exit=0
  ——scripts/audits/p7e-05-verify-r2.raw.txt（中文 UTF-8 落盘亲验）；locks
  generate+apply 265 不变（reading-time.test.ts hash 随 2 新锚更新=预期）。

### R1（主控亲验：settle hidden 段虚计）

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
- **M6**（回炉 R2 补）删 invokeOne 分片：4000s 单 invoke≠[3600,400] 两片红——p7e-05-mutation-m6.raw.txt
- **M7**（回炉 R3 补）删 dispose 分片：4000s 单笔 onFlush≠两片红——p7e-05-mutation-m7.raw.txt
- 变异复验（R3 解耦后）：M2 原变异点（tick 门）失效=防线冗余实证（17/17 绿）——p7e-05-mutation-m2-recheck-r3.raw.txt；M5（settle 吸收门）仍红 90≠30——p7e-05-mutation-m5-recheck-r3.raw.txt

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
- 计数申报：verify=146 文件/**1255** 用例（基线 142/1231+24 新用例：
  migrate-reading-time 2+papers-reading-time 3+reader-time 2+reading-time 17
  （12+R1 锚 1+R2 锚 2+R3 锚 2 含 NIT1 语义变更）=24 ✓）；locks 265（R3 后
  不变，reading-time.test.ts hash 更新）；e2e 37+1=38（主控跑）。

## 7. 成本自述

- 五轮合计工具调用 ~105 次（首轮调研 12+续作 ~48+R1 ~10+R2 ~15+R3 ~20）。
- 大耗时命令：npm run test×5+定向×12（~90s/10s）、npm run verify×5（~4min/次）、
  e2e 定向 3.9s、变异/复验定向 9 次（~10s/次）。
