# 交接书 v153 —— F-LOCATE-01 三屋全链毕·翻 done（2026-10-07 晨场）

> 前承 v152（F-ROUTE-02 U5 收官）。本批=2026-10-07 07:00 一次性定时开工任务
> （automation-8b406b0a，用户 00:15 设置——「等任务清空后按最新交接书开工」）
> 承接 v152「下场首办=F-LOCATE-01（用户日间会话）」。runId=20261007-flocate01。
> 基线=0a5136d2f13（U5 批，CI 37542929192=success——本场首查销项）。

## §0 本场开工记录

- 活动任务检测：一轮通过（动态工作流 0 在途+自动化三件均 completed+git
  工作树 clean+零引用本项目的 node/electron 进程）——凌晨 4 点兄弟任务
  （automation-25a4a010）已毕，交接书 v149→v152（F-ROUTE-02 全链收官）。
- 技能清点：ai-dev-org=用（三屋派发/烤验表/成本账本/health-scan）；
  test-driven-development=用（红→绿→变异红证）；verification-before-completion=
  用（verify 真退出码捕获法——重定向文件尾亲验）；systematic-debugging=用
  （根因终诊）；subagent-driven-development=不用独立加载（ai-dev-org 覆盖）。
- 配置：主控=GLM5.3（宿主）；ops-executor/ops-probe=随宿主（账本 E3 欠账
  注记）；ops-gate1-k1=kimi-third $max / ops-gate1-d1=deepseek $max；
  ops-adjudicator=kimi-third 座 $max。

## §1 基线终态（对不上禁提交）

- **verify EXIT=0 亲验（捕获法——RR3 后全量重跑；262 件/2734 例=2728+6
  恰闭合；probe 分解补验七步全 0）**。
- 本批 **11 文件 +159/−29**（numstat 双口径亲验+C1 机检档
  `20261007-flocate01-probe/probe-11-numstat-final-rr3.txt`；裁决部复算 3b
  呈报 30 的差异=主控呈报清单笔误 invariants 1/1→实为 1/0——HEAD 视角
  RR2+RR3 合并纯新增行）。untracked=0。
- 提交尾注=**[locked-change]**（invariants.md+lineage.spec.ts+三单测件
  +manifest 受锁——registry/账本随批）。locks 369（五哈希随迁）。

## §2 交付（四件+三轮回炉）

1. **根因终诊（精于票面原归因）**：setPage 旧 clamp 在 totalPages=0
   （doc 未就绪窗口）时 min(N,-1)→0 吞值——waitOpen 捕获 ready 即返回而
   setTotalPages 要等 onDocReady；恢复链 onColumnReady(t.page=0) 滚开篇。
2. **件①** setPage clamp 守卫+setTotalPages 落定 re-clamp 收敛（RR1-1：
   landed>0 夹回/landed=0 驻留守卫——RR2 格 e）——页码/滚动两侧分工成文。
3. **件②** annotationId 载荷透传链（bus 可选字段+SidePanel 构造+Page
   spread+openFromBus 透传→flashAnnotation 零改动）——元素级停驻恢复。
   **票面两候选双取**（主控终裁+可否决呈报位——d1 判不越票面，异议即回滚
   件②，页级停驻〔件①〕独立成立）。
4. **件③** T4 e2e 页级判别断言回补（sr-only「当前第 2 页」；旧终态
   「当前第 1 页」先红在案）。
5. **件④** INV-118 登记（五列+收敛条款+landed=0 语义+判别范围双时点标注
   ——RR3 修正）。

## §3 三屋门链（成本=主控补记单源 10 笔）

- **executor**（随宿主）：基批 6,052,171 tok/83 tools+RR1 4,207,053 tok/
  32 tools。申报③诚实发现（M1 下 T4 绿=件②补偿链活体——与 B2 前 AI 链
  掩盖机制同型）→T4 定性=件①②联合判别面；M2-T4 实测绿=件①-alone
  端到端直证。
- **门一 k1**（kimi-third $max）：首轮 B0W1N5→RR1 增量 B0W1N1→RR2 终确认
  **B0W0N0 放行**（判别网五格五变异独立红证认定）。三轮 27,854+38,236+
  42,242 tok。
- **门一 d1**（deepseek $max）：首轮 B0W2N8→RR1 增量 B0W2N3→RR2 终确认
  **B0W0N2 放行**。三轮 56,322+43,203+46,706 tok。
- **RR2/RR3 主控亲笔**：格 e+M4/M5 亲证+头注 INV 笔+行数门压缩+INV 表述修正。
- **probe**（随宿主）：十项 9 GO+1 NO→RR3 销项——2,512,820 tok/67 tools/
  13min。变异五处独立复现全红证+locks 抽查+grep 六面+计数链。
- **裁决部**（kimi-third 座 $max）：**GO_WITH_CONDITIONS 零回炉**（36,070
  tok）——复算五组（例数链闭合/e2e 87→88=T6n 口径滞后〔v152 §5「82→87」
  =U4 时点，U5 加 T6n→88，本批零新例〕/diff +159/−29/行数门链修正版自洽
  〔修前 wc249/split250→+1→251 红→−1→250 过〕/M1 红面演变自洽）。C1-C5
  全兑现（C1 机检档落 probe-11+C3 挂账）。

## §4 挂账清单+下场首查/首办

- **下场首查**：本批提交 CI。
- **下场首办=用户裁决位**：F-LOCATE-01 毕后活跃 open 票=F-TAGS-02（受
  「DB 战役统一窗口」排期约束——UI 终态是否冻结=用户位）+F-EVCTX-01
  （新立案）——无人值守场不开新裁决位，留用户日间定夺。
- 挂账五项：①e2e 取证基建=**F-EVCTX-01 独立票**（registry 立案——
  error-context 覆写→保号/多轮保留）；②非活动 tab 收敛依赖备案
  （PdfDocProvider 单文档单实例形态无独立面）；③段⑤超界消费=设计推论
  待实证（T4 仅覆盖合法值——clampPageToColumn 夹末页与页码侧一致）；
  ④LineagePage.tsx 250/250 零余量（下票触及先瘦身/拆件）；⑤check-quality
  split/wc 口径差语义注释（C3——下一触及窗口，同源两现：executor 申报
  失实+呈报链混淆）。
- 证据件：仓外档案区 20261007-flocate01-exec/（14 件）+20261007-flocate01-
  probe/（probe-01~11+变异 10+工具件）。

## §5 本场成本（收口登记）

- executor 10,259,224 tok（基批+RR1）；gate1 k1 108,332+d1 146,231 tok；
  probe 2,512,820 tok；adjudicator 36,070 tok。账本 778→788 十笔（主控
  补记：impl 2+gate1-review 6+probe 1+adjudicate 1——commit 笔随提交）。

> 后续序：待用户裁决（见 §4）。
