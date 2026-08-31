// b3: P7-F
/**
 * [SR2-F-01] PageColumn —— 页列几何与懒渲染回收（工单：done / strong）
 * 历史：F-04 缩放中心锚+纯函数拆出 page-column-geometry.ts（此处再导出
 * nearestPage 维持 scroll-progress import 路径）；F-05 程序滚动单容器收敛
 * （INV-34）；F-06 页盒视觉（迁 PageBox）。增补详述归六段行为层/拆件头注。
 * [F-R1 增补] 双页阅读模式：props.layout（缺省 single=零破）→行渲染分支
 * （layoutRows 行派生，data-page-row 行盒）；页盒 JSX 拆出 PageBox.tsx
 * （单双页共用，≤250 红线预裁——F-ARCH3 零变纪律：不加 useCallback/
 * useMemo）；就绪管线 deps [doc,totalPages] 零变（layoutRef latest 报当前
 * 布局口径 basisWidth）；布局切换走轻 effect 重报 onReady（不重跑
 * getPage）；IO deps 增 layout（列↔行 DOM 重排后重挂）；段⑥锚总高按
 * 布局口径；懒渲染回收/scroll-progress 回写/程序滚动按页号消费零改。── 行为层：
 * - 段①页列就绪管线：doc 就绪→逐页 getPage→view 尺寸数组（缓存单源）→占位盒全列（总高确定）→onReady(列宽基准)→F-03 恢复 scrollTo；越界夹取锚本段（scrollToPage 前 clamp——openPaper 时 totalPages≡0 不可行）。
 * - 段②占位盒布局：高=pageSizes[no]×zoom；宽=列宽（最宽页×zoom 居中；双页=各自页宽，行内左顶对齐）；未渲染盒空白。
 * - 段③懒渲染窗口：视口±1 页真渲染（canvas+覆盖层经 renderPage）；离屏>2 页销毁；IntersectionObserver 占位盒驱动（INV-30：canvas 生命周期=渲染窗口绑定）。
 * - 段④层实例化分工：覆盖层（TextLayer/AnnotationLayer/AiAnnotationLayer）经 renderPage(no) 每渲染页一套（props 不变父层循环）；SelectionLayer 单实例挂锚定页盒（锚定根动态归 F-02；挂载位=可见首报告）。
 * - 段⑤双源机制：scrollRequest（reader.store setPage 默认 'to' 时 bump）变化→scrollToPage(no)（盒顶）；'none'（滚动回写）不 bump 不滚（INV-29）。
 * - 段⑥缩放中心锚（F-04）：zoom prop 变化（就绪后）→盒高按缓存×新 zoom 重算→布局效应程序修正滚动容器 scrollTop（anchoredScrollTop 纯函数）；滚动位置镜像=容器 scroll 事件被动监听（程序/用户滚动皆覆盖）；修正属程序性 scrollTop 赋值，不经 wheel/keydown/pointerdown 接管链（INV-32 语义不受扰）。
 * - 布局态状态机：loading（尺寸未齐）→ready；每页 empty→rendering→rendered→recycling→empty；跨格：快速滚动（rendering 中滚出窗口→cancel→recycling）；zoom 变化（缓存×新 zoom 重算→窗口重评估，就绪后无 loading）；F-R1 布局切换（就绪后重派生行+重报 basis，无 loading；切布局位置保持走 onReady 恢复链非 zoom 锚）。
 * - 内存断言：canvas 实例数≤渲染窗口+缓冲常量；快速滚动零泄漏。
 * ── 接口层 ──
 * - props={doc,totalPages,zoom,layout?,renderWindow=1,recycleWindow=2,scrollContainerRef?,renderPage(no),onPageRender,onError,onReady(列宽基准),scrollRequest,onVisibleChange}；页盒布局+IO+回收调度+scrollToPage+缩放锚+页尺寸缓存单源。
 * ── 架构层 ── 分层不动；零新依赖；INV-01/29/30/33 语义全保持。
 * ── 生命周期层/文化层 ── 不做：页内偏移进度/虚拟滚动/旋转页/跨页选区/持续 fit/手势 pinch。测试=page-column+reader-double-page；e2e=reader-text/reader-scroll；真机=f-r1-verify.mjs。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { PDFDocumentProxy } from './PdfDocProvider'
import type { PdfTextContent } from './PdfPageCanvas'
import { PageBox } from './PageBox'
import {
  anchoredScrollTop,
  clampPageToColumn,
  columnTotalHeightFor,
  columnWidthFor,
  layoutRows,
  pageBoxWidth,
  recycledPages,
  windowPages,
  type PageBoxSize,
  type PageLayout
} from './page-column-geometry'
import { scrollIntoNearestScroller } from './scroll-converge'

// nearestPage 再导出维持 scroll-progress 既有 import 路径（单实现双出口）
export { nearestPage } from './page-column-geometry'
export type { PageBoxSize } from './page-column-geometry'

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
  /** F-R1 页布局（缺省 single=既有调用零破）：double=两页一行 (1,2)(3,4)… */
  layout?: PageLayout
  renderWindow?: number
  recycleWindow?: number
  /** 段⑥：滚动容器 ref（缩放中心锚的 scrollTop 程序修正目标；缺省不修正） */
  scrollContainerRef?: RefObject<HTMLDivElement | null>
  /** 段④：渲染窗口内每页的覆盖层装配（TextLayer/标注层/AI 层+SelectionLayer 挂载位） */
  renderPage(no: number): JSX.Element
  onPageRender(no: number, payload: PdfTextContent): void
  onError(msg: string): void
  /** 段①：页列就绪（载荷=列宽基准：布局口径最宽页/最宽完整行原始宽，fit-width 分母单源）；
   *  可见页上抛（SelectionLayer 锚定页挂载位消费——升序） */
  onReady?(basisWidth: number): void
  scrollRequest?: PageScrollRequest | null
  onVisibleChange?(visiblePages: number[]): void
}): JSX.Element {
  const { doc, totalPages, zoom } = props
  const layout = props.layout ?? 'single'
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
  // F-R1 latest-ref：就绪管线 deps [doc,totalPages] 零变，完成时报当前布局口径
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const [pageSizes, setPageSizes] = useState<PageBoxSize[] | null>(null)
  const [visible, setVisible] = useState<Set<number>>(() => new Set())
  const [rendered, setRendered] = useState<Set<number>>(() => new Set())
  // 段①error 终态（W2 门一回炉）：管线失败→onError 上抛（INV-02）+不再 loading
  const [sizesError, setSizesError] = useState(false)
  // 段⑥缩放中心锚：滚动位置镜像（容器 scroll 事件被动监听——程序/用户滚动皆覆盖）
  const liveScrollTop = useRef(0)
  const prevZoom = useRef(zoom)
  // F-R1 布局切换重报的对照位（轻 effect 判「layout 确已变化」）
  const prevLayout = useRef(layout)

  // 段①就绪管线：doc/totalPages 变化→逐页 getPage→view 尺寸数组（缓存单源）→占位
  // 全列→onReady(列宽基准——当前布局口径)；zoom/layout 不入依赖（缓存乘法非重取）
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
        onReadyRef.current?.(columnWidthFor(sizes, 1, layoutRef.current))
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

  // F-R1 布局切换重报：layout 变化→onReady 新口径 basisWidth（不重跑 getPage）；
  // onReady 链经装配面→spProg.onColumnReady 恢复链滚回当前页（S1 声明期望）
  useEffect(() => {
    if (pageSizes === null) return
    if (prevLayout.current === layout) return
    prevLayout.current = layout
    onReadyRef.current?.(columnWidthFor(pageSizes, 1, layout))
  }, [layout, pageSizes])

  // 段③IO：占位盒驱动可见集（就绪后挂载；F-R1 deps 增 layout——列↔行 DOM 重排后重挂）
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
  }, [pageSizes, layout])

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

  // 段⑤程序滚动（INV-29 单口）：夹取→页盒顶对齐视口顶（F-05 单容器收敛 INV-34）；
  // 未就绪挂起、就绪补滚（双页左右页盒顶同行——滚行顶零特判）
  useEffect(() => {
    if (pageSizes === null || props.scrollRequest === null || props.scrollRequest === undefined) return
    const no = clampPageToColumn(props.scrollRequest.page + 1, totalPages)
    const box = rootRef.current?.querySelector<HTMLElement>(`[data-page-box="${no}"]`) ?? null
    if (box !== null) scrollIntoNearestScroller(box, 'start')
  }, [props.scrollRequest, pageSizes, totalPages])

  // 段⑥滚动位置镜像：容器 scroll 事件被动监听（挂载即读初值——恢复链程序滚动亦派发事件）
  useEffect(() => {
    const el = props.scrollContainerRef?.current ?? null
    if (el === null) return
    const mirror = (): void => {
      liveScrollTop.current = el.scrollTop
    }
    mirror()
    el.addEventListener('scroll', mirror, { passive: true })
    return () => el.removeEventListener('scroll', mirror)
  }, [props.scrollContainerRef])

  // 段⑥缩放中心锚（INV-33）：总高按布局口径 columnTotalHeightFor（双页=行
  // 高和）；layout 不入 deps——切布局位置保持走 onReady 恢复链（非 zoom 锚）
  useLayoutEffect(() => {
    const el = props.scrollContainerRef?.current ?? null
    if (pageSizes === null || el === null) {
      prevZoom.current = zoom
      return
    }
    if (prevZoom.current === zoom) return
    const from = prevZoom.current
    prevZoom.current = zoom
    el.scrollTop = anchoredScrollTop(
      liveScrollTop.current,
      el.clientHeight,
      columnTotalHeightFor(pageSizes, from, layout),
      columnTotalHeightFor(pageSizes, zoom, layout)
    )
  }, [zoom, pageSizes, props.scrollContainerRef])

  if (sizesError) return <div data-page-column="error" className="mx-auto w-full" aria-label="页列加载失败" />
  if (pageSizes === null || pageSizes.length !== totalPages) {
    return <div data-page-column="loading" className="mx-auto w-full" aria-label="页列加载中" />
  }
  const width = columnWidthFor(pageSizes, zoom, layout)
  return (
    <div
      ref={rootRef}
      data-page-column="ready"
      className="mx-auto flex flex-col items-center gap-3"
      style={{ width }}
    >
      {layout === 'double'
        ? layoutRows(pageSizes).map((row) => (
          // F-R1 双页行：两页盒并排 flex 左顶对齐；行内 gap-3 与 PAGE_GAP_PX 同源
          // （rowWidth 口径）；末行单页右缺席不渲染空盒——列宽已排除孤页行，
          // 行宽恒=左盒宽无跳变（S3 自裁，视觉验收归真机探针场景 E）
          <div key={row.leftNo} data-page-row={row.leftNo} className="flex shrink-0 items-start gap-3">
            <PageBox no={row.leftNo} size={row.left} zoom={zoom} boxWidth={pageBoxWidth(row.left, zoom)} rendered={rendered.has(row.leftNo)}
              doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
            {row.right !== undefined && row.rightNo !== undefined ? (
              <PageBox no={row.rightNo} size={row.right} zoom={zoom} boxWidth={pageBoxWidth(row.right, zoom)} rendered={rendered.has(row.rightNo)}
                doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
            ) : null}
          </div>
        ))
        : pageSizes.map((size, i) => (
          <PageBox key={i + 1} no={i + 1} size={size} zoom={zoom} boxWidth={width} rendered={rendered.has(i + 1)}
            doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
        ))}
    </div>
  )
}
