# SR2-LG-01 门一对抗深审报告

日期：2026-08-27 ｜ 审计人：门一对抗深审子代理（独立于实现者）｜ 输入：lg01-diff.patch + lineage.repo.ts 票面头注 + lg01-impl.report.md + 四档日志 ｜ 结论：**PASS**

## 开工技能清点（宪法会话开工纪律）

- `code-review-excellence`：**用**——本任务即对抗深审。
- `verification-before-completion`：**用**——报告全部数字先对日志/仓库核实后落笔。
- `test-driven-development` / `systematic-debugging`：**不用**——只读审计，不写实现不调试（铁律禁改）。
- `subagent-driven-development` / `requesting-code-review`：**不用**——本代理即被派发的审计子代理本身。
- 其余工程技能（git 工作流、SQL 优化、部署等）：**不用**——纯只读比对任务，无操作面。

## A. 母本符合度

**A1 迁移 004 DDL vs ADR-0014 SQL 块逐列字面——PASS**
`docs/adr/0014-lineage-graph-data-model.md:41-60` vs `src/main/db/migrations/004_lineage.sql:12-31`：两表逐列逐注释字面一致——lineage_nodes（id TEXT PRIMARY KEY/paper_id 可空 REFERENCES papers ON DELETE CASCADE/title NOT NULL/core_idea NOT NULL DEFAULT ''/year INTEGER/x REAL/y REAL/created_at+updated_at NOT NULL）+ lineage_edges（id PRIMARY KEY/from_node+to_node NOT NULL REFERENCES lineage_nodes ON DELETE CASCADE/label NOT NULL DEFAULT ''/created_at+updated_at/UNIQUE(from_node,to_node)）。连行内注释均照抄。CASCADE 三链（paper→node→边）与 ADR「级联」小节一致，并有真库级联用例（lineage-import.test.ts:201-209「paper 删除→节点 CASCADE→边随亡」）。

**A2 导入三段校验——PASS**
`lineage.service.ts` validateDraft：①zod 行级（safeParse 失败即返，path=issues.join('.')——测试断言 nodes.0.title 与顶层 nodes 两形态）；②幽灵篇级（paperExists 注入，path=nodes.N.paper_id）；③树结构图级（悬空/自环/重复边/多父 path=edges.N.*，环 DFS path=edges）。段序与票面一致，path 前缀区分成立。

**A3 全有或全无（校验任一失败库不动）——PASS**
importDraft 先 validateDraft，errors 非空直接 return（不进事务不碰库）；全过才 withTransaction(clearGraph+重灌)。测试「幽灵拦截」用例先灌旧图再导幽灵 draft，断言旧图 nodes=2 保持——真不动库有锚。

**A4 替换式清面重灌——PASS**
clearGraph（先清边后清节点）+整套重灌在事务内；「替换重灌」用例（二导后旧图只剩 p-3）+「空 draft=空图合法」（0,0）均锚定。

**A5 service upsertEdge 三拒绝路径守卫（中文 reason）——PASS**
自环（「自环边不允许…」）/多父（「多父边拒绝：节点 X 已有父节点 Y（树至多一父）」）/成环（「成环拒绝：该边将使脉络图出现环路（v1 为树）」），外加节点不存在/重复边中文收口两道（申报为增强）。更新场景（input.id 存在改端点=改父）三查均排除自身 id（reachable 带 excludeEdgeId）——自裁申报 6，语义正确（label-only 更新不误拒）。

**A6 repo 六方法+clearGraph——PASS**
upsertNode/removeNode/upsertEdge/removeEdge/listGraph（created_at,id 确定性序）/clearGraph。ON CONFLICT(id) DO UPDATE created_at 保留 updated_at 刷新有测试锚（同 id 二次 upsert 断言 createdAt 不变）。

**A7 lineage 域立域（契约测试十一域穷举）——PASS**
api-surface.ts 新增 lineage 域两通道（import/graph）；契约测试 unimplementedObject 用例（tests/contracts/api-surface.test.ts:43-58）扩至十一域——穷举强制在类型层（ApiHandlers 缺键 typecheck 红），属契约扩展非断言放宽。通道名 lineage/import、lineage/graph 符合 `<域>/<动作>` 规范，被既有循环断言自动覆盖。

**A8 dialog 在 ipc 层——PASS**
ipc/lineage.ts:30-36 调 deps.dialogs.pickJsonFile；service 只收已选路径（importFromFile(path)），不触 dialogs——corpusSession C-02 同序，INV-07 成立。CANCELLED（AppErrorCode:24 存在）经 register.ts:29 toAppError 折叠，export_.ts ExportIpcError 同型。

## B. 宪法红线

- **分层单向**：ipc→services→repos→db 全链单向；dialog 只在 ipc 层；service 零 db.prepare（纯 repo 注入）。verify lint（ESLint 分层强制）绿。
- **db.prepare 预编译+参数绑定**：repo 十条语句全部 db.prepare；upsert 命名参数绑定、其余位置参数绑定；clearGraph 两条 DELETE 为无参数固定语句（无拼接面）。测试夹具 INSERT papers 亦参数绑定。无字符串拼接 SQL。
- **受锁流程**：manifest 125 条，新增 3 受锁路径（004_lineage.sql/shared/models/lineage.ts/lineage-import.test.ts）sha256 入册；verify 日志 locks:check「125 个受锁文件与 manifest 一致」。报告「122→125」与 manifest diff（+3）自洽；「unlock 123 解锁」=unlock 时点磁盘已有 122 旧受锁+1 新测试文件，数字不矛盾。
- **UTF-8/占位/行数**：quality:check 无占位/无乱码/无跨域引用（verify 日志）；LINEAGE_REPO_STUB 已删（diff 确认）；行数 repo 232/service 305/ipc 38/models 116/test 352 全 ≤500。
- **无新依赖**：diff 无 package.json/lockfile。

## C. 代码与测试质量

**四档红证（上批流程改进三条全核）**
- 红：lineage-import.test.ts 收集级红（Failed to load url …/lineage.service），1 failed/520 passed，exit=1（日志尾部机器输出）。
- 绿：80 文件 542 用例全过，exit=0。
- 变异红证：M1（多父守卫禁用→「多父边拒绝」断言级红 expected true to be false）/M2（环守卫禁用→「运行时守卫③成环拒绝」红 expected [Function] to throw）均严格断言违反型；三轮各 1 failed/541 passed、exit=1，`M1/M2/M3-restore-diff-empty` 三处还原标记入日志（cp 备份法留痕）。
- verify：quality/tickets(104 工单一致)/locks(125)/lint/typecheck/test 80/542/build 全绿，exit=0。

**票面测试清单逐项核对（全有）**：替换重灌✓/幽灵（path+库不动）✓/多父（导入+运行双面）✓/环（双面）✓/自环（双面）✓/zod 行级 reason（nodes.0.title+顶层）✓/空 draft 合法✓/重复边 UNIQUE（repo DDL 拒+service 中文收口+导入面拒三面）✓/纯函数性质（同输入两次 deepEqual）✓/service 守卫三路径（各断言中文 reason+库不变）✓。外加悬空边/重复节点/级联链/clearGraph/upsertNode 幽灵/importFromFile 损坏 JSON 上抛。断言无恒真（皆具体值/中文关键词/长度断言）。

## D. 报告诚实性

- 自裁申报九条逐条对 diff：clearGraph（repo 接口+头注）、draft 增强三面、判别联合、pickJsonFile、涟漪四处、upsertEdge 更新重估、IO 上抛（含 ai-notes-import 先例差异声明）、删减面（15 文件 235+/15- 与 git diff --stat 实测一致；dist_new/ 残留如实申报）、工单号短式纪律（五新文件均「LG-01」短式，repo 文件全号合法）——**全报、无漏报、无虚报**。
- 数字核对：80/542/125/exit 码全部对日志属实；「122→125」「123 解锁」逻辑自洽。
- 微瑕两处（见 N 级 findings）：文件清单「头注五层规约原样保留」措辞与实际「保留+四处补写（clearGraph/upsert 语义/listGraph 序/接口段）」不精确——但疑虑 1 已如实承认接口段补写，实质诚实。

## E. 接缝与后续单

- **LG-02 消费面**：lineage/graph 通道（voidReq→{nodes,edges}）就绪；LineageNode/LineageEdge 类型自 shared/models/lineage.ts 导出（zod 单源）；x/y null=自动布局语义注释明示（「LG-02 消费 null」）；listGraph created_at,id 确定性兜底序=布局前稳定输入；INV-27 声明 listGraph 森林语义是 Reingold-Tilford 前提。
- **LG-03 接线面**：service 四写方法签名（upsertNode/removeNode/upsertEdge/removeEdge）已建已测；api-surface 注释明示写四通道预留面（upsert-node/remove-node/upsert-edge/remove-edge）；INV-27 明示 LG-03 只接线不另写守卫（守卫宿主已定 service）——相容无冲突。
- **写面不污染**：migrate.ts 纯追加 version 4（既有清单机制 user_version 幂等跳过不动），已迁移库（v3）升级自动应用 004。
- **INV-27 登记行**：五列（编号/不变量/声明处/强制方式/状态）齐备，与 INV-25/26 惯例一致（ADR+代码位置+登记单号日期；单测强制方式；已锚定+日期）。

## Findings

| 级别 | 位置 | 内容 |
| --- | --- | --- |
| N1 | scripts/audits/lg01-mutation.log:1267-1271 | M3（幽灵检查禁用）红证形态为 SqliteError: FOREIGN KEY constraint failed 异常冒出型，非断言违反型——幽灵用例断言未执行到即被 DDL FK 兜底中断。红证目的（测试对实现错误敏感、非恒绿）达成且显现防御纵深（service 守卫失效时 DDL FK+事务回滚仍保库不动），但严格说 M3 未证明幽灵用例断言本身能红；该构型断言（r.ok false+库保持）已由 M1 同构证明。不构成回炉。 |
| N2 | lg01-impl.report.md:28 | 文件清单称 repo「票面头注五层规约原样保留」，实际头注有四处同步补写（repo 方法族+clearGraph 行、接口段 clearGraph()、upsert 语义段、listGraph 序段）——补写本身正确（头注与实现同步），疑虑 1 亦如实申报接口段补写，仅清单措辞不精确。 |
| N3 | docs/invariants.md INV-27 行 | 「运行行面 upsertEdge 三拒绝用例」为「运行时面」笔误（错别字，不影响语义与机检）。 |
| N4 | tests/unit/db/migrate.test.ts:52-72 | schema golden 用例表清单未含 lineage_nodes/lineage_edges——与 AI-01 先例一致（ai_notes 亦未入 golden），新表存在性由 lineage-import.test 真库夹具实际覆盖（beforeEach 即全量迁移+直接写表），非覆盖缺口，仅记录惯例。 |
| N5 | src/main/services/lineage/lineage.service.ts:249 | importDraft 在 validateDraft 通过后 `lineageDraftSchema.parse(raw)` 二次解析（注释自证「已验过必成功」）——正确但冗余；个人库规模无性能面。风格观察，不强制。 |
| N6 | src/main/services/lineage/lineage.service.ts:262-293 | upsertEdge 守卫为 check-then-act（listGraph 快照后 upsert 非原子窗口）——单用户本地应用 + better-sqlite3 同步单线程无并发窗口，AI-01 同哲学；LG-03 大图性能疑虑实现者已在报告疑虑段自报。记录备查。 |

无 B 级（宪法红线/母本偏离/断言放宽/诚实性造假）。无 W 级（回炉项）。

## 统计

- findings：B=0，W=0，N=6
- 主控预裁五项复核：①只注册两通道+四写方法全建全测零死条目——成立（api-surface 仅 import/graph，service 四写方法不接 IPC）；②pickJsonFile INV-07 同型——成立；③clearGraph 最小性——成立（清面重灌行为层必需，AI-01 deleteByPaper 对应物，不经 IPC，头注+申报+测试三同步）；④受锁涟漪四处——逐处判**契约扩展必要同步非放宽**：migrate.test 版本清单精确匹配 [1,2,3,4]（下一行本就 Math.max 动态断言，AI-01 加 003 同型演进）；enrich/import 测试+ipc-deps 均为 `{} as`/`null as never` 桩工厂同型补位（ServiceBundle/Repos/Dialogs 接口扩展的类型对账），无既有断言变动；⑤INV-27 登记行已入册且格式合规——成立。
- 数字核对：red 1failed/520/exit=1✓；green 80/542/exit=0✓；mutation 三轮各 1failed/541/exit=1+还原 diff 空✓；verify 全绿含 locks 125/exit=0✓；diff --stat 15 文件 235+/15-✓；行数五文件全 ≤500✓。

## 总评

**PASS（放行门二终审）**。母本 ADR-0014 DDL 逐列字面照抄；三段校验/全有或全无/替换重灌/三拒绝守卫全部实现且测试锚定；宪法红线（分层/预编译参数绑定/受锁流程/UTF-8/占位/行数/依赖）零违反；四档红证可信（三条流程改进全落地）；报告自裁申报完备诚实；LG-02/03 接缝（通道/类型/守卫宿主/通道命名预留）相容，INV-27 随单登记合规。六条 N 级均为观察记录（M3 异常型红形态、两处措辞/笔误、golden 惯例、二次 parse、check-then-act 无害窗口），无一构成回炉依据，建议随收口单顺手处理 N3 错别字即可。
