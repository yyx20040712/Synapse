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
- 下一会话：P8 交互收口（战役末段重票——设计负债三源汇流[P6/P7A/P7B 备案]）。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **177 件 / 1943 用例** EXIT=0（=P7A 收口 174 件/1894 例+3 新测试件/+49 例[首轮 +44=新件 34+overlay 4+store 7−routing 1；回炉 1 +4；回炉 2 +1]）。**v68 记「172 件」系交接书笔误——P7A 收口树 git ls-tree 实测 174 件，本轮 177=174+3 恰闭合（勘正在案）** |
| e2e | **51/51 EXIT=0 三轮**（T7 编辑线型全流[reload 持久+computed stroke-width 1.7 判别锚]/T8 新建连线全流[自环重复 toast+Esc 分支+computed outlineWidth 容差 [2,3]]/**T-P1b resize 真机直证=P7A 裁决部 P1b 条件首日兑现**；T1-T6 锚保活） |
| locks manifest | **260**（+3 新测试件） |
| 豁免台账 | **124 条不变**（三走删基线显式重跑全走 baseline 收紧面零豁免新增） |
| 指纹门基线 | **删基线显式重跑×3**：新基线 **198 文件/1998 用例/6230 断言/skip15**+exemptionsSnapshot=124 保持；零漂移（ADDED 3 恰新件/REMOVED 0/CHANGED 全批内）；用例链 1946→1993→1997→1998+断言链 5939→6207→6225→6230 账目闭合（裁决部四源复算） |
| 战役进度 | P1-P7A✓ **T3-P7B✓（本批）**；P8 未立（负债清单见 §2）；**治理加固五票批 2026-09-28 并入 §2[SR-SEC-01/SR-IPC-10/F-CONSOL-03/C-A4/F-GOV-01——外部组合审视经完整规划链立案]**；T3-U1 挂账批；open 面=9 |
| 提交 | 立案 fb8707fe511+收口 **afd29158269**（feat lineage）；范围闸预扫 tr-count=0（实读 ci.yml L141-165 本地模拟——单尾注面零触发） |
| 证据仓外档 | t3p7b-impl/（报告+diff 三版+四门审档+probe/+裁决档+raw 39+件） |

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

1. **F-CONSOL-03 测试资产清出**（双审）：四探针 spec 移仓外+F-TESTREF-W2.file
   勘正[审 W10 真阻断收口]+scripts/audits 六件同票；config 零改；验收锚=
   check-tickets 存在性恢复绿。
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

**HEAD=本档提交**。A 干净树=直接接 §2 首项（**P8 交互收口立案**——先核
design-final §2 检查面板定稿状态：已裁=直接立票五层；未裁=设计链三段先行[Kimi
拟定→deepseek 审→主控终裁]）；B 脏树=先重跑 git status 核实树态再判（v66 §1-1
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
