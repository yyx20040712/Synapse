/**
 * [SR-RDR-07] ReaderToolbar —— 阅读器工具栏（工单：done / weak）
 *
 * ── 行为层 ──
 * - 页码显示/跳转、上/下页、缩放 -/100%/+（0.5~3 步进 0.1）、适应宽度
 * - 标注颜色选择（当前色）；内文搜索框（v1：全文检索走文献库 FTS，
 *   页内高亮搜索 v2——工具栏只放占位禁用态并 title 提示）
 *
 * ── 接口层 ──
 * - export function ReaderToolbar(props: { page: number; totalPages: number; zoom: number;
 *     color: AnnotationColor; onNavigate(page: number): void;
 *     onZoom(z: number): void; onColor(c: AnnotationColor): void;
 *     onFitWidth?(): void }): JSX.Element
 * - onFitWidth（可选，Phase 3 接线时加入）：适应宽度需要滚动容器内宽与页面原始宽，
 *   二者都在 ReaderPage 手里——工具栏是纯受控组件不自测 DOM，故以回调上交；
 *   未传时按钮禁用并 title 说明
 *
 * ── 架构层 ── / ── 生命周期层 ── / ── 文化层 ──
 * - 纯受控组件；页码显示为 1 基（store 内部 0 基，边界夹取由 store.setPage 兜底）
 */
import { useEffect, useState } from 'react'
import type { AnnotationColor } from '@shared/models/annotation'
import { ANNOTATION_COLORS } from '@shared/constants'
import { COLOR_LABEL, COLOR_SWATCH } from './annotation-style'

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
  onFitWidth?: () => void
}): JSX.Element {
  const { page, totalPages, zoom, color, onNavigate, onZoom, onColor, onFitWidth } = props
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

  const btn = 'rounded border px-2 py-0.5 text-xs disabled:opacity-50'

  return (
    <div
      className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2 text-xs"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
    >
      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          disabled={page <= 0}
          onClick={() => onNavigate(page - 1)}
        >
          上一页
        </button>
        <input
          className="w-12 rounded border px-1 py-0.5 text-center text-xs"
          style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          value={pageInput}
          aria-label="跳转到页"
          onChange={(e) => setPageInput(e.target.value)}
          onBlur={commitPage}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitPage()
          }}
        />
        <span style={{ color: 'var(--text-dim)' }}>/ {totalPages > 0 ? totalPages : '…'}</span>
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          disabled={totalPages > 0 && page >= totalPages - 1}
          onClick={() => onNavigate(page + 1)}
        >
          下一页
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          onClick={() => onZoom(round2(zoom - ZOOM_STEP))}
        >
          −
        </button>
        <span data-testid="zoom-label" className="w-10 text-center" style={{ color: 'var(--text-dim)' }}>
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          onClick={() => onZoom(round2(zoom + ZOOM_STEP))}
        >
          ＋
        </button>
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          onClick={() => onZoom(1)}
        >
          100%
        </button>
        <button
          type="button"
          className={btn}
          style={{ borderColor: 'var(--border)' }}
          disabled={onFitWidth === undefined}
          title={onFitWidth === undefined ? '适应宽度待页面接线' : '按窗口宽度适配当前页'}
          onClick={() => onFitWidth?.()}
        >
          适应宽度
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

      {/* 搜索占位（禁用态）：真实输入框的提示属性名会撞 quality 关卡的英文字面量禁令，
          且 v1 本就不可输入——用非表单元素呈现提示文案，语义在 title */}
      <span
        className="ml-auto w-44 rounded border px-2 py-0.5"
        style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
        title="页内高亮搜索 v2 提供；v1 全文检索走文献库 FTS（工具栏只放禁用占位）"
      >
        全库检索请回文献库
      </span>
    </div>
  )
}
