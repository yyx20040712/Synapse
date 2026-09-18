/**
 * [SR-RDR-04] ReaderPage —— 阅读器页面（工单：done / weak）
 *
 * ── 行为层 ──
 * - 无打开文档：空态引导；打开：openPaper→PdfDocProvider+PageColumn 页列+
 *   SelectionLayer+ReaderToolbar+OutlinePanel 布局（侧栏可折叠）——装配 JSX
 *   分组（空态引导/主区滚动容器/工具栏+目录布局）职责归 ReaderPageView.tsx
 *   （[F-SPLIT-01] 自本件拆出 2026-09-05，语句零改；F-03 三口接线
 *   onScroll/wheel/pointerdown 随 JSX 原样迁，keydown 见快捷键件）
 * - 接收 library 侧"打开文献"事件（挂载闩锁补读+实时监听；定路由归 openFromBus）
 * - [sr2-lg-08] 时序竞态修复：挂载效应内监听器注册必须先于闩锁消费——消费链 openFromBus→locateAnchor→waitOpen（tab 缺席）会同步重发 OPEN_PAPER_EVENT（事件②），旧序自丢失→waitOpen 8s 超时停旧 tab=「脉络双击笔记总跳最后打开的文章」根因；先注册则事件②被自身 handler 接住→无锚分支 store.openPaper 正常打开（链声明独立于 F-07；全链取证见 scripts/audits/sr2-lg-08-brief.md）
 * - F-01 连续滚动改造：页列几何/懒渲染回收归 PageColumn；页面缓存注册表
 *   （pageTexts/pageRoots+覆盖层装配）归 PagesOverlay（F-ARCH3 七件下沉，
 *   本组件只装配——声明与实现对齐）
 * - F-03 滚动进度装配：scroll-progress 状态机接线（onScroll/wheel/pointerdown
 *   三口+keydown；页列就绪→恢复链滚回记忆页盒顶）；快捷键=容器滚动步（四键
 *   一屏−一行重叠+空格满屏，SCROLL_STEP_RATIO 单源——装配块归
 *   reader-shortcut-handlers.ts，[F-SPLIT-01] 自本件拆出 2026-09-05，deps []
 *   零变）；SelectionLayer 挂内容级稳定包装盒（N4：滚动中锚定页切换不重挂
 *   组件→工具条不闪收）
 * - F-04 缩放收官：fit-width 分母=列宽基准（onReady 上报）；缩放锚经 scrollContainerRef 交段⑥
 * - F-05（缺陷 A）根两分支 overflow-hidden 防外层滚动泄漏（INV-34）
 * - F-A3 选择模式装配：selectionMode 取 active tab（?? false）；toggle 语义在
 *   本装配面（工具栏纯受控只上抛 onToggleSelectionMode→store.setSelectionMode
 *   写 active tab，INV-42）
 * - F-R1 双页装配：pageLayout 取 active tab（?? 'single'）；toggle 语义在本
 *   装配面（工具栏只上抛 onTogglePageLayout→store.setPageLayout 写 active
 *   tab）；翻页步进=双页 2/单页 1（工具栏 pageStep）；fitWidth 零改（分母
 *   columnBasis 已随 onReady 布局口径重报——切布局 basis 重报时序先于用户
 *   点击）；onReady 重触发走 spProg.onColumnReady 恢复链滚回当前页（S1 声明
 *   期望：切布局不丢位置）
 * - P7E-03 页内搜索装配：useReaderSearch（fileUrl 键效应清面板/ctrl+f/
 *   翻页联动注入/受控面板节点）→ ReaderToolbar searchBox slot
 * - P7E-05 阅读时长装配：useReaderReadingTime（时长账本+复合 flusher——
 *   进度页+时长账单通道合并）+useReadingTimeWiring（ready×active 计时门/
 *   visibilitychange/卸载 dispose）；装配块驻 reading-time.ts（组件行数关卡）
 * ── 接口层 ──
 * - export function ReaderPage(): JSX.Element
 * ── 架构层 ──
 * - 组合根：阅读器各层在此组装；层间经 reader.store 交互
 * - 文本/几何的页内契约归 PagesOverlay（F-ARCH3 下沉）：PdfPageCanvas
 *   onPageRender 回报+canvas CSS 盒量测→TextLayer 定位输入
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - e2e：tests/e2e/reader-text.spec.ts 断言渲染文本+多页可见（最终裁判）
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { OPEN_PAPER_EVENT, takePendingOpenPaper, type OpenPaperRequest } from '../../shared/open-paper-bus'
import { openFromBus } from './open-paper-anchor'
import type { PageScrollRequest } from './PageColumn'
import { useReaderSearch } from './useReaderSearch'
import { useReaderStore } from './state/reader.store'
import { readActiveTab, useActiveTab } from './state/useActiveTab'
import { createReaderScrollProgress, useScrollProgressWiring } from './scroll-progress'
import { useReaderReadingTime } from './time/reading-time-setup'
import { useReadingTimeWiring } from './time/reading-time'
import { useReaderShortcutHandlers } from './reader-shortcut-handlers'
import { ReaderPageView } from './ReaderPageView'
import { showToast } from '../../shared/ui/Toast'

export function ReaderPage(): JSX.Element {
  // per-tab 选择器（TABS-01）：取 active tab 对象（引用稳定——无关 tab 更新不重渲染）
  const tab = useActiveTab()
  const paperId = tab?.paperId ?? null
  const fileUrl = tab !== null && tab.status === 'ready' && tab.fileUrl !== '' ? tab.fileUrl : null
  const page = tab?.page ?? 0
  const totalPages = tab?.totalPages ?? 0
  const zoom = tab?.zoom ?? 1
  const color = tab?.color ?? 'yellow'
  const selectionMode = tab?.selectionMode ?? false
  const pageLayout = tab?.pageLayout ?? 'single'
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
  // F-04 列宽基准：页列就绪 onReady 上报的最宽页原始宽（fit-width 分母单源）
  const columnBasis = useRef(0)
  const [outlineOpen, setOutlineOpen] = useState(true)
  // pdfjs 文档句柄（OutlinePanel 数据源）：经 PdfDocProvider onDocReady 上报，换文档即弃
  const [pdfDoc, setPdfDoc] = useState<unknown>(null)
  const scrollAreaRef = useRef<HTMLDivElement | null>(null)
  // F-03 滚动进度状态机（装配工厂闭包 scrollAreaRef；接线见 useScrollProgressWiring）
  const spProg = useMemo(() => createReaderScrollProgress(scrollAreaRef), [])
  // P7E-05 时长账本+复合 flusher（装配块驻 reading-time.ts——组件行数关卡配套；
  // 计时门接线 R3/R4/R7/R10+进度时长单通道合并 Design 裁决）；P7X-02 R7 并入：
  // spView=dispose 尾账页码改道 outbox 的包装视图（其余面直通）——wiring 消费
  // 包装视图，页码旁路消除（单队列 seq 序）
  const { rt: rtTime, flusher: compositeFlusher, spView } = useReaderReadingTime(spProg)
  useScrollProgressWiring(spView, fileUrl, paperId, columnScroll, compositeFlusher)
  useReadingTimeWiring(rtTime, paperId, fileUrl !== null)
  // N4：SelectionLayer 挂载盒=内容级稳定包装盒（滚动不重挂→工具条不闪收）
  const [selectionMount, setSelectionMount] = useState<HTMLDivElement | null>(null)

  // 快捷键装配（F-03 迁移：翻页键=容器滚动步——reader-shortcut-handlers）
  useReaderShortcutHandlers(scrollAreaRef)

  // P7E-03 页内搜索装配：fileUrl 键效应清面板+ctrl+f keymap+翻页联动注入+
  // 受控面板节点（ReaderToolbar slot 消费；空态视图不渲染 toolbar=面板随
  // store 态自隐，fileUrl 变化时经 reset 收口）
  const searchBox = useReaderSearch(pdfDoc, fileUrl ?? '')

  // 打开请求两路（sr2-lg-08：注册必须先于闩锁消费——链见头注）：挂载时闩锁补读+实时监听；定路由/失败 toast 归 openFromBus
  useEffect(() => {
    const open = (req: OpenPaperRequest): void => openFromBus(req)
    const handler = (e: Event): void => { const d = (e as CustomEvent<OpenPaperRequest>).detail; if (typeof d?.paperId === 'string') open(d) }
    window.addEventListener(OPEN_PAPER_EVENT, handler)
    const pending = takePendingOpenPaper()
    if (pending !== null) open(pending)
    return () => window.removeEventListener(OPEN_PAPER_EVENT, handler)
  }, [])

  // 换文献：弃旧文档句柄（pageTexts/pageRoots 清空归 PagesOverlay 同键效应——F-ARCH3；
  // 子效应先于父效应跑，两表清空仍先于 setPdfDoc，与拆分前同序）
  useEffect(() => {
    setPdfDoc(null)
  }, [fileUrl])

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
   *  一次性 zoom 语义保持）。分子=视觉可用宽（F-V2）：ui-scale≠1 时滚动区
   *  视觉宽=布局宽×uiScale（app-content-row zoom），而页列被 R2-SET1 反向
   *  补偿（[data-page-column] zoom=calc(1/uiScale)——PDF 视觉恒 1）——按
   *  布局宽算会让适应后两侧各留 可用宽×(uiScale−1)/uiScale 视觉空白
   *  （large 1.25 实测 ~148px/侧）。故分子=uiScale×(clientWidth−24)；
   *  uiScale 取滚动容器自身 gBCR.width/offsetWidth 比值（两者同含滚动条，
   *  比值不被页列补偿层污染——在页列上取会因补偿相消恒 1）。ui-scale=1 时
   *  比值=1 退化为原 (clientWidth−24)——单页 e2e 断言口径不变。 */
  const fitWidth = (): void => {
    const el = scrollAreaRef.current
    if (el === null || columnBasis.current <= 0) return
    const uiScale = el.offsetWidth > 0 ? el.getBoundingClientRect().width / el.offsetWidth : 1
    setZoom((uiScale * (el.clientWidth - 24)) / columnBasis.current)
  }

  // 装配渲染（空态引导/主区/工具栏+目录——ReaderPageView，[F-SPLIT-01] 拆件）
  return (
    <ReaderPageView paperId={paperId} tabStatus={tab?.status} page={page} totalPages={totalPages} zoom={zoom} color={color}
      selectionMode={selectionMode} pageLayout={pageLayout} annotations={annotations} columnScroll={columnScroll} searchBox={searchBox}
      pdfDoc={pdfDoc} outlineOpen={outlineOpen} setOutlineOpen={setOutlineOpen} scrollAreaRef={scrollAreaRef} spProg={spProg}
      selectionMount={selectionMount} setSelectionMount={setSelectionMount} fileUrl={fileUrl} setTotalPages={setTotalPages}
      setPdfDoc={setPdfDoc} handleColumnReady={handleColumnReady} handlePdfError={handlePdfError} fitWidth={fitWidth}
      setPage={setPage} setZoom={setZoom} setColor={setColor} addAnnotation={addAnnotation} />
  )
}
