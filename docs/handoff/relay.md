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
- heartbeat_utc: 2026-09-18T02:32:00Z
- claim: claim-1789693931-b10
- no_progress_count: 0
- checked_total: 24
- checked_done: 15

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
