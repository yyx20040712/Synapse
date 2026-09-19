# F-PROC-01 门一审包（b28 制度批——主控→门一 k2）

你是门一对抗深审岗。铁律：只读本包+包内路径文件；唯一可写=审计报告
`scripts/audits/b28-gate1-report.md`；禁 npm/禁跑测试/禁触仓库命令面；臆测
包外事实=违规。对 diff 逐 hunk 断言，输出 [B|W|N] 逐条+file:line 证据+统计
（B/W/N 计数）+总评（PASS / PASS_WITH_WARNINGS / FAIL）。

## 0. 任务背景（自包含）

- 票面（registry:318，id=F-PROC-01，open，area=infra）：「制度批（裁决 9 后步
  +裁决 14 落点）：①每票 DoD 增『本票触及的 ADR/架构段落回写』项；②交接书
  模板固定『事故档回流段』（修复三周断链）；③治理基线指标扩三：reader 占
  src 比（38%）/COMPOSITION_ROOT_ALLOW 条数（7）/模块单例清单数（约 10）；
  ④COMPOSITION_ROOT_ALLOW 冻结规矩（新例外=用户级裁决）+工单规约增句
  『引入平行新实现路线须声明并存理由+退役触发线』（M2 制度预防）；⑤直调类
  派发账本补记规则（F-ALIGN-01 核查落法）；⑥裁决 14（health-scan 并行不并入
  verify——流程规则面防再被当漂移抓出）入 methodology；file=docs/methodology.md」
- 授权链：docs/design/2026-09-18_complexity-governance-ruling.md 裁决 9
  （文档刷新机制=补课 F-DOCGOV-01 已毕→制度批 F-PROC-01）+裁决 14（health-scan
  显式记为并行不并入，随 F-PROC-01 入 methodology 防再被当漂移抓出）。
- 本票附加承接（b27-docgov01-impl-report.md §6 移交，主控裁量纳入）：survey ③
  余项三件显式化（P7E-04 还原项/survey-③#8→W-11 登记；ADR-0013 复审快照+
  ADR-0015 P8+ 候选→复审状态注记）+survey ⑤ audit0-findings 头部「唯一登记处」
  声明失真勘正+survey D-2 INV-27 巨条形态评估（主控裁：不拆，落登记册形态
  规约——历史叙述红线）。

## 1. 主控已预裁项（可攻击但推翻需更强依据）

1. 纯文档批定性：零 src/零 tests/零受锁脚本触碰（check-quality.mjs 明示零
   触碰——制度句单源 methodology，P3 防双源）；e2e 不跑（零行为面，b27 门二
   N-4 同口径）。
2. INV-27 不回拆：历史叙述红线（b27 处置惯例）+受锁面最小化；形态规约立
   于 methodology §2 新条（新增条目≈400 字级即 ADR 化，存量例不回拆）。
3. 基线三数实测口径：reader 占 src 比 37.2%（GEOM 战役后实测 11,514/30,974
   行，分母含 CSS——与裁决书 38% 口径同族，战役后微降预期态）；
   COMPOSITION_ROOT_ALLOW=7 条（check-quality.mjs:93-101 Map 实数）；单例
   清单数=13（INV-70 附件清单 zustand 11+toast-store+annotation-undo——票面
   「约 10」为立项时估数，以册实测为准）。
4. 治理指标滚动载体写「交接书/接力板基线段两形态通用」——现行排程真相源
   实为接力板（relay.md），制度句覆盖两形态防再漂移。
5. audit0 头部勘正保留原标题原文（历史），职能注记紧随其后——不抹史。
6. 简报总则「9 文件」系主控笔误（起草时误计 check-quality.mjs/relay 入内），
   落点表体权威=11 行编辑/6 文件；实现者以表体为准未扩面=正确裁量（票面六
   子任务+移交三项映射核对无漏发——映射=①#1/②#3/③#2a/④#2b+#4/⑤#6/⑥#5，
   移交=#7+#8+#9/#10/#11）。

## 2. 审计输入

- **diff 包**：`scripts/audits/b28-gate1-diff.patch`（141 行，6 文件——恰为
  实现者编辑面；工作树另有 relay.md/manifest.json/b28-claim.mjs 主控面，已在
  实现者报告疑虑 2 声明剔除，非本审对象）。
- 实现者报告：`scripts/audits/b28-proc01-impl-report.md`（自裁 4 条+疑虑 3 条）。
- 实现简报（落点表=任务书）：`scripts/audits/b28-proc01-impl-brief.md`。
- 基准文件（改后全文，供上下文核对）：`docs/methodology.md`/`AGENTS.md`
  （DoD 段 :79 起）。

## 3. 审计工单 A~E

- A 母本符合度：票面六子任务+移交三项 ↔ diff 逐 hunk 对应（预裁 6 映射）；
  简报落点表 11 行是否全数落地、无漏发无扩面。
- B 宪法红线：受锁面零触碰声明核实（check-quality.mjs/tests/shared 不在 diff）；
  中文 UTF-8 可读；历史叙述红线（audit0 标题原文保留/INV-27 未动）。
- C 制度句质量：新增条款与既有条款无冲突/无重复立源（P3——冻结规矩单源、
  指标口径单源）；数字与实测一致（37.2%/7/13 与 11,514/30,974）；指针有效
  （complexity-audit §3/INV-70/ADR-0014/align01-org-audit.md 等被引对象存在）。
- D 报告诚实性：自裁 4 条与 diff 实况吻合；疑虑 1 计数笔误申报属实。
- E 接缝与后续：新制度句是否产生消费面义务（DoD 新行的执行成本/八指标滚动
  的落点——relay 板基线段是否本批应同步示例化？主控预判：制度立+下批滚动
  生效即可，本板收口日志已带三数，不另改板面结构——你可攻击此点）。
