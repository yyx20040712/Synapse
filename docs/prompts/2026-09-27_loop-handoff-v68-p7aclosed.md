# 交接书 v68 —— T3-P7A 连线路由渲染收口（2026-09-27 夜段收口·四段）

> 前承 v67。排程真相源=本档 §2；战役真相源=docs/design/2026-09-26_theme-trio-final-design.md §6；
> P7 设计真相源=docs/design/2026-09-27_t3p7-line-connection-design-final.md（D-P7-1..22+门链修正）。
> 本场=v67 会话续段：P7 设计链三段毕+T3-P7A 立案+实现三屋全链（回炉 2）+门二 GO+收口。
> **用户指令 2026-09-27：「完成当前批次后收口，新任务下一会话开工」——本档后收段。**

## §0 额度与预算预警

- 本段消耗（账本随记）：P7 设计链外部两跳（kimi 首跳 8.9k out+deepseek 审 10.9k out）+
  实现者 ops-executor 三轮（25.6M+11.5M+5.3M）+门一四席（k1×3：81k/75k/81k+d1×3：282k/103k/160k
  首审两席+复审两席+回炉 2 免独立审）+probe 精简 517k+裁决部 2.1M+orchestrator 主控。
- **门链教训两条**：①审单 B 级根因常在设计层（P7A 三 B 中两项=D 表缺陷——设计终裁稿也须过
  对抗链拷问几何自洽性，本档 D-4 让行机制两轮才被 k1 证伪）；②React 子组件 effect 先于父
  （W1/W6 终态触发缺口——跨组件触发链设计须核 effect 时序）。
- 下一会话：P7B 编辑交互（受锁重票）首动作=立票（设计源已备）。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **172 件 / 1894 用例** EXIT=0（=P6 后 172/1872+P7A 纯增量 +2 件/+22 例[routing 16 it+overlay 6 例=22——palette 冒烟含 routing 件]−TOKENS −1 断言族净额） |
| e2e | **48/48 EXIT=0 三轮**（T1 连线出现锚+滚动 bbox y 差+图例视口锚/T5 ref 点线视觉锚恢复——P6 备案承诺兑现/T6 砖砌锚保持） |
| locks manifest | **257**（+2 新测试件） |
| 豁免台账 | **124 条不变**（P7A 零豁免新增——3 MISSING_CASE 走 baseline 收紧面非豁免） |
| 指纹门基线 | **删基线显式重跑毕**（人工裁决 3 处=断言新增+TOKENS −1 收紧面）：ADDED 2 恰新件/CHANGED 2 批内（lineage.spec+theme.test）/REMOVED 0/零漂移；新基线 **195 文件/1946 用例/5939 断言/skip15**+exemptionsSnapshot=124 保持 |
| 战役进度 | P1-P6✓ **T3-P7A✓（本批）**；P7B 未立票（设计源=design-final §4——下一会话首动作）；P8 未立；T3-U1 挂账批；open 面=4（S1/S3/CONSOL-02/T3-U1） |
| 提交 | 设计档 6121d3ca+立案 69ff2a98+收口 **cec2601472d**（feat lineage）；**已推送**（push 预扫 tr-count=0） |
| 证据仓外档 | t3p7-design/（三段链+实现简报）+t3p7a-impl/（diff 两版+新件终版+probe/ 六项） |

本段门链实录（教训在档）：
1. **设计链三段**（v67 §2 首项兑现）：Kimi 首跳 345 行（自查诚实 §7 假设 10 条）→deepseek 审 B3/W12/N4 返工→主控终裁 D-P7-1..22 入仓（含三仓库事实发现：mockup 图例已裁四色→P6 预留三 token 预期落空随 P7A 删）。
2. **门一三轮**：首审双返工（k1 B2：C4 死分支[D-4 设计缺陷]+detour-bottom 零检测；d1 B1：回程无卡检+W3-W7）→回炉 1（三 B 裁撤补检+六 W：onWarn/循环占道/bbox/Map/epoch/图例）→复审双 PASS→回炉 2（六小项：回卷/计数/C4 裁省/图例锚/正面用例+M8 三例红）。
3. **M7 教训**（实现者如实呈报）：变异首跑未红=测试自身缺陷（rerender 内联 new Set()/[] 新引用掩盖 deps 缺席）——修测试隔离后红证成立；「每个测试必须能失败一次」对变异 harness 同样适用。
4. **id 白名单与管道教训**（立案笔）：T3-P7a 小写 a 不在 check-tickets ID_WHITELIST（P7A 大写形态）+`cmd | tail` 管道吞退出码致 commit 先行（P2「verify 管道假绿」同族再犯）——amend 未推送窗内修正；**机检命令禁裸管道接 &&**。

## §2 执行序（下一批次——新会话开工）

1. **P7B 编辑交互（受锁重票，三屋全链）**：设计源=design-final §4+D-17/D-21（lineage-palette.ts 已入库待消费）+P7A 交付面（EdgeOverlay 命中层 pointer-events:none 待开/resolveLabelEntry 直测面去留/多边同道错峰线宽透明度域）；范围=EdgeTypePopover 单开手风琴（恒四组▸子线型 radio+色块 dash 预览▸组内＋新建内联表单[PALETTE/DASH_ROT 轮转 D-10]）+编辑模式 toggle（mode 驻 LineageTimeline——P8 共用面 D 表 §4）+新建连线流（idle→picking-source→picking-target→校验→popover→加边）+Esc/取消分支；**P1b 挂账=resize 不错位真机直证（裁决部）首日补**；受锁=renderer lineage 域+对应测试件+[locked-change] 单尾注。
2. P8 交互收口（槽位拖拽重排+编辑模式改月飞行动画+检查面板+shift 平滑过渡重接[P6 备案]）→T3-U1 挂账批。
3. 夜批池面：P7B 单票近夜批容量；F-CONSOL-02/F-TESTREF-S3/S1 小票暖场候选。

## §3 悬挂事项（用户知悉/裁决口）

- 收口轮视觉细调备案（v64/v66/v67 全项沿用）；catalog_no 前缀形态细调（P5 最小兑现）。
- **P7B 接缝备案**：多边同道视觉错峰（线宽/透明度域）；resolveLabelEntry 生产零调用去留；resize 不错位真机直证（P1b 首日）。
- **P8 负债登记**（design §7+P6/P7A）：飞行中连线脱节重算/shift 挂摘平滑过渡/mode 态共用面。
- F-TESTREF-S3 open（P6/P7A 两轮 baseline 首装重建=场景再证×2）；F-CONSOL-02 三件套 open；selection-geometry.ts:12 历史注释（票外遗留）；lineage-canvas.test 文件名错位（F-CONSOL 系候选）。
- 版本号显示位=用户未裁 open（T3-U1）；ai-sensor 域 D1-D8 open（survey §7）。

## §4 开工三态指针

**HEAD=本档提交**。A 干净树=直接接 §2 首项（**P7B 立票**——设计源 design-final §4 已备，五层票面以 D 表+§2 摘要为源；立案后六段简报派发 ops-executor）；B 脏树=先重跑 git status 核实树态再判（v66 §1-1 教训）；C 非交接提交=查门审在档。技能清点先行（宪法开工纪律）。**本场无新用户裁决（收段指令除外）；v64 三裁决沿用。收口提交尾注面=[locked-change] 单尾注（v66 §4/P5/P6/P7A 先例）；push 前预扫=实读范围闸代码+本地模拟（P7A 实证 tr-count=0 流程）；机检命令禁裸管道接 &&（本段教训④）。**
