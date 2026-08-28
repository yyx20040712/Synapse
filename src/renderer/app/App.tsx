/**
 * 应用骨架（infra，无工单）：侧栏四入口 + 视图切换 + 错误边界。
 * 各页面组件来自 features/*（多为工单占位，随工单完成替换）。
 */
import { Component, Fragment, type ErrorInfo, type ReactNode, useEffect, useState } from 'react'
import { LibraryPage } from '../features/library/LibraryPage'
import { ReaderPage } from '../features/reader/ReaderPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LineagePage } from '../features/lineage/LineagePage'
import { ToastHost } from '../shared/ui/Toast'
import { OPEN_PAPER_EVENT } from '../shared/open-paper-bus'
import { useTabDirtyAggregate } from '../features/reader/tab-dirty'
import { useLineageDirty } from '../features/lineage/lineage.store'
import { useExportCorpusEvents } from '../features/settings/useExportCorpusEvents'
import { WorkspaceSwitcher } from '../features/workspaces/WorkspaceSwitcher'
import { WorkspaceSection } from '../features/workspaces/WorkspaceSection'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'

type ViewId = 'library' | 'reader' | 'lineage' | 'settings'

const NAV: Array<{ id: ViewId; label: string }> = [
  { id: 'library', label: '文献库' },
  { id: 'reader', label: '阅读器' },
  { id: 'settings', label: '设置' },
  { id: 'lineage', label: '脉络' }
]

/**
 * nav 入口内联 SVG 图标（R3-TH1——mockup shell-library.html path 逐字誊录，
 * 禁新增依赖红线；aria-hidden 不污染 getByRole name=e2e 断言面）。
 */
const NAV_ICONS: Record<ViewId, JSX.Element> = {
  library: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 4h5v16H4zM12 4h5v16h-5z" />
      <path d="M19 5.5l2 .9v13.2l-2 .9" />
    </svg>
  ),
  reader: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 5c-2 0-3 1-4.5 1S5 5.5 5 5.5v13S6.5 18 7.5 18s2.5 1 4.5 1 3-1 4.5-1 2.5.5 2.5.5v-13S19 6 17.5 6 14 5 12 5z" />
      <path d="M12 5v14" />
    </svg>
  ),
  settings: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M12 2.8v3M12 18.2v3M2.8 12h3M18.2 12h3M5.5 5.5l2.1 2.1M16.4 16.4l2.1 2.1M18.5 5.5l-2.1 2.1M7.6 16.4l-2.1 2.1" />
    </svg>
  ),
  lineage: (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 3l2.2 4.8L19 9l-3.5 3.4.9 5-4.4-2.5L7.6 17.4l.9-5L5 9l4.8-1.2z" />
    </svg>
  )
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null; retry: number }
> {
  override state = { message: null as string | null, retry: 0 }

  static getDerivedStateFromError(error: Error): { message: string } {
    return { message: error.message }
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[App] 渲染错误', error, info.componentStack)
  }

  override render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div className="flex h-full items-center justify-center p-8">
          <div className="max-w-md rounded-lg border p-4 text-sm" style={{ borderColor: 'var(--danger)' }}>
            <p className="mb-2 font-medium">页面出现错误</p>
            <p className="text-xs" style={{ color: 'var(--text-dim)' }}>
              {this.state.message}
            </p>
            <button
              className="mt-3 rounded px-3 py-1 text-xs text-white"
              style={{ background: 'var(--accent)' }}
              // 重试 = 清错误 + 递增 retry 作子树 key 强制重挂载：出错组件带着旧状态
              // 重渲染大概率立刻再抛同一错误，remount 才是真正的"重试"
              onClick={() => this.setState((s) => ({ message: null, retry: s.retry + 1 }))}
            >
              重试
            </button>
          </div>
        </div>
      )
    }
    return <Fragment key={this.state.retry}>{this.props.children}</Fragment>
  }
}

export function App(): JSX.Element {
  const [view, setView] = useState<ViewId>('library')
  // TABS-04：聚合 dirty（任一已打开 tab 任一写面）变化沿 push 上报 main——
  // close 拦截判定读 main 侧缓存，不在 close 事件内反向询问 renderer。
  // LG-03 扩面（ADR-0014 接缝条款+INV-22）：图视图保存态≠saved 即脏——
  // 组合根单点扩（tab dirty ∪ lineage dirty），TABS-04 行为面零触碰
  // 两 hook 必须无条件调用（P7-C 崩溃修复 2026-08-27）：`||` 短路会使
  // tab dirty=true 的渲染缺席 useLineageDirty 的 hooks——同一 fiber 两次
  // 渲染 hooks 数量不同（Rules of Hooks 违规），生产 bundle 无 dev 警告，
  // commit 阶段 effect 链错位崩 areHookInputsEqual（回归锁=
  // tests/unit/renderer/app-quit-dirty.test.tsx）
  const tabDirty = useTabDirtyAggregate()
  const lineageDirty = useLineageDirty()
  const quitDirty = tabDirty || lineageDirty
  // AI-04：AI 语料导出事件桥（progress→store/extract-request→提取器/终局
  // toast）——App 根挂载一次，与 Settings/Reader 挂载态零耦合（R14）
  useExportCorpusEvents()
  // R1-WS2：课题清单驻留（列表型失败在 store 内写 error，不抛——挂载安全）；
  // dirty 聚合值经 props 注入切换器与设置面（禁跨域 store 互引，ADR-0018）
  const wsLoad = useWorkspaceStore((s) => s.load)
  useEffect(() => {
    void wsLoad()
  }, [wsLoad])
  useEffect(() => {
    // 失败容忍：下一次 dirty 变化沿自愈重报（INV-02 尽力而为先例）
    window.api.system.setQuitDirty({ dirty: quitDirty }).catch(() => undefined)
  }, [quitDirty])

  // "打开文献"请求：切到阅读器 tab（请求本体的补读/监听在 ReaderPage，见 open-paper-bus）
  useEffect(() => {
    const handler = (): void => setView('reader')
    window.addEventListener(OPEN_PAPER_EVENT, handler)
    return () => window.removeEventListener(OPEN_PAPER_EVENT, handler)
  }, [])

  return (
    <div className="flex h-full">
      {/* R3-TH1 墨青侧栏（.app-nav 系=theme.css 誊录自 mockup）：品牌行文案
          「Synapse Remake」为 smoke.spec getByText 断言面——不可改 mockup 短名 */}
      <nav className="app-nav">
        <div className="app-nav-brand">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <rect x="6.5" y="6.5" width="11" height="11" transform="rotate(45 12 12)" fill="none" stroke="var(--gold)" strokeWidth="1" />
            <rect x="9.5" y="9.5" width="5" height="5" transform="rotate(45 12 12)" fill="var(--gold)" />
          </svg>
          <span className="app-nav-name">Synapse Remake</span>
        </div>
        {/* R1-WS2：课题切换器（nav 顶部）——dirty 聚合 props 注入，「管理」跳设置 */}
        <WorkspaceSwitcher dirty={quitDirty} onManage={() => setView('settings')} />
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`app-nav-item${view === item.id ? ' app-nav-item-active' : ''}`}
            onClick={() => setView(item.id)}
          >
            {NAV_ICONS[item.id]}
            {item.label}
          </button>
        ))}
        <div className="app-nav-foot">
          <span className="app-nav-ver">v0.1</span>
          <span className="app-nav-txt">本地学术文献管理</span>
        </div>
      </nav>
      <main className="min-w-0 flex-1 overflow-auto">
        <ErrorBoundary>
          {view === 'library' && <LibraryPage />}
          {view === 'reader' && <ReaderPage />}
          {view === 'settings' && (
            <SettingsPage workspaceSection={<WorkspaceSection dirty={quitDirty} />} />
          )}
          {view === 'lineage' && <LineagePage />}
        </ErrorBoundary>
      </main>
      <ToastHost />
    </div>
  )
}
