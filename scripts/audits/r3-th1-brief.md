# R3-TH1 视觉系统主题基建（token v2+App 壳+共享四件）——票面 v1

> 来源：用户需求 R3「当前 UI 需要美术优化，参考 aquaresearch 与原神」；
> 设计定稿=`docs/design/2026-08-28_visual-system.md`（**先读**——token 语义
> 与单元映射）+ 摸鱼图两件（`docs/design/mockups/shell-library.html`
> :root 变量=**token 终值单一来源**；lineage-constellation.html 为 R2 消费
> 预留）。裁决链：ADR-0018 同役。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 theme.css v2（token 层）**：
  - **保留旧名换值**（42 tsx 内联引用零churn）：--bg #f6f4ee/--panel #fff/
    --border #e4ded1/--text #23262d/--text-dim #6f7482/--accent #2c5f8a/
    --accent-soft #dcebf5/--danger #b3403a/--ok #3d7a50/--annotation-五色
    微调向暖（保持可辨度——阅读器标注层与色板消费，色相族不变仅饱和
    微调，**e2e 断言面=变量名字符串**（lineage.spec:491-496 style 含
    `--annotation-yellow` 断言）零风险）。
  - **新增**（mockup :root 逐值誊入）：--gold #b8935a/--gold-bright
    #e3c98f/--gold-soft rgba(207,174,114,.16)/--gold-line/--ink #1b2333/
    --ink-hi #232d44/--font-display（Georgia,'Times New Roman','Songti
    SC',SimSun,serif）/--shadow-1/2/3/--radius-s 8px|m 12px|l 16px/
    --panel-glass rgba(255,255,255,.72)/--night-bg/--night-bg2/--node-face/
    --node-face-hi/--text-on-night 系（R2 消费预留，本单只定义）。
  - body 字体栈保持+background 换 --bg；**html/body overflow 锁与
    「文档永不滚」注释原样保留**（Q1 不变量）。
  - 纸面微纹理：body repeating-linear-gradient 丝纹（mockup 同款，极淡）。
- **P2 App 壳（App.tsx nav 段）**：
  - 侧栏=墨青渐变底+右缘金渐隐线（nav::after 语法 mockup 同款）；品牌
    行=菱形 SVG 标+衬线「Synapse」；**nav 四项文案/结构不动**（'文献库'
    等按钮名=e2e 断言面）——active 态=金左缘条+ink-hi 底+inset 金 hairline；
    每项前加**内联 SVG 图标**（书/开卷/星图/齿轮——mockup path 逐字取，
    禁新增依赖红线）；footer=版本徽记+「本地学术文献管理」。
  - **课题切换器位预留**：nav 品牌行下 `.ws` 占位区块（mockup 结构）——
    R1-WS2 接线（本单静态占位「课题」+「默认课题」文案，不接 IPC）。
    （若 R1-WS2 已先行收口则直接消费其组件——执行时核对 git log。）
- **P3 共享四件（src/renderer/shared/ui/）**：Button（实底变体=墨青+
  inset 金 hairline+6px 切角 clip-path+hover hairline 提亮；ghost 变体=
  金铜 hover）/Dialog（头檐金 hairline+玻璃 blur 头区）/SplitPane（分隔
  线金化 1px）/Toast（玻璃底+blur+shadow-2）。**类名/props/testid 零改**。
- **P4 受锁面评估**：e2e 断言的按钮名/文案/testid 全保留——**预期零
  必然红**；若某断言确触样式值（如具体色串）→逐处申报+门一核准
  （AI-11 口径）。unit 面新测试：theme tokens 冒烟 it（关键 token 值
  誊自 mockup——防漂移锁，新文件 tests/unit/renderer/theme.test.ts
  locks:generate）+App 壳渲染 it（nav 四项+active 类+SVG 存在——
  app 级测试先例 app-quit-dirty.test.tsx mock 配方）。
- **P5 不做**：暗色全题；动效库；新字体文件；视图级重皮肤（R3-U2/U3/U4
  分单元）；reader PDF 区任何视觉变更。

## 2. 五层规约

**─ 行为层 ──**：全局观感切至「暖纸白+墨青+金铜衬线」学术优雅系；
交互语义零变（按钮/对话框/分栏行为不动）。

**─ 接口层 ──**：theme.css 重写+App.tsx nav 段+四件样式段；零 props
签名变更；零新依赖。

**─ 架构层 ──**：token 单源=theme.css（值源=mockup :root——誊录纪律：
先 Read 摸鱼图逐值复制，报告附对照表）；组件散落硬编码色值**不动**
（视图单元逐域清理，本单只铺新面）。

**─ 生命周期层 ──**：不做：CSS-in-JS/样式引擎；主题切换 UI。

**─ 文化层 ──**：TDD——token 冒烟 it 首红（新值 vs 旧实现）→实现→绿→
变异红证 ≥2（改 --gold 值→token it 红；删 nav active 类→壳 it 红；
cp 备份还原 diff 空落盘）。e2e 全量亲跑留证（视觉零断言破坏验证）。
报告落 `scripts/audits/r3-th1-impl.report.md`，五行内回复。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀；locks generate（新
测试）→apply；verify 真退出码落盘；基线=96 文件 746 用例；e2e 24
passed 保持。
