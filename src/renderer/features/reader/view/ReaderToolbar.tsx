/**
 * [SR-RDR-07] ReaderToolbar —— 阅读器工具栏（工单：done / weak；[B1 批]
 * 翻页组拆 ReaderToolbarNav、双侧栏开合两钮收口本栏两端）
 *
 * ── 行为层 ──
 * - [B1 批] 左端首位=目录侧栏开关（aria-pressed=outlineOpen）；搜索槽之后
 *   右端=研究面板开关（aria-pressed=researchOpen，aria-label 字面=v2 设计
 *   稿「展开或收起研究面板」）——左右栏开合唯一入口（OutlineAside 收起钮
 *   与浮动展开 chevron 随之退役）；toggle 语义在装配面 ReaderPageView——
 *   本组件纯受控只上抛
 * - 翻页组（上一页/页码/下一页）拆驻 ReaderToolbarNav（行为零变——IME
 *   守卫随组迁移）；缩放 -/100%/+（0.5~3 步进 0.1）、适应宽度
 * - 标注颜色选择（当前色）；页内高亮搜索面板（P7E-03 兑现：经可选 slot
 *   prop searchBox 注入——装配面 ReaderPage 恒传 useReaderSearch 产出；
 *   缺席=旧占位 span 兜底，仅存量受锁测试夹具路径；库侧全文检索仍走 FTS）
 * - 选择模式开关（F-A3/INV-42，颜色组之后）：aria-pressed 反映当前态+选中
 *   态边框强调（颜色点选中态同语言）；toggle 语义在装配面 ReaderPage——
 *   工具栏纯受控只上抛 onToggleSelectionMode
 * - 双页开关（F-R1，适应宽度之后——版面控制同组）：aria-pressed+选中态
 *   边框强调（crib 选择模式按钮先例）；toggle 语义在装配面 ReaderPage——
 *   只上抛 onTogglePageLayout；±翻页按钮步进=props.pageStep（缺省 1=既有
 *   零变；装配面双页传 2=翻面语义）
 *
 * ── 接口层 ──
 * - export function ReaderToolbar(props: { page: number; totalPages: number; zoom: number;
 *     color: AnnotationColor; onNavigate(page: number): void;
 *     onZoom(z: number): void; onColor(c: AnnotationColor): void;
 *     selectionMode?: boolean; onToggleSelectionMode?(): void;
 *     onFitWidth?(): void; pageLayout?: 'single' | 'double';
 *     onTogglePageLayout?(): void; pageStep?: number;
 *     outlineOpen?: boolean; onToggleOutline?(): void;
 *     researchOpen?: boolean; onToggleResearch?(): void }): JSX.Element
 * - selectionMode/onToggleSelectionMode/onFitWidth/pageLayout/
 *   onTogglePageLayout/pageStep/searchBox（[B1] outlineOpen/onToggleOutline/
 *   researchOpen/onToggleResearch 同款可选先例）：受锁测试夹具（sha256 面）
 *   直植既有 props 形状零破坏；生产装配面 ReaderPageView 恒传（缺席=按钮
 *   aria-pressed false+点击无操作，仅存在于测试路径）
 * - onFitWidth（可选，Phase 3 接线时加入）：适应宽度需要滚动容器内宽与页面原始宽，
 *   二者都在 ReaderPage 手里——工具栏是纯受控组件不自测 DOM，故以回调上交；
 *   未传时按钮禁用并 title 说明
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯受控组件；页码显示为 1 基（store 内部 0 基，边界夹取由 store.setPage 兜底）
 * - [R3-RDR→T3-P4 皮肤票] 工具栏=.rdr-toolbar（mockup .toolbar：panel 底+line
 *   下缘——金族退役无 glass 无 blur）；控件=.rdr-tool-btn（28px 方格+hover
 *   line-soft+.on=accent-soft+inset ring）；缩放读数=.rdr-zoom-num；分隔线
 *   =.rdr-tb-sep；文档流位置/aria/testid 零变（PDF 区装饰浓度最低原则）
 * - [F-UI-02 图标化] 五文字控件换 toolbar-icons.tsx 图标+title 悬停汉语+
 *   sr-only span 保文本（textContent/accessible name 双面，受锁断言不动）；
 *   −/＋/100%/颜色点组不动（保字符数字）；选择模式 background 常亮叠加+
 *   双页图标随态（内联串锁[reader-toolbar-icons]保活，ring 住类承载）；
 *   [B1] 双侧栏开关钮=aria-label 承载语义名（收起钮先例形态——面板开合
 *   语义非动作名，sr-only 动作词不适用）
 */
import type { ReactNode } from 'react'
import type { AnnotationColor } from '@shared/models/annotation'
import { ANNOTATION_COLORS } from '@shared/constants'
import { COLOR_LABEL, COLOR_SWATCH } from '../anchors/annotation-style'
import { ICON_FIT_WIDTH, ICON_PAGE_DOUBLE, ICON_PAGE_SINGLE, ICON_RESEARCH_PANEL, ICON_SELECT, ICON_SIDEBAR_OUTLINE } from './toolbar-icons'
import { ReaderToolbarNav } from './ReaderToolbarNav'

/** 缩放步进（0.1，浮点累积经 round2 消除）——单源导出：工具栏按钮与快捷键装配
 *  （ReaderPage 经 ReaderShortcuts 消费）共用，禁止复制第二份 */
export const ZOOM_STEP = 0.1

/** 两位小数舍入（浮点累积消除）——同上单源导出 */
export const round2 = (v: number): number => Math.round(v * 100) / 100

export function ReaderToolbar(props: {
  page: number
  totalPages: number
  zoom: number
  color: AnnotationColor
  onNavigate: (page: number) => void
  onZoom: (z: number) => void
  onColor: (c: AnnotationColor) => void
  selectionMode?: boolean
  onToggleSelectionMode?: () => void
  onFitWidth?: () => void
  /** F-R1 页布局（缺省 single）：双页按钮 aria-pressed 消费 */
  pageLayout?: 'single' | 'double'
  /** F-R1 双页 toggle 上抛（缺席=可点无操作——既有可选回调先例） */
  onTogglePageLayout?: () => void
  /** F-R1 翻页步进（缺省 1=既有零变；双页装配面传 2=翻面语义） */
  pageStep?: number
  /** [B1 批] 目录侧栏开合（缺省 false=收起态渲染）；aria-pressed 消费 */
  outlineOpen?: boolean
  /** [B1 批] 目录侧栏 toggle 上抛（toggle 语义在装配面） */
  onToggleOutline?: () => void
  /** [B1 批] 研究面板开合（缺省 false=收起态渲染）；aria-pressed 消费 */
  researchOpen?: boolean
  /** [B1 批] 研究面板 toggle 上抛（toggle 语义在装配面） */
  onToggleResearch?: () => void
  /** P7E-03 页内搜索面板 slot（装配面 useReaderSearch 产出恒传；缺席=旧占位
   *  span 兜底——存量受锁测试夹具直植 props 形状零破坏，onFitWidth 同款
   *  可选先例形态） */
  searchBox?: ReactNode
}): JSX.Element {
  const { page, totalPages, zoom, color, onNavigate, onZoom, onColor, onFitWidth } = props
  const selectionMode = props.selectionMode ?? false
  const pageLayout = props.pageLayout ?? 'single'
  const pageStep = props.pageStep ?? 1
  const outlineOpen = props.outlineOpen ?? false
  const researchOpen = props.researchOpen ?? false

  // [T3-P4] 工具栏钮语汇=.rdr-tool-btn（mockup .tb-btn：28px 方格+7px 圆角+
  // hover line-soft+.on=accent-soft/inset ring——theme-reader.css 单源；旧
  // syn-btn-ghost 变体退役）；−/＋/100% 文字符钮加 -text 变体（弹宽不截字）
  const btn = 'rdr-tool-btn shrink-0 disabled:opacity-50'
  const btnText = 'rdr-tool-btn rdr-tool-btn-text shrink-0 disabled:opacity-50'

  return (
    // [T3-P4] 工具栏皮肤=.rdr-toolbar（mockup .toolbar：panel 底+line 下缘——
    // 金族退役；padding/gap 由组件承载）；文档流位置零变：纯皮肤票
    <div className="rdr-toolbar flex shrink-0 flex-wrap items-center gap-1 px-3.5 py-1.5 text-xs">
      {/* [B1 批] 左端首位：目录侧栏开关（开合唯一入口——收起钮/浮动 chevron
          退役；on 态=rdr-tool-btn on 类，与选择模式/双页钮同语言） */}
      <button
        type="button"
        className={`${btn}${outlineOpen ? ' on' : ''}`}
        aria-pressed={outlineOpen}
        aria-label="展开或收起目录侧栏"
        title="展开或收起目录侧栏"
        onClick={() => props.onToggleOutline?.()}
      >
        {ICON_SIDEBAR_OUTLINE}
      </button>

      {/* 翻页组（[B1 批] 拆驻 ReaderToolbarNav——行为零变） */}
      <ReaderToolbarNav page={page} totalPages={totalPages} pageStep={pageStep} onNavigate={onNavigate} />

      {/* [T3-P4] 分组分隔线（mockup .tb-sep——装饰性，aria-hidden） */}
      <span className="rdr-tb-sep" aria-hidden="true" />

      <div className="flex items-center gap-1">
        {/* −/＋/100% 保字符数字（符号信息性——票面明文），单行紧凑形态 */}
        <button type="button" className={btnText} onClick={() => onZoom(round2(zoom - ZOOM_STEP))}>−</button>
        <span data-testid="zoom-label" className="rdr-zoom-num">{Math.round(zoom * 100)}%</span>
        <button type="button" className={btnText} onClick={() => onZoom(round2(zoom + ZOOM_STEP))}>＋</button>
        <button type="button" className={btnText} onClick={() => onZoom(1)}>100%</button>
        <button
          type="button"
          className={btn}
          disabled={onFitWidth === undefined}
          title={onFitWidth === undefined ? '适应宽度待页面接线' : '适应宽度（按窗口宽度适配当前页）'}
          onClick={() => onFitWidth?.()}
        >
          {ICON_FIT_WIDTH}
          <span className="sr-only">适应宽度</span>
        </button>

        {/* 双页开关（F-R1）：适应宽度之后（版面控制同组）；crib 选择模式按钮
            先例（aria-pressed+选中态边框强调）；toggle 语义在装配面——只上抛。
            F-UI-02：图标随 pageLayout 三元+title 随态（isMax 三元先例）；
            [T3-P4] on 态=rdr-tool-btn on 类（ring 住类+borderColor 内联串保活） */}
        <button
          type="button"
          className={`${btn}${pageLayout === 'double' ? ' on' : ''}`}
          aria-pressed={pageLayout === 'double'}
          title={pageLayout === 'double' ? '切换为单页阅读' : '切换为双页阅读（两页并排，翻页按对步进）'}
          style={{ borderColor: pageLayout === 'double' ? 'var(--accent)' : undefined }}
          onClick={() => props.onTogglePageLayout?.()}
        >
          {pageLayout === 'double' ? ICON_PAGE_DOUBLE : ICON_PAGE_SINGLE}
          <span className="sr-only">双页</span>
        </button>
      </div>

      <span className="rdr-tb-sep" aria-hidden="true" />

      <div className="flex items-center gap-1" role="group" aria-label="标注颜色">
        {ANNOTATION_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={`标注色：${COLOR_LABEL[c]}`}
            aria-pressed={color === c}
            className="h-4 w-4 rounded-full border"
            style={{
              background: COLOR_SWATCH[c],
              borderColor: color === c ? 'var(--text)' : 'var(--border)',
              outline: color === c ? '2px solid var(--accent-soft)' : undefined
            }}
            onClick={() => onColor(c)}
          />
        ))}
      </div>

      <span className="rdr-tb-sep" aria-hidden="true" />

      {/* 选择模式开关（F-A3/INV-42）：颜色组之后、搜索占位之前；选中态边框
          强调（颜色点选中态同语言）；toggle 语义在装配面——本组件只上抛。
          F-UI-02：激活叠加 background 常亮（borderColor/background 内联串锁
          保活[reader-toolbar-icons]）+图标化；[T3-P4] on 类承载 inset ring */}
      <button
        type="button"
        className={`${btn}${selectionMode ? ' on' : ''}`}
        aria-pressed={selectionMode}
        title="选择模式：开启后可在标注块上直接划选文字，标注暂不可点击"
        style={{
          borderColor: selectionMode ? 'var(--accent)' : undefined,
          background: selectionMode ? 'var(--accent-soft)' : undefined
        }}
        onClick={() => props.onToggleSelectionMode?.()}
      >
        {ICON_SELECT}
        <span className="sr-only">选择模式</span>
      </button>

      {/* P7E-03 页内搜索面板 slot：生产装配面（ReaderPage 经 useReaderSearch）
          恒传；缺席=旧占位 span 兜底（真输入框在 ReaderSearchBox——此处仅
          存量受锁测试夹具路径） */}
      {props.searchBox ?? (
        <span
          className="ml-auto w-44 rounded border px-2 py-0.5"
          style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
          title="页内高亮搜索面板由装配面 slot 提供（本占位仅测试夹具路径）"
        >
          全库检索请回文献库
        </span>
      )}

      {/* [B1 批] 右端（搜索槽之后）：研究面板开关（开合唯一入口；aria-label
          字面=v2 设计稿） */}
      <button
        type="button"
        className={`${btn}${researchOpen ? ' on' : ''}`}
        aria-pressed={researchOpen}
        aria-label="展开或收起研究面板"
        title="展开或收起研究面板"
        onClick={() => props.onToggleResearch?.()}
      >
        {ICON_RESEARCH_PANEL}
      </button>
    </div>
  )
}
