# SR2-ENR-01 门二终审（2026-08-28）

审计人：门二子代理（独立于实现者与门一；门一结论亦抽核，不信其转述）。
方法：只读实物核对（源文件全文+git diff/status 单点+四份证据日志统计行 grep+check-tickets.mjs 规则逐条推演）；禁一切 npm/test/verify 执行（主控已亲验，收口将再亲验）。
输入：票面母本（cited-by.service.ts 头注五层+enr-ticketing-draft.md §SR2-ENR-01）/enr01-impl.report.md/四份日志/enr01-gate1.audit.md（0B/2W/8N）/enr01-gate1.diff（1068 行）+门一后两处主控处置（W2/N3）。

开工技能清点：code-review-excellence（用·终审=对抗式深度审查核心）/verification-before-completion（用·四清单逐项对实物收口）/javascript-testing-patterns（不用：不写测试，仅数理与证据链核对）/systematic-debugging·TDD（不用：禁执行测试、零实现面）/git-advanced-workflows（不用：仅只读 git diff/status 单点核对）/其余技能（不用：零接触面——renderer/部署/数据管线等本单均未涉及）。配置自查：门二=GLM-5.3 终审配置运行中，符合 ADR-0017 独立终审要求。

## ① 处置核对（门一 findings+主控裁决 vs 终态实物）

**W1（报告计数 10→9 笔误，知悉不回炉）：PASS**
- 门一证据链成立：enr01-gate1.diff:785-852 cited-by.test.ts 九用例逐条在案（格1/1b/2/3/4/4b/5/6 共 8+跨格序列 1=9）；enr01-red.log 尾部 `cited-by.test.ts (9 tests | 9 failed)`（门一 W1 引证行经 red log FAIL 条目分布复核吻合：格1~跨格 9 条 FAIL 全列）。
- 主控 W2 处置产物（INV-28 行）已沿用正确数字「9 用例」（docs/invariants.md:42）。
- **收口执行提示（供主控）**：收口简报/提交信息沿用 9，勿沿用实现者报告 §二/§三的"10"。

**W2（invariants 未登记，主控已补 INV-28 行）：PASS——已落、三要素齐、内容与实现一致、无范围外扰动**
- 实物存在：docs/invariants.md:42 INV-28 行（git diff docs/invariants.md 唯一 hunk，+1 行，无其他扰动——门一 diff 之后该文件零其他改动）。
- 三要素齐：声明处=`cited-by.service.ts 头注状态机（刷新决策单源 citedByPatch；SR2-ENR-01，2026-08-28 门一 W2 处置登记）`；强制方式=`单测（cited-by.test 9 用例）+真库断言（papers.repo.test：applyEnrichment 第三参 SET 落库+再不传则保留——SQL 面唯一锚定点）`；锚定状态=`已锚定（单测+真库级 2026-08-28 SR2-ENR-01）`。
- 内容逐点对实物：强制刷新三列同写=papers.repo.ts:191（`columns.push('cited_by_count','cited_by_fetched_at','cited_by_count_source')`）；两形不写缓存=cited-by.service.ts:96（`work === null || work.citedByCount === null → null`）；判别 `=== null`/`!== null`=cited-by.service.ts:96+papers.repo.ts:242；detailById 配对透出=count 非 null 三字段齐出、null 全省略=papers.repo.ts:242-249（展开条件+`=== null ? undefined :` 显式三态）。「9 用例」与 W1 修正口径一致；「真库断言」描述与 papers.repo.test 三用例（enr01-gate1.diff:727-783：SET 落库/不传保留/透出配对）吻合。
- 登记采纳门一建议案（补登记而非裁定头注已足），处置方向正确。

**N3（openalex 头注不对称，主控已补 2 行）：PASS——已落、口径与 crossref 一致、无信息冲突**
- 实物存在：openalex.ts:11-12 两行（`（EnrichedWork.citedByCount=number|null 由本源解析 cited_by_count——SR2-ENR-01；缺省/显式 null 归一 null，行为口径单源在 crossref.ts 的 EnrichedWork 声明处）`）。
- 口径比对：crossref.ts:12-14 头注=`citedByCount: number|null（SR2-ENR-01——is-referenced-by-count，null=响应缺被引数：命中仍成立，不写缓存）`。两侧一致点：类型 number|null、缺省归 null、命中仍成立不写缓存、行为单源在 EnrichedWork 声明处（crossref.ts:39）。openalex 补「显式 null 归一」与其 zod `z.number().int().nullable().optional()`（openalex.ts:49）+toWork `?? null` 归一（openalex.ts:86）精确对应；crossref 头注只写「响应缺被引数」略简但语义涵盖（crossref.ts:102 同型 `?? null`），两文件头注互不矛盾。
- 格式合规：续行以 ` *   （`/` *     ` 开头，非顶格 import/export 词行（票面 N1 规则不违）。

**N1/N2/N4~N8（注记无动作）抽核两条：**
- N7（row 参数）：PASS。cited-by.service.ts:88-99 终态实证——row 仅入签名不参与分支（分支只用 work 两态）；头注:84-86 声明「保留谁的缓存」锚定语义；票面接口层原文即含 `row: Pick<PaperRow,'cited_by_count'>`（enr-ticketing-draft.md:73）。门一结论可信。
- N8（判空口径）：PASS。判别面三处逐字核：cited-by.service.ts:96（`=== null`）；papers.repo.ts:242（`r.cited_by_count !== null`）+:246（`=== null ? undefined :` 显式三态）；enrich.service.ts:149（`citedBy ?? undefined`——对象仅 null|CitedByWrite 两态的参数适配，非 0/NULL 判别）。provider 归一面 `?? null`（crossref.ts:102/openalex.ts:86）是 undefined→null 类型归一，0 非 nullish 不受影响，不属判别面。变异轮 1（`=== null`→`=== undefined` 3 红，enr01-mutation.log:1-10）反向互证判别 token 被测试锚定。门一结论可信。

**主控预裁三项终审裁定（门一全维持，门二终审）：**
1. **migrate.test.ts:10 单行——接受维持**。enr01-gate1.diff:694-706 唯一 hunk（`[1,2,3,4]`→`[1,2,3,4,5]` 仅 :10）；:11 `Math.max(...MIGRATIONS.map(m => m.version))` 动态断言在 diff 上下文实证零涟漪。票面「断言动态 Math.max 零涟漪（不改）」误读断言结构：:10 是 appliedVersions **字面量**断言，新迁移入册必然失配——仓库事实证伪票面，改动性质=契约同步非放宽，历史先例（222962c/06ea570）同型。
2. **papers.queries.ts 拆分——接受维持**。门二独立逐段比对：ORDER_BY/AGG_COLS/LIST_SQL/SummaryRow/DetailRow/escapeLike/toSummary/buildFilters 八件从 papers.repo.ts 删除侧到 queries.ts 新增侧逐字同（enr01-gate1.diff:329-431 vs :126-233），唯一差异=export 化+buildFilters 闭包级→模块级（函数体仅引用 import 的 escapeFtsQuery、模块级 escapeLike 与局部变量，零闭包依赖，等价）；DETAIL_SQL/DetailRow 多出三缓存列是票面功能新增非搬移漂移。终态行数 papers.repo.ts 255/papers.queries.ts 107（wc -l 实测）均 ≤300 repo 关卡；repo→同域 queries 不破坏分层单向。票面无任何「不拆」断言，宪法 repo ≤300 是机械强制——「宪法机械配套」判定成立。
3. **Node24 环境注——接受维持**。dev-launch.cmd/dist_new/ 在 git status untracked 且不在门一 diff 16 文件内（N6 已核），非实现者越权产物。

## ② 母本符合度（票面五层 vs 终态，抽验门一 A 工单结论）

**PASS（门一 A 结论抽验全部成立）**
- 状态机六格：cited-by.test.ts（enr01-gate1.diff:800-852）格1/1b/2/3/4/4b/5/6 全实现+0 值边界两样本（格1 样本 0、格4b 0→0）+跨格序列三段（NULL→命中0→写入0→命中5→刷新5→异常→保留）——票面六格表逐格对得上。
- 接口签名：citedByPatch 四参与（work/source/row/now）票面逐字一致（cited-by.service.ts:88-93）；返回型 CitedByWrite 为票面内联形状的命名等价单源（papers.repo.ts:297 区段，services 以 import type 消费——分层单向合规）；三 optional（paper.ts:46-48）逐字符票面（number.int/string/paperSourceSchema）。
- 零触碰五项：PaperMetaPatch/paperMetaPatchSchema（paper.ts diff 唯一 hunk 只动 paperDetailSchema 区块，hunk 上下文实证）/PATCH_COLS（papers.repo.ts diff:322-327 上下文行未动）/update-meta 契约面（citedBy 走独立第三参不进 PATCH_COLS——papers.repo.ts:186-194）/tickets/registry.ts 未碰（git status 无 M）。
- arxiv.ts 零改动：git status M 列表与实现面 untracked 均无 arxiv.ts——实证。
- 白名单零新增：src/shared/constants.ts 不在变更集（git status）——ALLOWED_REMOTE_HOSTS 无改动。
- 迁移 005：三条 `ALTER TABLE papers ADD COLUMN` 全可空（enr01-gate1.diff:118-120）；migrate.ts MIGRATIONS 追加 version 5（diff:96-103）。
- 组装点：enrich.service.ts:109 区段 arxiv 组装补 `citedByCount: null`（diff:574）；deps.now 可选注入（diff:558-562，corpus.export.service deps.now 同型先例属实）。

## ③ 宪法红线终审

**PASS**
- 分层单向：ipc→services→repos→db 无破坏（cited-by.service import type 自 repos、repo→同域 queries）；renderer 零文件改动（见④ e2e 面）。
- 受锁流程：unlock 134→受锁六件改动（shared/models/paper.ts+migrate.test+papers.repo.test+enrich.service.test+crossref.test+openalex.test）→generate 136（005_cited_by.sql+cited-by.test.ts 入册）→apply 136；**manifest 136 与实物一致**：verify log:34 `locks 检查通过：136 个受锁文件与 manifest 一致`+grep '"path"' locks/manifest.json 计 136；manifest diff 含 005/cited-by.test 两条新增与六条 sha 更新（enr01-gate1.diff:16-19/54-57）与实物吻合。门一后主控仅动非受锁文件（docs/invariants.md/openalex.ts 头注——openalex.ts 非受锁），锁面零扰动。
- 安全禁令：SQL 全 db.prepare+参数绑定（applyEnrichment 三列进 columns/values 白名单机制——papers.repo.ts:186-194；buildFilters 片段固定值绑定）；无 eval/newFunction；无新增出网 host；无新依赖（package.json 不在变更集）。
- 行数：papers.repo.ts 255/queries 107/cited-by 100/enrich 158/crossref 139/openalex 110/paper 85（wc -l 实测）——repo ≤300、文件 ≤500 全合规。
- UTF-8：全部新增中文内容（头注/注释/测试名/INV-28/005.sql）Read 工具逐件可读；verify quality/mojibake 关随 exit=0 已过。（注：Git Bash 终端管道输出显示乱码属终端显示编码，非文件内容问题。）
- TDD 证据链四档：
  1. 首红=enr01-red.log:2195-2196 `Tests 19 failed | 620 passed (639)`+`exit=1`；Test Files `6 failed | 82 passed (88)`——六个新扩文件全红，19=18 新用例+migrate 字面量 1，与报告 §三分布描述吻合（cited-by 9/repo 3/migrate 1/providers+enrich 断言红=6）。
  2. 绿=enr01-green.log:1842-1847 `88 passed`/`639 passed`/`exit=0`。
  3. 变异四轮=enr01-mutation.log:1-43：每轮 `[backup]→[mutated] single token→[test exit] 1→红用例列表→[restored]→[diff] empty (restore verified)`；轮1 3红/轮2 6红/轮3 2红/轮4 2红，单 token 断言恰一次命中由 `[mutated] single token replaced` 声明+目标串唯一性（轮1/3/4 token 在文件唯一、报告声明）支撑；cp 备份法（非 git checkout）、工作树无 *.bak 残留（ls 实测 No such file）。轮 2 红含 TypeError 型（门一 N2 已注记）——单 token 恰中+测试捕获破坏成立，红证效力等同。
  4. verify 真退出码=enr01-impl-verify.log:1963 `exit=0`（七关全过：quality/tickets/locks 136/lint/typecheck/test 88 文件 639 用例/build）。
- 测试合约纪律：受锁测试改动均为契约扩展（新裸 describe 块+夹具补字段+断言补行），无一处放宽既有断言（enr01-gate1.diff:707-1068 逐块核对）；新用例五处全 always-active 裸 describe（不经 guardedDescribe）。

## ④ 机器面核对

**PASS（含一项收口前置发现，非实现缺陷）**
- verify 数理一致：`Test Files 88 passed (88)`+`Tests 639 passed (639)`（verify log:1922 与 Tests 行）。639=基线 621+新增 18 ✓；18=cited-by 9+papers.repo 3+enrich 3+crossref 1+openalex 2=18 ✓（主控口径 9+3+1+2+3 同和）；文件数 88=基线 87+新增 1（cited-by.test.ts，其余扩在既有文件）✓；首红 19=18+1（migrate 字面量）自洽 ✓。
- locks manifest 136 与 git status 实物一致：`M locks/manifest.json`+005/cited-by.test untracked 入册；门一 diff 与终态 git diff 文件级聚合比对——**终态相对门一 diff 恰好两处差异：docs/invariants.md 新 hunk（W2）与 openalex.ts 头注 2 行（N3）**；005/queries/cited-by.test 三件在门一 diff 有而在裸 git diff 无，系 untracked 文件口径（git status `??` 确认三者健在），非差异。
- **翻 done 推演（check-tickets.mjs 逐规则）**：
  - 规则 1（文件存在）/3（无 NotImplementedError 占位）/4b（无 data-ticket/工单号初值 _STUB）——全绿：cited-by.service.ts 存在、STUB 已删（diff:498-499 删除侧实证）。
  - 规则 5（guardedDescribe 绑定）——不触发：SR2-ENR-01 新测试全裸 describe，无 `guardedDescribe('SR2-ENR-01'`。
  - 规则 6（b3 指针）——绿：cited-by.service.ts:1 `// b3: P7-G` 在头注释区，P7-G 属 ROADMAP 已裁决集（门一 A 已验）。
  - 规则 2（done 工单号外溢引用即红）——**红点，收口前置动作**：现状 SR2-ENR-01 号散布于 7 个 src 文件（grep 实测），除工单自身 cited-by.service.ts（自引用豁免）外**6 个文件翻 done 即红**：shared/models/paper.ts、papers.repo.ts、papers.queries.ts、enrich.service.ts、crossref.ts、openalex.ts。历史先例实证：SR2-AI-03/AI-06/LG-01/TABS-04 四个 done 工单在 src 其他文件**零残留**（grep 实测仅自身文件命中）——收口模式=翻 done 前清除/改写这 6 处工单号注记。**其中 shared/models/paper.ts 是受锁文件**，清场须走 locks:unlock→改→locks:apply 全流程（触发 manifest 更新，收口 verify 亲验覆盖）。tests/ 面新用例字符串 'SR2-ENR-01' 不触发（tests 分支仅查 unimplementedObject/NotImplementedError 占位调用）。
  - **头注行推演结论：cited-by.service.ts:3「工单：open / strong」翻 done 后无需同步改**——check-tickets 不解析该字样+自引用豁免（t.file===rel）；仓库先例：SR2-AI-03（done）自身头注 corpus.export.service.ts:3 至今保留「工单：open / strong」原样（头注=历史任务书存档口径）。
- e2e 面申明核对：本单全部变更（14 个 M+实现面 3 个 untracked+invariants）**零 renderer 文件**（git status 全列实测）——e2e 零涟漪申明成立。

## ⑤ 成本账本行（供主控入账）

| 单元 | token | 时长 | 备注 |
| --- | --- | --- | --- |
| 实现者 | ≈11.11M | 22.2min | 两轮：1.01M/5.7min（首轮 BLOCKED 后）+10.10M/16.6min |
| 门一 | ≈1.08M | 3.5min | 0B/2W/8N，PASS |
| 门二（本档） | ≈0.12M（自估） | ≈8min（自估） | 无精确计量工具，供主控对账校正 |

## 总评

**PASS——可收口。**

四清单+一全过：处置核对（W1 证据链成立、W2/N3 两处处置已真落且未引入新问题、抽核两条 N 级可信、预裁三项终审维持）；母本符合度（六格/签名/三 optional/零触碰五项/arxiv 零改动/白名单零新增逐项实证）；宪法红线（分层/受锁 136/安全禁令/行数/UTF-8/TDD 四档证据链）全绿；机器面数理自洽（639=621+18=621+(9+3+1+2+3)）。

**收口前置动作（主控执行，勿遗漏）**：翻 registry 前 ①清除/改写 6 个 src 文件中的 SR2-ENR-01 工单号注记（check-tickets 规则 2，历史 done 先例均零外溢残留）；②其中 shared/models/paper.ts 受锁，清场走 unlock→改→apply；③cited-by.service.ts 头注「工单：open / strong」行无需改（先例保留）；④收口简报用例数沿用 9（W1）；⑤收口 verify 亲验将覆盖清场后的 tickets 关与 locks 关。
