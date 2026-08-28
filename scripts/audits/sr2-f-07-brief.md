# SR2-F-07 划选自绘选区+AI 层去 multiply（缺陷 P1：遮字+标注重叠加深）——票面 v1

> 来源：2026-08-28 复测三问题 P1（测试 1：划选高亮完全不透明看不到选了什么；
> 标注重叠处颜色加深）。取证定性见 `docs/prompts/2026-08-28_retest3-handoff.md` §2A。
> **根因双实锤**：①`text-layer.css:56-64` ::selection 背景不透明——pdfjs 文本层
> span `color:transparent`（:33），字形由 canvas 渲染在文本层之下，官方 25%
> 半透明才透字；F-06 的「压白底合成等效色」只对纯白底成立，页底有黑字即遮字。
> ②`AnnotationLayer.tsx:198` 与 `AiAnnotationLayer.tsx:144` 两容器均
> `zIndex:5 + mixBlendMode:'multiply'`——容器级 multiply 与 backdrop（含先绘
> 兄弟层）相乘，两层重叠处乘两次=加深（AI-09 起既有机制）。
> 纪律：三屋模式；实现者禁 git/registry；取证禁触 tickets/。

## 1. 主控预裁项

- **P1 修法=B 案（自绘选区）+AI 层去 multiply**：
  - ①`text-layer.css`：`.textLayer ::selection`/`::-moz-selection` 的
    background 改 `transparent`（两行 fallback 结构保留，br 规则不动）。
  - ②`SelectionLayer.tsx` 自绘选区块：`evaluate()` 已产出 `anchor.rects`
    （selectionToAnchor，:121 一带）——pending 态存在时按 rects 渲染覆盖
    div（**带 alpha 背景色，禁 mixBlendMode**；`pointer-events:none`
    防吞划选手势；坐标换算参照 AnnotationLayer 消费 anchor.rects 的
    同型数学，挂载盒参照系同 toolbar 定位数学 :131-135）。选区消失
    （pending null）=层不渲染。测试钩 `data-testid="selection-rects"`。
  - ③`AiAnnotationLayer.tsx:144` 摘容器 `mixBlendMode:'multiply'`，AI 段
    `opacity:0.45`（:164）保留；**AnnotationLayer.tsx:198 单层 multiply
    不动**（单层无层间叠乘——只摘第二条叠乘路径）。
  - 选区色值：自绘块用带 alpha 的现有 accent 系（如
    `color-mix(in srgb, var(--accent) 30%, transparent)` 或等价 rgba），
    保证黑字透出可读——验收判据「看得见选了什么」前置。
- **P2 受锁面（必然红→[locked-change] 改写）**：
  - `tests/e2e/reader-text.spec.ts` F-06 视觉小票（:617-680）：C 节断言
    「::selection 无透明分量」（:664-666）在 B 案下必然红——**改写守卫为
    新机制**：`::selection` 背景=transparent + 自绘层
    `[data-testid="selection-rects"]` 存在且背景带 alpha 分量。测试名与
    注释同步（「划选高亮不透明」→「自绘选区+原生 selection 透明」；
    B 节页盒断言不动）。
  - `tests/unit/renderer/selection-layer.test.tsx`：无颜色断言（纯工具条
    行为）——**新增自绘行为 it**（pending 有 rects→渲染层+rect 块数；
    pending null→层不渲染）。unlock→改→apply。
- **P3 接缝核对**：SelectionLayer 头注 F-06 链声明追加 F-07；text-layer.css
  头注（若有）同步；AiAnnotationLayer 头注补「去 multiply 决策依据」
  （层间叠乘两源头之一摘除——单层 AnnotationLayer 保留）。
- **P4 不做**：AnnotationLayer 的 multiply 摘除（单层无叠乘，动了引入
  新视觉回归面）；::selection 半透明回退（A 案否决——原始缺陷 C 回归）。

## 2. 五层规约

**─ 行为层 ──**：划选时原生高亮透明（文字可读），SelectionLayer 按
anchor.rects 自绘半透明选区块（单层单绘——重叠 span 不逐元素叠绘）；
AI 段高亮与用户标注重叠处不再层间叠乘加深。

**─ 接口层 ──**：SelectionLayer.tsx（+自绘渲染块）/text-layer.css/
AiAnnotationLayer.tsx 三文件；selectionToAnchor/anchor.rects 契约零触碰。

**─ 架构层 ──**：renderer reader 域内；无新依赖；z 序推演入头注
（canvas 字形←透明文本层←自绘选区块(pointer-events:none)←标注层
←AI 层——各层 zIndex/multiply/alpha 声明，门一强制审项）。

**─ 生命周期层 ──**：不做：选区块渐变/动画；跨页选区自绘（evaluate 已
拒绝跨页）；触屏长按选区特化。

**─ 文化层 ──**：TDD——selection-layer 新 it 先红（无自绘渲染）→实现→
绿→变异红证 ≥2（删自绘渲染块→渲染 it 红；::selection 改回不透明→
e2e 由主控跑或申报 cp 备份变异→unit 侧证明层渲染逻辑）→受锁文件
改动后全量 verify（playwright 不查类型纪律）。e2e 需真实拖选验证者
留主控复测。报告落 `scripts/audits/sr2-f-07-impl.report.md`，回复五行内。

## 3. 机检兼容自查

无 TODO/FIXME/placeholder；UTF-8；node24 前缀（`export PATH="/e/class/智慧水务/tools/node24:$PATH"`）；
locks unlock→改→apply（受锁两文件同批）；verify 真退出码落盘
（echo exit=$? >> 日志）；基线=95 文件 741 用例/locks 144（本单用例数
自报增量）。
