# 交接书 v156 —— F-ANCHFIX-01 批 1a 探针收官·C/D 二轮裁决落定·批 1b/1c 全解闸（2026-10-07 晚）

> 前承 v155（R3 设计批）。本档=批 1a 收口档；**实施单源=设计书 v1.2**
> （docs/design/2026-10-07_f-uires04-anchfix01-design.md——v1.2 批 1a
> 探针终裁+C/D 二轮裁决回填）。

## §0 本批战报（runId=20261007-anchfix01-b1a）

- 探针 P1/P2/P4/P5 四件 52 样本全绿（分解：P1=36/P2=5/P4=5/P5=6——
  rootcause-report §五样本账同源；主控亲核执行——零子代理派发，
  探针迭代密集型亲跑优）；证据档=仓外 `20261007-anchfix01-b1a/`
  （probe-anchfix.mjs+四 JSONL+rootcause-report.md+analyze.mjs）。
- **根因终裁：候选 3b 实锤**（预览锚 nearestAnchor〔距离最近〕≠路由锚
  selectAnchor〔主向定边+投影〕——规则不同源）。P5 六场景分叉 5 起=83%、
  跳锚 32-66.48px；竖向族系统模式：预览恒吸 ½ 锚、松手路由恒落 ¼/¾ 锚
  （瀑布错位使目标中心 x 偏移→投影系统性偏离 ½）。
- 候选 2（Z 形越锚）证伪：P1 全 36 样本（六态×zoom 三档×pan×冷读）边
  path 首末点法向/沿框双 0 精确命中 12 锚——「锚端不变性」DOM 级成立。
- 候选 1a/1b/1c 全证伪：P2 badge/matrix/卡内容宽三源跨档恒等；
  P4 rAF0/1/2+settled 四相位端点逐位全等（零帧间隙）。
- 探针零 src 改动（P5 预览锚=draw-preview line x2/y2 纯几何推导——设计稿
  「临时透出 data-preview-slot」优化免除）；工作树零残留。

## §1 用户二轮裁决（2026-10-07 呈裁后——C/D 闭环）

| # | 呈裁点 | 裁决 | 效果 |
| --- | --- | --- | --- |
| D | 契约变更触发 | **统一为路由规则**：预览吸附改 selectAnchor 同函数同参（所见即所得——松手零跳动；手感=吸附点按主向规则不再紧跟光标） | 批 1b 修复面解闸 |
| C | 锚点显示层 | **armed 态 12 锚小型化全显+占用槽高亮**（显示域=可吸附域自洽） | 批 1c 解闸 |

## §2 批 1a 副发现（修正三项〔与设计书 v1.2 终裁记录同源〕+验证记录一项）

**修正三项（1b 消化面）**：

1. **桩三元组 d 级断言改形态**：stripCollinear 剔共线桩顶点+圆角切点截短
   首段→「次点=stubEnd」结构性不成立；1b e2e 改断「首段方向沿命中边外
   法线 ±2°」（桩长由切点几何反推或 skeleton 级单测承载）。
2. **Oracle 分路由镜像**：selectAnchor 仅 direct 态；h-slip=sideAnchor
   近侧、corridor/fallback=sideAnchor 右缘——设计 W8 单锚规则勘正。
3. **direct 态瀑布错位下结构性稀缺**：同 slot 跨月 x 不对齐（(R×82)
   mod 148 偏移）——1b 六态矩阵 e2e 以实测 route 断言为准。

**验证记录一项（非修正）**：manual-override via 冷读端点精确落锚
（R4 型两相位已验——正面确认，1b 无消化义务）。

## §3 实施开工序（设计书 v1.1 §6 沿承+闸门态更新）

1. **批 1b（D 已裁，可即开——三屋）**：useDrawLine 选锚统一（nearestAnchor
   →selectAnchor 族：armed hint+拖拽 snap+finish 目标三消费点）+防御性
   单测（store zoom vs computed matrix 一致性）+销项 e2e 常设化
   （[locked-change]：unlock→新增 spec→generate→apply→全量 verify）
   +INV-A 登记（invariants.md 受锁）；**§2 修正三项全数入 1b 票面**
   （桩 d 级断言改「首段方向沿外法线 ±2°」形态+Oracle 分路由镜像+
   六态矩阵实测 route 断言）。
2. 批 1c（C 已裁）：CardAnchorDots 12 锚 armed 全显+占用槽高亮——批 1b
   毕后接续（显示层消费 slotMarks/占用态与 1b e2e 面协同）。
3. 批 2（F-DRAGVIS-01 票）/批 3a（F-UIRES-04 票，G2 白名单批）无闸门
   可并行/穿插——**均非 F-ANCHFIX-01 票面**。
4. F-ANCHFIX-01 票=批 1b+1c 双毕后翻 done（C2 挂账销项随 1b e2e 落地；
   批 2/3a 归属票另翻各票）。

## §4 环境与基线

- 基线=批 1a 收口提交（本批：设计书 v1.2+registry 注记+本交接书+账本）。
- dev 实例零驻留（探针自起自闭，safeClose 护栏）。探针件在仓外档案区
  （check-locks walk 不覆盖，无受锁义务）。
- 下一场首动作：批 1b 派发（ops-executor 六段简报——票面=useDrawLine
  统一+受锁 e2e 流程；配置按 methodology §4.5：实现者随宿主档）。
