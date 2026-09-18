/**
 * [P7E-03] SearchHighlightLayer —— 页内搜索高亮层（渲染窗口内页的匹配矩形）。
 *
 * ── 行为层 ──
 * - props { page, pageRoot }（0 基——与 AnnotationLayer 同型挂法，PagesOverlay
 *   renderPageLayers 内装配）；内部订阅 reader-search.store。
 * - state='done' 且该页有匹配 → 逐匹配逐 itemRange 建 DOM Range → clientRects
 *   → toPageRelative → 绝对定位 div（data-testid="search-hl"；active 匹配
 *   data-active="true"+var(--accent) 描边强调）。pointer-events:none。
 * - 量测时机：span 异步落位（pdf.js render() promise）→ 对 .textLayer 容器挂
 *   MutationObserver+rAF 合并重算（AnnotationLayer 先例同型）；zoom 变更（文本
 *   层重渲 replaceChildren）同径重算。坐标参考=textLayer 盒（=canvas 盒=本层
 *   inset-0 容器盒——三盒同源，px 定位零漂移）。
 * - 防御：spansForItems 数量不符→该页零渲染只计数；Range 偏移夹取（契约漂移
 *   不崩）；零宽/零高 rect 跳过。
 * - active 居中（两段式滚动第二段）：active 匹配节点挂载后 scrollIntoView
 *   ({block:'center'})——[门一 W2] 记账入 reader-search.store（lastCentered：
 *   matches 数组身份+activeIndex 比对），跨层实例+跨重挂生效（实例级 ref 会
 *   随懒渲染窗口换出换入归零复活、劫持用户滚动）；多页多实例共享单条记账
 *   =恰好正确语义（仅 active 页实例滚动）。zoom 后 active 不重居中=接受
 *   （几何重算由 MutationObserver 路径承担，滚动位置归用户）。第一段=装配
 *   面 pageTurner→setPage 页盒顶入视口。
 *
 * ── 接口层 ──
 * - export function SearchHighlightLayer(props: { page: number;
 *   pageRoot: HTMLElement | null }): JSX.Element | null
 *
 * ── 架构层 ──
 * - 层序=PAGE_LAYER_Z.colorBlocks（1——背景板语言：canvas 墨带恒在其上，文字
 *   纯黑不被染；DOM 序在 AnnotationLayer 后=叠于标注块之上，搜索为瞬态视觉
 *   合理）；取色只走 theme.css 变量（annotation-style 纪律同源）。
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - tests/unit/renderer/reader-search-ui.test.tsx（渲染存在性+px 映射）；
 *   真几何归 e2e reader-search.spec.ts（真机 Chromium clientRects）
 */
import { useEffect, useRef, useState } from 'react'
import { spansForItems, toPageRelative } from './reader-search'
import { useReaderSearchStore } from './reader-search.store'
import { PAGE_LAYER_Z } from './state/page-layer-z'

/** 高亮块（页内相对像素+active 标记） */
interface HighlightBox {
  x: number
  y: number
  w: number
  h: number
  active: boolean
}

export function SearchHighlightLayer(props: {
  page: number
  pageRoot: HTMLElement | null
}): JSX.Element | null {
  const { page, pageRoot } = props
  const state = useReaderSearchStore((s) => s.state)
  const matches = useReaderSearchStore((s) => s.matches)
  const activeIndex = useReaderSearchStore((s) => s.activeIndex)
  const items = useReaderSearchStore((s) => s.pageItems[page])
  const [boxes, setBoxes] = useState<HighlightBox[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)

  // 量测：done 态本页匹配 → span 链 DOM Range → clientRects → 页内相对 px
  useEffect(() => {
    const pageHasMatch = state === 'done' && matches.some((m) => m.page === page)
    if (!pageHasMatch || pageRoot === null || items === undefined) {
      setBoxes([])
      return
    }
    const textLayer = pageRoot.querySelector('.textLayer')
    if (textLayer === null) {
      setBoxes([])
      return
    }
    let scheduled = false
    const measure = (): void => {
      scheduled = false
      const spans = spansForItems(pageRoot, items.length)
      if (spans === null) {
        setBoxes([])
        return
      }
      const rootRect = textLayer.getBoundingClientRect()
      const next: HighlightBox[] = []
      for (let gi = 0; gi < matches.length; gi += 1) {
        const match = matches[gi]
        if (match === undefined || match.page !== page) continue
        for (const ir of match.itemRanges) {
          const span = spans[ir.itemIndex] ?? null
          const node = span?.firstChild ?? null
          if (span === null || node === null || node.nodeType !== Node.TEXT_NODE) continue
          const textLen = node.textContent?.length ?? 0
          const range = document.createRange()
          range.setStart(node, Math.max(0, Math.min(ir.s0, textLen)))
          range.setEnd(node, Math.max(0, Math.min(ir.s1, textLen)))
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width <= 0 || rect.height <= 0) continue
            const rel = toPageRelative(rect, rootRect)
            next.push({ ...rel, active: gi === activeIndex })
          }
        }
      }
      setBoxes(next)
    }
    const schedule = (): void => {
      if (!scheduled) {
        scheduled = true
        requestAnimationFrame(measure)
      }
    }
    measure()
    const observer = new MutationObserver(schedule)
    observer.observe(textLayer, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [state, matches, activeIndex, items, page, pageRoot])

  // active 居中：active 匹配在本页且其 hl 块已挂载 → scrollIntoView（一次）。
  // [门一 W2] 记账在 store（lastCentered）——跨层实例/跨重挂生效；滚动前
  // 先登记（setState），后续任何实例的同 matches+activeIndex 到达即早退
  const lastCentered = useReaderSearchStore((s) => s.lastCentered)
  useEffect(() => {
    if (state !== 'done') return
    if (lastCentered !== null && lastCentered.m === matches && lastCentered.i === activeIndex) return
    const active = matches[activeIndex]
    if (active === undefined || active.page !== page) return
    const el = containerRef.current?.querySelector('[data-active="true"]') ?? null
    if (el === null) return
    useReaderSearchStore.setState({ lastCentered: { m: matches, i: activeIndex } })
    el.scrollIntoView({ block: 'center' })
  }, [boxes, state, matches, activeIndex, page, lastCentered])

  if (state !== 'done' || boxes.length === 0) return null

  return (
    <div
      ref={containerRef}
      data-testid="search-highlight-layer"
      className="absolute inset-0"
      style={{ zIndex: PAGE_LAYER_Z.colorBlocks, pointerEvents: 'none' }}
    >
      {boxes.map((b, i) => (
        <div
          key={i}
          data-testid="search-hl"
          data-active={b.active}
          className="absolute"
          style={{
            left: `${b.x}px`,
            top: `${b.y}px`,
            width: `${b.w}px`,
            height: `${b.h}px`,
            backgroundColor: 'var(--accent-soft)',
            ...(b.active ? { outline: '2px solid var(--accent)' } : {})
          }}
        />
      ))}
    </div>
  )
}
