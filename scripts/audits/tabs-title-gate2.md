# 门二终审 —— 缺陷②修复（标签页哈希名→文献名）

单元：事件驱动缺陷②（用户 2026-08-27 视检实锤，发现档 §1 发现 2）。
模式：三屋门二（ADR-0017 / methodology §4.3）；日期 2026-08-27。
输入：tabs-title-diff.patch（420 行终态）+ impl.report.md（含 §8 回炉节）+ gate1.audit.md（含回炉复核节）+ docs/reports/2026-08-27_visual-check-findings.md 发现 2。
方法：diff 包与工作树 `git diff` 逐字节比对；实现/契约/DB/ESLint/manifest 亲读亲算（sha256 十一文件对账、wc -l、file、grep 禁令面）；变异红证按断言面独立复算。禁 npm/测试/git 写全程遵守。

## 0. 技能清点（开工纪律）

- code-review-excellence：**用**——本任务即对抗性终审。
- verification-before-completion：**用**——终审=收口前最后验证面。
- 其余工程技能（TDD/systematic-debugging/subagent-driven-development 等）：**不用**——只读审计单元，无实现/调试/派发面（禁 npm/测试前置）。

**前置事实（全部后续判定的锚）**：diff 包与工作树实际 `git diff` CRLF 归一后逐字节全等（420=420 行，diff 退出码 0）——diff 包为终态真档；`git status` 16 个 M 文件与报告 §8 清单全等（15 实现+测试面 + manifest；回炉新增 reader-text.spec.ts），+118/-23 与申报全等；papers.repo.ts 与 tickets/registry.ts 均不在改动面。

## ① 处置核对（门一 r1 四 W + 6N vs 终态）

| 项 | 判定 | 依据一行 |
|---|---|---|
| W1（补 M4 变异红证） | **PASS** | 报告 §8 M4 表 + DIFF_EMPTY_M4；工作树 reader.service.ts:54 现为 `title: d.title`（还原实证）；独立复算自洽——fixture `detail.title: 't'`（reader.service.test.ts:8-10 亲验），变异后 r.title=''≠'t' 恰新用例独中（其余 618 用例不经 service.open 的 title 消费） |
| W2（TabBar 头注枚举补 title） | **PASS** | TabBar.tsx:7 亲读「fileName/title/status」——:7 枚举与 :8-9「title 优先」段内自相矛盾消除 |
| W3（薄取四字段计数） | **PASS** | reader.service.ts:8 亲读「本层薄取四字段」——与 :54 实返 fileUrl/fileName/title/lastReadPage 四字段一致 |
| W4a（受锁 e2e 注释） | **PASS** | reader-text.spec.ts:252-253 亲读：新语义（title 优先/fileName 兜底/缺陷②来历）+「定位不依赖标题文本」显式声明；nth 位置定位策略保留（:255）；受锁流程 unlock→改→apply+回炉轮 verify EXIT=0 申报在案，我以 sha 对账强验证（见③受锁面，十一文件全 OK——含本文件） |
| 6N 存量（N1-N4/N6） | **PASS（维持裁量档）** | 报告 §8 末段已知悉申报属实；N4 抽验 tab-dirty.ts:13 头注未动（门一已判不算违规）；N3 CRLF 见④；门二不扩面不动裁量档正确 |

4 W 判定全 ADDRESSED、6N 维持——与门一回炉复核节结论一致且逐条属实。

## ② 母本符合度（主控裁决五条 + 契约管道复核）

| 裁决 | 判定 | 依据一行 |
|---|---|---|
| ① TabState+title hydration | **PASS** | reader.store.ts:75-77（必填 title 建位）/:145（makeLoadingTab 初值 ''）/:277（hydration `title: d.title`）亲读；error 重试经 `...prev` 沿用（:139） |
| ② title 优先+fileName 兜底两处 | **PASS** | TabBar.tsx:48 与 tab-dirty.ts:101-102 同型亲读；loading/error 占位早返回保留（TabBar.tsx:46-47） |
| ③ TabBar 头注更新 | **PASS** | TabBar.tsx:6-10（消费枚举+title 优先+缺陷②来历）亲读，与实现零互斥 |
| ④ papers.repo 零触碰 | **PASS** | git status 16 M 文件不含 papers.repo.ts——实证；fileName=托管基名语义未动（service :54 仍透传 d.fileName；reader.store.test 新用例 :373 断言 fileName 语义不变） |
| ⑤ 受锁扩展授权 | **PASS** | 10 测试文件改动=9 夹具单行（`title: ''`）+4 新用例+1 e2e 注释（diff 逐行过目，patch=工作树全等）；零断言放宽、零既有用例语义改动；-23 deletions 全为同位改写（门一 19+回炉 4=23 复数吻合） |

**契约管道（实现者自裁①）复核 = PASS**：链路六环闭合亲验——DB `papers.title TEXT NOT NULL DEFAULT ''`（001_init.sql:12）→ papers.repo toSummary 携 title 入 detailById 返回（papers.repo.ts:146/:285-286）→ reader.service 透传（:54）→ readerOpenResSchema `title: z.string()` required（schemas.ts:39，strict() 下收紧非放宽）→ api-surface.ts:38 Res=readerOpenResSchema（类型流入 ApiHandlers，service 返回义务 tsc 编译期强制）→ renderer unwrap（无 zod 运行时出向校验——既有架构）→ hydration。required 根基成立（title 恒为 string，空串合法态由展示层兜底分支覆盖）；形态最小（schema+透传各一行+注释），符合裁决意图（单次请求直达），无替代方案私货。

## ③ 宪法红线终审

| 红线 | 判定 | 依据一行 |
|---|---|---|
| 分层单向 | **PASS** | service 只加透传字段（ipc→services→repos→db 无新跨层）；renderer 四文件 import 仅 store/共享类型（TabBar.tsx:37-41、tab-dirty.ts:44-46、reader.store.ts:65-69 亲读） |
| 受锁面清单 | **PASS（按实际数落档）** | 改动 16 文件中受锁=11：schemas.ts + 10 测试文件（9 unit+1 e2e reader-text.spec.ts）——11 文件 sha256 亲算与 manifest 逐条全 OK，manifest 132 条亲测；[locked-change] 义务=schemas.ts+10 测试+manifest 本身。注：任务书口径「8 测试文件」为粗数（首报 §2 列 9 unit+回炉 +1 e2e=10），终态按实际 10 落档 |
| 安全禁令零触碰 | **PASS** | diff 全文 grep（eval/new Function/nodeIntegration/webSecurity/sandbox/contextIsolation/openExternal/拼接 SQL）零命中；本单元不触 db 层与协议面 |
| 文件行数 | **PASS（含 1 注记）** | 实现面全 ≤500（reader.store 425/TabBar 160/tab-dirty 107/reader.service 85/schemas 355，wc -l 亲测）；reader-text.spec.ts 502 行——ESLint max-lines 对 `tests/**/*.ts` 显式 off（eslint.config.js:183-186 亲读），机检口径不违宪；且基线 501 既存（回炉净 +1），非本单元突破 |
| UTF-8 | **PASS** | 八关键文件 file 命令全 UTF-8、中文亲读可读（含 diff 包自身） |
| TDD 证据链四档 | **PASS** | 首红恰 4 failed/615 passed（4 FAIL 名单与新用例名全等，=基线 615 吻合）→ 绿 86 文件/619 用例（=615+4 恰合，≥基线）→ 4 变异红证（M1-M4 逻辑独立复算全自洽：M1 必红 tab-bar 新用例 labels 双断言；M2 必红 stringContaining 正反双向断言；M3/M4 各独中——mock 与 fixture 消费面亲验）→ 还原 diff 空×4（cp 备份法申报 + 工作树四处变异点终态均为正确实现——与 patch 全等佐证还原完整）；verify 三轮 EXIT 实录（2×2 tsc 拦夹具传染→0）+回炉轮 EXIT=0，文书链自洽（门二禁 npm，双档对账+工作树一致性采信） |

## ④ 机器面核对

| 项 | 判定 | 依据一行 |
|---|---|---|
| 数字一致性 | **PASS** | verify EXIT=0（申报）·86 文件/619 用例（=615+4）·manifest 132 条（node 亲测）·diff --stat 16 files +118/-23（git 亲测与申报全等） |
| locks CRLF 归一口径 | **PASS（处置申明归主控）** | manifest.json 工作树 CRLF（git 警告实测在场）；check-locks 按受锁文件字节 sha 对账（11 文件亲算全 OK），manifest 自身行尾不入对账（非自锁，grep 证无自锁条目）——提交时 .gitattributes 归一 LF，CI checkout 同口径，无回溯假绿窗口；残留=提交后 git status M 噪音（门一 N3 处置申明维持，主控提交后刷新即可） |
| e2e 面 | **申明（非本复核面）** | W4b 全量 e2e=主控收口亲跑（需先 build）；断言面风险门一 E 节已析（nth 定位+error 占位早返回不变，预计零红）——收口单义务 |
| registry 翻状态义务推演 | **PASS** | 事件驱动缺陷单元无工单号：registry 无 tabs-title/缺陷② 条目（grep 零命中）且文件不在 16 M 改动面——零翻状态义务成立 |

## ⑤ 成本账本

| 单元 | token/时长 | 来源 |
|---|---|---|
| 实现者首轮 | 3.55M / 17.9min | 报告（主控汇出口径） |
| 实现者回炉 r1 | 1.41M / 3.1min | 报告 §8 |
| 门一（含回炉复核） | 0.92M / 5.2min | 门一档 |
| 主控复核 | 0.35M / 1.0min | 任务书（主控汇出） |
| **门二本档** | **估 ~0.5M / ~6min**（估计标注：14 次工具调用+终审档撰写，门一同量级上浮） | 自记 |

累计估 ~6.73M / ~33.2min（三屋全链：实现+回炉+门一+复核+门二）。

## 总结论

**PASS —— 可原样进入主控收口**（verify+e2e 亲验后 [locked-change] 提交）。

统计：四清单+一逐点全 PASS（①4W+6N 全属实；②五条裁决+契约管道六环闭合；③六红线全过含 2 注记；④四项机器面全过；⑤账本落档）。新增注记 2 条（均非阻断）：N-a 终态受锁测试文件实为 10（任务书口径 8 为粗数，[locked-change] 尾注义务按实际 12 文件=schemas+10 测试+manifest）；N-b reader-text.spec.ts 502 行在 ESLint tests 豁免面、基线 501 既存（收口后可入后续瘦身单，非本单元义务）。无回炉项。

---

## ── 回炉 2 增量复核（2026-08-27，一行级）──

输入：更新版 diff 包（440 行，+20）+主控裁定（e2e 2 红根因=tab 关闭钮 aria-label 子串碰撞）。前置锚：新包与工作树 `git diff` CRLF 归一后逐字节全等（440=440）；增量=reader-text.spec.ts 三 hunk（:352/:384 定位收紧+注释节改写）+manifest sha 一条，实现面/unit 面零变化，git status 仍 16 M。

| 项 | 判定 | 依据一行 |
|---|---|---|
| ①定位收紧=基建加固非断言放宽 | **PASS** | :352/:384 仅把点击钮查询从 win 级收紧为 `getByTestId('selection-toolbar').getByRole(...)` 容器内——消除 Playwright name 默认子串匹配的多义性（碰撞源=TabBar.tsx:144 `aria-label={`关闭 ${title}`}` 含种子标题字样，机制亲证）；点击后渲染断言（annotation-rect toBeVisible）与被点击目标语义零动 |
| ②声明改写如实 | **PASS** | 注释三句与代码逐条对账：title 优先/fileName 兜底（=tabTitle 实现）、tab 按 order 位置（=:258 nth）、按钮收紧防子串碰撞+回炉 2 来历（=:352/:384 实改）——零夸大零失实 |
| ③增量新破坏 | **PASS（零）** | sha 对账 reader-text.spec.ts OK、manifest 仍 132；全 spec 裸 getByRole('button') 独立 grep 复查——余下 name（文献库/设置/AI 读文献/脉络等）均固定 UI 串或 exact:true，各 spec 种子标题不含其连串，与「全 spec 排查零命中」申报交叉一致；VERIFY_EXIT=0（619/619，unit 面零改动与用例数不变自洽）+E2E_EXIT=0（20/20）申报采信 |

**增量结论：PASS——维持「可原样进入主控收口」总判定不变。**（此节增量复核估 ~0.2M/~3min，计入门二账本）
