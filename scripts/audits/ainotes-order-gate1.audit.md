# 门一对抗深审档 —— 缺陷③（ai_notes 列表序非确定 flaky）

单元：事件驱动缺陷③（发现档=docs/reports/2026-08-27_visual-check-findings.md 发现 3）
门一：GLM（对抗深审孙代理，ADR-0017 §4.2）｜日期：2026-08-27｜模式：只读
技能清点：code-review-excellence=用（本任务即对抗审查）；systematic-debugging=不用（不调试缺陷，只审实现与证据链）；verification-before-completion=部分用（只读核证据声明，不重跑 npm）；TDD/subagent-driven-development 等=不用（不写实现不派发）。

## A 母本符合度 —— [B]

1. 修法逐字吻合票面/发现档：`ORDER BY created_at, id` → `ORDER BY created_at, rowid` 两处
   （diff 的 ai_notes.repo.ts :113/:122——工作树现文件实核同）。发现 3 处置原文「ORDER BY
   created_at, rowid（插入序确定化）」——diff 与裁决零偏差。
2. 「不动 id/service/schema」：diff 面=2 处 ORDER BY+头注 :18-22+manifest 三块；insert 的
   randomUUID（ai_notes.repo.ts:128）原样、无迁移变更、service 零触碰——核过。
3. 新测试=票面指定夹具法：直插绕过 repo 生成面、created_at 刻意同值、id 刻意与插入序字典序
   相反（先插 'z-first' 后插 'a-second'）——发现档「构造同 created_at 且 id 序与插入序相反的
   两行，对现状必红」逐条落地；且 listByPaper/listByRole 各一 it，恰对 diff 两处语句一一锁定。
4. 4 处同型雷只排查不修：报告 §8 申报不动手——与票面「留另立单元」吻合。

## B 宪法红线 —— [B]

1. always-active 核验过：新测试裸 describe（order.test.ts:22），无 guardedDescribe——K3
   威胁下恒开，符合 ADR-0017「新测试 always-active」硬规。
2. rowid 语义边界三项全过：
   - WITHOUT ROWID 不适用：migrations/003（src/main/db/migrations/003_ai_notes.sql）无该
     子句，普通 rowid 表，rowid 恒存在。
   - 非 rowid 别名：`id TEXT PRIMARY KEY`（003:13）非 INTEGER PRIMARY KEY——id 与 rowid
     独立，插入序语义成立；实现者报告 §1 该声明正确。
   - VACUUM：全仓库 grep VACUUM/WITHOUT ROWID/AUTOINCREMENT 零命中——无重编号触发面；
     即便未来 VACUUM，SQLite 按原 rowid 扫描序单调重映射，同 paper 过滤集内相对序保持，
     决胜语义不破。deleteByPaper 清面+整套重插（幂等重灌）下新 rowid 从 max+1 起，批内
     相对序=插入序——重灌语义自洽。
3. 受锁流程时序合规：unlock（package.json:31）→批内改→locks:generate（:28 -GenerateOnly
   入册新路径）→locks:apply（:29 重锁只读）——与宪法「新增受锁路径先 generate 再 apply」
   吻合；manifest 实数 133 条（grep -c path 核过），diff 显示恰 +1 新条目；verify 链
   locks:check 先于 test，EXIT=0 佐证哈希对账过。
4. 夹具合法性：INSERT 列覆盖 003 全 NOT NULL 列；papers 夹具满足 001 NOT NULL 面（title
   等有默认）；foreign_keys=ON（connection.ts:15）下 paper_id FK 先建 p-1 满足；annotation_id
   可空传 NULL 合法。

## C 质量红证真实性 —— [B]（独立复算，只读未重跑）

1. 首红因果闭合：旧 SQL=ORDER BY created_at,id；夹具 created_at 同值，TEXT BINARY collation
   下 'a-second'<'z-first'（首字符 a<z，无前缀边界争议）→ 现状必得 ['a-second','z-first']
   ≠期望 ['z-first','a-second']——**确定性必红非概率红**，恰满足发现档「对现状必红」；
   红因=缺陷本体非夹具错。
2. 两变异独立复算：Round1 仅 :113 回 id → listByPaper it 实得 id 序必红、listByRole it 仍
   rowid 必绿（「恰 1 failed/1 passed」自洽）；Round2 对称。各单 token（rowid→id）；两语句
   各有专属红证 it——删除任一处修复必被 CI 拦截，锁面无空洞。
3. 非恒真断言：期望序与 id 字典序、任意引擎序均不同——无恒绿面。

## D 报告诚实性 —— [B]

1. 文件清单对账过：diff（manifest+repo）+未跟踪新测试三件齐报（§2）；新测试已入 manifest=
   已纳入受锁面，非「清单外私货」。
2. 「未动 id/service/schema」vs diff：零偏差（见 A2）。
3. 4 雷抽验（本门独立 grep 全 repos ORDER BY 全量对账）：lineage :177/:178 字面吻合、
   randomUUID :184/:204、逐条打戳 :185/:205、头注「确定性序」声明 :80 附近/:104 附近（±2
   行内）；papers :101-103 精确（含 :102 year_desc 无第三决胜键）、:272 字面吻合；notes :91
   字面吻合（updated_at DESC 全无决胜）。非同型分类（annotations page,sort_key / tags
   name / collections position / FTS rank）与全量扫描逐一吻合——**repos 面清单无遗漏**。
   清单外遗漏一处见 E-W1。
4. 计数自洽：+1 文件+2 用例（86/619→87/621）；tickets 104 与 locks 133 与 manifest 实数一致。

## E 接缝 —— [B]（附 2 项 W，均在票面外，不构成回炉）

1. AI-08 面板声明成立：ai-notes.store.ts:50-55 直读 repo 返回序入 store、无重排——修复
   直接生效（面板=受益方非受害方）；LineageSideAiNotes.tsx:36 同直读。头注修订（repo :18-22
   「created_at,rowid」）与 :113/:122 SQL 一致。
2. **[W1] orderAiNotes 同病残留+接缝声明漂移**：corpus.assemble.ts:104 comparator 末级仍
   `a.id < b.id ? -1 : 1`——role+question+createdAt 三键全平对的输出=id 字典序=uuid 彩票。
   ai_notes 粒度=一锚定段×一问（003:1 注释），同 paper 同 role 同 question 同 created_at
   多锚定段是导入常态面 → **语料导出序（corpus.export.service.ts:354 消费）的缺陷③未除根，
   触发频率高于已列 4 雷**。同时 corpus.assemble.ts:94 头注「createdAt→id（repo 基础序同键
   兜底）」与 repo 新头注「created_at,rowid」构成引用漂移——接缝归责纪律（改 A 必核 B 声明）
   的未竟事项。主控声明「orderAiNotes 重排序不受影响」仅在 comparator 全键覆盖意义下成立；
   四键全平时其输出与 repo.rowid 序相悖。**建议：并入「同型雷另立单元」清单（4→5 雷）**。
   实现者 §8 自称「grep 全 repos ORDER BY 全量」——repos 面属实无漏，但装配层 JS 决胜键不在
   其扫描谓词内，属排查方法论盲区非瞒报。
3. **[W2] 「单事务」叙事与实现不符**：头注 :20「单事务批量导入同毫秒打戳」/主控裁决同措辞
   vs ai-notes-import.service.ts:188-189 实为**无 transaction 包裹**的同步循环逐条 autocommit
   ——同毫秒平局真因=同步循环+ISO 毫秒精度时间戳，与事务无关。修法在两种时序下均正确
   （rowid 单调递增与事务边界无关），首红夹具强制同戳不受影响——**不损修复有效性**，但发现档/
   头注留下错误心智模型，另立单元时宜修正措辞。

## 统计

A=B｜B=B｜C=B｜D=B｜E=B｜N=0｜W=2（W1 装配层第 5 雷未入清单+corpus.assemble:94 声明漂移；
W2「单事务」措辞与导入器实现不符）

## 总评（三行）

修复本体（repo 两处 rowid 决胜+always-active 回归锁+locks generate/apply 时序）五工单全过，
证据链（首红因果/双变异独立复算/必红夹具）独立核算闭合——**门一无回炉项，放行**。
两 W 均在票面裁决范围外的接缝/叙事面：W1 建议主控将 corpus.assemble.ts:104 并入同型雷另立
单元（其触发面高于已列 4 雷，导出序未除根）并同步修订 :94 头注漂移。
W2 属根因叙事措辞（「单事务」→实为同步循环连插），不损修法正确性，另立单元文档修正即可。
