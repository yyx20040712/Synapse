/**
 * [SR-RDR-07] ReaderToolbar —— 阅读器工具栏（工单：done / weak）
 *
 * ── 行为层 ──
 * - 页码显示/跳转、上/下页、缩放 -/100%/+（0.5~3 步进 0.1）、适应宽度
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
 *     onTogglePageLayout?(): void; pageStep?: number }): JSX.Element
 * - selectionMode/onToggleSelectionMode/onFitWidth/pageLayout/
 *   onTogglePageLayout/pageStep 可选：受锁测试夹具（sha256 面）直植既有
 *   props 形状零破坏；生产装配面 ReaderPage 恒传（缺席=常规态渲染+按钮
 *   点击无操作/步进 1，仅存在于测试路径）
 * - onFitWidth（可选，Phase 3 接线时加入）：适应宽度需要滚动容器内宽与页面原始宽，
 *   二者都在 ReaderPage 手里——工具栏是纯受控组件不自测 DOM，故以回调上交；
 *   未传时按钮禁用并 title 说明
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯受控组件；页码显示为 1 基（store 内部 0 基，边界夹取由 store.setPage 兜底）
 * - [R3-RDR 皮肤票] 玻璃浮层（.rdr-toolbar：panel-glass+blur10+金 hairline 底缘）
 *   +控件 ghost 变体+页码/缩放衬线数字（.rdr-num）；文档流位置/aria/testid
 *   零变（PDF 区装饰浓度最低原则）
 */
import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { AnnotationColor } from '@shared/models/annotation'
import { ANNOTATION_COLORS } from '@shared/constants'
import { COLOR_LABEL, COLOR_SWATCH } from './anchors/annotation-style'

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
  /** P7E-03 页内搜索面板 slot（装配面 useReaderSearch 产出恒传；缺席=旧占位
   *  span 兜底——存量受锁测试夹具直植 props 形状零破坏，onFitWidth 同款
   *  可选先例形态） */
  searchBox?: ReactNode
}): JSX.Element {
  const { page, totalPages, zoom, color, onNavigate, onZoom, onColor, onFitWidth } = props
  const selectionMode = props.selectionMode ?? false
  const pageLayout = props.pageLayout ?? 'single'
  const pageStep = props.pageStep ?? 1
  const [pageInput, setPageInput] = useState(String(page + 1))

  // 外部翻页（键盘/目录跳转/越界自愈）同步回输入框
  useEffect(() => {
    setPageInput(String(page + 1))
  }, [page])

  /** 页码跳转提交：失焦或回车；非法输入回显当前页（夹取由 store 兜底） */
  const commitPage = (): void => {
    const v = Number.parseInt(pageInput, 10)
    if (Number.isNaN(v)) {
      setPageInput(String(page + 1))
      return
    }
    onNavigate(v - 1)
    setPageInput(String(page + 1))
  }

  // R3-U3 皮肤票：控件走 ghost 变体语言（theme-buttons.css .syn-btn-ghost
  // ——Button 组件同款皮肤类；不经 Button 组件因其不带 title prop，「适应宽度」
  // 禁用态 title 提示属交互面零变项，保留原生 button）
  const btn = 'syn-btn-ghost rounded border px-2 py-0.5 text-xs disabled:opacity-50'

  return (
    // 玻璃浮层皮肤（--panel-glass+blur10+金 hairline 底缘——theme-reader.css 单源；
    // 文档流位置零变：纯皮肤票，F-05 滚动收敛面不扰动）
    <div className="rdr-toolbar flex shrink-0 flex-wrap items-center gap-2 px-3 py-2 text-xs">
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          disabled={page <= 0}
          onClick={() => onNavigate(page - pageStep)}
        >
          上一页
        </button>
        <input
          className="rdr-num w-12 rounded border px-1 py-0.5 text-center text-xs"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          value={pageInput}
          aria-label="跳转到页"
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={commitPage}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitPage()
          }}
        />
        <span className="rdr-num" style={{ color: 'var(--text-dim)' }}>
          / {totalPages > 0 ? totalPages : '…'}
        </span>
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          disabled={totalPages > 0 && page >= totalPages - 1}
          onClick={() => onNavigate(page + pageStep)}
        >
          下一页
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          onClick={() => onZoom(round2(zoom - ZOOM_STEP))}
        >
          −
        </button>
        <span data-testid="zoom-label" className="rdr-num w-10 text-center" style={{ color: 'var(--text-dim)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className={btn}
          onClick={() => onZoom(round2(zoom + ZOOM_STEP))}
        >
          ＋
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onZoom(1)}
        >
          100%
        </button>
        <button
          type="button"
          className={btn}
          disabled={onFitWidth === undefined}
          title={onFitWidth === undefined ? '适应宽度待页面接线' : '按窗口宽度适配当前页'}
          onClick={() => onFitWidth?.()}
        >
          适应宽度
        </button>

        {/* 双页开关（F-R1）：适应宽度之后（版面控制同组）；crib 选择模式按钮
            先例（aria-pressed+选中态边框强调）；toggle 语义在装配面——只上抛 */}
        <button
          type="button"
          className={btn}
          aria-pressed={pageLayout === 'double'}
          title="两页并排阅读（翻页按对步进）"
          style={{ borderColor: pageLayout === 'double' ? 'var(--accent)' : undefined }}
          onClick={() => props.onTogglePageLayout?.()}
        >
          双页
        </button>
      </div>

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

      {/* 选择模式开关（F-A3/INV-42）：颜色组之后、搜索占位之前；选中态边框
          强调（颜色点选中态同语言）；toggle 语义在装配面——本组件只上抛 */}
      <button
        type="button"
        className={btn}
        aria-pressed={selectionMode}
        title="开启后可在标注块上直接划选文字，标注暂不可点击"
        style={{ borderColor: selectionMode ? 'var(--accent)' : undefined }}
        onClick={() => props.onToggleSelectionMode?.()}
      >
        选择模式
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
    </div>
  )
}
