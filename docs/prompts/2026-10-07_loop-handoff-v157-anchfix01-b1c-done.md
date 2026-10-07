# 交接书 v157 —— F-ANCHFIX-01 批 1c 毕·票翻 done（2026-10-07 下午场）

> 前承 v156（批 1a/1b）。本档=批 1c 收官+F-ANCHFIX-01 翻 done；实施单源=
> 设计书 v1.2（docs/design/2026-10-07_f-uires04-anchfix01-design.md——呈裁 C 落点）。

## §0 本批战报（runId=20261007-anchfix01-b1c）

- **批 1c 全链**：chain 六态 anchorMarks 观测透出（manual-override 不 commit、
  从 selectAnchor 派生=显示真值）→EdgeOverlay data-anchors→新拆件
  anchor-occupancy.ts（模块级外部存储：rAF 单写者 wholesale+React 18
  getSnapshot 引用稳定性纪律）→CardAnchorDots 12 dot（armed 态全显 5px
  小型化+占用 data-occupied accent 高亮；edit-hover 通道 slot1 8px——
  B5① 收窄语义沿承）。显示域=可吸附判定域自洽（吸 ¼/¾ 不再落无可见锚
  处——呈裁 C 兑现，INV-120）。
- **三屋链**：ops-executor 两轮（实现+回炉轮 1 六项）；门一 k1+d1 首轮双
  PASS（B0/W0/N8+B0/W2/N7，条件=F-0）→回炉轮 1（F-0 INV-117 增注/
  三态字面值用例/防御两用例/报告勘正/四变异红证）→增量复审双 PASS
  （B0/W0/N2+B0/W0/N7——条件全解除）；门二实证部全绿（P-A 五夹具独立
  数学复算 5/5+P-B 单测全量 264/2750 复跑+P-C e2e 一致性 9 passed 含 1c
  组+C2a 1 passed）+裁决部终裁 PASS（无 B/W 残余、三屋链完整）。
- **verify 三跑一致 EXIT=0**（实现者 verify2/主控亲验/实证部复跑——
  264 files/2750 tests）；locks 371→372（新单测件入锁）；两态截图存证
  （armed/hover——档案区 b1c-shot-*.png）。
- 受锁面三改一新 [locked-change]：lineage-c2-anchors（恰 4→恰 12 笛卡尔
  积）/lineage.spec C2a（12 锚几何 ±1px 三档 zoom+armed 5px·hover 8px
  computed+hover 仅 slot1+browse 负锚沿承）/lineage-anchor-consistency
  新增「1c 占用协同」组（data-anchors↔data-occupied 逐锚协同+占用集
  精确相等）/新单测件 lineage-anchfix01-b1c.test.tsx（五态手算字面值+
  聚合/引用稳定+防御两例）。
- **用户视检（R3 轮模式）=本票最终验收待办**：armed 态视觉（每卡 12 锚
  5px+占用锚 accent 实心）/hover 态（½ 位 8px 沿承）——入口=脉络页 edit
  模式→画线工具；顺带批 1b 手感复核（预览=松手落点所见即所得）。

## §1 主控 P0 计数勘正（门二裁决部 J-1/J-2/J-3/J-4——宪法计数纪律族）

- J-1：impl.report 申报 theme-lineage-tools.css「+33/−14」失准——实测
  **+35/−12**（hunk1 +2/−1+hunk2 +33/−11）。
- J-2：LineageTimelineCard 申报「+2/−2」失准——实测 **+4/−3**。
- J-3：回炉后 diff 面「13 文件+635/−90」中 635/−90 为 12 件审计面数字
  （manifest 14 行面另计）——含 manifest 全口径应 +644/−95；下游引用以
  本注记为准。
- J-4（同族）：h-slip 用例注释「4.51px」与 impl 报告「0.51px」口径均
  不可复算（裁决部复算：欧氏 6.30/曼哈顿 8.86——结论不等式「<桩区 10」
  全口径族下成立，行为面零影响）——P1 勘明。

## §2 遗留清单（P1 后续票候补——触及即改）

1. INV-120 行与 CardAnchorDots 头注「--r」简写→token 真名
   --anchor-dot-r（k1-N7；值面已有三道机检锁：CSS 单源+e2e computed+
   单测——无语义风险，文本指向力项）。
2. h-slip 注释 4.51px/impl 报告 0.51px 口径勘正（J-4+k1 增量 N1）。
3. 多冒号形 token 行为钉死或 nodeId 无冒号域假设登记（k1 增量 N2——
   lastIndexOf 切分下最坏=无害孤儿键）。
4. 字母表四处镜像（anchors 本体/SIDE_LETTER/VALID_KEYS/e2e LETTER）
   类型/导出单源化（d1-N2；e2e 逐锚协同为现行防线）。
5. **chain.ts 340/340 贴顶、EdgeOverlay 227/235 趋紧——下一票触及先
   瘦身**（k1-N8/d1-N7）。
6. INV-120 强制方式列补名 R-3 三态用例（可选）+INV-70 附件性单例清单
   补登 anchor-occupancy（本批新增第 14 个模块级单例——见 §5；invariants.md
   受锁，随下一票解锁顺手同步，本档基线段先滚动计数）。

## §3 P2 观察项（在案不动作）

armed∪hover 并存格 slot1=5px 无断言（双门特异性推演一致+头注声明）；
EdgeOverlay 单写者并存假设（头注申报）；自裁 4 e2e 首跑红缺 raw 档
（过程披露在案）；h-slip 夹具裕量 0.5px 级（路由常量改动时列入预期红
清单——d1 增量 N-2）。

## §4 下一场开工序

1. **首动作=用户视检 R3 轮**（F-ANCHFIX-01 收官视检：armed 12 锚+占用
   高亮+批 1b 手感；视检反馈→视检轮票或直收）。
2. 视检过→批 2（F-DRAGVIS-01 拖拽槽位可视化——首动作拖拽中无头截图
   +computed 探针定正身）或批 3a（F-UIRES-04 拆件瘦身+骨架——G2 白名单
   已批）无闸门可并行/穿插；批 3b/3c/3d 随后（设计书 §6 批表沿承）。
3. F-ANCHFIX-01 域内遗留=本档 §2（候补非欠账——门二终裁无回炉门）。

## §5 基线与治理八指标滚动

- verify：264 files/2750 tests 全绿 EXIT=0；locks=372；基线提交=本档
  随附 commit（F-ANCHFIX-01 done）。
- 模块级单例清单数：13→**14**（+anchor-occupancy.ts——INV-70 附件清单
  随票补登义务见 §2.6）。
- reader 占 src 比/COMPOSITION_ROOT_ALLOW 条数：本批零触及（7 沿承）；
  locks 文件数 371→372；registry open-done=F-ANCHFIX-01 翻 done。
- **事故档回流状态行**：本批无新教训条（J 族计数失准=2026-09-02 既有
  宪法条适用复发——未新增事故档条目；P1 落实时如产生新教训另计回流）。

## §6 成本账（本批子代理——.zcode/org-ledger.jsonl 同步；模型×供应商×套餐分列）

- ops-executor 2 轮（GLM 随宿主 session:host-tier——E3 欠账披露在案）：
  实现轮 ~10.56M / 回炉轮 ~9.88M subagent tokens。
- 门一 k1 2 轮（kimi-third $max）：~0.69M+~0.62M；门一 d1 2 轮
  （deepseek $max）：~0.11M+~0.06M。
- 门二实证部 ops-probe（GLM 随宿主）：~0.97M；裁决部 ops-adjudicator
  （kimi-third $max）：~1.23M。
- 明细行随本档同批落账本（runId=20261007-anchfix01-b1c）。
