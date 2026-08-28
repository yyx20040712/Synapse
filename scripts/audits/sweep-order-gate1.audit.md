# 排序雷清扫单元 门一对抗深审档

- 单元：六处 ORDER BY 决胜键 rowid 确定化（事件驱动存量缺陷清扫，无工单号；
  缺陷③ 69188e8 同型；第六雷 listAllIds=主控 2026-08-28 追加裁决）
- 审计角色：门一对抗深审子代理（ADR-0017 三屋）；只读审计，唯一可写=本档
- 日期：2026-08-28
- 结论速览：**0B / 2W / 4N，总评 PASS**（W1 建议主控一行还原处置；W2 移交台账）

## 0 开工记录（会话开工纪律——技能清点）

- code-review-excellence=**用**（对抗深审核心方法论，已按其框架执行）
- receiving-code-review=不用（本角色为审查方非被审方）
- verification-before-completion=不用（铁律禁 npm/test；主控已亲验 verify
  EXIT=0，本审计以实物 diff+磁盘文件+git 只读命令为证据基）
- systematic-debugging=不用（静态审计非调试）
- 其余工程技能（TDD/前端/部署等）=不用（无实现面；运行验证被铁律禁止）
- 配置自查：审计位独立于实现者，未采信其报告任何自述，逐条对实物核实。

输入四件均独立读取：diff 包（420 行）、`git show 69188e8 --stat`、先例回归锁
`tests/unit/db/repos/ai_notes.repo.order.test.ts`、台账发现 3 五雷清单、
实现者报告、verify log（1962 行，关键行抽取）。

## 1 实物一致性基础（先于 A~E 的一切）

- **diff 包 vs 工作树**：`git diff`（去 index 行）与 `scripts/audits/
  sweep-order-gate1.diff` 逐行比对，唯一差异=包额外正确纳入新文件
  lineage.repo.order.test.ts 全文（git diff 不含未跟踪文件）——**包真实无篡改**。
- git status：改动面=9 文件（manifest+5 源+3 受锁测试）+1 新测试，与报告 §2
  文件清单一致；另见 N3（两个非本单元未跟踪物）。
- verify log 尾部亲核：`Test Files 90 passed (90)`、`Tests 661 passed (661)`、
  三段 build ✓、`VERIFY_EXIT=0`（log :1920/:1921/:1939-1961）。

## A 母本符合度（六处修法 vs 主控简报+追加裁决逐条对实物）

| # | 现场 | 票面要求 | 实物核实 | 判定 |
| --- | --- | --- | --- | --- |
| 1 | lineage.repo.ts listNodesStmt | `ORDER BY created_at, rowid` | :177 实物一致 | 过 |
| 2 | lineage.repo.ts listEdgesStmt | 同上 | :178 实物一致 | 过 |
| 3 | papers.queries.ts added_desc | `p.added_at DESC, p.rowid DESC` | :20 一致 | 过 |
| 4 | papers.queries.ts year_desc | 补第三键 `p.rowid DESC` | :21 一致 | 过 |
| 5 | papers.queries.ts title_asc | `p.title ASC, p.rowid ASC` | :22 一致 | 过 |
| 6 | notes.repo.ts:92 selectByLike | `ORDER BY updated_at DESC, rowid DESC` | :92 一致 | 过 |
| 6b | 第六雷 papers.repo.ts listAllIds（主控追加） | `added_at DESC, rowid DESC` | :217 一致 | 过 |
| 6c | corpus.assemble.ts orderAiNotes 末级删除（非换键） | 三键全平 return 0 | :107-108 一致 | 过 |

- 注释/声明同步（⑤同型漂移预防）逐处核实：lineage.repo.ts:80-81 头注+:104
  接口注「created_at,rowid」✓；papers.repo.ts:14-15 头注 listAllIds 行补
  「rowid 决胜——INV-17 同库重导出幂等」✓；papers.queries.ts:17-18 决胜键
  方向说明（原句逐字保留+尾补）✓；notes.repo.ts:88 LIKE 注释一行 ✓；
  corpus.assemble.ts:94-98 头注「三键全平=0，稳定排序保持输入序=repo rowid
  确定序；id 字典序决胜已删」✓。
- **FTS rank 序未动**：notes.repo.ts:85 `ORDER BY notes_fts.rank` 原样 ✓；
  ai_notes.repo.ts:114/:123（缺陷③先例修面）本单元零触碰 ✓。
- 主控预裁 2（删除而非换键）实现形态干净：原
  `a.createdAt===b.createdAt ? (a.id<b.id?-1:1) : …` 的 id 三元**整支删除**，
  新形态 createdAt 独立成句+`return 0`，无死分支残留（corpus.assemble.ts:102-109）。
- 主控预裁 1（三门先例沿用）：本审计独立复核——papers/notes/lineage_nodes/
  lineage_edges/annotations/tags/collections 全部 `id TEXT PRIMARY KEY`
  （migrations/001_init.sql:9/:75、004_lineage.sql:13/:24 等）非 rowid 别名；
  migrations 与 src/scripts 全域 grep 无 `WITHOUT ROWID`、无 `VACUUM` ✓。

## B 宪法红线

1. **SQL 注入面**：六处改动均为预编译语句内的 ORDER BY **字面词**替换，
   零新增拼接面、零参数化变化 ✓。papers.repo.ts:201 `ORDER BY
   ${ORDER_BY[q.sort]}` 模板拼接为**既有模式**（非本单元引入）：q.sort=
   LibrarySort 编译期封闭枚举、映射值=代码常量，无用户输入面——见 N1 注记。
2. **文件行数**：源 232/108/255/139/206，测试 66/78/313/401——全部 ≤500，
   repo ≤300 ✓。
3. **受锁测试扩=契约扩展无放宽**：notes.repo.test.ts 与 papers.repo.test.ts
   逐 hunk 核实为**纯尾部新增**（+import 行），既有断言零触碰 ✓；
   corpus.assemble.test.ts 除尾部新增外有**一处既有行改动**
   （:349 corpusSet 参数，见 W1）——非断言放宽（期望值未动），但属未申报改动。
4. **新测试文件入锁**：manifest 实物 138 条（grep 计数）；lineage.repo.order.
   test.ts 磁盘 sha256=`b8708db5…0870` 与 manifest 记录逐字节一致（亲算）；
   manifest diff=137→138（+新路径+三受锁测试哈希更新）✓。verify 中 locks:check
   「138 个受锁文件与 manifest 一致」✓。
5. **无工单号引用**：新测试文件+新增 hunk grep `SR2|SR-DB|SR-SVC` 零命中 ✓
   （源文件头既有 `[SR2-LG-01]` 等标注为存量行，diff 未触碰）；verify 中
   tickets:check 过（106 工单/open 0，registry 零触碰）✓。
6. **UTF-8/LF**：九个涉改文件 CR 字节=0（od 字节级）✓；审计过程所读中文全部
   可读无替换符；quality:check「无占位标记/无乱码」过 ✓。
7. 死代码/依赖：零新依赖（diff 无 package.json/lockfile）；临时探针
   sweep-order-probe.mjs 已删未留残留 ✓。

## C 代码与测试质量

- **DESC/ASC 与 rowid 方向配对**（裁决 4）：added_desc/year_desc/notes LIKE/
  listAllIds=`DESC, rowid DESC`（后插在前，「最新优先」）✓；title_asc=
  `ASC, rowid ASC`（先插在前）✓；lineage=`created_at, rowid`（ASC 先插在前）✓。
  测试断言方向逐一对得上：papers 两 DESC it 期望 `['a-second','z-first']`、
  title_asc 期望 `['z-first','a-second']`、notes 期望 `['a-second','z-first']`、
  listAllIds 期望 `['a-second','z-first']`、lineage nodes/edges 期望插入序 ✓。
- **orderAiNotes 删决胜干净度**：见 A（无死分支）✓。
- **夹具法**：直插绕过 repo 生成器、id 刻意反字典序于插入序——对 id 决胜/
  无决胜现状必红的设计与缺陷③先例（ai_notes.repo.order.test.ts）同型 ✓。
  lineage 边夹具端点互异避 UNIQUE(from_node,to_node) 冲突 ✓；papers 复用既有
  row() helper（papers.repo.test.ts:7）✓；notes 夹具先插 papers 外键行 ✓。
- **变异 9 轮（R1~R9）映射真恰中**（逻辑核验——禁跑测试，以代码结构证）：
  R1/R2 lineage 两语句各有专属 it（nodes/edges 分测）✓；R3~R5 三键各 it ✓；
  R6 notes 专属 it ✓；R7 还原 id 三元式只中「三键全平」it（主键序 it 输入无
  三键全平对，不受扰）✓；R8 ROLE_ORDER 变异只中主键序 it（三键全平 it 输入
  全同 role，roleDelta 恒 0）✓；R9 listAllIds 专属 it ✓。每轮单 token/单表达式
  与报告声明一致。
- **首红数理**：前五雷 4 文件=2+22+4+20=48 tests，7 红（lineage×2+papers×3+
  notes×1+corpus 三键全平×1）41 绿=48 ✓ 与「7 failed|41 passed」吻合；corpus
  主键序 it 现状即绿（特征化，自裁 6.1 申报）✓；第六雷轮 23 tests 1 红（id
  DESC 旧实现对反序 id 夹具确定性必红——非概率红）✓；终态 661=652+9
  （lineage2+papers4+notes1+corpus2 新 it）+90=89+1 文件 ✓，log 实证 661/661。
- **「对现状必红」声明吻合**：lineage/papers/notes/listAllIds/corpus 各 it
  的旧实现输出与期望的矛盾均为确定性（BINARY 字典序/引擎扫描序），唯一依赖
  查询计划的 year_desc：测试取带 `year: 2024` 过滤形状（papers.repo.test.ts
  :321），修前必红由首红 7/7 **行为实证**背书；修后显式第三键与计划无关。
  EXPLAIN 探针原始输出未留存（脚本已删）——见 N4。
- 新测试全部 always-active 裸 describe（不经 guardedDescribe）✓，符合
  ADR-0017 K3 面；先例形态（头注合约+夹具法）一致 ✓。

## D 报告诚实性

- 自裁 6 项逐条对 diff：6.1 主键序 it ✓（:385-399）；6.2 :17 注释尾补 ✓；
  6.3 lineage 两处注释同步 ✓；6.4 year_desc 过滤形状 ✓；6.5 行尾仲裁 ✓；
  6.6 纪律兑现（manifest 两轮 generatedAt 00:32→01:07 与两轮 locks 叙事吻合）。
- 六处修法表 vs 实物：全对（§A 表）；「票面零删减」：票面五处+第六雷+四处
  测试锁全覆盖，无删减 ✓。
- 661=652+9 数理 ✓（log 亲核）；locks 137→138 实录与 manifest 实物一致 ✓。
- §0 主动申报首次探针 ABI 失误——诚实（正面项）。
- **漏报实锤 → W1**：corpus.assemble.test.ts:349 既有断言参数改动
  `corpusSet({})`→`corpusSet({ paperId: 'p-1' })` 未出现在报告任何位置
  （§2 文件清单仅记「+1 裸 describe 2 it+导入面扩」，自裁 6 项亦无）。

## E 接缝与后续单

- **listAllIds 消费者**：export.service.ts:159（buildCorpusSet 逐篇装配）与
  corpus.export.service.ts:316（`input.paperIds ?? listAllIds()` 全库默认——
  序进 manifest papers 数组=INV-17 面）。两处均**无既有序声明注释**，无需
  同步；语义保障已上推到 repo 头注（papers.repo.ts:14-15）单源声明 ✓。
- **papers.queries 拆分件与 repo 头注一致**：repo 头注对 searchSummaries 仅
  泛称「过滤/排序/total 语义同锁定测试」（:12-13），无具体键声明——无互斥
  漂移 ✓。
- **corpus.assemble 头注 vs INV-24**：片段层序=`sortByDocumentOrder
  (annotations)`（C-01 单源，头注 :23-25 未动）；orderAiNotes 是 [ai:*] 段的
  AI notes 序，非片段序——INV-24「片段序单源」不受扰 ✓。
- **第七雷全域复核**（全量 ORDER BY 逐条）：
  - tags.repo.ts:70/:83 `t.name` 决胜——tags.name UNIQUE（001_init.sql:44）→ 确定 ✓；
  - papers.repo.ts:224/:227 name 决胜——tags/collections name 均 UNIQUE ✓；
  - **残余候选两处 → W2**：annotations `ORDER BY page, sort_key`（:129 等 5 处）
    与 collections `ORDER BY position ASC`（:57/:69），详见 W2。

## findings

### B（阻断）——0 条

### W（警告）——2 条

- **W1 未申报的既有测试改动+与 ipc 契约相悖的调用样例**
  （tests/unit/services/corpus.assemble.test.ts:349）：
  `corpusSet({})`→`corpusSet({ paperId: 'p-1' })`。核实：(a) 不在票面
  （sweep-order-impl-brief.md）、不在主控追加裁决、不在自裁 6 项——报告漏报；
  (b) 无必要性——handler `corpusSet: async () => {}`（ipc/export_.ts:106）完全
  不取参数，同 it 第二调用（:354）与另一 it（:340）仍为 `corpusSet({})` 且
  tsc/vitest 双绿；(c) 语义反契约——`corpusSetReqSchema = z.object({}).strict()`
  （shared/ipc/schemas.ts:305）为空请求 strict 契约，真实渲染端传 paperId 会被
  zod 拒；该测试行教读者「corpusSet 接受 paperId」=接缝声明漂移微缩版。
  影响：零行为影响（参数被忽略、断言期望未动、verify 全绿）。**处置建议**：
  主控直接还原该行为 `corpusSet({})` 并复跑 verify（一行还原，无需整单元回炉）；
  或责成实现者补申报+给出动机。定性不升级为 B 的理由：无行为/断言/锁面破坏，
  且 diff 包对主控透明（非隐瞒，属漏报）。
- **W2 残余同型雷两处候选（第七雷复核产出，移交台账）**：
  (a) annotations.repo.ts:129/:140/:147/:155/:162 `ORDER BY page, sort_key`——
  sort_key=buildSortKey(page,startOffset) 字符串派生键（annotations.repo.ts:
  75-77），DDL 无 (paper_id,page,sort_key) 唯一约束：**同页同 startOffset 的
  两条标注平局无决胜**（同一起点标注两次不同 kind/color 为可达操作）。该序
  是 listByPaper 业务键序（C-01 面），加 `, rowid` 不改业务语义仅确定化平局。
  (b) collections.repo.ts:57/:69 `ORDER BY position ASC`——position 来自导入
  元数据（import.service.ts:236 `upsertByName(p.collectionName, p.position)`），
  撞号平局无决胜；collections.name UNIQUE 可作决胜键。两处触发面均低于本次
  六雷、且不进 INV-17 manifest 面——建议仿发现 3 先例入台账同型雷清单，主控
  裁决是否另立小单元（与 ai_notes 先例同修法口径）。

### N（注记）——4 条

- **N1**：papers.repo.ts:201 `ORDER BY ${ORDER_BY[q.sort]}` 模板拼接为既有
  模式（非本单元引入）：q.sort=LibrarySort 编译期封闭枚举、映射值=代码常量，
  无用户输入注入面——宪法「禁字符串拼接 SQL」针对输入参数面，判定维持合规；
  建议后续单顺手在 ORDER_BY 声明处加「枚举封闭、禁引用户串」注释加固。
- **N2**：locks/manifest.json 工作树为 CRLF（git 警告「CRLF will be replaced
  by LF」）——locks:check 138 一致绿（哈希按 LF 基），.gitattributes 入库归一
  LF，属 generate 脚本 PowerShell JSON 输出特性，无碍；提请主控知悉勿手改。
- **N3**：工作树存在非本单元未跟踪物 `dev-launch.cmd`（mtime 2026-08-27
  21:48）与 `dist_new/`（2026-08-23 16:05）——时间戳均早于本单元实现起点
  （manifest generatedAt 2026-08-28T00:32 起），**非实现者残留**；按宪法
  staging 显式列文件纪律，主控收口提交时勿 `git add -A` 误扫。
- **N4**：year_desc 的 EXPLAIN QUERY PLAN 探针原始输出未留存（probe 脚本
  用后即删）——首红行为实证已背书结论，机制解释自洽；建议后续同类单元将
  EXPLAIN 输出粘贴进报告或审计档（可复核性）。

## 统计与总评

- findings：**B=0，W=2，N=4**
- 核实通过面：六处修法+头注同步 8 处、FTS rank 未动、三门独立复核、
  DESC/ASC 配对、变异 9 轮映射、首红/终态数理、sha256/manifest 138、
  SR2 零引用、LF/UTF-8、行数红线、diff 包无篡改、消费者接缝、INV-24 无冲突。
- **总评：PASS**。实现与测试质量扎实、报告除 W1 一处漏报外诚实；W1 为零行为
  影响的一行处置项（还原或补申报），W2 移交台账按先例另立单元，均不构成
  本单元回炉依据。
