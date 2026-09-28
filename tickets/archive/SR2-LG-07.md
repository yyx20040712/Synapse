# SR2-LG-07 票面归档（F-GOV-01）

- id: SR2-LG-07
- file: src/renderer/features/lineage/lineage-timeline.ts
- area: lineage
- owner: strong
- status: done

## summary 原文

【T3-P6 收口：本票 file 原指 lineage-layout.ts——随 T3-P6 时间线方案切换退役删除，指针迁移至布局承接件 lineage-timeline.ts（年月分组纯函数；退役历史在案=本注记）】脉络布局非单调年份树修复+边 label 渲染（b3: P7-H；验收缺陷 E1 修复——兄弟约束仅共享年份层触发→年份-拓扑错位树（子比父早 119 年）offset 恒 0 全树退化单列；Frame 增根占位 rootLo/rootHi+兄弟约束增补 mergedRootHi+SIBLING_GAP−rootLo 下限（直接兄弟不论层必横向错开，深层不共享层仍可交错紧凑性保留）；M1 夹具四遍独立手推逐位吻合 {Brown=Reynolds=200,Cross=90,水锤史=310} 分叉可见；边 label 沿贝塞尔中点渲染（LineageEdges.tsx 拆件 61 行——Canvas 269 触 250 红线驱动；空串不渲染+data-edge-label 钩）+Board 摘预留声明；受锁 lineage-layout.test +3 it（M1 夹具/紧凑保持/跨夹具）+lineage-canvas.test 边 label it；auto-fit 观察项不做）[locked-change]——票面 scripts/audits/sr2-lg-07-brief.md；依赖 LG-02 布局件

> 归档于 F-GOV-01（2026-09-28）；registry 主表已瘦身为结论句+本件指针
