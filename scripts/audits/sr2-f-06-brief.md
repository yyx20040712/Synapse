# SR2-F-06 页间分隔与选区不透明（缺陷 B+C 视觉小票）——票面 v1

> 来源：2026-08-28 用户真机验收反馈缺陷 B（图二：PDF 页间无分隔间隙）与
> C（图三：划选区域部分加重），取证定性见
> `docs/prompts/2026-08-28_loop-handoff.md` §2B/§2C。验收修复役 U2。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。
> **依赖 SR2-F-05 收口后开工**（同域 PageColumn.tsx 排他）。

## 0. 根因（已取证定案，视觉面无需自证复现——e2e 断言即复现）

- **B**：`gap-3`（12px）在 DOM 真实存在（PageColumn.tsx 页列 + geometry
  PAGE_GAP_PX=12 单源对齐）；但页盒与 canvas 无任何背景/边框/阴影，分隔全靠
  `--bg:#f7f8fa`（阅读区）vs `#ffffff`（页）的色彩差——视觉不可感知。
- **C**：SelectionLayer 不绘制选区高亮；划选视觉=原生 `::selection`
  （text-layer.css:52-60，`color-mix(in srgb, AccentColor, transparent 75%)`
  =25% 半透明）在 pdfjs 文本层**重叠 span** 上逐元素叠绘——重叠区两层 25%
  叠加即「加重」。

## 1. 主控预裁项

- **P1 B 修法=页盒 panel 底+阴影**（PageColumn.tsx 页盒 div，即
  `data-page-box` 盒）：`background: var(--panel)` + `boxShadow`（柔和阴影，
  如 `0 1px 4px rgba(0,0,0,.12)`——具体值实现者自裁并申报，验收=页缘视觉
  可辨）。未渲染占位盒与渲染后页盒**同底**（消色差跳动）。**gap 不改**
  （保持 gap-3/PAGE_GAP_PX=12——最小视觉改动，勿触 INV-33 比值分母；
  P7-D 大役再做设计面）。
- **P2 C 修法=方案一（最小）**：`text-layer.css` 两处 `::selection`/`::-moz-selection`
  的 background 改不透明近似色 `color-mix(in srgb, AccentColor 25%, white)`
  （不透明色叠加不变深）；`br` 的 transparent 保持。**头注登记偏离**：
  文件头注现声明「逐字保留官方」——须追加一行「[SR2-F-06] ::selection
  偏离官方：半透明→不透明近似色（官方重叠 span 叠绘加重缺陷，验收 §2C）」。
  方案二（SelectionLayer 自绘 multiply 选区矩形）**不做**——用户不满意再立票。
- **P3 测试落点=reader-text.spec.ts 新增一个 test**（视觉断言域）：
  - 断言一（B）：打开多页文献后
    `getComputedStyle(页盒).backgroundColor` 为不透明白（`rgb(255,255,255)`）
    且 `boxShadow !== 'none'`；滚动区背景 `--bg`（`rgb(247,248,250)`）与之
    可辨（两值不等断言）。
  - 断言二（C）：`getComputedStyle(文本span, '::selection').backgroundColor`
    解析后**无透明分量**（Chromium 将 color-mix 解析为 rgb()/color(srgb…)
    ——断言非 `rgba(` 且非 `transparent`；若 `color(srgb … / a)` 形态则断言
    alpha=1。实现者按真机解析形态落断言并申报）。
  - 自守卫：`skipIfPending([...既有渲染依赖, 'SR2-F-06'])`（文件内先例
    逐测声明模式）。守卫态 22+1→23+1 skip；翻 done 后 24 passed+0 skip 推演
    （SR2-F-05 的 test 先一步激活后基数=23）。
- **P4 单测零触碰**：纯视觉面 e2e 承载（jsdom 无布局/不支持 ::selection
  解析）；page-column.test 不为样式字段改断言。**受锁面仅
  tests/e2e/reader-text.spec.ts**（[locked-change]）。

## 2. 五层规约

**─ 行为层 ──**：页盒（渲染/占位同构）panel 底+柔和阴影→页缘在 #f7f8fa
阅读区上可辨；划选=单层不透明近似色高亮，重叠 span 区不再加深。

**─ 接口层 ──**：PageColumn.tsx 页盒 div 的 style/className 增补两属性；
text-layer.css 两选择器背景值替换+头注偏离登记；**props/导出/geometry
零触碰**。

**─ 架构层 ──**：零新依赖零分层变化；PAGE_GAP_PX 与 gap-3 不动（INV-33
分母口径）；theme.css 变量只读消费。

**─ 生命周期层 ──**：不做：方案二自绘选区/gap 调整/页盒圆角（P7-D 域）/
暗色主题适配（v1 无暗色）。

**─ 文化层 ──**：TDD——e2e 新 test 先红（改样式前跑，B/C 两断言至少一项
红；守卫激活用 spec 备份法，禁触 registry）→实现→绿→变异红证 ≥2
（①页盒 background 删除断言红；②::selection 改回 transparent 75% 断言红；
cp 备份法还原）→受锁 spec 改动后全量 verify（tsc 关卡）。报告落
`scripts/audits/sr2-f-06-impl.report.md`，回复五行内。

## 3. 机检兼容自查

- 新增样式无 TODO/FIXME/placeholder 字面量；中文注释 UTF-8；locks:
  unlock→改 reader-text.spec.ts→apply；基线 verify 全绿/locks 数随
  manifest/e2e 数按 P3 推演申报。
