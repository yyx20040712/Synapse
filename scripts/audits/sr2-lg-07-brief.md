# SR2-LG-07 脉络布局非单调年份树修复+边 label 渲染（缺陷 E1）——票面 v1

> 来源：2026-08-28 用户真机验收反馈缺陷 E1（图五：脉络图渲染成单列垂直线，
> 分支不可见，边无标注），取证定性见
> `docs/prompts/2026-08-28_loop-handoff.md` §2E1。**确定级**（代码推演闭合，
> 主控已复核 lineage-layout.ts:196-207 推演：M1 草稿树 Brown(2002 根)→
> Reynolds(1883 子)→Cross(1936)+水锤史(2007) 孙，四层互不共享——兄弟约束
> 仅共享层触发→offset 恒 0→全树 x 相同退化单列）。验收修复役 U4。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 布局修=兄弟根占位参与 offset 下限**：`lineage-layout.ts` place()
  的 Frame 增根节点占位 `rootLo/rootHi`（相对子树包围盒原点；叶子=
  [0,NODE_W]，内部节点=归一化后的 [x−NODE_W/2, x+NODE_W/2]）；兄弟合并
  （:196-215）增补约束：`need = max(need, mergedRootHi + SIBLING_GAP − f.rootLo)`
  （mergedRootHi=已合并兄弟 rootHi 的 max 右缘）。**共享层约束原样保留**
  （深层不共享层仍可交错——紧凑性不丢）。**主控已手推 M1 树修后形态**：
  Reynolds x 居中、Cross 左/水锤史右错开 220px+，Brown 单子链同 x——
  分叉树可见；实现者以同参数夹具复算核对（推演值入测试注释）。
- **P2 边 label 渲染**：`LineageCanvas.tsx` 边渲染段（:183-201）每条边
  贝塞尔中点近似 ((from.x+to.x)/2, mid) 加 `<text>`（fontSize 11~12、
  fill var(--text-dim)、`paint-order: stroke` 白描边或等价可读性处理——
  样式实现者自裁申报）；label 空串不渲染；`data-edge-label={e.id}` 测试钩。
  **LineageEdge.label 字段已存在**（shared/models/lineage.ts z.string()）
  ——渲染面零契约扩展，shared 零触碰。LineageBoard.tsx:60 头注「边 label
  富化=预留」随本单摘除预留声明。
- **P3 初始视口 auto-fit=观察项不做**（:50 硬编码 {0,0,1} 实测图五标签
  可见；M1 树修后宽约 400px 常规视口内——用户验收若报出画再立小票）。
  票面注记即可。
- **P4 测试受锁两文件**（[locked-change]，unlock→改→apply）：
  - `tests/unit/renderer/lineage-layout.test.ts` 新增 it：
    ①**年份-拓扑错位夹具**（M1 同构：根 2002→子 1883→孙 1936+2007）断言
    两孙 x 错开 ≥ NODE_W+SIBLING_GAP 且根链 x 保持（图五回归锁——it 名
    含「非单调年份树」）；
    ②紧凑性保持：深层不共享层兄弟子树仍可交错（构造叔孙异层无共享夹具
    断言 offset=0 路径未死——防 P1 修法过度推开）；
    ③既有 12 it 全绿不改（回归面）。
  - `tests/unit/renderer/lineage-canvas.test.tsx` 新增 it：带 label 边渲染
    `<text>` 真实文本断言（渲染出真实文本红线）；空 label 边无 text 节点。
- **P5 不变量登记**：layoutLineage 性质增补「直接兄弟节点对不论年份层必
  横向错开（根占位参与下限）」——写入 lineage-layout.ts 头注行为层（模块
  级测试锚已有；不新增 docs/invariants.md 行（渲染布局纯函数性质归组件域
  锚，非跨模块行为——若门一判跨模块再补册）。

## 2. 五层规约

**─ 行为层 ──**：非单调年份树（子年早于父年）不再退化为单列——直接兄弟
子树根节点占位横向错开 ≥ NODE_W+SIBLING_GAP；共享层轮廓约束语义原样；
边 label 沿边中点渲染可读。

**─ 接口层 ──**：layoutLineage 签名/LayoutResult 形状零改（Frame 内部
结构扩展不外泄）；LineageCanvas props 零改（edges 数据已含 label）；
NODE_W/NODE_H/LAYER_GAP/SIBLING_GAP/TREE_GAP 常量零改。

**─ 架构层 ──**：零依赖；纯函数禁 DOM 不变；shared/models 零触碰。

**─ 生命周期层 ──**：不做：碰撞避让/显隐折叠/DAG/auto-fit（P3 观察项）。

**─ 文化层 ──**：TDD——受锁新 it 先红（当前布局单列：①红）→实现→绿→
变异红证 ≥2（①删 rootLo 约束恢复旧比较→①红；②边 label text 删→canvas
it 红；cp 备份法还原）→全量 verify。报告落
`scripts/audits/sr2-lg-07-impl.report.md`，回复五行内。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks unlock→两测试文件
改→apply；基线 verify 全绿（用例数 +3~4 自报）。
