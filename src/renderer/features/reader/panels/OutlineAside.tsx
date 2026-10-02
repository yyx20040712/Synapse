// b3: P7-C
/**
 * [SR2-C-04] OutlineAside —— 阅读器侧栏三栏宿主（工单：done / strong）
 *
 * ── 行为层 ──
 * - 三栏并列=三个并列选项卡（目录/缩略图/笔记——tab 并列非三栏同时可见）。
 *   tablist 三项宿主在本组件（OutlinePanel 内部 tab 态+tablist 已摘除，改
 *   mode prop 化——pdfjs 句柄与目录/缩略图行为零变化，纯结构迁移）
 * - tab 态迁移表（三态互斥，事件=点击 setTab(id)）：
 *   | 现态 | 点击 outline/thumbs | 点击 notes |
 *   | --- | --- | --- |
 *   | 任意 | outline/thumbs（OutlinePanel 常驻挂载仅 CSS 隐藏——目录树/滚动/
 *   |   | 懒加载状态跨切换全保留，W1） | notes（挂 ReaderNotesPanel——编辑态
 *   |   |   | 驻 notes.store，卸载不丢稿） |
 * - 选中态记忆=本地 useState（v1 不持久化——重启回目录）；e2e 坑③（role=tab
 *   域污染）：本 tablist 与 TabBar 同 role——新增查询一律限定容器
 *   （data-testid="reader-aside"）
 * - 笔记 tab 渲染 ReaderNotesPanel（C-03）：paperId/annotations 经 useActiveTab
 *   自取——ReaderPage 零新增 props（249/250 满员守恒）；onLocate=页级定位
 *   （setPage(annotation.page)——C-05 接缝升级三层防线的替换点）；
 *   highlightAnnotationId 接 reader.store noteHighlight（C-05 建位）
 * - 目录/缩略图跳页 onNavigate 收敛为 store 自取（setPage via getState）；
 *   pdfDoc 保留 props（ReaderPage 组件态非 store，PdfCanvas onDocReady 链不动）
 *
 * ── 接口层 ──
 * - export function OutlineAside(props: { pdfDoc: unknown; onCollapse(): void }): JSX.Element
 *
 * ── 架构层 ──
 * - owner=strong 声明：改动面以本层清单为准（AGENTS 工单工作流「只改这一个
 *   文件」是对 weak 领单的纪律；strong 单元=一个逻辑单元一个 commit——P7-A/B
 *   各单跨文件接缝先例）
 * - 改动面：本文件（tablist 上移+三宿主）/OutlinePanel.tsx（tab 态+tablist
 *   摘除+mode prop 化）/ReaderPage.tsx（调用处 props 削减 currentPage/
 *   onNavigate——净负）/OutlineThumb.tsx 零改动
 *
 * ── 生命周期层 ──
 * - 预留：第四面板（P7-G AI 分节并入笔记 tab 下部，非并列新栏——骨架 §2）；
 *   tab 选择持久化（v2 预留，不做）
 * - 不做：三栏同时可见（WPS 范式=单侧栏切换——B3 裁决解释）；右侧栏
 *
 * ── 文化层 ──
 * - 组件测试 tests/unit/renderer/outline-aside.test.tsx：三项切换/选中记忆/
 *   笔记 tab 挂载/目录跳页经 store/片段单击页级定位/空态
 * - [F-UI-02 图标化] 三 tab 文字换 24×24 描边简笔画图标（D7，模块级常量
 *   仿 NAV_ICONS 形态）+sr-only span 保文本（outline-aside:96 toEqual
 *   精确数组+e2e getByRole tab name 断言双面不动）+title 悬停汉语+flex
 *   居中；tab 样式（active=accent+金 hairline）与 aria/结构零变
 */
import { useEffect, useState } from 'react'
import { locateAnchor } from '../anchors/anchor-locate'
import { OutlinePanel } from './OutlinePanel'
import { ReaderNotesPanel } from './ReaderNotesPanel'
import { useReaderStore } from '../state/reader.store'
import { useActiveTab } from '../state/useActiveTab'

type AsideTab = 'outline' | 'thumbs' | 'notes'

const TAB_LABELS: Record<AsideTab, string> = { outline: '目录', thumbs: '缩略图', notes: '笔记' }

/** F-UI-02 tab 图标（D7=24×24 单色描边；stroke 走 CSS 类 .rdr-aside-tabs
 *  button svg——theme-reader.css，禁内联色/禁新依赖） */
const TAB_ICONS: Record<AsideTab, JSX.Element> = {
  outline: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  ),
  thumbs: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <rect x="4" y="4" width="7" height="7" rx="1" />
      <rect x="13" y="4" width="7" height="7" rx="1" />
      <rect x="4" y="13" width="7" height="7" rx="1" />
      <rect x="13" y="13" width="7" height="7" rx="1" />
    </svg>
  ),
  notes: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M5 4h14v12l-4 4H5z M15 20v-4h4" />
    </svg>
  )
}

export function OutlineAside(props: { pdfDoc: unknown; onCollapse(): void }): JSX.Element {
  const { pdfDoc, onCollapse } = props
  const [tab, setTab] = useState<AsideTab>('outline')
  const activeTab = useActiveTab()
  const currentPage = activeTab?.page ?? 0
  const noteHighlight = useReaderStore((s) => s.noteHighlight)
  // AI 段单击反向同步（AI-09，C-05 同型）：切笔记 tab+highlightAiNoteId 分发
  const aiNoteHighlight = useReaderStore((s) => s.aiNoteHighlight)

  /** 目录/缩略图跳页：作用于 active tab（store 自取——props 链收敛） */
  const navigate = (page: number): void => {
    useReaderStore.getState().setPage(page)
  }

  /** 片段单击定位（C-05 三层防线服务——INV-20 单入口，页级只是降级链一环） */
  const locateFragment = (annotationId: string): void => {
    const activeId = useReaderStore.getState().activeId
    if (activeId === null) return
    const a = useReaderStore.getState().tabs[activeId]?.annotations.find((x) => x.id === annotationId)
    if (a === undefined) return
    void locateAnchor({
      paperId: a.paperId,
      annotationId: a.id,
      anchor: {
        quoteText: a.quoteText,
        prefixText: a.prefixText,
        suffixText: a.suffixText,
        anchorPage: a.page,
        startOffset: a.startOffset
      }
    })
  }

  // 标注单击反向同步（C-05 N1 方案a）：自动切笔记 tab（高亮滚动由
  // FragmentNotesList 消费 highlightAnnotationId 信号完成）
  useEffect(() => {
    if (noteHighlight !== null) setTab('notes')
  }, [noteHighlight])

  // AI 段单击反向同步（AI-09）：切笔记 tab（高亮滚动由 AiNotesSection 消费
  // highlightAiNoteId 信号完成——AiNoteGroupList data-highlight）
  useEffect(() => {
    if (aiNoteHighlight !== null) setTab('notes')
  }, [aiNoteHighlight])

  return (
    <aside
      data-testid="reader-aside"
      className="flex h-full flex-col border-r"
      style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}
    >
      <div className="flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="rdr-aside-tabs flex min-w-0 flex-1" role="tablist" aria-label="侧栏面板">
          {(Object.keys(TAB_LABELS) as AsideTab[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              title={TAB_LABELS[id]}
              className="flex flex-1 items-center justify-center gap-1 px-2 py-1 text-xs"
              // active=accent 文字+accent 2px 底缘（[T3-P4] 金 hairline→accent
              // 随 mockup .aside-tab.on 对齐；panel 底=父容器已 panel 无重复
              // 声明；aria/结构零变）
              style={
                tab === id
                  ? { color: 'var(--accent)', fontWeight: 500, borderBottom: '2px solid var(--accent)' }
                  : { color: 'var(--text-dim)' }
              }
              onClick={() => setTab(id)}
            >
              {TAB_ICONS[id]}
              <span className="sr-only">{TAB_LABELS[id]}</span>
            </button>
          ))}
        </div>
        {/* [小挂账第 9 条] 收起文字钮图标化（用户图 1 红框标注）：左向
            chevron（侧栏向左缘收起语义）——TAB_ICONS 同族 24×24 单色描边
            （stroke 走 .rdr-aside-collapse svg CSS——theme-reader.css 同规则
            组并入）；aria-label/title 保「收起」语义（无障碍不回退）；点击
            行为零变 */}
        <button
          type="button"
          aria-label="收起"
          title="收起"
          className="rdr-aside-collapse shrink-0 px-1"
          style={{ color: 'var(--text-dim)' }}
          onClick={onCollapse}
        >
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <path d="M15 4l-8 8 8 8" />
          </svg>
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {/* OutlinePanel 常驻挂载（notes 态仅 CSS 隐藏）——目录树/滚动/懒加载
            状态跨三栏切换全保留（卸载重挂会闪加载态+丢状态）；
            ReaderNotesPanel 编辑态驻 notes.store，按需挂载即走合并保护 */}
        <div style={{ display: tab === 'notes' ? 'none' : 'block', height: '100%' }}>
          <OutlinePanel pdfDoc={pdfDoc} mode={tab === 'notes' ? 'outline' : tab} currentPage={currentPage} onNavigate={navigate} />
        </div>
        {tab === 'notes' && (
          <ReaderNotesPanel
            annotations={activeTab?.annotations ?? []}
            onLocate={locateFragment}
            highlightAnnotationId={noteHighlight?.annotationId ?? null}
            highlightAiNoteId={aiNoteHighlight?.aiNoteId ?? null}
          />
        )}
      </div>
    </aside>
  )
}
