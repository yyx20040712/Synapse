/**
 * [SR-RDR-05] SelectionLayer —— 文本选择→定位器（工单：done / weak，依赖 annotation-anchor）
 *
 * ── 行为层 ──
 * - 监听 selectionchange（200ms 防抖）与 mouseup：选区落在当前页文本层内且非空时，
 *   在选区上方弹出标注工具条（5 色点 + 高亮/下划线/备注三种）
 * - 确认后经 annotation-anchor.selectionToAnchor 生成 { start, end, quote/prefix/suffix,
 *   rects }（rects.page 由本层改写为实际 0 基页码）→ api.reader.saveAnnotation →
 *   onSaved(落库返回值) 由 ReaderPage 写入 reader.store.addAnnotation 刷新 AnnotationLayer
 * - 选区跨出本页文本层（跨页/页外拖拽）时 mouseup 评估提示"仅支持单页内标注"；
 *   与本页不相干的选区（侧栏等）静默收起
 *
 * ── 接口层 ──
 * - export function SelectionLayer(props: { pageRoot: HTMLElement | null;
 *     paperId: string; page: number; onSaved(a: Annotation): void }): JSX.Element | null
 *
 * ── 架构层 ──
 * - 锚定根是页根内的 .textLayer 容器（官方文本层），不是页根本身——工具条自身的
 *   按钮文字若混入页内全文会污染偏移语义；annotation-anchor 仍是唯一 DOM 遍历点
 * - 当前色读写 reader.store（与 ReaderToolbar 色板同源）；保存后清空原生选区
 *
 * ── 生命周期层 ──
 * - mouseup 即时评估、selectionchange 防抖兜底（Playwright selectText 等程序化
 *   选选路径不触发 mouseup）；翻页/换文献/卸载时收起并退订
 *
 * ── 文化层 ──
 * - e2e：tests/e2e/reader-text.spec.ts 后半（选中→高亮→重开仍在原位）
 */
import { useEffect, useRef, useState } from 'react'
import type { Annotation, AnnotationInput, AnnotationKind } from '@shared/models/annotation'
import { ANNOTATION_COLORS } from '@shared/constants'
import { api, unwrap, ApiClientError } from '../../api/client'
import { showToast } from '../../shared/ui/Toast'
import { selectionToAnchor, type SelectionAnchor } from './annotation-anchor'
import { pushUndo } from './annotation-undo'
import { COLOR_LABEL, COLOR_SWATCH } from './annotation-style'
import { useReaderStore } from './reader.store'

/** 意外异常（非 ApiClientError）时的兜底中文消息 */
const SAVE_FAILED = '标注保存失败'

/** 跨页/页外选区的 v1 约束提示 */
const CROSS_PAGE_HINT = '仅支持单页内标注'

/** 工具条定位：估算宽度（水平夹取）与选区上方留白 */
const TOOLBAR_WIDTH = 180
const TOOLBAR_ABOVE = 42

/** selectionchange 防抖窗口（毫秒） */
const SELECTION_DEBOUNCE_MS = 200

/** 待确认的划选（锚定结果 + 工具条在页根内的落点） */
interface PendingSelection {
  anchor: SelectionAnchor
  x: number
  y: number
}

export function SelectionLayer(props: {
  pageRoot: HTMLElement | null
  paperId: string
  page: number
  onSaved: (a: Annotation) => void
}): JSX.Element | null {
  const { pageRoot, paperId, page, onSaved } = props
  const [pending, setPending] = useState<PendingSelection | null>(null)
  const [busy, setBusy] = useState(false)
  // per-tab 选择器（TABS-01）：颜色取 active tab（无 tab 时回退默认黄）
  const color = useReaderStore((s) => s.tabs[s.activeId ?? '']?.color ?? 'yellow')
  const setColor = useReaderStore((s) => s.setColor)
  const toolbarRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (pageRoot === null) {
      return
    }
    let timer: number | null = null

    /** 评估当前选区：可锚定→挂起待确认；不可→收起（fromMouseUp 时给跨页提示） */
    const evaluate = (fromMouseUp: boolean): void => {
      const textLayer = pageRoot.querySelector('.textLayer') as HTMLElement | null
      const sel = window.getSelection()
      if (textLayer === null || sel === null || sel.rangeCount === 0 || sel.isCollapsed) {
        setPending(null)
        return
      }
      const anchor = selectionToAnchor(textLayer, sel)
      if (anchor === null) {
        if (fromMouseUp && sel.getRangeAt(0).intersectsNode(textLayer)) {
          showToast(CROSS_PAGE_HINT, 'info')
        }
        setPending(null)
        return
      }
      const box = sel.getRangeAt(0).getBoundingClientRect()
      const rootBox = pageRoot.getBoundingClientRect()
      if (box.width === 0 && box.height === 0) {
        setPending(null)
        return
      }
      const x = Math.min(Math.max(box.x - rootBox.x, 0), Math.max(rootBox.width - TOOLBAR_WIDTH, 0))
      const y = Math.max(box.y - rootBox.y - TOOLBAR_ABOVE, 0)
      setPending({ anchor, x, y })
    }

    const onSelectionChange = (): void => {
      if (timer !== null) {
        window.clearTimeout(timer)
      }
      timer = window.setTimeout(() => evaluate(false), SELECTION_DEBOUNCE_MS)
    }
    const onMouseUp = (e: MouseEvent): void => {
      // 工具条自身的 mouseup 不评估（按钮 mousedown 已阻止选区坍缩，交由 click 处理）
      if (e.target instanceof Node && toolbarRef.current?.contains(e.target) === true) {
        return
      }
      if (timer !== null) {
        window.clearTimeout(timer)
        timer = null
      }
      evaluate(true)
    }
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setPending(null)
      }
    }

    document.addEventListener('selectionchange', onSelectionChange)
    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keydown', onKeyDown)
      if (timer !== null) {
        window.clearTimeout(timer)
      }
      setPending(null)
    }
  }, [pageRoot, page, paperId])

  /** 按当前色 + 指定 kind 落库；成功后清选区并经 onSaved 交由父级刷新 store */
  async function save(kind: AnnotationKind): Promise<void> {
    if (pending === null || busy) {
      return
    }
    const input: AnnotationInput = {
      page,
      kind,
      color,
      quoteText: pending.anchor.quote,
      prefixText: pending.anchor.prefix,
      suffixText: pending.anchor.suffix,
      startOffset: pending.anchor.start,
      endOffset: pending.anchor.end,
      rects: pending.anchor.rects.map((r) => ({ ...r, page })),
      comment: ''
    }
    setBusy(true)
    try {
      const saved = await unwrap(api.reader.saveAnnotation({ paperId, annotation: input }))
      onSaved(saved)
      // 撤销栈：create 逆=delete（UNDO-01 成功路径入栈）
      pushUndo(paperId, { kind: 'create', annotation: saved })
      // 保存落地即清除该面灰点（TABS-03 乐观清除语义）
      useReaderStore.getState().clearTabDirty(paperId)
      setPending(null)
      window.getSelection()?.removeAllRanges()
    } catch (e) {
      // 保存失败：tab 灰点置位（失败残留可见——TABS-03 两写面之一）
      useReaderStore.getState().markTabDirty(paperId)
      showToast(e instanceof ApiClientError ? e.message : SAVE_FAILED, 'error')
    } finally {
      setBusy(false)
    }
  }

  if (pending === null) {
    return null
  }
  const btn = 'rounded border px-2 py-0.5 disabled:opacity-50'

  return (
    <div
      ref={toolbarRef}
      data-testid="selection-toolbar"
      className="absolute z-10 flex items-center gap-1 rounded border px-1.5 py-1 text-xs"
      style={{
        left: pending.x,
        top: pending.y,
        background: 'var(--panel)',
        borderColor: 'var(--border)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
      }}
      // 阻止 mousedown 抢焦点/坍缩选区：按钮 click 才是动作语义
      onMouseDown={(e) => e.preventDefault()}
    >
      {ANNOTATION_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={`标注色：${COLOR_LABEL[c]}`}
          aria-pressed={color === c}
          className="h-4 w-4 rounded-full border"
          style={{
            background: COLOR_SWATCH[c],
            borderColor: color === c ? 'var(--text)' : 'var(--border)'
          }}
          onClick={() => setColor(c)}
        />
      ))}
      <span className="mx-0.5 inline-block h-3 w-px" style={{ background: 'var(--border)' }} />
      <button
        type="button"
        className={btn}
        style={{ borderColor: 'var(--border)' }}
        disabled={busy}
        onClick={() => void save('highlight')}
      >
        高亮
      </button>
      <button
        type="button"
        className={btn}
        style={{ borderColor: 'var(--border)' }}
        disabled={busy}
        onClick={() => void save('underline')}
      >
        下划线
      </button>
      <button
        type="button"
        className={btn}
        style={{ borderColor: 'var(--border)' }}
        disabled={busy}
        onClick={() => void save('note')}
      >
        备注
      </button>
    </div>
  )
}
