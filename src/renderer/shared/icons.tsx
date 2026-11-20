/**
 * [F-UIRES-02 批 B] 通用小钮图标常量表（工单：F-UIRES-02 / strong）
 *
 * ── 行为层 ──
 * - 功能类小按钮图标化全域共享常量（用户 2026-10-02 三批增补：小钮不渲染
 *   汉字文本、仅图标+悬停汉字 title 提示；aria-label 与 title 同源）
 * - 常量清单（R1）：X 关闭/check 确定/chevron 四向+双 chevron（收起展开）/
 *   plus 添加/undo 撤销/redo 重做/retry 重试/pencil 重命名/hand 选择/trash
 *   删除/highlight 高亮/underline 下划线/note 备注/save 保存
 * - [前端四期 B2 2026-11-20] 设置五类导航图标五件（settings/sun/reader/ai/
 *   database——v2 symbol 库逐值誊录；settings/reader 原驻 Rail.tsx 内联两份
 *   随本批上收共享单源，Rail 改 import 消费不留两套）
 *
 * ── 接口层 ──
 * - export const ICON_XXX: JSX.Element（模块级单例常量——reader 工具栏
 *   toolbar-icons.tsx 形态同源；重复引用零重绘）
 *
 * ── 架构层 ──
 * - D7 形态同源：24×24 单色描边简笔画+viewBox 24×24+aria-hidden——stroke
 *   走 CSS 类（theme-buttons.css .syn-icon-btn svg：stroke currentColor/
 *   fill none/统一线宽 1.6——titlebar-btn 先例），禁内联色/禁新依赖
 * - [v2 第一期 2026-11-19] 有 v2 对应图形的常量（check/chevron 四向/undo/
 *   highlight/note）path 逐值换 v2 设计稿 symbol 库；v2 无对应者（retry/
 *   pencil/hand/trash/underline/save/双 chevron）保留原图形
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
    <path d="m5 12 4 4L19 6" />
  </svg>
)

export const ICON_CHEVRON_LEFT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const ICON_CHEVRON_RIGHT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const ICON_CHEVRON_UP = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m6 15 6-6 6 6" />
  </svg>
)

export const ICON_CHEVRON_DOWN = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m6 9 6 6 6-6" />
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

/** 撤销（回转箭头——v2 i-undo） */
export const ICON_UNDO = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M9 7 4 12l5 5M5 12h8a6 6 0 0 1 6 6" />
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

/** 荧光笔（高亮——v2 i-highlight：斜置笔身+底线） */
export const ICON_HIGHLIGHT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m14 4 6 6-9 9H5v-6zM4 21h16M8 13l6 6" />
  </svg>
)

/** 下划线（文字底横线） */
export const ICON_UNDERLINE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M6 4v7a6 6 0 0 0 12 0V4" />
    <path d="M5 20h14" />
  </svg>
)

/** 便签（备注——v2 i-note：折角便签+两行文） */
export const ICON_NOTE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M5 3h14v13l-5 5H5zM14 21v-5h5M8 8h8M8 12h6" />
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

/* ══ [前端四期 B2] 设置五类导航图标（v2 symbol 库 i-settings/i-sun/i-reader/
   i-ai/i-database path 逐值誊录——synapse-redesign-v2.html L720-756；描边走
   消费面 CSS（settings.css .settings-nav-item svg 同 .rail-item svg 规格）══ */

/** 设置齿轮（v2 i-settings——原 Rail.tsx 内联件上收） */
export const ICON_SETTINGS = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" />
  </svg>
)

/** 太阳（v2 i-sun——外观分类） */
export const ICON_SUN = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" />
  </svg>
)

/** 打开的书（v2 i-reader——阅读与标注分类；原 Rail.tsx 内联件上收） */
export const ICON_READER = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
  </svg>
)

/** 星芒（v2 i-ai——AI 助手分类） */
export const ICON_AI = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m12 3 1.4 4.2L18 9l-4.6 1.8L12 15l-1.4-4.2L6 9l4.6-1.8zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8zM5 14l.7 2.3L8 17l-2.3.7L5 20l-.7-2.3L2 17l2.3-.7z" />
  </svg>
)

/** 数据库圆柱（v2 i-database——数据与网络分类） */
export const ICON_DATABASE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <ellipse cx="12" cy="5" rx="8" ry="3" />
    <path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7" />
  </svg>
)
