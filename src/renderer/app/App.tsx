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
      <nav className="flex w-40 shrink-0 flex-col gap-1 border-r p-2" style={{ borderColor: 'var(--border)', background: 'var(--panel)' }}>
        <p className="px-2 py-3 text-sm font-semibold">Synapse Remake</p>
        {/* R1-WS2：课题切换器（nav 顶部）——dirty 聚合 props 注入，「管理」跳设置 */}
        <WorkspaceSwitcher dirty={quitDirty} onManage={() => setView('settings')} />
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
