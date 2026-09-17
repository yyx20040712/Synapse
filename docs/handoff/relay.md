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
- heartbeat_utc: 2026-09-17T17:31:09Z
- claim: -
- no_progress_count: 0
- checked_total: 24
- checked_done: 3

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

- [ ] F-TESTREF-W1A（mock 工厂下沉，39 文件）
- [ ] F-TESTREF-W1B（几何桩下沉，22 文件/97 处）
- [ ] F-TESTREF-W1C（e2e 脚手架单源）＋可同火收 W2
- [ ] F-TESTREF-W2（探针 spec 移出默认门；若未随上项同火则自领）
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
