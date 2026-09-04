/**
 * [F-A5 c 面] page-layer-z —— 页内层 z 序常量单源（ADR-0019 R2 修订：色块
 * 垫底当背景板——用户令 2026-08-31「涂色的渲染应该在最下方当背景板而不是
 * 影响文字的颜色」）。
 *
 * 层序（自下而上）：
 * 1. textLayer（官方 css z0——span 透明，纯手势/锚定面，视觉零参与）；
 * 2. 标注/AI 色块层（colorBlocks——**背景板**：pdf.js canvas 以透明底渲染
 *    （PdfPageCanvas background rgba(255,255,255,0)），墨带恒在色块之上，
 *    文字纯黑不被染；multiply 摘除（normal——半透明 alpha 语义随令））；
 * 3. canvas（页墨带——z 上于色块、下于自绘层；pointer-events:none 明纸
 *    穿透，标注 rect 点击/文本划选手势零回归）；
 * 4. 自绘选区层（selectionPaint——选区交互视觉保持最上，票面 §0c/S4：
 *    灰块视觉在色块上）。
 *
 * 比较域：PageBox 页内容容器（h-fit）isolation:isolate——四层比较封闭在
 * 单页内，跨页互扰不可能。弹层（菜单 z-(--z-anchor-pop)/编辑器
 * z-(--z-anchor-pop)/工具条 z-(--z-float)）在页盒兄弟位，天然高于本域诸层。
 */
export const PAGE_LAYER_Z = {
  /** 官方 text-layer.css 的 z0（内联同值显式化——序单源防漂移） */
  text: 0,
  /** 标注/AI 色块（背景板——垫在 canvas 墨带之下） */
  colorBlocks: 1,
  /** PDF 渲染 canvas（透明底墨带） */
  canvas: 2,
  /** 自绘选区层（交互视觉最上） */
  selectionPaint: 3
} as const
