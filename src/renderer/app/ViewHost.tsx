/**
 * [B2 §3.1] ViewHost —— 四视图条件挂载路由（纯路由件，不订阅任何域 store）。
 *
 * - props：view（当前视图）+ changeView（视图切换回调，随契约保留；四视图内部
 *   当前无切换消费，路由回调仍由 App/Rail 持有）+ quitDirty（WorkspacesPage
 *   退出拦截值直注）+ guideHidden（LibraryPage 引导态布尔——App 侧 isGuideState
 *   投影注入，本件不订阅 workspace store，§3.2 纯 props/禁双层订阅）。
 * - [B4-A R2 §2.5 #38] WorkspacesPage 注入全量 prepare（workspace-switch 编排
 *   单源）+恢复副本 release 回调（recoveryScheduler）——本件不持编排状态。
 * - ErrorBoundary 位置随迁：四视图共同包裹在 main 内——reader 子树边界与旧
 *   App main 内边界等价（整页异常不炸壳层）。
 * - ReaderPage 经模块顶层 lazy 动态装配，Suspense 仅提供无文字的一帧占位；
 *   pdfjs 保留在 reader 动态 chunk，其余四视图仍静态 import。
 * - React.memo：纯 props 件——App 根因值型信号（quitDirty 投影）重渲时，
 *   props 未变不得连坐视图子树重渲（app-b2-host-isolation 探针锁）。
 */
import { lazy, memo, Suspense } from 'react'
import { LibraryPage } from '../features/library/LibraryPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LineagePage } from '../features/lineage/LineagePage'
import { WorkspacesPage } from '../features/workspaces/WorkspacesPage'
import { prepareRecoveryWorkspaceSwitch } from '../features/lineage/recoveryScheduler'
import { ErrorBoundary } from './ErrorBoundary'
import { prepareWorkspaceSwitch } from './workspace-switch'
import type { ViewId } from './Rail'

const ReaderPage = lazy(() => import('../features/reader/view/ReaderPage').then((module) => ({ default: module.ReaderPage })))

export interface ViewHostProps {
  view: ViewId
  changeView: (next: ViewId) => void
  quitDirty: boolean
  guideHidden: boolean
}

export const ViewHost = memo(function ViewHost(props: ViewHostProps): JSX.Element {
  return (
    <main className="app-main min-w-0 flex-1 overflow-auto">
      <ErrorBoundary>
        {props.view === 'library' && <LibraryPage guideHidden={props.guideHidden} />}
        {props.view === 'reader' && (
          <Suspense fallback={<div data-reader-lazy="true" />}>
            <ReaderPage />
          </Suspense>
        )}
        {props.view === 'settings' && <SettingsPage />}
        {props.view === 'lineage' && <LineagePage />}
        {props.view === 'workspaces' && (
          <WorkspacesPage
            dirty={props.quitDirty}
            prepare={prepareWorkspaceSwitch}
            onSwitched={prepareRecoveryWorkspaceSwitch}
          />
        )}
      </ErrorBoundary>
    </main>
  )
})
