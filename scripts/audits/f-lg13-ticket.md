# F-LG13 需求票:脉络图节点统一尺寸+紧凑布局+题名滚动(用户图4/图5)

> 需求源:用户 2026-08-31 新反馈批图4/图5。原话:「我希望所有文献的方框
> 都一样大小且中间没有空地,如果信息显示不下可以给题目加滚动条」;
> 图5 绿框标注「全是空白」。基线:verify 120 文件 1018/locks 214。
> 后继票 F-LG14(节点元信息区:含金量/年份/标签——依赖本票新卡结构)、
> F-LG15(人工父边)。口径裁决已闭环(台账 2026-08-31 登记)。

## 0. 现状×根因(主控排查完成)

- **方框大小不一**=设计如此:nodeWidth(title) 题名分档三宽 180/220/260
  (lineage-layout.ts:109-139,INV-36)+nodeHeight(title) 行数分档高
  64/82/100(:141-156,INV-38)——用户令=**全节点统一宽高**;
- **中间空地**=间隙常量(兄弟 40/树间 80)+分档占位差放大空隙
  (不同档宽兄弟被轮廓约束推开);
- **题名截断**=line-clamp 三行+tooltip(LineageNodeCard.tsx:33-44)——
  用户令=题名区**滚动条**看全文。

## 1. 行为层

- **统一尺寸**:全节点(文献/主题/综述)同宽同高,定值单源常量
  (推荐 240×110——题名区约 3 行+底行 24px 预留;实现者可按卡内边距
  微调±20,报告自裁论证);**nodeWidth/nodeHeight 函数签名保留但返回
  恒定值**(三消费面 INV-36/38 结构不动=最小改面)或收为常量+三消费
  同改(二选一自裁,受锁测试改向面报告);
- **紧凑布局**:SIBLING_GAP 40→16、TREE_GAP 80→24(同档调 SURVEY_COL_GAP
  80→24);层带 LAYER_GAP 140=年份时间轴语义**不动**(用户未抱怨层间);
- **题名滚动**:题名区 foreignObject 内 div overflow-y:auto+细滚动条
  (hover 该节点且题名溢出时滚轮事件归题名滚动 stopPropagation,
  否则滚轮归画布缩放——主控裁决,门审把关交互抢占面;滚动条拖动恒归
  题名);题名完整渲染不截断(line-clamp 删除);全文 tooltip 保留;
- **不变量**:RT tidy tree 布局算法/年份层带/综述右列/覆盖优先/森林
  语义**零变**(只动几何常量与卡渲染);统一宽后兄弟错开/紧凑性等
  布局性质断言随新常量自然更新数值。

## 2. 接口层

layoutLineage 签名/输出零变;nodeWidth/nodeHeight 语义改「恒定」
(签名兼容);LineageNodeCard props 零变。

## 3. 架构层

- 改动面:lineage-layout.ts(常量)+LineageNodeCard.tsx(卡结构重制:
  外框 rect+题名滚动区+底行占位——**为 F-LG14 预留底行结构注释锚**)±
  lineage-viewport.ts(fitViewport 包围盒若引分档函数同步);
- 受锁改写面(主控已 unlock):tests/unit/renderer/lineage-layout.test.ts
  (分档宽断言→统一宽断言,「语义随令」)+lineage-canvas 系组件测试
  (卡几何断言)+tests/e2e/lineage.spec(结构红线保留+卡尺寸断言更新);
  INV-36/INV-38 登记册条目修订(docs/invariants.md)。
- 禁引依赖;SVG foreignObject 滚动=HTML 原生。

## 4. 生命周期层

缩放钳制/pan-zoom/选中拖拽零变;节点拖拽 pointer 事件与题名滚轮
stopPropagation 的交互面=本票新增,报告申报。

## 5. 文化层

- 单测:统一宽(短/中/长题名同卡宽)/紧凑间隙(兄弟并排距离断言新值)/
  题名区滚动 DOM 断言(overflow-y+完整文本在 DOM 非 clamp)先红后绿;
  M1~M4 变异(备份法,禁 git checkout);
- 真机复验(新建 scripts/audits/f-lg13-verify.mjs,crib f-v2-diag.mjs
  freshUserData+开脉络视图):①全节点 gBCR 宽高集合=单元素(方差 0);
  ②兄弟节点水平间隙≤新 SIBLING_GAP+卡宽(无大空地);③长题名节点
  滚动条在+滚动后文末可见;④pageerror 0。
  探针前 use electron;验收 npm run test(node 态)。
- 报告 f-lg13-impl.report.md:同 F-V1 契约。禁 git/registry/locks。

## 6. 主控裁决

- 底行预留:F-LG13 卡结构须留「底行信息区」占位(高度含在统一高内),
  F-LG14 接着填内容——避免 14 再改卡结构常量;
- 用户口径在档(台账):颜色仅为示意,层次结构为准。
