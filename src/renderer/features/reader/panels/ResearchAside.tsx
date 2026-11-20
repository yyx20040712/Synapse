// b1: 前端改造第三期 B1 批
/**
 * [B1] ResearchAside —— 阅读器右栏研究面板宿主（AI 对话+笔记两页签）
 *
 * ── 行为层 ──
 * - 双页签并列（AI 对话/笔记——tab 并列非同时可见）；tab 态驻 reader.store
 *   TabState.researchTab（per-tab 会话态，[B1 批] 自 OutlineAside 本地
 *   useState 迁 store）：点击 setResearchTab(id)；缺省 'ai'（字段缺席兜底）
 * - 条件挂载（沿 OutlineAside 现模式）：ai→PaperAiPanel；notes→
 *   ReaderNotesPanel——**切页签即卸载面板**（ReaderNotesPanel 草稿驻
 *   notes.store 按 paperId 键控、卸载即 flush INV-106——禁改 CSS 常驻隐藏）
 * - paperId/annotations 经 useActiveTab 自取（OutlineAside 同法——装配面
 *   零新增 props）；highlightAnnotationId 接 reader.store noteHighlight
 * - [B1 审查回炉 B-1] noteHighlight「开面板+切页签」副作用驻常挂载层
 *   ReaderPageView（researchOpen 挂载条件的拥有层——本组件收起态不挂载，
 *   副作用驻组件内即无订阅者）；本组件只做纯渲染派生：noteHighlight
 *   .annotationId → highlightAnnotationId（高亮滚动由 FragmentNotesList
 *   消费完成）
 * - locateFragment（anchor-locate，INV-20 单入口）自 OutlineAside 迁来，
 *   onLocate 接 ReaderNotesPanel 片段单击
 * - 正文滚动容器（.rdr-research-body min-h-0 flex-1 overflow-auto）：本批
 *   只建结构，滚动记忆收账归下一批
 *
 * ── 接口层 ──
 * - export function ResearchAside(): JSX.Element（零 props——数据面全自取）
 *
 * ── 架构层 ──
 * - reader feature；挂 ReaderPageView 右 SplitPane（side='right'，
 *   paneTestId='reader-research-pane'）pane 槽
 * - e2e 坑③（role=tab 域污染）：新增查询一律限定容器
 *   （data-testid="reader-research"）
 *
 * ── 生命周期层 ──
 * - 不做：页签文字图标化（面板宽 300px 双页签平铺可读——与左栏窄面板
 *   图标化不同形是有意分工）；滚动记忆（下一批）
 *
 * ── 文化层 ──
 * - 组件测试 tests/unit/renderer/research-aside.test.tsx：页签数组/切换
 *   写 store/条件挂载互换/noteHighlight 高亮派生/片段定位/空态/AI IPC 面；
 *   装配测试 tests/unit/renderer/reader-research-assembly.test.tsx：收起态
 *   noteHighlight 自动展开（[B1 审查回炉 B-1]）
 */
import { locateAnchor } from '../anchors/anchor-locate'
import { PaperAiPanel } from '../../ai/PaperAiPanel'
import { ReaderNotesPanel } from './ReaderNotesPanel'
import { useReaderStore } from '../state/reader.store'
import { useActiveTab } from '../state/useActiveTab'

type ResearchTab = 'ai' | 'notes'

const TAB_LABELS: Record<ResearchTab, string> = {
  ai: 'AI 对话',
  notes: '笔记'
}

export function ResearchAside(): JSX.Element {
  const activeTab = useActiveTab()
  const tab = activeTab?.researchTab ?? 'ai'
  // [B1 审查回炉 B-1] 纯渲染派生（副作用驻 ReaderPageView，见头注）
  const noteHighlight = useReaderStore((s) => s.noteHighlight)
  const setResearchTab = useReaderStore((s) => s.setResearchTab)

  /** 片段单击定位（C-05 三层防线服务——INV-20 单入口，页级只是降级链一环；
   *  自 OutlineAside 迁来零改） */
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

  return (
    <aside data-testid="reader-research" className="rdr-research flex h-full flex-col">
      <div className="flex items-center border-b" style={{ borderColor: 'var(--border)' }}>
        <div className="rdr-research-tabs flex min-w-0 flex-1" role="tablist" aria-label="研究面板">
          {(Object.keys(TAB_LABELS) as ResearchTab[]).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className="flex flex-1 items-center justify-center px-2 py-1 text-xs"
              // active=accent 文字+accent 2px 底缘（左栏 tab 同语言）
              style={
                tab === id
                  ? { color: 'var(--accent)', fontWeight: 500, borderBottom: '2px solid var(--accent)' }
                  : { color: 'var(--text-dim)' }
              }
              onClick={() => setResearchTab(id)}
            >
              {TAB_LABELS[id]}
            </button>
          ))}
        </div>
      </div>
      {/* 正文滚动容器（host 自有滚动——滚动收账下一批接驳）；两页签条件
          挂载互斥（切页签即卸载，INV-106 草稿 flush 面） */}
      <div className="rdr-research-body min-h-0 flex-1 overflow-auto">
        {tab === 'notes' ? (
          <ReaderNotesPanel
            annotations={activeTab?.annotations ?? []}
            onLocate={locateFragment}
            highlightAnnotationId={noteHighlight?.annotationId ?? null}
          />
        ) : (
          <PaperAiPanel />
        )}
      </div>
    </aside>
  )
}
