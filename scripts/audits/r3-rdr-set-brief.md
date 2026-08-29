# R3-RDR+R3-SET 阅读器周边与设置页视觉（纸面+玻璃浮层）——票面 v1

> 来源：设计定稿 §2 R3-U3/U4（两小面合票——同为低浓度重皮肤，共享
> 受锁面评估口径）；前置=R3-TH1。纪律：三屋模式；实现者禁 git/registry。

## 1. 主控预裁项

- **P1 阅读器周边（装饰浓度最低原则——PDF 区中性不变）**：
  - ReaderToolbar=玻璃浮层（panel-glass+blur 10+金 hairline 底缘）+控件
    走新 Button ghost；TabBar=纸面 tab+active 金 hairline 底缘+衬线页码
    数字；OutlineAside/ReaderNotesPanel=纸面卡+h4 金左缘条节标。
  - **SelectionRects 色随新 accent 自动**（color-mix var 消费零改）；
    AiAnnotationLayer/AnnotationLayer 零触碰（F-07 层叠链红线——任何
    z/multiply/alpha 变更禁）。
  - sr-only 文本与 aria 面零改；reader-aside/annotation-*/selection-
    toolbar 等 testid 零改。
- **P2 设置页**：分节卡（panel+radius-l+shadow-1+金节标衬线）+节间菱形
  分隔复用；表单控件 focus=accent 描边+gold-soft 底；按钮走新变体。
  SettingsPage 180 行内消化（超则拆 SettingsSection.tsx）。
- **P3 受锁面**：reader-text.spec 107 处断言密度最高——**视觉变更零
  结构破坏预期零必然红**；reader-toolbar/tabbar 相关 unit 断言核对；
  新 it：玻璃浮层类存在性（toolbar/toolbar 背景含 glass 值）+设置分节
  存在性。若 e2e 某断言触具体样式值→逐处申报（AI-11 口径）。
- **P4 不做**：阅读区暗色模式；PDF 反色；工具栏图标化重构（本轮仅皮肤）。

## 2. 五层规约

**─ 行为层 ──**：阅读器周边与设置页呈纸面+玻璃学术质感；一切交互/aria/
testid 零变。

**─ 接口层 ──**：ReaderToolbar/TabBar/OutlineAside/ReaderNotesPanel/
SettingsPage 样式段；props 零改。

**─ 架构层 ──**：token 单源；F-07 层叠链/F-05 滚动收敛面零触碰红线头注
声明。

**─ 生命周期层 ──**：不做：工具栏可配置；设置搜索。

**─ 文化层 ──**：TDD——新 it 首红→绿→变异红证 ≥2（删玻璃类→浮层 it
红；删金节标→设置 it 红）；e2e 全量亲跑留证（reader-text.spec 107 断
言全过=核心验收）。报告落 `scripts/audits/r3-rdr-set-impl.report.md`，
五行内回复。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks 按实触面；verify
真退出码落盘；e2e 24 保持。
