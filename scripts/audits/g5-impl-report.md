# F-GEOM-01-G5 实现报告——目录化 M2：time/ 4 文件迁移（零行为纯迁移票）

> 实现者=ops-executor（GLM5.3flash $max 绑定）；简报=scripts/audits/g5-impl-brief.md
> 双尾注 [locked-change][test-refactor]；执行日 2026-09-18

## 0. 开工技能清点（会话纪律）

| 技能 | 用/不用 | 理由 |
| --- | --- | --- |
| test-driven-development | 用 | 零行为迁移票的等价红绿闭环=基线锚+变异红证 M1/M2 |
| verification-before-completion | 用 | 全部关卡真退出码物理落 raw log |
| ai-dev-org | 用 | 本岗组织规范（宪法 ORG-SEG 实例），六段简报执行面 |
| systematic-debugging | 不用 | 零行为纯迁移无调试面；无解释红即停工申报（本票未触发） |
| git-workflow-and-versioning / git-advanced-workflows | 不用 | 禁 git commit/branch，仅 git status/diff 只读核对 |
| subagent-driven-development / dispatching-parallel-agents | 不用 | 单一调用者铁律，本岗禁派子代理 |

## ① 交付清单（按单元）

**注：本票禁 git commit（简报§5），全部单元以工作树态+raw 证据交付，无实现者
提交哈希；4 件 rename 相似度由主控收口认领（git status 实测=D 四件+time/
未跟踪目录）。**

| # | 单元 | 内容 | 证据件 |
| --- | --- | --- | --- |
| 1 | 基线锚 | verify 全链 EXIT=0；数字=206 票/open 16（简报写 17 系起草时点滞后，见自裁①）、locks 345、test 170 文件/1744 用例、指纹门 187/1789/5411 | g5-impl-raw.log（末段 G5_BASELINE_VERIFY_EXIT=0） |
| 2 | 物理迁移+深度修正 | mkdir time/+mv 4 件（829 行：reading-time 303/setup 139/outbox 300/outbox-store 87，wc 迁移前后逐件同数）；域内同层零改写 4 处（setup:23/:29/:30+outbox-store:9）；深度修正 5 行（见下清单） | git status D×4+time/；本报告逐行清单 |
| 3 | src 消费面+注释勘正 | 3 行 import+1 行注释（见下清单） | git diff --numstat（main 1/1+ReaderPage 2/2+format 1/1） |
| 4 | tests 受锁面+锁链 | unlock→3 行 import 改写→generate+apply 闭环（345 恒定，manifest 3/3=时间戳+两 tests sha，零意外条目） | git diff --numstat（两 tests 1/1+2/2）+locks/manifest.json |
| 5 | 补链取证 | verify 终验在 tickets:check 断（registry 主控面，见②阻塞呈报），其余七关卡独立取证：quality+test-surface（verify log）+locks（单独 EXIT=0）+lint+typecheck+test+build（串跑 EXIT=0） | g5-impl-verify.log / g5-impl-partial.log |
| 6 | 变异红证 M1（src 面） | main.tsx:4 回退旧径→typecheck TS2307(4,33) EXIT=2→cp 还原 diff identical→复绿 EXIT=0→备份删除 | g5-impl-mutation1.log（三段俱全） |
| 7 | 变异红证 M2（tests 面） | reading-time.test.ts:9 回退旧径→vitest `Failed to load url` EXIT=1→cp 还原 diff identical→复绿 17/17 EXIT=0→复锁+locks:check EXIT=0→备份删除 | g5-impl-mutation2.log（三段俱全） |
| 8 | 实现报告 | 本件 | g5-impl-report.md |

**改写行逐条清单（12 行，全部 Edit 工具逐行落，零探针 .mjs 产生）**：

深度修正（同层迁移后路径加深，5 行）：
1. `src/renderer/features/reader/time/reading-time-setup.ts:13` `'../../api/client'`→`'../../../api/client'`
2. `time/reading-time-setup.ts:14` `'../../shared/ui/toast-store'`→`'../../../shared/ui/toast-store'`
3. `time/reading-time-setup.ts:15` `'./state/reader.store'`→`'../state/reader.store'`
4. `time/reading-time-setup.ts:16`（type import）`'./state/reader.store'`→`'../state/reader.store'`
5. `time/reading-time.ts:61` `'../../shared/reading-time-format'`→`'../../../shared/reading-time-format'`

src 消费面（3 行）：
6. `src/renderer/main.tsx:4` `'./features/reader/reading-time-setup'`→`'./features/reader/time/reading-time-setup'`
7. `src/renderer/features/reader/ReaderPage.tsx:55` `'./reading-time-setup'`→`'./time/reading-time-setup'`
8. `ReaderPage.tsx:56` `'./reading-time'`→`'./time/reading-time'`

陈旧注释勘正（1 行，零行为）：
9. `src/renderer/shared/reading-time-format.ts:4` 「reader/reading-time.ts re-export」→「reader/time/reading-time.ts re-export」

tests 受锁面（3 行，零用例增删）：
10. `tests/unit/renderer/reading-time.test.ts:9` 插 `time/` 段
11. `tests/unit/renderer/reading-time-outbox.test.ts:10` 插 `time/` 段
12. `tests/unit/renderer/reading-time-outbox.test.ts:15` 插 `time/` 段

**±行数（git diff --numstat 机器实测）**：
- 迁移面：旧径 4 文件删除 0/829（=time/ 新 829 行同源+5 行深度修正；0/303+0/139+0/300+0/87）
- src 面：3 文件 +4/-4（main 1+ReaderPage 2+format 1）
- tests 面：2 文件 +3/-3
- 非本票面（在场件，勿计入本票）：docs/handoff/relay.md 28/6（调度员）、locks/manifest.json 3/3（本票锁链同步）、简报未跟踪件

**§3.1 单向核验（报告复核句）**：迁移前 grep 实证 state/ 域对 reading-time
零 import（反向边不存在，grep exit=1 零命中）；time→state 唯一边=setup:15/:16
（useReaderStore+type ProgressFlusher），迁移后改写为 `'../state/reader.store'`
仍指向同一 state/ 域；本票零新增域边（纯移动+路径加深，无新依赖关系）。

## ② 验证证据（命令+退出码+关键输出）

| 命令 | 退出码 | 关键输出 |
| --- | --- | --- |
| npm run verify（基线） | 0 | g5-impl-raw.log 末段 `G5_BASELINE_VERIFY_EXIT=0`；206 票/open 16/locks 345/170/1744/指纹门 187/1789/5411 |
| npm run locks:unlock | 0 | `已解锁 345 个文件` |
| npm run locks:generate + locks:apply | 0 | `仅生成 manifest（345 条）`+`已锁定 345 个文件（只读）`——345 恒定（src 不在锁集合，tests sha 随内容更新，与简报§3 预期一致） |
| npm run verify（终验） | **1** | quality ✓→test-surface ✓（指纹门绿）→**tickets ✗（registry 旧径——主控收口面，见下阻塞呈报）**，链在此中断；g5-impl-verify.log（含末行伪码勘误注）+g5-impl-raw.log（`G5_POSTMIG_VERIFY_EXIT=1` 真值） |
| npm run lint && typecheck && test && build（补链取证） | 0 | lint ✓；typecheck ✓；vitest **170 文件/1744 用例与基线逐数对称（零漂移实证）**；build 三段 ✓；`G5_PARTIAL_CHAIN_EXIT=0`（g5-impl-partial.log 末行） |
| npm run locks:check（终态） | 0 | `locks 检查通过：345 个受锁文件与 manifest 一致` |
| M1 红 | 2 | `src/renderer/main.tsx(4,33): error TS2307: Cannot find module './features/reader/reading-time-setup'`（g5-impl-mutation1.log） |
| M1 还原+复绿 | 0 | `G5_M2_DIFF_IDENTICAL` 同型：`G5_M1_DIFF_EMPTY_EXIT=0`（identical）+`G5_M1_RESTORE_TYPECHECK_EXIT=0` |
| M2 红 | 1 | `Error: Failed to load url ../../../src/renderer/features/reader/reading-time ... Does the file exist?`（g5-impl-mutation2.log） |
| M2 还原+复绿+复锁 | 0 | `G5_M2_DIFF_IDENTICAL_EXIT=0`+vitest 单文件 **17/17 passed** `G5_M2_RESTORE_VITEST_EXIT=0`+apply 345+locks:check EXIT=0 |
| 指纹门（迁移后） | — | `files: 183 base / 187 cur \| cases: 1757 base / 1789 cur \| assertions: 5334 base / 5411 cur \| skipSites: 15/15`——cur 与基线零漂移；`C_after ⊇ C_before（指纹门绿）`（g5-impl-verify.log:27/:68） |
| 旧路径残留 grep | — | src+tests 命中 0（命中项均系 reader/ 留驻件对 state/ 的合法同层引用+time/ 域内同层引用，非迁移面；e2e 两 spec 字符串零触碰） |
| mutation backup 副本 | — | 两件备份还原毕即删（宪法三桶口径③），`BACKUP_REMOVED=0` |
| UTF-8 | — | quality 乱码关卡绿（`无占位标记/无乱码`）；本报告 Write 工具直写不经 shell 传参 |

**阻塞呈报（唯一未达 DoD 项：verify 全链 EXIT=0）**：tickets:check 红=
2 行违规，全部因 tickets/registry.ts 两工单 file 字段仍指旧径（P7X-02→
`features/reader/reading-time-setup.ts`、F-GEOM-01-G5→`features/reader/
reading-time.ts`）——简报§5 禁令明示 registry 改写=主控收口职责、实现者禁触；
票面摘要「翻 done 时 file 随迁改写」即主控翻 done 动作的组成部分。registry 两行
`features/reader/`→`features/reader/time/` 落笔后 verify 全链即闭（其余七关卡
已逐一独立取证全绿：quality/test-surface 在 g5-impl-verify.log、locks 单独
EXIT=0、lint/typecheck/test/build 串跑 EXIT=0）。G4（batch 16）同型先例
（g4-impl-report ②阻塞呈报段+registry 九行主控收口）。

## ③ 自裁申报（门审拷问面）

1. **基线 open 数字勘正（简报 vs 实测）**：简报§3 基线「206 票 open 17」实测
   **open 16**——G4 收口翻 done 已生效（G4 提交 6f4058f750 信息本身记录
   「open 17→16 恰 G4 翻 done」），简报起草时点数字滞后一项。其余基线数字
   （206/locks 345/test 170/1744/指纹门 187/1789/5411）逐项一致。
2. **verify 终验 EXIT=1 非 0（DoD 首项偏离）**：阻塞点=tickets:check 的 registry
   两工单旧径（详②阻塞呈报）——简报§5「禁 registry 改写（主控收口职责）」与
   DoD「verify 全链 EXIT=0」在本票结构性互斥（G4 同型先例）；处置=阻塞如实
   呈报+其余七关卡独立取证全绿，未自行改 registry 消红。
3. **verify.log 取证伪码勘误**：g5-impl-verify.log 末行 `G5_POSTMIG_VERIFY_EXIT=0`
   系 shell 双 echo 第二条的 `$?` 被首条消耗的伪值；真实码=1 已在 g5-impl-raw.log；
   verify.log 内已追加 ASCII 勘误注（追加式，不改历史行）。取证纪律自纠，后续
   M1/M2/partial 全部改用 `$ec=$?` 变量法单点落码。
4. **M2 变异涉锁微窗**：unlock→变异→还原→apply 额外一轮（简报单窗口径外）——
   受锁测试件写权限必需（G4 自裁⑥同型）；还原后 locks:check EXIT=0=manifest
   零内容漂移；终态 345 件全只读。
5. **零探针产出（说明项）**：本票 12 行改写全部 Edit 工具逐行落（简报地图
   行号与实勘逐条一致，无需批量改写探针）——简报§5「自产 .mjs 即时
   generate+apply」义务因零探针自然豁免；受锁面锁链仍完整走完（generate+apply）。
6. **M1 复绿口径=typecheck 单关卡**（非全 verify）：简报§3 步骤 4 M1 行原文
   即「typecheck/verify TS2307 红」二选一口径，与 G4 M1 同型。

## 证据件索引（scripts/audits/）

- 简报：g5-impl-brief.md（主控）
- 基线+真码锚：g5-impl-raw.log｜终验：g5-impl-verify.log（含伪码勘误注）
- 补链：g5-impl-partial.log
- 变异：g5-impl-mutation1.log / g5-impl-mutation1-restore.log（src 面）；
  g5-impl-mutation2.log / g5-impl-mutation2-restore.log（tests 面）
- 报告：本件

MODEL-SELF: model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max
LEDGER-CLAIM: role=ops-executor executor=model-field:account:bigmodel-individual-coding-plan/GLM-5.3$max units=8 outcome=partial
