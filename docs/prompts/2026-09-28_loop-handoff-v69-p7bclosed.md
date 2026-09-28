# 交接书 v69 —— T3-P7B 连线编辑交互收口（2026-09-28 晨段收口·五段）

> 前承 v68。排程真相源=本档 §2；战役真相源=docs/design/2026-09-26_theme-trio-final-design.md §6；
> P7 设计真相源=docs/design/2026-09-27_t3p7-line-connection-design-final.md（§4 线型系统 UI 本票全兑现）。
> 本场=v68 会话续段：T3-P7B 立案+实现三屋全链（回炉 2）+门二 GO_WITH_CONDITIONS+收口。
> v68 用户裁决「新任务下一会话开工」已履行（本会话=P7B 专段）。

## §0 额度与预算预警

- 本段消耗（账本随记 9 条）：ops-executor 三轮（69.1M+19.7M+15.8M）+门一四席
  （k1 首审 3.2M+d1 首审 1.8M+k1 复审 2.5M+d1 复审 5.6M）+probe 2.0M+裁决部 6.5M+orchestrator。
- **门链教训三条**：①CSS 假绿双形态同批两现（星斜杠吞规则[机检空白]+特异性压栈
  [类断言/CSS 文本锁盲区]）——关键视觉态须 computed style 判别断言+数值容差域
  （DPR 吸附教训）——已回流教训档 §十三；②B 级根因再证 v68 §4 判断（设计/简报层数字
  会照抄进产物——C2 popover 15 笔误源头=主控回炉简报，简报数字也须实测落笔）；
  ③回炉 2 小批免独立审（P7A 先例）实测可行——文书勘正类处置主控亲验成本远低于独立审。
- 下一会话/次项：C-A4 CI 口径对齐（治理五票批序 2——首推 CI 实跑=验收窗口）。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **177 件 / 1943 用例** EXIT=0（F-CONSOL-03 后不变——探针系 playwright 件非 vitest 面；收口树亲验 verify-closure.raw.txt exit=0） |
| e2e | app **51 用例**（probe project 空集完全静默——门二 V2 实证）；test:e2e:all 首跑 50+1 flake（P7-B 已知型第 1 现，指纹见 §3——低于立案线） |
| locks manifest | **257**（260−4 探针+1 新指针件 z-probes-ARCHIVED.md 自动入锁） |
| 豁免台账 | **123 条**（F-CONSOL-03 孤儿豁免 F-RDR-01 skipSite 单条移除；全 stale=跨票累积观察项移交 F-GOV-01） |
| 指纹门基线 | **194 文件/1994 用例/6175 断言/skipSite12/snapshot123**（F-CONSOL-03 删基线显式重跑——票面「零影响」失实勘正在案：四探针原在基线内[55 断言/skipSite3]；diff 审计 ADDED0/REMOVED4/CHANGED0） |
| 战役进度 | P1-P7B✓；**治理五票批：F-CONSOL-03✓（本段）**，次项=C-A4；T3-U1 挂账批；open 面=8 |
| 提交 | F-CONSOL-03 收口（test(assets)，[locked-change] 单尾注；4D+4M+1A 共 9 路径单笔；范围闸 tr-count=0） |
| 证据仓外档 | F-CONSOL-03/（impl+probe 报告+k1/d1 两轮+裁决部四门审档+raw 40+件+开工记录） |

本段门链实录（B 级根因与教训在档）：
1. **首审双 FAIL——B-1 双席独立同中**：`.tl-card.link-src`(0,2,0) 被编辑态基线
   (0,3,0) outline 全量压栈=拾取源高亮唯一相位 100% 不可视；类断言 toHaveClass+
   CSS 锁文本正则双假绿（「52 测试全绿但文字不可见」同族第三形态）。
2. **回炉 1 六改一勘正**（R1 选择器升 (0,4,0)+e2e computed 判别/R2 pickChip 陈旧守卫/
   R3 deps 补 formOpen/R4 startLinkPick 显式关 popover[结构性互斥]/R5 飞行窗禁建
   [主控裁定窗口禁建——store 全域无乐观写前提]/R6 死声明两处/R7 措辞）→复审双过线
   （k1 PASS+d1 PASS_WITH_WARNINGS）→回炉 2 五项免独立审（R8 staleEdge 双挂/R9
   容差 [2,3]+0.8px 勘正[RPR≈1.25 吸附]/R10 注释依据/R11 INV 三笔/R12 措辞）。
3. **过程自拦两缺陷**（实现者）：CSS 注释星斜杠吞 .timeline 规则（CSSOM 探针实证
   ——P1 同族二次发生，教训档 §十三回流）+e2e P1b 量测坐标系竞态（终版单 evaluate
   原子取值闭合）。
4. **probe 异常 3 条均非阻断**：popover 计数 15/16 笔误（源头=主控简报数字——C2 勘正）
   /简报侧 6226 vs 实测 6230（主控误差）/tinypool 瞬态一轮复跑两轮全绿（低于 e2e
   非确定立案线——指纹登记：EXIT=1+用例全绿+ProcessWorker.initialize）。

## §2 执行序（下一批次——新会话开工）

> **2026-09-28 治理加固五票批并入**（用户裁决「全部立案+完整规划链+并入下批」；
> 规划链三段毕+真相源=docs/design/2026-09-28_gov-batch-design-final.md
> D-GOV-1..20；执行序定档=设计终裁 §6）。五票均双审（各触受锁/CI/安全/
> src/shared——不适用 R5 小批减免）。

1. **F-CONSOL-03 测试资产清出✓（2026-09-28 收口）**：四探针移仓外+W2 勘正+audits 六件
   清出+基线重跑 194/1994/6175/skip12/snap123+manifest 257；门链=k1 PASS+d1 补正后
   PWW+probe 8/8+裁决部 GO_WITH_CONDITIONS（C1-C4 全兑现）。**教训两条已回流本档 §3/§5**：
   ①票面「指纹门零影响」系设计层存量假设失实（⑤i 纪律当场证伪——主控前置实测拦截，
   实现改走删基线显式重跑）；②门一 d1 席代理档隔离墙**禁 Read**——门一简报禁授权
   Read，审包必须全内联（首轮 FAIL 系检材不合规，重派补正后过线）。
2. **C-A4 CI 口径对齐**（双审）：指纹门入 CI fail-fast+DoD 勘正[verify⊇CI]+
   model-names 留手动；首推实跑=验收。
3. **SR-SEC-01 ACAO 通配收束**（双审）：Origin 白名单回显+取证步前置+
   resolveAcao 五分支单测+伪造 Origin e2e 断言。
4. **SR-IPC-10 契约缺口双修**（双审）：workspaces type-test 双证[禁宽型标注]+
   三事件 preload 侧 zod 兜底。
5. **F-GOV-01 治理减容役**（双审+抽查链亲验；两单元两提交）：registry/INV
   存量瘦身+归档[check-tickets 三约束]+防线生命周期登记+治理面退出条件宪法
   条款+日落规则；验证面=抽查 5 票三段链+KB 对照。
6. **P8 交互收口（战役收官重票，三屋全链）**：负债三源汇流=①槽位拖拽重排
   （design §2+P6 备案——x/y 退役后 moveNode 重接槽位语义）；②编辑模式改月飞行动画
   （mockup month-pop L1100+——P7B mode 态共用面已备）；③检查面板（design §2 待裁面
   ——立案时核 design §2 是否已裁，未裁=设计链先行）；④shift 挂摘平滑过渡重接
   （P6 备案——.tl-measure 冻结代价解除路径）；⑤飞行中连线脱节重算（W8/D-12——
   rAF/位置订阅）；⑥drag-hint view 态双文案恢复（P7B 备案——拖拽接入时）。
   **P8 立案前核 design-final §2 检查面板形态是否定稿——未定稿部分走设计链**
   （Kimi 拟定→deepseek 审→主控终裁，v67 先例）。
7. T3-U1 挂账批（用户裁决「战役末批统一处理·P8 之后」）。
8. 夜批池面：五票+P8 分段近夜批容量；F-CONSOL-02/F-TESTREF-S3 小票暖场候选。

## §3 悬挂事项（用户知悉/裁决口）

- **P7-B flake 指纹登记（F-CONSOL-03 门二 V2 首现，C4 兑现——落本档非 flake-ledger
  以免扩票面 diff）**：reader-text.spec.ts:221 P7-B 收官三序列
  `getByText('P7BA-MARK')` 10s 超时 not-found；串行第 41 位；复跑同用例 2.6s 绿；
  **非确定失败第 1 现（立案线=同用例 2 次）**；与本批改动面零交集。第 2 现比对
  基线=本指纹（not-found 型/41 位/10s）。候选归属=next e2e 触及场或 W4 flake
  台账批量补登。
- **exemptions 123 条全 stale 观察**（门二 F1）：跨票累积历史形态非 F-CONSOL-03
  引入（移出前即 124/0/124）；**移交 F-GOV-01 防线生命周期登记面评估**。
- **v56 坑第五变体**（F-CONSOL-03 实现者实录）：node -e 含 `=>` 时 `>` 被 shell
  吃掉→命令截断+意外空文件——「node -e 仅限纯 ASCII 单行」口径应再加「禁 `>`/
  `=>` 字符」；AGENTS.md 四坑并五坑由后续 doc 批统一处理（本档备案）。
- 收口轮视觉细调备案（v64-v68 全项沿用+新增：--signal-a08/--shadow-lg-* 暗护眼
  hue 微差[三稿同值权威维持，用户实感违和则细调]；catalog_no 前缀形态）。
- **P7B 备案面**：乐观 toast 双 toast 语义（P2 观察项）；Popover 250 顶格零余量
  （+1 行即红——P8 触该件先拆）；saveLineTypes 失败路径无专测（缺口登记）；
  expect.poll 不入指纹账（工具盲区——F-TESTREF 系候选）。
- **P8 负债登记**（design §7+P6/P7A/P7B）：飞行中连线脱节重算/shift 平滑过渡/
  mode 态共用面/月标改月+拖拽调序+虚线槽。
- F-TESTREF-S3 open（P6/P7A/P7B 三轮 baseline 首装=场景再证×3——轴二全效
  三连验）；F-CONSOL-02 三件套 open；selection-geometry.ts:12 历史注释；
  lineage-canvas.test 文件名错位（F-CONSOL 系候选）。
- P3 遗留：scripts/audits 残留 ignored 6 件治理轮清出（裁决部 P3）。
- 版本号显示位=用户未裁 open（T3-U1）；ai-sensor 域 D1-D8 open（survey §7）。

## §4 开工三态指针

**HEAD=本档提交**。A 干净树=直接接 §2 首项（**C-A4 CI 口径对齐**——ci.yml 指纹门
增步 fail-fast+AGENTS.md DoD 行勘正+model-names 留手动；验收=**首推 CI 实跑**——
push 后盯 Actions 首跑绿）；B 脏树=先重跑 git status 核实树态再判（v66 §1-1
教训）；C 非交接提交=查门审在档。技能清点先行（宪法开工纪律）。**本场无新用户
裁决；v64 三裁决+v68 收段指令沿用。收口提交尾注面=[locked-change] 单尾注
（v66 §4/P5-P7B 先例）；push 前预扫=实读范围闸代码+本地模拟（P7B 实证 tr-count=0
流程——仅 [test-refactor] 提交触发，本战役全单尾注面零触发）；机检命令禁裸管道
接 &&（v68 教训④沿用）；简报内数字也须实测落笔（本段 C2 教训——主控简报数字
会被实现者照抄进产物与 INV）**。

## §5 教训档回流状态行（裁决 9 固定段）

- CSS 注释星斜杠二次发生族：**已回流**（AI辅助开发经验教训.md §十三条 1）。
- 类名断言≠计算样式生效+字面全等跨机假红：**已回流**（§十三条 2）。
- v68 两条教训（设计层 B 级根因/React 子 effect 先于父）：v68 登记未入档——
  触发场次=v67/v68 会话，性质=「当初为什么立规则」成立，P8 收口轮补回流或
  下次触及同族时随批回流（在案待办）。
- F-CONSOL-03 两条（2026-09-28 段）：①设计层存量态假设（「零影响」类）必须设计期
  实测——⑤i 纪律已有，本票=主控前置拦截正例（若未拦截=实现中段 verify 红回炉）；
  ②门一简报对 d1 席禁授权 Read（其代理档隔离墙）——审包全内联纪律（ai-dev-org
  ORG-12 红旗「给门一的包里含任何仓库访问信息」的宿主子代理形态）。两条均已
  落本档 §2/§3，并入教训档由下次触及同族时随批回流。
