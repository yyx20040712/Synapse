# 批次接力状态板（机器门控文件——火按此行动，人可读）

> 项目：Synapse_remake ｜ 战役简报=docs/design/2026-09-18_complexity-governance-ruling.md
> （14 项用户裁决+五梯队编排 v1.1，下称《裁决书》；本板清单为《裁决书》§3 的执行投影，
> 排程冲突时以《裁决书》为准并回改本板）。
> 建板：2026-09-18 主控会话（用户指令「本会话不正式开工」——**板已备、火未布防**；
> 点火入口=用户显式 `/batch-relay`，或手动会话直接按本板清单领批，两径同规）。

- status: READY
- automation_id: automation-4a8cb784-c14b-4941-89f3-ffe1b0cec6e5
- shared_fire: true
- plan: docs/handoff/relay.md#执行清单（自含清单，收口 grep 本文件 `- [ ]` 计余量）
- spec: docs/design/2026-09-18_complexity-governance-ruling.md
- poll_interval_min: 10
- last_dispatch: 2026-09-19T08:20:24+08:00
- fire_budget_min: 120
- heartbeat_utc: 2026-09-19T01:07:30Z
- claim: claim-1789777255-b26（已收口 2026-09-19T09:07:30+08:00）
- no_progress_count: 0
- checked_total: 35
- checked_done: 32

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
- **hub 守卫（shared_fire 板，2026-09-18 布防补齐）**：本板挂全局轮转火——
  DONE/HOLD/无进展 3 连时**只置状态+终报，禁删火**（删火权归 hub 调度员，须全部
  成员板终态才收线）；调度员回合=hub 轮转：在 READY ∧ last_dispatch 距今 ≥30min
  的成员板中挑 last_dispatch 最老一块（`-`=从未发布视作最老；并列取火 prompt
  清单序），每回合至多开一批；本板 protocol 上述 CronDelete 字样在 hub 模式下
  一律以本守卫句为准。
- 禁止创建任何新自动化。停止事由（破坏性/安全敏感/仓外副作用 push/merge/发布/
  计划破碎到每条路都是猜）→ status: HOLD + 终报呈报（hub 板不删火）。

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
- [x] F-GEOM-01 实现（按批准设计书切执行票立案后**在本清单此行下追加子项逐票勾选**；
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
- [x] F-GEOM-01-G5（目录化 M2 time/ 4 件 §3.4 [locked-change][test-refactor]）
- [x] F-GEOM-01-G6（目录化 M3 anchors/ 13+1 件 §3.4——受锁面最重：锚定
      回归网 18 物理件+跨特性 import（lineage×2+open-paper-bus）；
      check-quality:99 行（lineage→ai-note-style）对账到行号（门二 P1-3c））
- [x] F-GEOM-01-G7（目录化 M4 interact/ 7 件 §3.4
      [locked-change][test-refactor]）
- [x] F-GEOM-01-G8（目录化 M5 panels/ 8 件 §3.4 [locked-change][test-refactor]；
      **开工前票面补字符串面预扫义务**——门一 W1-b/门二 P2-1：对迁移目标做
      readFileSync/字符串路径形态全扩展名预扫，命中行号写入票面受锁面清单；
      theme.test 对 G8 零命中（门二实测），config 面 check-quality:97
      ReaderNotesPanel 已在票面）
- [x] F-GEOM-01-G9（目录化 M6a view 渲染簇 14 件 §3.4
      [locked-change][test-refactor]；**同上字符串面预扫义务**——theme.test
      对 G9 零命中（门二实测），config 面 eslint:90-91 已在票面）
- [x] F-GEOM-01-G10（目录化 M6b view 工具簇 13 件 §3.4
      [locked-change][test-refactor]——eslint INV-16 四路径分步随迁收官；
      **票面受锁面预列恰 3 行字符串面（门二 P2-1 实测行号）**：
      theme.test.ts:292 AnnotationMenu.tsx/:293 AnnotationEditor.tsx/
      :485 TabBar.tsx——readFileSync 形态锁清单，不预列=必踩同族盲区）
- [x] F-GEOM-01-G11（战役收官：头注扫尾+净删/交互点记账+验收门全跑
      （e2e 一键全跑 45+默认门 43）+INV 终册+基线重冻结 [locked-change]；
      **收官时定 INV 册历史 reader 路径引用口径**（保留 vs 随迁刷新——
      门二 P2-2）；本票毕=本父行+registry 母票同步翻 done）

### 第五波·梯队四：第二波域归位（LAYER/TIME 小票组同火）

- [x] F-LAYER-01（settings 下沉；随票落 L1 锁线 [locked-change]）
- [x] F-TIME-01（时长链瘦身评估，产出呈裁不实施）＋可同火收上项
- [x] F-SENSOR-01（ai_sensor 域整理，契约面 [locked-change]）
- [x] F-EXPORT-01（corpus.export 拆件：状态机外提+IO/事件分离）

### 第六波·梯队五：文档+制度+存储（DOCGOV 必须晚于 ALIGN，已在波次序保证）

- [ ] F-DOCGOV-01（文档补课批+ROADMAP 退役两强制条款+多窗口 INV 登记，
      invariants.md 受锁 [locked-change]；ai-sensor 段随 F-SENSOR-01 终态回写）
- [ ] F-PROC-01（制度批：DoD 回写项/事故档回流段/治理指标+3/白名单冻结/M2 预防句/
      直调补记规则/裁决 14 入 methodology）
- [ ] F-STOR-01（audits 出库归档+manifest 同步 [locked-change]+AGENTS 三桶口径①
      修订呈批+本机 52M 清理）

> **P9 池（5 项）不入本板**——用户点单启项时按《裁决书》§3 P9 表立案并在此追加波次。
> 备选池与触发线=《裁决书》§5（含前史池承袭）。
> Electron 实施窗（**已裁 2026-09-19 用户选项 a**）：第六波后两票分离作为新波次入板
> ——A 票 better-sqlite3 v13（N-API 化）先行→B 票 Electron 44（44.4.1 支持至
> 2027-03-02；43 中间档不推荐照产研报告 §5）；实施前按裁决书 §6.6 复核矩阵时效。

## 批次日志（追加，勿改写）

### batch 26 增补二 — 2026-09-19 09:45（用户裁决：阅读时长功能移除——F-TIME-01 档位挂起项终结+F-TIME-02 立案）
- **背景**：增补一 Ruling ② 用户对 F-TIME-01 降档暂缓后追问「为什么会有统计阅读时长的业务需求」→主控解释（功能面=PaperDetailPanel 一行显示+ROADMAP P7E-E 预留点清扫正向条目；复杂度系 outbox 搭车非需求本身）→用户条件裁决：「其他文献管理软件会统计阅读时长吗？如果没有的话，把这个无意义功能取消」。
- **查证（WebSearch 双查）**：Zotero 无内置（官方论坛建议手动 read/unread 标签，计时需第三方插件 zotero_timer/WakaTime）；Mendeley/EndNote/ReadCube Papers 均无内置时长统计（聚焦管理/标注/引用）。**主流文献管理软件无一内置→条件成立，裁决生效=取消阅读时长功能。**
- **边界（主控预裁）**：删计时器（reading-time.ts 本体）+落库链（reading_seconds 列走 009 DROP COLUMN 新增 migration——008 已合入不可改=CI 锁硬规则/papers.repo updateReadPage 第三参/schemas secondsDelta 载荷/shared PaperDetail.readingSeconds）+显示行（PaperDetailPanel「阅读」Row+reading-time-format.ts）；**页码进度链零触碰**（last_read_page=「上次读到哪页」，ReadCube 等确有此功能，保留）——**outbox 机制保留**（P7X-02 后为页码三收尾口通道「页码旁路消除」，仅删时长载荷：OutboxEntry.seconds 字段/enqueueReaderProgress 三参化二参/chunkSeconds/复合 flusher 退化页码单发）；reading-time-* 件名保留防改名面扩大（头注说明沿革）。
- **F-TIME-01 档位裁决终结**：五档降档对象（时长链）不复存在——评估报告存档（docs/reports/2026-09-18_time-chain-prestudy.md），registry F-TIME-01 summary 追加终结注记；F-TIME-01 遗留 INV-57（时长账本唯一宿主）随 F-TIME-02 退役登记。
- **立案**：F-TIME-02（阅读时长功能移除，open/strong，中票，[locked-change][test-refactor]——受锁面=shared 模型+schemas+migrations 新增+受锁测试删改 unit 6 件+e2e 2 件+fixtures 路过面+test-surface 指纹门收紧豁免 reason=本裁决 rulingLink）；执行=本会话手动领批（火已停，用户直接指令=有效开工授权），三屋管道照走。


### batch 26 增补一 — 2026-09-19 09:20（用户裁决三项落板——b26 收口后主控呈裁，AskUserQuestion 三问）
- **Ruling ①（kimi 恢复补跑，batch 20 立/b24 b25 加实例）：销账不补跑（用户裁决）**——b20/b24/b25 三批 deepseek 兜底位门一结论接受，Ruling 闭合。依据=三批门二均独立复算未采信门一转述（b24 反证新增 P1-1=去相关工具面有效）+兜底位系 org-config 明文回退设计非降标+kimi 额度留后续票常态门一承载。历史立案行（batch 20/24/25 日志）保持原样勿改写，本段即闭合档。
- **Ruling ②（F-TIME-01 降档档位，batch 24 呈裁）：用户暂缓（「我再想想」）——挂起待裁**。不阻塞接力（第六波照常）；实施票暂不立案，用户后裁任一档（0/1/2a/2b/3）时落档随批执行——呈裁材料=docs/reports/2026-09-18_time-chain-prestudy.md §5 全文常在。
- **Ruling ③（F-ELE-01 实施时机，batch 8 呈裁）：用户裁决=选项 a 两票分离 A→B**——GEOM 已收口+呈裁获准=实施窗双条件满足，随第六波（F-DOCGOV-01→F-PROC-01→F-STOR-01）后作为新波次入板：A 票=better-sqlite3 v13（N-API 化 prebuilt 随 npm 发布，三运行时实测全过，独立低风险）先行→B 票=Electron 44（44.4.1 支持窗至 2027-03-02；43 中间档不推荐）；两票实施前均按裁决书 §6.6 强制复核 prebuild 矩阵时效（镜像目录清单+npm view 两探针，约 10 分钟）。板尾 Electron 实施窗行已同步更新为已裁态。


### batch 26 — 2026-09-19（执行者会话：第五波 F-EXPORT-01 corpus.export 拆件单票——**第五波毕**，完成）
- claim: claim-1789777255-b26｜认领 2026-09-19T00:24:30Z｜收口 2026-09-19T01:07:30Z｜勾选 31→32。
- 开场三态：B 态变体——脏面=调度员 last_dispatch 原子写两笔（07:30:05 发布后本会话迟认领约 50min>静默窗，00:20:24Z 下一班有效火再发布一笔=协议行为非故障，原子 claim 先到先得防双跑；随本批收口提交）；HEAD=batch 25 提交 5d85ffef6d 正确。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/门审矩阵/ORG-12 审包/health-scan/账本补记）、test-driven-development（用——行为重构票实现者六段简报内嵌红绿闭环+变异双红证）、verification-before-completion（用——终跑 verify 变量法亲验）；systematic-debugging 不加载（重构修法=票面定稿+主控侦察前置，无排障面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定（GLM5.3flash $max）；门一=**ops-gate1-k2 绑定（kimi k3 $max，zipoo——用户指令 k1 封顶 k2 承载；b24/b25 auth 失败未再现=5h 窗重置实证）**；门二=ops-adjudicator 绑定（deepseek-flash $max）——门审对实现者均异构成立。
- **交付（行为等价重构，9 文件 +354/−252 净+102——门二三径复算）**：①export-session-state.ts 骨架→真身 132 行（六态 ExportSessionPhase+ActiveSession 外提+createExportSessionState 四口闭包 begin/current/isActive/markTerminal——markTerminal identity 复核经门二 B 项独立论证=更安全非弱化+deferOutcome setImmediate 时序+态空间迁移表 12 行+跨格序列 8 行逐字随迁）；②corpus.export.io.ts 新件 104 行（盘面 IO 纯函数群：cleanRebuild 六步同序/writeCorpusMd/writeFulltext/readCorpusSha/writeFigure/finalizeManifest tmp+rename/removeManifestTmp——sha 两口径逐字随迁 INV-17）；③corpus.export.service.ts 442→300 行瘦身编排件（工厂签名+CorpusExportDeps/CorpusExportService 公开面零改=受锁 519 行测试零触碰即绿等价锁；承重锚 R12/通道判定/INTERFACE.md/实现裁决全保留）；④桶键拆分（b25 明示承接）：services/index.ts export_ 交并拆 export_+corpus_export 两键平铺（局部量先行恰一构+直传，b25 三键同型）+ipc/export_.ts 恰 2 handler 迁键（corpusItem/corpusSession）+bootstrap :238/:241 恰 2 处 abort 迁键+tests/utils/ipc-deps.ts 1 行拆 2 行（unlock→改→即时 apply 单链）；零触碰=api-surface/schemas（IPC 通道名——ADR-0017）/ipc 其余 6 handler/preload/renderer/e2e specs。
- **TDD 证据链**：基线锚 verify EXIT=0（open 5/locks 378/170·1744/指纹门 187·1789·5411·skip15）+定向 corpus.export.test 16/16（**主控简报误写 14 未实测——实现者机器计数勘正，下游拦截）**+ipc/export_.test 4/4 合跑 20/20+变异红证 M1（isActive 永真→F-SESS-01 advance 守卫用例红 EXIT=1 断言位 :389 manifest 存在性→cp 还原 diff 空→复绿 16/16）+M2（ipc corpusItem 键回退→tsc TS2339 :86,48 EXIT=2→还原复绿）全变量法物理在档。
- **门审（回炉 0）**：门一 k2 **PASS B0/W2/N5**——逐 hunk 零行为断言+K1~K8 落地+自裁 8 准 1 基本准；W1 终态 verify/e2e+W2 ipc 测试兼容=包内不可证伪类→收口机检销项（终跑 verify EXIT=0+主控 K4 双证 grep：旧键残留清零+新键恰四处接线+renderer 三处命中系 window.api IPC 通道面非桶键面）；N1 简报 stat +250/−252 系 add -N 前口径（真实 +354/−252 净+102）/N2 基线 main 产物 181.83 非 181.89/N3「内容零删」失准（实删文化层两 bullet，承重锚全保留）/N4 manifest 措辞/N5 ExportSessionPhase 零值层消费。门二 **GO_WITH_CONDITIONS P0=0/P1=2/P2=3/N=3**——26/26 hunk 独立复算等价（勘正门一 25 总数笔误——其自身枚举合计即 26）+**B 项勘正门一 K1 论证**（「至 markTerminal 间无 await」为假：advance 终局守卫→await finalizeManifest→markTerminal 窗真实存在，abort 交错可达——identity 复核在该窗防误清新会话单飞锁=正确设计，结论仍立）+W2 直证闭合（受锁 ipc 4 用例=bibtex×2/report/csv 根本不经迁键 handler）+净+102 三径一致（前缀算术+hunk 头 Σ+文件尺寸账）；P1 两条件收口全兑现=P1-1 终态验证亲验（fresh verify EXIT=0+open 4+e2e 两用例绿+impl-verify 入 staged）/P1-2 flake 对照留档（:157 重载格 3.8s 绿=未触发在册 count 5 的 60s 超时指纹，台账零 diff 复跑绿不销项）；P2 三条=io 件无独立变异（登记未来补）/计数勘误归档（25→26+ipc 8→9 处+「双构造 Blocker」对旧码不成立——spread 单次求值）/门一 K1 理由勘正；N-1 **INV-18/65「声明处」指针 stale（状态机表/中止守卫落点已迁 export-session-state.ts）——归 F-DOCGOV-01 承接（下波开工须携），本收口不扩面**+N-2 ExportSessionPhase/MANIFEST_TMP 零外部消费登记+N-3 文档净损失清单（信息在他处单源）。
- **机检终态**：翻票 FLIP_EXIT=0（FLIP_MOVED=1/RESIDUE=0/OPEN 5→4——探针锚定行首 `{ id: 'F-EXPORT-01'` 定义形态，b25 谓词教训兑现）；**终跑 verify B26_CLOSEOUT_VERIFY_EXIT=0**（open 4=恰 F-EXPORT-01 翻 done+locks 379 一致（378→379 flip 探针即时登记）+Test Files 170/Tests 1744+指纹门 187·1789·5411·skip15 零漂移+build 绿）；**e2e corpus-export.spec 2/2 纯绿 EXIT=0**（:31 全链 2.3s+:157 重载格 3.8s——G10 裁决义务 flake 台账首查已履行（count 5 指纹在手），未触发零新增）；**health-scan RED×0 WARN×0**（账本 79→82 终态后跑——序兑现）；账本 82 行=executor+gate1 k2+adjudicator 三行补记（findings 对象形，临时 .cjs 仓外用毕即删）。
- 教训三条：①**claim 脚本 v1 正则构造自伤**（字符串→RegExp 手工转义只处理括号漏 `+`——时间戳 `09+08` 的 + 成量词致 replace 空操作，而 count 守卫用另一套完整转义正则=守卫假绿 count=1 但替换无效，板面一度半 claim 态（RUNNING+新心跳+旧 claim 行）；v2 逐行前缀替换修复——**字符串替换一律禁手工转义正则，用 split/map/join 或行前缀匹配**，同段代码两套转义标准=自伤面）；②**主控简报计数未实测**（「14 用例」凭印象落笔被实现者机器计数 16 勘正——「计数落笔前实测」的主控简报侧违例，与门一 N1 stat 口径差同族：简报侧数字必须与取证同一时点同一口径）；③调度员 last_dispatch 双写时序观察（发布后执行者迟认领>30min 静默窗→下一班有效火合法再发布——协议行为，原子 claim 先到先得兜底双会话竞态；后到会话见 RUNNING+新鲜心跳即让位，无副作用）。
- Rulings 待用户：无新增（票内自裁含三件切分签名微调/SessionError 迁 state/io 函数面/markTerminal identity 复核/头注压缩口径等 9 条均经门一裁+门二逐条复核闭合；受锁面=ipc-deps.ts 1 行+manifest+b26-claim.mjs=单笔提交仅 [locked-change] 权限内——门二尾注预批：diff 含 src/** CI TR 范围闸白名单外禁加 [test-refactor]）。F-TIME-01 降档呈裁（batch 24）仍待用户，不阻塞。
- 无进展计数：归零（31→32 有进展）。**第五波毕（LAYER/TIME/SENSOR/EXPORT 四票全勾）。下批=第六波三票：F-DOCGOV-01（文档补课批——**开工须携门二 N-1 交接项：INV-18/65 声明处指针 stale 随迁 export-session-state.ts 的 sync**+ai-sensor 段随 F-SENSOR-01 终态回写）→F-PROC-01（制度批）→F-STOR-01（audits 出库归档+本机 52M 清理）。**

### batch 25 — 2026-09-19（执行者会话：第五波 F-SENSOR-01 ai_sensor 域整理单票，完成）
- claim: claim-1789774291-b25｜认领 2026-09-18T23:31:31Z｜收口 2026-09-19T00:11:09Z｜勾选 30→31。
- 开场三态：B 态变体——唯一脏面=调度员 last_dispatch 原子写（06:49:52→07:30:05 恰一行，本批发布动作预期态），随本批收口提交；HEAD=batch 24 提交 6b47689625 正确。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/门审矩阵/ORG-12 审包/health-scan/账本补记/换源状态机+审计兜底降级路径）；TDD=实现者六段简报内嵌等价红绿闭环（基线锚+变异红证 M1/M2——零行为重构票票面机制，无新用例：桶形状由类型系统守卫+单测三件直测工厂与桶解耦）；verification-before-completion（用——七关卡+终跑 verify 变量法亲验）；systematic-debugging 不加载（重构票无排障定位面——门一 k2 auth 失败处置走既有换源状态机非排障面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定（GLM5.3flash $max）；门一=**k2 绑定连续两次 Provider authentication failed（本批首两派）→外发 kimi-backup HTTP 403「5-hour usage limit」（run=20260918235225 实证）→归因 zipoo 5h 配额窗耗尽→deepseek 审计兜底位外发承载（deepseek-v4-flash run=20260918235238，b20/b24 先例第三现；k1=用户封顶禁派；门一/门二同族 deepseek 欠账如实登记）**；门二=ops-adjudicator 绑定（deepseek-flash $max）——门审对实现者均异构成立。
- **交付（零行为装配重构，恰三件）**：①services/index.ts——ServiceBundle.ai_sensor 交并拼盘拆三键平铺（ai_sensor/ai_notes_import/zcode_link，键名与服务件一一对齐）+IIFE/三 spread 消解+`readStatus: aiSensor.readStatus` 方法引用直传（构造序显式：aiSensor 局部量先行恰一构）+AI-06/07 错位注释删除归位；export_ 交并保持不动（F-EXPORT-01 承接）。②ipc/ai_sensor.ts——七 handler 对号迁键（ai_sensor×3/ai_notes_import×2/zcode_link×2，+6/−4）+头注两句。③tests/utils/ipc-deps.ts——桩工厂单行拆三行（unlock→改→即时 apply 单链）。**主控预裁五条**（拆域被 ADR-0017 用户裁决排除——api-surface 明文「通道名不变」/对齐=桶键对齐非通道前缀/契约面 api-surface+schemas 零触碰——票面「若动」条件句不触发/方法引用直传 this 安全=readStatus 体零 this/e2e 真链验证/协议版本字段备选池候选不顺带——行为变更≠零行为重构归后续票）；零触碰：三服务件逻辑与路径/preload/renderer/bootstrap/registry/e2e specs。
- **TDD 证据链**：基线锚 verify EXIT=0（170/1744）+七关卡全绿+变异红证 M1（ipc importAll 改回旧键→TS2339×1 对位→还原 diff 空）+M2（zcode_link 构造删 readStatus→TS2345 参数位+嵌套 TS2741 语义正文点名——实现者自裁勘正：简报预测首码 2741 实测 2345 参数位机制，未凑码号）+定向回归 3 文件/37 用例绿+终跑 verify FINAL_EXIT=0；**e2e 默认门 43/43 纯绿 EXIT=0（2.0m）——在册 flake corpus-export:157 未触发（3.9s 绿），flake-ledger 零新增**（P2-2 措辞口径：纯绿无需 G10 特例凭）；zcode-link.spec 6.0s 绿=readStatus 直传真装配链路运行级实证（门二 W2 强于探针论证）。
- **门审（回炉 0）**：门一 deepseek 兜底 **PASS_WITH_WARNINGS B0/W4/N4**——W1 spread 撞名遮蔽/W2 this 绑定/W3 构造序=「包内不可证伪」三连 →主控机检测销项（b25-w1-closure 探针 v2：三服务接口面方法名两两交集∅+readStatus 体 :283-304 this=0+三件 process/timer 代码面零命中——v1 探针正则失配产空集假绿已弃用留档 b25-w123-closure.log）/W4 manifest=门二亲核；N1 diffstat 勘正（ipc/ai_sensor.ts 实 +6/−4；+5/−5 错误值出处=主控审包侧拷问点 5 非实现者报告——门二 F 项归属勘正）。门二 **GO_WITH_CONDITIONS P0=0/P1=4/P2=4/N=5 回炉 0**——A~H 全表独立复算（超探针深核：W1 运行面三返回体复读两两∅+消费面全仓恰 7 行+manifest 376 结构亲读）；**P1 四条件全兑现**：P1-1 提交尾注仅 [locked-change] 禁 [test-refactor]（CI 范围闸 TR_RE 白名单无 src/**——带尾注必红；b24 先例 ci.yml:117-119 尾注自愿制+拆两提交不可行=中间态 typecheck 红）/P1-2 收口序修正（flip→终跑 verify；账本→health-scan——本批照修正序执行）/P1-3 locks 重认证（终跑 verify 内「377 个受锁文件与 manifest 一致」——锁链 374→375 claim→376 w1-closure→377 flip 链式值）/P1-4 staging 显式列件（含 gate2 报告/v1 废档/flip 探针双版本档/.log add -f）。
- **机检终态**：翻票 FLIP_EXIT=0（FLIP_MOVED=1/RESIDUE=0/OPEN_BEFORE=6→AFTER=5）；**终跑 verify B25_CLOSEOUT_VERIFY_EXIT=0**（open 5=恰 F-SENSOR-01 翻 done+locks 377 一致+Test Files 170/Tests 1744+指纹门 187·1789·5411·skip15 零漂移+build 绿产物恒等 index-D3egZtl2.js 1,392.72kB）；**health-scan RED×0 WARN×0**（账本 76→79 行终态后跑——序兑现）；账本 79 行=executor+gate1 外发+adjudicator 三行补记（403 exhaust 实录进 gate1 行 note；外发未带 --project 未自动落=主控补记全覆盖，临时 .cjs 仓外用毕即删，findings 对象形）。
- **翻票探针谓词盲区新变体（v1→v2 在档）**：flip 探针 v1 残留判定 `includes('F-SENSOR-01')&&open` 过宽——误配 F-DOCGOV-01 行 summary 尾部「ai-sensor 段随 F-SENSOR-01 终态回写」文字提名（翻票本身已正确生效 FLIP_MOVED=1/delta=1）；v2 锚定 `{ id: 'F-SENSOR-01'` 行首票定义形态后 RESIDUE=0 纯绿。教训=**票 id 在他票 summary 中被文字提名是 registry 谓词的 nomination 噪声面——票行断言一律锚定 `{ id: '<ID>'` 行首定义形态**（G10 门二谓词盲区族的 registry 侧新成员）；v1 输出留档 b25-tickets-flip-v1.log（探针迭代证据链完整——G9 教训③义务）。
- P2 四条勘正落笔（门二）：376→377 链式值口径（勿复述「恰三项」）；e2e 记录=纯绿不写特例凭（P2-2）；N1 归属=审包侧非实现者（P2-3 中性句）；变异 log 命令面与 UNLOCK/APPLY_EXIT 无独立档——以门链 log 兜底不复述独立证据（P2-4）。N 五条登记：N-3 ai-notes-import 头注「四通道委托」历史句归 F-DOCGOV-01 ai-sensor 段回写（registry:316 已载）；N-4 W1 探针 v2 正则仅识别 2 空格 name( 形态（箭头属性风格接口会漏——后续探针模板句）；N-2 收口板面已用真实时刻（本批兑现）。
- Rulings 待用户：无新增独立项；**kimi 恢复补跑 Ruling（batch 20 立）新增 b25 实例**（k2 绑定 auth×2+外发 403 双证——zipoo 5h 窗耗尽，恢复后是否补跑门一由用户裁）。票内自裁（预裁五条/M2 码号勘正/注释删除落法/e2e 纯绿口径）均经门一裁+门二复核闭合。
- 无进展计数：归零（30→31 有进展）。**第五波余一项。下批=F-EXPORT-01（corpus.export 拆件：导出会话状态机六态外提独立件+IO/事件协议分离——INV-17/18 幂等 sha/单飞语义不破+e2e corpus-export 全链不破；中票一火一票；**开工须携 flake 台账 corpus-export 线 count 5 指纹首查——门二 G10 裁决义务，五 rerun 档 batch 22 在库**）→第六波 F-DOCGOV-01/F-PROC-01/F-STOR-01。**

### batch 24 — 2026-09-19（执行者会话：第五波 F-LAYER-01+F-TIME-01 小票组同火，完成）
- claim: claim-1789771843-b24｜认领 2026-09-18T22:50:43Z｜收口 2026-09-19T07:46:00｜勾选 28→30。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/门审矩阵/ORG-12 审包/health-scan/账本 v3 补记/换源状态机+审计兜底降级路径）；TDD 双轨（F-LAYER-01=实现者六段简报内嵌红绿闭环+变异红证 M1/M2；F-TIME-01=纯调研零代码无 TDD 面——batch 8 F-ELE-01 先例）；systematic-debugging 不加载（下沉修法=票面定稿+主控侦察前置+方案 B 裁定；评估票无排障面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定（GLM5.3flash $max）；门一=**k2 绑定连续两次 Provider authentication failed（668/610ms 即死）→log-triage --health 归因 kimi-backup 5h 配额窗耗尽（22:59:38 403「5-hour usage limit」实证）→deepseek 审计兜底位外发承载（ds-call-v2 --source deepseek，batch 20 先例；k1=用户封顶禁派；**门一/门二同族 deepseek 欠账如实登记**——kimi 恢复补跑 Ruling 新增实例 b24）**；门二=ops-adjudicator 绑定（deepseek-flash $max）——门审对实现者（GLM5.3flash）均异构成立。
- **交付 F-LAYER-01（零行为下沉+L1 锁线）**：①settings.service.ts 骨架→真身 101 行（readSettings zod 校验/损坏回退默认+get 尽力写回/set 原子写/diagNetwork 并发 ping——逐行同构下沉，头注五层规约含裁决书指针+A-1 修正 uiScale 默认值句）；②ipc/settings.ts 83→36 行薄分发（三 handler 纯委托+构造点=ipc 工厂；**方案 B=主控侦察裁定不挂 ServiceBundle**——settings 无 repos 依赖+挂桶需改受锁桩工厂 tests/utils/ipc-deps.ts 超票面受锁面，IpcDeps.userDataDir/ping 现成注入面）；③eslint.config.js services 块 group 补 'electron'（**L1 实勘勘正：票面「三处新红线」中 shared:136/db:154 系既有态，本票只补 services 一处=三域闭合**——G4 实勘先例口径）；受锁面恰=票面预列单件，桩工厂/tests/**/bootstrap/services/index.ts 零触碰。
- **交付 F-TIME-01（评估呈裁票）**：docs/reports/2026-09-18_time-chain-prestudy.md 骨架→评估报告全文——全链盘点（time/ 四件 829+显示件 13+scroll-progress 367 关联+测试 1,202，wc 实测）；**核心发现=outbox 是页码+时长双账本共用通道**（三收尾口单入队点 setup:84——拆除牵连页码链非纯时长票）+通道性质错配（at-least-once 为不可靠通道设计 vs 本地 IPC+同步 SQLite）+ledger 内存态才是崩溃主暴露面；四选项呈裁（0 维持/1 拆持久层/2a 全拆回 P7X-02 前直发**主推荐 −1,072 行纯删票**/2b 加内存重试/3 tick 即发极简 −600 需 mini 设计链）；口径对照句（票面「约 1,100」=战役群 1,196 口径）。
- **门审（回炉 0）**：门一 deepseek 兜底 **PASS B0/W3/N9**——W3=报告 −1,032 数字矛盾（成分和 1,072）+缺 1,100 口径对照+覆盖声明过强（diagNetwork 包内不可证）→主控三修（−1,072+对照段+2a/2b 拆档）+N 证据销项（A-3 ESLint group 精确名匹配——门二审以 rule 源码实读闭环：node_modules no-restricted-imports.js:311-314 ignore 语义无子串误伤）。门二 **GWC P0=0/P1=3/P2=3/N=6**——A~D 全表独立复算（L1 三域亲读/M2 红证 2-failed 用例粒度精确对位=M2.log:6-10+用例 1/2 fallback 敏感推演）+**新发现 P1-1：reading-time.ts:61 re-export 有受锁测试消费面**（reading-time.test.ts:5-9——报告「零风险微删」失实，删行=tests 面 [locked-change][test-refactor]）→主控勘正 §1.4/§3-E 两处落妥；同族欠账裁决「不影响本批判定力」（门二全部裁决自原始件重推未采信门一转述+反证新增 P1-1=去相关工具面有效）；P1 三条件全兑现（P1-1 Edit/P1-2 终跑 verify/P1-3 e2e）。
- **机检终态**：基线 verify EXIT=0 锚（open 8/locks 372/170·1744/指纹门 187·1789·5411·skip15 零漂移）+实现者 verify EXIT=0；翻票 FLIP_EXIT=0（FLIP_MOVED=2/RESIDUE=0/OPEN 8→6）；**终跑 verify B24_CLOSEOUT_VERIFY_EXIT=0**（含全部修正面：open 6=恰双票翻 done+locks 374=373+flip 探针+指纹门零漂移+170·1744+build 绿——renderer 产物恒等 index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB，main 产物 181.89kB 重构预期态不适用恒等断言）；**e2e 默认门 43/43 纯绿 EXIT=0（1.9m）——在册 flake corpus-export.spec:157 未触发**（门二 P1-3 第一分支纯绿收口，禁写约束解除）；**health-scan RED×0 WARN×0**（账本 76 行终态后跑——G9 教训②序兑现）；账本 73→76 行（executor+gate1 外发+adjudicator，主控补记仓外临时 .cjs 用毕即删，findings 对象形）；锁链 371→374（372 claim→373 heartbeat→374 flip 每步即时登记）。
- P2 三条勘误留痕（门二）：P2-1 主控简报头「403 双证在档 b24-gate1-dispatch.log」引用失准——403 实证在 log-triage 输出（未入库）+org-ledger:74-75，批次日志本句即勘正档；P2-2 impl 报告锁数括注「HEAD 口径 372」勘正=371→372→373 链；P2-3 行号漂移勘记（gate2-brief D.3 reading-time.ts:52→实 :41-43；报告 §1.2 reader.service.ts:75-77→实 :76-78——内容均正确）。
- 教训两条：①**门二预批序 5/6 的 relay 回写时点**（预批序把 relay 回写放提交后=产生未提交脏面，主控按 b22/b23 先例合并为「回写→一次提交」——预批序与宪法「收口毕未跟踪面清零」冲突时以先例惯例执行并在日志留痕）；②**评估票的消费面扫描必须含 tests/**（门二 P1-1：re-export 零消费判断只扫了 src/ 生产面——受锁测试 import 面是独立消费通道，「零消费」类断言须双面扫描后在册）。
- Rulings 待用户（+1）：**F-TIME-01 降档档位**（报告 §5：T1 五档 0/1/2a/2b/3 主推荐 2a——全拆 outbox 回 P7X-02 前直发形态 −1,072 行纯删票+INV-57 主锚零触碰；T2 排期随下波）——呈裁材料=报告全文+INV-57 现文；已规划呈裁节点口径=产出即勾项不阻塞接力（1 项<2 不触发 HOLD）。另：kimi 恢复补跑 Ruling（batch 20 立）本批新增 b24 实例。
- 无进展计数：归零（28→30 有进展）。**第五波过半（LAYER/TIME 毕）。下批=F-SENSOR-01（ai_sensor 域整理，契约面 [locked-change]）→F-EXPORT-01（corpus.export 拆件：状态机外提+IO/事件分离——**开工须携 flake 台账 corpus-export 线 count 5 指纹首查——门二 G10 裁决义务**）；小票组同火或单火按票面裁量；若用户已裁 F-TIME-01 档位则实施票随下波入板。**

### batch 23 — 2026-09-19（执行者会话：第四波 F-GEOM-01-G11 战役收官票+母票 F-GEOM-01 翻 done——**GEOM 战役全波毕**，完成）
- claim: claim-1789767847-b23｜认领 2026-09-18T21:44:07Z｜收口 2026-09-19T06:38:39｜勾选 26→28。
- 开场三态：B 态变体——b22 会话并行存活非僵死（本会话侦察期其完成最后提交 62ef3802ad 05:41:06+08 并吸收主控已暂存的 relay 终态）；恢复 verify 转 G11 基线锚（b22-recovery-verify.log EXIT=0：open 10/locks 368/170·1744）。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——三屋派发/门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；TDD=验证探针先行等价（netstat+INV 十三锚验证——B1 回炉后册文扫描段补强为真防线）；systematic-debugging 不加载（收官记账票无排障面——B1 定位由对抗审给出）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定（GLM5.3flash $max，两轮=实现+回炉 #1）；门一=ops-gate1-k2 绑定（kimi k3 $max，zipoo——用户指令 k1 封顶 k2 承载续）；门二=ops-adjudicator 绑定（deepseek-flash $max）——门审均异构于实现者。
- **交付（零行为收官票）**：五义务=①头注扫尾（view/PdfPageCanvas :18-21+:36-40 两处陈旧句重写——现行 9 处消费面实测清单落注+g10-oneway.mjs 头注谓词盲区限制说明=门二 G10 P2-2 销项）；②记账报告真身 docs/reports/2026-09-18_f-geom01-campaign-closeout.md（净删双口径：域分组 71 files +313/−309 净+4+逐票 Σ+428/−424+wc 70/11,815 vs 69/11,791 Δ+1f/+24——净+4 vs 预测−20~−80 构成五项诚实分析+毛额 ±115 链式双计机制注记（门二 P2-2）；交互点 §2.6 表 5→4+1 逐点现行锚；对账债三项销（§3.2 行数口径 ×G5-G10 无尾换行 +69 机制全量抽验复现+§5.1 计数差 1790/5417→1789/5411+PdfPageCanvas 146=188−42））；③INV 终册（11 处平铺旧径→域前缀+INV-47/58/68 声明处裸名加前缀+「路径口径」小节=锚定列随迁刷新/历史叙述保留（销 b12 门二 P2-2 悬置）+§5.4 相容确认三注记）；④基线同值重冻结 183/1757/5334→187/1789/5411/skip15（零测试面变更预期态；diff 审计 875 行；exemptions 2 条 G2 旧条目主控裁保留=惰性桥接审计史——门二 G 裁成立：checker 新基线零咨询无法静默掩蔽）；⑤母票联动（registry G11+F-GEOM-01 双翻 done）。
- **验收门（票面 §5.1 底色全达）**：e2e 双门=默认门 **43/43 绿 EXIT=0**+一键全跑 **45/45 绿 EXIT=0**（2.1m）——串行跑防负载敏感 flake 自扰；**在册 flake（corpus-export.spec:157 台账 count 5）双门未发=门二 G10 特例边界声明凭未触发使用纯绿收口**；flake-ledger 零 diff；锚定回归网 18 文件/211 用例绿；**构建产物恒等链第八票**（sha256 三件 9c3b8b84…/dcace2e7…/1baa1844… 门二与 g8/g10 前链档 64 hex 逐位亲比全同——门一 N4 前链不确定项闭合）。
- **门审（回炉恰 1 次）**：门一 k2 **FAIL B1/W1/N5**——B1=INV-47 声明处全路径漏刷（「11 处」计数失实三处书面+探针硬编码意图态=漏网根因）→回炉 #1 四件（第 11 处补刷+探针册文扫描段补强 v1 档保留 v2 新落+残句顺改+N2 两侧非代码=0 严格同域销项）+复验 verify EXIT=0+哈希逐位同；N1-N5 转门二持仓。门二 **GWC P0=0/P1=3/P2=4/N=4 回炉 0**——A~J 全表独立复算（未采信转述：sha 亲比/记账双 route/13 锚全核/exemptions 惰性论证=亲读 checker 咨询路径）；P1 三条件全兑现：P1-1 flip 脚本入锁 371（锁链 368→370 executor 两探针→371 flip）+P1-2 序勘正（账本先于 health-scan——主控简报序缺陷被门二拦，G9 教训②复现防线生效）+P1-3 名册勘误（check2 系 .log 非 .mjs+staging 补 flip/registry/relay）；P2 四条=尺寸口径注记（vite 展示值 vs 字节 1,402,437/59,923/1,375,838——已落报告 §3）+毛额 ±115 机制句（已落 §1.2）+删侧 131 越上界 +11 骨架口径注记（已落 §1.4）+基线侧 raw log/探针判定面边界两条归后续票。
- **机检终态**：终跑 verify **G11_CLOSEOUT_VERIFY_EXIT=0** 变量法物理在档（open 10→8=恰双票翻 done+locks 371 一致+Test Files 170/Tests 1744+指纹门绿+build 产物同名）；翻票单跑 FLIP_EXIT=0（FLIP_MOVED=2/RESIDUE=0）；**health-scan RED×0 WARN×0**（g11-healthscan.log——账本 68→72 终态后跑，P1-2 序兑现）；账本 72 行（executor 两轮+门一 k2+门二，主控补记仓外临时件用毕即删，findings 对象形）。
- 证据件入库（scripts/audits/，25 件 g11-*+b22-recovery-verify.log）：impl-brief/impl-report（含 §8 回炉段）/gate1-brief/report/diff.patch/gate2-brief/report/diff.patch 八 .md+.patch；netstat+inv-anchor-check+tickets-flip 三 .mjs+对应 .log；verify 双档+build-hash 双档+anchored-net+baseline-diff+closeout-verify+healthscan+e2e 双门 .log——.log 系 git add -f 入库（.gitignore *.log 拦截按 batch 8 教训③处置）。
- 教训三条：①**开场三态 B 判定须防「并行存活」误判**（b22 非死于提交前而是与本会话并行收口——HEAD 推进+暂存面消失=活会话信号；恢复动作前先 git log 时点核对；本批 b22 的 commit 吸收了主控暂存的 relay 终态，无害但属侥幸）；②**简报序也是审计面**（门二 P1-2：主控收口序简报把 health-scan 写在账本前=G9 教训②的简报侧复现，被门二对先例逐条拦下）；③**探针验意图 vs 验文本**（门一 B1 根因：探针硬编码目标态路径验存在性，册面错字零感知——文本面断言必须从被验文件提取实测值再断言，禁硬编码预期值）。
- Rulings 待用户：无新增（票内自裁含豁免 2 条保留（惰性桥接审计史）/INV 路径口径主控裁（锚定列刷新+叙述保留——b12 悬置销项，门二 A 复核）/e2e 串行口径/P2 后续票两条；受锁面=invariants/oneway/baseline/manifest+探针三件=[locked-change] 权限内；零 tests/** 触碰=无 [test-refactor] 尾注）。
- 无进展计数：归零（26→28 有进展）。**第四波 F-GEOM-01 全波毕（设计链+G1~G11 十一票+母票 done）。下波=第五波·梯队四第二波域归位：F-LAYER-01（settings 下沉，随票落 L1 锁线 [locked-change]）＋可同火 F-TIME-01（时长链瘦身评估产出呈裁不实施）；F-SENSOR-01/F-EXPORT-01 随后（F-EXPORT-01 开工须携 flake 台账 corpus-export 线 count 5 指纹首查——门二 G10 裁决义务）；小票组同火口径见执行路由段。**



### batch 22 — 2026-09-19（执行者会话：第四波 F-GEOM-01-G10 目录化 M6b view 工具簇 13 文件迁移·view 域收官步，完成）
- claim: claim-1789764128-b22｜认领 2026-09-18T20:42:08Z｜收口 2026-09-18T22:10:00Z｜勾选 25→26。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/
  门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；TDD=实现者六段简报内嵌等价
  红绿闭环（基线锚+变异红证 M1/M2——零行为迁移票票面机制）；systematic-debugging
  不加载（迁移修法=设计书 §3.4 定稿+派发前全边侦察前置，无排障定位面——e2e flake
  处置走既有立案机制非排障面）。派发档位：主控=GLM5.3 max（本会话）；实现者=
  ops-executor 绑定（GLM5.3flash $max）；门一=**ops-gate1-k2 绑定（kimi k3 $max，
  zipoo——用户指令 2026-09-18 调度员转达 k1 封顶 k2 承载续，本班承载正常）**；
  门二=ops-adjudicator 绑定（deepseek-flash $max，**两轮=终审+e2e 硬条件补充复核**）
  ——门审均异构于实现者。
- **交付（零行为纯迁移·view 域收官步）**：M6b=view 工具/搜索/标注 UI 簇——
  AnnotationEditor(148)/AnnotationMenu(81)/PageColumnView(72)/ReaderPage(163)/
  ReaderSearchBox(125)/ReaderShortcuts(123)/ReaderToolbar(232)/SearchHighlightLayer
  (159)/TabBar(163)/reader-search.store(202)/reader-search(162)/reader-shortcut-
  handlers(42)/useReaderSearch(104) 十三件 1776 行（wc 实测；13 件对设计书 §3.2
  各 +1=无尾换行口径 Σ1789，G11 对账债同 G5-G9 惯例）迁 reader/view/（git rename
  12 RM+1 R——ReaderSearchBox 100% 纯 R）；**迁毕 reader 根=纯目录六子域零文件
  （收官核验）**。改写面=A 深度修正恰 33 行（anchors 5+interact 1+state 11+time 2
  +shared 上跨 7+`./view/X` 域内化 7）+同根零改写 11 行=44 相对 import 全量闭合
  （另有 @shared 别名 4 行位置无关）+B src 消费 1（App.tsx:7）+C view 域中间态边
  闭合 6 行（G9 声明 6 边兑现：PageColumn:32/PagesOverlay:50/AnnotationPopups:35-
  36/ReaderPageView:37+40 `../X`→`./X`）+D tests 21 行/14 件（import 18 行/13 件+
  **theme.test 字符串面恰 3 行 :292/:293/:485——板注预列与侦察双吻合兑现**）+E config
  零动作（eslint 四路径已全迁完 :89/:92=M1+:90/:91=M6a——票面「收官步」表述系
  起草预期勘正在档）+F registry 8 行（7 旧票 file 随迁+G10 自身翻 done，主控
  收口职责）。
- **TDD 证据链**：基线 verify EXIT=0 锚（g10-verify-baseline.log：open 11/locks
  366/170 文件 1744 用例/指纹门 187·1789·5411·skip15 零漂移）；中探针 EXIT=2 恰
  18 错全 tests 面（13 件 1:1，src 面 0 错）；变异红证 M1（App.tsx:7 回退→TS2307
  EXIT=2→cp 还原 diff 空→复绿）+M2（tab-bar.test:14 回退→vite 模块解析红 EXIT=1
  →还原→复锁→12/12 复绿）全变量法物理在档；**构建产物哈希恒等第六票**（index-
  D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB+pdf.worker 三产物 PRE=POST
  同名同尺寸同 sha256——**且与 G2 e2e 43 全绿时点 bundle 同名同尺寸，e2e flake
  因果排除承重证据**）；§3.1 单向核验（实现者 g10-oneway v2+门二全域独立复扫+
  主控收官重扫三重）：reader 根驻留 0+反向边 0+view 域 `../X` 直指根件 0（中间
  态边清零）+旧径五通道 0；出边 {anchors 19,state 29,panels 1,interact 2,time 2}
  /intra 50/up 11 与 G9 终态增量逐项吻合。
- **门审（回炉 0）**：门一 k2 **PASS_WITH_WARNINGS B0/W2/N5**——61/61 对逐 hunk
  零行为断言+计数 A33/B1/C6/D21/61 总行/32 文件独立复算全中+theme 字符串面核验+
  sed 精确名单包内内证（reader-double-page.test:360 既有 view/PageColumn 未被
  误改）；W1=第 11 行同根不可见（主控 grep 实测销项 g10-w1w2-closure.log：逐件
  计数和=44+物理定位 ReaderSearchBox:31——100% rename 无 hunk=盲区根因）/W2=
  三项包外断言（W2a e2e 旧径亲扫 0 销项/W2b oneway 档随收口入库+门二亲扫/W2c
  wc 1776 门二独立复算命中）。门二 ops-adjudicator **GO_WITH_CONDITIONS P0=0/
  P1=1/P2=3/N=5**——25 条裁决表独立复算+13 log EXIT 标记亲读+收官四件全域复扫
  （`from '../` 68 处全类别枚举）+锁链 364→367 复推+tickets 清红规则级推演+
  收口序 H 预批；**P1-1=tickets 红行数转述失实**（实现者报告「恰 8 行」实为物理
  16 行=8 文件不存在+5 占位引用+3 guardedDescribe 失配的同一 8 行 registry 陈旧
  路径级联——8 行更新动作正确，收口以 16 行为准勘正，终跑后 16 行全清+open
  11→10 落档）；P2-1 锁链步进勘正（364→365 b22-claim→366 g10-recon→367 g10-
  oneway）/P2-2 探针谓词盲区注记归 G11/P2-3 行数口径 G11 债。
- **e2e 专项（收口序③+门二补充复核）**：默认门套跑 **42/43 绿**+1 failed=
  corpus-export.spec:157 F-SESS-01 重载格（60s test timeout，套跑 2.9m 偏慢同
  设计书 §5.1 观测态）；定向复跑×2 同值满 60s 红（同 spec :31 全链用例历次恒绿）
  ——**同用例 2 次触发宪法立案线**；放宽 --timeout=180000 定向 **2 passed 仅
  6.8s**（:157 实耗 4.1s 未触任何预算=快样本证功能无硬断，**禁记因果**——门二
  新条件①）；复跑 #4 默认 60s 再红（指纹=4 红 1 绿）。**门二补充复核裁决（新
  事实补呈后）：「e2e 43 绿」按「42/43+1 例在册 flake（F-EXPORT-01 承接）」口径
  视为满足，NO-GO 不成立**——理由=bundle 三产物 sha256 与 G2 43 绿时点恒等
  （因果排除亲核）+flake-ledger 在册前置（count 4，resolution 已切 F-EXPORT-01
  同场）+指纹合规（即刻归档）；三新条件全采纳：①快样本禁记因果 ②收口文档禁写
  「43 绿」须记 42/43+在册 flake+四 rerun 归档+F-EXPORT-01 携指纹 ③「零进程
  残留」无在档输出不作论据（以 bundle 恒等+spec 面无关承重）；**先例边界声明
  凭=「在册 flake+bundle 恒等排除+承接票在排程」三条件同满足之特例，非「gate
  红可放行」通例**。flake-ledger.json corpus-export 线 count 4→**5**+本批指纹
  （同值=满 60s/序列位=全套 #4 定向 #2/4 红 1 绿/复跑绿不销项/「定向也红」
  升级观察=时序敏感竞态嫌疑第二段再发起 streaming 起步）——**F-EXPORT-01 开工
  须携本批指纹首查**（五 rerun 档 g10-e2e-*.log 全入库）。
- **机检终态**：收口终跑 verify **G10_CLOSEOUT_VERIFY4_EXIT=0** 变量法物理在档
  （g10-closeout-verify4.log，Node 24.20.0：open 11→10=恰 G10 翻 done+tickets
  16 行全清+Test Files 170/Tests 1744 恒等+指纹门 187/1789/5411/skip15 零漂移+
  build 绿产物同名）；**终跑四连红实录=主控收口探针三连自伤**（①g10-tickets-
  flip.mjs 写完未即时入锁=locks:check 红——G4 教训①同族再犯；②flip 探针两处
  未用变量（before/swapLine 起草废代码）=lint 红——G7 教训①同族再犯；③账本
  临时件 g10-ledger-append.cjs.tmp.cjs 仓内驻留撞 eslint no-require-imports
  =lint 红——移仓外 ~/.zcode 后绿；教训①见下）；registry 翻 done 单跑
  FLIP_EXIT=0（FLIP_MOVED=8/RESIDUE=0/G10_DONE=true，恰 8 ins+8 del）；e2e
  默认门=E2E_APP_EXIT=1（42/43+在册 flake 口径——门二复核认可，非「43 绿」）；
  **health-scan RED×0 WARN×0**（g10-healthscan.log，账本 65→68 终态后跑——
  G9 教训②序正确兑现）；账本 68 行（executor+门一 k2+门二两轮合一行，主控
  补记仓外临时 .cjs 用毕即删）；锁链终态 **368**（364→365 b22-claim→366
  g10-recon→367 g10-oneway→368 g10-tickets-flip——每步即时登记，manifest
  与 verify4 同步）。
- 证据件入库（scripts/audits/，39 件 g10-*/b22-*，提交前 ls 实测勘正——初写
  41 系计数笔误）：b22-claim+recon+oneway+tickets-flip 四 .mjs+对应 .log
  （w1w2-closure/closeout-rescan 系 bash 重定向产 .log 无 .mjs）；impl-brief/
  impl-report；gate1-brief/report/diff.patch；gate2-brief/report（含补充裁决段）；
  verify-baseline+closeout-verify×4 五 .log；midprobe/mutation1+restore/mutation2+
  restore/build-hash/locks-oneway/gitmv-status/rewrite-d/final-status/impl-verify/
  tickets-flip/healthscan .log；e2e 专项六 .log（appgate+e2e-build+corpus-rerun×4）
  ——.log 系经 git add -f 入库（.gitignore *.log 拦截按 batch 8 教训③处置）。
- 教训三条：①**主控收口段探针/临时件三连红**（flip 探针未即时入锁+未用变量
  废代码+账本临时件仓内驻留撞 lint——三宗同根：**收口段新增一切脚本件须
  「写前 lint 自查+写毕即时入锁+临时件一律置仓外」三动作同批**，G4/G7 教训
  的收口段变体合并句）；②**e2e 定向复跑升级处置先例**（定向也红时禁硬凑
  「复跑绿」——放宽预算取「功能无硬断」快样本证据+新事实补呈终审岗复核
  硬条件口径，由门二更新裁决而非主控自裁放行；flake-ledger 指纹升级记录+
  承接票开工携指纹义务落档）；③**tickets 红行数两视角**（registry 改动行数
  8≠check-tickets 物理红行数 16——规则级联（文件不存在/占位引用/guardedDescribe
  失配）使一行陈旧 file 产生多行红；「计数落笔前实测」的报告侧新变体：红行数
  以工具物理输出为准）。
- Rulings 待用户：无新增（e2e 口径经门二补充复核裁决闭合——特例边界声明凭
  在档；票内自裁含票面 eslint 收官步勘正/中探针时点语义/探针 v1→v2 谓词收敛
  等均经门一裁+门二复核；受锁面 21 行=[locked-change][test-refactor] 双尾注
  权限内）。
- 无进展计数：归零（25→26 有进展）。**下波=F-GEOM-01-G11（战役收官票：
  头注扫尾+净删/交互点记账+验收门全跑（e2e 一键全跑 45+默认门 43）+INV 终册
  +基线重冻结 [locked-change]；收官时定 INV 册历史 reader 路径引用口径（门二
  P2-2）+G11 对账债清单（设计书 §3.2 行数 +1 口径×G5-G10 累计+§5.1 计数差+
  PdfPageCanvas 146 vs 188+探针谓词盲区头注 P2-2 顺手补）；本票毕=父行
  「F-GEOM-01 实现」+registry 母票同步翻 done；**e2e 全跑 45 含 corpus-export
  flake 线——F-EXPORT-01 承接前的跑法口径（flake 例处置）开工时按门二特例
  边界声明凭预演或呈报主控**；大中票一火一票。）**


- claim: claim-1789761018-b21｜认领 2026-09-18T19:50:30Z｜收口 2026-09-18T20:48:00Z｜勾选 24→25。
  （本批窗口内两调度员事件：增补四=用户再删火+增补五=新会话换防新火 automation-4a8cb784——
  均声明在途 b21 不受影响，claim 全程未被动。）
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/
  门审矩阵/ORG-12 审包/health-scan/账本 v3 补记/换源状态机认知）；TDD=实现者六段简报内嵌
  等价红绿闭环（基线锚+变异红证 M1/M2——零行为迁移票票面机制）；systematic-debugging
  不加载（迁移修法=设计书 §3.4 定稿+派发前全边侦察前置，无排障定位面）。派发档位：
  主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定（GLM5.3flash $max）；门一=
  **ops-gate1-k2 绑定（kimi k3 $max，zipoo——用户指令 2026-09-18 调度员转达 k1 封顶
  k2 承载续；本班 5h 窗口已重置正常承载，G8 期 403 未再现）**；门二=ops-adjudicator
  绑定（deepseek-flash $max）——门审均异构于实现者。
- **交付（零行为纯迁移）**：M6a=view 渲染簇——PageColumn(164)/PageBox(64)/PagesOverlay(132)/
  PdfPageCanvas(146)/TextLayer(156)/text-layer.css(116)/page-column-geometry(174)/
  usePageColumnScroll(66)/usePageLazyWindow(83)/scroll-progress(367)/AnnotationLayer(151)/
  AiAnnotationLayer(234)/AnnotationPopups(202)/ReaderPageView(157) 十四件 2212 行（wc 实测；
  13 件对设计书 §3.2 各 −1=无尾换行口径登记 G11 对账债；PdfPageCanvas 146 vs 188 系 G1
  类型下沉已削非本票面）迁 reader/view/（git rename 14 对相似度 94-100%）；改写面=A 深度
  修正恰 44 行（state 18+anchors 14+panels 1+interact 1+上跨 api/shared 4+**reader 根驻留
  M6b 件 ../X 6**——PageColumnView/SearchHighlightLayer/AnnotationEditor/AnnotationMenu/
  TabBar/ReaderToolbar，M6a/M6b 拆分声明中间态边）+B src 消费 7 行/3 件（reader-search:32+
  PageColumnView:25-27+ReaderPage:50/54/58）+C tests 30 行/16 件（vi.mock 5）+D 跨特性 0
  +E config 2 行（eslint.config.js:90/91——INV-16 四路径分步随迁第 3/4 步）+F registry 随迁
  12 行+G9 翻 done（file→view/PdfPageCanvas.tsx；另消 4 条镜像面红=迁移件头注提名 done 票
  失 file 锚豁免）+G 字符串面零动作（板注预扫义务兑现：readFileSync/字符串形态全仓 0 命中，
  theme.test 对 G9 零命实证 g9-recon.log）。
- **TDD 证据链**：基线 verify EXIT=0 锚（g9-verify-baseline.log：206 票 open 12/locks 360/
  170 文件 1744 用例/指纹门 187·1789·5411·skip15）；七关卡（lint/typecheck/test 170/1744/
  build/quality/locks 364 全 EXIT=0；tickets 红=registry 收口面预期态）；中探针 EXIT=2 恰
  56 错全 tests 面（src 面 0 错；open-race 仅 vi.mock 面=tsc 盲区由套件绿闭合）；变异红证
  M1（ReaderPage:58 回退旧径→TS2307 EXIT=2→cp 还原 diff 空→复绿）+M2（page-column.test:23
  回退→模块解析红 EXIT=1→还原→复锁→24 passed 复绿）全变量法物理在档；**构建产物哈希恒等**
  （index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB+pdf.worker 同名——G5-G9 恒等链
  第五票）；§3.1 单向核验（g9-one-way v2）：view→{anchors 14,state 18,panels 1,interact 1,
  time 0}+域内互引 26+根驻留 6+上跨 4=70 出边全对账+反向边 0+旧径残留五通道（旧径/点径/
  别名/动态 import/vi.mock）全 0。
- **门审（回炉 0）**：门一 k2 **PASS_WITH_WARNINGS B0/W1/N10**——逐 hunk 零行为断言+计数
  A44/B7-3/C30-16（vi.mock 5）/E2/rename14 亲数全中+域序单向合规+受锁面纯路径改写断言；
  W1=单向探针 v1 输出被 v2 覆盖未留档（处置=本日志注记：证据缺口成立、v2 修复方向更严格
  +门二独立复扫同向补偿；**后续场探针各版本输出全量留档**）；N8=PdfPageCanvas:36-38 G1 期
  「受锁测试旧路径零触」注释陈旧→**归 G11 头注扫尾**；N3=root↔view 中间态边→**G10（M6b）
  收官重扫**；N1/N2/N4-N7/N9/N10 转门二持仓闭合。门二 ops-adjudicator **GO_WITH_CONDITIONS
  P0=0/P1=1/P2=5/N=8**——A-H 全表独立复算（禁采信转述）+21 日志 30 处 EXIT 物理标记亲读+
  五通道残留亲扫全 0+锁链 360→364 逐步复推+tickets 清红预演（12 行映射+规则 1/2/6 预演）+
  收口序 H 预批附四补强（staging 含 diff.patch+gate2 件/12 行映射表/尾验预期值清单/注记
  同批落笔）；**P1-1=impl-report 两处锁数失实（363/359 应为 364/360）——更正段已追记报告尾
  （勘误留痕不回改）**；P2 五条=指纹数字取证位置更正（在 baseline log:27）/*.bak 表述精确化
  （g4 期历史档非 G9 残留）/GBK 日志 grep -a 口径/N8 归 G11 确认/N9 归因措辞——均收口注记。
- **机检终态**：收口终跑 verify 全链 **G9_CLOSEOUT_VERIFY_EXIT=0** 变量法物理在档
  （g9-closeout-verify.log:3914，Node 24.20.0：open 12→11=恰 G9 翻 done+locks 364 一致
  （log:87）+Test Files 170/Tests 1744（log:3873）+指纹门 187/1789/5411/skip15 零漂移
  （log:27）+build 绿产物同名）；tickets 翻 done 单跑 FLIP_EXIT=0（open 11+12 行随迁+镜像面
  同消）；e2e 不跑（零行为口径，义务归 G11——G1-G8 同裁；门二 N5 同口径：G10 有 43 用例门）；
  **health-scan 首跑 RED×1→账本行修形后复跑 RED×0 WARN×0**（g9-healthscan.log/
  g9-healthscan2.log）；账本 62→65 行（executor+门一 k2+门二，主控补记 node .cjs 临时件
  用毕即删——**findings 字段首写为字符串形被 findings-parser 执法拦（audit_surface 岗须
  对象形，G5/G7 先例），修形复跑闭合**）。
- 证据件入库（scripts/audits/，37 件 g9-*）：recon/one-way/rewrite-a/rewrite-b/rewrite-ce
  五 .mjs+对应 .log；impl-brief/impl-report（含 P1-1 更正段）；gate1-brief/report/
  diff.patch；gate2-brief/report；verify-baseline/closeout-verify/tickets-flip 三 .log；
  gate-{lint,typecheck,test,build,quality,tickets,locks} 七 .log+locks-{ce,final,gen1,gen2,
  apply-ce} 五 .log；midprobe-typecheck/m1/m2-mutation/gitmv-status/healthscan/
  healthscan2 .log——.log 系经 git add -f 入库（.gitignore *.log 拦截按 batch 8 教训③处置）。
- 教训三条：①**主控补记账本行 findings 形态**（字符串形过不了 health-scan findings-parser
  的 typeof object 执法——G8 字符串行因 adjudicator/executor 不在 audit_surface 漏网，本批
  gate1 行首次踩中；补记模板=对象形 {"B/W/N","verdict","note"}，G5/G7 先例口径）；②**G8 期
  health-scan 先于账本末次补记跑的扫描时点缺陷本批显形**（本批首跑 RED 实为自产新行而非
  G8 exhaust 行——exhaust 行 event≠ok 天然豁免；**health-scan 必须在账本终态后跑**，G8 的
  「先扫描后补记」序属流程缺口留痕）；③**探针版本覆盖=证据灭失**（门一 W1：v1 有缺陷当场
  修正 v2 PASS 但 v1 输出被覆盖——探针迭代须各版本输出分别落档，自利性归因「探针缺陷非
  实现缺陷」无原始证据即不可审计）。
- Rulings 待用户：无新增（G8 期「kimi 链额度恢复后是否补跑 G8 门一+G10/G11 承载口径」
  Ruling 仍在案——本批 k2 已自然恢复承载实证在档，供用户裁决参考；票内自裁含 reader 根
  驻留 6 边中间态/镜像面红归因/P1-1 更正追记等均经门一裁+门二复核闭合；受锁面 30 行=
  [locked-change][test-refactor] 双尾注权限内）。
- 无进展计数：归零（24→25 有进展）。**下波=F-GEOM-01-G10（目录化 M6b view 工具簇 13 件
  §3.4 [locked-change][test-refactor]——ReaderPage/ReaderToolbar/TabBar/reader-shortcut-
  handlers/ReaderShortcuts/AnnotationEditor/AnnotationMenu/useReaderSearch/ReaderSearchBox/
  reader-search/reader-search.store/SearchHighlightLayer/PageColumnView；受锁面预列恰 3 行
  字符串面（门二 P2-1 实测行号）：theme.test.ts:292 AnnotationMenu.tsx/:293 AnnotationEditor
  .tsx/:485 TabBar.tsx——readFileSync 形态锁清单+e2e 43 默认门+指纹门；root↔view 中间态边
  收官重扫（门一 N3/门二附注）；大中票一火一票。**

### batch 20 — 2026-09-19（执行者会话：第四波 F-GEOM-01-G8 目录化 M5 panels/ 8 文件迁移，完成）
- claim: claim-1789757612-b20｜认领 2026-09-18T18:53:32Z｜收口 2026-09-18T19:48:00Z｜勾选 23→24。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋派发/门审矩阵/
  ORG-12 审包/health-scan/账本 v3 补记/换源状态机+审计兜底降级路径）；TDD=实现者六段简报内嵌
  等价红绿闭环（基线锚+变异红证 M1/M2——零行为迁移票票面机制）；systematic-debugging 不加载
  （迁移修法=设计书 §3.4 定稿+派发前全边侦察前置，无排障定位面）。派发档位：主控=GLM5.3 max
  （本会话）；实现者=ops-executor 绑定（GLM5.3flash $max）；门一=**kimi 双源额度耗尽→deepseek
  审计兜底位外发承载**（ds-call-v2 --source deepseek，deepseek-v4-flash——ops-gate1-k2 绑定通道
  连续两次 Provider authentication failed+外发 kimi-backup（zipoo）HTTP 403「5-hour usage limit」
  双证在档 g8-gate1-quota403.log；k1=用户周额度封顶禁派——org-config 源链 deepseek 位明文
  「审计兜底」，对实现者仍异构，**同源欠账（门一/门二同族 deepseek）如实登记**）；门二=
  ops-adjudicator 绑定（deepseek-flash $max）。
- **交付（零行为纯迁移）**：M5=panels/ 域迁移——OutlineAside(156)/OutlinePanel(183)/
  OutlineThumb(77)/ReaderNotesPanel(207)/AiNotesSection(107)/AiNoteGroupList(197)/
  AiNotesStatus(155)/FragmentNotesList(91) 八件 1173 行（wc 实测；设计书 §3.2 值 1181 系
  无尾换行口径各 +1——G11 对账债登记，G5/G6/G7 同口径）迁 reader/panels/（git rename
  8 对相似度 95-99%）；改写面=A 深度修正恰 21 行（OutlineAside 3+OutlinePanel 1+OutlineThumb
  1+ReaderNotesPanel 5+AiNotesSection 4+AiNoteGroupList 1+AiNotesStatus 5+FragmentNotesList
  1——域内互引 7 边零改写）+B src 消费 1（ReaderPageView:35）+C tests 5 行/4 件+D 跨特性 0
  （lineage 命中系注释提名非 import）+E config 1（check-quality.mjs:97 键——票面「96-97 两
  路径」实勘勘正=单行 :97，:96/:98/:99 系 G4/G6 已迁态）+F registry 随迁 6 对（status 零触碰；
  OutlineThumb/AiNotesStatus/FragmentNotesList 三件无 file 锚）+G 字符串面零动作
  （readFileSync 形态全仓 0 命中——板注预扫义务前置兑现，theme.test 对 G8 零命实证）。
- **TDD 证据链**：基线 verify EXIT=0 锚（g8-verify-baseline.log：206 票 open 13/locks 358/
  170 文件 1744 用例/指纹门 187·1789·5411·skip15）；变异红证 M1（ReaderPageView:35 回退旧径→
  typecheck TS2307 EXIT=2→还原 diff 空→复绿）+M2（outline-aside.test:18 回退→模块解析红
  EXIT=1→还原→复锁→复绿 4/4）全退出码变量法物理在档；中探针（C 面待改时点 EXIT=2 恰 5 错全
  tests 面 src 面 0 错）；**构建产物哈希恒等**（index-D3egZtl2.js 1,392.72kB sha256 9c3b8b84…
  3f2a+index-BfpEygSE.css 52.49kB dcace2e7…8a97d5——G5-G8 恒等链第四票延续）；§3.1 单向核验
  panels→anchors 4 边+panels→state 10 边（探针 g8-s31-check 三面：出边 14/反向 0/残留 0）+
  跨域出边 7（notes 1+api 2+shared 4——门一 W1 命名补全）。
- **门审（降级承载实录+回炉 0）**：门一 deepseek 兜底位 **PASS_WITH_WARNINGS B0/W2/N5**——
  逐 hunk 零行为断言+计数数学独立复算过；W1=报告「出边表（探针全表）」名不副实（漏跨域 7 边
  命名）+反向域未含 notes/api/shared——主控处置=recon 入边全表（g8-recon.log 13 行，全仓
  覆盖）即实体闭合+誊录以更正语句落本日志；W2=raw 证据未入隔离包——转门二实证清单（其有仓
  读权限）；N1 vi.mock 盲区（主控即补 g8-n1-vimock.log：panels/ 形态全 tests 0 命中+4 件中
  3 件零 vi.mock 销项）/N4 check-quality 他处旧径（fullscan2 活脚本域仅 :97 销项）/N2 wc -1
  债/N3 探针入锁 358→359/N5 e2e 归 G11。门二 ops-adjudicator **GO P0=0/P1=0/P2=5/N=3**——
  A-J 全表独立复算（亲 grep 亲读，未采信转述）+13 证据件物理在档逐一核 EXIT 标记+**残留五通道
  独立闭合**（旧径/点径/别名/动态 import/vi.mock 全 0）+门一 W1/W2/N1-N5 处置七子项全裁
  「充分」；P2 五条=mutation2.log 编码卫生（ripgrep 可读，G11 注记）/门一档尾栏人读 PW vs
  机读 PASS 标签并存（实质 B0/W2/N5 一致，誊录以人读行为准）/gate1-diff.patch 不含 registry
  hunks（附 B+门二独立闭合补偿，引用须知）/开工前遗留面（本收口一并处理）/build 基线侧无
  字节级记录（同名+同显示列承载，G5-G8 链旁证）。
- **机检终态**：收口终跑 verify 全链 **G8_CLOSEOUT_VERIFY_EXIT=0** 变量法物理在档
  （g8-closeout-verify.log 末行，Node 24.20.0：open 13→12=恰 G8 翻 done+locks 359 一致
  （log:87）+Test Files 170/Tests 1744（log:3837/:3838）+指纹门 187/1789/5411/skip15 零漂移
  （log:27）+build 绿产物同名）；panels 回归定向 4 文件/41 用例绿（g8-panels-regression.log）；
  e2e 不跑（零行为口径，义务归 G11——G1-G7 同裁）；**health-scan RED×0 WARN×0**
  （g8-healthscan.log）；账本 58→62 行（外发岗 2 行自动落：kimi-backup exhaust+deepseek ok；
  主控补记 executor+adjudicator 2 行，node JSON.stringify 临时 .cjs 用毕即删）。
- 证据件入库（scripts/audits/，25 件 g8-*）：recon-edges/fullscan2/s31-check 三 .mjs+三 .log；
  impl-brief/report；verify-baseline/impl-verify/closeout-verify 三 .log；mutation1+2 与
  restore 四 .log；midprobe/n1-vimock/panels-regression/build-hash/quota403 六 .log；
  gate1-brief/report/diff.patch；gate2-brief/report；healthscan.log——.log 系经 git add -f
  入库（.gitignore *.log 拦截按 batch 8 教训③处置）。
- 教训三条：①**kimi 双源额度耗尽的门一降级路径首走**（绑定 k2 auth×2+外发 zipoo 403→
  org-config deepseek「审计兜底」位外发承载=既定回退设计执行；同源欠账如实登记非假装审过
  ——「源尽不记欠账假装审过」红旗的反面合规路径；Rulings 待用户见下）；②**cut -c 字节截断
  撕 UTF-8**（registry 裁展首试 `cut -c1-150` 多字节截断出乱码——shell 四坑 byte-cut 族新
  变体，改 sed 字段整段剥除闭合；heredoc 写中文审包本批过 UTF-8 校验零损伤但纪律仍守
  Write 优先）；③**管道吞退出码再犯**（`grep|head; echo $?` 取 head 恒 0——N1 探针首跑
  假绿，重定向法重取 EXIT=1 真值；batch 11 教训①同坑第二现，探针输出一律重定向落文件）。
- Rulings 待用户（+1）：**kimi 链额度耗尽期间门一承载口径**——本批门一已按 org-config 审计
  兜底位降级 deepseek 外发承载（对实现者异构成立、门一/门二同族 deepseek 欠账登记）；kimi
  额度恢复（k2 5h 窗口重置/用户解除 k1 封顶）后是否补跑 G8 门一、以及 G9-G11 在恢复前的门一
  承载口径（继续 deepseek 兜底 vs 等待窗口重置）=待用户裁决（1 项<2 不触发 HOLD，接力照常）。
- 无进展计数：归零（23→24 有进展）。**下波=F-GEOM-01-G9（目录化 M6a view 渲染簇 14 件
  §3.4 [locked-change][test-refactor]——受锁面含字符串面预扫义务（板注已预列）+eslint:90-91
  已在票面；大中票一火一票；开工前注意 kimi 额度窗口状态对门一承载的影响——见上 Ruling）。**

### batch 19 — 2026-09-19（执行者会话：第四波 F-GEOM-01-G7 目录化 M4 interact/ 7 件迁移+RoT 工厂抽取，完成）
- claim: claim-1789752460-b19｜认领 2026-09-18T17:27:40Z｜收口 2026-09-18T19:05:00Z｜勾选 22→23。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋
  派发/门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；TDD=实现者六段简报内嵌
  等价红绿闭环（基线锚+变异红证 M1/M2——零行为迁移票票面机制）；systematic-
  debugging 不加载（迁移修法=设计书 §3.4 定稿+派发前全边侦察前置，无排障定位
  面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定
  （GLM5.3flash $max，两轮=实现+裁准处置）；门一=**ops-gate1-k2 绑定（kimi k3
  $max，zipoo——用户指令 2026-09-18 调度员转达：k1 周额度封顶 k2 承载续）**；
  门二=ops-adjudicator 绑定（deepseek-flash $max）——门审均异构于实现者。
- **交付（零行为纯迁移+受锁测试工厂 RoT 抽取）**：M4=interact/ 域迁移——
  SelectionLayer(238)/SelectionToolbar(78)/selection-evaluate(312)/
  selection-geometry(143)/selection-paint(88)/release-affinity(210)/
  use-annotation-draft(192) 七件迁 reader/interact/（git rename 5RM+2R 纯零改）；
  改写面=A 深度修正恰 19 行（Layer 4+Toolbar 1+evaluate 9+paint 3+affinity 2；
  geometry/draft 零相对 import）+B src 消费 2（ReaderPageView:41+
  AnnotationEditor:16）+C tests 9 文件（8 路径行+**theme.test:294 readFileSync
  字符串面裁准追加**——recon import 形态扫描盲区，停工申报→主控裁准 01:54，
  G4 受锁面实勘勘正先例）+**RoT 债销项**（b14 门一 W1 登记）：selection 系 4 件
  mkItem/mkText/seedRegistry ×4→tests/utils/factories.ts 单源（mkItem/mkText
  逐字同构唯一体数=1；seedRegistry 两变体收敛参数化超集形——24 调用点全 2 参
  形态门二实测）；anchors 域 2 份 mkItem（4 参 opts 变体）不同构不动（RoT 线
  2 份未触发，G11 对账登记）；F registry 8 对随迁（status 零触碰）；实现面
  20 文件 +67/-112。
- **TDD 证据链**：基线 verify EXIT=0 锚（g7-verify-baseline3.log——首跑红=
  主控探针 lint 未用变量+b 改后未即时重锁，教训①）；变异红证 M1（ReaderPageView:
  41 回退旧径→typecheck TS2307 EXIT=2→cp 还原 diff 空→复绿）+M2（selection-
  layer.test 回退→模块解析红 EXIT=1→还原→复绿→复锁——restore 变量法 EXIT
  双行物理落 log，M2 首试 cp 被只读拦+解锁重走双记录在档）；**构建产物哈希
  恒等**（index-D3egZtl2.js 1,392.72kB+index-BfpEygSE.css 52.49kB——Vite 内容
  哈希入名，基线/终跑双点同名，门一 N3 标配）；§3.1 单向核验 interact→
  {anchors,state} 出边 19（与 A 段一一对应）+反向边 0+旧径残留 0。
- **门审**：门一 k2 **PASS_WITH_WARNINGS B0/W1/N7**——A1~A6 逐 hunk 成立+
  深度数学逐行验算+RoT 逐字性（唯一体数证明+等价演绎）+自裁 6 条全裁准；
  W1=字符串形态旧径扫描盲区同族第三现+**G10 第四现前瞻铁证**（theme.test
  形态锁清单 :292/:293 引 AnnotationMenu/AnnotationEditor=G10 迁移件）——
  处置 a 全扩展名分域补扫（g7-fullscan2：活代码/活脚本/tickets 三域 0 hits）
  /b G8/G9/G10 板注预列（已落板）。门二 **GO_WITH_CONDITIONS P0=0/P1=3/
  P2=3/N=3**——数字独立复算全过（seedRegistry 等价加强至 24 调用点实测、
  build 双点包内自证）；P1-1 locks 355→356 重认证（终跑断言兑现）/P1-2 探针
  4 件+证据件 add -f/P1-3 fullscan2 归档域 wc-l 管道伪零禁沿用（收口说明
  按更正语句落：docs 面 214=tracked 下界，归档面=历史提名零动作）；P2-1
  G10 预列恰 3 行（+:485 TabBar——门一漏第三处，板注已含）/P2-2 仓总定位令
  （收口兑现：实现 67/112+relay 29/5+manifest 31/11=127/128 精确闭合，旧
  差 1/1=W1 探针入锁中间态）/P2-3 誊录以机器实测值更正；N-1 门一「6 hunk」
  实为 7 hunk 誊录笔误；回炉=0。
- **机检终态**：收口终跑 verify 全链 **G7_CLOSEOUT_VERIFY2_EXIT=0** 变量法
  物理落档（g7-closeout-verify2.log 末行，Node 24.20.0：open 14→13=恰 G7 翻
  done+locks 356 一致+Test Files 170/Tests 1744+指纹门 187/1789/5411/skip15
  零漂移+build 产物同名同尺寸）；首跑 closeout EXIT=1=主控 fullscan2 探针
  lint 未用变量再犯（教训①第二宗）；e2e 不跑（零行为口径，义务归 G11——
  G4-G6 同裁）；**health-scan RED×0 WARN×0**（账本补记后）；账本 54→58 行
  （executor 两轮+门一 k2+门二，主控补记 node .cjs 临时件用毕即删）。
- 证据件入库（scripts/audits/）：g7-{recon.mjs；recon.log；recon2.mjs；
  recon2.log；oneway-check.mjs（实现者产）；fullscan2.mjs；fullscan.log；
  fullscan2.log；impl-brief.md；impl-report.md；verify-baseline.log；
  verify-baseline2.log；verify-baseline3.log；impl-verify.log；closeout-
  verify.log；closeout-verify2.log；mutation 系实现者件；build-hash.log；
  selection-regression.log；gate1-brief.md；gate1-report.md（岗无写通道主控
  逐字归档）；gate1-diff.patch；gate2-report.md（同型归档）；healthscan.log}
  ——.log 经 git add -f 入库（.gitignore *.log 拦截按 batch 8 教训③处置）。
- 教训三条：①**主控自产探针三连自伤**（同批两宗 lint 未用变量=recon.mjs
  existsSync/NEW_DIR+fullscan2.mjs docs/audits——b16 教训①同族再犯×2；第三宗
  =翻 done 的 node -e 复合多操作内多余 replace 负向前瞻误删 G4 行尾致
  check-tickets 红「206≠205」，.cjs 修复——**探针/改锁面操作一律 Write 文件
  后 node 跑+写前 lint 自查+单文件单目的**，node -e 仅限纯 ASCII 单行单操作，
  画蛇添足的「防重清理」正则是自伤面）；②**侦察字符串形态盲区第三现**
  （theme.test:294 readFileSync——G6 N3-N4 同族；已在 G8/G9/G10 板注预列
  预扫义务+G10 恰 3 行行号，第四现防线就位）；③**W1 探针入锁使在档数字
  过期**（门二 P1-1 捕获：终跑 355 已被 fullscan2 入锁涨到 356——收口链
  中新增探针后一切在档 attestation 数字必须重认证，禁引旧值）。
- Rulings 待用户：无新增（票内自裁含 theme.test 裁准/RoT 收敛超集形/anchors
  2 份不动/归档件 3 处不动/type import 删除等——均经门一自裁段+门二逐条
  复核闭合；受锁面 9 文件+factories+registry=[locked-change][test-refactor]
  双尾注权限内）。
- 无进展计数：归零（22→23 有进展）。**下波=F-GEOM-01-G8（目录化 M5 panels/
  8 件 §3.4 [locked-change][test-refactor]——OutlineAside/OutlinePanel/
  OutlineThumb/ReaderNotesPanel/AiNotesSection/AiNoteGroupList/AiNotesStatus/
  FragmentNotesList；受锁面=notes/outline 系测试 import+check-quality:97
  ReaderNotesPanel 两路径+**字符串面预扫义务（板注已预列）**；大中票一火一票）。**

### batch 18 — 2026-09-18（执行者会话：第四波 F-GEOM-01-G6 目录化 M3 anchors/ 14 文件迁移，完成）
- claim: claim-1789743426-b18｜认领 14:57:35Z｜收口 2026-09-18T15:49:55Z｜勾选 21→22。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋
  派发/门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；TDD=实现者六段简报内嵌
  等价红绿闭环（基线锚+变异红证 M1/M2——零行为迁移票票面机制）；systematic-
  debugging 不加载（迁移修法=设计书 §3.4 定稿+派发前全边侦察前置，无排障定位
  面）。派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定
  （GLM5.3flash $max）；门一=**ops-gate1-k2 绑定（kimi k3 $max，zipoo——用户
  指令 2026-09-18 调度员转达：k1 周额度封顶本批起 k2 承载，勿再派 k1）**；门二=
  ops-adjudicator 绑定（deepseek-flash $max）——门审均异构于实现者。
- **交付（零行为纯迁移）**：M3=anchors/ 域迁移——pdf-item-geometry(509)/
  annotation-anchor(427)/annotation-merge(172)/annotation-resolve(413)/
  annotation-resolve-layered(251)/annotation-band-calibrate(119)/anchor-serialize
  (259)/anchor-blank-snap(284)/anchor-locate(293)/page-items.store(69)/
  open-paper-anchor(43)/annotation-style(119)/ai-note-style(60) 十三存量+
  geometry-types(103) 共 14 件 3121 行迁 reader/anchors/（git rename 相似度
  12×100%+anchor-locate 98%+open-paper-anchor 92%）；改写面=B 段入边深度修正
  恰 7 行（anchor-locate :88/:89/:90/:91+open-paper-anchor :26/:27/:28——
  ./state/→../state/ 3 行+../../shared/→../../../shared/ 4 行，open-paper-bus
  实驻 **shared 域**非 lineage，票面定性勘正）+C 段 reader 根未迁消费 35 处/17
  文件（./x→./anchors/x）+D 段跨特性 1（LineageSideAiNotes:22）+E 段 tests
  受锁面 34 行/17 物理件（含 2 vi.mock 行）+F 段 check-quality:99 白名单值+
  G 段 registry 全域随迁 10 行（status 零触碰）+H 段 e2e 注释勘正 1（z-wg1-
  probe.spec:7 行号不变）；域内互引 25 处零改写；§3.1 单向核验：state→anchors
  反向边 0+anchors→state 恰 3 边+time 互边 0+旧径残留 0。
- **票面口径勘正三项（门一 K1~K3 裁实）**：①「lineage×2」=src import 1+
  check-quality 白名单 1（恰 2 处但形态与票面暗示不同）；②「open-paper-bus」
  系 shared 域文件（深度修正归 B 段 4 行）；③「pdf-factory（CorpusExtractor
  import）」零命中——门一实物读 tests/utils/pdf-factory.ts 全文零 import（纯
  字节工厂），起草残留（G4 实勘先例延续）。
- **TDD 证据链**：基线 verify EXIT=0 锚（g6-verify-baseline2.log——首跑
  baseline EXIT=1 系主控三侦察探针未即时锁登记红，generate+apply 348 后复绿，
  教训①）；实现者七关卡+verify 全绿（g6-verify7/g6-verify-final）；变异红证
  M1（AnnotationLayer:42 回退旧径→TS2307 EXIT=2→cp 还原 diff 空→复绿——restore
  EXIT 双行物理在档）+M2（anchor-locate.test:15 回退→模块解析红 EXIT=1→还原→
  13/13 复绿→复锁）；**构建产物哈希与 G5 恒等**（index-D3egZtl2.js/index-
  BfpEygSE.css 同名=内容哈希恒等，零行为最强旁证，N3 标配）；锚定回归网 18 件
  /211 用例绿（含 5 零改写件，stderr 栈帧指新径旁证）。
- **门审**：门一 k2 **PASS_WITH_WARNINGS B0/W1/N6**——A1~A6 逐 hunk 成立+深度
  数学验算+实物抽核；W1=主控审包简报「44 文件」计数失实（patch 实证 60 diff
  头——grep -c 行匹配数误当文件数落笔，教训②）；N1=板头心跳 15:05 系 batch17
  收口近似值非时序异常（batch6 W6 同款票外）；N2=impl-brief ⑤「345」与③「348」
  并立（基线首跑前预留旧数，勘误留痕不回改）；N3/N4=主控侦察探针正则盲区
  （vi.mock 形态+../../出边——recon2/recon3 补捕闭合，教训③）；N6=调度面
  混入提交面（b18-claim.mjs+relay.md 随收口提交，G4/G5 先例裁量）。门二
  **GO_WITH_CONDITIONS P0=0/P1=2/P2=1/N=8**——22 条逐条裁决+数字独立复算全过
  （门一 R1 残余 12 件逐件清零 Σ3121）；P1-1 翻 done 后终跑+P1-2 staging
  白名单 14 rename 对核验——两条件收口全兑现；P2-1 **G11 对账债精化**：设计书
  §3.2 anchors 段括号行数 11/13 偏差（−6/−27/−1/−3/−1×7；2 件吻合）+§5.1
  基线计数差 1790/5417→1789/5411（G2 删例所致）——并入 G11 收官对账清单；
  回炉=0。
- **机检终态**：收口终跑 verify 全链 **G6_VERIFY_FINAL2_EXIT=0**（翻 done 后
  跑，变量法物理落档 g6-verify-final2.log 末行，Node 24.20.0：open 15→14=恰
  G6 翻 done+locks 351 一致（log:87）+test 1744 用例（log:3830）+指纹门
  187/1789/5411 零漂移（log:27）+build 绿）；e2e 不跑（零行为口径，义务归
  G11——门二 #22 同裁）；**health-scan RED×0 WARN×0**（账本补记后）；账本
  51→54 行（executor+门一 k2+门二，主控补记 node JSON.stringify——脚本用毕
  即删零驻留）。
- 证据件入库（scripts/audits/，27 件）：g6-{recon.mjs；recon.log；recon2.mjs；
  recon2.log；recon3.mjs；recon3.log；rewrite.mjs；rewrite-src.log；
  rewrite-locked.log；oneway.mjs；oneway.log；impl-brief.md；impl-report.md；
  verify-baseline.log；verify-baseline2.log；verify7.log；verify-final.log；
  verify-final2.log；mutation.log；build-hash.log；anchored-net.log；
  gate1-brief.md；gate1-report.md（岗无写通道主控逐字归档）；gate1-diff.patch；
  gate2-brief.md；gate2-report.md（同型归档）}+b18-claim.mjs——14 .log 经
  git add -f 入库（.gitignore *.log 拦截按 batch 8 教训③处置；首写 26/11 两处
  计数误，提交前 ls 实测勘正——教训②自查拦截实例）。
- 教训三条：①**主控自产探针锁登记延迟再犯**（基线首跑 EXIT=1——recon/
  recon2/claim 三 .mjs 写完未即时 locks:generate+apply，宪法明文义务违反，
  G4 教训①姊妹面第二现：**探针落盘与锁登记必须同一动作批次**，勿等 verify
  拦截）；②**审包文书面数字未实测**（门一 W1：gate1-brief 写「44 文件」系
  grep -c 输出直接当文件数——diff 文件数应以 patch diff 头计数为准；「计数
  落笔前实测」的主控审包侧变体，batch 15/16 简报侧教训同族第三现）；③**
  侦察探针正则覆盖面缺口**（N3/N4：import 行过滤器漏 vi.mock 调用形态+出边
  扫描漏 ../ 前缀——迁移侦察探针模板应含：from/import/vi.mock( 三形态+
  出边含 ../ 一级；实测由 recon2 字符串面+实现者 recon3 双复核兜底闭合）。
- Rulings 待用户：无新增（票内自裁 4 项经门一 S1~S4 逐条裁「充分」+门二 #16~#20
  复核闭合；门审处置 W1 勘误/P1-1/P1-2/P2-1 全兑现；受锁面 34 行=[locked-change]
  [test-refactor] 双尾注权限内）。
- 无进展计数：归零（21→22 有进展）。**下波=F-GEOM-01-G7（目录化 M4 interact/
  7 件 §3.4 [locked-change][test-refactor]——SelectionLayer/SelectionToolbar/
  selection-evaluate/selection-geometry/selection-paint/release-affinity/
  use-annotation-draft；受锁面=selection 系测试 import 按本批实勘口径先侦察
  后落简报+验收 selection 回归；大中票一火一票）。**


### batch 17 — 2026-09-18（执行者会话：第四波 F-GEOM-01-G5 目录化 M2 time/ 4 文件迁移，完成）
- claim: claim-1789740440-b17｜认领 14:07:20Z｜收口 2026-09-18T15:05:00Z｜勾选 20→21。
- 技能清点：batch-relay（用——火协议认领收口）、ai-dev-org（用——组织主干/三屋
  派发/门审矩阵/ORG-12 审包/health-scan/账本 v3 补记）；TDD=实现者六段简报内嵌
  等价红绿闭环（基线锚+变异红证 M1/M2——零行为迁移票票面机制）；systematic-
  debugging 不加载（迁移修法=设计书 §3.4 定稿+派发前全边侦察前置，无排障定位面）。
  派发档位：主控=GLM5.3 max（本会话）；实现者=ops-executor 绑定（GLM5.3flash
  $max）；门一=**ops-gate1-k2 绑定（kimi k3 $max，zipoo——用户指令 2026-09-18
  调度员转达：k1 周额度封顶本批起 k2 承载）**；门二=ops-adjudicator 绑定
  （deepseek-flash $max）——门审均异构于实现者。
- **交付（零行为纯迁移）**：M2=time/ 域迁移——reading-time(303)/reading-time-
  setup(139)/reading-time-outbox(300)/reading-time-outbox-store(87) 四件 829 行
  迁 reader/time/（git rename 相似度 100/100/95/99）；改写 12 行=深度修正 5
  （setup:13/:14 深度+1+`:15/:16` ./state/→../state/——time→state 唯一域边；
  reading-time:61 re-export 深度）+跨特性消费 3（main.tsx:4+ReaderPage:55/:56）
  +注释勘正 1（shared/reading-time-format.ts:4）+tests 受锁面 3 行 2 文件
  （reading-time.test:9+reading-time-outbox.test:10/:15 纯路径改写）；域内同层
  4 处零改写；e2e 两 spec 零触碰（命中系字符串/注释）；配置面零涉及
  （check-quality :96/:98 系 M1 state 面；eslint INV-16 四路径无 time 件）；
  registry 全域随迁义务本步恰 2 行（P7X-02 done 票+G5 自身）。§3.1 单向核验：
  state→time 反向边零存在+time→state 唯一边+零新增域边。
- **TDD 证据链**：基线 verify EXIT=0 锚（206 票/open 16/locks 345/test 170/1744/
  指纹门 187/1789/5411）；迁移后七关卡独立取证全绿（quality+指纹门零漂移+locks+
  lint+typecheck+test+build；tickets 红=registry 旧径=收口职责预期内）；变异红证
  M1（main.tsx:4 回退旧径→TS2307 EXIT=2→还原 diff identical→typecheck 复绿）+
  M2（test:9 回退旧径→Failed to load url EXIT=1→还原→17/17 复绿+复锁）；
  **构建产物哈希四方恒等（门一 N3 升格标配兑现）**：index-D3egZtl2.js 1,392.72
  kB+index-BfpEygSE.css 52.49 kB 跨「G4 master 在档→本批基线（迁移前）→迁移后
  →收口终跑」同名同尺寸。
- **门审**：门一（k2 承载，PASS_WITH_WARNINGS B0/W3/N5）——零行为断言逐 hunk
  成立+深度数学逐行验算；W1 终跑放行硬条件/W2 提交面白名单核验/W3 变量法取证
  ——三 W 收口全兑现；N1=注释同行旧名残留（主控收口处置：format:4 同行二次改写
  reader/time/reading-time，门二 #3 裁处置充分）。门二 **GO_WITH_CONDITIONS
  P0=0/P1=2/P2=3/N=6**——20 条逐条裁决+14 组数字独立复算（829 算术/locks 345
  逐条数回/manifest 值级/tests 恰 3 行/registry 受影响行恰 2 双证/板 20/35 预核）；
  P1-1 终跑变量法+P1-2 冻结序（全量写入→终跑→单提交）两条件全兑现；P2-2=设计书
  §3.2 time/ 行数每件 +1 偏差（304/140/301/88 vs 实测 303/139/300/87——文档
  口径非本票缺陷，**登记 G11 收官对账债**）；P2-3=后续迁移票 restore log 落
  变量法 EXIT（教训登记）；回炉=0。
- **机检终态**：收口终跑 verify 全链 **G5_VERIFY_FINAL_EXIT=0**（变量法物理
  落档 g5-verify-final.log 末行，Node 24.20.0：open 15=恰 G5 翻 done+locks 345
  一致（log:87）+test 170 文件/1744 用例（log:3835/:3836）+指纹门 187/1789/5411
  零漂移（log:27）+build 绿+产物第四次同哈希）；e2e 不跑（零行为口径，义务归
  G11——门一 N3 边界+门二同口径）；**health-scan RED×0 WARN×0**（账本补记后）；
  账本 48→51 行（executor+门一 k2+门二，绑定岗主控补记 node JSON.stringify——
  临时 .cjs 用毕即删；账本=仓外件不入库历史惯例，git ls-files 空证）。
- 证据件入库（scripts/audits/，15 件）：g5-{impl-brief.md；impl-report.md；
  impl-raw.log；impl-verify.log；impl-partial.log；impl-mutation1.log；
  impl-mutation1-restore.log；impl-mutation2.log；impl-mutation2-restore.log；
  gate1-brief.md；gate1-report.md（岗无写通道主控归档）；gate1-diff.patch；
  gate2-brief.md；gate2-report.md（同型归档）；verify-final.log}——8 .log 经
  git add -f 入库（.gitignore *.log 拦截按 batch 8 教训③处置）。
- 教训三条：①**heredoc 中文归档损伤**（门一报告 cat<<'EOF' 落盘「恒定」→「恁
  定」字符损伤一处，回读核验拦截后 Write 工具重写——shell 隔层四坑 heredoc 族
  再实证：不止反斜杠塌缩，中文字节同样被吃；**中文内容归档一律 Write 工具，
  禁 heredoc**）；②**主控简报起草侧两缺陷被下游拦截**（基线 open 17 系起草
  时点滞后实测 16+漏列门一 N3 构建哈希恒等标配义务——基线序天然覆盖自动兑现，
  但义务未显式进简报=主控输入面缺陷，实现者自裁①与门二 N3 各拦一处；「简报是
  下游输入」纪律的主控侧变体再确认）；③门二 P2-3（变异还原 diff identical 系
  echo 自证无命令回显——后续迁移票 restore log 尾物理落变量法 EXIT）；④**add
  链静默半失效**（收口首次提交漏迁移本体 4 件——白名单首条 add 链末尾误带不
  存在路径 fatal，2>/dev/null 吞错+&&链断，src 面未暂存；补漏时误以为 src 面
  已暂存仅补 M/md 面→提交 23 files 无 rename→HEAD 处于 import 悬空态；核对
  create mode 清单+deletions 计数拦截→补暂存 amend 修复（终态=27 files/
  +12736/-24，rename 100/100/95/99 四对全识别，ls-tree+干净树亲验；板内不落
  本批自引用提交哈希——amend 即漂移，哈希以 git log 为准）；
  教训=**add 链禁 2>/dev/null 吞错+提交后必核 create/rename mode 清单与 ±行数
  对账**——batch 8 教训③「staging 显式列文件」的执行侧变体）。
- Rulings 待用户：无新增（票内自裁 4 项经门一逐条裁「准」+门二 #14~#17 复核
  闭合；门审处置 W1/W2/W3/P1-1/P1-2/N1 全兑现；受锁面 3 行=[locked-change]
  [test-refactor] 双尾注权限内）。
- 无进展计数：归零（20→21 有进展）。**下波=F-GEOM-01-G6（目录化 M3 anchors/
  13+1 件 §3.4 [locked-change][test-refactor]——受锁面最重：锚定回归网 18 物理
  件+跨特性 import（lineage×2+open-paper-bus）+check-quality:99 行（lineage→
  ai-note-style）对账到行号（门二 P1-3c 板注）；大中票一火一票。**

### batch 16 增补三 — 2026-09-18 21:56（hub 布防：用户显式 /batch-relay，加入多项目轮转）
- 深度设计门（ai-dev-org 路线）：过——`.zcode/org-ledger.jsonl` 活跃（batch16-g4
  三岗 ok @21:37）、《裁决书》24KB 占位符零命中（grep TBD|TODO|稍后实现|适当处理|
  implement later）、执行清单机检 20/35 勾与板头计数一致。
- 换防复位：claim 归「-」（batch 16 收口遗留 token）；status READY/no_progress 0
  原样；补 `shared_fire: true` 字段行+protocol hub 守卫句（存量板补齐）。板不重建，
  本增补以下历史全数保留。
- 旧火核查：CronList 空集（21:43 用户删火后无火）——无火可清；板头旧
  automation_id 字段行将由 hub 新火 id 锚定替换（旧 id 在历史日志 2 处存量不动，
  字段行锚定+计数守卫 3 处中 1 处）。
- hub 火=全局唯一 */10 轮转火（hub 调度会话创建，服务本板+waterprint 板）；
  本板 last_dispatch=2026-09-18T20:30:44+08:00（静默窗已过）；姊妹板 waterprint
  last_dispatch=`-`（从未发布视作最老）——首班有效火轮到其 B2-1 批先行的可能性大。
- 门一 k2 换源指令（增补一）留存板面，继续随注入指令生效。

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

### 调度员增补二 — 2026-09-18T23:55:50+08:00（hub 停火：用户令删火，新会话接替换防）
- 用户在 hub 调度会话下达删火令：全局轮转火 automation-bf8fd7d7-fa7b-4194-a850-
  2c702565068e 已 CronDelete（回执 deleted:true，CronList 空集复核）。本条为
  调度员尾部纯追加。
- 用户将开新会话接替 hub 调度位，按技能「换防协议」hub 变体重布防：板不重建、
  新火 id 届时锚定回填本板 automation_id 字段行（本行现值仅历史审计指向）。
- 在途 b18（G6 收口相：双门审报告+final verify 已落盘）不受影响——执行者独立
  于火，自行收口（翻票+提交+板回写 READY）。

### 调度员增补三 — 2026-09-19T01:19:16+08:00（hub 换防：新调度会话接替，重布全局轮转火）
- 旧火核查：CronList 空集——增补二删火令对象 automation-bf8fd7d7-… 确认已亡，
  无双火风险，零清场动作。
- 深度设计门（换防重走）：过——`.zcode/org-ledger.jsonl` 活跃（末笔=batch 18
  门二 G6 行 @09-18 23:48）、《裁决书》占位符 grep 零命中、执行清单机检 22 勾+13
  开=35 与板头计数一致。
- 板面处置：status READY/claim「-」/no_progress 0 均为换防期望态零复位；字段
  对照当前技能模板零缺失（无增行）；本条尾部纯追加，历史日志全数保留；板头
  automation_id 字段行已锚定替换为新火 id（历史日志旧 id 存量不动）。
- 新全局火=automation-9d2ab6a4-8aa2-4f96-9a44-fa9b23577f85（新 hub 调度会话创建，
  全局唯一 */10 轮转，服务本板+waterprint 板）；本板 last_dispatch=09-18T22:56:11
  早于姊妹板 23:19:54——首班有效火轮到本板，下批指引不变=F-GEOM-01-G7（M4
  interact/ 7 件）。
- 既有板上转达条款（门一审 k2 承载直至用户另行通知）继续随执行指令原文生效。

### 调度员增补四 — 2026-09-19T03:51:12+08:00（hub 停火：用户令删火，新会话换防交接）
- 用户在 hub 调度会话下达删火令：全局轮转火 automation-9d2ab6a4-8aa2-4f96-9a44-
  fa9b23577f85 已 CronDelete（回执 deleted:true，CronList 空集复核）。本条为调度员
  尾部纯追加，claim/状态字段未动；板头 automation_id 字段行保留旧值仅为历史审计
  指向。
- 本火任内战果：G7/G8 两批完成（勾选 22→24，提交 d7f2f4c31a/4de23ab9e0），G9 已于
  03:48:46 发布并认领。
- **在途 batch 21（G9，claim-1789761018-b21）不受影响——执行者独立于火，自行完成
  收口（翻票+提交+板回写 READY）**。收口后本板停于 READY 且无火接续——此为预期态
  非异常。恢复两径同规：用户显式 /batch-relay 重布防（新 automation_id 回填本板，
  换防协议 hub 变体），或手动会话按本板清单领批。
- 调度员会话自本增补起不再开批、不再补派（含执行者中途死亡亦不接管——停火令
  优先）。
- 门一 k2 换源指令留存板面执行指令原文，重布防时自动随注入指令生效。

### 调度员增补五 — 2026-09-19T03:57+08:00（hub 换防：新调度会话接替，重布全局轮转火）
- 旧火核查：CronList 空集——增补四删火对象 automation-9d2ab6a4-… 确认已亡，零清场
  动作；新火布防后 CronList 复核全局恰一条，无双火。
- 深度设计门（换防重走）：过——`.zcode/org-ledger.jsonl` 活跃（末笔=batch20-g8
  adjudicator 行 @09-18T19:40Z，文件 mtime 09-19 03:27）、《裁决书》占位符 grep
  零命中、执行清单机检 24 勾+11 开=35 与板头计数一致。
- 板面处置：字段对照当前技能模板零缺失（无增行）；在途 b21 判活=心跳 09-19
  03:50:30 新鲜+实物在途（scripts/audits/g9-recon.mjs 未跟踪侦察件+locks/
  manifest.json 修改+板面认领笔）——claim-1789761018-b21 未动，status 维持
  RUNNING；本条尾部纯追加；板头 automation_id 字段行已锚定替换为新火 id
  （锚定计数=1 守卫过；历史日志旧 id 存量 2 处叙述不动）。
- 新全局火=automation-4a8cb784-c14b-4941-89f3-ffe1b0cec6e5（新 hub 调度会话创建，
  全局唯一 */10 轮转，服务本板+waterprint 板）。b21 收口回写 READY 后，火班按
  轮转规则（READY ∧ last_dispatch 距今 ≥30min 最老优先）自然接续。
- UI 开批通道实测经验三条（前任调度会话 2026-09-19 实测，火回合开批时适用）：
  ①「新建任务」侧边栏按钮常不可寻址——Ctrl+N 快捷键实测有效；②新任务视图预置
  继承项目绑定（值不可读）——必须先按「取消选择当前项目」清空并确认清空后再
  搜索勾选目标项目，防「勾选已选项反致解绑」；③调度侧 Edit 改板遇「文件已改」
  护栏系执行者并发写入，重读后再落笔。
- 既有板上转达条款（门一审 k2 承载直至用户另行通知）照原文继续随注入指令生效。


### 调度员增补六 — 2026-09-19T08:25:54+08:00（hub 停火：用户令删火）
- 用户在 hub 调度会话下达删火令：全局轮转火 automation-4a8cb784-c14b-4941-89f3-
  ffe1b0cec6e5 已 CronDelete（回执 deleted:true，CronList 空集复核）。本条为调度员
  尾部纯追加，claim/状态字段未动；板头 automation_id 字段行保留旧值仅为历史审计指向。
- 本火任内战果：b21（G9）/b22（G10）/b23（G11+母票——第四波 F-GEOM-01 战役全清）
  /b24（F-LAYER-01+F-TIME-01 同火）/b25（F-SENSOR-01）五批完成（勾选 24→31/35），
  F-EXPORT-01（b26）已于 08:20:24 发布。
- **在途 batch 26（F-EXPORT-01）不受影响——执行者独立于火，自行完成收口（翻票+提交+
  板回写 READY）**。收口后本板停于 READY 且无火接续——此为预期态非异常。恢复两径同规：
  用户显式 /batch-relay 重布防（新 automation_id 回填本板，换防协议 hub 变体），或手动
  会话按本板清单领批。
- 调度员会话自本增补起不再开批、不再补派（含执行者中途死亡亦不接管——停火令优先）。
- 门一 k2 换源指令留存板面执行指令原文，重布防时自动随注入指令生效。
