/**
 * 应用骨架（infra，无工单）：[T3-P2] 壳层改版——grid 38px/1fr/26px 三行
 * （顶栏 wordmark 签名+居中 gsearch+caption 三键｜Rail 72px 窄轨+main｜状态条）
 * +视图切换+错误边界。F-UI-03 折叠 nav 面已退役（方案切换=删除旧方案）。
 * 各页面组件来自 features/*。[T3-P1] ErrorBoundary 拆 ./ErrorBoundary。
 */
import { useEffect, useRef, useState } from 'react'
import { LibraryPage } from '../features/library/LibraryPage'
import { ReaderPage } from '../features/reader/view/ReaderPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LineagePage } from '../features/lineage/LineagePage'
import { ToastHost } from '../shared/ui/Toast'
import { OPEN_PAPER_EVENT } from '../shared/open-paper-bus'
import { useTabDirtyAggregate, useTabDirtySignals, useTabOpenCount } from '../features/reader/state/tab-dirty'
import { useLineageDirty, useLineageStore } from '../features/lineage/lineage.store'
import { useExportCorpusEvents } from '../features/settings/useExportCorpusEvents'
import { useSettingsStore } from '../features/settings/settings.store'
import { useLibraryStore } from '../features/library/library.store'
import { UI_SCALE, type AppSettings } from '@shared/ipc/schemas'
import { WorkspaceSection } from '../features/workspaces/WorkspaceSection'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import { THEME_LABEL } from '../shared/ui-constants'
import { Rail, type ViewId } from './Rail'
import { StatusBar, type AutosaveStatus } from './StatusBar'
import { TitleBarControls } from './TitleBarControls'
import { ErrorBoundary } from './ErrorBoundary'

/** [T3-U1] dataset.theme 合法档校验（启动注入值消费位——非法/缺省=undefined
 *  走 ?? light 原兜底；三值枚举与 appSettingsSchema 同源） */
function normalizeTheme(value: string | undefined): AppSettings['theme'] | undefined {
  return value === 'light' || value === 'dark' || value === 'sepia' ? value : undefined
}

/**
 * [T3-U1] 状态条自动保存槽 worst-of 聚合（纯函数——票面②：tab 双源分档 ∪
 * lineage saveStatus →三态真文本；null=无可写面信号槽省略）。序=
 * error > saving > saved。[回炉 R2/W3 终裁分档] annoDirty（annotations 面
 * api 失败残留——真失败）→error 档；notePending（notes 面 pendingEdit
 * 镜像=在途+失败混合，打字防抖窗常 true）→saving 档「保存中…」=未落库
 * 统称（打字期禁红色假警报）；有已打开 tab（标注/笔记可写面）且全干净=
 * saved；无 tab 且 lineage 空闲=null（禁假数据——不显「已保存」造作信号）。
 */
function autosaveWorstOf(
  annoDirty: boolean,
  notePending: boolean,
  lineage: 'saved' | 'saving' | 'error',
  openTabs: number
): AutosaveStatus {
  if (annoDirty || lineage === 'error') return 'error'
  if (notePending || lineage === 'saving') return 'saving'
  return openTabs > 0 ? 'saved' : null
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
  // [T3-U1 回炉 R2/W3 终裁] 状态条自动保存槽聚合（沿上方 dirty 聚合同源信号
  // 族扩 worst-of）：tab 双源分档（annoDirty→error/notePending→saving——
  // useTabDirtySignals facade）∪ lineage saveStatus 三态 →三态真文本注入
  // StatusBar（null=无可写面信号槽省略——纯函数见文件头）。quitDirty 链
  // （上方 useTabDirtyAggregate 或聚合）零触碰——TABS-04 行为面不动
  const tabOpenCount = useTabOpenCount()
  const { annoDirty, notePending } = useTabDirtySignals()
  const lineageSave = useLineageStore((s) => s.saveStatus)
  const autosave = autosaveWorstOf(annoDirty, notePending, lineageSave, tabOpenCount)
  // AI-04：AI 语料导出事件桥（progress→store/extract-request→提取器/终局
  // toast）——App 根挂载一次，与 Settings/Reader 挂载态零耦合（R14）
  useExportCorpusEvents()
  // R1-WS2：课题清单驻留（列表型失败在 store 内写 error，不抛——挂载安全）；
  // dirty 聚合值经 props 注入 Rail 弹层与设置面（禁跨域 store 互引，ADR-0018）
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
  // light=appSettingsSchema default 同源；不跟随系统 A6）。
  // [T3-U1] FOUC 首帧兜底消费位：settings 未载入（load 在途/失败容忍窗）的
  // 过渡档=启动注入值（theme-boot.js 首帧写 dataset.theme——值源同为
  // settings.json，INV-71「两者值一致」）；无注入值回退 light（原 ?? 兜底）
  const bootThemeRef = useRef(normalizeTheme(document.documentElement.dataset.theme))
  const theme = useSettingsStore((s) => s.settings?.theme ?? bootThemeRef.current ?? 'light')
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

  // T3-P2 状态条数据（组合根单点订阅——StatusBar 哑件 props 注入先例）：
  // 课题名/篇数=workspace items+currentId 推导；脉络计数=lineage nodes/edges；
  // 已选=library selectedId 0/1；主题名=THEME_LABEL 单源（ui-constants）
  const wsItems = useWorkspaceStore((s) => s.items)
  const wsCurrentId = useWorkspaceStore((s) => s.currentId)
  const wsCurrent = wsItems.find((w) => w.id === wsCurrentId)
  const lineageNodes = useLineageStore((s) => s.nodes)
  const lineageEdges = useLineageStore((s) => s.edges)
  const selectedId = useLibraryStore((s) => s.selectedId)

  // T3-P2 gsearch：全局 Ctrl+K 聚焦（keydown 挂 App 单点；preventDefault 防
  // 浏览器默认；v1 展示性控件——可聚焦可输入，无后端动作；提示语=受控空值
  // 显隐 span.ph（mockup .ph 语汇——票面「提示语『全局搜索』」的落地形态）
  const gsearchRef = useRef<HTMLInputElement>(null)
  const [gsearchText, setGsearchText] = useState('')
  useEffect(() => {
    const onKey = (ev: KeyboardEvent): void => {
      if (ev.ctrlKey && (ev.key === 'k' || ev.key === 'K')) {
        ev.preventDefault()
        gsearchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="app-shell">
      {/* T3-P2 顶栏 38px（mockup .topbar 语汇，类名保留 .app-header——smoke/
          window-control 选择器面最小伤害）：wordmark 签名+gsearch 居中+caption
          三键；整条 drag，三键/wordmark/gsearch=no-drag（皮肤住 theme-shell.css） */}
      <header className="app-header">
        <span className="wordmark">Syn<i>a</i>pse</span>
        <div className="gsearch">
          <svg aria-hidden="true" viewBox="0 0 24 24">
            <circle cx="10.5" cy="10.5" r="6.5" />
            <path d="M15.5 15.5L21 21" />
          </svg>
          <input
            ref={gsearchRef}
            type="text"
            aria-label="全局搜索"
            value={gsearchText}
            onChange={(e) => setGsearchText(e.target.value)}
          />
          {gsearchText === '' && (
            <span className="ph" aria-hidden="true">全局搜索</span>
          )}
          <span className="k" aria-hidden="true">Ctrl K</span>
        </div>
        {/* R2-SH3：frameless 自绘 caption 三键（42/42/52px 皮肤化——close 悬停
            --close-red；IPC 三动作不动） */}
        <TitleBarControls />
      </header>
      {/* min-height:0：内容行高度约束（文档永不滚不变量——滚动只发生在 main 容器）。
          R2-SET1：app-content-row=界面缩放挂载行（zoom 经 --ui-scale）——rail+main
          同入 zoom，topbar/statusbar 行外结构性豁免（E5：caption 三键/顶栏保持
          系统观感）；PDF 页列在 theme-shell.css [data-page-column] 反向补偿恒视觉 1.0 */}
      <div className="app-content-row">
        {/* T3-P2：72px 窄轨（课题弹层 dirty 聚合值注入）；F-UI-03 折叠 nav 面退役 */}
        <Rail view={view} onView={setView} dirty={quitDirty} />
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
      {/* T3-P2 状态条 26px（等宽字仪表带——真文本槽位锁在 app-shell.test） */}
      <footer className="app-statusbar">
        <StatusBar
          wsName={wsCurrent?.name ?? ''}
          paperCount={wsCurrent?.paperCount ?? 0}
          nodeCount={lineageNodes.length}
          edgeCount={lineageEdges.length}
          selectedCount={selectedId !== null ? 1 : 0}
          themeLabel={THEME_LABEL[theme]}
          autosave={autosave}
        />
      </footer>
      <ToastHost />
    </div>
  )
}
