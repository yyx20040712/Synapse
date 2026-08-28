/**
 * [SR-RDR-04] ReaderPage —— 阅读器页面（工单：done / weak）
 *
 * ── 行为层 ──
 * - 无打开文档：空态引导（"从文献库打开一篇文献"）；打开：reader.store.openPaper
 *   → PdfDocProvider+PageColumn 页列+SelectionLayer+ReaderToolbar+OutlinePanel 布局（侧栏可折叠）
 * - 定时保存阅读进度（翻页后 2s 防抖 api.reader.saveProgress）——已内置于 reader.store.setPage
 * - 接收 library 侧"打开文献"事件（'synapse:open-paper'；挂载时经 takePendingOpenPaper
 *   补读闩锁）；LG-04 锚递达：消费定路由归 openFromBus（带锚→locateAnchor INV-20 单入口）
 * - F-01 连续滚动改造：页列几何/懒渲染回收归 PageColumn（本组件只装配）；
 *   pageText 单份→Record<页号,PageText>（渲染窗口内，页卸载同删——PageFrame
 *   回收回调）；每页自量（onPageRender 按 data-page-root 查该页盒量 canvas——
 *   旧「第一个 canvas」单页假设量测已删）；旧越界自愈删除（夹取移 PageColumn
 *   就绪管线）；SelectionLayer 单实例挂锚定页盒（锚定根动态归 F-02——本单
 *   挂载位=可见页首报告）；页列就绪→setPage(当前页)（'to'）→程序滚回该页
 *   盒顶（恢复链 F-01 版）
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
import { showToast } from '../../shared/ui/Toast'
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
import { useReaderShortcuts } from './ReaderShortcuts'
import { ReaderToolbar, ZOOM_STEP, round2 } from './ReaderToolbar'
import { SelectionLayer } from './SelectionLayer'
import { TextLayer } from './TextLayer'
import { useReaderStore } from './reader.store'
import { readActiveTab, useActiveTab } from './useActiveTab'

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
  // 可见页集合（PageColumn 上抛；锚定页=首报告——SelectionLayer 挂载位）
  const [anchorPages, setAnchorPages] = useState<number[]>([])
  const anchorPage = anchorPages[0] ?? null
  const [outlineOpen, setOutlineOpen] = useState(true)
  // pdfjs 文档句柄（OutlinePanel 数据源）：经 PdfDocProvider onDocReady 上报，换文档即弃
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)

  // 快捷键装配：动作经 getState 取最新 store 态——回调恒定身份（INV-14 友好）
  useReaderShortcuts(
    useMemo(() => {
      const jump = (d: number): void => {
        const t = readActiveTab()
        if (t !== undefined) useReaderStore.getState().setPage(t.page + d)
      }
      return {
        prevPage: () => jump(-1),
        nextPage: () => jump(1),
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
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<OpenPaperRequest>).detail
      if (typeof detail?.paperId === 'string') open(detail)
    }
    window.addEventListener(OPEN_PAPER_EVENT, handler)
    return () => window.removeEventListener(OPEN_PAPER_EVENT, handler)
  }, [])

  // 换文献：丢弃旧页文本/页根/可见集（防陈旧文本层——TextLayer 以页对齐才渲染）
  useEffect(() => {
    setPageTexts({})
    setPageRoots({})
    setAnchorPages([])
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

  /** 渲染窗口内页的回收删条目（W3：pageTexts 与 pageRoots 同删——防 detached
   *  DOM 残留与 stale 根被覆盖层消费；稳定身份防重挂） */
  const dropPageState = useCallback((no: number): void => {
    const del = <T,>(prev: Record<number, T>): Record<number, T> => {
      if (prev[no] === undefined) return prev
      const next = { ...prev }; delete next[no]; return next
    }
    setPageTexts(del); setPageRoots(del)
  }, [])

  /** 页列就绪（每 doc 一次）：恢复链 F-01 版——setPage(当前页)（'to' 默认）bump
   *  滚动信号→PageColumn 程序滚回该页盒顶（重开文献回到记忆页） */
  const handleColumnReady = (): void => {
    const t = readActiveTab()
    if (t !== undefined) useReaderStore.getState().setPage(t.page)
  }

  /** pdf 加载/渲染失败：toast+tab 置 error（INV-15 可见可关可重试） */
  const handlePdfError = (msg: string): void => {
    showToast(msg, 'error')
    if (paperId !== null) useReaderStore.getState().markTabError(paperId)
  }

  /** 适应宽度：滚动容器内宽 ÷ 页面原始宽（锚定页盒；列宽基准重定义归 F-04） */
  const fitWidth = (): void => {
    const measured = pageTexts[anchorPage ?? 1]
    if (scrollAreaRef.current === null || measured === undefined) return
    // 24px ≈ 滚动区两侧 p-3 内边距（clientWidth 含 padding，需扣除）
    setZoom((scrollAreaRef.current.clientWidth - 24) / (measured.box.w / zoom))
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
  /** 段④层实例化：每渲染页一套覆盖层（props 不变）；SelectionLayer 单实例挂
   *  锚定页盒（动态锚定归 F-02；中间态保证锚定页内划选标注正确） */
  const renderPageLayers = (no: number): JSX.Element => {
    const pt = pageTexts[no]
    const pr = pageRoots[no]
    return (
      <PageFrame no={no} onRecycle={dropPageState}>
        {pt !== undefined ? (
          <TextLayer textContent={pt.text} viewportScale={zoom} pageWidth={pt.box.w} pageHeight={pt.box.h} />
        ) : null}
        {pr !== undefined ? (
          // 标注增删改已由组件内同步 reader.store（store 规约），父级无额外动作
          <AnnotationLayer annotations={annotations} page={no - 1} pageRoot={pr} onChanged={() => undefined} />
        ) : null}
        <ReaderAiLayer page={no - 1} pageRoot={pr ?? null} />
        {anchorPage === no && pr !== undefined ? (
          <SelectionLayer pageRoot={pr} paperId={paperId} page={no - 1} onSaved={addAnnotation} />
        ) : null}
      </PageFrame>
    )
  }

  // 主区（开/收两分支共用）：滚动容器内 PdfDocProvider（doc 生命周期）+PageColumn（页列）
  const mainContent = (
    <div ref={scrollAreaRef} className="min-w-0 flex-1 overflow-auto p-3">
      <PdfDocProvider fileUrl={fileUrl} onDocInfo={(info) => setTotalPages(info.numPages)} onDocReady={setPdfDoc} onError={handlePdfError}>
        {(doc) => (
          <PageColumn doc={doc} totalPages={totalPages} zoom={zoom} onPageRender={handlePageRender} onError={handlePdfError}
            renderPage={renderPageLayers} onReady={handleColumnReady} scrollRequest={columnScroll} onVisibleChange={setAnchorPages} />
        )}
      </PdfDocProvider>
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
          // 可拖拽侧栏（SplitPane）：宽度持久化 localStorage；main 槽传 null——
          // 主内容外置为下方稳定子节点，折叠/展开不重挂页列等主子树
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
