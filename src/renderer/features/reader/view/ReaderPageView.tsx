/**
 * [F-SPLIT-01] ReaderPageView —— 阅读器页面装配渲染件（自 ReaderPage 拆出
 * 2026-09-05；迁移 ReaderPage 装配 JSX 分组——空态引导/主区滚动容器/工具栏+
 * 目录布局，JSX 语句零改纯搬运）。
 *
 * ── 行为层（原 ReaderPage JSX 面）──
 * - 无打开文档：空态引导（空态三形合一：无 tab/loading/error——TabBar 保留，
 *   error tab 必须可见可关可切）；打开：PdfDocProvider+PagesOverlay 页列+
 *   SelectionLayer+ReaderToolbar+OutlinePanel 布局（侧栏可折叠）
 * - F-03 三口接线（onScroll/wheel/pointerdown——用户接管两类信号）零改：
 *   onScroll=spProg.onScrollEvent、onWheel/onPointerDown=spProg.onUserTakeover
 * - F-05（缺陷 A）根两分支 overflow-hidden 防外层滚动泄漏（INV-34）
 * - N4：SelectionLayer 挂内容级稳定包装盒（滚动中锚定页切换不重挂组件→
 *   工具条不闪收）；F-SL：onSaved 闭包捕获渲染帧 paperId（与 props.paperId
 *   同源同帧），store 按其寻址——保存 await 窗内切 tab 不生幽灵标注
 * - 可拖拽双侧栏（[B1 批] 左=目录/缩略图，右=研究面板 AI 对话/笔记；均
 *   SplitPane 宽度持久化）：main 槽传 null——主内容外置为稳定子节点；
 *   开合收口 ReaderToolbar 两端开关（左=ReaderPage 组件态，右=store 会话态）
 * - 状态归属不变：各 state/handler 由宿主 ReaderPage 持有（sr2-lg-08 挂载
 *   效应/F-03 滚动进度 wiring 均留宿主），本件经 props 收值+set 函数回写
 *
 * ── 接口层 ──
 * - export function ReaderPageView(props: { paperId: string | null;
 *   tabStatus: string | undefined; page; totalPages; zoom; color;
 *   selectionMode; pageLayout; annotations; columnScroll; searchBox; pdfDoc;
 *   outlineOpen; onToggleOutline; scrollAreaRef; spProg; selectionMount;
 *   setSelectionMount; fileUrl: string | null; setTotalPages; setPdfDoc;
 *   handleColumnReady; handlePdfError; fitWidth; setPage; setZoom; setColor;
 *   addAnnotation }): JSX.Element
 * - [B1 批] setOutlineOpen→onToggleOutline（toggle 语义收口 toolbar 开关）；
 *   researchOpen/setResearchOpen 自 store 内取（右栏开合=会话态）
 */
import { useEffect } from 'react'
import type { MutableRefObject, ReactNode } from 'react'
import type { Annotation } from '@shared/models/annotation'
import type { PageScrollRequest } from './PageColumn'
import type { PageLayout } from './page-column-geometry'
import type { createReaderScrollProgress } from './scroll-progress'
import { OutlineAside } from '../panels/OutlineAside'
import { ResearchAside } from '../panels/ResearchAside'
import { SplitPane } from '../../../shared/ui/SplitPane'
import { TabBar } from './TabBar'
import { PdfDocProvider } from '../state/PdfDocProvider'
import { PagesOverlay } from './PagesOverlay'
import { ReaderToolbar } from './ReaderToolbar'
import { SelectionLayer } from '../interact/SelectionLayer'
import { useReaderStore } from '../state/reader.store'

/** store 动作精确类型（setPage/setZoom/setColor/addAnnotation——单源 typeof 派生） */
type ReaderStore = ReturnType<typeof useReaderStore.getState>

export function ReaderPageView(props: {
  paperId: string | null
  /** active tab status 原料（tab 缺席=undefined——空态分支条件同源消费） */
  tabStatus: string | undefined
  page: number
  totalPages: number
  zoom: number
  color: Parameters<ReaderStore['setColor']>[0]
  selectionMode: boolean
  pageLayout: PageLayout
  annotations: Annotation[]
  columnScroll: PageScrollRequest | null
  searchBox: ReactNode
  /** pdfjs 文档句柄（OutlinePanel 数据源） */
  pdfDoc: unknown
  outlineOpen: boolean
  /** [B1 批] 目录侧栏开合 toggle（toolbar 开关唯一入口；宿主 ReaderPage 态） */
  onToggleOutline: () => void
  scrollAreaRef: MutableRefObject<HTMLDivElement | null>
  spProg: ReturnType<typeof createReaderScrollProgress>
  selectionMount: HTMLDivElement | null
  setSelectionMount: (v: HTMLDivElement | null) => void
  fileUrl: string | null
  setTotalPages: ReaderStore['setTotalPages']
  setPdfDoc: (v: unknown) => void
  handleColumnReady: (basisWidth: number) => void
  handlePdfError: (msg: string) => void
  fitWidth: () => void
  setPage: ReaderStore['setPage']
  setZoom: ReaderStore['setZoom']
  setColor: ReaderStore['setColor']
  addAnnotation: ReaderStore['addAnnotation']
}): JSX.Element {
  const { paperId, tabStatus, page, totalPages, zoom, color, selectionMode, pageLayout, annotations, columnScroll, searchBox, pdfDoc, outlineOpen, onToggleOutline, scrollAreaRef, spProg, selectionMount, setSelectionMount, fileUrl, setTotalPages, setPdfDoc, handleColumnReady, handlePdfError, fitWidth, setPage, setZoom, setColor, addAnnotation } = props
  // [B1 批] 右栏研究面板开合（会话态驻 store——切视图不清；toolbar 开关口）
  const researchOpen = useReaderStore((s) => s.researchOpen)
  const setResearchOpen = useReaderStore((s) => s.setResearchOpen)
  const noteHighlight = useReaderStore((s) => s.noteHighlight)

  // [B1 审查回炉 B-1] noteHighlight「开面板+切页签」副作用驻本常挂载层（本件
  // 早于空态分支返回、恒挂载）：ResearchAside 仅 researchOpen=true 时挂载——
  // 副作用若驻组件内，面板收起即无订阅者（点标注无反应）。展开责任点收口
  // 此处=挂载条件的拥有层（单一展开责任点）；页签态写入与高亮派生（纯渲染
  // 消费 noteHighlight.annotationId）归 ResearchAside/ReaderNotesPanel。
  useEffect(() => {
    if (noteHighlight === null) return
    useReaderStore.getState().setResearchOpen(true)
    useReaderStore.getState().setResearchTab('notes')
  }, [noteHighlight])

  if (paperId === null || fileUrl === null) {
    // 空态三形合一（无 tab/loading/error）；TabBar 保留——error tab 必须可见可关可切
    return (
      <div className="flex h-full flex-col overflow-hidden">
        <TabBar />
        <div
          className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-sm"
          style={{ color: tabStatus === 'error' ? 'var(--danger)' : 'var(--text-dim)' }}
        >
          <p>{paperId === null ? '阅读器' : tabStatus === 'error' ? '打开文献失败' : '正在打开文献…'}</p>
          {paperId === null && <p className="text-xs">从文献库打开一篇文献（双击文献行）</p>}
        </div>
      </div>
    )
  }
  // 主区（开/收两分支共用）：滚动容器内 PdfDocProvider（doc 生命周期）+PagesOverlay
  // （页面缓存注册表+覆盖层装配——F-ARCH3 拆分件）；SelectionLayer 挂稳定盒（N4）
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
            <PagesOverlay doc={doc} fileUrl={fileUrl} totalPages={totalPages} zoom={zoom} annotations={annotations}
              scrollContainerRef={scrollAreaRef} scrollRequest={columnScroll} layout={pageLayout}
              onReady={handleColumnReady} onError={handlePdfError} />
          )}
        </PdfDocProvider>
        {/* page=弃用位（F-02 动态锚定）；挂载盒=稳定包装盒（N4）；F-SL：onSaved
            闭包捕获渲染帧 paperId（与 SelectionLayer props.paperId 同源同帧），
            store 按其寻址——保存 await 窗内切 tab 不生幽灵标注 */}
        <SelectionLayer pageRoot={selectionMount} paperId={paperId} page={0} onSaved={(a) => addAnnotation(paperId, a)} />
      </div>
      <p className="sr-only">{`共 ${totalPages} 页，当前第 ${page + 1} 页，标注 ${annotations.length} 条`}</p>
    </div>
  )

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <TabBar />
      <ReaderToolbar page={page} totalPages={totalPages} zoom={zoom} color={color}
        onNavigate={setPage} onZoom={setZoom} onColor={setColor} onFitWidth={fitWidth}
        selectionMode={selectionMode}
        onToggleSelectionMode={() => {
          useReaderStore.getState().setSelectionMode(!selectionMode)
        }}
        pageLayout={pageLayout}
        pageStep={pageLayout === 'double' ? 2 : 1}
        onTogglePageLayout={() => {
          useReaderStore.getState().setPageLayout(pageLayout === 'double' ? 'single' : 'double')
        }}
        outlineOpen={outlineOpen}
        onToggleOutline={onToggleOutline}
        researchOpen={researchOpen}
        onToggleResearch={() => {
          setResearchOpen(!researchOpen)
        }}
        searchBox={searchBox} />
      <div className="flex min-h-0 flex-1">
        {outlineOpen && (
          // 左栏（SplitPane，宽度持久化）：main 槽传 null——主内容外置为稳定子节点；
          // 开合唯一入口=toolbar 目录侧栏钮（[B1 批] 收起钮/浮动 chevron 退役）
          <SplitPane paneId="reader-outline" side="left" defaultWidth={224} min={160} max={480}
            children={{
              pane: <OutlineAside pdfDoc={pdfDoc} />,
              main: null
            }} />
        )}
        {mainContent}
        {researchOpen && (
          // [B1 批] 右栏研究面板（AI 对话+笔记——ResearchAside；paneTestId
          // 独立锚防 e2e strict-mode 与左栏多命中；开合唯一入口=toolbar
          // 研究面板钮）
          <SplitPane paneId="reader-research" side="right" defaultWidth={300} min={220} max={480}
            paneTestId="reader-research-pane"
            children={{
              pane: <ResearchAside />,
              main: null
            }} />
        )}
      </div>
    </div>
  )
}
