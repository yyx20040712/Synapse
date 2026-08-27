# SR2-LG-01 门二终审报告

日期：2026-08-27 ｜ 审计人：门二终审孙代理（独立于实现者与门一）｜ 铁律遵守：全程只读（sha256/grep/node 只读哈希脚本），唯一写入=本文件 ｜ 结论：**PASS（放行收口）**

## 开工技能清点（宪法会话开工纪律）

- `code-review-excellence`：**用**——终审即对抗式深审收口裁决，直接对口。
- `verification-before-completion`：**用（静态口径）**——铁律禁 npm/test/git 改动性命令，全部数字以「日志机器行+磁盘亲验（sha256sum/node 哈希只读脚本/grep/wc）」双源核实后落笔。
- `systematic-debugging`：**不用**——无缺陷待定位，是审查非调试。
- `test-driven-development`：**不用（执行层）**——非实现任务；TDD 四档证据链是审查对象而非操作面。
- `git-workflow-and-versioning` / 其余工程技能：**不用**——禁 git 改动性命令、纯只读比对任务。
- 配置自查：本代理处于终审位（非实现/非门一），无子代理派发，模型/思考等级无错配风险记录在案。

---

## 清单① 处置核对（门一 findings vs 终态 + 主控预裁三项落地）

### 门一 N 级 findings 逐条对终态

| 级 | 门一内容 | 终态核实 | 裁定 |
| --- | --- | --- | --- |
| N1 | M3 幽灵变异红为 SqliteError 异常冒出型非断言违反型 | mutation.log:1270 实见 `SqliteError: FOREIGN KEY constraint failed`；红证目的（测试对实现错误敏感）达成，防御纵深（DDL FK+事务回滚）反而显现 | 观察项维持，无动作 |
| N2 | impl 报告「头注原样保留」措辞不精确（实际四处补写） | 补写本身正确（头注与实现同步），疑虑 1 已如实申报接口段 | 观察项维持，无动作 |
| N3 | invariants.md INV-27「运行行面」笔误 | **已修**：invariants.md:41 现为「+运行时面 upsertEdge 三拒绝用例」——磁盘亲验。注意 diff.patch（13:04 快照）第 9 行仍为旧文「运行行面」，系主控修复发生在 diff 快照之后，时间线自洽（manifest generatedAt 13:01 → diff 13:04 → 主控修 → 门一 13:09） | **闭合** |
| N4 | migrate.test golden 未含两新表（AI-01 惯例） | 新表存在性由 lineage-import.test 真库夹具覆盖（beforeEach 全量迁移+直接写表），非覆盖缺口 | 观察项维持 |
| N5 | importDraft 二次 parse 冗余 | 正确无害（已验过必成功取窄类型），个人库规模无性能面 | 观察项维持 |
| N6 | upsertEdge check-then-act 非原子窗口 | 单用户本地+better-sqlite3 同步单线程无并发窗口；LG-03 性能疑虑实现者已自报 | 观察项维持 |

**N 级六条无一构成回炉；N3 已闭合，其余为观察记录随档。**

### 主控预裁三项落地核对

1. **两通道注册+四写方法不入 schemas**：api-surface.ts lineage 域仅 `importDraft`（lineage/import）+`graph`（lineage/graph）两通道；schemas.ts 仅 +lineageImportResSchema/lineageGraphResSchema；四写方法（upsertNode/removeNode/upsertEdge/removeEdge）在 service 全建全测但零 IPC 注册、零死 schema 条目。**落地成立。**
2. **dialogs.pickJsonFile 新增**：dialogs.ts 接口（取消返 null）+electron 实现（openFile+JSON filter，pickPdfFiles 单选同型）+ipc-deps.ts 桩补位；ipc/lineage.ts 拾路径、service 收已选 path——INV-07 同序（corpusSession C-02 同型），且 importDraft IPC 通道 Req=voidReqSchema **堵死 renderer 指定路径**（路径只能出自 main 侧对话框——比票面字面更强）。**落地成立。**
3. **clearGraph 自裁审过最小性**：repo 第六方法+头注两处同步补写+服务导入器消费（withTransaction 清面重灌）+不经 IPC（api-surface 无对应通道）+两用例锚定（clearGraph 清面/替换重灌旧图清空）；AI-01 deleteByPaper（重灌清面原语对应物）论证成立，无第二职责蔓延。**落地成立。**

---

## 清单② 母本符合度（票面五层 vs ADR-0014 逐节）

- **DDL 字面**：ADR-0014 §数据模型（0014:41-60）vs 004_lineage.sql:12-31——逐列逐行内注释字面一致：lineage_nodes（id TEXT PRIMARY KEY -- uuid / paper_id 可空 REFERENCES papers ON DELETE CASCADE / title NOT NULL / core_idea NOT NULL DEFAULT '' / year INTEGER / x REAL / y REAL / created_at+updated_at NOT NULL）+lineage_edges（id PRIMARY KEY / from_node+to_node NOT NULL REFERENCES lineage_nodes ON DELETE CASCADE / label NOT NULL DEFAULT '' / created_at+updated_at / UNIQUE(from_node,to_node)）。**照抄无一处漂移。**
- **树约束 service 层**：ADR「树约束=service 层不变量+单测，非 DDL 约束」→ DDL 无 CHECK；守卫宿主=service 双口（validateDraft 树段：多父/环 DFS/自环+悬空/重复节点/重复边；upsertEdge 运行时五道：自环/节点不存在/重复边中文收口/多父/成环）——与 INV-27 登记行（守卫宿主=service 写面，LG-03 只接线）互相锚定。**符合。**
- **导入语义**：ADR「梳理智能体输出=lineage JSON 草稿（节点：paperId/标题/年份/核心 idea；边：主要继承关系+说明），经文件协议导入（ADR-0015 同精神）后人工修订」→ draft schema（nodes: paper_id/title/year/core_idea；edges: from_paper_id/to_paper_id/label）snake_case 文件面；替换式导入+「人工修订保护=renderer 确认对话框」留在 renderer 面（LG-02/03）不越界。**符合。**
- **JSON Canvas x/y 列**：ADR「位置持久化采 JSON Canvas 模式（Obsidian 先例）——手工拖拽=写 x/y 覆盖，重置自动布局=清空 x/y」→ x REAL/y REAL 可空列+列注释「手工位置覆盖；NULL=自动布局」；导入面强制 x/y=null（LG-02 消费 null 语义注释三处锚定：service/models/api-surface 注释）。**符合。**
- 形态边界（E3/E5）：v1 时间树（单父）实现；v2 DAG「存储免迁移」由图 schema 承诺（DDL 无树约束即可放宽）；自动引文边不做（表独立，不复用 ADR-0012——票面文化层明示）。**无越界实现。**

---

## 清单③ 宪法红线终审

- **分层单向**：ipc/lineage.ts→services.lineage（ipc→services）；lineage.service 持 repo/paperExists/withTransaction 注入、**零 db.prepare**（services→repos）；repos→db（connection 注入）。renderer 零改动（diff 20 文件无一 renderer）。lint 分层强制随 verify 绿。**零违反。**
- **受锁面**：manifest 终态 **125 条**；本代理以 node 只读哈希脚本对 125 条逐一 sha256 亲验——**mismatch 0**。**docs/invariants.md 不在 manifest 受锁清单内**（grep 无命中——受锁范围=manifest 实际登记路径集，docs/invariants.md 从未入册），故主控修 N3 笔误无需 unlock/apply，「manifest 已同步」的正确语义=修复不触碰任何受锁文件、125 条一致性无损（亲验证实）。**受锁流程闭合。**
- **安全禁令逐条**：diff 无 BrowserWindow/webSecurity/sandbox 改动 ✓；renderer 零改动、新文件全在 main/shared ✓；路径只出自 main 侧对话框+voidReq 堵路 ✓；repo 十条语句全 db.prepare+参数绑定（upsert 命名参数、其余位置参数、clearGraph 无参固定语句，零拼接；测试夹具 SQL 亦 prepare）✓；无 eval/newFunction ✓；无新增出网 host（diff 无 constants.ts）✓。**零触碰。**
- **行数**：亲验 wc -l——repo 232 / service 305 / ipc 38 / models 116 / test 352，全 ≤500。✓
- **UTF-8**：verify 日志 quality 关卡「无占位标记 / 无乱码 / 无跨域引用」机器行+本代理通读 diff/五新文件中文全可读。✓
- **TDD 四档证据链（含三条流程改进）**：
  - 红：lineage-import.test 收集级红（Failed to load url …/lineage.service），机器行 `Test Files 1 failed | 79 passed (80)`、`Tests 520 passed (520)`、`exit=1`。✓
  - 绿：机器行 `80 passed (80)`、`542 passed (542)`、`exit=0`。✓
  - 变异红证：M1（多父守卫禁用→断言级红 expected true to be false）/M2（环守卫禁用→「upsertEdge 运行时守卫③成环拒绝」expected [Function] to throw——日志 1261-1264 亲见用例名）/M3（幽灵检查禁用→FK 异常型红，N1 已裁定）；三轮各 1 failed/541 passed (542)、exit=1；**三条流程改进全落地**——①还原 diff 入日志（M1/M2/M3-restore-diff-empty 三标记亲见）②npm 真退出码（四档日志各含 exit=N 机器行）③数字机器输出（vitest Test Files/Tests 机器行，非人工转述）。✓
  - verify：quality→tickets（104 工单/open 5 strong）→locks（125 一致）→lint→typecheck→test 542→build，`exit=0`。✓
- **无新依赖**：diff 无 package.json/lockfile（20 文件清单亲数）。✓

---

## 清单④ 机器面核对

### 80/542 数理

基线 79 文件/520 用例 + 新测试文件 1（`grep -c "it(" tests/unit/services/lineage/lineage-import.test.ts` = **22** 亲数）→ 79+1=80 文件、520+22=542 用例。red 档（1 failed/80 文件/520 用例——22 用例因收集失败未跑）与 green 档（80/542）机器行均与之自洽。**数理成立。**

### locks 122→125 推演

manifest diff 亲验：**+3 新受锁路径**（004_lineage.sql / shared/models/lineage.ts / tests/unit/services/lineage-import.test.ts——均为受锁目录下的新文件）+7 处既有受锁文件 sha256 变更（api-surface.ts / schemas.ts / contracts/api-surface.test.ts / migrate.test.ts / enrich.service.test.ts / import.service.test.ts / ipc-deps.ts——**改动不加数**）+generatedAt 更新=122+3=125。终态 125 条 sha256 磁盘全吻合。**推演成立。**

### registry 翻 done 预演（check-tickets 规则 2 逐文件 grep）

- 票面头注 `lineage.repo.ts:3 [SR2-LG-01]`：registry file 字段=该文件自身 → 规则 2 豁免（t.file === rel），**合法**。
- 本单五新文件全号扫描：004_lineage.sql/ipc/lineage.ts/lineage.service.ts/models/lineage.ts/lineage-import.test.ts 全用「LG-01」短式——**零全号残留**。
- tests/ 侧：e2e/lineage.spec.ts DEPS 数组+注释含全号——tests 规则只拦占位调用（unimplementedObject/NotImplementedError 指向 done 号），DEPS 是 isTicketDone 激活机制**合法**；contracts 测试占位用 'SAMPLE-IPC' 非工单号。
- docs/ 侧（ROADMAP/ADR-0014/invariants.md:41/reports）：check-tickets 只扫 src/+tests/，**不扫 docs，合法**（且 INV-25/26 已 done 全号在册为先例）。
- ⚠ **唯一阻断性残留：`src/renderer/features/lineage/LineageSidePanel.tsx:66`**（SR2-LG-04 票面文件，本单 diff 未触碰的骨架残留）注释含「SR2-LG-01」全号——LG-01 翻 done 后规则 2 判 `t.status==='done' && t.file !== rel` → **tickets:check 红**。该残留非本单实现者引入（LG 组骨架单遗留），不构成本票回炉；**主控收口翻 registry 前须顺手将其改为「LG-01」短式**（一行注释改动，LineageSidePanel 本就是 LG-04 open 票面文件，改注释不影响其工单属性）。此为预演交付给主控的**唯一收口动作项**。

### e2e 面申明

diff 20 文件无 tests/e2e 改动；lineage.spec.ts skip 守卫=`DEPS(LG-01~04)+LG-05 任一未 done`——LG-01 翻 done 后 02/03/04/05 仍 open → **仍 skip，e2e 面 16 passed+1 skipped 不变**。申明成立（本单不触碰 e2e，LG-05 票面自载「e2e 16→17」归后续）。

---

## 清单⑤ 成本账本行（本代理 usage 自估）

| 子代理 | 模型位 | 输入 tok（估） | 输出 tok（估） | 时长（估） | 产物 |
| --- | --- | --- | --- | --- | --- |
| 门二终审孙代理 | GLM 终审位 | ~78k（票面 232 行+diff 1433 行+四报告/ADR/日志摘要+5 轮 grep/哈希核对） | ~9k（本报告） | ~25 min | scripts/audits/lg01-gate2.md |

---

## 总评与结论

**PASS（放行收口）。**

理由：①门一 0B/0W/6N 维持——N3 笔误已修闭合，其余五条为观察记录不构成回炉；主控预裁三项（两通道注册/pickJsonFile/clearGraph 最小性）逐项落地成立。②母本 ADR-0014 四节（DDL 字面/树约束 service 层/导入语义/JSON Canvas x/y）零漂移。③宪法红线零违反——分层单向、125 受锁亲验 mismatch 0（invariants.md 本就不入锁，N3 修复无锁面影响）、安全禁令零触碰、五文件全 ≤500、UTF-8 机器过、TDD 四档证据链完整且三条流程改进（还原 diff 入日志/真退出码/数字机器输出）全落地。④机器面全自洽——80/542 数理成立、122→125 推演成立、e2e 16+1 不变申明成立；翻 done 预演发现**唯一收口动作项：LineageSidePanel.tsx:66 全号须随收口改短式**（骨架残留非本票责任，但主控翻 registry 前必须处理，否则 tickets:check 红）。

**放行条件：主控收口单按序执行——清 LineageSidePanel.tsx:66 全号 → 亲验 verify 真退出码 → locks 确认（该改动文件不受锁，125 不变）→ 翻 registry → [locked-change] 尾注提交。**
