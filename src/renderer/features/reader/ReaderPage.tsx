/**
 * [SR-RDR-04] ReaderPage —— 阅读器页面（工单：done / weak）
 *
 * ── 行为层 ──
 * - 无打开文档：空态引导；打开：openPaper→PdfDocProvider+PageColumn 页列+
 *   SelectionLayer+ReaderToolbar+OutlinePanel 布局（侧栏可折叠）
 * - 接收 library 侧"打开文献"事件（挂载闩锁补读+实时监听；定路由归 openFromBus）
 * - F-01 连续滚动改造：页列几何/懒渲染回收归 PageColumn（本组件只装配）；
 *   pageText→Record<页号,PageText>（渲染窗口内，页卸载同删）；每页自量 canvas 盒
 * - F-03 滚动进度装配：scroll-progress 状态机接线（onScroll/wheel/pointerdown
 *   三口+keydown；页列就绪→恢复链滚回记忆页盒顶）；快捷键=容器滚动步（四键
 *   一屏−一行重叠+空格满屏，SCROLL_STEP_RATIO 单源）；SelectionLayer 挂内容级
 *   稳定包装盒（N4：滚动中锚定页切换不重挂组件→工具条不闪收）
 * - F-04 缩放收官：fit-width 分母=列宽基准（onReady 上报）；缩放锚经 scrollContainerRef 交段⑥
 *
 * ── 接口层 ──
 * - export function ReaderPage(): JSX.Element
 *
 * ── 架构层 ──
 * - 组合根：阅读器各层在此组装；层间经 reader.store 交互
 * - 文本/几何的页内契约：PdfPageCanvas onPageRender 回报（页号,文本项）+该页
 *   canvas CSS 盒量测（data-page-root 域内）→ TextLayer 定位输入
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e：tests/e2e/reader-text.spec.ts 断言渲染文本+多页可见（最终裁判）
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { OPEN_PAPER_EVENT, takePendingOpenPaper, type OpenPaperRequest } from '../../shared/open-paper-bus'
import { openFromBus } from './open-paper-anchor'
import { AnnotationLayer } from './AnnotationLayer'
import { ReaderAiLayer } from './AiAnnotationLayer'
import { OutlineAside } from './OutlineAside'
import { SplitPane } from '../../shared/ui/SplitPane'
import { TabBar } from './TabBar'
import { PdfDocProvider } from './PdfDocProvider'
import { PageColumn, type PageScrollRequest } from './PageColumn'
import type { PdfTextContent } from './PdfPageCanvas'
import { useReaderShortcuts, SCROLL_STEP_RATIO } from './ReaderShortcuts'
import { ReaderToolbar, ZOOM_STEP, round2 } from './ReaderToolbar'
import { SelectionLayer } from './SelectionLayer'
import { TextLayer } from './TextLayer'
import { useReaderStore } from './reader.store'
import { readActiveTab, useActiveTab } from './useActiveTab'
import { createReaderScrollProgress, useScrollProgressWiring } from './scroll-progress'
import { showToast } from '../../shared/ui/Toast'

/** 当前页文本与几何（成对更新：页号 + 文本载荷 + 该页 canvas CSS 盒） */
interface PageText {
  page: number
  text: PdfTextContent
  box: { w: number; h: number }
}

/** 渲染窗口内页的卸载哨（F-01 回收同删 pageTexts+pageRoots 条目——W3） */
function PageFrame(props: { no: number; onRecycle(no: number): void; children: ReactNode }): JSX.Element {
  const { no, onRecycle, children } = props
  useEffect(() => () => onRecycle(no), [no, onRecycle])
  return <>{children}</>
}

export function ReaderPage(): JSX.Element {
  // per-tab 选择器（TABS-01）：取 active tab 对象（引用稳定——无关 tab 更新不重渲染）
  const tab = useActiveTab()
  const paperId = tab?.paperId ?? null
  const fileUrl = tab !== null && tab.status === 'ready' && tab.fileUrl !== '' ? tab.fileUrl : null
  const page = tab?.page ?? 0
  const totalPages = tab?.totalPages ?? 0
  const zoom = tab?.zoom ?? 1
  const color = tab?.color ?? 'yellow'
  const annotations = tab?.annotations ?? []
  const setPage = useReaderStore((s) => s.setPage)
  const setZoom = useReaderStore((s) => s.setZoom)
  const setColor = useReaderStore((s) => s.setColor)
  const setTotalPages = useReaderStore((s) => s.setTotalPages)
  const addAnnotation = useReaderStore((s) => s.addAnnotation)
  const scrollRequest = useReaderStore((s) => s.scrollRequest)
  // 信号过滤：非本文档的迟发信号不滚（回写竞 tab 切换的防御面）
  const columnScroll: PageScrollRequest | null =
    scrollRequest !== null && scrollRequest.paperId === paperId ? scrollRequest : null
  const [pageTexts, setPageTexts] = useState<Record<number, PageText>>({})
  const [pageRoots, setPageRoots] = useState<Record<number, HTMLElement>>({})
  // F-04 列宽基准：页列就绪 onReady 上报的最宽页原始宽（fit-width 分母单源）
  const columnBasis = useRef(0)
  const [outlineOpen, setOutlineOpen] = useState(true)
  // pdfjs 文档句柄（OutlinePanel 数据源）：经 PdfDocProvider onDocReady 上报，换文档即弃
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  // F-03 滚动进度状态机（装配工厂闭包 scrollAreaRef；接线见 useScrollProgressWiring）
  const spProg = useMemo(() => createReaderScrollProgress(scrollAreaRef), [])
  useScrollProgressWiring(spProg, fileUrl, paperId, columnScroll)
  // N4：SelectionLayer 挂载盒=内容级稳定包装盒（滚动不重挂→工具条不闪收）
  const [selectionMount, setSelectionMount] = useState<HTMLDivElement | null>(null)

  // 快捷键装配（F-03 迁移：翻页键=容器滚动步；经 ref/getState 取最新——恒定身份）
  useReaderShortcuts(
    useMemo(() => {
      const scrollByRatio = (ratio: number): void => {
        const el = scrollAreaRef.current
        if (el !== null) el.scrollBy({ top: Math.round(el.clientHeight * ratio) })
      }
      return {
        prevPage: () => scrollByRatio(-SCROLL_STEP_RATIO),
        nextPage: () => scrollByRatio(SCROLL_STEP_RATIO),
        spaceScroll: () => scrollByRatio(1),
        zoomStep: (dir: 1 | -1) => {
          const t = readActiveTab()
          if (t !== undefined) useReaderStore.getState().setZoom(round2(t.zoom + dir * ZOOM_STEP))
        },
        undo: () => void useReaderStore.getState().undo()
      }
    }, [])
  )

  // 打开请求两路：挂载时闩锁补读+实时监听；定路由/失败 toast 归 openFromBus
  useEffect(() => {
    const open = (req: OpenPaperRequest): void => openFromBus(req)
    const pending = takePendingOpenPaper()
    if (pending !== null) open(pending)
    const handler = (e: Event): void => { const d = (e as CustomEvent<OpenPaperRequest>).detail; if (typeof d?.paperId === 'string') open(d) }
    window.addEventListener(OPEN_PAPER_EVENT, handler)
    return () => window.removeEventListener(OPEN_PAPER_EVENT, handler)
  }, [])

  // 换文献：丢弃旧页文本/页根（防陈旧文本层——TextLayer 以页对齐才渲染）
  useEffect(() => {
    setPageTexts({})
    setPageRoots({})
    setPdfDoc(null)
  }, [fileUrl])

  /** PdfPageCanvas 渲染完成回报：每页自量（按页号查该页盒内 canvas CSS 盒） */
  const handlePageRender = (no: number, text: PdfTextContent): void => {
    const pageRoot = document.querySelector<HTMLElement>(`[data-page-root="${no}"]`)
    const canvas = pageRoot?.querySelector('canvas[data-pdf-canvas]') ?? null
    if (canvas === null) return
    const rect = canvas.getBoundingClientRect()
    setPageTexts((prev) => ({ ...prev, [no]: { page: no, text, box: { w: Math.round(rect.width), h: Math.round(rect.height) } } }))
    if (pageRoot !== null) setPageRoots((prev) => (prev[no] === pageRoot ? prev : { ...prev, [no]: pageRoot }))
  }

  /** 渲染窗口内页的回收删条目（W3：pageTexts/pageRoots 同删——防 stale 根残留） */
  const dropPageState = useCallback((no: number): void => {
    const del = <T,>(prev: Record<number, T>): Record<number, T> => {
      if (prev[no] === undefined) return prev
      const next = { ...prev }; delete next[no]; return next
    }
    setPageTexts(del); setPageRoots(del)
  }, [])

  /** 页列就绪（每 doc 一次）：记列宽基准（F-04）+F-03 恢复链 loading→restoring
   *  →scrollToPage（setPage 'to'→INV-29 信号→PageColumn 滚回记忆页盒顶） */
  const handleColumnReady = (basisWidth: number): void => {
    columnBasis.current = basisWidth
    const t = readActiveTab()
    if (t !== undefined) spProg.onColumnReady(t.page)
  }

  /** pdf 加载/渲染失败：toast+tab 置 error（INV-15 可见可关可重试） */
  const handlePdfError = (msg: string): void => {
    showToast(msg, 'error')
    if (paperId !== null) useReaderStore.getState().markTabError(paperId)
  }

  /** 适应宽度（F-04 列宽基准重定义）：分母=最宽页原始宽（onReady 上报单源，
   *  一次性 zoom 语义保持）；24px≈滚动区两侧 p-3 内边距（clientWidth 含需扣） */
  const fitWidth = (): void => {
    if (scrollAreaRef.current === null || columnBasis.current <= 0) return
    setZoom((scrollAreaRef.current.clientWidth - 24) / columnBasis.current)
  }

  if (paperId === null || fileUrl === null) {
    // 空态三形合一（无 tab/loading/error）；TabBar 保留——error tab 必须可见可关可切
    return (
      <div className="flex h-full flex-col">
        <TabBar />
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm"
          style={{ color: tab?.status === 'error' ? 'var(--danger)' : 'var(--text-dim)' }}
        >
          <p>{paperId === null ? '阅读器' : tab?.status === 'error' ? '打开文献失败' : '正在打开文献…'}</p>
          {paperId === null && <p className="text-xs">从文献库打开一篇文献（双击文献行）</p>}
        </div>
      </div>
    )
  }
  /** 段④层实例化：每渲染页一套覆盖层（props 不变；标注层自同步 store 父级无动作）；
   *  SelectionLayer 挂稳定盒（N4） */
  const renderPageLayers = (no: number): JSX.Element => {
    const pt = pageTexts[no]
    const pr = pageRoots[no]
    return (
      <PageFrame no={no} onRecycle={dropPageState}>
        {pt !== undefined ? <TextLayer textContent={pt.text} viewportScale={zoom} pageWidth={pt.box.w} pageHeight={pt.box.h} /> : null}
        {pr !== undefined ? <AnnotationLayer annotations={annotations} page={no - 1} pageRoot={pr} onChanged={() => undefined} /> : null}
        <ReaderAiLayer page={no - 1} pageRoot={pr ?? null} />
      </PageFrame>
    )
  }

  // 主区（开/收两分支共用）：滚动容器内 PdfDocProvider（doc 生命周期）+PageColumn（页列）
  const mainContent = (
    <div
      ref={scrollAreaRef}
      className="min-w-0 flex-1 overflow-auto p-3"
      onScroll={() => spProg.onScrollEvent()}
      // 用户接管三类信号之二（keydown 见 wiring hook 的 document 监听；W-B）
      onWheel={() => spProg.onUserTakeover()}
      onPointerDown={() => spProg.onUserTakeover()}
    >
      <div ref={setSelectionMount} className="relative">
        <PdfDocProvider fileUrl={fileUrl} onDocInfo={(info) => setTotalPages(info.numPages)} onDocReady={setPdfDoc} onError={handlePdfError}>
          {(doc) => (
            <PageColumn doc={doc} totalPages={totalPages} zoom={zoom} scrollContainerRef={scrollAreaRef}
              onPageRender={handlePageRender} onError={handlePdfError}
              renderPage={renderPageLayers} onReady={handleColumnReady} scrollRequest={columnScroll} />
          )}
        </PdfDocProvider>
        {/* page=弃用位（F-02 动态锚定）；挂载盒=稳定包装盒（N4） */}
        <SelectionLayer pageRoot={selectionMount} paperId={paperId} page={0} onSaved={addAnnotation} />
      </div>
      <p className="sr-only">{`共 ${totalPages} 页，当前第 ${page + 1} 页，标注 ${annotations.length} 条`}</p>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <TabBar />
      <ReaderToolbar page={page} totalPages={totalPages} zoom={zoom} color={color}
        onNavigate={setPage} onZoom={setZoom} onColor={setColor} onFitWidth={fitWidth} />
      <div className="flex min-h-0 flex-1">
        {outlineOpen ? (
          // 可拖拽侧栏（SplitPane，宽度持久化）：main 槽传 null——主内容外置为稳定子节点
          <SplitPane paneId="reader-outline" side="left" defaultWidth={224} min={160} max={480}
            children={{
              pane: <OutlineAside pdfDoc={pdfDoc} onCollapse={() => setOutlineOpen(false)} />,
              main: null
            }} />
        ) : (
          <button type="button" className="shrink-0 self-start border-b border-r px-1 py-2 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }} onClick={() => setOutlineOpen(true)}>
            目录
          </button>
        )}
        {mainContent}
      </div>
    </div>
  )
}
