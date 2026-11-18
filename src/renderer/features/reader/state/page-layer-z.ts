/**
 * [F-A5 c 面] page-layer-z —— 页内层 z 序常量单源（ADR-0019 R4：
 * 色块上移到 canvas 之上，修复 PDF 自绘不透明背景遮死标注）。
 *
 * 层序（自下而上）：
 * 1. textLayer（官方 css z0——span 透明，纯手势/锚定面，视觉零参与）；
 * 2. canvas（页墨带与 PDF 自绘内容——透明底渲染只移除 pdf.js 默认白底，
 *    不保证文档自身背景透明；pointer-events:none 保持事件穿透）；
 * 3. 标注/搜索色块层（colorBlocks——位于 canvas 之上，经
 *    --annotation-blend 按主题合成：light/sepia=multiply，dark=screen）；
 * 4. 自绘选区层（selectionPaint——选区交互视觉保持最上）。
 *
 * 比较域：PageBox 页内容容器（h-fit）isolation:isolate——四层比较封闭在
 * 单页内，跨页互扰不可能。弹层（菜单 z-(--z-anchor-pop)/编辑器
 * z-(--z-anchor-pop)/工具条 z-(--z-float)）在页盒兄弟位，天然高于本域诸层。
 */
export const PAGE_LAYER_Z = {
  /** 官方 text-layer.css 的 z0（内联同值显式化——序单源防漂移） */
  text: 0,
  /** PDF 渲染 canvas（透明底渲染，文档自绘背景仍可不透明） */
  canvas: 1,
  /** 标注/搜索色块（canvas 之上，主题化混合） */
  colorBlocks: 2,
  /** 自绘选区层（交互视觉最上） */
  selectionPaint: 3
} as const
