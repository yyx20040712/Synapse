# T3-P7 连线系统——设计终裁定稿（2026-09-27）

> 三段链毕：Kimi 拟定首跳稿（仓外 t3p7-design/drafter-p7-hop1.md）→ deepseek 对抗审
> （B3/W12/N4 返工——仓外 auditor-p7-r1.md）→ **本档=主控终裁定稿**（实现票真相源）。
> 事实补充源=仓库实测（P6 交付结构+mockup 图例 L209-217）——首跳稿/审均未接触仓库，
> 三处阻断与多处警告由主控以仓库事实闭合。

## §0 终裁决定表（D-P7-1..22——对首跳稿的修正/确认；W/B 编号对应审单）

| # | 决定 | 依据/闭合 |
|---|---|---|
| D-1 | 载体=**SVG overlay**（方案 A） | 首跳稿论证成立，审无异议 |
| D-2 | **B3 闭合**：滚动容器=.timeline（overflow-y auto）；.tl-content=内容盒**非滚动容器**；svg=`position:absolute; inset:0` 挂 .tl-content（覆盖全内容高=滚动内容高，随文档流滚动零跟随成本）。首跳稿「width/height=滚动尺寸」表述作废（inset:0 已含此义） | 仓库 theme-lineage.css 实测 |
| D-3 | **B1 闭合**：dy≤0（非跨年、目标不在源下方）显式并入 **detour**（绕行折线）；降级链补「几何不适用」转移（routeEdge 首检 dy≤0 直进 detour，不经 C1）；用例 2 断言 route='detour' | 审 B1 |
| D-4 | **B2 闭合→P7A 门一审后修正**：~~让行右移+tail 接入~~**裁撤**（k1-B1：entry 落 PAD 膨胀边界恒命中+tail 必回穿标注——让行几何不闭合）→C4 改纯检测 （穿标注→null→车道升级；未命中→t）；调用面回炉 2 裁省（恒检全障碍严格蕴含——函数保留导出作直测面） | 审 B2+P7A 门一/回炉链终裁 |
| D-5 | **W1**：车道=起偏 10+道宽 9+末偏 10=58 → **4 道**；laneX(i)=contentW−58+10+i×9，i∈[0,3]（edgeId 字典序） | 算术自洽 |
| D-6 | **W2**：PAD 命中语义=**d≤PAD**（含边界） | 判定一致 |
| D-7 | **W3**：routeEdge/routeAll 增可选 `onWarn?: (msg: string) => void`（缺省 noop——保持纯） | 签名自洽 |
| D-8 | **W4**：§1.1「同 commit」表述作废——实为「快照采集→routeAll→setState 一帧内完成（React 渲染管线内），svg opacity 过渡 120ms 掩盖一帧错位」 | 如实 |
| D-9 | **W5**：gapY=**源月框底边与下一月框顶边空隙中线** y（frames 相邻差/2）；源月框为年内末框（无下一框）时=框底+13 | 几何可推导 |
| D-10 | **W6**：PALETTE 轮转索引 i=**组内 subs.length**（新建时现数，按组单调）；删除线型后色复用=接受（备案） | 确定性 |
| D-11 | **W7**：恒四组=P5 schema 强制（LINE_TYPE_BASE_ORDER+upsertLineTypes 强校验）——假设闭 | 仓库实证 |
| D-12 | **W8**：「无需 P7 返工」作废——飞行中连线脱节=已知限制，P8 补 rAF/位置订阅重算（设计负债登记） | 如实 |
| D-13 | **W9/A-6**：月标注=.month-tag absolute top:−9px left:12px（月框左上，**不在走廊**）——C3 标注检测保留为防御面（现状恒不命中，注明零成本） | 仓库实测 |
| D-14 | **W10**：arcPath 补 s.y==t.y 直线分支（M s → L laneX,s.y → L t，无圆角） | 退化完备 |
| D-15 | **W11**：命中层 stroke=**8px**（<道宽 9，相邻道命中区不重叠），4 道容量保持 | 终裁 |
| D-16 | **W12**：lineage-routing.ts 行数上限=**300**（check-quality 同族；超线拆避让检测件） | 宪法红线 |
| D-17 | **A-5**：轮转调色板 hex=**用户数据**（存 graph.lineTypes.color 持久值）——lineage-palette.ts 常量注明数据面+check-quality 豁免清单登记；组件 chrome 色仍全 token | 禁令边界 |
| D-18 | **A-7/F-5 终裁（mockup 图例实证 L212-217）**：基础型渲染色与线纹=**tree=var(--accent) 实线 / inferred=var(--accent) 虚线 / ref=var(--faint) 点线 / manual=var(--signal) 虚线**——**零新 token**；P6 预留三 token（--survey-edge/--manual-edge/--edge-inferred）**预期落空**（mockup 图例另有所指）→随 P7 票删除（死代码即删；P6「P7 复用预设」备案撤回） | mockup 图例=视觉终案权威 |
| D-19 | **A-8**：inferred 渲染=同 tree 守卫语义的虚线（INV-27 备案兑现——「非树边剔除」指布局参与权，渲染面照画） | INV-27 |
| D-20 | **A-9**：=D-15 | — |
| D-21 | **A-10**：「新建连线」按钮=工具条 .lg-btn.linkbtn 形态（**编辑模式内才显示**——mockup L209-210 实证） | mockup |
| D-22 | **A-2/F-1 终裁**：连线层=**LineageTimeline 子组件**（EdgeOverlay），以 `shiftedIds`+`groups` 为 props——shiftedIds 稳定（P6 收敛/守卫停）即砖砌终态，子组件 effect 以此为重算触发（同渲染管线，零跨组件事件总线）；ResizeObserver 挂 .tl-content（窗口/面板）+edges/groups 引用变化（数据面）三触发并集，rAF 合并 | 仓库事实（P6 effect 内部量外露为 props） |

## §1 渲染架构（定稿）

- DOM：`.tl-content`（P6 既有，position:relative）内新增 `<svg class="tl-edges">`（absolute; inset:0; overflow:visible; z-index 低于卡）+每边两 path（`tl-edge` 可见+`tl-edge-hit` 透明 stroke:8px 命中层 pointer-events:stroke）。
- 坐标系=内容坐标（elRect−contentRect）；svg 与卡同文档流，滚动零跟随。
- 布局快照 `buildSnapshot(contentEl): LayoutSnapshot`（唯一不纯点，驻 hook 层）→ `routeAll(edges, snap)` 纯函数 → setState(paths)。
- 时序：P6 测量冻结（.tl-measure）期间 svg opacity:0（120ms 过渡）；shiftedIds 稳定→同帧快照+路由→opacity:1。
- 触发器：shiftedIds/groups 变化+ResizeObserver(.tl-content)+edges/lineTypes* 数据引用变化（*lineTypes 改样式不改坐标——N1 采纳剔除，仅 subId→样式映射层消费）。

## §2 路由三式（定稿几何）

锚点：top/bottom/right 三式（卡盒中点族，首跳稿 §2.1 不变）。

1. **垂直式**（tree/inferred 初路由）：贝塞尔 M s C(s.x,s.y+k)(t.x,t.y−k) t；k=clamp(dy/2,12,80)；dy≤0→直进 detour（D-3）。
2. **平级弧**（ref/manual 初路由）：源右缘→车道（圆角 r=10）→目标右缘；s.y==t.y 直线分支（D-14）；车道 D-5。
3. **绕行折线**：跨年边直进；直角折线（区别弧的圆角）；底部出变体（detourBottomPath）=源底→gapY 空隙中线（D-9）→走廊→目标。

## §3 避让四检+降级链（定稿）

障碍=全卡 rect∪月标注 rect（不含源/目标卡）；膨胀 PAD=4，命中 d≤PAD（D-6）。

- C1 垂直带（外包带粗筛+贝塞尔 t=0.05 采样精判）→挡则降平级弧。
- C2 弧入口横道（含同行右邻——天然覆盖侧出口被挡）→挡则 detourBottom。
- C3 走廊竖段扫掠（含标注=防御面 D-13）→挡则车道 i+1（≤3）。
- C4 回程横道穿目标月标注→车道升级（D-4 终态：让行机制裁撤——见决定表；回程横道恒检全障碍[卡∪标注]）。
- 降级链单向不回溯；dy≤0 前置直进（D-3）；全道耗尽→fallback（laneX=contentW−6 贴边+全检采样+onWarn 不静默）。
- **不变量：连线永不穿过文献卡与月份标注**（INV 级登记——实现票回写 invariants）。

## §4 线型系统 UI（定稿）

- 编辑模式：工具条「编辑脉络」toggle（mode:'view'|'edit' 驻 LineageTimeline——P8 单一数据源）；edit=命中层 pointer-events 开+可见 path 同步禁/启一致（N3 采纳）+「新建连线」按钮显现（D-21）。
- EdgeTypePopover：点连线命中层弹出（edit 态）；单开手风琴（恒四组 D-11）▸子线型 radio（色块+dash 预览）▸组内「＋新建」（内联表单：名称+预览[PALETTE/DASH_ROT 轮转 D-10]+确定取消）——sub 更新走 P5 字段纯消费；新建走 upsertLineTypes 整体替换；toast 复用 P6 W5 通道。
- 新建连线流：idle→picking-source（crosshair+提示条）→picking-target（源高亮）→校验（自环/重复提示不回 idle）→popover 选型→加边（既有通路）。
- 基础型渲染映射（D-18/D-19）：kind→{色,线纹}=tree{accent,实}/inferred{accent,虚}/ref{faint,点}/manual{signal,虚}；sub 覆盖={subs.color,subs.dash,subs.w}（P5 数据）。

## §5 纯函数接口+测试（定稿）

lineage-routing.ts（≤300 行 D-16，零 DOM import）导出：类型（Pt/Rect/EdgeKind/RouteTag/LayoutSnapshot/EdgeGeomInput/RoutedPath）+anchor/verticalPath/arcPath/detourPath/detourBottomPath+四检（checkVerticalBand/checkArcEntry/checkSweepBand/resolveLabelEntry→{entry,tail}）+laneIndex/routeEdge(e,snap,onWarn?)/routeAll。确定性：车道=edgeId 字典序、降级单向、无随机/Date/三角函数、采样步长常量。

单测 12 例（首跳稿 §5.3 表全量+用例 2 改断言 route='detour'+用例 7 改断言 tail 段端点）。变异面：采样摘除/PAD 翻转/降级链序翻转/车道字典序摘除。

## §6 票面拆分（定稿）

**P7a 路由+线型渲染**（§1-§3+§5+基础型渲染映射+四检降级夹具验收）→**P7b 编辑交互**（§4 全部）串行。P7a 验收=图谱即见三类路由+遮挡夹具四检各触发一次+12 单测+滚动/resize 不错位；P7b 验收=选择器改 sub/新建线型 IPC 持久化/新建连线全流/Esc 分支。行数：EdgeOverlay ≤250/Popover ≤250（子件拆）/useEdgeComposer hook 外置。

## §7 遗留与撤回备案

- P6 预留三 token 删除（D-18）+「P7 复用预设」备案撤回；--tree-edge 提议作废（accent 直用）。
- P8 负债登记：飞行中连线脱节重算（W8/D-12）；.tl-editing/mode 态 P8 共用面。
- check-quality 豁免登记：lineage-palette.ts hex 数据面（D-17）。
- e2e T5 视觉锚恢复承诺兑现（P7a 验收面）；INV-27 inferred 渲染形态定案（D-19）回写。
