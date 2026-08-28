// b3: P7-F
/**
 * [SR2-F-01] PageColumn —— 页列几何与懒渲染回收（工单：open / strong）
 *
 * ── 行为层 ──（实现段预拆五段,每段独立可测可审）
 * - 段①页列就绪管线：doc 就绪→逐页 getPage→view 尺寸数组（缓存单源）→占位盒全列（总高确定）→onReady→F-03 恢复 scrollTo；越界夹取锚本段（scrollToPage 前 clamp——openPaper 时 totalPages≡0 不可行）。
 * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中）；未渲染盒空白。
 * - 段③懒渲染窗口：视口±1 页真渲染（canvas+覆盖层经 renderPage）；离屏>2 页销毁；IntersectionObserver 占位盒驱动（INV-30：canvas 生命周期=渲染窗口绑定）。
 * - 段④层实例化分工：覆盖层（TextLayer/AnnotationLayer/AiAnnotationLayer）经 renderPage(no) 每渲染页一套（props 不变父层循环）；SelectionLayer 单实例挂锚定页盒（锚定根动态归 F-02；挂载位=可见首报告）。
 * - 段⑤双源机制：scrollRequest（reader.store setPage 默认 'to' 时 bump）变化→scrollToPage(no)（盒顶）；'none'（滚动回写）不 bump 不滚（INV-29）。
 * - 布局态状态机：loading（尺寸未齐）→ready；每页 empty→rendering→rendered→recycling→empty；跨格：快速滚动（rendering 中滚出窗口→cancel→recycling）；zoom 变化（缓存×新 zoom 重算→窗口重评估，就绪后无 loading）。
 * - 内存断言：canvas 实例数≤渲染窗口+缓冲常量；快速滚动零泄漏。
 *
 * ── 接口层 ──
 * - props={doc,totalPages,zoom,renderWindow=1,recycleWindow=2,renderPage(no),onPageRender,onError,onReady,scrollRequest,onVisibleChange}；页盒布局+IO+回收调度+scrollToPage+页尺寸缓存单源。拆分/重构/受锁全清单=scripts/audits/p7f-ticketing-draft.md SR2-F-01 节（票面完整任务书）。
 *
 * ── 架构层 ──
 * - 分层不动；零新依赖；INV-01 零触碰；INV-16 白名单迁移（eslint.config.js 受锁+[locked-change]+invariants 文本同步）；INV-29/30 双源区分+canvas 渲染窗口绑定两不变量随单登记。
 *
 * ── 生命周期层 ──
 * - 不做：页内偏移进度/虚拟滚动（全长真实占位）/旋转页/跨页选区。
 *
 * ── 文化层 ──
 * - 测试（裸 describe，page-column.test.tsx）：布局纯函数+渲染回收调度（桩 IO）+程序滚动；e2e 批 1=reader-text.spec 多页可见+INV-01 保持。完成后：npm run verify 绿 → 人工审查 git diff → 翻 registry
 */
import { useEffect, useRef, useState } from 'react'
import type { PDFDocumentProxy } from './PdfDocProvider'
import { PdfPageCanvas } from './PdfPageCanvas'
import type { PdfTextContent } from './PdfPageCanvas'

/** 页原始尺寸（pdf 用户空间，scale=1 基准——zoom 乘法在盒几何层） */
export interface PageBoxSize {
  width: number
  height: number
}

/** 段①越界夹取：1 基页码夹 [1, totalPages]（scrollToPage 前哨，W-A） */
export function clampPageToColumn(pageNo: number, totalPages: number): number {
  return Math.min(Math.max(1, Math.floor(pageNo)), Math.max(1, totalPages))
}

/** 段②列宽：最宽页×zoom（floor——与 canvas CSS 尺寸同口径） */
export function columnWidth(sizes: readonly PageBoxSize[], zoom: number): number {
  return Math.floor(sizes.reduce((m, s) => Math.max(m, s.width), 0) * zoom)
}

/** 段②盒高：页原始高×zoom（floor） */
export function pageBoxHeight(size: PageBoxSize, zoom: number): number {
  return Math.floor(size.height * zoom)
}

/** 段③渲染窗口：可见页±renderWindow（夹 [1,totalPages]）；空可见=顶部引导窗口（首屏） */
export function windowPages(visible: ReadonlySet<number>, totalPages: number, renderWindow: number): number[] {
  const want = new Set<number>()
  for (const v of visible) {
    for (let d = -renderWindow; d <= renderWindow; d += 1) {
      const no = v + d
      if (no >= 1 && no <= totalPages) want.add(no)
    }
  }
  if (want.size === 0 && totalPages > 0) {
    for (let no = 1; no <= Math.min(renderWindow + 1, totalPages); no += 1) want.add(no)
  }
  return [...want].sort((a, b) => a - b)
}

/** 段③回收调度：已渲染页距任一可见页≤recycleWindow 才保留（离屏必回收——
 *  INV-30 canvas 生命周期=渲染窗口绑定） */
export function recycledPages(rendered: ReadonlySet<number>, visible: ReadonlySet<number>, recycleWindow: number): Set<number> {
  const keep = new Set<number>()
  for (const p of rendered) {
    for (const v of visible) {
      if (Math.abs(p - v) <= recycleWindow) {
        keep.add(p)
        break
      }
    }
  }
  return keep
}

/** 视口中心最近页（1 基；F-03 滚动→页回写的几何前置——本单纯函数交付） */
export function nearestPage(centerY: number, boxes: ReadonlyArray<{ top: number; height: number }>): number {
  let best = 1
  let bestDist = Infinity
  boxes.forEach((b, i) => {
    const inside = centerY >= b.top && centerY <= b.top + b.height
    const d = inside ? -1 : Math.abs(centerY - (b.top + b.height / 2))
    if (d < bestDist) {
      bestDist = d
      best = i + 1
    }
  })
  return best
}

/** 程序滚动请求（reader.store scrollRequest 的形状——INV-29 单口消费面） */
export interface PageScrollRequest {
  paperId: string
  page: number
  seq: number
}

export function PageColumn(props: {
  doc: PDFDocumentProxy | null
  totalPages: number
  zoom: number
  renderWindow?: number
  recycleWindow?: number
  /** 段④：渲染窗口内每页的覆盖层装配（TextLayer/标注层/AI 层+SelectionLayer 挂载位） */
  renderPage(no: number): JSX.Element
  onPageRender(no: number, payload: PdfTextContent): void
  onError(msg: string): void
  /** 段①：页列就绪（F-03 恢复链入口）；段⑤：程序滚动信号（'none' 不 bump）；
   *  可见页上抛（SelectionLayer 锚定页挂载位消费——升序） */
  onReady?(): void
  scrollRequest?: PageScrollRequest | null
  onVisibleChange?(visiblePages: number[]): void
}): JSX.Element {
  const { doc, totalPages, zoom } = props
  const renderWindow = props.renderWindow ?? 1
  const recycleWindow = props.recycleWindow ?? 2
  const rootRef = useRef<HTMLDivElement | null>(null)
  // 回调 latest-ref：父层内联函数不触发管线重跑
  const onReadyRef = useRef(props.onReady)
  const onVisibleRef = useRef(props.onVisibleChange)
  const onErrorRef = useRef(props.onError)
  onReadyRef.current = props.onReady
  onVisibleRef.current = props.onVisibleChange
  onErrorRef.current = props.onError
  const [pageSizes, setPageSizes] = useState<PageBoxSize[] | null>(null)
  const [visible, setVisible] = useState<Set<number>>(() => new Set())
  const [rendered, setRendered] = useState<Set<number>>(() => new Set())
  // 段①error 终态（W2 门一回炉）：管线失败→onError 上抛（INV-02）+不再 loading
  const [sizesError, setSizesError] = useState(false)

  // 段①就绪管线：doc/totalPages 变化→逐页 getPage→view 尺寸数组（缓存单源）→占位全列
  // →onReady；zoom 不入依赖（就绪后无 loading——缓存乘法非重取）
  useEffect(() => {
    if (doc === null || totalPages <= 0) { setPageSizes(null); setSizesError(false); return }
    let cancelled = false
    const load = async (): Promise<void> => {
      const sizes: PageBoxSize[] = []
      for (let no = 1; no <= totalPages; no += 1) {
        const page = await doc.getPage(no)
        if (cancelled) return
        const view = page.view
        // view=[x0,y0,x1,y1]（pdfjs 契约）；?? 0 兜底非法数组的防御位
        sizes.push({ width: (view[2] ?? 0) - (view[0] ?? 0), height: (view[3] ?? 0) - (view[1] ?? 0) })
      }
      if (!cancelled) {
        setPageSizes(sizes)
        onReadyRef.current?.()
      }
    }
    // W2：失败不静默（防 unhandled rejection+永久 loading）；tab 级 toast/error 归消费方
    load().catch((err: unknown) => {
      if (cancelled) return
      setSizesError(true); onErrorRef.current(`页列尺寸获取失败：${err instanceof Error ? err.message : String(err)}`)
    })
    return () => {
      cancelled = true
    }
  }, [doc, totalPages])

  // 段③IO：占位盒驱动可见集（就绪后挂载；引用稳定防抖动）
  useEffect(() => {
    if (pageSizes === null) return
    const io = new IntersectionObserver((entries) => {
      setVisible((prev) => {
        const next = new Set(prev)
        for (const e of entries) {
          const no = Number((e.target as HTMLElement).dataset.pageBox)
          if (Number.isNaN(no)) continue
          if (e.isIntersecting) next.add(no)
          else next.delete(no)
        }
        const same = next.size === prev.size && [...next].every((n) => prev.has(n))
        return same ? prev : next
      })
    })
    for (const el of rootRef.current?.querySelectorAll<HTMLElement>('[data-page-box]') ?? []) {
      io.observe(el)
    }
    return () => io.disconnect()
  }, [pageSizes])

  // 可见集上抛（升序；SelectionLayer 锚定页挂载位等消费）
  useEffect(() => {
    onVisibleRef.current?.([...visible].sort((a, b) => a - b))
  }, [visible])

  // 段③调度：渲染窗口并入+离屏回收（空可见=顶部引导窗口，不跑回收）
  useEffect(() => {
    setRendered((prev) => {
      const want = windowPages(visible, totalPages, renderWindow)
      if (visible.size === 0) return new Set(want)
      return recycledPages(new Set([...prev, ...want]), visible, recycleWindow)
    })
  }, [visible, totalPages, renderWindow, recycleWindow])

  // 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶；未就绪挂起、就绪补滚
  useEffect(() => {
    if (pageSizes === null || props.scrollRequest === null || props.scrollRequest === undefined) return
    const no = clampPageToColumn(props.scrollRequest.page + 1, totalPages)
    rootRef.current?.querySelector<HTMLElement>(`[data-page-box="${no}"]`)?.scrollIntoView({ block: 'start' })
  }, [props.scrollRequest, pageSizes, totalPages])

  if (sizesError) {
    return <div data-page-column="error" className="mx-auto w-full" aria-label="页列加载失败" />
  }
  if (pageSizes === null || pageSizes.length !== totalPages) {
    return <div data-page-column="loading" className="mx-auto w-full" aria-label="页列加载中" />
  }
  const width = columnWidth(pageSizes, zoom)
  return (
    <div
      ref={rootRef}
      data-page-column="ready"
      className="mx-auto flex flex-col items-center gap-3"
      style={{ width }}
    >
      {pageSizes.map((size, i) => {
        const no = i + 1
        return (
          <div
            key={no}
            data-page-box={no}
            className="relative shrink-0"
            style={{ width, height: pageBoxHeight(size, zoom) }}
          >
            {rendered.has(no) ? (
              <div data-page-root={no} className="absolute inset-0 flex justify-center">
                <div className="relative h-fit">
                  <PdfPageCanvas doc={doc!} pageNo={no} zoom={zoom} onPageRender={props.onPageRender} onError={props.onError} />
                  {props.renderPage(no)}
                </div>
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
