/**
 * [SR-RDR-04] ReaderPage —— 阅读器页面（工单：done / weak）
 *
 * ── 行为层 ──
 * - 无打开文档：空态引导（"从文献库打开一篇文献"）
 * - 打开：reader.store.openPaper(paperId) → PdfCanvas + TextLayer + SelectionLayer +
 *   AnnotationLayer + ReaderToolbar + OutlinePanel 布局（左右侧栏可折叠）
 * - 定时保存阅读进度（翻页后 2s 防抖 api.reader.saveProgress）——已内置于 reader.store.setPage
 * - 接收 library 侧"打开文献"事件（简单事件总线：window.dispatchEvent CustomEvent
 *   'synapse:open-paper'，library.store.openPaper 派发；本页监听并切 tab 由 App 层处理）。
 *   事件派发时本页尚未挂载（App 才切 tab），故挂载时经 takePendingOpenPaper 补读闩锁
 * - SelectionLayer/AnnotationLayer 属 Phase 4 标注链：页根内 .textLayer 之上叠放，
 *   SelectionLayer 划选保存经 onSaved → store.addAnnotation；AnnotationLayer 渲染
 *   store.annotations 中当前页的标注（换页/换文献经 store 状态驱动重锚）
 *
 * ── 接口层 ──
 * - export function ReaderPage(): JSX.Element
 *
 * ── 架构层 ──
 * - 组合根：阅读器各层在此组装；层间经 reader.store 交互
 * - 文本/几何的页内契约：PdfCanvas onPageRender 回报（页码,文本项）+ 本页量测
 *   canvas CSS 盒（data-pdf-canvas）→ TextLayer 定位输入；回报页码与 store 页码
 *   不一致（lastReadPage 越界被 PdfCanvas 夹取）时回写自愈
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e：tests/e2e/reader-text.spec.ts 断言渲染文本（本工单落地即激活——最终裁判）
 */
import { useEffect, useState } from 'react'
import { showToast } from '../../shared/ui/Toast'
import { OPEN_PAPER_EVENT, takePendingOpenPaper } from '../../shared/open-paper-bus'
import { OutlinePanel } from './OutlinePanel'
import { PdfCanvas, type PdfTextContent } from './PdfCanvas'
import { ReaderToolbar } from './ReaderToolbar'
import { SelectionLayer } from './SelectionLayer'
import { TextLayer } from './TextLayer'
import { useReaderStore } from './reader.store'

/** 当前页文本与几何（成对更新：页码 + 文本载荷 + 页面 CSS 盒） */
interface PageText {
  page: number
  text: PdfTextContent
  box: { w: number; h: number }
}

export function ReaderPage(): JSX.Element {
  const paperId = useReaderStore((s) => s.paperId)
  const fileUrl = useReaderStore((s) => s.fileUrl)
  const page = useReaderStore((s) => s.page)
  const totalPages = useReaderStore((s) => s.totalPages)
  const zoom = useReaderStore((s) => s.zoom)
  const color = useReaderStore((s) => s.color)
  const annotations = useReaderStore((s) => s.annotations)
  const openPaper = useReaderStore((s) => s.openPaper)
  const setPage = useReaderStore((s) => s.setPage)
  const setZoom = useReaderStore((s) => s.setZoom)
  const setColor = useReaderStore((s) => s.setColor)
  const setTotalPages = useReaderStore((s) => s.setTotalPages)
  const addAnnotation = useReaderStore((s) => s.addAnnotation)

  const [pageText, setPageText] = useState<PageText | null>(null)
  const [outlineOpen, setOutlineOpen] = useState(true)
  // pdfjs 文档句柄（OutlinePanel 数据源）：经 PdfCanvas onDocReady 上报，换文档即弃
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  // 页根用回调 ref 存 state（而非 useRef）：标注层要拿它作 props，ref.current
  // 赋值不触发重渲染，首帧后标注层会一直拿到 null
  const [pageRoot, setPageRoot] = useState<HTMLDivElement | null>(null)

  // 打开请求两路：挂载时闩锁补读（事件派发时本页未挂载）+ 已挂载期间的实时监听。
  // openPaper 属动作型：失败上抛在此 catch → toast（store 不吞错）
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

  // 换文献：丢弃旧页文本与文档句柄（TextLayer 以 pageText.page 对齐当前页才渲染，避免陈旧文本层）
  useEffect(() => {
    setPageText(null)
    setPdfDoc(null)
  }, [fileUrl])

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
    return (
      <div
        className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center text-sm"
        style={{ color: 'var(--text-dim)' }}
      >
        <p>阅读器</p>
        <p className="text-xs">从文献库打开一篇文献（双击文献行）</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
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
          <aside
            className="flex w-56 shrink-0 flex-col border-r"
            style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
          >
            <div className="flex items-center justify-between border-b px-2 py-1 text-xs"
              style={{ borderColor: 'var(--border)', color: 'var(--text-dim)' }}
            >
              <span>目录 / 缩略图</span>
              <button type="button" className="rounded px-1" onClick={() => setOutlineOpen(false)}>
                收起
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              <OutlinePanel pdfDoc={pdfDoc} currentPage={page} onNavigate={setPage} />
            </div>
          </aside>
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
        <div className="min-w-0 flex-1 overflow-auto p-3">
          {/* 页根：canvas 与覆盖层的共同定位盒（w-fit 收敛到 canvas 尺寸，
              TextLayer absolute inset-0 + 显式宽高精确叠合；标注层/划选条在其上） */}
          <div ref={setPageRoot} className="relative mx-auto w-fit">
            <PdfCanvas
              fileUrl={fileUrl}
              pageNumber={page + 1}
              zoom={zoom}
              onPageRender={handlePageRender}
              onError={(msg) => showToast(msg, 'error')}
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
            {/* Phase 4 标注链落位处：SelectionLayer / AnnotationLayer（见文件头行为层） */}
          </div>
          <p className="sr-only">{`共 ${totalPages} 页，当前第 ${page + 1} 页，标注 ${annotations.length} 条`}</p>
        </div>
      </div>
    </div>
  )
}
