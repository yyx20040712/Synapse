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
 * - 段①页列就绪管线：doc 就绪→逐页 getPage→尺寸数组（缓存单源）→占位盒全列（总高确定）→onReady(列宽基准)→F-03 恢复 scrollTo；越界夹取锚本段（scrollToPage 前 clamp——openPaper 时 totalPages≡0 不可行）。[F-A7 增补 2026-09-04] 尺寸口径=viewport 旋转口径（rotate 归一化后 %180===90 交换宽高，/Rotate 元数据适配）。
 * - 段②占位盒布局+ready JSX 职责归 PageColumnView.tsx（容器+行/列页盒装配，[F-SPLIT-01] 自本件拆出 2026-09-05）。
 * - 段③懒渲染窗口职责归 usePageLazyWindow.ts（visible/rendered 状态对+IO 占位盒驱动+回收调度——视口±1 页真渲染、离屏>2 页销毁、INV-30 canvas 生命周期=渲染窗口绑定，[F-SPLIT-01] 自本件拆出 2026-09-05）。
 * - 段⑤程序滚动+段⑥滚动位置镜像职责归 usePageColumnScroll.ts（PageScrollRequest 接口随迁、本件再导出；[F-SPLIT-01] 自本件拆出 2026-09-05）。
 * - 段④层实例化分工：覆盖层（TextLayer/AnnotationLayer/AiAnnotationLayer）经 renderPage(no) 每渲染页一套（props 不变父层循环）；SelectionLayer 单实例挂锚定页盒（锚定根动态归 F-02；挂载位=可见首报告）。
 * - 段⑤双源机制：scrollRequest（reader.store setPage 默认 'to' 时 bump）变化→scrollToPage(no)（盒顶）；'none'（滚动回写）不 bump 不滚（INV-29）。
 * - 段⑥缩放中心锚（F-04）：zoom prop 变化（就绪后）→盒高按缓存×新 zoom 重算→布局效应程序修正滚动容器 scrollTop（anchoredScrollTop 纯函数）；滚动位置镜像=容器 scroll 事件被动监听（程序/用户滚动皆覆盖——镜像效应归 usePageColumnScroll.ts）；修正属程序性 scrollTop 赋值，不经 wheel/keydown/pointerdown 接管链（INV-32 语义不受扰）。
 * - 布局态状态机：loading（尺寸未齐）→ready；每页 empty→rendering→rendered→recycling→empty；跨格：快速滚动（rendering 中滚出窗口→cancel→recycling）；zoom 变化（缓存×新 zoom 重算→窗口重评估，就绪后无 loading）；F-R1 布局切换（就绪后重派生行+重报 basis，无 loading；切布局位置保持走 onReady 恢复链非 zoom 锚）。
 * - 内存断言：canvas 实例数≤渲染窗口+缓冲常量；快速滚动零泄漏。
 * ── 接口层 ──
 * - props={doc,totalPages,zoom,layout?,renderWindow=1,recycleWindow=2,scrollContainerRef?,renderPage(no),onPageRender,onError,onReady(列宽基准),scrollRequest,onVisibleChange}；页盒布局+IO+回收调度+scrollToPage+缩放锚+页尺寸缓存单源。
 * ── 架构层 ── 分层不动；零新依赖；INV-01/29/30/33 语义全保持。
 * ── 生命周期层/文化层 ── 不做：页内偏移进度/虚拟滚动/手动旋转阅读/跨页选区/持续 fit/手势 pinch。测试=page-column+reader-double-page；e2e=reader-text/reader-scroll；真机=f-r1-verify.mjs。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { PDFDocumentProxy } from '../state/PdfDocProvider'
import type { PdfPageGeometry, PdfTextContent } from './PdfPageCanvas'
import { PageColumnView } from '../PageColumnView'
import {
  anchoredScrollTop,
  columnTotalHeightFor,
  columnWidthFor,
  type PageBoxSize,
  type PageLayout
} from './page-column-geometry'
import { usePageLazyWindow } from './usePageLazyWindow'
import { usePageScrollRequest, useScrollTopMirror, type PageScrollRequest } from './usePageColumnScroll'

// nearestPage 再导出维持 scroll-progress 既有 import 路径（单实现双出口）
export { nearestPage } from './page-column-geometry'
export type { PageBoxSize } from './page-column-geometry'
// PageScrollRequest 再导出维持 PagesOverlay/ReaderPage 既有 import 路径（单实现
// 双出口——接口本体随段⑤程序滚动驻 usePageColumnScroll）
export type { PageScrollRequest } from './usePageColumnScroll'

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
  onPageRender(no: number, payload: PdfTextContent, geometry: PdfPageGeometry): void
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
  const onErrorRef = useRef(props.onError)
  onReadyRef.current = props.onReady
  onErrorRef.current = props.onError
  // F-R1 latest-ref：就绪管线 deps [doc,totalPages] 零变，完成时报当前布局口径
  const layoutRef = useRef(layout)
  layoutRef.current = layout
  const [pageSizes, setPageSizes] = useState<PageBoxSize[] | null>(null)
  // 段①error 终态（W2 门一回炉）：管线失败→onError 上抛（INV-02）+不再 loading
  const [sizesError, setSizesError] = useState(false)
  // 段⑥缩放中心锚：滚动位置镜像（容器 scroll 事件被动监听——程序/用户滚动皆覆盖）
  const liveScrollTop = useRef(0)
  const prevZoom = useRef(zoom)
  // F-R1 布局切换重报的对照位（轻 effect 判「layout 确已变化」）
  const prevLayout = useRef(layout)

  // 段③懒渲染窗口（visible/rendered 状态对+IO 占位盒驱动+回收调度——usePageLazyWindow）
  const { rendered } = usePageLazyWindow(rootRef, pageSizes, layout, totalPages, renderWindow, recycleWindow, props.onVisibleChange)
  // 段⑤程序滚动（INV-29 单口）+段⑥滚动位置镜像——usePageColumnScroll
  usePageScrollRequest(props.scrollRequest, pageSizes, totalPages, rootRef)
  useScrollTopMirror(props.scrollContainerRef, liveScrollTop)

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
        // [F-A7] viewport 旋转口径：view=[x0,y0,x1,y1] 契约与 ?? 0 防御位不变；rotate（?? 0 防御 mock 无 rotate 字段）归一化后 %180===90 时交换宽高（与 canvas getViewport 同源；内联数学先例 pdf-item-geometry；userUnit≠1 边界沿 PdfPageGeometry 口径）
        const rot = ((page.rotate ?? 0) % 360 + 360) % 360
        sizes.push(rot % 180 === 90 ? { width: (page.view[3] ?? 0) - (page.view[1] ?? 0), height: (page.view[2] ?? 0) - (page.view[0] ?? 0) } : { width: (page.view[2] ?? 0) - (page.view[0] ?? 0), height: (page.view[3] ?? 0) - (page.view[1] ?? 0) })
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
    <PageColumnView rootRef={rootRef} pageSizes={pageSizes} zoom={zoom} layout={layout} width={width} rendered={rendered}
      doc={doc} renderPage={props.renderPage} onPageRender={props.onPageRender} onError={props.onError} />
  )
}
