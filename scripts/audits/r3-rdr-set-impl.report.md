# R3-RDR+SET 实现报告（阅读器周边+设置页视觉——纸面+玻璃浮层合票）

> 实现者子代理交付面。票面=scripts/audits/r3-rdr-set-brief.md v1+主控预裁三点。
> 技能清点（开工）：test-driven-development（用）/ verification-before-completion
> （用）/ frontend-ui-engineering（用）/ systematic-debugging（e2e 排障时实际
> 采用了假设-验证+最小复现法）/ 其余不用（纯视觉面）。

## 1. 实现摘要

- **ReaderToolbar**：根挂 `.rdr-toolbar` 玻璃浮层类（theme.css：
  `--panel-glass`+`backdrop-filter: blur(10px)`+金 hairline 底缘+shadow-1）；
  控件按钮走 `.syn-btn-ghost` 类（Button ghost 同源皮肤）；页码输入框/
  `/ N`/zoom-label 挂 `.rdr-num`（`--font-display` 衬线+tabular-nums）。
  文档流位置/aria/testid 零变（纯皮肤，F-05 滚动收敛面零扰动）。
- **TabBar**：active tab 挂 `.rdr-tab-active`（纸面 `--panel` 底+inset 金
  hairline 底缘 `inset 0 -2px 0 0 var(--border-gold)`——box-shadow inset
  零占位，h-8 布局不变）；旧 `accent-soft` 满铺退役。role/aria/tabIndex/
  `.truncate`/关闭叉结构零变（tab-bar.test 断言面全保持）。
- **OutlineAside**：三栏 tab active 底缘 accent→金（`var(--border-gold)`）；
  侧板保持亮面 panel 底（夜色只属脉络域）。
- **ReaderNotesPanel**：片段层/AI 层新增 h4 节标（`.rdr-aside-h4`：金左缘条
  3px+衬线）；input/textarea 挂 `.syn-input`（focus=accent 描边+gold-soft 底）。
- **SettingsPage**：根挂 `.syn-settings` 作用域类；内联两节（通用/网络）换
  SettingsSection 壳；节间×4 挂 DiamondRule（.lib-rule* 组件层复用）；表单
  控件挂 `.syn-input`。theme.css 作用域皮肤：`> section` 分节卡（panel+
  radius-l+shadow-1+border）+`h2` 金节标（衬线+金左缘条）——自持节
  （CorpusExportSection/ZcodeLinkSection/注入课题节，section 根）零文件
  改动同吃皮肤。
- **零触碰红线**（头注声明+实测 git diff 核对）：AnnotationLayer/
  AiAnnotationLayer/SelectionRects/PDF 区/ReaderPage 布局/F-07 层叠链/
  sr-only 文本/全部 aria/testid。
- **SelectionRects 核对**：色随 `color-mix(var(--accent) 30%)` 自动，零改 ✓。

## 2. 文件清单

改动（6）：`src/renderer/features/reader/ReaderToolbar.tsx`(173 行)/
`TabBar.tsx`(163)/`OutlineAside.tsx`(156)/`ReaderNotesPanel.tsx`(207)/
`src/renderer/features/settings/SettingsPage.tsx`(196)/
`src/renderer/shared/theme.css`(426≤500)。
新增（2）：`src/renderer/features/settings/SettingsSection.tsx`(25 行——
180 行消化上限拆壳，预裁授权)/`tests/unit/renderer/r3-rdr-set-visual.test.tsx`
(154 行，always-active 裸 describe×3+theme.css 材质文本锁，library-cards
同口径)。`git diff --stat`：7 文件（含 manifest）114+/29-，无范围蔓延。

## 3. TDD 证据

- **首红**：`scripts/audits/r3-rdr-set-first-red.log`——3 it 全红（玻璃类/
  tab 金缘类/设置分节类均缺失），退出码 1。
- **绿**：实现后 3/3 passed（既有受影响面 tab-bar/reader-notes-panel/
  outline-aside/reader-page-open-race/corpus-export/zcode-link-section/
  theme/app-shell 8 文件 106 用例零回归）。
- **变异红证**（`scripts/audits/r3-rdr-set-mutation.log`，cp 备份法——
  全程无 git checkout）：
  ①删 ReaderToolbar `rdr-toolbar` 类→浮层 it 红（1 failed）→cp 还原
  →`diff` 空（RESTORE-1-OK）；
  ②删 theme.css `.syn-settings h2` 金左缘条→设置 it 红（1 failed）→cp
  还原→`diff` 空（RESTORE-2-OK）→终态复绿 3/3。

## 4. reader-text.spec 兼容性核对（107 断言密度面）

关键断言逐一核对：annotation-layer `mix-blend-mode:multiply`+rgb(253,224,71)
+opacity 1（层零触碰✓）；selection-rects blend/pe:none/z:2（零触碰✓）；
INV-01 三层 overflow:hidden（theme.css 该段零改✓）；F-06 页盒 panel 白底/
滚动容器透明/body --bg（PDF 区零触碰✓）；tablist/tab/关闭叉语义（结构
零改✓）；sr-only「当前第 n 页」（ReaderPage 零触碰✓）；「高亮/下划线/
备注」selection-toolbar 作用域（不在票面✓）。**五次全量 e2e 中
reader-text.spec 从未红**（核心验收达成）。无断言值变化→无受锁 e2e 改动。

## 5. locks 实录

新测试文件入锁：`locks:generate`（154 条）→`locks:apply`（只读落锁）→
`locks:check` 退出码 0（153→154，+1=新测试文件）。manifest CRLF 警告为
git 转换提示，check-locks 以 LF 口径通过。

## 6. verify + e2e 真退出码

- `npm run verify`：**退出码 0**（`scripts/audits/r3-rdr-set-verify.log`）；
  单测 104 文件 859 用例（基线 103/856+3 新增），build 含全部产物。
- e2e 全量：`npx playwright test` **25 passed，退出码 0**
  （`scripts/audits/r3-rdr-set-e2e-sample2.log`，1.2m——与基线时长一致）。

## 7. 自裁申报

1. ReaderToolbar 控件用 `.syn-btn-ghost` 类直消费而非 Button 组件——Button
   无 `title` prop，「适应宽度」禁用态 title 提示属交互面零变项；视觉与
   Button ghost 同一 theme.css 类，零漂移。
2. DiamondRule 复用未提共享名 `.syn-rule*`——经组件层复用（设置页只
   import DiamondRule），`lib-` 类名不暴露给设置域，语义问题不成立；避免
   动受锁 library-cards.test。
3. 设置自持节经 `.syn-settings > section` 作用域 CSS 吃同皮肤——票面外
   文件（CorpusExportSection 等）零触碰的同视觉收敛法。
4. 「玻璃浮层」落地为文档流内玻璃皮肤（非绝对定位 overlay）——P4「本轮
   仅皮肤」+F-05 收敛面零扰动的保守解。
5. ReaderNotesPanel 分节容器加 flex-col wrap 承载 h4（结构最小新增，
   testid/aria 断言面无碰撞——单测 106 用例+e2e 全量绿证实）。
6. SettingsPage 拆 SettingsSection 后 196 行（仍>180：头注+4 处
   DiamondRule 行；组件逻辑本体已最小化）——预裁「超则拆」已执行。

## 8. 疑虑（供门审）

- **e2e 间歇红三次**（非稳定复现）：全量跑曾现 corpus-export timeout×2
  （60s）+reader-scroll「element detached」×1，均发生在同会话连续重跑
  verify+多次 e2e 期间（Temp 已堆积 1498 个 synapse-* 目录）。排查：
  A/B 实验（基线 SettingsPage+rebuild 全量）25 绿一次；最小组合
  （ai-notes-section+corpus-export 串行）复现不出；单独跑该 spec 两次绿
  （2.1s）；最终干净状态全量 25 绿（1.2m）。证据指向环境波动（连续跑
  资源压力），不能完全排除 backdrop-filter 合成竞争的边缘贡献——
  reader-text.spec 五次全量从未挂。全部日志留档：-e2e/-retry/-serial/
  -ab-baseline/-sample2 五份。
- verify 内 tickets:check/quality:check 全过（exit 0 链内）；无 TODO/
  FIXME/placeholder（grep 退出码 1=clean）；中文 UTF-8 本报告可读。
