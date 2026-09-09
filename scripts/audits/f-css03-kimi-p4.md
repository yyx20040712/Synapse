[routing]: run=20260909232022-gmgf source=kimi-main model=kimi-k3 switches=0 usage=in=2387,out=3607 latency=94089ms (by ds-call.mjs 链)

## 片四裁决：tsx 迁移面（13 文件）

[W-1] **PAINT_BG 若喂 Canvas2D 则静默失效**。`selection-paint.tsx` 文件名指向选区涂抹层；`CanvasRenderingContext2D.fillStyle` 不解析 `var()`——HTML 规范明确非法值赋值被静默忽略、沿用上一 fillStyle，无任何报错。本 diff 仅见常量声明不见使用点，无法确认宿主是 JSX style（安全）还是 canvas 2D（致命）。"reader 态逐字节同"是否覆盖激活选区涂抹态未明示。
证据：`src/renderer/features/reader/selection-paint.tsx:41 const PAINT_BG = 'var(--reader-selection-paint)'`

[W-2] **SVG presentation attribute 上 var() 依赖引擎版本，零断言锁**。`fill="var(--panel)"` 与 `INFERRED_STROKE='var(--edge-inferred)'`（推测喂 stroke attr）：SVG2 规定 presentation attribute 按 CSS 语法解析，但 var() 支持为后加特性（Chromium ≈117+/Firefox 112+/Safari 16.4+）；不支持时 computed-value-time invalid，fill 回退 initial 黑色。像素差分三 lineage 态字节同=当前 Electron 有效的强实证，但无测试锁定，Electron 降级或跨端复用即静默变色。**不确定**：本包未给 Electron/Chromium 版本下限。
证据：`LineageNodeCard.tsx:121 fill="var(--panel)"`；`LineageEdges.tsx:43`

[W-3] **AnnotationEditor 文字色 #ffffff→var(--panel) 的等价性存疑于语义层**。按钮文字原硬编码纯白，迁到面板色 token：若 `--panel` 为暖白/带 alpha（lineage 侧多处 `background:'#ffffff'→var(--panel)` 暗示 panel≈白），受测态零差成立，但 hover/disabled/聚焦态未见覆盖；且"文字跟随 panel"是语义改色而非纯 token 化，未来 panel 主题化时按钮文字会连带漂移——可能是有意，需主控确认。
证据：`AnnotationEditor.tsx:122 color: 'var(--panel)'`

[W-4] **B-5 防回退缺口：常量对象+SVG attr 面**。12 处迁移点中 7 处在模块级常量对象（TAG_CHIP_STYLE/TAG_BOX_STYLE/NOTE_CARD×2/SIDE_GLASS/SIDE_TAG_CHIP/PAINT_BG/INFERRED_STROKE）、2 处在 SVG presentation attr。若 B-5 AST 仅扫 JSX style 属性面，十六进制可经顶层常量对象或 `fill="#xxx"` 复活而无关卡拦截；PdfPageCanvas 的 `'transparent'` 连色值字面量形态都不是，规则更难捕获。建议负锚补 grep 型冗余关卡或将 AST 面扩至顶层常量。**不确定**：B-5 实际覆盖范围本片无规则源。
证据：`LineageSidePanel.tsx:101-103`、`LineageNodeMeta.tsx:36,46`、`PdfPageCanvas.tsx:139`

[N-1] **PdfPageCanvas 'rgba(255,255,255,0)'→'transparent' 值等价无误**。两者均 alpha=0 全透明；pdfjs render `background` 参数接受合法 CSS 颜色串，`'transparent'` 合规。零差实证+规范双重支撑，裁决无问题。
证据：`PdfPageCanvas.tsx:139`

[N-2] **token 值等价性本片不可裁决，整体转介片三**。`--panel/--edge-inferred/--danger-a08/a25/--note-border/--panel-a92/--border/--border-gold-a15/a50/--shadow-pop-md/sm/--shadow-page/--reader-selection-paint` 共 14 个 token 定义均不在本 diff；本片只能确认引用面语法形态正确（常量对象/内联 style/渐变串内 var() 均为合法宿主）。等价性证据完全外包给 sha 逐字节同+像素零差。
证据：SplitPane.tsx:175 渐变串 `linear-gradient(180deg, var(--border-gold-a15), ...)`

---

**统计**：B=0 / W=4 / N=2。

**总评**：迁移面语法宿主全部合法、无阻断项，但两个 var() 高危宿主（canvas 2D、SVG presentation attr）当前仅靠像素差分实证、无断言锁，且 B-5 对常量对象/SVG attr 面存在结构性防回退盲区——建议收口前补 W-1 使用点证据与一条 var() 渲染态断言。