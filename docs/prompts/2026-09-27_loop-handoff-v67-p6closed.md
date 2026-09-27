# 交接书 v67 —— T3-P6 脉络时间线渲染收口（2026-09-27 昼批接续场·三段）

> 前承 v66。排程真相源=本档 §2；战役真相源=docs/design/2026-09-26_theme-trio-final-design.md §6 八票。
> 本场=T3-P6 立案+实现三屋全链（回炉 2+加固批）+基线首装语义重建毕。

## §0 额度与预算预警

- 本场消耗（账本随记）：立案单审 k1 1（45k）+实现者 ops-executor 1（session:host-tier，6 单元，25.6M——E3 欠账行未绑定形态）+门一双审三轮（k1 链 4 跳 0.77M+1.01M/d1 链 3 跳 2.8M+0.57M+0.74M）+probe 1（1.5M）+裁决部 1（3.8M）+orchestrator 主控（立案裁决+五裁决+回炉 1/2+加固批+收口）。
- **审包纪律新教训（两席同抓）**：git diff 不含 untracked 新件——含新件的批次审包必须附新件全文档（new-files.txt 先例）；立案 find 过滤词盲区（*lineage* 漏 edge-label-layout.test）=清单枚举禁依赖单一 grep 模式。
- 下一场 P7 连线系统=受锁重票（几何纯函数+路由避让），**立票先走 Kimi→deepseek 设计链**（final-design §7 流程注）。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **172 件 / 1872 用例** EXIT=0（=基线 172/1874+退役 7 件面收敛后净态；P5 后 178/1931 → -6 件/-59 例[退役 7 件+新增 1 件 timeline 27 用例+store-write +1]） |
| e2e | **48/48 EXIT=0 两轮**（47+T6 砖砌真机锚——窄窗 5 卡同月/集合等价/poll 62px/跨行 y 差） |
| locks manifest | **255**（261-8 退役 src 件+2 新测试件入锁净态） |
| 豁免台账 | **124 条不变**（退役 7 件与台账零交集实证——脚本双检） |
| 指纹门基线 | **首装语义重建毕**：die(4) 人工裁决 46 处全批内授权[7 FILE+36 case+3 assert]→diff 审计=REMOVED 7 恰退役/ADDED 1 新件/CHANGED 7 批内+1 良性 line 记录漂移（P5 场顺序遗留——身份键零变化）；新基线 **193 文件/1924 用例/5839 断言/skip15**+exemptionsSnapshot=124 保持（轴二全效首验毕——**F-TESTREF-S3 的 FILE 级豁免通道需求本票场景再证**：现行出路=人工删基线显式重跑，S3 票落地后此流程机检化） |
| 战役进度 | P1✓ P2✓ P3✓ P4✓ T3-P5✓ **T3-P6✓（本批）**；P7/P8 未立票（P7 立票走设计链）；T3-U1 挂账批；open 面=4（S1/S3/CONSOL-02/T3-U1） |
| 提交 | 立案笔 2d7ca22（docs tickets+门一单审）+收口笔 **aac4215971a**（feat lineage+翻票）；**已推送**（8a38b32..aac4215；push 预扫=实读范围闸代码+本地模拟零 [test-refactor] 触发） |
| 证据仓外档 | t3p6-gate-reports/（立案批+实现批+回炉 1/2 审包+INDEX 指针）+t3p6-impl/（diff 三版+新件终版+probe/ 十项 log+mutation-records 补录） |

本场门链与主控域实录（教训在档）：
1. **票面互斥停手呈报**（实现者正确触发接缝归责）：票面「保活 6 件零触碰」vs「退役 Canvas 全族」互斥——3 保活件顶层 import/pointer 断言耦合退役面+theme.test 受锁票面外；主控五裁决（改写授权/退役第 7 件/token 授权/moveNode 保留/rowshift 奇数索引）。
2. **月标签裁切真缺陷**（d1-B1 首审+主控复核）：DOM 把 month-tag 放 .month-frame 内被 overflow:hidden 裁 top:-9px 悬出段——mockup 中标签与 frame 兄弟；修+防回漂锚+M-B1 红证。
3. **测量冻结不动点**（d1 三过 W1 机制级发现→加固批）：transition 在场使同步复测读过渡起点布局→迭代退化单轮+空确认（>8 卡同月行容量偏差真实面）；修=迭代期 .tl-measure 冻结 margin-left 过渡（量测恒终态布局）+8 轮振荡守卫（M-W1g 红证=摘守卫 React max-update 崩）+source-text 锁三层。
4. **五票 file 指针迁移**（check-tickets 退役冲突首例）：R2-LG9/10/11+SR2-LG-02/07 指向已删文件→迁移承接件+历史注记（LG9/10 诚实注=无语义承接仅机检存在性；LG11=TimelineCard 真承接）；lineage-timeline.ts 头注补 b3: P7-H 谱系指针。
5. **node -e 再犯两记**（坑①④：$max 被 bash 展开+中文多行 argv 吞参/引号传递误报）——账本/registry/INV 脚本全数切文件法，纪律维持。
6. **数字口径**（裁决部复算勘正）：timeline 用例 25→27（回炉 2 +2）；实现者报 1871 vs 主控亲跑 1870（差 1 以亲跑为准——回炉 2 后 1872）。

## §2 执行序（下一批次）

1. **P7 连线系统（受锁重票，立票先走设计链）**：final-design §6 票 7+§2.4 连线段+§7 流程注——**Kimi 拟定（首跳稿）→deepseek 对抗审→主控终裁定稿**（P5 同型三段链）后立票再实现；范围=四基础型+子线型（展开式选择器/新建轮转调色板）+路由三式（垂直式/平级弧/绕行折线）+避让四检（垂直带/弧入口横道/回程扫掠带/标注压口右移——降级换路由，连线永不穿卡与月份标注）+lineage-routing.ts/lineage-linetypes.ts 新件；**P6 交付接缝**=58px 绕行走廊预留[.tl-month margin 右]+data-node-id DOM 锚+INV-27 inferred 渲染形态备案（P7 票定）+e2e T5 视觉锚恢复承诺+边三色 token 预设（--survey-edge/--manual-edge/--edge-inferred——tree 实线色届时按 §2.4 重定）+slot 語义（月内序=slot INV-75）。票可拆 P7a 路由/P7b 编辑交互（final-design §6 注）。
2. P8 交互收口（槽位拖拽重排+编辑模式改月飞行动画+检查面板）→ T3-U1 挂账批。
3. 夜批池面：P7 设计链可搭车（网络面）；F-CONSOL-02/F-TESTREF-S3/S1 小票暖场候选。

## §3 悬挂事项（用户知悉/裁决口）

- 收口轮视觉细调备案（v64 §3 沿用+v66 新增全项沿至本档）：暗族 accent-ink 对比度/textarea 逐族值差/tab·aside 底缘内缩量/PDF 图片负片化+夜间扫描页 invert 纯黑/catalog_no 视觉前缀形态（P5 最小兑现=cat 类 accent 色）。
- **P7 接缝备案**：inferred 边渲染形态（INV-27——「inferred 同 tree 守卫但按非树边剔除」必须随 P7 处理）；e2e T5 视觉锚恢复；tree 实线色 token 重定；图例随子线型重建。
- **P6 遗留备案**：shift 挂摘无平滑过渡（测量冻结代价——P8 拖拽位移动画票重接）；selection-geometry.ts:12 历史注释指向已删模块（票外遗留下票顺带清）；lineage-canvas.test 文件名-内容错位（基线键已入册——F-CONSOL 系候选）。
- FILE 级豁免通道=F-TESTREF-S3 open（P6 基线首装重建=场景再证；现行出路=人工删基线显式重跑）。
- 版本号显示位=用户未裁 open（T3-U1 票面）；ai-sensor 域 D1-D8 用户裁决 open（survey 档 §7）——与战役互不阻塞。
- F-CONSOL-02 三件套 open（P5 遗留单源化收敛）。

## §4 开工三态指针

**HEAD=本档提交**。A 干净树=直接接 §2 首项（**P7 设计链启动——Kimi 拟定首跳稿**，输入=final-design §2.4+§7+P6 交付面[58px 走廊/data-node-id/INV-75 slot/边三色 token]+INV-27 备案；设计链档=仓外 t3p7-design/ 起档）；B 脏树=先重跑 git status 核实树态再判（v66 §1-1 教训）；C 非交接提交=查门审在档。技能清点先行（宪法开工纪律）。**本场无新用户裁决；v64 三裁决沿用。P7/P8 收口提交尾注面=[locked-change] 单尾注（src/tests 混合面同 P5/P6 先例）；push 前预扫=实读范围闸代码+本地模拟（v66 §4——本批 aac4215 已实证流程）。**P7 立票携带勘误**：v66 §2「P7 立票走设计链」表述精确化为「设计链毕后立票再实现」（P5/P6 同型：T3-P6 立案笔 2d7ca22 即先立后实现的三屋派发依据形态）**。
