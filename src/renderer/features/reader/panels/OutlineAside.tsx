// b3: P7-C
/**
 * [B1 批] 结构迁移瘦身：笔记/AI 页签迁右栏研究面板 ResearchAside。
 *
 * [SR2-C-04] OutlineAside —— 阅读器左侧栏宿主（目录/缩略图两页签）
 *
 * ── 行为层 ──
 * - 左栏只留目录/缩略图两页签（[B1 批] notes/ai 页签+noteHighlight 副作用+
 *   locateFragment 随迁 ResearchAside；收起钮退役——左右栏开关收口
 *   ReaderToolbar 两端钮）
 * - tab 态=本地 useState（v1 不持久化——重启回目录）；e2e 坑③（role=tab
 *   域污染）：本 tablist 与 TabBar 同 role——新增查询一律限定容器
 *   （data-testid="reader-aside"）
 * - OutlinePanel 常驻挂载（两页签共用——mode prop 切换不重挂，目录树/滚动/
 *   懒加载状态跨切换全保留，W1 语义不变）
 * - 目录/缩略图跳页 onNavigate 收敛为 store 自取（setPage via getState）；
 *   pdfDoc 保留 props（ReaderPage 组件态非 store，PdfCanvas onDocReady 链不动）
 *
 * ── 接口层 ──
 * - export function OutlineAside(props: { pdfDoc: unknown }): JSX.Element
 *   （[B1 批] onCollapse 退役——开关唯一入口=ReaderToolbar 目录侧栏钮）
 *
 * ── 架构层 ──
 * - owner=strong 声明：改动面以本层清单为准
 * - 改动面：本文件（页签收缩+收起钮/noteHighlight/locateFragment 迁出）/
 *   ResearchAside.tsx（迁入面）/ReaderPageView.tsx（右栏装配）
 *
 * ── 生命周期层 ──
 * - 不做：三栏同时可见（左=目录导航、右=研究面板的分工自 [B1 批] 起）
 *
 * ── 文化层 ──
 * - 组件测试 tests/unit/renderer/outline-aside.test.tsx：两项切换/选中记忆/
 *   OutlinePanel 常驻/目录跳页经 store/空态
 * - [F-UI-02 图标化] 两 tab 文字换 24×24 描边简笔画图标（D7，模块级常量
 *   仿 NAV_ICONS 形态）+sr-only span 保文本+title 悬停汉语+flex 居中；tab
 *   样式（active=accent+2px 底缘）与 aria/结构零变
 */
import { useState } from 'react'
import { OutlinePanel } from './OutlinePanel'
import { useReaderStore } from '../state/reader.store'
import { useActiveTab } from '../state/useActiveTab'

type AsideTab = 'outline' | 'thumbs'

const TAB_LABELS: Record<AsideTab, string> = {
  outline: '目录',
  thumbs: '缩略图'
}

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
  )
}

export function OutlineAside(props: { pdfDoc: unknown }): JSX.Element {
  const { pdfDoc } = props
  const [tab, setTab] = useState<AsideTab>('outline')
  const activeTab = useActiveTab()
  const currentPage = activeTab?.page ?? 0

  /** 目录/缩略图跳页：作用于 active tab（store 自取——props 链收敛） */
  const navigate = (page: number): void => {
    useReaderStore.getState().setPage(page)
  }

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
              // 随 mockup .aside-tab.on 对齐；aria/结构零变）
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
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {/* OutlinePanel 常驻挂载（两页签共用 mode prop——切换不重挂，目录树/
            滚动/懒加载状态全保留，卸载重挂会闪加载态+丢状态） */}
        <div style={{ height: '100%' }}>
          <OutlinePanel
            pdfDoc={pdfDoc}
            mode={tab}
            currentPage={currentPage}
            onNavigate={navigate}
          />
        </div>
      </div>
    </aside>
  )
}
