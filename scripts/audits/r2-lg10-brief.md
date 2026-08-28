# R2-LG10 脉络布局收官（auto-fit 视口自适应+题名分档宽+侧板夜化）——票面 v1

> 来源：设计定稿 §3 R2-U2；前置=R2-LG9（画布夜幕已落）。auto-fit=LG-07
> 遗留池观察项转正（「硬编码 {0,0,1} 实测可见」——载入/导入后图可能出
> 视口）。纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 auto-fit**：LineageCanvas 载入与导入替换后（nodes 变化且用户未
  手动 pan/zoom 期间）计算全节点包围盒→viewport translate/scale 适配
  （边距 padding 80px 上下+左右 120px——层带标签在左需宽边距；scale
  钳制 [0.25,4] 既有界内，包围盒超界取 min）。用户已交互后**不抢视口**
  （userInteracted 标记——panbg pointerdown/滚轮 zoom 置位，仅显式
  「适应视图」按钮复位该标记）。手动覆盖位（x/y 非 null）照常参与包围盒。
  transform 串格式 `translate(x, y) scale(k)` **逐字符保持**（e2e 正则
  解析断言面）。
- **P2 题名分档宽**：lineage-layout NODE_W 单值→按 title 长度三档
  （短 ≤12 字 180/中 ≤28 字 220/长 260——档值实现者按 mockup 视觉微调
  申报）；**lineage-layout.test 既有 17+3 it 数值断言面**：NODE_W 常量
  消费处逐 it 核对——分档函数 export 纯函数化+夹具题名长度分布核对，
  必然红处逐文件申报（AI-11 受锁必然红扩容口径）；布局不变量（兄弟
  错开/紧凑性）it 语义保持。
- **P3 侧板夜化（LineageSidePanel+两子件）**：面板底=rgba(40,51,86,.72)
  +blur 12 玻璃卡（mockup .side 同款）；标题衬线+金 sub；分组 h4 金左
  缘条（QUESTION_COLOR 保留——AI-08 分色单源不违：左缘条仍分色，底色
  夜化）；条目卡 rgba(23,30,51,.45)+描边 rgba(151,160,187,.28)；文本
  --text-on-night 系。**testid/文案零改**（lineage-side-panel.test 断言
  面零触碰——纯 style 层，unit 预期零红；「已绑定文献」「主题节点无笔记」
  等文案保留）。
- **P4 不做**：边避障路由（遗留池）；节点折叠；小地图。

## 2. 五层规约

**─ 行为层 ──**：载入/导入后整图自适应可见（无需手动找图）；题名三档
宽减截断；侧板与画布同域夜色质感；「适应视图」按钮=显式复位。

**─ 接口层 ──**：lineage-layout.ts（分档纯函数+NODE_W 消费）+
LineageCanvas.tsx（auto-fit 状态机+侧板接线不动）+LineageSidePanel.tsx
两子件（style 层）。**auto-fit 状态机前置**（宪法）：idle→fitting→
fitted/（用户交互）→manual 三态+触发事件表入头注。

**─ 架构层 ──**：零依赖；布局纯函数与渲染状态分离（auto-fit 逻辑在
Canvas 组件内聚，禁入 layout 纯函数——依赖 DOM 视口尺寸）。

**─ 生命周期层 ──**：不做：记忆每课题视口（跨会话持久）；fit 动画
缓动（瞬时跳变 v1）。

**─ 文化层 ──**：TDD——auto-fit it 首红（render 后 transform 非初始
{0,0,1}——jsdom 量测 stub getBBox/clientWidth 先例）→绿→变异红证 ≥2
（删 fit 计算→it 红；删 userInteracted→抢视口 it 红）；分档 it（三档宽
夹具）；侧板夜化 style 断言 it（背景值含 40,51,86——防回退）。受锁
lineage-layout.test 必然红逐处申报。报告落
`scripts/audits/r2-lg10-impl.report.md`，五行内回复。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks unlock→apply；
verify 真退出码落盘；e2e lineage.spec transform 断言兼容性亲验留证。
