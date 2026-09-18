# 批次接力状态板（机器门控文件——火按此行动，人可读）

> 项目：Synapse_remake ｜ 战役简报=docs/design/2026-09-18_complexity-governance-ruling.md
> （14 项用户裁决+五梯队编排 v1.1，下称《裁决书》；本板清单为《裁决书》§3 的执行投影，
> 排程冲突时以《裁决书》为准并回改本板）。
> 建板：2026-09-18 主控会话（用户指令「本会话不正式开工」——**板已备、火未布防**；
> 点火入口=用户显式 `/batch-relay`，或手动会话直接按本板清单领批，两径同规）。

- status: READY
- automation_id: automation-c21dd023-3a61-42de-80b0-754bc3f2e872
- plan: docs/handoff/relay.md#执行清单（自含清单，收口 grep 本文件 `- [ ]` 计余量）
- spec: docs/design/2026-09-18_complexity-governance-ruling.md
- poll_interval_min: 10
- last_dispatch: 2026-09-18T20:30:44+08:00
- fire_budget_min: 120
- heartbeat_utc: 2026-09-18T13:39:59Z
- claim: claim-1789734695-b16
- no_progress_count: 0
- checked_total: 35
- checked_done: 20

## protocol（角色自识别 + 最小兜底协议——技能不可加载时按此执行）

- **收到火 prompt 的会话=调度员**（投递实证：火只投给创建自动化的布防会话）：
  读板，READY 且 last_dispatch 距今 ≥30min → UI 开批（<30min=发布静默窗，
  一行退出；侧边栏展开 → AXPress「新建任务」→「选择项目」勾选本
  项目 → Escape 收菜单 → 真实点击 textfield 建立焦点 → app 级 strategy=event
  键盘写入下方执行指令 → 回读确认文本落框且发送按钮激活 → 点发送）；RUNNING 且
  心跳 <30min → 退出；RUNNING 且心跳 ≥30min → 核对 git 进度后接管；DONE/HOLD →
  CronDelete(automation_id) 后退出。UI 选择器漂移时降级为会话内直跑，批次日志记欠账。
- **被注入执行指令的新任务会话=执行者**：开工首步 Skill 加载 ai-dev-org（组织
  主干）→ 读板，READY → 原子 claim（写 RUNNING+claim+心跳后回读确认）→ 按
  「执行清单」领批至 fire_budget_min → 收口：勾选框更新（有 git 则提交）+批次
  日志追加+心跳刷新；无进展计数（勾选数未增 +1，连续 3 → HOLD+CronDelete+终报）；
  清单全勾（`grep -c '^- \[ \]'` 计 0）→ DONE+CronDelete+终报（含 Rulings 全
  清单）；否则 → READY。
- **执行指令**（调度员注入新任务用，原文）：「（引用技能 batch-relay）基于
  E:\class\智慧水务\Synapse_remake\docs\handoff\relay.md 交接文档继续开发——开工
  首步先加载技能 ai-dev-org，再按接力火协议认领并执行本批（工作区根
  E:\class\智慧水务\Synapse_remake，相对路径以此为基）。用户指令（2026-09-18
  调度员转达）：门一 k1（ops-gate1-k1）周额度已达上限——本批起门一审一律改用
  ops-gate1-k2（zipoo 源）承载，勿再派发 k1，直至用户另行通知」
- 禁止创建任何新自动化。停止事由（破坏性/安全敏感/仓外副作用 push/merge/发布/
  计划破碎到每条路都是猜）→ status: HOLD + CronDelete 后呈报。

## 执行路由（ai-dev-org 项目——批内引擎）

- **开工首步（执行者）**：Skill 加载 ai-dev-org（组织主干）——2026-09-18 版火
  协议/注入指令已内置此步；技能不可载时以 AGENTS.md 宪法+本板为兜底。
- 每票走三屋管道：实现者子代理（TDD 红→绿→变异红证）→ 门一 → 门二 → 主控收口
  （亲验 verify 真退出码+locks+diff 范围→翻 registry→提交）。派发通道按《裁决书》
  裁决 13：**绑定子代理（ops-*）为主**，外部派发器=健康探针+后备。
- **单火负载基准**：大中票一火一票；小票组一火 2-3 票（波次头注有分组建议）。
  每票独立提交（断点保护）；**不留半门审提交**（提交前该票门审完成或整体还原挂起）。
- 火协议收口步 health-scan RED=0 与票面 DoD verify **并行不互并**（《裁决书》裁决 14）。
- AGENTS 闲时纪律全数适用：三停止条件/单票回炉 ≤2/e2e 非确定红立案线（2 次立案）/
  视觉决策零承担（挂起跳次）/计数落笔前机器实测。
- **未规划裁决项处置**（用户裁决 2026-09-18「补上」）：遇即按宪法分类——用户级
  （负面清单边界/新依赖/制度修订/防线要改/发现测试自身错误/视觉决策）→ 挂起跳次+
  批次日志记 Rulings 待用户，**单批挂起 ≥2 项或整波受阻 → 本批收口后 HOLD 呈报**；
  主控级 → 回炉三分法自处不升级。已规划呈裁节点（ELE 实施时机/ALIGN 切换批准/
  TIME 降档方案/STOR 三桶口径/GEOM 超预算）完成产出即勾项，裁决本身待用户、
  不阻塞接力。
- 立案执行序（新票）：《裁决书》§5——骨架件（file 必须真实存在）→ registry 条目 →
  locks:generate+apply → verify → 提交。

## 执行清单（波次=接力顺序；`- [ ]` 勾选即完成）

### 第一波·立案批（一火完成；本波全部为 registry/骨架面，无业务实现）

- [x] T0｜check-tickets 重复 id 哨兵微票（双审 B 级发现，受锁 [locked-change]）
- [x] T1｜12 新票立案：F-SESS-01/F-AIN-01/F-DEP-01/F-ELE-01/F-ALIGN-01/F-LAYER-01/
      F-SENSOR-01/F-EXPORT-01/F-TIME-01/F-DOCGOV-01/F-PROC-01/F-STOR-01
      （骨架头注五层规约引用《裁决书》对应行；全部 owner:'strong'）
- [x] T2｜在册扩容票面修订：F-DEDUP-01（+app-file URL 单源）、F-GEOM-01（+目录化）

### 第二波·F-TESTREF 余票（大中票一火一票；W2 小可随 W1C 同火）

- [x] F-TESTREF-W1A（mock 工厂下沉，39 文件）
- [x] F-TESTREF-W1B（几何桩下沉，22 文件/97 处）
- [x] F-TESTREF-W1C（e2e 脚手架单源）＋可同火收 W2
- [x] F-TESTREF-W2（探针 spec 移出默认门；若未随上项同火则自领）
- [x] F-TESTREF-W3（src/shared 直接契约测试补齐）
- [x] F-TESTREF-W4（flake 台账+INV-63/64，战役收官票；F-TESTREF-S1 若触发随火搭车，
      不触发不阻塞）

### 第三波·梯队二：风险清账+组织对齐（小票组同火；ELE 呈裁即停）

- [x] F-SESS-01（导出会话悬挂修复，票面含态空间表）
- [x] F-AIN-01（回灌事务包裹）＋可同火收 F-DEP-01
- [x] F-DEP-01（postcss 显式化 [dep-change]；若未随上项同火则自领）
- [x] F-ELE-01（Electron 升级预研，纯调研零 src 变更；**产出呈用户裁实施时机——
      呈裁后本项即勾，实施属后续波次不在本板**）
- [x] F-ALIGN-01（组织定版对齐：R1~R6 真跑+ds-call v1→v2 切换呈批+ORG-SEG v2 重写
      含裁决 13 条文+词汇表补全+账本断流核查；制度+配置复合批，单火专注）

### 第四波·梯队三：既定战役（GEOM 战役大，设计链与实现分项）

- [x] F-DEDUP-01（服务层去重微扩版：DomainError/原子写/清洗+app-file URL 单源）
- [x] F-GEOM-01 设计链三跳（Kimi 拟定→deepseek 审核→GLM 终裁；设计书要件=
      态空间表+跨格序列+回落档语义裁决+六子域目录重组清单+净删行数记账+前史两
      条款承袭；定稿件独立提交）【收口 2026-09-18：提交 af946a5324——设计书
      docs/design/2026-09-18_f-geom01-unification-and-reader-subdomains.md
      415 行（三接缝闭合+三机制驳回+69 文件映射/八步迁移+G1~G11 切分+INV 清单）】
- [ ] F-GEOM-01 实现（按批准设计书切执行票立案后**在本清单此行下追加子项逐票勾选**；
      验收=e2e 44 全绿不破+锚定回归网+净删行数记账）
- [x] F-GEOM-01-G1（M0 类型下沉切环 §3.3——geometry-types 单源+三环切断；
      骨架已立 src/renderer/features/reader/geometry-types.ts）
- [x] F-GEOM-01-G2（保存链单源门+死面收敛 §2.4/§3.5——**唯一行为变更票**，
      [locked-change][test-refactor]；受锁面=selection-layer.test 14 用例
      改写+指纹门豁免清单）
- [x] F-GEOM-01-G3（band 三档绑定+跨族交互点登记 §2.5/§2.6——INV-68 落册
      [locked-change]，纯登记面）
- [x] F-GEOM-01-G4（目录化 M1 state/ 10 件 §3.4 [locked-change][test-refactor]；
      **开工前补票面**——check-quality.mjs:96 tab-dirty 键+:98 CorpusExtractor
      消费者目标串两行随步改写（门二 P1-3 登记，漏改=M1 verify quality 红）+
      registry 全域随迁义务首用（file 指向被迁路径的票一并改写））
- [ ] F-GEOM-01-G5（目录化 M2 time/ 4 件 §3.4 [locked-change][test-refactor]）
- [ ] F-GEOM-01-G6（目录化 M3 anchors/ 13+1 件 §3.4——受锁面最重：锚定
      回归网 18 物理件+跨特性 import（lineage×2+open-paper-bus）；
      check-quality:99 行（lineage→ai-note-style）对账到行号（门二 P1-3c））
- [ ] F-GEOM-01-G7（目录化 M4 interact/ 7 件 §3.4
      [locked-change][test-refactor]）
- [ ] F-GEOM-01-G8（目录化 M5 panels/ 8 件 §3.4 [locked-change][test-refactor]）
- [ ] F-GEOM-01-G9（目录化 M6a view 渲染簇 14 件 §3.4
      [locked-change][test-refactor]）
- [ ] F-GEOM-01-G10（目录化 M6b view 工具簇 13 件 §3.4
      [locked-change][test-refactor]——eslint INV-16 四路径分步随迁收官）
- [ ] F-GEOM-01-G11（战役收官：头注扫尾+净删/交互点记账+验收门全跑
      （e2e 一键全跑 45+默认门 43）+INV 终册+基线重冻结 [locked-change]；
      **收官时定 INV 册历史 reader 路径引用口径**（保留 vs 随迁刷新——
      门二 P2-2）；本票毕=本父行+registry 母票同步翻 done）

### 第五波·梯队四：第二波域归位（LAYER/TIME 小票组同火）

- [ ] F-LAYER-01（settings 下沉；随票落 L1 锁线 [locked-change]）
- [ ] F-TIME-01（时长链瘦身评估，产出呈裁不实施）＋可同火收上项
- [ ] F-SENSOR-01（ai_sensor 域整理，契约面 [locked-change]）
- [ ] F-EXPORT-01（corpus.export 拆件：状态机外提+IO/事件分离）

### 第六波·梯队五：文档+制度+存储（DOCGOV 必须晚于 ALIGN，已在波次序保证）

- [ ] F-DOCGOV-01（文档补课批+ROADMAP 退役两强制条款+多窗口 INV 登记，
      invariants.md 受锁 [locked-change]；ai-sensor 段随 F-SENSOR-01 终态回写）
- [ ] F-PROC-01（制度批：DoD 回写项/事故档回流段/治理指标+3/白名单冻结/M2 预防句/
      直调补记规则/裁决 14 入 methodology）
- [ ] F-STOR-01（audits 出库归档+manifest 同步 [locked-change]+AGENTS 三桶口径①
      修订呈批+本机 52M 清理）

> **P9 池（5 项）不入本板**——用户点单启项时按《裁决书》§3 P9 表立案并在此追加波次。
> 备选池与触发线=《裁决书》§5（含前史池承袭）。
> Electron 实施窗：F-ELE-01 呈裁获准且 F-GEOM-01 收口后，作为新波次入板。

## 批次日志（追加，勿改写）

### batch 16 增补二 — 2026-09-18（调度员停火：用户指令「删火」）
- 用户对本调度员会话明示「删火」：常驻火 automation-c21dd023-3a61-42de-80b0-754bc3f2e872
  已于 21:43 删除（CronDelete 回执 deleted:true + CronList 空集复核）；头部 automation_id
  行保留旧值仅为历史审计指向。
- **本板 batch 16 收口后将停于 READY 且无火接续——此为预期态非异常**。恢复两径同规：
  用户显式 /batch-relay 重布防（新 automation_id 回填本板），或手动会话按本板清单领批。
- 调度员会话自本增补起不再开批、不再补派（含执行者中途死亡亦不接管——停火令优先）。
- 在途 batch 16（G4 目录化 M1，门二处置后收口段）不受影响：执行者会话独立于火，
  自行完成收口（翻票+提交+板回写 READY）。
- 门一 k2 换源指令（增补一）与恢复条件留存板面，重布防时自动随注入指令生效。

### batch 16 — 2026-09-18（执行者会话：第四波 F-GEOM-01-G4 目录化 M1 state/ 10 文件迁移，完成）
- claim: claim-1789734695-b16｜认领 12:31:35Z｜收口 2026-09-18T13:39:59Z｜勾选 19→20。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/
  门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；TDD=实现者六段简报内嵌等价红绿
  闭环（基线锚+变异红证 M1/M2——零行为迁移票票面机制）；systematic-debugging 主控
  不加载（迁移修法=设计书 §3.4 定稿+派发前全边侦察前置；实现者侧两次停工根因定位
  系其简报内嵌纪律）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor
  绑定（GLM5.3flash $max）；门一=ops-gate1-k1 **连续两次 Provider authentication
  failed→换源状态机切 ops-gate1-k2 备源承载**（kimi k3 $max，zipoo——第三现，结构性
  盲区在案）；门二=ops-adjudicator 绑定（deepseek-flash $max）——门审均异构于实现者。
- **交付（提交 6f4058f750，零行为纯迁移）**：M1=state/ 域迁移——reader.store/tab-dirty/
  useActiveTab/annotation-undo/page-layer-z/ai-notes.store/ai-notes-phase/PdfDocProvider/
  CorpusExtractor/scroll-converge 十文件 1445 行迁 reader/state/（git rename 相似度
  98~100% 十对全识别）；深度修正 8 行（CorpusExtractor 3+reader.store 2+tab-dirty/
  annotation-undo/ai-notes.store 各 1——置底核验零例外）；src 消费面 50 行/31 文件
  （域内 48+跨域 App.tsx:12/useExportCorpusEvents.ts:32）；tests 受锁面 41 行/30 文件
  纯路径改写零用例增删；配置 2+2（eslint INV-16 :89/:92 随迁+check-quality :96 键/:98
  值=门二 P1-3 板注义务兑现）；registry 全域随迁义务首用九行（含 G4 自身 file 字段）。
  受锁面实勘勘正：设计书 §3.4 M1 行「3 件」系起草漏计——实 30 件/41 行（reader.store
  独占 23 行；pdf-factory=注释提名零 import 面）。
- **TDD 证据链**：基线 verify EXIT=0 锚（探针 lint 缺陷两次停工申报合规——主控裁决 A
  链：修探针 1 行+接受刷新版 raw）；变异红证 M1（TabBar 回退旧径→TS2307 EXIT=2→还原
  diff 空→复绿）+M2（测试件删 state/ 段→模块解析红 EXIT=1→还原→复绿→复锁）三段在档。
- **门审**：门一（k2 承载）**PASS_WITH_WARNINGS B0/W1/N6**——零行为断言逐 hunk 成立+
  构建产物哈希三方恒等最强旁证（index-D3egZtl2.js 1,392.72kB 同名同尺寸跨 baseline/
  partial/master）；W1=实现报告 tests 括注枚举失实（主数字 30/41 三面互证无误）→勘误
  :39 处置销；N3=构建哈希恒等建议升格 G5+ 迁移票标配（采纳）。门二 **GO_WITH_
  CONDITIONS P0=0/P1=1/P2=3/N=6**——14 项裁决全成立+数字逐组独立复算全过；P1-1=
  staging 名册按实测校准（26→29 件含终态新增三件；*.log add -f+porcelain 清零自查）
  →兑现；P2-1 tickets 红行数 18≠5 勘正入 registry 收口注记/P2-2 open 口径 17→16/
  P2-3 翻 done 前置提交前（g4-tickets-flip.log+g4-verify-final2.log EXIT=0 封
  「已验证态≠提交态」缝）——三条件全兑现。
- **机检终态**：verify 双跑 EXIT=0（registry 九行落妥后 master+翻 done 后 final2：
  206 票 open 17→16=恰 G4 翻 done+locks 345 一致（338+recon 3+fix 3+encoding 1）+
  test 170 文件/1744 用例+指纹门 187/1789/5411 零漂移+豁免 2hits 零新增+build 绿）；
  e2e 不跑（零行为口径，义务归 G11——门一 N6/门二 #14 同裁）；**health-scan RED×0
  WARN×0**；账本 45→48 行（executor 三段+门一 k2+门二，绑定岗主控补记 node
  JSON.stringify——.cjs 用毕即删）。
- 证据件入库（scripts/audits/，29 件）：g4-{recon-imports/internal/tests 三探针 .mjs+
  三 .log+imports.log.bak-diff 双版 raw；fix-deep/src/tests 三 .mjs+三 .log；encoding-
  normalize.mjs；impl-brief.md；impl-report.md（含 W1 勘误行）；gate1-brief.md；
  gate1-report.md（岗无写通道主控逐字归档）；gate1-diff.patch；gate2-brief.md；
  gate2-report.md（同型逐字归档）}+六 .log（baseline-verify/verify-final/verify-partial/
  verify-master/verify-final2/tickets-flip——14 .log 经 git add -f 入库，.gitignore
  *.log 拦截按 batch 8 教训③处置）。
- 教训三条：①**自产工具件入锁前先过自身 lint**（主控侦察探针 no-unused-vars 未用
  声明预登入锁后拦下基线 verify——「工具件写完即时 generate+apply」的姊妹义务=诞生
  即须过 lint 门；主控侧缺陷由实现者停工申报拦住，两轮裁决才清）；②**简报侧证据件
  计数凭印象**（门二审包简报写「8 .log」实 12→终态 14，被门二 P1-1 校准——「计数
  落笔前实测」的简报侧再实证，batch 15 教训同族：简报是下游输入，错计数传导成下游
  自裁面）；③k1 auth 失败第三现（batch 7/12 先例直接适用，换源以真实派发回执为准
  惯例再确认——零新增等级）。
- Rulings 待用户：无新增（票内自裁 10 项经门一③逐项裁成立+门二 #13 复核闭合；门审
  处置 W1 勘误/P1-1/P2-1/2/3 全兑现；受锁面勘正 30 件=[locked-change][test-refactor]
  双尾注权限内票内自裁）。
- 无进展计数：归零（19→20 有进展）。**下波=F-GEOM-01-G5（M2 目录化 time/ 4 件
  §3.4 [locked-change][test-refactor]——reading-time/reading-time-setup/reading-time-
  outbox/reading-time-outbox-store；受锁面=reading-time 系测试 import 按本批 30 件
  实勘口径先侦察后落简报；门一 N3 构建哈希恒等旁证升格标配采纳）。**

### batch 16 增补 — 2026-09-18（调度员注记：用户指令门一换源 k2——随注入指令转达）
- 用户对调度员会话明示：门一 k1（ops-gate1-k1，kimi-main 主源）周额度达上限，
  后续任务门一审换 ops-gate1-k2（zipoo 备源）承载。落法=板面「执行指令」原文
  追加该指令段（此后每班 UI 注入即明文转达新执行者），本增补留痕。
- batch 16 在途（claim-1789734695-b16，开工 20:31）：其门一若仍派 k1 将遇额度
  失败，按换源状态机自回落 k2（batch 7/12 先例）；心跳/收口回写板时可见本注记。
- 恢复 k1 待用户另行通知（本注记不自动过期，用户明示恢复时由调度员再改指令）。

### batch 15 — 2026-09-18（执行者会话：第四波 F-GEOM-01-G3 band 三档绑定+跨族交互点登记，完成）
- claim: claim-1789730608-b15｜开始 11:21:45Z（认领 11:23:28Z）｜收口 12:26:00Z｜勾选 18→19。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/
  门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；TDD=纯登记面无适用对象（简报③-1
  预裁+门一预裁项 1 复核认同——零行为变更无可变异对象，batch 12/8 先例）；systematic-
  debugging 不加载（无排障面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor
  绑定（GLM5.3flash $max）；门一=ops-gate1-k1 绑定（kimi-main k3 $max——正常承载）；
  门二=ops-adjudicator 绑定（deepseek-flash $max）——门审均异构于实现者。
- **交付（纯登记面零行为变更）**：①INV-68 落册（invariants.md:84 接续尾号 67——band
  三档绑定：档1 bandsFromItems=selection 快/全量主链+S2/S3a 唯一源/档2
  bandsForTextNodes=S4+selection 全量显示回退专用且产物不入库/档3 bandsNearRects=S3b
  存量专用，禁跨档消费+禁第四推导+calibrateBands 三档之上现状不变+§2.6 交互点
  #2/#3/#4 终态收口句）；②INV-58 尾部坐标域边界注（localScale=UI 布局域/
  rootToLocalScale=lineage 域件/itemViewportOf=项族域内——防 r3a 型域差事故重演，
  事故背景 F-A6-b2 项盒域差 G2 实战拦截）；③三处换算头注域声明；④陈旧头注勘正
  五处（selection-paint 两处+annotation-resolve 三处——F-A5「三消费点」族谎言面清零，
  接缝归责纪律：与 INV-68 档3 唯一消费登记互斥的声明全部对准）。6 文件 +33/-18
  （实现者交付 +21/-8+门审处置增量：W1 勘正+3/-1、P2-1 净零行重写、P1-1 行号
  锚 :237/:277/:302 实测修正）。
- **消费面核对（INV-68 前提事实）**：主控侦察+门一开卷双核——档1=selection-evaluate
  :130/:207+annotation-resolve 主链（itemSelectionGeometry:506 内 bandsFromItems）；
  档2=annotation-resolve:302（S4）+selection-evaluate:296（显示回退）；档3=
  AnnotationLayer.tsx:98 唯一；calibrateBands 三档之上（layered :135/:213+selection-
  evaluate :233/:290）——「现状天然档位绑定」成立。
- **门审**：门一 **PASS_WITH_WARNINGS B0/W2/N7**——引用锚 10 处抽核全命中+零行为
  逐 hunk 成立；W1=annotation-resolve:231 同族陈旧头注漏勘正（主控随收口勘正）/
  W2=INV-68 状态词「已登记」越维护规则三档词表（门一裁改「未锚定」推翻主控保留
  倾向——:88 明文规则行，接受）。门二 **GO_WITH_CONDITIONS P0=0/P1=1/P2=1/N=5**——
  W1/W2 处置逐字落准+增量隔离唯一 hunk；新发现 P1-1（W1 净+2 行致 INV-68 行号锚
  失准→主控实测修正 :237/:277/:302）+P2-1（模块头注 :21-23/:25-28/:49 同族残句→
  主控净零行变化设计重写防锚再漂）——均选菜单(a)收口前修复，未留 G11 债（G11 既有
  断锚债义务仍在：目录化迁移后 INV-68 行号锚随迁刷新）。
- **机检终态**：verify 三跑全 EXIT=0（实现者首跑+主控 W1/W2 处置后+P1/P2 修复后
  终跑 g3-verify-final3.log：206 票 open 18→17=恰 G3 翻 done+locks 338 一致+
  test 170 文件/1744 用例+指纹门 187/1789/5411 零漂移+豁免 2hits/2stale0+build 绿）；
  locks 链三轮 unlock→改→apply（manifest 每轮与 invariants.md 同步）；e2e 不跑
  （零行为变更——G1/batch 12 同口径，父级 e2e 验收义务归 G11）；**health-scan
  RED×0 WARN×0**（账本补记后复跑同绿）；账本 42→45 行（executor+门一+门二，绑定岗
  主控补记 node JSON.stringify——临时 .cjs 用毕即删）。
- 证据件入库（scripts/audits/，11 件）：g3-{impl-brief.md；impl-report.md；gate1-brief.md；
  gate1-report.md（岗无写通道主控逐字归档）；gate1-diff.patch；gate2-brief.md；
  gate2-report.md（同型逐字归档）；gate2-diff.patch}+三 .log（verify-final/final2/
  final3——git add -f 入库，.gitignore *.log 拦截按 batch 8 教训③处置）。
- 教训：轻量一条——主控简报的路径与计数断言落笔前同样须实测（本批简报两处瑕疵被
  实现者/门一审勘误：manifest 路径 scripts/locks.manifest.json→实为 locks/manifest.json、
  总数 +21/-9→实为 +21/-8——「计数落笔前实测」纪律的简报侧变体：简报是实现者输入，
  错路径/错计数会传导成下游自裁）。
- Rulings 待用户：无新增（票内自裁 6 项+门审处置 W1/W2/P1-1/P2-1 均闭合；G11 断锚债
  为既有票面义务非新增）。
- 无进展计数：归零（18→19 有进展）。**下波=F-GEOM-01-G4（目录化 M1 state/ 10 件
  [locked-change][test-refactor] 大中票一火一票；开工前补票面=check-quality.mjs:96
  tab-dirty 键+:98 CorpusExtractor 消费者目标串两行随步改写（门二 P1-3 登记，漏改
  =M1 verify quality 红）+registry 全域随迁义务首用——batch 12 板注）。**

### batch 14 增补三 — 2026-09-18（调度员换防：停火后用户显式 /batch-relay 重布防）
- 旧火处置：CronDelete(automation-e8255b42-…) 回执 not found（batch 10 换防时已亡，
  本次用户指令点名复核）+CronList 空集复核，无孤儿火。
- 重新布防：CronCreate */10（interval=10 minute，recurring），prompt=技能火模板原文；
  新 automation_id=automation-c21dd023-3a61-42de-80b0-754bc3f2e872 已 tmp+rename 原子
  回填本板；同步增补 last_dispatch 字段+protocol 调度员句补静默窗条件（技能火班节律，
  用户裁决 2026-09-18——发布后 30min 静默、有效班=30/40/50/60…）。
- status 维持 READY（batch 14 收口态），claim/勾选数（18/35）未动。本会话接任调度员
  宿主（火只投给本会话）：此后每回合仅「开批通道」UI 开批不自跑批，保持存活。
  下批指引不变=F-GEOM-01-G3（band 三档绑定+跨族交互点登记 INV-68 落册，纯登记面）。

### batch 14 — 2026-09-18（执行者会话：第四波 F-GEOM-01-G2 保存链单源门+死面收敛，完成——**末批，接力停**）
- claim: claim-1789708660-b14｜开始 05:17:40Z｜中途用户暂停（05:56Z~06:4xZ，见增补二）
  ｜收口 07:32:00Z｜勾选 17→18。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/
  门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；TDD=实现者六段简报内嵌红→绿→
  变异红证；systematic-debugging 不加载（修法=设计书 §2.4 定稿+主控派发前全边侦察
  前置，无排障定位面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor
  绑定（GLM5.3flash $max）；门一=ops-gate1-k1 绑定（kimi-main k3 $max——正常承载）；
  门二=ops-adjudicator 绑定（deepseek-flash $max）——门审均异构于实现者。
- **交付（战役唯一行为变更票）**：①保存门=evaluateCore item 链失败（三因）else 臂
  改「paint 照渲 DOM 回退形状（视觉连续）+setPending(null)（无工具条=无保存入口）
  +warn 单源（itemChainFor 零新增）」+尾段 pending 构造三元删除（恒项族形状——
  「所见≠所存时不给保存入口」，设计书 §2.4/§2.2 序列⑤接缝闭合）；②probeTextLength
  单源化（anchor-serialize 显式导出+selection-evaluate 复刻删除）；③rectsFromRange
  死导出面删除（src+头注 2 处+测试 1 例，全仓零残留）；INV-58 修订（保存链条款+
  stale 自述闭合记录）+selection-evaluate 头注重写五处（§2.6 交互点 5 消除）。
  10 文件 +112/-88（selection-evaluate +20/-33、anchor-serialize +3/-2、
  annotation-anchor +1/-26、invariants +1/-1、exemptions +14/-1、selection-layer
  .test +35/-0、item-chain +2/-2、paint.test +28/-0、anchor.test +1/-16、manifest
  +7/-7）。
- **受锁面先行对账义务兑现**：对账表（g2-assertion-reconciliation.md）主控侦察后
  **实勘扩三文件**——票面点名 selection-layer 14 例之外补入：selection-paint 17 例
  （6 例零桩+工具条/保存流依赖=同因补桩断言零改）、item-chain 回退①（改写=本票
  TDD 红锚）、annotation-anchor rectsFromRange（删例）。四文件合计 16 用例改写/补桩
  +1 删例，其余 22+11 例零改。豁免恰 2 条（≤10 无呈裁）；指纹门 C 面：layer/paint
  纯桩增零变+回退①新题 NEW 项+旧题豁免。
- **TDD 证据链**：首红 RED_EXIT=1（回退①工具条 null 断言钉住接缝）→T3 删除序证红
  （先删 src 导出→import 悬空红=证唯一消费面）→全量绿 170 文件/1744 用例（=1745−1）
  +锚定回归网 9 文件/98 用例→变异红证 M1（保存门回退挂 DOM pending→回退①红+还原
  diff 空+复绿）+M2（删 probeTextLength export→typecheck TS2459 红+还原）。
- **门审**：门一 k1 **PASS_WITH_WARNINGS B0/W1/N7**——越表断言零命中（全在表
  A/B/C/D）；W1=mkItem/mkText/seedRegistry 第 4 份触发 RoT→主控裁决**后置 G7 目录化
  迁移票随迁抽取**（本票中途扩面将作废刚过审对账表边界；G7 票面「selection 系测试
  import 随迁」为承接锚——**RoT 债登记**）；N3/N4 对账表补记+措辞对齐已处置。
  门二 **GO_WITH_CONDITIONS P0=0/P1=3/P2=3/N=3**——四组数字独立复算全对上（±行数/
  豁免逐字+C 面标题全集/锁面 338+6 受锁件在册/EXIT 标记物理在档）；P1-1 指纹门
  口径更正（**基线 JSON stats=183/1757/5334** vs 开工 cur 187/1790/5417 vs 终态 cur
  187/1789/5411——「基线 187/1790/5417」系设计书 §5.1 时点数，已落对账表勘误）；
  P1-2/P1-3 收口清单本段+提交兑现。
- **机检终态**：主控 verify 终跑 G2_VERIFY_FINAL_EXIT=0（g2-verify-final2.log：quality
  绿+指纹门绿（exemptions 2/2/0）+tickets 206 票 open 19→18=恰 G2 翻 done+locks 338
  一致+lint/typecheck+test 170/1744+build 绿）；实现者侧 verify EXIT=0 双档（
  g2-verify-final.log）；e2e 默认门 43 passed E2E_EXIT=0（无 corpus-export 超时，flake
  口径未触发；45 全跑义务归 G11）；locks 链 unlock→改→generate→apply 一轮（manifest
  +7/-7=generatedAt+6 受锁件 sha，与提交同步）；**health-scan RED×0 WARN×0**；账本
  39→42 行（executor+门一+门二，绑定岗主控补记 node JSON.stringify——临时 .cjs 用毕
  即删）。
- 证据件入库（scripts/audits/，15 件）：g2-{assertion-reconciliation.md；impl-brief.md；
  impl-report.md；gate1-brief.md；gate1-report.md；gate1-diff.patch；gate2-brief.md；
  gate2-report.md}（7 .md+1 .patch）+七 .log（red-fallback1/green-full/mutation1-
  savegate/mutation2-probe/verify-final/e2e-appgate 六实现者件+主控终跑 verify-final2
  ——git add -f 入库，.gitignore *.log 拦截按 batch 8 教训③处置）。
- 教训：无新增等级（实现者自裁①「直跑 npx 未切 node ABI→184 例假红」=既有 ABI 守卫
  面的执行侧变体，log 重建+偏差说明行处置合规——门一 N1/门二 P2-3 复核认可）。
- Rulings 待用户：无新增（票内自裁 6 项——对账表扩三文件实勘/textLayer 盒桩夹具
  必要件/RoT 后置 G7/ABI 首跑口径/TS2459 同语义/.log add -f——均经门一对抗拷问+
  门二复核闭合）。
- 无进展计数：归零（17→18 有进展）。**本批=末批（用户停火令，见增补）：接力停——
  板停于 READY 无火，恢复两径=用户显式 /batch-relay 重布防或手动会话按板领批；
  余量 17 项（第四波 G3~G11+第五/六波），下票若续=F-GEOM-01-G3（band 三档绑定
  INV-68 落册，纯登记面）。**

### batch 14 增补 — 2026-09-18（调度员停火：用户裁决避开下午高峰）
- 用户裁决两段：①完成当前批（b14=F-GEOM-01-G2）即停，后续不再开批；
  ②**即刻删火**——批 14 在跑期间的火班只会一行退出，无存在意义。
- 常驻火 automation-cbab13a4-2cf7-4b7f-a88b-59dda6687cae 已于 05:20Z
  删除（CronDelete 回执 deleted:true + CronList 空集复核）；头部 automation_id
  行保留旧值仅为历史审计指向。
- **本板批 14 收口后将停于 READY 且无火接续——此为预期态非异常**。恢复两径
  同规：用户显式 `/batch-relay` 重布防（新 automation_id 回填本板），或手动
  会话按本板清单领批。调度员会话自本增补起不再开批、不再补派（含执行者中途
  死亡亦不接管——停火令优先）。

### batch 14 增补二 — 2026-09-18（执行者会话：用户指令暂停+板面完整性修复）
- **用户指令**（对本会话）：「先暂停，后续听我指令，再继续开工」——batch 14
  暂停于**实现面交付后、门审前**；恢复=用户对本执行者会话下指令，从门一续起。
- 暂停时态：ops-executor 已交付 G2 实现面（10 文件 +112/-88 **工作树未提交**：
  src 三件+四受锁测试+invariants+exemptions；报告=scripts/audits/g2-impl-report.md
  含超票面自裁 3 条待门审拷问；对账表 g2-assertion-reconciliation.md+六段简报
  g2-impl-brief.md 在档；raw 六件 g2-*.log 在 scripts/audits/）。**门一/门二/
  收口（verify 亲验+locks 复核+registry 翻 done+提交+health-scan+账本）未启动**。
- **板面修复**（本增补同窗提交）：增补（调度员停火）提交 5ccc9e40e8 将 13 条
  历史批次 claim 行全局误替换为本批 claim（批次日志「追加勿改写」破坏）——已自
  efcedd14fd 按「### batch 头→旧 claim 行」映射逐条复原（修复脚本用毕即删，
  13/13 零缺失；板头第 16 行=唯一合法现值保持）。
- claim 归属与心跳：claim-1789708660-b14 仍归本会话；心跳陈旧系用户暂停非僵死
  （调度员停火后本板无自动接管方，恢复入口=用户指令）。

### batch 13 — 2026-09-18（执行者会话：第四波 F-GEOM-01-G1 M0 类型下沉切环，完成）
- claim: claim-1789705913-b13｜开始 04:31:53Z｜收口 05:20:00Z｜勾选 16→17。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/
  门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；实现面=ops-executor 绑定子代理
  （零行为变更重构票——TDD 面以票面指定变异红证机制兑现，主证+副证双闭环）；
  systematic-debugging 不加载（票面修法=设计书 §3.3 定稿切分+主控派发前全边侦察
  前置，无排障定位面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor
  绑定（GLM5.3flash $max）；门一=ops-gate1-k1 绑定（kimi-main k3 $max——本次
  正常，batch 7/12 两次 auth 失败未再现）；门二=ops-adjudicator 绑定
  （deepseek-flash $max）——门审均异构于实现者。
- **交付**：geometry-types.ts 真身（103 行零 import 置底：PdfTextItem/PdfTextStyle/
  PdfTextContent/PdfPageGeometry 四类型+PixelBox+RowBand+COLUMN_GAP 两常量逐字
  含注释迁入）+三处 export type 再导出（PdfPageCanvas 四类型/annotation-anchor
  PixelBox/annotation-resolve RowBand——受锁测试旧路径零触=M0 零受锁面机制）+
  三环切断（pig→anchor/resolve/Canvas 三向 type import 全改向+anchor 的
  COLUMN_GAP 值 import 改向=anchors 域内无环）+两 store→Canvas type 边消除
  （page-items.store/reader-search.store）。7 文件 +140/-110（geometry-types
  +83/Canvas −41/anchor −1/resolve −7/pig −5/page-items +1/search-store 0）。
- **变异红证**：主证删 Canvas 再导出→typecheck EXIT=2（TS2305×5+TS2459×27=32
  错误行=消费面精确枚举：src 6 件+tests 10 件）→还原 diff 空→复绿；副证删
  PixelBox 再导出→TS2724×3（含受锁锚 anchor-item-verify.test:30）→还原→复绿；
  cp 备份法全程（禁 git checkout 宪法条遵守）。
- **门审**：门一 k1 **PASS_WITH_WARNINGS B0/W1/N3**——W1 实现者报告计数与 raw
  矛盾（grep 误计探针节头/标记行：33→32、4→3）→主控勘误处置销（报告勘误段+
  门二 N1 句尾补正）；N1 首跑红无 raw（环境前置文字申报采信）/N2 RowBand 无专项
  变异（票面 DoD 合规，typecheck 锚定兜底）/N3 .log 入库提醒。门二 **GO
  P0=0/P1=0/N=6**——四组关键数字独立复算全成立（±行数逐 hunk/32=5+27/3/
  170/1745）+locks manifest 338 反证零锁面+收口五面预批；N3 口径修正=e2e 不跑
  依设计书 §3.4 M0 行（零运行时值变：常量 1.5/0.02 同值亲核+type-only 编译期
  擦除——勿引 batch 12 空骨架类比），父级 e2e 验收义务归 G11；N5 收口清单全兑现。
- **机检终态**：verify 全链终跑 G1_VERIFY_FINAL_EXIT=0（206 票 open 20→19=恰 G1
  翻 done+locks 338 零变更+test 170 文件/1745 用例零漂移+test-surface 门过+
  build 绿）；实现者侧 typecheck/unit/lint 三绿在档；**零受锁面**（7 源文件+
  证据件+registry+relay 均不在 manifest 338 项，门二独立反证——22 条 src 受锁
  全在 migrations/shared）；**health-scan RED×0 WARN×0**（账本补记后复跑）；
  账本 36→39 行（executor+门一+门二，绑定岗主控补记 node 脚本 JSON.stringify
  ——临时 .cjs 件用毕即删零驻留，避开 scripts/*.mjs 受锁自动面）。
- 证据件入库（scripts/audits/，13 件）：g1-{impl-brief.md；impl-report.md；
  gate1-brief.md；gate1-report.md；gate1-diff.patch；gate2-brief.md；
  gate2-report.md；verify-final.raw.txt}+五 .log（typecheck/unit/lint/
  mutation-reexport/mutation-pixelbox——git add -f 入库，.gitignore *.log 拦截
  按 batch 8 教训③处置）。
- 教训：无新增等级（门一 W1=既有「探针输出引用」族查询侧变体：grep 计数须把
  探针自身节头/标记行与错误行分口径数——已在账本行注记，未污染代码面）。
- Rulings 待用户：无新增（票内自裁 4 项——sqlite-abi 前置定性/变异码形家族/
  头注注释缺陷自愈/.log 入库裁量，均经门一 G 项+门二逐项复核认可）。
- 无进展计数：归零（16→17 有进展）。**下波=F-GEOM-01-G2（保存链单源门——战役
  唯一行为变更票 [locked-change][test-refactor] 大中票一火一票；§2.4 受锁面
  先行对账义务=立案时先出 selection-layer.test 14 用例断言对账表再动手）。**

### batch 12 — 2026-09-18（执行者会话：第四波 F-GEOM-01 实现票立案批 G1~G11，完成）
- claim: claim-1789702503-b12｜开始 03:35:03Z｜收口 04:27:08Z｜勾选 16/24→
  16/35（+11 子项上板零勾选=立案批计划内零勾选步——batch 1 立案批可勾
  T0~T2 因板面即任务行，本批板面无对应勾选行属结构差异；no_progress
  按协议字面 0→1 留痕，下批 G1 起恢复）。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织
  主干/轻量双审档位/ORG-12 审包/health-scan/账本 v3 补记）；writing-plans
  不加载（票面要件=设计书 §5.3 定稿切分，非新计划立项）；TDD/
  systematic-debugging 不加载（纯 registry/骨架立案面，零业务实现零排障
  ——验证=check-tickets+verify 机检门）。派发档位：主控=GLM5.3 max
  （本会话）；门一=ops-gate1-k1 **连续两次 Provider authentication
  failed→换源状态机切 ops-gate1-k2 备源承载**（kimi k3 max，zipoo——
  log-triage --health 窗口推荐 k1=派发器链对绑定通道失效无信号的结构性
  盲区，账本行如实记）；门二=ops-adjudicator 绑定（deepseek-flash max）
  ——轻量双审（文档/制度批档位），均异构于主控执行面。
- **交付**：tickets/registry.ts 195→206 票（+11=F-GEOM-01-G1~G11 全
  strong open，open 9→20）+母票立案注记（母票随 G11 翻 done）+块注释
  （含**全域随迁义务**——目录化迁移步落盘时 registry 全体 file 指向被迁
  路径的票（含 done 票与 G 票自身）一并随迁改写，波及 40+ 票次（门一 W1
  处置，门二独立实测波及面 55 条 reader 路径票=外部 45+本批 10））；两
  骨架=src/renderer/features/reader/geometry-types.ts（G1 票面载体）+
  docs/reports/2026-09-18_f-geom01-campaign-closeout.md（G11 记账载体）。
  票面要件=设计书 §5.3 切分表+§2.4/§2.5/§2.6/§3.2/§3.3/§3.4/§3.5/§5.1/
  §5.2 条件逐项内嵌（M6b 括注「ReaderPage 等」按 §3.2 总表 27=14+13
  补全=PageColumnView——门二独立复算吻合）。
- **门审**：门一（k2 承载）**PASS_WITH_WARNINGS B0/W2/N3**——W1 全域
  随迁义务缺口（处置=块注释补段）／W2 锚定回归网计数口径（处置=主控
  tests ls 实测=**18 物理件**（§5.1 名单 17 项之 selection-layer×2=
  selection-layer.test+selection-layer-fa12.test 双文件），G6 票面改
  实测口径）／N1 落板时态（收口兑现）／N2 G1 红证前提（处置=
  tsconfig.web.json include 含 tests/**/*.tsx 亲核，票面前提明示）／
  N3 设计书两表层瑕疵（M6b 括号未闭合+§2.4/§5.3 新 INV 归属张力——记录
  不改动，registry 按 §5.3 正确）。门二 **GO_WITH_CONDITIONS
  P0=0/P1=3/P2=2/N=6**——P1-1 落板保真（本收口兑现：11 子项顶层行+
  id 与 registry 一一对应人工核对过+counts 24→35/no_progress 0→1）；
  P1-2 单提交范围（显式列文件兑现）；P1-3 **M1 check-quality 白名单
  条目归属缺口（门二独立命中，门一未见）**：check-quality.mjs:96
  tab-dirty 键+:98 CorpusExtractor 消费者目标串两行全批票面零归属、
  漏随步改写=M1 verify quality 红——按最轻闭合本日志登记+板 G4 子项行
  预注+G4 开工前票面补记；P2-1 门一报告行号基准=处置前 registry（终态
  292-302）；P2-2 INV 册历史 reader 路径引用随迁口径 G11 收官时定（板
  G11 子项行已注）。门二独立复算全一致（206=195+11/open 20/G6 18 件/
  M6b 27=14+13/骨架零占位零乱码/verify 数字/锁集合反证）。
- **机检**：verify 全链双跑 EXIT=0（首跑+处置后终树跑，标记
  GEOM01_FILING_VERIFY(_FINAL)_EXIT=0 物理在两 raw 末行；206 票 open 20
  +locks 338 零变更+test 170 文件/1745 用例与 batch 11 基线零漂移+
  test-surface 门过（既有纯增滞后态零新增）+build 绿）；check-tickets
  单跑 EXIT=0；**零受锁面**——本批触及三路径（tickets/registry.ts/
  src/renderer/**/docs/reports/**）均不在受锁集合（get-protected-files
  逐类核对），零 [locked-change] 义务零 locks 操作（batch 8 教训②反向
  面：无锁面不跑锁命令）；e2e 未跑（零 src 行为变更——geometry-types.ts
  空体全仓零 import，门二独立 grep 证实，batch 1 立案批同口径）；
  **health-scan RED×0 WARN×0 可收口**；账本 34→36 行（门一 k2+门二，
  绑定岗主控补记 v3 行 node JSON.stringify——heredoc 禁令遵守）。
- 证据件入库（scripts/audits/，7 件）：geom01-impl-{gate1-brief.md;
  gate1-report.md（岗无写通道主控逐字归档）;registry.patch（处置后终态
  35 行）;verify.raw.txt;verify-final.raw.txt;gate2-brief.md;
  gate2-report.md（同型逐字归档）}。
- 教训：无新增（k1 绑定通道 auth 失败第二现——batch 7 换源先例直接适用；
  log-triage --health 对绑定通道失效无信号的结构性盲区已入账本行注记，
  换源决策以真实派发回执为准的惯例确立）。
- Rulings 待用户：无新增（票内自裁 5 项——锚选择/板面子项形态/零锁面/
  e2e 不跑/no_progress+1——均经门一拷问+门二复核闭合）。
- 无进展计数：+1（16→16 零勾选=立案批结构差异如上申报；连续 3 才 HOLD）。
  **下波=F-GEOM-01-G1（M0 类型下沉切环，大中票一火一票）——G4 开工前
  票面补 P1-3 两行已板注。**

### batch 11 — 2026-09-18（执行者会话：第四波 F-GEOM-01 设计链三跳，完成）
- claim: claim-1789698911-b11｜开始 02:35:11Z｜收口 03:15:54Z｜勾选 15→16。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/设计链
  三跳派发/ORG-12 审包纪律/账本 v3/health-scan）；writing-plans 不加载（设计书
  要件=票面+《裁决书》指定，非新计划立项；实施票 G1~G11 立案属后续批）；
  systematic-debugging 不用（设计面无排障——e2e 红处置=取证+复跑非定位）；
  TDD 不加载（纯设计文书票零代码面，验证=三跳对抗+机检门）。派发档位：主控=
  GLM5.3 max（本会话=终裁位）；hop1=ds-call-v2 --role drafter（kimi-main
  kimi-k3 max，tier=prime）；hop2=ds-call-v2 --role auditor-readonly
  （deepseek deepseek-v4-flash，tier=debt-readonly，payg 费用面留痕）；
  hop3=主控终裁——两跳异构+主控裁，符合宪法设计链分工。
- **交付（提交 af946a5324）**：设计书定稿 415 行——终裁总纲=F-A8 后主链已同族，
  本战役真收敛面=闭合最后三接缝：①保存链可落 DOM 族 rects 入库（唯一行为变更
  =「保存门」：item 链失败=只显示不保存，§2.4）；②band 三推导档位绑定表（§2.5
  登记）；③类型级三环+几何簇平铺（M0 类型下沉 geometry-types+八步迁移序）。
  S4/S6/S0 三回退因全部维持现状定界——拟稿「族管线包装/S0 挂起守卫/
  viewportVersion 帧守卫」三机制经审核+终裁驳回（空增量/前提缺失/M5 自反性）。
  69 文件权威映射（state10+anchors13+time4+interact7+panels8+view27，ls 逐项
  对账）；净删目标诚实化 −50~−60 行逐项清单+收益主证改跨族交互点计数（5 点→
  4 点全显式+1 闭合）；前史两条款承袭（五例票池全维持+契约面零通道）；INV
  清单（新增档位绑定+修订 INV-58 保存链条款+INV-47 不修订）。
- **三跳实录**：hop1 拟定 256 行草案+6 待澄清（in7035/out24741/latency554s）→
  终裁位亲核 6 项全闭（Q2 两 store 边 type-only 确证/Q3 page-items=单文件=
  主控证据脚本正则伪影/Q5 warn=console.warn 零通道/Q6 store 无就绪信号/
  Q1 计数自洽）→hop2 对抗审核**返工 B5/W7/N4**（in16315/out18244/latency80s
  ——五 B 含终裁位预置关注点 A1/A3 独立命中）→hop3 终裁逐条处置（设计书 §7
  处置表 16 行全闭环；终裁另发现拟稿漏列 CorpusExtractor+幽灵行 reader——
  证据脚本正则伪影两处一并修正）。
- **e2e 红处置实录**：定稿日默认门全套跑 corpus-export 60s 超时红（42 绿，
  套跑 3.0m 慢于常态 ~2m）→定向复跑 2/2 绿 6.4s（geom01-e2e-corpus-rerun.
  raw.txt）→负载敏感型非确定红；flake 台账 corpus-export 线 count 3→4
  （独立超时新指纹，历史「与剪贴板同时现」）+立案标记归后续批（建议与
  F-EXPORT-01 拆件票同场——立案线 2 次早已越过，属工程排程序非用户级）；
  设计书 §5.1 基线注记同步诚实化。
- **机检**：verify 全链 EXIT=0（干树基线=195 票 open 9+locks 338+test 170 文件
  1745 用例+build，Node 24.20.0）；check-quality 终树 EXIT=0（新增 docs 面
  占位/乱码零自查+机检双过）；**health-scan RED×0 WARN×0**；无受锁面变更
  （audits .md/.raw/docs/design/flake-ledger 均不在 338 项内——提交前逐项
  核，[locked-change] 义务零）；账本 32→34 行（两跳 ds-call-v2 自动落账；
  手补重复行去重并归自动行+findings 补记）。
- 教训三条：①**管道退出码陷阱自擒**（`npm run test:e2e | tail; echo $?` 取的是
  tail 的 0——真实 1 failed 差点漏判；探针命令自身也要守「真退出码物理落档」
  ——batch 6 教训①同坑变体）；②**多行 node -e 隔层静默失败第七变体**（flake
  台账更新多行脚本经 node -e 无输出无报错=引号被隔层吃掉，回读 count 仍 3 才
  发现——「探针一律 Write 文件后 node 跑」对本会话同样适用）；③**hop1 简报
  漏 FINDINGS 尾栏要求**（ds-call-v2 自动行从产物尾栏解析 findings，无尾栏=
  行缺字段→health-scan RED 拦截；行内补记 DRAFT_DELIVERED+根因注记——后续
  设计链派发简报须含「产物末栏 FINDINGS: B=/W=/N=/VERDICT=」条款）。
- Rulings 待用户：无新增（设计书 G1~G11 实施票立案=常规排程序；e2e corpus-
  export 立案票建议归 F-EXPORT-01 场次=工程排程序）。
- 无进展计数：归零（15→16 有进展）。**第四波剩一项：F-GEOM-01 实现——下波=
  按设计书 §5.3 切执行票立案批（G1~G11 骨架件+registry+locks 立案序），随后
  在本板 F-GEOM-01 实现行下追加子项逐票勾选。**

### batch 10 增补 — 2026-09-18（调度员换防：旧布防会话终结，重新布防）
- 旧火处置：CronDelete(automation-e8255b42-…) 回执 not found（工作区内已不存在
  ——先序会话或客户端侧已删，无孤儿火）；CronList 复核空集后布防，未留双火。
- 重新布防：CronCreate `*/10`（interval=10 minute，recurring），prompt=技能火
  模板原文；新 automation_id=automation-cbab13a4-2cf7-4b7f-a88b-59dda6687cae
  已 tmp+rename 原子回填本板，poll_interval_min 5→10 同步改准；status 维持
  READY（batch 10 收口态），claim/勾选数（15/24）未动。
- 本会话接任调度员宿主（火只投给本会话）：此后每回合仅「开批通道」UI 开批
  不自跑批，保持存活。下批指引不变=F-GEOM-01 设计链三跳（单火专注）。

### batch 10 — 2026-09-18（执行者会话：第四波 F-DEDUP-01 服务层去重微扩，完成）
- claim: claim-1789693931-b10｜开始 01:12:11Z｜收口 02:32:00Z｜勾选 14→15。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋
  派发/门审矩阵/health-scan/账本补记）；实现面=ops-executor 绑定子代理（TDD
  红→绿→变异红证，两轮=实现+回炉 1）；systematic-debugging 不加载（票面修法
  与收敛方案=主控预裁，无排障定位面）。派发档位：主控=GLM5.3 max（本会话）；
  实现者=ops-executor 绑定（GLM5.3flash max）；门一=ops-gate1-k1 绑定
  （kimi-main k3 max）；门二=ops-adjudicator 绑定（deepseek-flash max）——
  门审均异构于实现者。
- **交付（提交 2e3ff5327a）**：四收敛面全落+排除面恰好——①DomainError 基类
  services/shared/domain-error.ts 单源（new.target.name 子类零样板；15 文件一行
  继承=services 11+ipc 3+http 1；HttpFetchError 三参+status 特例；library
  re-export 保 API；NotImplementedError 冻结契约/ApiClientError 异进程排除）；
  ②原子写 atomicWriteFile 三开关收敛 4 文件 6 调用点（manifest 固定名态空间
  契约+ai-notes-import 移动语义保持内联）；③sanitizePathToken 收敛 2 处
  （safeFileName 展示名家族+db LIKE SQL 家族排除）；④app-file URL 单源
  src/shared/app-file-url.ts 三处收编（corpus.export:250 硬编码消灭=微扩主
  目标）。28 文件 +436/-220（修改面 20 文件 +112/-220 净删 108，numstat 实测）。
  INV-66（内容写盘原子性单源，边界限定+排除面）+INV-67（AI 笔记回灌事务性
  =batch 7 门二 P2-5 登记债销项；lineage 清面窗口随 F-SENSOR-01 场评估）入册。
- **TDD 证据链**：首红全量 EXIT=1（恰 4 新件解析红，基线 166/1719 零偏差）→
  全量绿 170 文件/1745 用例→build EXIT=0；变异红证 4 条（每模块 1，M3/M4 真
  退出码=1，M1/M2 捕获瑕疵如实呈报以 vitest 摘要行为证）；还原 diff 空 ×4+
  定向复跑 26/26 RESTORE_RERUN_EXIT=0；指纹门纯增 183→187/1757→1790/5334→
  5417 豁免零（+33 归因=本票 26+batch 7 前票未基线化 7——门二 P2-1 更正口径）。
- **门审**：门一 ops-gate1-k1 **PASS_WITH_WARNINGS B0W3N8**（代码面零缺陷；
  三 W 报告层=计数失实/复绿无证/清单漏项）→回炉 1（SendMessage 续命原实现者，
  仅报告+证据面）三 W 全闭（numstat 逐行重算/定向复跑补真证/注释清单 18/20
  补全）；门二 ops-adjudicator **GO_WITH_CONDITIONS P0=0P1=1P2=5**——P1-1=
  收口执行序（简报箭头序会留 invariants 滞后 manifest 提交树；正确序=unlock→
  编辑前置→generate+apply→verify 终跑→单提交，**已按裁决行序兑现**）；P2 五
  条全处置（P2-1 指纹归因更正/P2-2 账本 units=2+禁写已实测/P2-3 六调用点
  措辞/P2-4 锁数对账——batch 9 旧值 334 系 manifest 删除前快照，本批 333→338
  实测入档/P2-5 INV 措辞条件全采纳）。N2 压缩敏感性=主控产物实证闭环
  （out/main/index.js 类名逐字存活+new.target.name 在）。
- **机检终态**：verify 全链终跑 VERIFY_FINAL_EXIT=0（195 票 open 10→9+locks
  338+test 170/1745+build——冻结终态上跑）；e2e 默认门 43/43 E2E_APP_EXIT=0
  （corpus-export/workspaces 双被触面）；locks 链 unlock→generate→apply
  333→338 与提交同步（5 新件：src/shared/app-file-url.ts+四新测试）；
  **health-scan RED×0 WARN×0**；账本 28→32 行（executor 两轮+门一+门二，
  绑定岗主控补记 v3 行——首写 heredoc 隔层 \\ 塌缩致 4 行非法 JSON 转义被
  health-scan 拦截，node JSON.stringify 重写修复，修复器即删零驻留）。
- 证据件入库（scripts/audits/，15 件）：dedup01-impl-{brief.md;report.md;
  firstraw;green;verify;build;mutations;locks}.raw.txt 六件+dedup01-{gate1-
  brief.md;gate1-diff.patch;gate1-report.md;gate2-brief.md;gate2-report.md;
  e2e-appgate.raw.txt;verify-final.raw.txt}（门一报告=岗无写通道主控逐字归档；
  门二同型）。
- 教训两条：①**heredoc 隔层反斜杠塌缩**（账本补记 4 行 `\\` 被吞成 `\` →
  非法 JSON 转义——宪法 shell 四坑第六变体：不止中文/正则/参数丢弃，**转义
  字符本身也会被隔层吃掉**；补记类结构化写入一律 node 脚本 JSON.stringify，
  禁 shell heredoc）；②**报告级数字的可信度分层**（门一 W1/门二 P2-1 两轮
  拦截同一实现者：粗读印象数字进报告=回炉主源——权威口径=git diff --numstat
  逐行+失败跑数字禁引的既有纪律延伸到「凡 ±对子必逐行复算」）。
- Rulings 待用户：无新增（票内自裁 6 项经门一对抗拷问+门二复核闭合；INV-67
  措辞按门二 P2-5 条件落册）。
- 无进展计数：归零（14→15 有进展）。**第四波剩两项：F-GEOM-01 设计链三跳
  （Kimi 拟定→deepseek 审→GLM 终裁，裁决 1 序=设计先于实现）随后 F-GEOM-01
  实现——设计链票单火专注，下波=F-GEOM-01 设计链。**

### batch 9 增补 — 2026-09-18（用户在场裁决三项 Rulings，执行者会话兑现）
- **用户裁决（原文口径）**：R1=a（维持裁决 1：F-GEOM-01 收口后两票分离实施
  A→B）；R2=a（**批准 ds-call v1→v2 切换**，附带欠账三条确认：技能侧 R4
  cfg 口径修复/技能侧绑定子代理账本写入器接线/F-PROC-01 ⑤ 补记规则在途）；
  R3=**追认**（batch 9 门一审 v2 实弹链有效，F-ALIGN-01 收口维持）。
- **切换收口即时兑现**（批准后动作清单=align 报告 §7）：locks:unlock→
  删 scripts/audits/ds-call.mjs→locks:generate+apply（manifest 334→333）+
  AGENTS ORG-SEG 切换状态行改「已切换」+methodology §4 档位表门一行
  「ds-call.mjs 扩展链」改「ds-call-v2 链」+[locked-change] 提交；
  model-routing-log 迁移核对=batch 9 门二复算记录④已闭环（v2 流水含
  R1 六笔+门一三轮，账本 28 行三方对账）——v1 历史流水件保留为审计档。
- R1=a 落法：板面「Electron 实施窗」注记维持（F-ELE-01 呈裁获准且
  F-GEOM-01 收口后新波次入板）；实施前按裁决书 §6.6 强制复核矩阵时效。
- 教训一条：manifest 结构=数组（path 字段项），查锁须逐项比 path——
  `Object.keys(files).includes(路径)` 对数组恒 false=假阴性（本会话实测
  翻车一次，幸该结论当时已经门二逐项复核无污染；计数纪律的查询方法变体）。

### batch 9 — 2026-09-18（执行者会话：第三波 F-ALIGN-01 组织定版对齐，第三波清空，完成）
- claim: claim-1789693931-b10
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/
  regression R1~R10/账本核查/health-scan/预算机检）；systematic-debugging 不
  加载（制度+配置文书票，无缺陷排查面——R4 两子域为口径分析非排障）；
  ops-executor 不派（纯文书+机检面，主控直做）。派发档位：主控=GLM5.3 max
  （本会话）；门一=**外部派发器 ds-call-v2 实弹**（kimi-main k3，--role
  gate1-reviewer——runbook 择路权行使，理由=切换前实弹验证+R4 落账，报告
  §4 申报+追认项呈裁）；门二=ops-adjudicator 绑定（deepseek-flash max）。
- **交付（票面四子任务全毕）**：①R1~R6 回归真跑（销 doc-align 阶段 3 悬空
  承诺）——零成本面 7 项 PASS+R1 真实派发 PASS（3 样例双源方向 3/3）+R4
  首跑 FAIL 两子域（cfg 哈希=R1 --project tmp 隔离设计与项目覆盖件口径
  互斥；账本校验域真空=断流实锤）→门一实弹落账后终态复跑 PASS（cfg 双侧
  545b6843a147+账本 26 行态 ok:1）——**R1~R10 终态全绿**；R3/R6 缺位之谜
  破案=git 查证链（R3 并入 R1'3 合并项/R6=流程门禁两翼非测试项，票面
  R1~R6 全义达成）；②ORG-SEG v1→v2 重写（钉版 v2.0.1@2e292bb+裁决 13
  主通道条文+切换状态行+预算机检句，**599/600 PASS**——两次超限 637/602
  实弹被拦后裁剪）+宪法三屋段门一通道句改（裁决 13 双落点齐）；③词汇
  映射表 6→12 数据行（实现者子代理/drafter/auditor-readonly/
  sre-diagnostic/design-reviewer/项目账本）；④账本断流核查（末笔
  09-09T02:21:05Z 断流 9 天/根因=绑定子代理不经派发器链而写入器只挂
  派发器链（结构性）/Synapse 面 outcome 零乱码/落法三条=门一实弹首笔
  v3+F-PROC-01 ⑤ 补记规则+技能侧写入器欠账）——核查报告+切换呈批一体件
  docs/reports/2026-09-18_align01-org-audit.md。
- **门审**：门一三轮（实弹 v2 链）——首轮 FAIL B3W2N3（复跑转绿无证据/
  R3R6 无声缺位/时态矛盾）→处置（R4 实测回填+R3/R6 git 查证+时态修正）
  →二轮 FAIL B1W3N4（R2/R5/R7~R10 无随包证据/§3 与 patch 原文未随包/
  通道张力）→处置（zero.log+patch 68 行真全文+六项清单 diff 实证+§7
  通道张力说明段）→**三审 PASS_WITH_WARNINGS B0W2N4**（W1 钉版号与文件
  轨迹号矛盾→祖先关系实证+报告澄清句；W2 防护声明超证据→口径改「会话
  内实弹验证/未接项目 CI」）——全处置；门二 GO_WITH_CONDITIONS P0=0
  P1=1 P2=6——P1-1=报告「间隔 5 提交全为 docs 面」被 reflog 证伪（实为
  间隔 13 提交/5 个非 docs）已修正+成因注明；P2 六项全处置（行数快照
  时点/引文校准/自证口径/预算余量注意/R2 格式注/latency 口径知悉）。
- **Rulings 待用户（+2，与 batch 8 ELE 实施时机并档）**：①ds-call v1→v2
  切换批准（报告 §7 选项 a 推荐/b 暂缓/c 双轨+批准后动作清单+附带欠账
  三条：技能侧 R4 cfg 口径互斥修复/绑定子代理账本写入器接线/F-PROC-01 ⑤
  不受影响）；②v2 未批先用追认（本批门一三轮实弹走 v2——超自裁面如实
  呈裁，不追认则门一审作废重走 v1）。
- **机检终态**：verify 全链 EXIT=0（tickets 一致——registry 翻 done 后
  态+locks 334+build）；**health-scan RED×0 WARN×0——batch 2~8 连年回显
  的「cfg 漂移历史欠账」WARN 被本批门一实弹落账清零**（流水尾行 live
  hash）；账本 28 行（三轮门一派发逐轮落 v3，findings 与审报尾栏逐字
  咬合——门二亲数）；预算机检 599/600；locks 面零变更（AGENTS.md/relay/
  报告/证据件均不在 334 项内，无 [locked-change]/[dep-change] 义务）。
- 证据件入库（scripts/audits/，16 件+docs/reports/1 件）：align01-
  {regression-zero.log；regression-r1.log；regression-r4-recheck.log；
  regression-r4-final.log；verify.log（五件 .log 经 -f 过 *.log ignore）；
  agents-diff.patch；gate1-brief.md/report.md；gate1-brief2.md/report2.md；
  gate1-brief3.md/report3.md；gate2-brief.md/gate2-report.md}（dispatch×3
  log 不入库——routing 头在三轮 report 首行已档）。
- 教训三条：①**git log | head -N 截断以偏概全**（P1-1：报告「间隔 5 提交
  全为 docs」实为 13 提交 5 个非 docs——head -5 只见前 5 行就落笔；计数
  纪律变体：不止数字要实测，**集合论断（全为/均为）禁用截断视图**）；
  ②**预写终态=占位残留的时态变体**（门一 B1/B3：报告把「复跑后应绿」写成
  既成事实——流程内预留回填段必须显式标「待实测」且结论句不得先行）；
  ③**审包「全文随包」声称必须逐字兑现**（门一二轮 W2：节选自称「全部
  内容性变更」被 -/+ 行缺失打脸——自包含审包要么全文要么明说节选范围）。
- 无进展计数：归零（13→14 有进展）。**第三波全清（SESS/AIN/DEP/ELE/ALIGN
  五票毕，勾选 14/24）——下波=第四波 F-DEDUP-01（服务层去重微扩版），
  F-GEOM-01 设计链随后（裁决 1 序：设计链三跳先于实现）。**

### batch 8 — 2026-09-18（执行者会话：第三波 F-ELE-01 Electron 升级预研，呈裁即停，完成）
- claim: claim-1789693931-b10
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/
  轻量双审/health-scan/源健康检查）；实现面=纯调研零代码——ops-executor
  不派（无 TDD 面）、systematic-debugging 不加载（无缺陷排查面）；门审=
  轻量双审（文档/制度批档位）：门一=ops-gate1-k1 绑定（k3 max，源健康
  检查推荐 k1——窗口类失效按链首选）、裁决位=ops-adjudicator 绑定
  （deepseek-flash max）——均异构于调研执行者（本会话 GLM5.3 max）。
- **交付**：docs/reports/2026-09-18_ele-upgrade-prestudy.md 骨架→调研
  报告全文（五要件齐：矩阵/Node24 兼容/工作量风险清单/暴露窗评估/结论
  呈裁）。核心发现：①**僵局已破**——better-sqlite3 v13.0.x（2026-07-21
  发布）N-API 化，prebuilt 随 npm 包发布（prebuilds/win32-x64.node，
  tarball 11.4MB sha512 对 registry integrity 一致），12.11.2/12.12.0
  双 E404 仍不在 npm 但已不重要；②三运行时实测全过（Node 24.20.0 ABI
  137/Node 25.2.1 ABI 141/Electron 42.9.3 main ABI 146 同一份 .node
  加载+FTS5+transaction+pragma）；③支持线（endoflife 09-17 快照）：
  42 EOL 2026-10-20 剩 33 天/43→2027-01-05/44→2027-03-02；④breaking
  项目面核对：43 一处体感（dialog defaultPath 三调用点未传）、44 两小改
  （clipboard writeText Promise 化三点+ANGLE 渲染回归）+主不确定项=
  @playwright/test 1.49 驱 44 CDP 漂移；⑤建议两票分离（bsq13 先行
  低风险→Electron 44 后行中风险，43 中间档不推荐——同工作量半窗口）。
- **呈裁（Rulings 待用户）**：F-ELE-01 实施时机——报告 §5 选项 a~d
  （a 推荐=维持裁决 1 F-GEOM-01 收口后两票分离实施；b 提前插队；c 仅
  先行 bsq13；d 维持现状至 Phase 6）。呈裁材料=报告全文+证据件；用户
  裁决后实施票按《裁决书》§3 P9/新波次入板，实施前按 §6.6 强制复核
  矩阵时效（重跑镜像目录清单+npm view 两探针+EOL 二源核对，约 10 分钟）。
- **门审**：门一 PASS_WITH_WARNINGS B0W4N5（W1 探针标签硬编码无版本
  自证→补跑 v25.2.1 自证+勘误注入档/W2 两日期无包内证据→published_at
  六值入档/W3 node-abi 三版本口径→存档句改准三版本一致+前瞻 alpha 条目
  /W4 git status 无原始输出→快照入档）；裁决位 GO_WITH_CONDITIONS
  P0=0P1=1P2=3（P1=修订清单漏列 AGENTS/ADR-0006「v13.x 无 win 预编译」
  失准句+「前提基于 v12」措辞→报告两处改准补列；P2=e2e「44 用例」失准
  →两处改「默认门 43+一键全跑 45」/EOL 单源→§5 补二源复核句/*.log 被
  .gitignore 拦→收口 git add -f）——全处置；回炉条件③「实施票以 --list
  实测 e2e 数入票面」记入实施票要求。
- **机检终态**：verify 双跑 EXIT=0（翻 registry 前 ele01-verify.log+翻
  后 ele01-verify2.log；195 票 open 12→11）；health-scan RED=0（WARN1
  =cfg 漂移历史欠账回显 batch 2~7 同款）；locks 面零变更（manifest 334
  不含 audits/docs-reports/tickets 路径——generate+apply 曾产时间戳
  diff 即时还原，本票无 [locked-change]/[dep-change] 义务）。
- 证据件入库（scripts/audits/，4 件+verify.log 经 -f）：ele01-{probes.txt；
  mirror-index.json；gate1-brief.md；verify.log（-f——*.log 被 ignore 拦，
  裁决位 P2-3）；verify2.log（同 -f）}。
- 教训三条：①探针输出标签必须带运行时自证（--version/process.versions
  打印）——硬编码「NODE24_LOAD_OK」在宿主 node=25 下跑出=标签失实，
  门一 W1 拦截（宪法「计数类数字落笔前实测」的探针变体）；②locks:
  generate+apply 在零条目差时仍产 generatedAt 时间戳 diff——无锁面
  变更的票不要跑锁命令，跑了要还原而非提交；③.gitignore `*.log` 全局
  拦截证据件 .log——证据件入库前 git check-ignore 自查，命中即 -f 显式
  列入（裁决位 P2-3；宪法「staging 显式列文件」的补充面）。
- 无进展计数：归零（12→13 有进展）。**第三波剩一项：F-ALIGN-01（制度+
  配置复合批单火专注）——下波建议 F-ALIGN-01 单火。**

### batch 7 — 2026-09-18（执行者会话：第三波梯队二前三票 F-SESS-01+F-AIN-01+F-DEP-01，完成 3 项）
- claim: claim-1789693931-b10
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋
  派发/门审矩阵/health-scan/换源状态机）；实现面=ops-executor 绑定子代理（三票
  TDD 红→绿→变异红证）；systematic-debugging 不加载（三票均为票面修法已定的
  实现面，无排障定位——F-SESS-01 的相位推演属设计论证非缺陷排查）。派发档位：
  主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定（GLM5.3flash max）；
  门一=ops-gate1-k1 **两次 Provider authentication failed→按换源状态机切
  ops-gate1-k2 备源承载**（k3 max）；门二=ops-adjudicator 绑定（deepseek-flash
  max）——门审均异构于实现者。
- **F-SESS-01（提交 cbd3996ceb）**：advance 终局守卫+abortActiveSession（复用
  failSession）+failSession 终局标记同步前移（setImmediate check 相位 vs rm
  线程池回路的事件循环论证+M1 反证）+bootstrap webContents 双事件接线
  （did-start-navigation isMainFrame+render-process-gone，经 container liveProxy）；
  态空间表扩格（迁移表 abort 行/跨格序列七→八行）；测试=单测 4+e2e renderer
  重载格（43/45 双通道）；INV-65 入册（门一 W1 处置）。门一 PW B0W2N9+门二
  GWC P0=0P1=1P2=5，全处置。
- **F-AIN-01（提交 8645a0f2bc）**：deleteByPaper+重插包 withTransaction（deps
  注入=lineage 同型）单篇全有或全无；测试 a1 两相（首插中断零行/重灌中断旧
  数据完整）+a2 跨篇隔离；M1=IIFE 直调变异双红。门一 PW B0W1N8（W1=首红
  指纹归属失实→报告 §3 勘误段入档）+门二 GWC P0=0P1=2P2=5。
- **F-DEP-01（提交 1caa072b26）**：postcss ^8.5.26 devDep 显式化+lockfile
  同步（零下载实证=显式化非新增）；机检三件（CI_DRYRUN/npm ls/verify）；
  **干净环境 npm ci=降级口径**（本地 dry-run+CI 背书，CI 首跑=最终背书——
  未本地实测，门二 P1-2 呈报口径）。[dep-change]+[locked-change] 分票落。
- **机检终态**：verify 全链 EXIT=0（指纹门 183 文件/1757→1764 用例/5334→5372
  断言/skipSites 15；vitest 166/1713→1719；locks 334；F-SESS-01 后主控亲跑
  VERIFY/E2E_APP/E2E_ALL 三标记落盘 raw）；health-scan RED=0（WARN1=cfg 漂移
  历史欠账回显）；check-tickets 195 票/open 12。
- 教训三条：①**RESTORE 标记归档缺口连续两票同款**（F-SESS-01 W2+F-AIN-01
  P2-1——还原 diff 空/复绿 EXIT 落终端不进 raw）：变异跑的还原证据输出必须
  `>> raw` 随跑随录（batch 6 教训①的扩展面：不止 echo EXIT，一切想引用的
  机器输出都要物理落档）；②git log 管道 `head -c N` 会撕裂 UTF-8 多字节字符
  致提交信息「乱码」假象——数据层无损，验证 message 完整性用 `--format=%s |
  tail -c N` 或不截断（宪法 shell 四坑的第五变体：显示层截断≠数据层损坏）；
  ③门二建议项留档：指纹门 `expect.poll` 抽取盲区（extract.mjs:277 仅认
  Identifier callee，存量 12 处）建议并入 F-TESTREF-S1 票面；lineage+回灌同族
  事务不变量批量补册窗口随 F-SENSOR-01/F-DEDUP-01 场次评估（门二 P2-3/P2-5）。
- Rulings 待用户：无新增（三票自裁均经门一对抗拷问+门二复核闭合；F-ELE-01
  呈裁节点=下波既定安排）。
- 无进展计数：归零（9→12 有进展）。**第三波剩两项：F-ELE-01（纯调研呈裁即
  停）/F-ALIGN-01（制度+配置复合批单火专注）——下波建议 F-ELE-01 单火（产出
  呈裁后本板即勾，实施属后续波次）。**

### batch 6 — 2026-09-18（执行者会话：F-TESTREF-W4 战役收官票，完成）
- claim: claim-1789693931-b10
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋
  派发/门审矩阵/health-scan）；实现面=本会话直接实现（文档+机检+下沉迁移，
  W1A-C 先例）；TDD 技能不加载（理由：票面=台账/不变量登记+配方逐字下沉迁移，
  「能失败一次」以两变异红证兑现——streak 2→999 稳态用例红+toHaveScreenshot
  注入负锚红，还原链全落档）；systematic-debugging 不加载（无排障面——两次
  回炉均为文书口径修正非缺陷定位）。派发档位：主控=GLM5.3 max（本会话）；
  门一=ops-gate1-k1 绑定（k3 max）；门二=ops-adjudicator 绑定（deepseek-flash
  max）——均异构于实现者。
- **交付六件**：①docs/audits/flake-ledger.json 八线收录（P7-A 7 resolved/
  F-R2e 2/z-r2e 2/tag-lifecycle 2 resolved/F-ARCH4-M1 1/F-G11 1/settings.png 1
  observing/corpus-export 3 unpursued——数据源=charter §1.4 审计快照+八线史料
  档，门二逐线比对 8/8 成立）；②tests/e2e/stable-rel.ts 共享助手（69 行，配方
  逐字下沉+INV-51 口径单源；reader-text 删内联挂 import，z-r2e rectStableGate
  刻意保持内联——探针取证语义自裁经门一 A 项复核）；③INV-63（测试面单调性
  ——指纹门 C_after ⊇ C_before 机检锚定）/INV-64（e2e 禁截图比对——check-quality
  第 9 段 toHaveScreenshot 负锚）入册 docs/invariants.md（尾号 62→64）；④搭车
  W3 门二 P2-3=调色板断言字面量五色 pin（标题未动、断言 2→3，NEW delta 形态
  无需豁免——该件系 W3 新增未入战役前基线）；⑤搭车 W2 门二 P2-2=test:e2e 语义
  三处回写（charter:294/裁决书:117/DEV-SETUP——verify 数字行顺手对齐为收官
  真数，票内自裁经门一 E 项复核）；⑥S1 触发检查=W12/N11/N15 三类探针零命中
  不触发（w4-s1-probe.txt；探针 v1 误报白名单合法 it.each——v2 修正口径后归零）。
- **战役收口段（W5）兑现**：coverage 三档亲跑 COVERAGE_EXIT=0（全局 86.6
  lines≥70/repos 97.12≥85/renderer 由 thresholds exit 背书）；e2e 双通道 E2E_
  APP_EXIT=0（42 passed 2.0m）+E2E_ALL_EXIT=0（44 passed 2.2m）；战役净删总账
  （tests 域已提交 +1622/-1618+W4 终态 +81/-56：迁移三票净删 -737、W3 契约
  测试纯增 +741、W4 净 +25 含门审后 +3 行处置）；**基线重冻结**（AGENTS
  [test-refactor] 段战役毕义务）：179→183 文件/1623→1757 用例/4979→5334 断言/
  skipSites 15 零变——共有 179 文件排除 line 字段逐字节全同（57 文件粗差异=
  迁移行号漂移），纯增=W3 四件+W4 一断言，exemptions 零条目；审计档
  w4-baseline-refreeze-audit.md（门二抽查 2 共有文件互证）。
- **机检终态**：verify 全链 VERIFY_EXIT=0（quality 含第 9 段新负锚+tickets
  195 票 open 15（verify 跑时 W4 已翻——收口态）+locks 334+lint+typecheck+
  test 166 文件 1713 用例+build，Node 24.20.0）；health-scan RED=0（WARN1=cfg
  漂移历史欠账回显，batch 2~5 同款）。
- **变异红证两件+复绿链**：①streak>=2→999（永不收敛）→e2e 稳态用例红（红点
  stable-rel.ts:65 穷尽分支、调用栈经 reader-text.spec:130——证明消费共享版）
  →cp 备份还原 diff 空→终态 e2e 默认门 42 全绿=复绿实证（P1-2 绿半证经门二
  裁定以终态亲验+全量复跑闭合）；②stable-rel.ts 注入 toHaveScreenshot 注释
  →check-quality EXIT=1 红消息精确点名→删注入→终态 verify quality 段绿=复绿
  实证。raw=w4-mutation-stable-rel.log+w4-inv64-anchor-red.log。
- **门一 PASS_WITH_WARNINGS**（B0/W6/N10）处置：W1 台账两线伪路径→spec 置
  null+载体说明进 case；W2 settings.png 门槛（累计 3）偏离通则（累计 2）→行内
  声明系 charter §1.4 原文口径；W3「逐字迁驻」声明过当+头注丢 W-G1 句→两件
  声明改准（配方逐字/头注删节改写）+stable-rel 头注补 W-G1 排查细节指向；
  W4 INV-64 声明面（「及同类」）大于锚面→声明与锚面对齐（手写 screenshot 面
  =未来负锚扩展位显式登记）；W5 简报计数 ±1 两处（reader-text 单文件 -54 非
  -55；指针注释 2 行非 3 行）→本日志勘误口径；W6 心跳回退 26s=batch5 收口
  时钟近似值与本会话实测宿主钟差，非时序异常。
- **门二 GO_WITH_CONDITIONS**（P0=0/P1=4/P2=5）处置：P1-1 真退出码落盘缺失
  （首跑 log 用 `; echo EXIT=$?` 未追加进文件——echo 落终端）→终态四跑补录
  （VERIFY/COVERAGE/E2E_APP/E2E_ALL 四标记全在 log 尾，W1C 惯例形态）；P1-2
  变异还原复绿半证→终态复跑闭合（见上）；P1-3 门审后小改重锁复验→处置毕
  locks:check 334 一致+终态 verify 绿；P1-4 记账 +78/-55 与终态差 2 行→git
  diff --stat 终态实测 +81/-56 回写 registry。P2-1 open 口径失配（verify 跑时
  16→收口 15）→本日志注明；P2-2 证据件 6 实为 12（w4-test-surface-delta.log
  漏列+简报/patch 自身）→本日志列全；P2-3 INV-51/z-r2e 头注两处指针指向下沉
  前旧址→已对齐（stable-rel.ts 新址）；P2-4 registry 翻 done 先于门审=可回退
  形态，门二 GO 后保持；P2-5 变异 raw 为节选无 EXIT 行→教训条。
- 证据件入库（scripts/audits/，12 件）：w4-{verify-full.log；coverage.log；
  e2e-appgate.log；e2e-allgate.log；mutation-stable-rel.log；inv64-anchor-red.log；
  s1-probe.txt；test-surface-delta.log；baseline-before-refreeze.json；
  baseline-refreeze-audit.md；gate1-brief.md；gate1-diff.patch}。
- 教训三条：①**退出码落盘形态**：`cmd > log 2>&1; echo EXIT=$?` 的 echo 落
  终端不进 log——必须 `echo "X_EXIT=$?" >> log`（门二 P1-1 拦截；W1C 的
  `E2E_APP_EXIT=0` 形态本就是追加式，照抄时丢了 >>——「真退出码禁信转述」的
  机器面=标记必须物理在日志内）；②**审包体积纪律**：git diff HEAD 全量 7360
  行（baseline 2481+manifest 大头）超重——工件面默认剔除后 308 行（ORG-12
  再实证，未跟踪新件须附全文附录=W1B 教训①同族）；③**锁操作时序修正**
  （W1B 教训③「集中一次走」的补充）：门审 W 级处置必然触发二次锁往返——
  apply 的正确锚点=门审处置毕后最后一次，而非「实现毕即 apply」（本批往返
  三次：实现毕/门一处置后/门二处置后）。
- Rulings 待用户：无新增（票内自裁五项——豁免形态判定/DEV-SETUP 数字行顺手
  对齐/z-r2e 保持内联/first_seen 精度分层/基线重冻结时机——均经门一对抗拷问
  +门二复核闭合）。
- 无进展计数：归零（8→9 有进展）。**F-TESTREF 战役七票（00/W1A/W1B/W1C/
  W2/W3/W4）全毕——第二波清空，下一波=第三波 F-SESS-01 起。**

### batch 5 — 2026-09-18（执行者会话：F-TESTREF-W3 src/shared 直接契约测试补齐，完成）
- claim: claim-1789693931-b10
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋
  派发/health-scan）；实现面=本会话直接实现（纯增契约测试+机检+六源变异红证，
  W1A-C 先例）；TDD 技能不加载（理由：票面=对既有源补直接契约测试，先红后绿
  以源变异红证兑现——六条全红且还原 diff 空）。派发档位：主控=GLM5.3 max
  （本会话）；门一=ops-gate1-k1 绑定（k3 max）；门二=ops-adjudicator 绑定
  （deepseek-flash max）——均异构于实现者。
- **设计裁决（票内自裁，门二裁「成立且保守向」）**：①比值口径=直接契约测试
  （tests/contracts 行数）/src/shared 除 models 契约面——基线 316/992=0.318≈0.32
  唯一复算吻合（316/1403=0.225 对不上）；终态 1057 行：立案基线口径 1057/992=
  1.066、终态口径 1057/995=1.062（app-error 本票 +3 行），双口径 ≥0.8 达标。
  ②源面唯一变更=app-error.ts APP_ERROR_CODES 导出+as const satisfies（零行为
  变更）——错误码封闭性双向机检（类型级 Equal+运行时全集）的唯一反射源。
- **交付**：四新件 tests/contracts/{schemas.test.ts 493 行 89 用例；api-surface-
  closure.test.ts 125 行 21 用例；app-error-closure.test.ts 68 行 18 用例；
  constants.test.ts 55 行 6 用例}——schemas=67 schema 夹具表三方闭合（VALID⟷
  SCHEMA_NAMES⟷运行时 zod 导出）+strict 首层探针+嵌套模型层八位探针+边界专项
  （秒/数量门/长度界/5000/2048/corpusItem refine 双向/两臂互斥/null 语义/默认
  填充/UI_SCALE 闭合/枚举基数）；api-surface=55 通道计数/12 域方法集/14 路由
  前缀/隐藏集本体 pin/事件通道值+/event 后缀互斥/载荷配对/workspaces 组合域；
  app-error=15 码类型级 Equal+运行时全集+逐码 toAppError 探针+集外回落；
  constants=host 白名单冻结/调色板⟷annotationColorSchema.options/协议名/HTTP
  预算/MAX_PAGE_SIZE⟷libraryQuery limit 同源。既有测试件零改动。
- **机检终态**：verify 全链 EXIT=0（166 文件/1713 用例+build，Node 24.20.0）；
  指纹门 179→183 文件/1623→1757 用例/4979→5333 断言/15 skipSites（+134=
  89+21+18+6 逐件精确吻合，纯增零删）；locks 329→333；tickets 195/open 16。
- **六变异红证**（logs=scripts/audits/w3-mutation{1..6}*.log+w3-mutation3-
  typecheck.log）：①schemas.ts max(3600)→3599=秒边界红；②api-surface.ts 删
  diagNetwork=计数+方法集双红；③app-error.ts 删 CANCELLED=vitest 红+typecheck
  红（含 Equal 断言本体 TS2344；另 asAppErrorCode includes 处 TS2345——门二
  P2-2 勘误：报错宿主是 includes 参型收窄非 satisfies 本体）；④constants.ts
  白名单漂移红；⑤annotation.ts 首 .strict() 删除=嵌套探针红；⑥PRELOAD_
  HIDDEN_METHODS 清空=集合本体 pin 红。还原 diff 空六连（间接佐证=锁 sha 对账
  绿+指纹 base=cur——门二 P2-1 口径）。注：mutation3-typecheck.log 含 3 条
  schemas.test.ts TS18048 为当时未修的中间态残留（终态已修、verify 绿——防
  误读，门二 P2-2）。
- **门一 PASS_WITH_WARNINGS**（B0/W2/N6）处置：W1 隐藏集引用检查型 vacuous
  green→补集合本体 pin+变异⑥红证；W2 strict 探针仅首对象层→补嵌套八位探针
  +头注口径修正+变异⑤红证；N3 事件通道值未 pin→三通道字符串精确 pin；N4
  枚举基数缺口→clipboard format/zcodeLinkDetect state/两 phase 的 .shape
  options pin；N1 简报计数 18→19 勘误（终态 21 专项）；N5 不立案；N6=主控
  误引首跑 UNRESOLVABLE 残留数字→终态勘误。
- **门二 GO_WITH_CONDITIONS**（P0=0/P1=2/P2=4）处置：P1-1 记录勘误（api-
  surface-closure 申报 122 实测 125——本日志已改用 125；比值双口径明示如上）；
  P1-2 提交形态（[test-refactor][locked-change] 双尾注+manifest 与 src/tests
  同一提交+w3-* 证据件显式入库+提交前未跟踪面为零——本批收口兑现）。P2-3
  调色板断言同源构造恒真（z.enum(ANNOTATION_COLORS) 等式自反）→改字面量
  五色 pin 留 W4 搭车。
- 证据件入库：scripts/audits/w3-{verify-full.log；mutation1-schemas.log；
  mutation2-api-surface.log；mutation3-app-error.log；mutation3-typecheck.log；
  mutation4-constants.log；mutation5-nested-strict.log；mutation6-hidden-pin.log；
  gate1-diff.patch}。
- 教训两条：①计数纪律再实证——api-surface-closure 申报 122 实测 125（门二
  拦），且首跑 UNRESOLVABLE 失败跑残留数字（1671/5103）误入门一简报——**引用
  机检数字必须取通过跑日志，失败跑数字禁引**；②it.each 数组带 as const 会破
  指纹门抽取器 const+ArrayLiteral 单跳解析（UNRESOLVABLE 红）——裸数组字面量
  形态是硬约束（typecheck 后再跑一次指纹门应成收口惯例）。
- Rulings 待用户：无新增（票内自裁两项均经门一/门二复核闭合）。
- 无进展计数：归零（7→8 有进展）。

### batch 4 — 2026-09-18（执行者会话：F-TESTREF-W1C e2e 脚手架单源＋W2 探针移出默认门，完成 2 项）
- claim: claim-1789693931-b10
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋
  派发/health-scan）；实现面=本会话直接实现（迁移+三重机检，W1A/W1B 先例）；
  systematic-debugging（用——lint 红定位与 shell 正则翻车处置）；TDD 技能不加载
  （理由：tests 重构迁移面，验证=指纹门 C 面零变化+变异红证，非新实现红绿循环）。
  派发档位：主控=GLM5.3 max（本会话）；门一=ops-gate1-k1 绑定（k3 max）；
  门二=ops-adjudicator 绑定（deepseek-flash max）——均异构于实现者。
- **W1C 交付**（提交 75f4671e56）：launch 5 副本+seedPaperRow 4 spec 本地定义
  （15 引用面）+first-window 500ms→close 配方 14 文件 20 块→e2e-env.ts 单源
  （71→82 行，+bootstrapMigrations）。净删 tests 域 +72/-351（16 文件）。
  语义保真三辨析：reader-search SEED_ID 硬编码 'e2e-seed-p7e03' 调用点显式
  补参；corpus-export readFile 后部 6 处真实消费保留；reader-text 的
  app.evaluate((electron)=>…) 回调参数系 Playwright 注入非 import（grep 命中
  系参数遮蔽，import 的 electron 删——lint no-unused-vars 实证）。
- **W2 交付**：playwright.config.ts projects 拆分 app/probe（@probe 标签形态
  弃用——动 test() 标题即动 C 面；spec 文件零改动）；package.json test:e2e→
  --project=app+新增 test:e2e:all；CI ci.yml:74 裸 npx playwright test 无过滤
  =全 project 仍含探针（行为不变亲验）。
- **三通道 e2e 真跑全绿**：迁移前全量 44 passed（2.1m）/W2 后默认门 app 42
  passed（1.9m）/一键全跑 all 44 passed（2.1m），双 EXIT=0 落档（w1c-e2e-
  {full,appgate,allgate}.log）；指纹门 179/1623/4979/15 全同；verify 全链
  exit 0（162 文件/1579 用例+build，Node 24.20.0；首跑红=locks:check 拦
  manifest 未重算属 unlock→改→apply 预期序非缺陷）。
- **门一 PASS_WITH_WARNINGS**（B0/W1/N8）：W1 简报净删记账聚合口径失实
  （17 文件 +73/-352 混入 relay 认领行与 W2 面）→分域复测修正（门二终态再
  勘误 +72/-351）；N1 默认门补跑/N3 自裁多报两文件勘误/N4 两处探针失效注释
  修正（其余「同型」措辞留后续票）/N5 变异 raw 落档——全处置。
- **门二 GO_WITH_CONDITIONS**（P0=0/P1=3/P2=4）：P1-1 probe/union 通道真跑
  raw 缺→test:e2e:all 44 passed 补跑落档；P1-2 记账终态勘误；P1-3 提交形态
  矩阵→白名单亲验（playwright.config/docs/handoff 不在 TR_RE）→**拆两提交
  +stash 时序**（config/package stash→apply→提交 1 纯 tests 面 [test-refactor]
  合规→pop→apply→提交 2），每提交 manifest 同步（宪法禁跨提交延迟重生成）。
  P2-2 留痕：charter:294/DEV-SETUP:69/裁决书:117 的 test:e2e 全量语义在 W2
  后失准（现为默认门 42），回写归 W4 收官票统一处理。
- **教训三条**：①shell 复合命令 python 正则 0 命中翻车（W1B 同族第五实证）——
  探针一律 Write 文件后 node 跑；②已重锁态下变异还原 cp 直接写被只读位拦
  （sed -i 走 rename 通道能写）——重锁后动受锁面须 unlock 或 mv 通道；
  ③计数聚合行（git diff --stat 全域）冒充分域口径——净删记账必须按域
  `git diff --stat -- <path>` 实测（W1B 教训②再犯，门一+门二两次拦截）。
- Rulings 待用户：无新增（门二 P2-4 记录级+P2-2 留痕均已闭合或归票）。
- 无进展计数：归零（5→7 有进展）。

### batch 3 — 2026-09-18（执行者会话：F-TESTREF-W1B 几何桩+局部工厂下沉，完成）
- claim: claim-1789693931-b10
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/
  health-scan）；实现面=本会话直接实现（磨刀石验证+六批迁移+三重机检，W1A 先例），
  systematic-debugging（用——三次回炉定位）。其余工程技能与本票（tests/** 重构面）
  无交集不加载。派发档位：主控=GLM5.3 max（本会话）；门一=ops-gate1-k1 绑定
  （k3 max）；门二=ops-adjudicator 绑定（deepseek-flash max）——均异构于实现者。
- **交付**：tests/utils/geometry.ts 几何桩单源（11→149 行：三族安装对
  stubElementRects/stubViewportRect/stubElementRect+stubRangeGBCR/
  stubRangeClientRects/defineRangeClientRects+domRect/boxRect/stubRectOf）+
  tests/utils/factories.ts 新件（118 行：makeTab(patch)/makeAnnotation/
  makeDetail+makeDemoDetail/seedLineage）+37 unit 文件迁移（几何 17+工厂 21-
  交集 ai-annotation-layer=1；makeTab×11/makeAnnotation×3/makeDetail×4/
  seed×3）。净删 tests 域 +324/-639（38 跟踪文件+未跟踪 factories 118 行）；
  locks manifest 328→329。
- **票面口径勘误（票内自裁留痕，门二裁「不需升级用户裁决」）**：票面 22 文件/97 处
  =调研期方法名 grep 口径——e2e 5 spec 的 36 行命中全为 win.evaluate 内真实浏览器
  测量非桩、零改动；真桩收敛面=unit 17。工厂 ×4/×3/×3/×2 系调研期口径，实测扩至
  ×11/×3/×4/×3 全数收敛。「94 文件命名规范」落为 geometry.ts 头注规范句（全量
  重命名=纯 churn 不做）。fa12 Range 零盒桩（8 字段全 0）保留文件内——selection 系
  4 字段展开形不可无损互换（undefined↔0 分支风险）。
- **C 面零变化三重实证**：指纹门 179 文件/1623 用例/4979 断言/15 skipSites 全同
  （raw=scripts/audits/w1b-test-surface-raw.txt）；变异红证：删 selection-paint
  几何断言→MISSING_ASSERT 红（精确行号）→cp 备份还原→复绿；verify 全链 exit 0
  （162 文件/1579 用例+build，Node 24.20.0，raw=w1b-verify-full.log）。
- **三次票内回炉留痕**：①lineage 三文件 factories import 先于 api-client-mock——
  vi.mock 注册晚于 factories 顶层 useLineageStore 模块图加载→store 持真 api→
  spy 0 调用 11 红→import 调序（W1A 顺序契约再实证+门一 W2 追查出另 9 文件同位
  序隐患→统一调序防呆收口）；②selection-mode 原局部 makeTab 显式写
  selectionMode:false，共享基样缺席（undefined）→断言红→调用点显式补键
  （arrange 段改动 C 面安全）；③scroll-converge 迁移脚本正则竞态+bash node -e
  $ 展开（宪法在册坑第四次实证）3 行参数被清空→逐行修复+两参调用点补 height 实参。
- **门一 FAIL→补件复审 PASS**（回炉 1 轮合规）：首轮 B1=审包缺 factories.ts
  （未跟踪新文件不入 git diff——**审包打包法缺陷教训：未跟踪新件须显式入包**）/
  W1 计数 36 应为 37（anchor-blank-snap 与 anchor-locate 名字看混）/W2 九文件
  import 位序/W3+简报凭印象数字（计数纪律）。补件（factories 全文+manifest
  hunks+简报二处置）后复审 PASS B=0/W=0/N=4（N1-N4' 全记录级：right 字段
  惰性/键缺席布尔等价/五文件惰性模块边/boxRect 无外部消费）。
- **门二 GO_WITH_CONDITIONS（P0=0/P1=1/P2=5）**：独立复算全数字逐字对上
  （+324/-639/147-9/118/329/37=17+21-1）；N2'/N3' 亲读 src 消费面闭合
  （lineage-viewport.ts 仅 width/clientWidth；selection-mode ①用例断言全在
  store 写后）；P1-1=亲跑 raw 留档（已落 w1b-test-surface-raw.txt+
  w1b-verify-full.log，双 exit 0）；P2-5=registry summary 已写实测口径。
- 证据件入库：scripts/audits/w1b-{geo-survey.md,gate1-brief.md,gate1-brief2.md,
  gate1-diff.patch,test-surface-raw.txt,verify-full.log}。
- 教训三条：①审包生成对未跟踪新文件盲——新交付件必须显式附全文或先 git add -N；
  ②简报计数凭印象两处失实（+107/+148 vs 实测 +147/118）——计数落笔前脚本实测
  纪律的再实证；③locks:apply 中途落锁会拦后续 lint 修复写入——锁操作应集中在
  迁移面全部完成后一次走（本批 unlock/apply 往返四次）。
- Rulings 待用户：无新增（票面口径勘误经门二裁处为票内自裁合规，不升用户级）。
- 无进展计数：归零（4→5 有进展）。

### batch 2 — 2026-09-18（执行者会话：F-TESTREF-W1A mock 工厂下沉，完成）
- claim: claim-1789693931-b10
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/
  health-scan）；实现面=本会话直接实现（磨刀石验证+分批迁移+三重机检），systematic-
  debugging（用——两次回炉定位：toast-store 浅替换 App 级崩/顺序契约违反）；其余
  前端/安全等技能无交集不加载。派发档位：主控=GLM5.3 max（本会话）；门一=ops-gate1-k1
  绑定（k3 max）；门二=ops-adjudicator 绑定（deepseek-flash max）——均异构于实现者。
- **交付**：tests/utils/api-client-mock.ts 工厂单源（makeApiStub/stubApiEvents/stubUnwrap/
  toastSpy/toastStoreSpy+顶层三 vi.mock 运行时注册）+40 测试文件迁移（实测口径：api/client
  vi.mock 38 文件+Toast 25+toast-store 6，目标级交集后唯一文件 40；票面 39/32 为立案时
  近似）。净删 261 行（+368/-629，41 文件）。
- **C 面零变化实证**：test-surface:check 基线=当前全同（179 文件/1623 用例/4979 断言/
  15 skipSites）——R2/R3 机检锁定；变异红证：断言 .not 移除→MISSING_ASSERT 红→cp 备份
  还原 diff 空→复绿；verify 全链 exit 0（Node 24.20.0，162 文件 1579 用例+build）；
  health-scan RED=0（WARN1=cfg 漂移历史欠账回显）。
- **两次回炉留痕**（票内自处，未超回炉上限）：①toast-store 初版浅替换→App 级测试挂
  ToastHost 消费 getToastItems 崩（No export 错）→改统一展开型；②selection 系列把工厂
  import 留在原 mock 块位（被测 imports 之后）——vi.mock 运行时注册不享 hoisting→
  mock 静默失效（DOM 断言过、spy 断言全 0）→工厂 import 上移至 vitest import 后，
  8 文件脚本批量修复。
- **教训两条**：①ugrep 复合正则与 GNU grep 行为差异致「unwrap 在 src 零使用」假阴性
  ——关键否定结论须换正则交叉验证；②bash 复合命令内 node -e 引号翻车三次——探针
  一律 Write 文件后 node 跑（宪法既有纪律的再实证）。
- **门一 PASS_WITH_WARNINGS**（B=0/W=4/N=6，审档=w1a-gate1-diff.patch+会话档）：W1
  unwrap 语义变化（门二复核：anchor-locate.ts 全文零 unwrap 使用/AnnotationPopups
  失败链走 reject 传播不经 !ok 分支）+W2 真 showToast 副作用切除（内存队列无观测断言）
  +W3 apiEvents Proxy 仅 get trap（src 消费=三处方法调用无 in/spread/keys——grep 实证）
  +W4 mocks.showToast 占位接缝（注释声明契约）——主控处置全数闭合。N1 尾随逗号毛边
  已清。
- **门二 GO**（无 P0/P1/P2；口径修正入档：W1 同类变更实为 5 文件面（anchor-locate/
  annotation-layer/reader-search-wiring/selection-mode/annotation-popups——余 3 文件
  被测面为空门面 api.reader={} 无消费）、W2 切除面=40 文件双入口统一 spy；179/1623=
  指纹门扫描域 vs 162/1579=vitest 运行域两口径说明）。审档双输出存会话档（裁决书 §8
  先例）。
- 证据件入库：scripts/audits/w1a-{api-files,both-files,toast-files}.txt（普查面）+
  w1a-migrate-plan.json（迁移计划）+w1a-gate1-diff.patch（门一审包）。
- Rulings 待用户：无新增。
- 无进展计数：归零（3→4 有进展）。

### batch 0 — 2026-09-18（主控建板，未点火）
- 深度设计门：过（ai-dev-org 路由——org-ledger 在案+战役简报《裁决书》v1.1 已入库）
- 板已建（24 项清单），**火未布防**（用户指令本会话不正式开工）——点火入口待用户
  显式 `/batch-relay`；未点火期间手动会话按本板清单领批同规执行。

### batch 0 增补 — 2026-09-18（主控同步技能更新，未点火状态修订无 claim 冲突）
- batch-relay 技能更新落板：①执行者开工首步 Skill 加载 ai-dev-org 已入火协议/
  注入指令（protocol 段与执行路由段同步）；②protocol 段按新版模板重构为「角色
  自识别」结构（调度员 UI 开批路径+执行指令原文内嵌——技能载不上时板自含）。

### batch 0 增补二 — 2026-09-18（主控补未规划裁决项规约，仍未点火）
- 执行路由段新增「未规划裁决项处置」：用户级（负面清单/新依赖/制度/防线/测试
  自身错误/视觉）挂起跳次+批次日志记 Rulings 待用户，单批挂起 ≥2 项或整波受阻
  → 收口后 HOLD 呈报；主控级回炉三分法自处；已规划呈裁节点产出即勾项不阻塞。

### batch 0 增补三 — 2026-09-18（布防会话点火，用户显式布防确认）
- 布防前校验全过：`grep -c '^- \[ \]'` 计 24 / status READY / claim "-" /
  automation_id 未回填；板未重建（仅本批回填+本留痕）。
- 深度设计门复检过（org 路由：org-ledger 在案+《裁决书》v1.1 在案）。常驻火已建
  （*/5 分钟轮询，prompt=技能火模板原文），automation_id 已 tmp+rename 原子写
  回填并回读确认。
- 本布防会话=调度员宿主：火只投给本会话，每回合仅 UI 开批不跑批，须保持存活。
  停止三径：清单全勾自动 DONE / HOLD 止损 / 手动删火。

### batch 0 增补四 — 2026-09-18（调度员首班开批纠偏：项目绑定漏步）
- 事故：首班 UI 开批跳过 protocol 段「选择项目」勾选步（误信技能「新建任务默认同
  工作区」校准），任务落在 default（=菜单「不在项目中工作」态），未入 Synapse_remake
  分区。用户实锤纠正，错误任务由用户归档（板 READY/claim -/树净未污染）。
- 重开（成功）：AXExpand「选择项目」→ 搜索框过滤 Synapse → 勾选 checkbox Synapse_remake
  → Escape → 点击 textfield → event 写入 → 回读 → 发送。绑定成功标志 UI：「切换 Git
  分支」「取消选择当前项目」按钮出现；核对新任务行入侧边栏 Synapse_remake 分区+
  会话顶栏 Synapse_remake · main。
- 教训：①「新建任务默认同工作区」校准在本客户端不成立——protocol 段勾选步为**必须步**
  不可跳；②项目菜单列表可能截断，搜索框过滤是最稳定位法（搜索框 a11y 写入实测生效，
  聊天输入框仍须 event）。
- Rulings 待用户：batch-relay 技能 SKILL.md「已校准：新建任务默认同工作区」条目与
  实测相悖，建议修订为「必须显式勾选」（技能文件在用户全局目录，调度员不改）。

### batch 1 — 2026-09-18（执行者会话：第一波·立案批，完成 3/3）
- claim: claim-1789693931-b10
  勾选 0→3（T0/T1/T2 全毕）。
- 技能清点：batch-relay（用——本批点火协议）、ai-dev-org（用——组织主干/执行
  路由/收口 health-scan）；其余工程技能本批为 registry/骨架立案面（无业务实现、
  无测试面、无调试面）不加载——理由：纯工单文件+registry 数据变更，verify 关卡
  即机检。派发档位：主控=GLM5.3（本会话）max 思考；门审=轻量双审（文档/制度批
  档位）：门一 K1 绑定子代理（k3 档）+裁决位绑定子代理（deepseek-flash 档）。
- **T0**：check-tickets 重复 id 哨兵（+13 行=5 注释+8 代码，插在计数对账哨兵后、
  byId 构建前）。红证：注入重复 F-DEDUP-01 行→EXIT=1（报错「工单 F-DEDUP-01
  重复登记——Map 后写会静默覆盖先登记条目」）→cp 备份法还原 diff 空（作用面=
  registry.ts 单文件 vs HEAD）→复跑 EXIT=0。受锁单链：unlock→改→generate→apply
  （manifest 含新 sha）。附加活性证据：骨架头注初版含「SR-RDR-02」字样被规则 2
  拦红（src 文件引用 done SR 票占位），改述「在册先例」后绿——规则 2 在新文件面活。
- **T1**：12 新票立案（registry 183→195 票，open 9→21 全 strong）。file 锚=8 既有
  真实文件+4 新建骨架（F-ELE-01/F-TIME-01 调研报告载体、F-LAYER-01 settings.service.ts、
  F-EXPORT-01 export-session-state.ts——骨架均头注五层规约+export {} 空体）。F-STOR-01
  为 DIR 形态票（file=scripts/audits/，翻 done 时须同步 DIR_FILE_EXEMPT [locked-change]
  ——票面已声明）。
- **T2**：F-DEDUP-01 微扩（+app-file URL 三处收编单源，:239 硬编码未用
  APP_FILE_SCHEME）+F-GEOM-01 扩容（+六子域目录重组清单与迁移序入设计书要件）。
  两票均 open 未实现态，扩容正当；计划同步义务核对=本板第四波两行已含扩容要件。
- **机检全绿**：verify 全链 exit=0（quality+tickets+locks+lint+typecheck+test+build，
  Node 24.20.0）；check-tickets 195 票/EXIT=0；locks 328 一致；health-scan RED=0
  （WARN×1=cfg 漂移，历史欠账非本批引入，回显计数）。
- **轻量双审**：门一（k3 绑定）PASS_WITH_WARNINGS B=0/W=2/N=9；裁决位（deepseek
  绑定）首轮 FAIL（证据不足型——审包缺原件）→补包（§5 原文/机检输出/红证记录/
  两票 open 证据）→复裁 PASS_WITH_WARNINGS B=0/W-R=3/N=5。处置：门一 W1（变形
  重复逃逸）经规则 0 ID_WHITELIST 论证闭合（大小写/尾空格均被白名单拦红，与哨兵
  构成双边界，不改代码）；门一 W2/裁决位 W-R3（计数快照与机检原件）——92 audits
  锁项/47 SR2 票两项本批实测吻合（grep -c），其余为《裁决书》§7 证据档调研期实测
  转述+票面义务（F-PROC-01 执行时基线重测）；裁决位 W-R1/W-R2 计划同步与在途认知
  均核毕闭合。双审原始输出存会话档（《裁决书》§8 先例——审档默认仓外归宿，
  F-STOR-01 在途不另建仓内审档文件）。
- **竞态事故与修复（教训入档）**：执行者认领读板（基于工作区）与调度员增补四
  提交（a38bfa786d）同窗——tmp 基于旧版，mv 覆盖把增补四段+protocol 一句截短
  抹掉；git diff 对 HEAD 发现后即从 HEAD 逐字恢复（增补四段+「裁决本身待用户、
  不阻塞接力」全句），终态 diff 纯增量。**教训：执行者写板（含收口）前必须
  `git show HEAD:docs/handoff/relay.md` 对基线，勿以工作区 Read 为底**——调度员
  会话全程存活随时可能提交批次日志。
- Rulings 待用户：无新增（batch 0 增补四的技能修订 Ruling 仍在案待用户）。
- 无进展计数：归零（0→3 有进展）。
