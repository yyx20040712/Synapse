/**
 * 应用骨架（infra，无工单）：[T3-P2] 壳层改版——grid 38px/1fr/26px 三行
 * （顶栏 wordmark 签名+居中 gsearch+caption 三键｜Rail 72px 窄轨+ViewHost｜状态条）
 * +视图切换+错误边界。F-UI-03 折叠 nav 面已退役（方案切换=删除旧方案）。
 * [T3-P1] ErrorBoundary 随 ViewHost 拆件（视图边界迁驻）。
 * [B2 §3.1] 组合根只持值型/装配面：视图路由=ViewHost、状态条数据=
 * AppStatusBarHost——nodes/edges 数组本体与 noteByPaper 对象本体只由宿主/投影
 * 订阅（App 根仅取布尔投影，见 app-b2-host-isolation 探针）。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { ConflictDialog } from '../features/lineage/ConflictDialog'
import { ToastHost } from '../shared/ui/Toast'
import { useTabAutosaveSignals } from '../features/reader/state/tab-dirty'
import { useLineageDirty } from '../features/lineage/lineage.store'
import { useNoteDraftPending } from '../features/lineage/lineage-note-draft'
import { useExportCorpusEvents } from '../features/settings/useExportCorpusEvents'
import { useFigureExtractionBridge } from '../shared/figures/useFigureExtractionBridge'
import { useSettingsStore } from '../features/settings/settings.store'
import { UI_SCALE, type AppSettings } from '@shared/ipc/schemas'
import { isGuideState, useWorkspaceStore } from '../features/workspaces/workspace.store'
import { THEME_LABEL } from '../shared/ui-constants'
import { registerKeymap, unregisterKeymap } from '../shared/keymap'
import { Rail, type ViewId } from './Rail'
import { TitleBarControls } from './TitleBarControls'
import { useViewBridges } from './useViewBridges'
import { switchViewWithFlush } from './view-flush'
import { RecoveryBarHost } from './RecoveryBarHost'
import { useWsGuideImportBridge } from './useWsGuideImportBridge'
import { ViewHost } from './ViewHost'
import { AppStatusBarHost } from './AppStatusBarHost'

/** [T3-U1] dataset.theme 合法档校验（非法/缺省=undefined 走 ?? light 兜底；枚举同源 schema——B1 后两档） */
function normalizeTheme(value: string | undefined): AppSettings['theme'] | undefined {
  return value === 'light' || value === 'sepia' ? value : undefined
}

export function App(): JSX.Element {
  const [view, setView] = useState<ViewId>('library')
  // [F-VISFB-15①面3/63] 视图切换包装：离场 'reader'/'lineage' 先立存（语义单源=view-flush.ts）
  const changeView = useCallback((next: ViewId): void => switchViewWithFlush(view, next, setView), [view])
  // TABS-04：聚合 dirty（任一 tab 任一写面）变化沿 push 上报 main（close 拦截
  // 读 main 缓存）。LG-03 扩面（ADR-0014+INV-22）：图保存态≠saved 即脏——组合根
  // 单点扩（tab ∪ lineage dirty ∪ noteDraft——F-VISFB-63）。三 hook 必须无条件
  // 调用（P7-C 崩溃修复 2026-08-27）：`||` 短路→hooks 数量随渲染漂移（Rules of
  // Hooks 违规，commit 链错位崩；回归锁=app-quit-dirty.test.tsx）。
  // [B2 §3.2] tab 面改经 useTabAutosaveSignals 投影（pending/annoDirty 布尔，
  // useShallow 浅比）——不订阅 noteByPaper 对象本体；布尔或=与
  // useTabDirtyAggregate 同语义（受锁导出零触碰）。
  const { annoDirty, notePending } = useTabAutosaveSignals()
  const lineageDirty = useLineageDirty()
  const noteDraft = useNoteDraftPending() // [F-VISFB-63] 悬浮笔记编辑草稿（lineage-note-draft 注册族）
  const quitDirty = annoDirty || notePending || lineageDirty || noteDraft
  // AI-04：AI 语料导出事件桥（progress→store/extract-request→提取器/终局
  // toast）——App 根挂载一次，与 Settings/Reader 挂载态零耦合（R14）
  useExportCorpusEvents()
  // [F-VISFB-43] 图表提取桥（pending jobs 驱动单点：挂载沿+importProgress
  // done 事件沿——串行逐篇提取回存；与视图路由零耦合）
  useFigureExtractionBridge()
  // R1-WS2：课题清单驻留（列表型失败在 store 内写 error，不抛——挂载安全）；
  // [F-WS-02] dirty 聚合值直注 WorkspacesPage（弹层/设置节退役——禁跨域
  // store 互引，ADR-0018）
  const wsLoad = useWorkspaceStore((s) => s.load)
  useEffect(() => {
    void wsLoad()
  }, [wsLoad])
  // 引导态布尔投影（导入升格桥+ViewHost guideHidden 消费）——只订阅派生布尔，
  // 课题列表数组本体归 AppStatusBarHost（§3.2 禁双层订阅）
  const wsGuide = useWorkspaceStore((s) => isGuideState(s))
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
  // T3-P1 主题两档（B1 暗色退役）：data-theme 单点接线
  // （documentElement.dataset.theme——theme.css :root[data-theme='sepia']
  // 覆写族消费，light=裸 :root 值；未载入/缺省兜底 light=appSettingsSchema
  // default 同源；不跟随系统 A6）。
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
  }, [quitDirty, lineageDirty, noteDraft])

  // 跨页事件桥订阅（拆件=useViewBridges——组件行数红线）：打开文献切阅读器/
  // 在脉络图中打开切脉络/去文献库切文献库（三桥明细见该 hook 头注）
  useViewBridges(changeView)
  // [F-WS-02] 导入升格桥（D2——[F-VISFB-65] 拆件 useWsGuideImportBridge：
  // 纯移动零语义改，App 行数红线；语义面见该件头注）
  useWsGuideImportBridge(wsGuide)

  // T3-P2 gsearch：全局 Ctrl+K 聚焦（keymap 单例注册——app-C3
  // 归并〔D3=A 裁决〕：editable 避让（输入框内不抢焦点）+修饰精确匹配
  // （Ctrl+Shift+K/Ctrl+Alt+K 不误触发）两语义随之生效；preventDefault 显式
  // 声明防浏览器默认；注册/注销成对 INV-14。v1 展示性控件——可聚焦可输入，
  // 无后端动作；提示语=受控空值显隐 span.ph（mockup .ph 语汇——票面
  // 「提示语『全局搜索』」的落地形式）
  const gsearchRef = useRef<HTMLInputElement>(null)
  const [gsearchText, setGsearchText] = useState('')
  useEffect(() => {
    registerKeymap('app-gsearch', [
      { key: 'k', ctrl: true, preventDefault: true, handler: () => gsearchRef.current?.focus() }
    ])
    return () => unregisterKeymap('app-gsearch')
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
          系统观感）；PDF 页列在 theme-shell.css [data-page-column] 反向补偿恒视觉 1.0。
          [F-VISFB-65 回炉 R2] zone=内容区列容器（.app-shell 三行模板不动——
          恢复条与本行纵向排布，条空窗 0 高不占位） */}
      <div className="app-content-zone">
      <RecoveryBarHost />
      <div className="app-content-row">
        {/* T3-P2：72px 窄轨（课题钮=workspaces 视图路由——F-WS-02 弹层退役） */}
        <Rail view={view} onView={changeView} />
        <ViewHost view={view} changeView={changeView} quitDirty={quitDirty} guideHidden={wsGuide} />
      </div>
      </div>
      {/* T3-P2 状态条 26px（等宽字仪表带——真文本槽位锁在 app-shell.test） */}
      <AppStatusBarHost themeLabel={THEME_LABEL[theme]} />
      <ToastHost />
      {/* [F-VISFB-65 单元二] GHOST_FOLDER 降级询问（app 级——quit 交叠期任意
          视图可见；无待决渲染 null） */}
      <ConflictDialog />
    </div>
  )
}
