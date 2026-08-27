# 缺陷③实现者报告 —— ai_notes 列表序非确定（存量 flaky）修复

单元：事件驱动缺陷③（主控 2026-08-27 收口亲验实锤）｜模式：三屋实现者（ADR-0017）
日期：2026-08-27｜实现者：GLM（思考等级=主控派发配置，票面裁决已澄清，无自裁空间）

## 0. 开工记录（会话开工纪律——技能清点）

- test-driven-development：**用**（TDD 四档：首红→绿→变异红证→还原）。
- verification-before-completion：**用**（完成前 npm run verify 真退出码亲验）。
- systematic-debugging：**不用**——根因已由主控收口亲验实锤（id=随机 uuid 平局决胜），修法已裁决，无调试面。
- subagent-driven-development：**不用**——实现者本体，该技能面向派发方主控。
- javascript-testing-patterns：**不用**——夹具法沿用仓库既有先例（db.prepare 直插，ai-notes-import.test.ts 同型）。
- 中途漏用检查：无弯路，无补加载项。

## 1. 实现摘要

修法=票面裁决原样：`ORDER BY created_at, id` → `ORDER BY created_at, rowid`（两处：
listByPaperStmt/listByRoleStmt，现文件行 :113/:122——头注扩三行后行号平移，原票面 :111/:120）。
rowid=SQLite 隐式插入序（DDL id=TEXT PRIMARY KEY 非别名 rowid，插入序独立有效），同毫秒
平局按导入批内顺序决胜；跨毫秒行为不变（created_at 仍首键）。**未动 id 生成、未动
service、无 schema 变更**。头注接缝声明（原 :18-20「基础序=created_at,id」）同步修订——
接缝归责纪律，SQL 变更不更新声明=注释与实现互斥。

## 2. 文件清单

| 文件 | 受锁 | 变更 |
| --- | --- | --- |
| src/main/db/repos/ai_notes.repo.ts | 否（repos 非受锁集） | 2 处 ORDER BY + 头注声明（diff 12 行内） |
| tests/unit/db/repos/ai_notes.repo.order.test.ts | **是（新增，已 generate+apply 入 manifest）** | 新回归锁（58 行，裸 describe always-active，2 用例） |
| locks/manifest.json | —— | 132→133（新测试文件入册） |

新测试夹具：db.prepare 直插两行（绕过 repo 的 id/时间戳生成——票面指定法），同
created_at='2026-08-27T00:00:00.000Z'，id 刻意与插入序字典序相反（先插 'z-first' 后插
'a-second'）；断言 listByPaper/listByRole 均为 ['z-first','a-second']。

## 3. 红证（首红）

`npm run test -- tests/unit/db/repos/ai_notes.repo.order.test.ts`（修前）：
**2 failed (2)**——两用例均实得 ['a-second','z-first']（id 字典序决胜）≠期望，红因恰中
缺陷本体，非夹具错。非恒真断言实证。

## 4. 绿证

修后同文件+同族宿主三件（order/repo/import）：**3 files, 20 tests passed，EXIT=0**。
存量踩雷用例（ai-notes-import「无 archive 首导」notes[0]）随修确定性转绿（插入序=文件行序）。

## 5. 变异红证 + 还原记录（cp 备份法，未用 git checkout）

- Round 1（listByPaperStmt :113 单 token：rowid→id）：cp 备份→变异→跑测 →
  **EXIT=1，恰 1 failed（listByPaper it 红）/1 passed（listByRole it 绿）**→cp 还原→
  `diff` 空（ROUND1-RESTORE-DIFF-EMPTY）。
- Round 2（listByRoleStmt :122 同型变异）：→ **EXIT=1，恰 listByRole it 红**→cp 还原→
  diff 空（ROUND2-RESTORE-DIFF-EMPTY）。
- 两语句分别被独立变异证锁（每处改动各有专属红证用例，删除任一处 rowid 必被 CI 拦截）。

## 6. verify 真退出码

`npm run verify > log; echo EXIT=$?` → **EXIT=0**。全关卡：quality（无占位/无乱码/无跨域）
+ tickets 104（open 0）+ locks 133 一致 + lint + typecheck + test **87 文件 621 用例全绿**
（基线 86/619 → +1 文件 +2 用例，≥620 达标）+ build。

## 7. locks 实录

unlock（132 解锁）→ 批内改 → locks:generate（manifest 133，未设只读）→ locks:apply
（133 重锁只读）→ verify 内 locks:check 绿。新文件纯 LF/UTF-8（od 验证无 CR 字节，
磁盘 sha256==manifest 条目 8e8e3c0f…，CI LF checkout 零风险）。

## 8. 排查结果（同型模式清单——申报不动手，grep 全 repos ORDER BY 全量）

**同病（created_at 平局 + 随机 uuid id 决胜）：**
1. `src/main/db/repos/lineage.repo.ts:177`（lineage_nodes）与 `:178`（lineage_edges）：
   `ORDER BY created_at, id`，id=randomUUID（:184/:204）+逐条打戳（:185/:205）。触发面低
   （UI 逐个 upsert，同毫秒平局罕见），但「同库同序」不成立——同病低频版。
   头注 ：80/:104 亦作「确定性序」声明（声明与实现同样互斥隐患）。**建议另立单元**。
2. `src/main/db/repos/papers.repo.ts:101-103`（ORDER_BY 映射）与 `:272`
   （`ORDER BY added_at DESC, id DESC`）：id uuid 决胜同型；papers 逐篇导入非批量打戳，
   平局罕见。另 :102 year_desc=`year DESC, added_at DESC` **无第三决胜键**（同键对无兜底）。
   低频，列报。
3. `src/main/db/repos/notes.repo.ts:91`：`ORDER BY updated_at DESC`——**完全无决胜键**
   （同毫秒平局=引擎任意序）。用户手写非批量故低频，但属同族缺口且连假兜底都没有。列报。

**非同型（业务键决胜，无此雷）**：annotations（page,sort_key）、collections（position）、
tags（name/paper_count）、notes FTS（rank）、papers 标签/集合名（name）。

本单只修 ai_notes 两处；上述 1/2/3 归主控裁决是否另立单元。

## 9. 自裁申报（超票面决定）

1. **新测试落点=新文件**（票面授权「自行判断」）：既有宿主 ai_notes.repo.test.ts 全体
   包在 guardedDescribe('SR2-AI-01') 内，always-active 契约置于其中必破坏 guarded 语义；
   受锁文件顶层混塞裸 it 比独立文件更脏。选 repo 测试族新文件（缺陷在 repo ORDER BY
   语义层，非 service 层——ai-notes-import.test.ts 是 service 宿主）。
2. **变异红证两轮而非一轮**：票面字面「单 token 变异」，两轮各单 token（:113、:122），
   每语句独立恰中专属 it——比一轮双变异更强（双变异无法证明单语句锁定）。
3. **头注声明同步修订**：接缝归责纪律的必带面（非扩面）。

## 10. 疑虑

## 11. W2 处置记录（门一回执，2026-08-27）

- 修正根因机制表述：「单事务批量写」→「同步循环逐条写入（无事务包裹），快速循环内
  多行可同毫秒打戳」——旁证 ai-notes-import.service.ts:188-189（`for...insert` 无事务
  包裹的逐条 autocommit）。修法（rowid 决胜）两种时序下均正确，仅叙事修正。
- 改动三处：ai_notes.repo.ts 头注（:20 区）、ai_notes.repo.order.test.ts 头注（:4 区，
  受锁——unlock→改→apply，manifest 133 复核一致）、本报告 §8 lineage 行对比措辞。
  服务头注本身无「单事务」字样（错叙系本实现者引入，非接缝遗留）。
- 复验（纯注释改动，W2 准免全量 verify）：LINT-EXIT=0，TYPECHECK-EXIT=0，locks:apply
  133 重锁+locks:check 通过。


- locks/manifest.json 有 git CRLF→LF 提示（PowerShell 生成物行尾）：check-locks 只对账
  manifest 所列文件内容哈希，manifest 自身行尾不入哈希面，无 CI 风险；提交由主控执行，
  届时 git 自动规范化即可。
- 工作树既有未跟踪残留（dev-launch.cmd、dist_new/、scripts/audits/enr-* 等）非本单产物，
  未触碰；主控 staging 请显式列文件（宪法纪律）。
- lineage/notes 同型雷未修（票面禁扩面）——若主控立新单元，rowid 修法可直接复用本单
  测试范式（直插反序 id 夹具）。
