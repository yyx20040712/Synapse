# 交接书 v234 —— F-LANEGRID-01 B1-B3 收口（车道网格 B1 网格层/B2 分配器/B3 更新集+manual 入网格）+修史

> 取代 v233（2026-11-19 R2-C5 场）。本场=2026-11-19~20 车道网格实现场
> （runId=20261119-lanegrid）：设计稿 v3 三轮对抗审查+用户六项裁决与全文
> 批准 → B1/B2/B3 三批实现+独立审查回炉 → 并行前端会话交错+修史。
> **B4 移交新会话执行**（用户指示）。

## §0 本场总账

- **设计**：docs/design/2026-11-19_f-lanegrid01-design.md v3（三轮审查
  R1 FAIL 5B/9M/3m→R2 新 B6/M10/M11→R3 PASS）；六呈裁点全定案（manual
  入网格甲/步长 8px/月域更新集澄清——via 清除域仅端点在变化帧、穿框手动
  边 blocked 承接/段级溢出/异高 L 形/RouteTag 单态）；提交 6b11c88d+
  65f34875（CI success）。裁决记录=2026-11-19_lane-grid-rerouting.md §6。
- **B1 网格层**（05129ddf，CI success）：grid.ts 五族车道表（锚道/间隙道/
  边侧道/外区带/帧顶底带，统一「锚定边±(10+8k) 至对边−10」）+occupancy.ts
  段级占用+37 例。审查两轮（帧顶带 blocker/alive 端点开闭/可变异→回炉
  PASS；等号边界主控亲修）。
- **B2 分配器**（6e1a6d30，本地未单推）：allocate.ts（Dijkstra
  (拐点,长度,y,x,方向序) settle-first-wins+同锚错峰 i mod K+段级溢出
  overlapSpans+blocked 两族）+clearance.ts 拆件+chain.ts 重写（carried
  第四参+锚回放）+六态七模块删除（detour/bands/outer-ring/slots/residual/
  zapply/gap-cells）+契约映射 42 条（删 100/重写 165，映射表见批次报告
  .zcode/dev-troupe/f-lanegrid01/）+金标重冻结（4 边手推算式注于测试）。
  审查 R1 FAIL（窗口剪枝假 blocked blocker/短直连/金标论断失实）→回炉
  （扩窗 bbox±80∪边侧∪外区∪锚道+窗内无解全表重跑）→PASS。性能：20 卡
  36 边锚 105ms；STRESS30（43 节点）24.4s（全表重跑正确性成本）。
- **B3 更新集+B3b manual 入网格**（f439cdfc，修史后新哈希）：scope.ts
  （帧差分计算集三源+viaClear 月域）+rerun.ts（classifyInputDiff/planRerun
  三模 zero/single/full）+use-lineage-routes prev 接线+store
  applyObstacleReroute 复合单元（一次拖放一撤销单元；undo/redo 不清 via；
  reorderMonthSlots 并入删除）+manual 线入网格（车道格磁吸 8px/提交门双门
  ——全点链正交+格点钳制精确落库/manual 段占用登记+叠线放行/旧 via 不
  迁移）。审查 R1 FAIL 1B/5M→回炉→R2 残留混合 diff（主控亲修）→探针全绿。
- **修史**（用户裁决）：初版 B3（2837b8a5）误卷并行会话 theme.test.ts
  v2 断言（`git add -u` 扫入）致快照不自洽——重建为 f439cdfc（仅剔
  theme.test.ts，提交说明更正）；前端两期重放为 41186b2b/011b3892。
  三快照实测各自全绿（B3'' 277 例/头 4251 例+quality 0）。
  **哈希对照：2837b8a5→f439cdfc；ab7eec06→41186b2b；ec1d7a43→011b3892**
  （B2 6e1a6d30 及之前不变）。origin/main 仍指旧链 ec1d7a43——
  **推送需 force-with-lease，待用户确认后执行**（§1-1）。
- 验证终态：新头全量 403 文件/4251 例绿+quality 0+typecheck/lint 绿；
  e2e 未跑（B4 范围）。审查记录+research 报告=.zcode/dev-troupe/
  f-lanegrid01/；探针=仓外 scripts-audits/f-lanegrid01-*/。

## §1 下场序（B4=本票收口批，新会话清单）

1. **首动作**：核本交接书；向用户确认 force-push（origin=ec1d7a43 旧链
   vs 本地 011b3892 新链）→`git push --force-with-lease`；或等用户指示
   推迟（若推迟，B4 提交后再一并 force-push）。
2. **e2e 重基线**（预期红面=走线族）：`npm run build` 先行+`npm run
   test:e2e`。范围：route-slots 5 例（坐标集封闭改锚∪车道表——
   buildLaneTable 直算；data-slot→data-lane）；route-stress（七不变量
   期望坐标改车道表直算+**⑥c 升硬：SHARED_LEVEL_ROUTES 删除，非豁免对
   Δ≥8−TOL（TOL=0.6），豁免仅 overlapSpans 登记区间对与错峰/复用桩区对**；
   B2b 已做 typecheck 收敛，运行时断言待重推导）；anchor-consistency
   （锚体系未动——零跳动三场景金标重冻结+主体保留）；lineage.spec 走线
   耦合 ~9 例（data-route∈{grid,manual-override} 等）。性能预算：
   routeAll 单次全图重算在大图 ~25s 量级——e2e 超时参数核对。
3. **设计补段呈裁**：allocate.ts 头注「搜索域=窗口规则」补入设计 §3.2
   （窗内解 vs 全局最少拐理论态——呈用户备案）；§5/§10-B4 关账表
   「CELL_EPS 删除」改「保留（grid 量化域容差族单源）」；旧 via 遗产面
   （不迁移、随重排/编辑消亡）登记。
4. **INV 重写**（docs/invariants.md 六条）：SLOTGRID-02（封闭集=锚∪
   车道表+contentH/frameKey 快照面）、112（分配结果断言——异道 ≥8/
   同道重叠⟹overlapSpans 或错峰桩区）、115 **退役**（残余机制删除）、
   79（blocked 收窄=端点封死族+布局性不可达+端点缺失）、119③（接驳=
   外法线桩+锚道）、117（laneMarks/overlapSpans/data-lane 域）。
5. **关账表**（B4 提交说明内）：DFS_BUDGET 工单关闭（消费者已删）/
   bandCap·maxOff 公式镜像两处删除核销/CELL_EPS 保留改文/C2 缩减项判定
   （零 blocked 目标达成即关）/SHARED_LEVEL_ROUTES 删除。挂账核销：
  v233 §5 的 F-LANEGRID-01 清偿面（⑥c 豁免+INV-115 负面承诺域）兑现。
6. **收口**：tickets/registry.ts F-LANEGRID-01 status→done+summary 回写
   （F-LINEAGE-02 域内锚错峰挂账随本票兑现核销）→verify+test:e2e 全绿
   →提交（staging 显式列文件——**注意工作树可能有前端会话新改动，禁
   `git add -u` 目录级扫入**，B3 误卷教训）→push→CI success→交接书
   v235+health-scan（RED=0）。
7. 沿承：R5 拖动空槽位设计稿、前端改造第三期（前端会话自主排程）、
   PAD=6 观感复核（v232 §4-3）。

## §2 治理注记（本场增量）

1. **并行会话工作树互踩**：两主控会话同树并行，`git add -u` 目录级staging
   扫入他方未提交文件（B3 误卷 theme.test.ts）——修史收口；后续多会话
   并行时 staging 必须逐文件显式列名，verify 门被彼方进行态阻塞时以
   「分项门（typecheck/lint/vitest）+树快照归属判别」过渡并在批次说明
   申报。
2. **审查探针副本陈旧假阴**：探针 import 仓外 build/ 转译副本不随源码
   更新——B1 等号边界复核时误报 MISMATCH；探针须重建副本后复跑再下结论。
3. **主控亲执边界**：设计稿主控亲写（七裁决已锁架构+planner 槽 Kimi 配额
   风险）；B1 等号边界/B3 混合 diff 两处小修主控亲执——均在审查者探针
   证据下定点修，无绕过审查。

## §3 测试版本路线

| 序 | 票 | 状态 |
|---|---|---|
| 10 | 集中视检轮 | R1/R2-C1~C5 done；**R2-C6 车道网格=B1-B3 done、B4 收口中场** |
| 11 | dist 测试版 | 终点（B4 后视检复核进入） |

## §4 待用户面

1. force-push 确认（§1-1）。
2. B4 设计补段呈裁（搜索域窗口规则备案，§1-3）。
3. B4 产出走线观感复核（异高 L 形/步长 8/错峰桩区——建议附截图）。

## §5 沿承挂账

- open 池=6 张（F-EVCTX-02/F-SNAPHINT-01/F-WINGUARD-01/F-E2EFLK-01/
  F-RECOV-03/F-LANEGRID-01——B4 关闭后 5 张）。
- use-edge-edit 656 raw 行数债（B3b materializedSegDrag 迁驻后缓解，
  沿承观察）；三注册表同型/DFS_BUDGET 触达性（B4 关账表核销）。
- E5 flake 台账沿承（v233 §3-2）；R1-B1 沿承。

## §6 CI 回执与推送状态

- 44458165076（6b11c88d 设计）success；44527763775（05129ddf B1）success。
- 6e1a6d30（B2）/f439cdfc（B3）/41186b2b+011b3892（前端两期，重放后
  新哈希）未推送；origin/main=ec1d7a43（旧链）——force-with-lease 待
  用户确认。B4 收口随批推送+核 CI。
