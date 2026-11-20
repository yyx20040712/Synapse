/**
 * [F-UI-02] 阅读器工具栏图标常量表（工单：F-UI-02 / strong）
 *
 * ── 行为层 ──
 * - 五控件图标化面：上一页/下一页（左右箭头）、适应宽度（⇔ 双向）、单页/
 *   双页（单/双矩形——随 pageLayout 三元切换，TitleBarControls isMax 三元
 *   先例）、选择模式（文本光标 I-beam）
 * - −/＋/100% 三控件保持字符数字（符号信息性，图标化反损可读性——主控
 *   裁量）；颜色点组已图形化不动
 *
 * ── 接口层 ──
 * - export const ICON_PREV / ICON_NEXT / ICON_FIT_WIDTH / ICON_PAGE_SINGLE /
 *   ICON_PAGE_DOUBLE / ICON_SELECT / ICON_SIDEBAR_OUTLINE /
 *   ICON_RESEARCH_PANEL: JSX.Element（模块级常量，仿 App.tsx
 *   NAV_ICONS 形态；[B1 批] 后两者=双侧栏开合钮——语义名走按钮 aria-label）
 *
 * ── 架构层 ──
 * - D7=24×24 单色描边简笔画，viewBox 24×24+aria-hidden——stroke 走 CSS 类
 *   （theme-reader.css .rdr-toolbar button svg / .rdr-aside-tabs button svg：
 *   stroke currentColor/fill none/统一线宽 1.6），禁内联色/禁新依赖
 * - [v2 第一期 2026-11-19] PREV/NEXT/FIT_WIDTH path 逐值换 v2 设计稿
 *   symbol 库（i-prev/i-next/i-fit 四角收缩形）；单双页与 I-beam 为产品
 *   自有语义保留原图形
 * - 独立文件：图标常量表拆件保持 ReaderToolbar ≤250（改造前 233 行+常量
 *   将超限——拆后工具栏终态 248 行；宪法组件行数红线）
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 按钮文本走 sr-only span（ReaderToolbar 内）——textContent/accessible
 *   name 双面保活（受锁 selection-mode:303/double-page:425+e2e name 断言）
 */
export const ICON_PREV = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m15 6-6 6 6 6" />
  </svg>
)

export const ICON_NEXT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="m9 6 6 6-6 6" />
  </svg>
)

export const ICON_FIT_WIDTH = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5" />
  </svg>
)

export const ICON_PAGE_SINGLE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <rect x="7" y="4" width="10" height="16" rx="1" />
  </svg>
)

export const ICON_PAGE_DOUBLE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <rect x="4" y="4" width="7" height="16" rx="1" />
    <rect x="13" y="4" width="7" height="16" rx="1" />
  </svg>
)

/** 选择模式（I-beam 文本光标：横杠上下各一+中竖+上下衬线撇捺——选择语义） */
export const ICON_SELECT = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M6 4h12M12 4v16M6 20h12M9 4l3 3 3-3M9 20l3-3 3 3" />
  </svg>
)

/** [B1 批] 目录侧栏开关（左缘分栏形：外框+左列竖线——左栏开合语义；
 *  aria-pressed 承载开合态，语义名走按钮 aria-label） */
export const ICON_SIDEBAR_OUTLINE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9.5 4v16" />
  </svg>
)

/** [B1 批] 研究面板开关（右缘分栏形：外框+右列竖线+内容行——右栏开合语义；
 *  aria-label 字面=v2 设计稿「展开或收起研究面板」） */
export const ICON_RESEARCH_PANEL = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M14.5 4v16M8 9h3M8 13h3" />
  </svg>
)
