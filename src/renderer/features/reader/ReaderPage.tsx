/**
 * [SR-RDR-04] ReaderPage —— 阅读器页面（工单：done / weak）
 *
 * ── 行为层 ──
 * - 无打开文档：空态引导（"从文献库打开一篇文献"）
 * - 打开：reader.store.openPaper(paperId) → PdfCanvas + TextLayer + SelectionLayer + AnnotationLayer + ReaderToolbar + OutlinePanel 布局（左右侧栏可折叠）
 * - 定时保存阅读进度（翻页后 2s 防抖 api.reader.saveProgress）——已内置于 reader.store.setPage
 * - 接收 library 侧"打开文献"事件（window CustomEvent 'synapse:open-paper'，library.store 派发；
 *   App 层切 tab）。事件派发时本页尚未挂载，故挂载时经 takePendingOpenPaper 补读闩锁
 * - SelectionLayer/AnnotationLayer 属 Phase 4 标注链：页根内 .textLayer 之上叠放，划选保存经
 *   onSaved → store.addAnnotation；AnnotationLayer 渲染 store.annotations 当前页标注（状态驱动重锚）
 *
 * ── 接口层 ──
 * - export function ReaderPage(): JSX.Element
 *
 * ── 架构层 ──
 * - 组合根：阅读器各层在此组装；层间经 reader.store 交互
 * - 文本/几何的页内契约：PdfCanvas onPageRender 回报（页码,文本项）+ 本页量测 canvas CSS
 *   盒（data-pdf-canvas）→ TextLayer 定位输入；回报页码与 store 页码不一致（lastReadPage
 *   越界被 PdfCanvas 夹取）时回写自愈
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e：tests/e2e/reader-text.spec.ts 断言渲染文本（本工单落地即激活——最终裁判）
 */
import { useEffect, useMemo, useState } from 'react'
import { showToast } from '../../shared/ui/Toast'
import { OPEN_PAPER_EVENT, takePendingOpenPaper } from '../../shared/open-paper-bus'
import { AnnotationLayer } from './AnnotationLayer'
import { ReaderAiLayer } from './AiAnnotationLayer'
import { OutlineAside } from './OutlineAside'
import { SplitPane } from '../../shared/ui/SplitPane'
import { TabBar } from './TabBar'
import { PdfCanvas, type PdfTextContent } from './PdfCanvas'
import { useReaderShortcuts } from './ReaderShortcuts'
import { ReaderToolbar, ZOOM_STEP, round2 } from './ReaderToolbar'
import { SelectionLayer } from './SelectionLayer'
import { TextLayer } from './TextLayer'
import { useReaderStore } from './reader.store'
import { readActiveTab, useActiveTab } from './useActiveTab'

/** 当前页文本与几何（成对更新：页码 + 文本载荷 + 页面 CSS 盒） */
interface PageText {
  page: number
  text: PdfTextContent
  box: { w: number; h: number }
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
  const openPaper = useReaderStore((s) => s.openPaper)
  const setPage = useReaderStore((s) => s.setPage)
  const setZoom = useReaderStore((s) => s.setZoom)
  const setColor = useReaderStore((s) => s.setColor)
  const setTotalPages = useReaderStore((s) => s.setTotalPages)
  const addAnnotation = useReaderStore((s) => s.addAnnotation)

  // 快捷键装配：动作经 getState 取最新 store 态——回调恒定身份，避免重挂监听（INV-14 友好）
  useReaderShortcuts(
    useMemo(
      () => ({
        prevPage: () => {
          const t = readActiveTab()
          if (t !== undefined) useReaderStore.getState().setPage(t.page - 1)
        },
        nextPage: () => {
          const t = readActiveTab()
          if (t !== undefined) useReaderStore.getState().setPage(t.page + 1)
        },
        zoomStep: (dir: 1 | -1) => {
          const t = readActiveTab()
          if (t !== undefined) useReaderStore.getState().setZoom(round2(t.zoom + dir * ZOOM_STEP))
        },
        undo: () => void useReaderStore.getState().undo()
      }),
      []
    )
  )
  const [pageText, setPageText] = useState<PageText | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(true)
  // pdfjs 文档句柄（OutlinePanel 数据源）：经 PdfCanvas onDocReady 上报，换文档即弃
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const [pageRoot, setPageRoot] = useState<HTMLDivElement | null>(null)

  // 打开请求两路：挂载时闩锁补读+实时监听；openPaper 失败上抛在此 catch → toast
  useEffect(() => {
    const open = (id: string): void => {
      openPaper(id).catch((e: unknown) => {
        showToast(e instanceof Error ? e.message : '打开文献失败', 'error')
      })
    }
    const pending = takePendingOpenPaper()
    if (pending !== null) open(pending)
    const handler = (e: Event): void => {
      const id = (e as CustomEvent<{ paperId: string }>).detail?.paperId
      if (typeof id === 'string') open(id)
    }
    window.addEventListener(OPEN_PAPER_EVENT, handler)
    return () => window.removeEventListener(OPEN_PAPER_EVENT, handler)
  }, [openPaper])

  // 换文献：丢弃旧页文本与文档句柄（防陈旧文本层——TextLayer 以 page 对齐才渲染）
  useEffect(() => { setPageText(null); setPdfDoc(null) }, [fileUrl])

  /** PdfCanvas 渲染完成回报：带回该页文本载荷，并量测 canvas CSS 盒（覆盖层定位基准） */
  const handlePageRender = (renderedPage: number, text: PdfTextContent): void => {
    const canvas = pageRoot?.querySelector('canvas[data-pdf-canvas]') ?? null
    if (canvas === null) return
    const rect = canvas.getBoundingClientRect()
    setPageText({
      page: renderedPage,
      text,
      box: { w: Math.round(rect.width), h: Math.round(rect.height) }
    })
    // lastReadPage 越界被 PdfCanvas 夹到有效页时回写 store（回写后回报一致，收敛不动）
    if (renderedPage - 1 !== page) setPage(renderedPage - 1)
  }

  /** 适应宽度：滚动容器内宽 ÷ 页面原始宽（原始宽 = 当前盒宽 / 当前缩放）；夹取由 store 兜底 */
  const fitWidth = (): void => {
    const scrollArea = pageRoot?.parentElement ?? null
    if (scrollArea === null || pageText === null) return
    const naturalWidth = pageText.box.w / zoom
    // 24px ≈ 滚动区两侧 p-3 内边距（clientWidth 含 padding，需扣除）
    setZoom((scrollArea.clientWidth - 24) / naturalWidth)
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
  // 主区（开/收两分支共用，避免重复定义）：页根与覆盖层的宿主
  const mainContent = (
    <div className="min-w-0 flex-1 overflow-auto p-3">
      {/* 页根：canvas 与覆盖层共同定位盒（w-fit 收敛 canvas 尺寸；TextLayer
          absolute inset-0+显式宽高精确叠合——覆盖层定位基准，勿改布局方式） */}
      <div ref={setPageRoot} className="relative mx-auto w-fit">
        <PdfCanvas
          fileUrl={fileUrl}
          pageNumber={page + 1}
          zoom={zoom}
          onPageRender={handlePageRender}
          onError={(msg) => {
            showToast(msg, 'error')
            if (paperId !== null) useReaderStore.getState().markTabError(paperId)
          }}
          onDocInfo={(info) => setTotalPages(info.numPages)}
          onDocReady={setPdfDoc}
        />
        {pageText !== null && pageText.page === page + 1 && (
          <TextLayer
            textContent={pageText.text}
            viewportScale={zoom}
            pageWidth={pageText.box.w}
            pageHeight={pageText.box.h}
          />
        )}
        {pageText !== null && pageText.page === page + 1 && (
          <SelectionLayer
            pageRoot={pageRoot}
            paperId={paperId}
            page={page}
            onSaved={addAnnotation}
          />
        )}
        {pageText !== null && pageText.page === page + 1 && (
          <AnnotationLayer
            annotations={annotations}
            page={page}
            pageRoot={pageRoot}
            // 标注增删改已由组件内同步 reader.store（store 规约），父级无额外动作
            onChanged={() => undefined}
          />
        )}
        {/* AI-09：与 AnnotationLayer 并置（store 订阅+点击上抛封装在 ReaderAiLayer） */}
        <ReaderAiLayer page={page} pageRoot={pageText !== null && pageText.page === page + 1 ? pageRoot : null} />
      </div>
      <p className="sr-only">{`共 ${totalPages} 页，当前第 ${page + 1} 页，标注 ${annotations.length} 条`}</p>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <TabBar />
      <ReaderToolbar
        page={page}
        totalPages={totalPages}
        zoom={zoom}
        color={color}
        onNavigate={setPage}
        onZoom={setZoom}
        onColor={setColor}
        onFitWidth={fitWidth}
      />
      <div className="flex min-h-0 flex-1">
        {outlineOpen ? (
          // 可拖拽侧栏（SplitPane）：宽度持久化 localStorage；main 槽传 null——
          // 主内容外置为下方稳定子节点，折叠/展开不重挂 PdfCanvas 等主子树
          <SplitPane
            paneId="reader-outline"
            side="left"
            defaultWidth={224}
            min={160}
            max={480}
            children={{
              pane: (
                <OutlineAside
                  pdfDoc={pdfDoc}
                  onCollapse={() => setOutlineOpen(false)}
                />
              ),
              main: null
            }}
          />
        ) : (
          <button
            type="button"
            className="shrink-0 self-start border-b border-r px-1 py-2 text-xs"
            style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
            onClick={() => setOutlineOpen(true)}
          >
            目录
          </button>
        )}
        {mainContent}
      </div>
    </div>
  )
}
