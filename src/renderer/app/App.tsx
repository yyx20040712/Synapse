/**
 * 应用骨架（infra，无工单）：顶栏身份区（R2-SH2 决4）+ 侧栏四入口 + 视图切换 + 错误边界。
 * 各页面组件来自 features/*（多为工单占位，随工单完成替换）。
 * [T3-P1] ErrorBoundary 拆 ./ErrorBoundary（组件 250 行防线——本件主题接线
 * +7 行压线，边界=独立职责拆件，行为零迁移）。
 */
import { useEffect, useState } from 'react'
import { LibraryPage } from '../features/library/LibraryPage'
import { ReaderPage } from '../features/reader/view/ReaderPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LineagePage } from '../features/lineage/LineagePage'
import { ToastHost } from '../shared/ui/Toast'
import { OPEN_PAPER_EVENT } from '../shared/open-paper-bus'
import { useTabDirtyAggregate } from '../features/reader/state/tab-dirty'
import { useLineageDirty } from '../features/lineage/lineage.store'
import { useExportCorpusEvents } from '../features/settings/useExportCorpusEvents'
import { useSettingsStore } from '../features/settings/settings.store'
import { UI_SCALE } from '@shared/ipc/schemas'
import { WorkspaceSwitcher } from '../features/workspaces/WorkspaceSwitcher'
import { WorkspaceSection } from '../features/workspaces/WorkspaceSection'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import { TitleBarControls } from './TitleBarControls'
import { SplitPane } from '../shared/ui/SplitPane'
import { ErrorBoundary } from './ErrorBoundary'

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

/** F-UI-03 收起/展开双箭头（D7=24×24 viewBox 单色描边，沿 NAV_ICONS 形态，
 *  禁新增依赖；aria-hidden——按钮名走 aria-label 三元，TitleBarControls 先例） */
const ICON_NAV_COLLAPSE = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M11 5l-6 7 6 7M19 5l-6 7 6 7" />
  </svg>
)
const ICON_NAV_EXPAND = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M13 5l6 7-6 7M5 5l6 7-6 7" />
  </svg>
)

export function App(): JSX.Element {
  const [view, setView] = useState<ViewId>('library')
  // F-UI-03：导航栏窄条折叠态（SplitPane 受控面；不持久化，会话默认展开）
  const [navCollapsed, setNavCollapsed] = useState(false)
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
  // R2-SET1 界面缩放：设置驻留加载（挂载点在组合根——设置页外也要有档位）。
  // 失败容忍：load 抛错静默用默认档 small（`?? 'small'` 兜底；设置页自身 load
  // 失败会 toast，用户可见面不缺——INV-02 的「用户触发」面在设置页）
  const uiScale = useSettingsStore((s) => s.settings?.uiScale ?? 'small')
  const settingsLoad = useSettingsStore((s) => s.load)
  useEffect(() => {
    settingsLoad().catch(() => undefined)
  }, [settingsLoad])
  // 数据通道单点：档位→CSS 变量（theme-shell.css .app-content-row/[data-page-column]
  // 消费——皮肤住类 B1；变量属数据通道非内联皮肤；--ui-scale 动态注入——
  // C-4c 白名单 DYNAMIC_TOKENS 登记 scripts/check-quality.mjs）
  useEffect(() => {
    document.documentElement.style.setProperty('--ui-scale', String(UI_SCALE[uiScale]))
  }, [uiScale])
  // T3-P1 主题三族：data-theme 单点接线（documentElement.dataset.theme——
  // theme.css :root[data-theme='dark'|'sepia'] 覆写族消费；未载入/缺省兜底
  // light=appSettingsSchema default 同源；不跟随系统 A6）
  const theme = useSettingsStore((s) => s.settings?.theme ?? 'light')
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
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
    <div className="flex h-full flex-col">
      {/* R2-SH2 决4 顶栏身份区（ZCode 式）：logo+应用名「Synapse」（smoke.spec:22
          getByText 断言面——迁顶栏后文本仍唯一在场）+课题切换器迁挂+版本号右区 */}
      <header className="app-header">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <rect x="6.5" y="6.5" width="11" height="11" transform="rotate(45 12 12)" fill="none" stroke="var(--gold)" strokeWidth="1" />
          <rect x="9.5" y="9.5" width="5" height="5" transform="rotate(45 12 12)" fill="var(--gold)" />
        </svg>
        <span className="app-header-name">Synapse</span>
        {/* R1-WS2：课题切换器（R2-SH2 迁挂顶栏——纯容器迁挂，组件本体零改）：
            dirty 聚合 props 注入，「管理」跳设置；wrapper 防展开面板撑高顶栏 */}
        <div className="app-header-switcher">
          <WorkspaceSwitcher dirty={quitDirty} onManage={() => setView('settings')} />
        </div>
        <span className="app-nav-ver">v0.1</span>
        {/* R2-SH3：frameless 自绘 caption 三键（版本号 margin-left:auto 吸收
            空隙，三键组排最右——bilibili 式；皮肤住 theme-shell.css） */}
        <TitleBarControls />
      </header>
      {/* min-h-0：内容行高度约束（文档永不滚不变量——滚动只发生在 main 容器）。
          R2-SET1：app-content-row=界面缩放挂载行（zoom 经 --ui-scale）——header
          在行外结构性豁免（E5：caption 三键/顶栏保持系统观感）；PDF 页列在
          theme-shell.css [data-page-column] 反向补偿恒视觉 1.0 */}
      <div className="app-content-row flex min-h-0 flex-1">
        {/* F-UI-03：墨青侧栏边界可拖宽+窄条折叠（D4=184/64/280 档位）——
            SplitPane main 槽 null（主内容外置，ReaderPageView 先例）；nav 宽度
            归 pane 容器管；label 包 span.app-nav-label=窄态 clip 视觉隐藏（禁
            display:none——Chromium 排除出 accessible name，e2e name 断言面破） */}
        <SplitPane
          paneId="app-nav"
          side="left"
          defaultWidth={184}
          min={64}
          max={280}
          collapsible
          collapsedWidth={64}
          collapsed={navCollapsed}
          onCollapsedChange={setNavCollapsed}
          children={{
            pane: (
              <nav className={navCollapsed ? 'app-nav app-nav-collapsed' : 'app-nav'}>
                <button
                  type="button"
                  className="app-nav-toggle"
                  aria-label={navCollapsed ? '展开导航栏' : '收起导航栏'}
                  onClick={() => setNavCollapsed((c) => !c)}
                >
                  {navCollapsed ? ICON_NAV_EXPAND : ICON_NAV_COLLAPSE}
                </button>
                {NAV.map((item) => (
                  <button
                    key={item.id}
                    className={`app-nav-item${view === item.id ? ' app-nav-item-active' : ''}`}
                    onClick={() => setView(item.id)}
                  >
                    {NAV_ICONS[item.id]}
                    <span className="app-nav-label">{item.label}</span>
                  </button>
                ))}
                <div className="app-nav-foot">
                  <span className="app-nav-txt">本地学术文献管理</span>
                </div>
              </nav>
            ),
            main: null
          }}
        />
        <main className="app-main min-w-0 flex-1 overflow-auto">
          <ErrorBoundary>
            {view === 'library' && <LibraryPage />}
            {view === 'reader' && <ReaderPage />}
            {view === 'settings' && (
              <SettingsPage workspaceSection={<WorkspaceSection dirty={quitDirty} />} />
            )}
            {view === 'lineage' && <LineagePage />}
          </ErrorBoundary>
        </main>
      </div>
      <ToastHost />
    </div>
  )
}
