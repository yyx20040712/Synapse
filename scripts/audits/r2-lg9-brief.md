# R2-LG9 脉络「命之座星象板」视觉重制（画布夜幕+节点卡面+层带+边辉）——票面 v1

> 来源：用户需求 R2「发展脉络布局太丑，让多模态辅助好好设计」；设计定稿=
> `docs/design/2026-08-28_visual-system.md` §3 + 摸鱼图
> `docs/design/mockups/lineage-constellation.html`（v2，7.5/10 交付线——
> **视觉规范单一来源，先读**）；前置=R3-TH1（夜幕 token 已铺）。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 画布底（LineageCanvas 宿主层）**：夜幕渐变+星云 radial（CSS
  background 多层，mockup body 同款逐值）；星空两层平铺星点+✦ 四芒星
  装饰 2-4 枚（绝对定位+pointer-events:none——不参与布局与命中测试，
  实现注意事项 ⑥）；工具条玻璃浮层化（blur+金 hairline）。**pan 背景
  rect[data-testid=panbg] 保留**（pan 事件面零触碰）。
- **P2 节点卡面（SVG 组内）**：
  - rect→defs linearGradient（node-face-hi→node-face→深 #1e2745，165°
    向量）+rx 14；描边 rgba(207,174,114,.42)；L 金角饰=两个 path
    （mockup 注意事项 ⑤——rect 无多背景，角饰用 path 描边）。
  - 题名 text #f5f3ea（提纯白与金年份拉开层级——v2 评审要点）；年份=
    --font-display 15px 金 #e3c98f+letter-spacing；「已绑定文献」badge
    细描边胶囊。主题节点=虚线银描边+半透明面。
  - 选中态=金描边+外光（feGaussianBlur glow filter defs 复用边辉滤器）。
  - **data-node-id/data-kind 属性与节点文本结构保留**（e2e hasText/
    data-kind 断言面）。
- **P3 年份层带**：现有层带线改可见金微光线（--gold-line 12% α）+左端
  菱形刻度 rect(transform rotate45)+衬线年份标（「YYYY 年」文案**逐字
  保留**——e2e getByText 断言）；y 与节点对齐由 layout 既有 y 精确保证。
- **P4 边辉**：贝塞尔 path 金 #cfae72 描边+glow filter；推断边（label
  含「推断」）虚线银 #9aa3c0；边 label 玻璃胶囊（现有 LineageEdges
  label 渲染骨架保留——halo 机制可被胶囊替代，data-edge-label 钩保留）；
  底部图例胶囊（实链/推断两型——静态说明非交互件）。
- **P5 受锁面**：lineage.spec 断言 `g[data-viewport]` transform 串格式/
  path[data-edge-id] 计数/节点 hasText/「YYYY 年」文案——**结构零变更
  预期零必然红**；若层带标签结构改动触发红→逐处申报。unit：lineage-
  canvas.test 既有断言核对+新增夜幕/角饰存在性 it（查 defs gradient
  id/角饰 path 存在）；lineage-layout.test 零触碰（布局不动）。
- **P6 不做**：布局算法改动（LG-07 已修+LG-10 auto-fit 单独票）；
  侧板夜化（R2 第二票）；边避障路由（遗留池——布局+视觉本票不扩面）。

## 2. 五层规约

**─ 行为层 ──**：脉络视图呈夜幕星象板：星空底+金辉节点卡（角饰+渐变+
衬线年份）+金微光年份带+发光边+图例；交互（pan/zoom/选中/菜单/编辑）
零变。

**─ 接口层 ──**：LineageCanvas.tsx（底/层带/工具条）+LineageEdges.tsx
（边辉/胶囊）两文件为主改面；节点渲染若使 Canvas 超 250 行→拆
LineageNodeCard.tsx（F-07 SelectionRects 拆件先例）；LineageBoard 零触碰
预期。

**─ 架构层 ──**：零依赖（SVG/CSS 原生）；token 消费=theme.css 夜幕系
（R3-TH1 已铺）；装饰层 pointer-events:none 纪律头注声明。

**─ 生命周期层 ──**：不做：拖拽惯性/动画；星野 parallax；节点缩略图。

**─ 文化层 ──**：TDD——新 it 首红→实现→绿→变异红证 ≥2（删渐变 defs→
渐变 it 红；删层带刻度→层带 it 红；cp 备份还原落盘）；e2e 全量亲跑留证。
报告落 `scripts/audits/r2-lg9-impl.report.md`，五行内回复。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks unlock（若触
lineage-canvas.test）→generate（新文件）→apply；verify 真退出码落盘；
基线=前一单收口后自报；e2e 24 passed 保持。
