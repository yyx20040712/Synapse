# SR2-ENR-01 门一对抗深审（2026-08-28）

审计人：门一子代理（独立于实现者，不信任其报告任何断言，逐条对实物核实）。
输入：`enr01-gate1.diff`（1068 行）/票面（cited-by.service.ts 头注五层 + enr-ticketing-draft.md SR2-ENR-01 节）/`enr01-impl.report.md`/四份证据日志。
方法：只读实物核对（git status/diff 单点 + 源文件全文 + 日志统计行 grep）；禁一切 npm/test 命令（主控已亲验 verify exit=0）。
开工技能清点：code-review-excellence（用·核心）/javascript-testing-patterns（用·测试与变异红证评估）/TDD·systematic-debugging·verification-before-completion（不用：不实现不调试不跑命令，完成验证=对照输出契约人工逐项）/git-advanced-workflows（不用：仅只读单点核对）。

## findings

### B 级（阻断·回炉）

无。

### W 级（警告·应处置）

**[W1] 报告用例计数误差：cited-by.test「10 用例」实为 9**
证据：`scripts/audits/enr01-impl.report.md` §二文件清单表（"六格+0 值边界+跨格序列 10 用例"）与 §三（"cited-by.test 10 用例全红"）；实物 `tests/unit/services/cited-by.test.ts` grep `it(` 计 9；红证日志 `enr01-red.log` 铁证 `cited-by.test.ts (9 tests | 9 failed)`，绿档同 `(9 tests)`。
论述：纯计数笔误，不推翻任何实质断言——六格（格1/1b/2/3/4/4b/5/6）+0 值边界+跨格序列实际全覆盖，9 全红成立，报告其余数字（19 failed/620 passed/639 总量、88 文件、基线 621+新增 18=9+3+1+2+3）均与日志吻合。处置：主控知悉，无需回炉；收口简报勿沿用"10"。

**[W2] 跨模块行为不变量未登记 docs/invariants.md**
证据：`docs/invariants.md` 无 cited-by 条目（票面文件清单 B3 修正后亦未列该文件）；不变量实体=「被引缓存保留语义」（work=null/字段缺省→旧值保留不清缓存；非 null 含 0→强制刷新；0 与 NULL 判别 === null），横跨 enrich.service→papers.repo.applyEnrichment→detailById→ENR-02 装配，属宪法「跨模块/跨时间行为不变量」。实现者已自申报（报告疑虑 1）并给出两案。
论述：宪法字面「新增跨模块行为不登记视同未完成」——缺口属实；但根因是票面遗漏（B3 清单无 invariants.md），非实现者越轨，且三要素实质已备：声明处=cited-by.service.ts:79-87 头注状态机、强制方式=cited-by.test 九用例+papers.repo.test「再不传则保留」断言（enr01-gate1.diff:758-764）、锚定状态=cited_by_count NULL/0/有值三态。处置建议：主控收口前补登记一条（随收口单 docs 提交），不支持"裁定头注+测试已足"案——成册检索性是登记的本义。

### N 级（注记）

**[N1] migrate.test.ts:10 单行同步——维持主控预裁，并补一更强依据**
证据：diff:694-706 全文唯一 hunk（`[1,2,3,4]`→`[1,2,3,4,5]`，仅 :10 单行）；实物 tests/unit/db/migrate.test.ts:10 同。
论述：票面「migrate.test.ts 断言动态 Math.max 零涟漪（不改）」的说法本身误读了断言结构——:10 是 appliedVersions **字面量**断言，Math.max 动态断言在 :11（该行确实零涟漪）。新迁移入册后字面量必然失配，仓库事实证伪票面，预裁 1 正确且历史先例（222962c/06ea570）同型。改动性质=契约同步，非放宽。

**[N2] 变异轮 2 的红为 TypeError 型，非断言不等红**
证据：`enr01-mutation.log:12-23`（6 红）；变异 `work === null`→`=== undefined` 后 work=null 时 `work.citedByCount` 在 null 上求值必抛 TypeError（挂点 enrich.service.ts:137 先归一为 null|对象， cited-by.service.ts:96 第二支随之在 null 上取属性）。
论述：单 token 恰中目标成立、测试确实捕获破坏，红证效力等同；但按工单「断言级」严格口径，轮 2 是异常红（轮 1/3/4 为断言不等红，日志红用例分布与报告§五逐轮描述一致）。不构成处置项。

**[N3] openalex.ts 头注未同步 citedByCount 字段行**
证据：`src/main/services/enrich/providers/openalex.ts:10` 头注接口层仅 `OpenalexWork extends EnrichedWork { arxivId }`；crossref.ts 头注已补 citedByCount 行（diff:613-617）。
论述：OpenalexWork 经 extends 自动含字段、行为说明在 crossref 单源（EnrichedWork 声明处），接缝无信息丢失，仅两文件头注详略不对称。可在 ENR-02 或收口顺手补一行，非必须。

**[N4] detailById 的 `as` 单点收窄依赖应用层不变量**
证据：papers.repo.ts:247 `citedByCountSource: r.cited_by_count_source as PaperDetail['citedByCountSource']`。
论述：若库内出现 count 非 null 而 source 为 null 的脏态（三列同写不变量被绕过写入），会向 optional 字段透出 null——schema 是 z.string 之外无 null 的 optional，严格消费方（ENR-02 若 parse）会在异常数据处暴露而非静默。注释已声明依据（写入面只收 PaperSource 枚举+三列同写），可接受；提醒 ENR-02 装配侧保持 strict 口径。

**[N5] 跨格序列末段「导出装配仍带 5」归 ENR-02 装配面——归属合理**
证据：ENR-01 票面文件清单不含 corpus.assemble.ts/export 件；本单以 cited-by.test 跨格三段（纯函数层，diff:841-851）+papers.repo.test「再不传则保留」（库层，diff:758-764）闭合到「旧值 5 保留于库」；报告疑虑 2 同口径申报。
论述：「导出装配仍带 5」的数据通道（paperDetailSchema 三 optional+detailById 配对透出）已就位并被 repo 测试锚定（diff:767-783），ENR-02 只需消费。切分与票面依赖序（ENR-01→ENR-02 串行）一致。

**[N6] 工作树残留 dev-launch.cmd 与 dist_new/ 非本单实现面产物**
证据：git status untracked；dev-launch.cmd 内容=Node24 PATH 前置的 `npm run dev` 启动器（对应主控环境注/预裁 3）；dist_new/=构建目录。二者均不在 diff 包（16 文件）内。
论述：排除实现者越权产物嫌疑；属主控环境配置，随会话管理，不入本单提交面。

**[N7] citedByPatch 的 row 参数现不参与分支——票面原设计，非遗留死参**
证据：cited-by.service.ts:88-99（row 仅入签名；分支只用 work 两态）；票面接口层原文即含 `row: Pick<PaperRow,'cited_by_count'>`；头注:84-85 声明锚定语义（「保留谁的缓存」）供未来演进。
论述：ESLint after-used 口径下不报未用（后邻 now 已用）；与票面签名逐字一致，攻击不成立。若未来启用（如"新值低于旧值不回退"）须回头注补状态机行。

**[N8] enrich.service.ts:149 `citedBy ?? undefined` 不违判空铁律**
证据：该处对象仅 null|CitedByWrite 两态（citedByPatch 返回形），?? 是 null→undefined 参数适配，非 0/NULL 判别；metrics 判别面（cited-by.service.ts:96、papers.repo.ts:242/246）逐处 `=== null`/`!== null`/显式三态，全无 ??/falsy。变异轮 1（`=== null`→`=== undefined` 3 红）反向互证判别 token 被测试锚定。

### 主控预裁项攻击结论

1. **预裁 1 维持**（见 N1，附票面误读断言结构的更强依据）。
2. **预裁 2 维持**：papers.queries.ts 拆分对 diff 删除侧逐段比对——ORDER_BY/AGG_COLS/LIST_SQL/SummaryRow/escapeLike/toSummary/buildFilters 函数体逐字同；DETAIL_SQL/DetailRow 增三列是本单票面功能而非搬移漂移；buildFilters 原闭包级实现函数体仅引用 import 的 escapeFtsQuery、模块级 escapeLike 与局部变量，零闭包变量依赖，模块级化等价；既有 searchSummaries 全用例（FTS/LIKE/过滤/排序）绿=零行为漂移实证；repo 拆后 255 行≤300。判定"宪法机械配套"成立。
3. **预裁 3 接受**（N6 旁证环境一致性，verify 证据可信）。

### 工单 A~E 覆盖摘要

- **A 母本符合度**：六格全实现（cited-by.test 格1/1b/2/3/4/4b/5/6）+0 值边界（格1 样本 0、格4b 0→0）+跨格序列（纯函数三段+库层保留）；citedByPatch 四参与票面逐字一致（返回型 CitedByWrite 为票面内联形状的命名等价，papers.repo.ts:80-84 单源）；applyEnrichment 独立第三参=票面下放自裁项且已申报；paperDetailSchema 三 optional（paper.ts:46-48）；PaperMetaPatch/paperMetaPatchSchema（paper.ts:54-64）/PATCH_COLS（papers.repo.ts:119-126）零触碰实证；迁移 005 三 ALTER 全可空；arxiv.ts 零改动（git status）；白名单三 host 原样零新增。**全过**。
- **B 宪法红线**：分层单向（services→repos import type、repo→同域 queries、renderer 零文件改动）；行数全合规（repo 255/queries 107/其余<500）；SQL 全 prepare+值绑定（updateColumns 动态仅白名单列名，papers.repo.ts:155-160 既有模式）；零新依赖（package.json 未动）；UTF-8（verify quality 关过）；tests/** 六文件逐件核对=契约扩展（新增块+夹具补字段+断言补行），无一处放宽既有断言。**全过**。
- **C 代码与测试质量**：判空逐处合规（见 N8）；zod 无 .catch（两 provider 均 `z.number().int().nullable().optional()`，脏类型→parse 失败→failed 诚实语义）；now 注入合规（纯函数零现时，默认值工厂闭包，corpus.export.service.ts:145/182 先例属实）；新用例五处全裸 describe always-active；变异四轮单 token 恰中目标（各 token 在目标文件唯一出现）+cp 备份法还原 diff 空（四轮 [diff] empty 实录；工作树无 .bak 残留）；papers.queries 搬移等价（预裁 2 段）。**全过**（N2 口径注记）。
- **D 报告诚实性**：自裁 8 项逐条对实物成立（①第三参+CitedByWrite 单源 ②拆分等价 ③枚举闭环 ④显式三态 ⑤裸 describe ⑥deps.now 先例属实 ⑦头注同步（N3 轻微不对称）⑧15 项清单无删减）；否定性断言（arxiv.ts 零改动/registry.ts 未碰/status 仍 open/白名单零新增）全部对实物证实；红证 19 failed 与日志一致、分布描述吻合；唯一瑕疵=用例计数 10→9（W1）。**实质全过**。
- **E 接缝与后续单**：papers.repo 头注与实现一致（applyEnrichment 第三参行为/拆分说明均已入头注）；import.service.ts:123 显式构造 15 字段、三列 `?:` 不构造合法（diff 外零涟漪实证）；findById/findBySha256 返回多三可选字段，既有消费面（import/enrich）+全部锁定测试零破坏；ENR-02 数据通道（schema 三 optional+detailById 配对透出+repo 测试锚定）就位（N5）；不变量登记缺口见 W2。

## 统计

**B=0 / W=2 / N=8**

## 总评

**PASS**（W1 知悉、W2 主控收口前补登记 docs/invariants.md 一条，均不构成回炉）
