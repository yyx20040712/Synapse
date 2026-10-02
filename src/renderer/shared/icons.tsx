/**
 * [F-UIRES-02 批 B] 通用小钮图标常量表（工单：F-UIRES-02 / strong）
 *
 * ── 行为层 ──
 * - 功能类小按钮图标化全域共享常量（用户 2026-10-02 三批增补：小钮不渲染
 *   汉字文本、仅图标+悬停汉字 title 提示；aria-label 与 title 同源）
 * - 常量清单（R1）：X 关闭/check 确定/chevron 四向+双 chevron（收起展开）/
 *   plus 添加/undo 撤销/redo 重做/retry 重试/pencil 重命名/hand 选择/trash
 *   删除/highlight 高亮/underline 下划线/note 备注/save 保存
 *
 * ── 接口层 ──
 * - export const ICON_XXX: JSX.Element（模块级单例常量——reader 工具栏
 *   toolbar-icons.tsx 形态同源；重复引用零重绘）
 *
 * ── 架构层 ──
 * - D7 形态同源：24×24 单色描边简笔画+viewBox 24×24+aria-hidden——stroke
 *   走 CSS 类（theme-buttons.css .syn-icon-btn svg：stroke currentColor/
 *   fill none/统一线宽 1.6——titlebar-btn 先例），禁内联色/禁新依赖
 * - 消费面自行追加 .syn-icon-btn 类取 svg 规格；特例尺寸（TitleBarControls
 *   10×10 件）沿其既有规格不迁（票面 R1 明文）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 按钮文本走 sr-only span（消费面内）——textContent/accessible name 双面
 *   保活（受锁断言零改）；测试=tests/unit/renderer/ui-icons-shared.test.tsx
 *   （always-active）+tests/unit/renderer/ui-iconify-buttons.test.tsx
 */
export const ICON_X = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
)

export const ICON_CHECK = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4.5 12.5l5 5 10-11" />
  </svg>
)

export const ICON_CHEVRON_LEFT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M15 4l-8 8 8 8" />
  </svg>
)

export const ICON_CHEVRON_RIGHT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M9 4l8 8-8 8" />
  </svg>
)

export const ICON_CHEVRON_UP = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 15l8-8 8 8" />
  </svg>
)

export const ICON_CHEVRON_DOWN = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 9l8 8 8-8" />
  </svg>
)

/** 双 chevron（导航窗格整体收起/展开——» « 语义） */
export const ICON_CHEVRONS_LEFT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M13 4l-8 8 8 8M20 4l-8 8 8 8" />
  </svg>
)

export const ICON_CHEVRONS_RIGHT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M11 4l8 8-8 8M4 4l8 8-8 8" />
  </svg>
)

export const ICON_PLUS = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

/** 撤销（回转箭头） */
export const ICON_UNDO = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M8 5L3 10l5 5" />
    <path d="M3 10h11a6 6 0 0 1 6 6v1" />
  </svg>
)

/** 重做（前转箭头） */
export const ICON_REDO = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M16 5l5 5-5 5" />
    <path d="M21 10H10a6 6 0 0 0-6 6v1" />
  </svg>
)

/** 重试（圆形箭头） */
export const ICON_RETRY = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M20 12a8 8 0 1 1-2.4-5.7" />
    <path d="M20 3v4.5h-4.5" />
  </svg>
)

/** 铅笔（重命名） */
export const ICON_PENCIL = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 20l1-4L16.5 4.5a2.1 2.1 0 0 1 3 3L8 19l-4 1z" />
  </svg>
)

/** 手掌（小手选择） */
export const ICON_HAND = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M8 12V5.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M11 11V4.5a1.5 1.5 0 0 1 3 0V11" />
    <path d="M14 11V6.5a1.5 1.5 0 0 1 3 0v7.5a6 6 0 0 1-6 6h-.8a6 6 0 0 1-5.2-3L3.6 14a1.6 1.6 0 0 1 2.7-1.7L8 14" />
  </svg>
)

/** 垃圾桶（删除） */
export const ICON_TRASH = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13" />
    <path d="M10 11v5M14 11v5" />
  </svg>
)

/** 荧光笔（高亮——笔身斜置+笔头） */
export const ICON_HIGHLIGHT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M9 15l-3.5 3.5H2L5.5 15z" />
    <path d="M9 15l9.5-9.5a2 2 0 0 1 2.8 2.8L12 17.5" />
    <path d="M6.5 12.5L13 6" />
  </svg>
)

/** 下划线（文字底横线） */
export const ICON_UNDERLINE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M6 4v7a6 6 0 0 0 12 0V4" />
    <path d="M5 20h14" />
  </svg>
)

/** 便签（备注——折角便签） */
export const ICON_NOTE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M5 4h14v10l-6 6H5z" />
    <path d="M19 14h-6v6" />
    <path d="M8.5 8h7M8.5 11h4" />
  </svg>
)

/** 保存（软盘——LineageToolbar SaveIcon 13×13 语义的 24×24 通用版） */
export const ICON_SAVE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 4h13l3 3v13H4z" />
    <path d="M8 4v5h7V4" />
    <rect x="8" y="13" width="8" height="6" />
  </svg>
)
