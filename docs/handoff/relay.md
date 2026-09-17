# 批次接力状态板（机器门控文件——火按此行动，人可读）

> 项目：Synapse_remake ｜ 战役简报=docs/design/2026-09-18_complexity-governance-ruling.md
> （14 项用户裁决+五梯队编排 v1.1，下称《裁决书》；本板清单为《裁决书》§3 的执行投影，
> 排程冲突时以《裁决书》为准并回改本板）。
> 建板：2026-09-18 主控会话（用户指令「本会话不正式开工」——**板已备、火未布防**；
> 点火入口=用户显式 `/batch-relay`，或手动会话直接按本板清单领批，两径同规）。

- status: READY
- automation_id: automation-e8255b42-9698-40da-a62b-8896ef575e8f
- plan: docs/handoff/relay.md#执行清单（自含清单，收口 grep 本文件 `- [ ]` 计余量）
- spec: docs/design/2026-09-18_complexity-governance-ruling.md
- poll_interval_min: 5
- fire_budget_min: 120
- heartbeat_utc: 2026-09-17T20:17:53Z
- claim: -
- no_progress_count: 0
- checked_total: 24
- checked_done: 7

## protocol（角色自识别 + 最小兜底协议——技能不可加载时按此执行）

- **收到火 prompt 的会话=调度员**（投递实证：火只投给创建自动化的布防会话）：
  读板，READY → UI 开批（侧边栏展开 → AXPress「新建任务」→「选择项目」勾选本
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
  E:\class\智慧水务\Synapse_remake，相对路径以此为基）」
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
- [ ] F-TESTREF-W3（src/shared 直接契约测试补齐）
- [ ] F-TESTREF-W4（flake 台账+INV-63/64，战役收官票；F-TESTREF-S1 若触发随火搭车，
      不触发不阻塞）

### 第三波·梯队二：风险清账+组织对齐（小票组同火；ELE 呈裁即停）

- [ ] F-SESS-01（导出会话悬挂修复，票面含态空间表）
- [ ] F-AIN-01（回灌事务包裹）＋可同火收 F-DEP-01
- [ ] F-DEP-01（postcss 显式化 [dep-change]；若未随上项同火则自领）
- [ ] F-ELE-01（Electron 升级预研，纯调研零 src 变更；**产出呈用户裁实施时机——
      呈裁后本项即勾，实施属后续波次不在本板**）
- [ ] F-ALIGN-01（组织定版对齐：R1~R6 真跑+ds-call v1→v2 切换呈批+ORG-SEG v2 重写
      含裁决 13 条文+词汇表补全+账本断流核查；制度+配置复合批，单火专注）

### 第四波·梯队三：既定战役（GEOM 战役大，设计链与实现分项）

- [ ] F-DEDUP-01（服务层去重微扩版：DomainError/原子写/清洗+app-file URL 单源）
- [ ] F-GEOM-01 设计链三跳（Kimi 拟定→deepseek 审核→GLM 终裁；设计书要件=
      态空间表+跨格序列+回落档语义裁决+六子域目录重组清单+净删行数记账+前史两
      条款承袭；定稿件独立提交）
- [ ] F-GEOM-01 实现（按批准设计书切执行票立案后**在本清单此行下追加子项逐票勾选**；
      验收=e2e 44 全绿不破+锚定回归网+净删行数记账）

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

### batch 4 — 2026-09-18（执行者会话：F-TESTREF-W1C e2e 脚手架单源＋W2 探针移出默认门，完成 2 项）
- claim: claim-1789673784-b4｜开始 19:36:24Z｜收口 20:17:53Z｜勾选 5→7。
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
- claim: claim-1789669600-b3｜开始 18:26:40Z｜收口 19:35:00Z｜勾选 4→5。
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
- claim: claim-1789666638-b2｜开始 17:37:18Z｜收口 18:24:12Z｜勾选 3→4。
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
- claim: claim-1789665003-b1｜开始 2026-09-17T17:10:03Z｜收口 17:31:09Z｜
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
