# R3-LIB 文献库视觉重制（卡片网格+筛选+详情栏）——票面 v1

> 来源：设计定稿 §2 R3-U2；视觉规范=mockup `shell-library.html` v2
> （8/10——**先读**，卡片/CTA/菱形分隔/详情栏全部样式源）；前置=R3-TH1。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 文献卡（PaperRow→卡片化）**：DOM 结构可重排（行→卡）但
  **双击打开交互与既有 data-testid（若有）保留**；卡=暖白渐变+inset 顶
  高光+hover 金 hairline+L 角饰+translateY(-1px)+shadow 升档；衬线年份
  大字+题名（两行截断 min-height）+venue 斜体（空隐藏）+标签胶囊
  （999→6px 圆角）+meta 行 tabular-nums；列表容器改 CSS grid
  `repeat(auto-fill,minmax(340px,1fr))`（e2e 文献行 getByText 断言兼容
  ——文本保留即绿）。**ImportDropZone 视觉**：虚线金框+拖入态金辉
  （文案零改）。
- **P2 FilterBar+分隔语法**：chips 化（active=accent-soft 底+accent 描边）
  ；筛选区与列表间菱形分隔线（渐隐线+◆+渐隐线；窄窗 min-width 24px+
  flex:1——注意事项 ③）；排序/筛选文案与选项**零改**（e2e 断言面）。
- **P3 详情栏（PaperDetailPanel 244 行）**：纸面卡+衬线标题/年份值+分节
  hairline；被引数行衬线数字（ENR-03 交付保留）；按钮走新 Button 变体
  （「在阅读器中打开」「编辑元数据」文案零改）。MetaEditDialog 走共享
  Dialog 新皮肤（零结构改）。
- **P4 受锁面**：library 域 e2e 断言=文案/testid 面——预期零必然红；
  paper-detail-cited.test 等既有 unit 断言核对（纯 style 变更零红）；
  新 it：卡片渐变/hover 类/菱形分隔存在性+空 venue 隐藏（渲染级断言）。
- **P5 不做**：卡片多选/批量操作；列表密度切换；封面图。

## 2. 五层规约

**─ 行为层 ──**：文献库呈暖纸白卡片网格学术质感；筛选/打开/导入/详情
交互零变。

**─ 接口层 ──**：PaperRow/PaperList/FilterBar/ImportDropZone/
PaperDetailPanel/MetaEditDialog 样式段；props 签名零改。

**─ 架构层 ──**：token 单源消费；组件超 250 行则拆（PaperRow 卡化若
超限拆 PaperCard.tsx）。

**─ 生命周期层 ──**：不做：卡片右键菜单；拖拽排序。

**─ 文化层 ──**：TDD——新 it 首红→绿→变异红证 ≥2（删渐变类→材质 it
红；删菱形分隔→存在性 it 红）；e2e 全量亲跑留证。报告落
`scripts/audits/r3-lib-impl.report.md`，五行内回复。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks 流程按实触面；
verify 真退出码落盘；e2e 24 保持。
