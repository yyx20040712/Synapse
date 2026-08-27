# 门二终审档 —— 缺陷③（ai_notes 列表序非确定 flaky）

单元：事件驱动缺陷③（发现档=docs/reports/2026-08-27_visual-check-findings.md 发现 3）
门二：GLM（终审孙代理，ADR-0017 §4.3）｜日期：2026-08-27｜模式：只读（唯一可写=本档）
技能清点：code-review-excellence=用（终审即审查）；verification-before-completion=用（只读亲验 grep/sha256/diff 对账）；systematic-debugging/TDD=不用（无调试/实现面）；其余工程技能=不用（禁 npm/git 写，纯只读核验+单档产出）。配置自查：GLM 终审位，无派发面。

## ① 处置核对（门一 2W）—— PASS

- **W2 三处叙事修正终态逐处实核**：
  1. repo 头注（ai_notes.repo.ts:18-23）：现文「导入器同步循环逐条写入（无事务包裹），快速循环内多行可同毫秒打戳」——无「单事务」字样 ✓。
  2. 新测试头注（order.test.ts:4-5）：同表述修正 ✓；受锁改动走 unlock→改→apply（报告 §11），哈希链闭合见③。
  3. 报告 §8 lineage 行措辞：现文「UI 逐个 upsert，同毫秒平局罕见」——无「单事务」✓。
- **grep「单事务」全仓库（排 node_modules/.git/dist*/abi-cache）共 7 命中，逐一分类全为合法保留**：gate1.audit.md:79/88/96（W2 审计记录本身）、impl.report.md:101/106（§11 修正记录）、diff.patch:9（被删除旧行）/11（修正注记）、台账:58（「原记『单事务』有误」来历注记）。**产品代码/测试/活性契约文档零残留**——W2 修正彻底。
- **W1 五雷清单入台账（:66-72）+ 本门源码逐雷抽验**：①lineage.repo.ts:177/178 `ORDER BY created_at, id`（id=randomUUID :184/:204+逐条打戳 :185/:205）✓②papers.repo.ts:101-103（:102 year_desc 无第三决胜键）+:272 ✓③notes.repo.ts:91 `ORDER BY updated_at DESC` 无决胜键 ✓④corpus.assemble.ts:104 末级 `a.id < b.id`（真实路径 src/main/services/export_/，台账省目录前缀，行号精确）✓⑤:94 头注「repo 基础序同键兜底」与 repo 新序漂移 ✓。五雷全部属实、已入册（主控文档面确认）。
- 附注（主控收口动作面，非缺陷）：台账发现 3 状态行仍「待修」——发现 2 先例为收口后翻状态，收口时一并翻「已修复收口+五雷另立单元」。

## ② 母本符合度 —— PASS

1. 裁决「ORDER BY created_at,rowid 两处」：工作树实核 ai_notes.repo.ts:114（listByPaperStmt）/:123（listByRoleStmt），diff 恰两处 SQL+头注扩三行——零偏差。
2. 「不动 id/service/schema」：insert randomUUID（:129）原样；diff 无 service/migrations 文件；003 DDL 零触碰——核过。
3. 「可红首证测试」：夹具=票面指定法（db.prepare 直插绕过 repo 生成面、created_at 刻意同值、id 刻意与插入序反字典序），listByPaper/listByRole 各一 it 恰锁两语句；首红因果（TEXT BINARY 下 'a-second'<'z-first' 对旧 SQL 确定性必红）经门一独立复算、本门复核逻辑闭合。
4. 排查不修（五雷申报另立单元）与票面吻合。

## ③ 红线终审 —— PASS

- **always-active**：新测试裸 describe（:23），无 guardedDescribe import；guardedDescribe 系 tests/utils/guard.ts:13 显式导入工具非全局注入、无 setupFiles 包装——恒开；vitest include `tests/**/*.test.ts`（vitest.config.ts:17）收编（+1 文件面成立）。
- **纯 LF/UTF-8**：CR 字节计数=0（grep 亲验）；中文 Read 可读。
- **受锁流程**：unlock（package.json:31）→改→locks:generate -GenerateOnly（:28）→locks:apply（:29）时序合规；W2 轮二次受锁改动（测试头注）同流程申报且哈希链闭合；verify 链 locks:check（:30）先于 test（:25）。manifest 实数 133（grep -c 亲验）；新测试磁盘 sha256=db2365…==manifest 条目（sha256sum 亲验）。
- **rowid 边界三项抽验**：(a) 003 DDL 无 WITHOUT ROWID 子句（:12-13 亲验）；(b) `id TEXT PRIMARY KEY`（:13）非 INTEGER PRIMARY KEY，非 rowid 别名，插入序语义独立成立；(c) src/tests/scripts 面 VACUUM/WITHOUT ROWID/AUTOINCREMENT 零命中——无重编号触发面。**口径小误差（不损结论）**：门一 B3 称「全仓库 grep 零命中」，实际 docs/adr/0003:20-21 有 VACUUM 文字提及（FTS external-content ATR 文档，且其自身声明「当前代码无 VACUUM/restore 调用」）——命中面为文档叙述非代码调用，三项实质结论均成立。

## ④ 机器面 —— PASS（verify 采信转亲验条件）

- **verify 87 文件/621 用例/EXIT=0**：实现者报（§6），基线 86/619→+1/+2 计数自洽（门一 D4 复核）；本门铁律禁 npm 未重跑——**申明：主控收口亲验 `npm run verify` 真退出码 EXIT=0 后方可 [locked-change] 提交**。
- **locks 133**：manifest 实数 133 亲验 ✓。
- **工作树对账**：git status M 面=恰三文件（台账/manifest/repo）与 diff patch 面完全一致；`git diff` 实输出与 ainotes-order-diff.patch **逐字节一致（PATCH-IDENTICAL，strip-CR 后）**；未跟踪面：本单产物四件（新测试+diff/impl 报告/gate1 审计）+既有残留（dev-launch.cmd、dist_new/、enr-* 三件）与实现者申报清单完全吻合、零触碰 ✓。
- manifest.json 工作树 CRLF 提示：实现者已申报（PowerShell 生成物行尾；manifest 自身行尾不入哈希面），提交时 git 自动 LF 规范化——无 CI 风险，主控 staging 显式列文件。

## ⑤ 账本

| 项 | tokens | 时长 | 来源 |
| --- | --- | --- | --- |
| 实现者（首版） | 1.22M | 6.9 min | 主控汇出 |
| 实现者 W2 轮 | 0.47M | 1.8 min | 主控汇出 |
| 门一 | 0.31M | 6.0 min | 主控汇出 |
| 门二（本档） | ≈0.4M（估计） | ≈9 min（估计） | 自记——无法自测精确值，按派单「估计标注」 |
| **单元累计** | **≈2.40M** | **≈23.7 min** | 含门二估计值 |

## 统计

①=PASS｜②=PASS｜③=PASS｜④=PASS（附亲验条件）｜⑤=已记｜N=0｜回炉=0
新注记 2 条（均文档面、不阻断收口）：(1) 实现者报告 §7 哈希「8e8e3c0f…」为 W2 轮前旧值，当前实际 db2365…（本门亲验磁盘==manifest，实质哈希链闭合，仅报告数字未随更新）；(2) 门一 B3「全仓库零命中」口径漏 docs/adr/0003 文字提及（见③）。

## 总结论（三行）

**PASS——准予进入主控收口**：修复本体（repo 两处 rowid 决胜+头注接缝同步+always-active 回归锁+locks generate/apply 双轮合规）、W2 三处叙事修正、W1 五雷入册，四清单证据链经本门只读亲验全闭合，无回炉项。
收口前置条件：主控亲验 verify 真退出码 EXIT=0（87/621 由采信转亲验）→ staging 显式列文件（台账/manifest/repo/新测试+本单审计档；勿扫 dev-launch.cmd/dist_new//enr-*）→ [locked-change] 尾注 + locks:apply 即时同步。
收口伴随动作：翻台账发现 3 状态（发现 2 先例）；W1 五雷按台账排位另立单元（修雷④时同步修 :94 头注漂移=雷⑤）。
