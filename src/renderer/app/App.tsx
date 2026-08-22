/**
 * 应用骨架（infra，无工单）：侧栏三入口 + 视图切换 + 错误边界。
 * 各页面组件来自 features/*（多为工单占位，随工单完成替换）。
 */
import { Component, Fragment, type ErrorInfo, type ReactNode, useEffect, useState } from 'react'
import { LibraryPage } from '../features/library/LibraryPage'
import { ReaderPage } from '../features/reader/ReaderPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { ToastHost } from '../shared/ui/Toast'
import { OPEN_PAPER_EVENT } from '../shared/open-paper-bus'

type ViewId = 'library' | 'reader' | 'settings'

const NAV: Array<{ id: ViewId; label: string }> = [
  { id: 'library', label: '文献库' },
  { id: 'reader', label: '阅读器' },
  { id: 'settings', label: '设置' }
]

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

  // "打开文献"请求：切到阅读器 tab（请求本体的补读/监听在 ReaderPage，见 open-paper-bus）
  useEffect(() => {
    const handler = (): void => setView('reader')
    window.addEventListener(OPEN_PAPER_EVENT, handler)
    return () => window.removeEventListener(OPEN_PAPER_EVENT, handler)
  }, [])

  return (
    <div className="flex h-full">
      <nav className="flex w-40 shrink-0 flex-col gap-1 border-r p-2" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <p className="px-2 py-3 text-sm font-semibold">Synapse Remake</p>
        {NAV.map((item) => (
          <button
            key={item.id}
            className={`rounded px-3 py-2 text-left text-sm ${view === item.id ? 'font-medium' : ''}`}
            style={view === item.id ? { background: 'var(--accent-soft)', color: 'var(--accent)' } : undefined}
            onClick={() => setView(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <main className="min-w-0 flex-1 overflow-auto">
        <ErrorBoundary>
          {view === 'library' && <LibraryPage />}
          {view === 'reader' && <ReaderPage />}
          {view === 'settings' && <SettingsPage />}
        </ErrorBoundary>
      </main>
      <ToastHost />
    </div>
  )
}
