> 证据档｜2026-09-17 四路只读调研之三（文档漂移审计）
> 产出：Explore 只读子代理；转录原样未改——分析责任归产出方，勘误以裁决书为准。
> 消费：docs/design/2026-09-18_complexity-governance-ruling.md §7

# Synapse_remake 文档漂移审计报告（2026-09-17，只读）

审计基线：registry 实测 183 条工单（174 done / 9 open）、locks/manifest 实测 328 条、src 142 个 TS 文件、e2e 17 个 spec（v61 记 44 用例）、最新交接书 = v61（2026-09-16）。

---

## ① 漂移总表

### A. architecture.md vs 实际 src 树（最后维护 2026-09-02，落后 AI/lineage/workspace 三大战役）

| # | 文档条目 | 漂移类型 | 证据 | 影响 |
|---|---|---|---|---|
| A1 | §6「数据模型：7 张表」 | 数字过时 | `src/main/db/migrations/`：001×7 张 + `003_ai_notes.sql:12`（ai_notes）+ `004_lineage.sql:12,23`（lineage_nodes/lineage_edges）= **10 张表** | 读者按 7 张表理解库结构会漏掉 AI 笔记与脉络两域 |
| A2 | §7.1 图 features 只列「library/reader/notes/tags/settings」 | 目录缺失 | `src/renderer/features/` 实有 **7 域**：另有 `lineage/`（27 文件）与 `workspaces/`（5 文件） | 架构全景图缺两个已交付顶层视图 |
| A3 | §7.1「外部（全部仅手动触发）」子图只有 CrossRef/OpenAlex/arXiv/对话框/浏览器 | 结构缺失 | ADR-0015 整个**zcode 伴随进程生态**（`userData/ai-sensor/` 文件协议、`tools/ai-sensor/companion.mjs`、corpus-ai 回灌）在架构图纸上不存在 | 最大的跨进程边界未上图；新人无法从 architecture.md 得知 sidecar 协议存在 |
| A4 | §1 分层图 `ipc→services→repos→db` 无 workspaces 装配层 | 结构缺失 | `src/main/workspace-layout.ts`、`src/main/data-layer.container.ts`（库级分目录热换，ADR-0018）在图外 | 数据层"可重建 facade"这一关键机制不可见 |
| A5 | §5「关键设计决策」只列 AD-1~AD-7 | 索引过时 | `docs/adr/` 实到 0019；0008~0019 十一份 ADR（含 notes 状态机、md-corpus、lineage、workspace、三屋模式）无一被 architecture.md 索引 | 入口文档指向的决策面止于 2026-08-22 |
| A6 | §4「三道 CI 关卡：quality/tickets/locks」 | 关卡清单过时 | 现实关卡已增：`check-test-surface.mjs`（指纹门，入 verify 链）、`check-dup-constants.mjs`+B-5 AST+6c C-4c（check-quality 内多段）、`check-model-names.mjs`（2026-09-16 新门禁，v61 §5 仅交接书备案一行）、CI `[test-refactor]` 范围闸（ci.yml:127） | 防线清单失真——文档声称的防线少于实际防线（少见的"正向漂移"） |

### B. ROADMAP.md vs registry/代码（最后维护 2026-08-28，停更三周）

| # | 文档条目 | 漂移类型 | 证据 | 影响 |
|---|---|---|---|---|
| B1 | 顶部「当前基线：工单 74 = done 74 + open 0」「85 受锁文件」「e2e 6 绿」 | 数字全面过时 | registry 183 条（174/9）；locks 328；e2e 44 用例/17 spec | 排程真相源职能已让位给交接书（AGENTS 有此规则），但 ROADMAP 自称"每 Phase 收尾时更新本文"未执行 |
| B2 | P7-F 节无 ✅，注记「F 仍未做，属主线遗留位」（2026-08-26）＋「P8 立项工单化…排期在 SR2-ENR 之后」（2026-08-27） | 状态滞后 | registry：`SR2-F-01~09` **全部 done**（2026-08-28~09-01）；INV-29~34 已锚定；`tests/e2e/reader-scroll.spec.ts` 存在 | 连续滚动这一架构级战役（9 票）在 ROADMAP 上仍是"未做" |
| B3 | P7-D（玻璃质感）、P7-E（预留点清扫）两节无收尾标记 | 状态滞后 | P7D-01 done（批一/批二 2026-09-03~09-08，INV-61）；P7E-01~07 + P7X-01~03 全 done | 同上 |
| B4 | 无 workspace/课题隔离、无 R2-SH1 改名迁移、无 F-A/F-CSS/F-LINT/F-TESTREF/F-DEDUP/F-GEOM 战役的任何章节 | 整段缺失 | registry 中 R1-WS1/WS2、R2-SH1/SH2、F-ARCH/A1~A12、F-CSS-01~03、F-LINT-01~04、F-TESTREF-00~W4、F-DEDUP-01、F-GEOM-01 全部在案 | 约 80 张工单（2026-08-28 之后）的编排层记录只存在于交接书链 v28→v61 |

### C. 顶层文档互斥

| # | 冲突双方 | 证据 | 影响 |
|---|---|---|---|
| C1 | AGENTS.md:67「路径只能来自 main 侧系统对话框」 vs INV-07/security.md §3（已扩列拖拽 webUtils） | `src/preload/drag-import.ts` 存在；security.md:23 已写"两来源"；AGENTS 未同步 | 宪法级文档持旧禁令——按宪法执行的弱模型会误判拖拽导入违规 |
| C2 | DEVELOPMENT.md §6「`%APPDATA%\Synapse Remake\synapse.db`」 vs DEV-SETUP.md:76「`%APPDATA%\Synapse`」 | `src/main/migrate-user-data.ts:54-56`：旧名 `Synapse Remake`→新名 `Synapse`；且 ADR-0018 后实际路径为 `…\Synapse\workspaces\<id>\synapse.db` | DEVELOPMENT §6 **双重过时**（目录名+workspace 结构）；给用户的备份指引会指错目录 |
| C3 | README「CI 六道关卡」 vs AGENTS DoD「verify = quality+tickets+locks+lint+typecheck+test+build（7 段）」 vs ci.yml:14 job 名「六道关卡（lint→typecheck→quality→tickets→unit→build+e2e）」（实际还有独立 locks 步骤、独立 manifest 尾注 job、test-refactor 闸、npm audit） | 三处口径各异 | 低危（叫法漂移），但"以 CI 同口径"的精确性声称受损 |
| C4 | ADR-0005 选型表「Electron 33.4.11（精确）」 vs 实际 42.9.3 | package.json: electron 42.9.3；ADR-0006 已记录升级 | ADR-0005 有"版本以 package.json 为唯一真相源…升级时同步"防御句，但表本身未同步——首个查表者会拿到错误版本 |

### D. invariants.md 逐条登记（62 条，INV-01~62 连续；编号无空洞）

核验方式：grep 抽样强制点 + 状态列语义审读。总体结论：**INV 册是全仓库健康度最高的行为文档**，状态三档（已锚定/部分/未锚定）标注诚实，抽查的强制点在代码中全部真实存在：

- INV-03（stale-guard）：`library.store.ts:59`、`notes.store.ts:106,150`、`tags.store.ts:58,84`、`reader.store.ts:217-218`（loadSeq 总序+tabLoadSeq 字典）、`useAsync.ts:51`——五处 + per-tab 变体全部在册在码 ✓
- INV-16（pdfjs 白名单四文件）：`eslint.config.js:71-77` no-restricted-imports ✓（弱锚 W-1 在案：dynamic import 不拦）
- INV-24（片段序单源）：`src/shared/annotation-order.ts:52` + `corpus.assemble.ts:57,193` 消费 ✓
- INV-26（心跳 10min 单源）：`ai-sensor.service.ts:123` 与 tools 侧同值 ✓
- INV-35（课题单活四联）：`workspace.service.ts` busy CONFLICT + `import-gate.ts` 计数 gate（F-D4 后独立模块）✓
- INV-52：`src/main/import-gate.ts` 独立文件+头注 ✓
- INV-57（时长原子累加）：`papers.repo.ts:203`（`reading_seconds = reading_seconds + ?`）+ `reading-time.ts:217`（PROGRESS_SECONDS_CHUNK=3600 与 schemas 同值）✓
- INV-61（字号 token）：theme.css `--fs-*` 10 处 ✓
- INV-19（存储独立弱锚）：`ai_notes.repo.ts:46`「不做：annotations 表任何改动」头注在 ✓

发现的登记册问题：
1. **INV-02 引用的三处空 catch 行号已漂移**：`ipc/settings.ts:52` 仍命中，`reader.store.ts:90` / `import.service.ts:171` 现已不是 catch 行——册内 file:line 证据点未随代码移动（methodology P8 自己写过"行号会漂，要加符号锚"）。
2. **INV-27（lineage 三 kind 边）已成长为册内最长条目（单条近 900 字）**，其信息密度远超"登记册"形态，实为微型 ADR——与 methodology §2"预登记要克制"的自训相悖。
3. **"代码里有、册子里没有"的跨模块行为**：
   - `migrate-user-data.ts`（R2-SH1）的四分支迁移语义（新路径在→跳过/rename 抛错→回落旧路径保数据）是典型跨模块不变量，**未登记**；
   - F-TESTREF-00 的测试面单调性机制（C_after ⊇ C_before 机检）实际已上线运行，其不变量身份（INV-63）**只在 open 票 W4 票面里**，册内无登记——机器防线先于登记存在；
   - F-A11 的笔记编辑器 undo/redo 值栈 + IME 整段入栈语义（与 INV-23 标注 undo 并列的第二 undo 域）未登记；
   - `check-dup-constants.mjs`（B-1 同值双常量棘轮）已机检化但 INV-11 只提了 C-4/B-5 两面。
4. 册尾维护规则声称三档含"未锚定"，但 62 条中已无"未锚定"态条目（预登记→锚定生命周期走完），规则与现实脱节属良性。

---

## ② 过期或被推翻文档/条目清单

| 对象 | 状态 | 判定依据 |
|---|---|---|
| ADR-0005 选型表（Electron 33.4.11 行） | **过期** | 已被 ADR-0006 升级执行（42.9.3）覆盖，表未同步 |
| ADR-0014 §数据模型 DDL | **与代码不符（部分）** | DDL 无 `kind` 列、`UNIQUE(from_node,to_node)` 无 kind 维度；实际 `006_lineage_ref_edges.sql` 加 kind，INV-27 扩为 tree/ref/manual 三 kind。ADR 只修订到 v1.1（tags），ref/manual 边的模型演进**只活在 INV-27 与 F-LG15/R2-LG12 票面里，ADR 正文 DDL 未修** |
| ADR-0008「五模块级结构」 | **触发线被触碰未复审** | 重审触发线=「需要第六个编辑元数据维度」；`notes.store.ts:99` 已有 `discardGen`（第六个模块级 Map，2026-09-02 A3 加入）——ADR 状态仍是"已裁决——不重构（维持现状）"，无人回来复审 |
| ADR-0015 §2 通道清单 | **轻微缺员** | 承诺 ai-notes/import + list；实际 `api-surface.ts:72-81` ai_sensor 域 7 通道，其中 `observe`（ai-sensor/observe，SR2-AI-08 六态判定）无 ADR 条款对应（双目录 CLI 发现机制已获文内追认，observe 未追认） |
| ROADMAP §当前基线整段 | **过期快照** | 74/85/6 vs 183/328/44（见 B1） |
| DEVELOPMENT.md §6 | **双重过期** | 见 C2 |
| AGENTS.md:67 括号内路径规则 | **过期** | 见 C1 |
| audit0-findings.md 头部自称「活文档——体检场唯一发现登记处」 | **职能被篡位** | 2026-09-03 后停更；后续发现改走 weak-anchor-register/交接书——"唯一登记处"的声明已不真 |
| 19 份 ADR 之说 | **实为 18 份** | `docs/adr/` 缺 0010（空号）；多份 2026-08-24~26 交接书曾承诺「INV-11/07 lint 化评估→ADR-0010」，后跳号 0011，0010 永久空缺（2026-08-25 ai-plan-review R13 确认"空号预留"但至今未写） |

**仍有效且活跃的 ADR**：0001/0002/0003（三张 FTS 表与迁移一致 ✓）/0004/0006/0007（登记性地雷仍在：`connection.ts` DB_PRAGMAS 无 recursive_triggers，FTS 孤儿地雷未排）/0009/0011（v1.2 三轮修订全在案，corpus.assemble/interface-template 在码）/0012（与 0014 **共存属被裁决的共存**——E5 明确"两者对象不同、不复用表"；providers 预留点原样保留 `crossref.ts`/`openalex.ts` 头注"不做：引用关系(v2)"；但 ENR 组已把预留数据部分激活为 cited-by 缓存，ADR-0012 未加交叉注记）/0013/0016/0017/0018（已执行：workspaces 域四通道在码，v1 边界"不做课题删除"守住了——api-surface 无 delete 通道）/0019（三轮修订 R1/R2/R3 + 勘误注记，维护最勤）。

---

## ③ 悬空承诺清单（交接书链 v54~v61 + 更早源头）

**真悬空（有承诺、无下文、无触发线兜底）：**

1. **ADR-0010**：三份交接书（08-24/25/26）承诺的"INV-11/07 lint 化评估落 ADR-0010"——lint 化后来经 F-LINT-01/CSS-03/F-LINT-04 实装，但 ADR 永远没写，编号空缺。
2. **doc-align 阶段 3**（2026-09-10 doc-align-brief）：「v1.0 冻结复盘（R1~R6 回归窗）」未见任何执行记录；AGENTS ORG-SEG 段仍写"ds-call.mjs v1 继续服役至回归 R1~R6 全过后切换"——切换条件悬置，v1/v2 双版本并存已 6 天+。
3. **postcss 显式化小票**（v58 §2-4 → v59 §2-1 → v60 §2-6 承袭）："[dep-change] 面留用户裁决"——用户裁决从未发生，无票无决策记录；tailwind 换实现即断的 hoisting 风险持续在账上。
4. **存储债**（v60 §2-6①：audits 1.6G + .git 6.7G 三选项）——治理五指标连续两份交接书（v60/v61）原样重录，无人处置。
5. **INV-63/INV-64**（F-TESTREF-W4 票面承诺"入册 docs/invariants.md"）——票 open，册停在 INV-62。
6. **flake-ledger.json 八线历史收录**（票面 note 明言要收录 P7-A/F-R2e/z-r2e/tag-lifecycle/F-ARCH4-M1/F-G11/settings.png/corpus-export 八线）——现 `cases: []` 纯骨架，历史 flake 数据仍散落交接书。
7. **weak-anchor-register 销项流程未走完**：W-3/W-6/W-9 三条已在表内划线核销（2026-09-02 AUDIT-C），但文末"已核销"段仍写"（空——首版立册）"——按本册自己的规则"补强落地后移入已核销段"，三笔未迁移，段落自相矛盾。
8. **P7E-04 还原项**（INV-56 内："clipboard 下次合法触碰 ipc-deps.ts 的场次补必填+桩工厂同步"）——弱承诺，无触发票。
9. **ADR-0015 遗留的 P8+ 候选**（D utilityProcess 自含方案）与 **ADR-0013 的"条件复审快照导出"**——均无复审记录。

**合法挂起（有明确触发线，属登记而非烂账）**：F-A12 R-1/R-2 观察项、F-A9 紧排边界带、F-UI-01 光学中心层（用户复测触发）、settings.png 非确定面（再现 2 次立案）、SVG attr var() 引擎线（**注意：security.md:38 自己写明 Electron 42 于 2026-10-20 出线——距今仅 1 个月，这条"Electron 升级必复核"线的触发窗口已进入倒计时，但无任何升级预研票**）、迁移 squash（≥12 触发，现 8 个）、v60 §2-7 备选池六项。

**当前在办非悬空**：F-TESTREF-W1A~W4、F-DEDUP-01、F-GEOM-01、F-TESTREF-S1（9 张 open 票，v61 §2 排程清晰）。

---

## ④ 未定义特性清单（代码有、文档群没提）

1. **应用改名数据迁移**（`src/main/migrate-user-data.ts`，R2-SH1）：productName 由 "Synapse Remake" 改为 "Synapse"（package.json:3, electron-builder.yml:37）并迁移用户数据目录——**改名决策本身无 ADR、无 ROADMAP 条目、DEVELOPMENT 未更新**，仅 DEV-SETUP §5 一行与 registry 票面记录。
2. **`ai-sensor/observe` 第五通道**（api-surface.ts:75）：六态判定单源，SR2-AI-08 主控预裁新增——ADR-0015 与 architecture.md 均无。
3. **check-model-names.mjs 门禁**（2026-09-16）：src 域禁模型代号（glm/deepseek/kimi 词表）+ package.json `lint:model-names`——AGENTS「三道 CI 关卡」叙述与 methodology 均未收录，仅 v61 交接书 §5 备案一行。
4. **`.mimosa/` 本机残留**（finding-ledger/hook-state/history 等）：.gitignore 已忽略，但无任何文档解释其来源（疑似 zcode 宿主钩子产物）——审计/取证面盲区。
5. **窗口状态记忆**（`src/main/windows/window-state.ts`，SR-INFRA-10）：architecture §7.2 图只画 main-window；功能本身仅存在于工单号。
6. **reading-time outbox + 回放 e2e**（`reading-time-outbox.ts`/`reading-time-outbox-store.ts`/`tests/e2e/reading-time-replay.spec.ts`）：INV-57 只以"注记面"形式带过（P7X-02），at-least-once 语义、localStorage 退化重试未升格为正式 INV 条目。
7. **`legacy-fresh` 双态启动语义**（workspace-layout.ts 头注）：全新首启不建 `workspaces/`、二启才迁移入 default——与 ADR-0018 描述的"启动时存在旧库→建 workspaces/default 整体移入"在全新安装分支上口径不同（准确语义只在 INV-35 与代码头注）。
8. **tools/ai-sensor 整域**：README 目录导览、architecture、DEVELOPMENT 均未列 `tools/`（其自身有 README/SKILL.md，但顶层导览缺失）。

---

## ⑤ 文档体系健康度评估

**仍在被维护（按最后提交）：**
- `docs/prompts/`（09-16，v61）——**实际上的排程真相源**，取代了 ROADMAP 的职能且运转良好；
- AGENTS.md（09-12）、methodology.md（09-12）、invariants.md（09-10，已入锁）——宪法/原理/不变量三层活且互指密集；
- ADR-0019（09-04）、security.md（09-03）、DEV-SETUP.md（09-02）、architecture.md（09-02，但见 A1~A6 的结构性欠账——2026-09-02 那次维护只做了"图纸指针化"，未补 lineage/workspaces/ai-sensor 三大结构）。

**已经烂掉（停更 3 周+ 且内容与现实冲突）：**
- **ROADMAP.md**（08-28）——最严重。自称"每 Phase 收尾更新"，但 P7-F/D/E 收尾、P8 开役、workspace/改名/F 系列六场战役全部未回写；顶部基线数字全错。它没有被删除也没有被宣布退役，处于"僵尸真相源"状态（幸有 AGENTS"最新交接书=排程真相源"规则兜底）。
- **DEVELOPMENT.md**（08-26）——§6 用户数据路径双重错误是会实际误导用户备份的硬伤；§1~§5 仍大体准确。
- **README.md**（08-22）——内容最少所以漂移面也小（目录导览缺 tools/、缺 workspaces 语义），但一个月未动。
- **AI辅助开发经验教训.md**（08-29）——methodology §0 规定"新战役教训先入事故档增补节"，但 v54~v61 十余条教训行（审包体积经济学、证据件原子提交、链式命令吞红、门二前勿提交等）**只写进了交接书，事故档三周零增补**——回流机制断链。
- **weak-anchor-register.md**（09-02）——销项流程自相矛盾（见悬空#7）；W-1/W-2/W-4/W-5/W-7/W-8/W-10 七条"观察"无后续核查记录。
- **flake-ledger.json**——空骨架。
- **audit0-findings.md**（09-03）——自称"唯一登记处"已被取代，头部声明未改。

**系统性根因判断**：该仓库的文档治理规则本身是一流的（单一真相源分层、指针化防数字漂移、"与 registry 冲突以 registry 为准"），漂移集中在两类：①**阶段编排层（ROADMAP）职能被交接书链天然取代后未正式退役**，导致两套排程文档一真一假并存——这恰好违反自家宪法 P10"方案切换=删除旧方案"；②**面向人类读者的一级文档（architecture/README/DEVELOPMENT）更新节奏绑定"收官回写"，而 2026-08-28 之后的战役全部走闲时/夜间场，收官动作压缩为"交接书滚动"**，回写面收窄到了交接书+INV+ADR 三处，其余文档被系统性跳过。
