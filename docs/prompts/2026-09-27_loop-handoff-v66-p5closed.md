# 交接书 v66 —— T3-P5 脉络数据层收口（2026-09-27 昼批接续场·二段）

> 前承 v65。排程真相源=本档 §2；战役真相源=docs/design/2026-09-26_theme-trio-final-design.md §6 八票；
> P5 实现规约真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md（D-P5-1..10 终案表）。
> 本场=P5 实现三屋全链+回炉 1+基线再生成 S2 首战毕。

## §0 额度与预算预警

- 本场消耗（账本随记）：k1 链 2（首审 FAIL B2/W5 + 复审 PASS_W）+d1 链 1（GO_WITH_CONDITIONS P0=0）+
  实现者位**主控代位**（开场子代理配额窗未开——并行会话同窗死亡实证；13:13 恢复后直接门审）+
  orchestrator 主控（接管收尾+回炉 1 全批+文档面+基线首战+收口）。
- **配额窗口教训**：周/月上限错误同时打掉两个会话（实现者派发+并行场）——残留接管先例在档；
  开场先探配额再派发重子代理。
- 下一场 P6 时间线渲染=受锁重票（renderer 大面），P7 立票走设计链（Kimi→deepseek，final-design §7）。

## §1 批次完成情况（段间衔接基线——对不上禁提交）

| 项 | 终值（脚本实测） |
| --- | --- |
| verify | **178 件 / 1931 用例**（=1860 F-TIME-02 后基线链+F-TESTREF-S2 172/1874+P5 纯增量 +6 件/+57 例），EXIT=0（回炉后终跑） |
| e2e | **47/47 EXIT=0 两轮**（回炉前 2.2m/回炉后 1.9m——lineage 五锚+库密度全量） |
| locks manifest | **261**（+7=migrations/010+6 新测试件；src 三新件 rows/write-guards/assemble 不入锁面） |
| 豁免台账 | **124 条**（110+**14 条受锁改写面**：通道 pin 55→56/迁移版本上探×6/library-detail month 真值化×5/graph toEqual/版本接续——rulingLink 全指 design-final） |
| 指纹门基线 | **已再生成（S2 机检首战）**：retiring 14（豁免命中 14）added 0 removed 0 零多登零漏登；**exemptionsSnapshot=124 初始化落盘**（裁决部 C4 两核对点全中——次轮起轴二全效）；新基线 **199 文件/1982 用例/6064 断言/skip15** |
| 战役进度 | P1✓ P2✓ P3✓ P4✓ F-TESTREF-S2✓ **T3-P5✓（本批）**；P6/P7 open（**P7 立票走设计链**）；P8/T3-U1 未立（挂账批）；F-TESTREF-S1 open |
| 提交 | 本批 P5 收口 feat（**尾注=[locked-change]**——[test-refactor] 推送预扫撤回[见 §4 教训]；受锁面=模型/schemas/api-surface/迁移/测试 24 件+manifest/exemptions/baseline）+ 本交接书 docs |
| 证据仓外档 | p5-impl/（审包 diff 2062 行+新件 1680 行）+p5-design/（设计链+探针，v65 在案） |

本场门链与主控域实录（教训在档）：
1. **并行会话残留接管**（开场三态 B 新形态）：开场快照 clean≠树真净——另一会话 10:22-10:51 写入 49 项后配额死亡（残留=票中断）；探活性（tasklist 零 node 进程+时间戳停更）→verify 判态红（repo 339 行超限=拆件半成品）→速修完成拆件。**开场三态判定必须在派发动作前重跑 git status**（快照可能失真）。
2. **门一审在回写前拦文档面**（B2=INV 登记+architecture 回写）：收口时点审查拦截=流程正确——主控暂停点报告已列待办但审查时点在前，B 类定性成立；回炉 1 一锅端处置。
3. **守卫③跨组移动盲区**（k1-W3/d1-P2-2 双审同抓=真缺陷）：被引用 sub 变更基型组击穿 upsertEdge 的 base==kind 不变量——回炉补「不得变更基型组」双查+新 1 用例。
4. **node -e 中文多行 argv 吞参再实证**（宪法坑④）：registry summary 追加脚本静默失败（翻票 ASCII 单行成功/中文多行丢参）——文件法重做；本票内第 3 次实证，纪律维持「写文件后 node 文件」。
5. **数字口径纪律**（d1-P1-3）：豁免=14 条/+84 行（非「84 条」）；新用例=55+1 表驱动=56（非「约 53」）——条/行/含表驱动口径必须分清。

## §2 执行序（下一批次）

1. **P6 脉络时间线渲染（受锁重票，三屋全链）**：票面=tickets/registry.ts `T3-P6`；final-design §2/§6 票 6——年份头+月框（`1.6px dashed --month-dash` 满宽右缘对齐 D1）+文献小卡 104×52（三行+徽章+骑缝编号=catalog_no INV-76 消费）+砖砌行错位（偶行右移 62px）+未定月灰实线收纳框+计数实时；**数据层=P5 交付面**（graph nodes=lineageOrder 序 INV-75/month/slot/lineTypes 恒四组）；lineage-layout.ts（RT 树）与 lineage-viewport.ts 退役删除，新 lineage-timeline.ts；受锁=renderer lineage 域全族+对应测试件（**尾注=[locked-change]**——src/tests 混合面挂 [test-refactor] 范围闸必红，见 §4；基线再生成次轮=轴二全效首验）。
2. P7 连线系统（**立票先走 Kimi→deepseek 设计链**——final-design §7 流程注；P6 落地后启动）→ P8 交互收口 → T3-U1 挂账批。
3. 夜批池面：P6 单票即近夜批容量（renderer 大面+退役删除面）；P7 设计链可搭车（网络面）。

## §3 悬挂事项（用户知悉/裁决口）

- 收口轮视觉细调备案（v64 §3 全项沿用+新增）：暗族 accent-ink 对比度/textarea 逐族值差/tab·aside 底缘内缩量/PDF 图片负片化+夜间扫描页 PDF invert 纯黑细调（用户裁决挂收口轮，真实使用带截图）。
- **catalog_no 视觉前缀形态细调**（P5 最小兑现=cat 类 accent 色；形态细节收口轮呈报）+**inferred 边渲染形态**（INV-27 备案：P7 连线系统票定——布局净化段接缝「inferred 同 tree 守卫但按非树边剔除」必须随 P7 处理）。
- 版本号显示位=用户未裁 open（T3-U1 票面）；P3 档次列 VENUE_TIER_MAP 种子 5 条（D3-A 受锁常量修订制）。
- FILE 级豁免通道（删整测试文件的机检出路）=F-TESTREF-S2 移交候选小票（现出路=人工删基线重跑）。
- ai-sensor 域 D1-D8 用户裁决 open（survey 档 §7）——与战役互不阻塞。
- **P5 遗留备案**（门二 P2-3/备案件）：旧通道 schemas 手写 vs 派生（两侧规则逐字一致，向 models 收敛=重构面候选票）/恒四组拒绝文案双源（zod refine+service check 逐字重复，INV-11 轻触）/INV 表 markdown 渲染形态（INV-72~77 位于 prose 节后脱离表头——T3-P2 起既有非本票引入）。

## §4 开工三态指针

**HEAD=本档提交**。A 干净树=直接接 §2 首项（P6 实现——先读 T3-P6 票面+final-design §2/§6 票 6；实现者六段简报以两档为源+P5 交付面清单=INV-75/76/77+graph lineTypes 恒四组+lineageOrder 序）；B 脏树=按票面补完门审（注意 v66 §1-1 教训：**先重跑 git status 核实树态再判三态**）；C 非交接提交=查门审在档。技能清点先行（宪法开工纪律）。**本场无新用户裁决；v64 三裁决（推送 reword 惯例/夜间扫描页挂收口轮/收口节奏）沿用。P6 收口提交尾注面=[locked-change]（[test-refactor] 仅纯测试面白名单票专用——**src/tests 混合面票挂之 CI 范围闸必红**，F-TIME-02 门二 P1-1 先例+本批 P5 笔实证：原双尾注推送前预扫发现 src 22 路径 OFFENDER，msg-only reword 撤回[树零差实证]；初稿预扫句曾误判「白名单内」——实读 ci 范围闸代码逐路径本地模拟后自纠，v64 教训「勿凭战役票先例类推」再犯在案）；push 前预扫=实读范围闸代码+本地模拟，禁凭先例断言。**
