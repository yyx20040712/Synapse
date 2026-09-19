# F-DOCGOV-01 实现者六段简报（文档补课批——裁决 9 前步+裁决 7/8 落点）

> 派发档位：ops-executor 绑定（GLM5.3flash $max）。主控=GLM5.3 max（本会话）。
> 票：tickets/registry.ts `{ id: 'F-DOCGOV-01' }`（registry:317）。票面权威=裁决书
> docs/design/2026-09-18_complexity-governance-ruling.md §梯队五表 F-DOCGOV-01 行。
> 体检源报告（发现清单单源）=scripts/audits/2026-09-18_survey-doc-drift.md；
> rubric=技能 08 文档群治理（C:\Users\Administrator\.zcode\skills\ai-dev-org\references\
> 08*.md——事实分层/指针化/单源纪律三原则，动手前通读）。

## ① 任务与边界

**纯文档批 + 恰 2 行 src 注释 + 1 新 ADR 件。零行为变更、零 tests 触碰、
零指纹门漂移（预期基线 183·1768·5368·skip14 逐位不变）。**

主控侦察已全边落档（本简报②）——落刀点勿凭印象重侦察，但**落笔前计数/
行号/路径一律实码复核**（宪法「计数落笔前机器实测」）。

改动面（恰 14 文件 + 新 2 件）：

| # | 文件 | 性质 |
|---|---|---|
| F1 | docs/architecture.md | 主战场（244 行） |
| F2 | docs/DEVELOPMENT.md | §6 路径修正 |
| F3 | README.md | 导览补齐 |
| F4 | docs/invariants.md | **受锁**——unlock→改→apply 单链 |
| F5 | docs/ROADMAP.md | 退役一页纸（强制条款②） |
| F6a-d | docs/adr/0005/0008/0014/0015 | 复审追认/交叉注记 |
| F6e | docs/adr/0020-*.md | **新件**（改名迁移 ADR 化） |
| F7 | docs/audits/weak-anchor-register.md | 销项段修复 |
| F8 | src/main/services/ai_sensor/ai-notes-import.service.ts | 恰 1 注释行 |
| F9 | AGENTS.md | 恰 1 括号句（自裁-1） |
| F10 | docs/DEV-SETUP.md | .mimosa 备案一行 |
| F11 | AGENTS.md（完成定义段） | check-model-names 入宪法叙述 |

零触碰：tests/**、scripts/*.mjs 既有件、package.json、ci.yml、
tickets/registry.ts（主控收口翻票）、docs/prompts/**、src 其余一切。
禁 git commit（主控收口职责）；禁改锁 manifest 以外一切受锁件。

## ② 改写面（主控侦察落档——落刀前逐项实码复核）

### F1 architecture.md（体检 A1~A6 逐项销账 + L2 锁线 + 承接项）

- **§1 分层图**：加 workspaces 装配层一行注记——`workspace-layout.ts`
  （本会话数据目录解析：legacy-fresh=userData 根｜workspace=workspaces/<id>）+
  `data-layer.container.ts`（库级分目录热换可重建 facade，ADR-0018）（A4）。
- **§3 契约机制**：补 L2 锁线论证段（裁决书「L2」行）：api-surface 通道名
  `域/方法` 形态天然映射 HTTP 路由 `/api/域/方法`——接线表单源设计使
  IPC 通道与未来 Word/WPS 插件↔服务端共用同一命名论证，插件侧零改面。
- **§4 关卡清单重写**（A6，现实防线全列，如实标注接线状态）：
  - 本地 verify 8 段链：quality → test-surface（指纹门 INV-63）→ tickets →
    locks → lint → typecheck → test → build（package.json:30 实文）。
  - quality 内嵌段点名：B-1 dup-constants（check-quality.mjs:17 内联）/
    B-5 AST/6c C-4c/第 9 段 e2e 截图负锚（INV-64）。
  - 独立本地关卡：`npm run lint:model-names`（src 域禁模型代号词表——
    **未串 verify/CI 链，如实标注「本地手动关卡」**）。
  - CI 附加：dep-change/manifest 尾注检查、npm audit、[test-refactor]
    范围闸（ci.yml 实文为准——落笔前亲读 ci.yml）。
- **§5 关键设计决策 → ADR 索引表**（A5）：逐件一行表 0001~0020
  （编号｜标题｜一句话｜状态），**0010 空号注记行**（见 F7），
  0020=本票新件。删旧 AD-1~AD-7 叙述段（信息入表零损失）。
- **新增三结构段**（每域 8~12 行紧凑、指针化、禁复制 ADR 正文）：
  - **lineage**：renderer features/lineage（7 域之一）+ main services/lineage/
    +db lineage.repo + 迁移 004/006/007；指针 ADR-0014+0012（共存已裁决）；
    INV 指针 27/36/38/41/43/44/48（指针不复制）。
  - **workspaces**：ADR-0018 指针；workspace-layout.ts **legacy-fresh 双态
    语义补档**（④#7：全新首启不建 workspaces/、二启迁移入 default——与
    ADR-0018 叙述的分支差异显式说明）；data-layer.container 可重建 facade；
    renderer features/workspaces；INV-35 指针。
  - **ai-sensor**（**随 F-SENSOR-01 终态回写——防同段双写顺序约束**）：
    ADR-0015 指针；三键终态=services/ai_sensor/ 三件（ai-sensor/ai-notes-import/
    zcode-link）↔ ServiceBundle 三键平铺（ai_sensor/ai_notes_import/zcode_link）
    ↔ ipc/ai_sensor.ts 七 handler（3+2+2）；userData/ai-sensor 文件协议
    （INV-26 三联）+ tools/ai-sensor 伴随进程域（companion.mjs/queue.mjs/
    SKILL.md——顶层导览见 README）；observe 通道注记（ADR-0015 追认联动 F6d）。
- **§6 数据模型**（A1）：7 张表→**10 张表**（papers/collections/
  paper_collections/tags/paper_tags/annotations/notes + ai_notes(003) +
  lineage_nodes/lineage_edges(004)）+ 3 FTS5；一行注记 005~009 演进
  （cited_by 列/kind/tags/008 加列→009 删列反转——F-TIME-02）；「迁移只追加」
  原则句保持。
- **§7.1 图**：features 行 +lineage+workspaces（A2）；外部子图 +zcode 伴随
  进程节点（userData/ai-sensor 文件协议+tools/ CLI——ADR-0015）（A3）。
- **window-state 补档**（④#5）：§7.2 图 windows 区或 §1 一行——
  src/main/windows/window-state.ts（SR-INFRA-10：bounds 持久化 userData
  JSON+启动恢复+屏幕夹取）。
- **行数纪律**：文首自称「≤300 行活文档」——**硬目标 ≤300 行**：删 §2
  「数据流示例」（与 §7.3 时序图信息重复）；mermaid 图全保；若仍超，
  压缩手段=指针化改写，**禁删图**。若终态 >300 须申报处置方案。

### F2 DEVELOPMENT.md §6（C2——「误导备份硬伤」双重过时）

- 路径修正（实码核对后落笔）：数据库=`%APPDATA%\Synapse\workspaces\<课题
  id>\synapse.db`（①目录名 Synapse Remake→Synapse=改名迁移 R2-SH1/ADR-0020；
  ②workspaces 分目录=ADR-0018）；受管 PDF 同库 `…\workspaces\<id>\files\…`；
  settings.json 与 workspace.json= userData 根（app 级非课题级——**实码核对
  settings.service 路径注入源**后落笔）；**legacy-fresh 态**（全新首启库在
  userData 根）一句注记；备份指引同步改（整目录复制原则不变）。

### F3 README.md

- 目录导览补：`tools/` 行（ai-sensor 伴随进程 CLI 域——指针 tools/ai-sensor/
  README.md）；workspaces 语义（导览 renderer 行提及 features 含 workspaces 域
  + 数据目录语义一句）。
- C3 自裁：「测试与质量…CI 六道关卡为准」句改准确口径（verify 8 段与 CI
  同口径——与 AGENTS DoD 对齐，禁「六道」旧称）。

### F4 invariants.md（**受锁——强制条款①单链**）

`npm run locks:unlock` → 改 → `npm run locks:generate` → `npm run locks:apply`
即时单链（宪法「即时 apply」条款）。三处改：

1. **INV-18 声明处列**：`corpus.export.service（…状态机表=ai-plan-review §6）`
   → 态空间迁移表/中止守卫落点随迁 **export-session-state.ts**（F-EXPORT-01
   拆件后现行宿主——batch 26 门二 N-1 承接项）。
2. **INV-65 声明处列**：`corpus.export.service.ts 头注态空间表 abort 行` →
   同步 **export-session-state.ts**（bootstrap 双事件接线仍在 corpus.export.
   service——按现行实码核对落笔）。
3. **新 INV-70（裁决 7——多窗口定性）**：不变量=「单窗口单实例是架构前提，
   渲染层模块级单例因此合法」（OS 级多窗口=永久负面清单 2026-08-23 用户裁决
   +2026-09-19 裁决 7 重申定性）；**附件性单例清单**（实测枚举——主控预扫
   11 zustand stores：library/notes/tags/settings/lineage/workspace/ai-notes/
   reader/page-items/reader-search/corpus-export + toast-store + annotation-undo
   模块级 Map——**落笔前 grep 实测复核，计数以实测为准**）；强制方式=main
   单实例锁代码锚（**实码找 requestSingleInstanceLock 位置落准确 file:line**）
   + 架构评审（新窗口提案即触发本条复审）；状态按实际锚定情况如实标。
4. 自裁-4：INV-02 不变量列内三处 file:line 证据点行号漂移刷新
   （ipc/settings.ts:52 核对仍在+reader.store.ts/import.service.ts 现行行号
   实测替换——survey D-1）。

### F5 ROADMAP.md 退役一页纸（**强制条款②——方案 a 显式执行**）

- 头部退役声明：2026-09-19 F-DOCGOV-01（裁决 8）退役——排程真相源=最新
  交接书（docs/prompts/，AGENTS 规则）+tickets/registry；Phase 0~6 已完结
  历史一行化+报告指针；P8+ 候选注记保留指针形态。
- **P7 锚段全集逐字保留**：`### P7-A：`~`### P7-E：` 8 个标题行**原样保留**
  （check-tickets.mjs:233-234 `^### (P7-[A-Z])：` 机器输入——src 内 76 文件
  b3 头指针（A29/B6/C6/E3/F10/G18/H29 计数主控实测）依赖 decidedScopes）；
  每锚段正文压缩为：✅ 状态行+战役报告/关键 INV 指针行。
- **禁选项 b**（改 check-tickets 取数源）——本票走方案 a，check-tickets.mjs
  零触碰。
- 机器验证见③ M1/M2。

### F6 ADR 五件

- **0005**（C4）：选型表 Electron 行 33.4.11→42.9.3（注：版本以 package.json
  为唯一真相源——防御句已有，表值同步）；尾部复审注记一行（2026-09-19
  F-DOCGOV-01 复审追认：表值滞后已同步，防御句有效）。
- **0008**（触发线复审）：尾部复审追认段：触发线「需要第六个编辑元数据
  维度」触碰事实（notes.store `discardGen`=第六个模块级 Map，2026-09-02 A3
  加入）+复审结论=**维持已裁决形态**（理由：discardGen=弃改代际守卫（INV-50
  语义）非编辑元数据维度，语义正交无第六维度新增）+下次触发线重述（真正的
  第六编辑元数据维度或第七模块级 Map 出现时再复审）。**实码核对 notes.store
  模块级 Map 计数后落笔**。
- **0014**（DDL 交叉注记）：§数据模型 DDL 段加注：本文 DDL=初版决策快照；
  现行=006 加 kind 列+UNIQUE(from,to)+tree/ref/manual 三 kind 语义（INV-27+
  006_lineage_ref_edges.sql+007 tags）；本文保留原始决策叙述不回改（历史件
  红线）。
- **0015**（observe 追认）：§2 通道清单加追认注记：ai_sensor 域实有 7 通道
  （api-surface.ts 实文），其中 `observe`（六态判定单源，SR2-AI-08 主控预裁
  新增）2026-09-19 F-DOCGOV-01 追认补档。
- **0020 新件** `docs/adr/0020-user-data-dir-rename-migration.md`（④#1 改名
  迁移 ADR 化）：格式仿 0018（状态/背景/候选(如无候选可省)/决策/分支矩阵）；
  内容源=src/main/migrate-user-data.ts 头注（四分支矩阵逐字迁形）+R2-SH1 票
  面：productName 改名 Synapse Remake→Synapse 决策+userData 目录迁移四分支
  语义（新路径在→跳过/旧在新无→rename 原子迁/皆无→全新安装零动作/rename
  抛错→回落旧路径数据安全优先）+幂等二启+调用点 bootstrap（SYNAPSE_USER_DATA
  override 时跳过）；状态=已裁决并执行（2026-08-2x R2-SH1——registry 实文
  核对日期）。

### F7 悬空承诺清账三件

- **ADR-0010 空号处置**：不写新 ADR（史实：08-24/25/26 三交接书承诺
  「INV-11/07 lint 化评估落 ADR-0010」→lint 化后经 F-LINT-01/CSS-03/F-LINT-04
  实装，编号永久空缺不复用——2026-08-25 ai-plan-review R13 确认）。处置=
  architecture §5 索引表空号注记行（永久空号+史实一句）——**零新文件**。
- **weak-anchor-register.md 销项段**：文末「已核销（空——首版立册）」段
  改写=W-3/W-6/W-9 三条移入已核销段（核销场+证据锚文字表内已有——搬运
  落段）；表内三条划线行保持（历史不改写）。
- **flake-ledger 历史收录归 W4**：核验（零文件改动）——docs/audits/
  flake-ledger.json 现 8 cases（P7-A/F-R2e/z-r2e/tag-lifecycle/F-ARCH4-M1/
  F-G11/settings.png/corpus-export）与 W4 票面承诺八线一一对应=**已兑现**；
  impl-report 记核验结论销账。

### F8 src 注释恰 1 行（batch 25 门二 N-3 承接）

- ai-notes-import.service.ts:41「交付面：ipc/ai_sensor.ts（域装配，四通道
  委托）+services/index.ts 装配」——「四通道委托」系 F-SENSOR-01 三键拆分前
  历史句。读 ipc/ai_sensor.ts 现行头注后改准确（现行=三键七 handler，
  ai_notes_import 键 2 handler 委托本件+services/index.ts 三键平铺装配）。

### F9+F11 AGENTS.md（自裁-1+票面项）

- F9（自裁-1）：安全禁令行「（路径只能来自 main 侧系统对话框）」→
  「（路径只能来自 main 侧系统对话框或拖拽 File 经 preload webUtils 解析——
  受信边界清单见 INV-07）」。依据=INV-07 2026-09-03 P7E-02 扩列时声明处列
  已含「AGENTS 安全禁令」但正文滞后未同步（survey C1）——本票=补同步非新
  制度。
- F11（票面「check-model-names 入宪法叙述」）：完成定义清单后补一行：
  src 产物零外部模型代号（glm/deepseek/kimi 等词表）——门禁 `npm run
  lint:model-names`（本地手动关卡，未串 verify/CI 链——收口自跑义务）。
  与 architecture §4 关卡清单（F1 已含）互指。

### F10 DEV-SETUP.md

- .mimosa 备案一行（④#4）：`.mimosa/`=zcode 宿主钩子本机产物
  （finding-ledger/hook-state/history 等），.gitignore 已忽略，非项目件——
  审计/取证时勿误认项目资产。落点=§1 前置环境段尾。

## ③ 验证义务（全部真退出码物理落档 scripts/audits/b27-docgov01-*.log）

1. **基线锚**：开工首跑 `npm run verify` EXIT=0（预期：open 4/locks 378/
   Test Files 167/Tests 1724/指纹门 183·1768·5368·skip14/build 绿）。
2. **invariants.md 受锁单链**：unlock→改→generate→apply 即时；终跑锁数
   与 manifest 一致。
3. **新探针件**（scripts/audits/b27-*.mjs）写完即时 `npm run locks:generate`
   +`apply`（宪法条款；漏=verify locks 红）。
4. **M1 变异红证（ROADMAP 锚段机器依赖）**：cp ROADMAP.md 仓外备份→变异
   （`### P7-H：`标题行降级 `#### P7-H：`）→`node scripts/check-tickets.mjs`
   **期望红**（29 个 P7-H b3 指针文件违规）→cp 还原 diff 空→复跑绿。
   备份件用毕即删（mutation backup 禁驻留）。**禁 git checkout 还原**。
5. **M2 探针（锚段全集核验）**：新 scripts/audits/b27-p7-anchors.mjs：
   从退役后 ROADMAP 提取 `^### (P7-[A-Z])：` 实测集 → 与 src 全域 b3 头指针
   唯一集（grep 实取）作 ⊇ 判定 + 锚段计数 8 断言——**断言值从被验文件
   提取，禁硬编码预期通过**（G11 教训③）。
6. **终跑** `npm run verify` EXIT=0：指纹门零漂移（文档批零 tests 触碰预期）
   +locks 一致（378+新探针 N）+tickets gate 绿（=规则 6 机器输入完好的
   机检证明）+quality mojibake 绿（中文 UTF-8 承载）。
7. e2e 不跑（零行为口径——src 恰 1 注释行；e2e 义务不适用，报告注明）。

## ④ 证据面（scripts/audits/）

- `b27-docgov01-impl-report.md`（≤200 行）：逐项销账表（体检 A1~A6/C1~C4/
  未定义特性 8 项/悬空承诺 3 项/承接 3 项[INV-18/65 sync+ai-sensor 段+四通道
  句]/自裁 4 项——每项：改动落点+核验方式）+ 计数实测表 + 自裁申报段。
- verify 基线/终跑 .log、M1 变异/还原 .log、M2 探针 .mjs+.log。
- .log 入库由主控收口 git add -f 承担；报告内引用路径写全。

## ⑤ 简报计数（主控侧实测口径——落笔已核）

10 实体表（001×7+003+004×2）｜migrations 9 件（001~009）｜renderer 模块级
zustand stores 11 件（实测清单见②F4）｜src b3 头指针 76 文件 7 scope
（A4/B6/C6/E3/F10/G18/H29）｜ROADMAP P7 锚段 8 个（A/B/C/F/G/H/D/E）｜
locks 基线 378（b27-claim 已入）｜scripts/audits 在锁 134 件（全 .mjs）｜
docs/ 受锁面仅 invariants.md｜AGENTS/README/adr/prompts 均不在锁。
**你侧一切计数落笔前重测；与简报不符以你侧实测为准并申报。**

## ⑥ 超票面自裁申报义务

一切超简报决定（含：architecture 行数超 300 处置/ADR-0020 文件名与篇幅/
INV-70 清单枚举结果与状态定档/INV-02 行号刷新结果/压缩取舍/文案措辞裁量）
**逐条申报入 impl-report 自裁段**，由门一审裁+门二复核。卡住即停报告，
禁自扩面、禁放宽验证义务。
