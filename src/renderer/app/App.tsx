/**
 * 应用骨架（infra，无工单）：[T3-P2] 壳层改版——grid 38px/1fr/26px 三行
 * （顶栏 wordmark 签名+居中 gsearch+caption 三键｜Rail 72px 窄轨+main｜状态条）
 * +视图切换+错误边界。F-UI-03 折叠 nav 面已退役（方案切换=删除旧方案）。
 * 各页面组件来自 features/*。[T3-P1] ErrorBoundary 拆 ./ErrorBoundary。
 */
import { useEffect, useRef, useState } from 'react'
import { api, unwrap } from '../api/client'
import { LibraryPage } from '../features/library/LibraryPage'
import { ReaderPage } from '../features/reader/view/ReaderPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { LineagePage } from '../features/lineage/LineagePage'
import { ToastHost } from '../shared/ui/Toast'
import { useTabDirtyAggregate, useTabDirtySignals, useTabOpenCount } from '../features/reader/state/tab-dirty'
import { useLineageDirty, useLineageStore } from '../features/lineage/lineage.store'
import { useExportCorpusEvents } from '../features/settings/useExportCorpusEvents'
import { useSettingsStore } from '../features/settings/settings.store'
import { useLibraryStore } from '../features/library/library.store'
import { UI_SCALE, type AppSettings } from '@shared/ipc/schemas'
import { WorkspacesPage } from '../features/workspaces/WorkspacesPage'
import { selectDisplayWsName, isGuideState, useWorkspaceStore } from '../features/workspaces/workspace.store'
import { THEME_LABEL } from '../shared/ui-constants'
import { Rail, type ViewId } from './Rail'
import { StatusBar, type AutosaveStatus } from './StatusBar'
import { TitleBarControls } from './TitleBarControls'
import { ErrorBoundary } from './ErrorBoundary'
import { useViewBridges } from './useViewBridges'

/** [T3-U1] dataset.theme 合法档校验（非法/缺省=undefined 走 ?? light 兜底；枚举同源 schema） */
function normalizeTheme(value: string | undefined): AppSettings['theme'] | undefined {
  return value === 'light' || value === 'dark' || value === 'sepia' ? value : undefined
}

/**
 * [T3-U1] 状态条自动保存槽 worst-of 聚合（纯函数——tab 双源分档 ∪ lineage
 * saveStatus →三态真文本；null=槽省略）。序=error > saving > saved；
 * [回炉 R2/W3 终裁分档] annoDirty=真失败→error；notePending=在途+失败混合
 * →saving；lineage dirty=[②U1] 会话暂存未落库如实呈现；干净+有 tab=saved；
 * 无 tab 空闲=null（禁假「已保存」造作信号）。
 */
function autosaveWorstOf(
  annoDirty: boolean,
  notePending: boolean,
  lineage: 'clean' | 'dirty' | 'saving' | 'error',
  openTabs: number
): AutosaveStatus {
  if (annoDirty || lineage === 'error') return 'error'
  if (notePending || lineage === 'saving') return 'saving'
  // [F-LGRAPH-01②U1] lineage dirty=编辑会话暂存未落库（保存语义反转：
  // autosave-first→会话暂存+点保存——「待保存」档如实呈现非假「保存中」）
  if (lineage === 'dirty') return 'dirty'
  return openTabs > 0 ? 'saved' : null
}

export function App(): JSX.Element {
  const [view, setView] = useState<ViewId>('library')
  // TABS-04：聚合 dirty（任一 tab 任一写面）变化沿 push 上报 main（close 拦截
  // 读 main 缓存）。LG-03 扩面（ADR-0014+INV-22）：图保存态≠saved 即脏——组合根
  // 单点扩（tab ∪ lineage dirty）。两 hook 必须无条件调用（P7-C 崩溃修复
  // 2026-08-27）：`||` 短路→hooks 数量随渲染漂移（Rules of Hooks 违规，
  // commit 链错位崩；回归锁=app-quit-dirty.test.tsx）
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
  // [F-WS-02] dirty 聚合值直注 WorkspacesPage（弹层/设置节退役——禁跨域
  // store 互引，ADR-0018）
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
    // 失败容忍：下一次 dirty 变化沿自愈重报（INV-02 尽力而为先例）。
    // [F-FOLDER-01] INV-91 S1 队列闸：lineagePending（脉络写队列 pending 独立
    // 信号——folders/papers.move/updateMeta 写入口互斥判定源）随同载荷上报，
    // 依赖列并入 lineageDirty（两信号各自变化沿都触发重报）
    window.api.system
      .setQuitDirty({ dirty: quitDirty, lineagePending: lineageDirty })
      .catch(() => undefined)
  }, [quitDirty, lineageDirty])

  // 跨页事件桥订阅（拆件=useViewBridges——组件行数红线）：打开文献切阅读器/
  // 在脉络图中打开切脉络/去文献库切文献库（三桥明细见该 hook 头注）
  useViewBridges(setView)

  // T3-P2 状态条数据（组合根单点订阅——StatusBar 哑件 props 注入先例）：
  // 课题名/篇数/脉络计数/已选 0-1/主题名单源推导；[F-WS-02] 显示位=
  // selectDisplayWsName（引导态=待选择——INV-87）
  const wsItems = useWorkspaceStore((s) => s.items)
  const wsCurrentId = useWorkspaceStore((s) => s.currentId)
  const wsCurrent = wsItems.find((w) => w.id === wsCurrentId)
  const wsDisplayName = selectDisplayWsName({ items: wsItems, currentId: wsCurrentId })
  const wsGuide = isGuideState({ items: wsItems, currentId: wsCurrentId })
  const lineageNodes = useLineageStore((s) => s.nodes)
  const lineageEdges = useLineageStore((s) => s.edges)
  const selectedId = useLibraryStore((s) => s.selectedId)

  // [F-WS-02] 导入升格桥（D2）：导入落地→重拉课题清单→paperCount>0 打破引导
  // 态第三条件→rail 解禁。仅引导态窗口内重拉（窗口外归 reload）；失败=禁用
  // 保持（k1-N2 在档）。[W1 小挂账] 判定信号=无过滤计数（完成语义=「库内任一
  // 文献」与筛选无关——裁决案 a）：libTotal>0 直拉既有路保留；=0 时以
  // library.list 空查询探针（total=COUNT(*) 无过滤，零新契约）复核——筛选掩蔽
  // 态不再锁死；触发沿=窗口内任一 load 收尾/挂载沿；失败=本轮放弃归自愈路径
  const libTotal = useLibraryStore((s) => s.total)
  const libLoading = useLibraryStore((s) => s.loading)
  useEffect(() => {
    if (!wsGuide || libLoading) return
    if (libTotal > 0) {
      void wsLoad()
      return
    }
    let cancelled = false
    try {
      void unwrap(api.library.list({})).then((r) => {
        if (!cancelled && r.total > 0) void wsLoad()
      }).catch(() => undefined)
    } catch {
      // 探针发起失败=本轮放弃（引导态不破——自愈路径在档）
    }
    return () => {
      cancelled = true
    }
  }, [wsGuide, libTotal, libLoading, wsLoad])

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
        {/* T3-P2：72px 窄轨（课题钮=workspaces 视图路由——F-WS-02 弹层退役） */}
        <Rail view={view} onView={setView} />
        <main className="app-main min-w-0 flex-1 overflow-auto">
          <ErrorBoundary>
            {view === 'library' && <LibraryPage guideHidden={wsGuide} />}
            {view === 'reader' && <ReaderPage />}
            {view === 'settings' && <SettingsPage />}
            {view === 'lineage' && <LineagePage />}
            {view === 'workspaces' && <WorkspacesPage dirty={quitDirty} />}
          </ErrorBoundary>
        </main>
      </div>
      {/* T3-P2 状态条 26px（等宽字仪表带——真文本槽位锁在 app-shell.test） */}
      <footer className="app-statusbar">
        <StatusBar
          wsName={wsDisplayName}
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
