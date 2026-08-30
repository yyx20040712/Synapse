# F-L1-C 票面:脉络边标签换行落地(变体 C)+防重叠放置+悬停滚动——五层规约

> 来源:AUDIT0 台账 F-L1 [B](用户原话「脉络图说明性文字的换行美观排布
> /AI 笔记导入文本/阐述线条逻辑关系的文字」)+**用户裁决 2026-08-30:
> 选变体 C(窄幅注释)**+两条硬性保证原话「**保证布局时脉络标签不重叠
> 遮挡**以及**鼠标悬停可以滚动查看未完全显示的文字**」。
> 案册:docs/design/2026-08-30_edge-label-wrap-options.md(截图实测
> A 150×33/B 210×54/C 130×37 三配置精确生效——f-l1-out/)。
> 机制裁决(案册 §0):换行=foreignObject+HTML div(U2a 先例)直接执行;
> 本票=C 变体参数+防重叠放置器+悬停滚动三合一。中票三屋(ADR-0017)。
> LOOP 会话票——不在 tickets/registry,禁触碰 registry。

## 行为层

### 1. 标签渲染(C 变体参数,案册定稿)

- `foreignObject` 恒 **130×37.05**(=maxW 130/3 行×9.5×1.3——渲染盒
  恒上限尺寸,短标签透明空区无视觉影响;pointerEvents none);
- 内层 div:class `lineage-edge-label` + 保留 `data-edge-label={e.id}`
  钩子与 `title` 全文 tooltip(U2a 同款);文本自然换行(`overflow-wrap:
  break-word`),**max-height 3 行+overflow hidden**(非 -webkit-line-clamp
  ——滚动语义需要真实溢出内容:scrollHeight=全文高度);
- **悬停滚动**(用户保证②):`.lineage-edge-label:hover { overflow-y:
  auto }`(CSS 类承载交互态——B1 教训禁内联);div `pointer-events:
  auto`;`onWheel`:当 `scrollHeight > clientHeight + 1` 时
  `e.stopPropagation()`(阻断画布 zoom,标签内滚动查看截断文字);内容
  未截断时不阻断(zoom 正常)。pointerdown 不拦截(冒泡——标签上起手
  仍可拖画布;pan 起手面小损在档声明:130×37 小面积)。
- 空串 label 不渲染(既有语义);**锚点=贝塞尔中点或放置器槽位**(见 2)。

### 2. 防重叠放置器(用户保证①——纯函数单源)

新模块 `src/renderer/features/lineage/edge-label-layout.ts`:

```
export const EDGE_LABEL_MAX_W = 130
export const EDGE_LABEL_H = 37.05
export function estimateLabelWidth(label: string): number
  // CJK 字符 9.5px/字、其余 4.75px/字,+左右 padding 4;钳 ≤130
  // (只用于碰撞盒——渲染 FO 恒 130 宽,窄标签碰撞盒窄=放置更自然)
export function placeEdgeLabels(
  items: Array<{ id: string; label: string; anchor: { x: number; y: number } }>,
  nodeBoxes: Array<{ x: number; y: number; hw: number; hh: number }>
): Map<string, { x: number; y: number }>
```

算法(确定性,头注写明):
- 逐边(输入序)贪心放置:候选位从 anchor 起,与**已放标签碰撞盒**
  (w=estimateLabelWidth+gap 4,h=37.05+gap 4)或**任一节点盒**(外扩
  6px——geom 半宽半高,nodeWidth/nodeHeight 单源)相交→按确定性偏移序
  搜第一个自由位:`dy ∈ 0,+lh,−lh,+2lh,−2lh,…±5lh`(lh=12.35,
  先竖移——沿边线竖移视觉最自然),同档 `dx ∈ 0,−(w/2+16),+(w/2+16)`;
- 全序列无自由位→回 anchor(best effort,头注声明「极端密集图仍有
  重叠可能」+测试断言该回退分支);
- 输出槽位中心;Map 供渲染与 fit 包围盒两消费。

### 3. 接线(LineageCanvas/LineageEdges/viewport)

- Canvas `useMemo` 算 `slots = placeEdgeLabels(edges→锚=贝塞尔中点,
  nodeBoxes=geom+nodeWidth/2)` 传 LineageEdges 新 prop `slots`(
  缺省回退锚点——组件向后兼容);
- **fitViewport 扩参**(用户保证①的另一半——被推出的标签不可消失在
  fit 视野外):签名加第 5 参 `labelBoxes?: Array<{ x: number; y: number;
  hw: number; hh: number }>`(缺省 []——既有调用/单测零破),参与
  包围盒 min/max;Canvas 调用处传 slots 盒(hw=estimateW/2,hh=18.5);
- INV-41 登记(主控收口时):边标签防重叠+悬停滚动+参与 auto-fit。

### 4. 既有行为不变面(禁破)

- 受锁 lineage-canvas.test.tsx:187-191 边 label 断言(`data-edge-label`
  textContent+空 label null+edge-id 计数)——形态无关,保钩子零必然红;
- 边三型(ref/综述/推断/普通 stroke+dash)零改;节点卡/层带/图例零改;
- pan/zoom/拖拽/右键/空态链零改(wheel 仅在标签截断悬停时阻断);
- INV-36/38 nodeWidth/nodeHeight 单源消费不动(放置器只读)。

## 接口层

- 新 `edge-label-layout.ts`(纯函数,零 DOM/React);
- `LineageEdges.tsx`:props 加 `slots?: Map<string, { x: number; y: number }>`;
  label 块换 foreignObject(83→~135 行,≤250 ✓);
- `LineageCanvas.tsx`:slots useMemo+传参+fitViewport 传 labelBoxes
  (198→~215 行 ✓);
- `lineage-viewport.ts`:fitViewport 第 5 参(165+10 行 ✓);
- `theme.css`:`.lineage-edge-label` 皮肤类+`:hover` 滚动(591+~14 行)。

## 架构层

- 皮肤住 theme.css 类(B1 教训——hover 交互态禁内联);
- 纯函数单源:估算/放置只在 edge-label-layout;禁渲染处重算碰撞;
- 零新依赖;零 shared/ipc;分层单向不动。

## 生命周期层

- 放置器 O(E×(E+N)) 最坏(E=边数≤百级)——布局后一次 useMemo,帧内无感;
- est 宽度偏差(latin 0.5em 近似)由 gap 4px+渲染 FO 恒 130 吸收——
  碰撞盒略窄于实际时重叠 ≤ 数 px 的残差,头注声明容差;
- jsdom:foreignObject/悬停伪类不可交互——组件测试断言 class/结构/wheel
  阻断逻辑;真实滚动由主控真机取证收口(⑤b)。

## 文化层(测试=TDD 红→绿→变异红证;新测试 always-active)

- 新 `tests/unit/renderer/edge-label-layout.test.ts`:
  ①估算:CJK/latin 混排/钳 130/空串(0);
  ②同锚两标签→竖向错开(断言两碰撞盒不相交+都在 ±5lh 内);
  ③标签 vs 节点盒相交→偏移后不相交;
  ④确定性:同输入乱序 items(按 id 排序后)输出一致——**注意贪心依赖
    输入序,断言=同输入序多次调用一致+文档序稳定性声明,不测乱序等价**;
  ⑤全占位无自由位→回 anchor(极端夹具);
  ⑥短标签碰撞盒<130(estimate 生效)。
- 扩 `tests/unit/renderer/lineage-canvas.test.tsx`(受锁,[locked-change],
  必然红恰 1 处预裁:无——保钩子设计下旧断言零红;新增不修改旧断言):
  ⑦标签渲染形态:long-label 边 → `[data-edge-label]` 为 div 且 class 含
    lineage-edge-label+FO 恒 130 宽;
  ⑧slots 传递:同锚两条 long-label 边→两标签 y 不等(放置器生效);
  ⑨wheel 阻断:截断标签上 fireEvent.wheel→svg zoom 不触发(断言
    transform 不变)+未截断标签上 wheel→zoom 正常(反向锚);
  ⑩CSS 文本锁:theme.css 含 `.lineage-edge-label` 声明形态与
    `:hover` 段 `overflow-y: auto`(正则锚定声明形态——SET1 变异③
    教训,防注释字样救活)。
- 变异红证(文件备份法,各落 .raw.txt):M1 摘放置器(Canvas 直用锚点)
  →⑧红;M2 wheel 去掉 stopPropagation→⑨红;M3 :hover 段摘除→⑩红;
  M4 估算钳制摘除→①/⑥红;M5 fitViewport labelBoxes 忽略→新断言
  (包围盒含被推出标签——fit 数值用例)红。
- 受锁面:lineage-canvas.test.tsx(仅增不改)+两新文件(主控收口
  locks:generate+apply)。

## 基线数字(自检参照)

verify=110 文件 924 用例全绿/locks 180/e2e 29。**node 前缀
`export PATH="/d/nodejs24:$PATH"`**(v25 假红在档)。

## 主控已预裁项(门一可攻击,推翻需更强依据)

1. FO 恒 130×37.05(渲染盒恒上限,短标签透明空区)——免 est 偏差裁字;
2. max-height+overflow 替代 line-clamp(滚动语义需要真实溢出);
3. 碰撞盒 w=est+gap4/h=37.05+gap4,节点盒外扩 6px;偏移序先竖(dx 三档)
   后横;全占位回 anchor 声明式 best effort;
4. wheel 阻断仅当截断(scrollHeight>clientHeight+1)——未截断不吞 zoom;
5. fitViewport 加参而非改签名语义(缺省 [] 向后兼容);
6. e2e 不加新用例(夹具造长 label 边成本高;真机取证+组件级⑨⑩锁),
   若实现者发现 lineage.spec 夹具机制顺路可加,申报后核准。
