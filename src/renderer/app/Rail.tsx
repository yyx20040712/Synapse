/**
 * [T3-P2→F-WS-02] Rail —— B站式 72px 窄轨侧栏（无 logo，自「课题」始；A15/A10/A8）。
 *
 * ── 行为层 ──
 * - 六项：课题（[F-WS-02] 视图路由钮——点击切 workspaces 管理页，弹层
 *   WsRailPopover 已退役=方案切换删旧方案）→下载（占位 toast——A8 规划中）
 *   →文献库/阅读器/脉络（视图切换，active 态）→rail-foot（margin-top:auto
 *   贴底）→设置
 * - 视图五项（含课题）接 App view 态：active 类+aria-current="page"（当前
 *   视图单选——课题钮同视图钮语义，F-WS-02 R1）
 * - 课题项=短名 label（显示名前 4 字符，无当前课题兜底「课题」）——色点
 *   span.rail-ws-dot 已退役 F-LIBUI-01（色标身份移入课题管理页卡片）
 * - [F-WS-02] 引导态（INV-87 三条件：default∧0 篇∧默认名）：课题名显示位
 *   =「待选择」（D2 批语——不显示默认课题字样）；课题钮以下五钮（下载/
 *   文献库/阅读器/脉络/设置）全禁用浅色（disabled+皮肤），课题钮恒可用=
 *   引导出路；升格三路（改名/导入计数/切非 default）任一打破即解禁显实名
 * - 切课题联动语义=ADR-0018 reload：switchTo 成功即整页 reload，短名/状态
 *   条课题名 reload 后自新（跨格序列锁=app-shell.test 视图页+引导态 describe）
 *
 * ── 接口层 ──
 * - export function Rail(props: { view: ViewId; onView(v: ViewId): void })
 *   （[F-WS-02] dirty 参数随弹层退役删除——管理页的 dirty 由 App 直注
 *   WorkspacesPage，Rail 零消费）
 *
 * ── 架构层 ──
 * - app/ 组合根件（App 同级）：可引 features 域 store（workspace.store），
 *   禁引 reader/lineage 域（dirty 由 App 注入）；皮肤住 theme-shell.css
 *
 * ── 生命周期层 ──
 * - 不做：下载引擎本体（A8 占位）；课题管理本体（workspaces 管理页）
 *
 * ── 文化层 ──
 * - SVG path 逐值誊自 v2 设计稿（2026-11-19 定案 synapse-redesign-v2.html
 *   symbol 库 i-library/i-reader/i-lineage/i-settings/i-folder/i-download——
 *   前端改造第一期图标统一批；禁新依赖）
 * - 测试：tests/unit/renderer/app-shell.test.tsx（窄轨结构+视图页）
 *   +ws-guide-state.test.tsx（引导态锁——R1 勘正拆件实驻）+tests/e2e/shell-rail.spec.ts（真 Chromium 渲染）
 */
import { showToast } from '../shared/ui/Toast'
import { isGuideState, selectDisplayWsName, useWorkspaceStore } from '../features/workspaces/workspace.store'

export type ViewId = 'library' | 'reader' | 'lineage' | 'settings' | 'workspaces'

/** 下载占位文案（[v2 第二期] 入口语义统一「下载文献 PDF 到相应文件夹」——
 *  功能未完成仍如实标规划中，不假装已下载） */
const DL_TOAST_TEXT = '下载文献 PDF 到相应文件夹 · 规划中（未实现）'

/** 视图四项（顺序=mockup rail：文献库→阅读器→脉络；设置贴底独立渲染） */
const VIEWS: Array<{ id: ViewId; label: string; icon: JSX.Element }> = [
  {
    id: 'library',
    label: '文献库',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M5 4h4v16H5zM10 4h4v16h-4zM15.5 5l3.6-.8 3 14.8-3.6.8z" />
      </svg>
    )
  },
  {
    id: 'reader',
    label: '阅读器',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v16H6.5A2.5 2.5 0 0 0 4 21.5zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v16h4.5a2.5 2.5 0 0 1 2.5 2.5z" />
      </svg>
    )
  },
  {
    id: 'lineage',
    label: '脉络',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="6" cy="6" r="2" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="12" cy="18" r="2" />
        <path d="m7.5 7.5 3 8.5M16.5 7.5l-3 8.5M8 6h8" />
      </svg>
    )
  }
]

/** 设置图标（rail-foot 贴底） */
const ICON_SETTINGS = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z" />
  </svg>
)

/** 课题图标（v2 i-folder——文件夹形） */
const ICON_WS = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M3.5 7A2.5 2.5 0 0 1 6 4.5h4l2 2h5.5A2.5 2.5 0 0 1 20 9v8.5a2.5 2.5 0 0 1-2.5 2.5h-12A2.5 2.5 0 0 1 3 17.5z" />
  </svg>
)

/** 下载图标（v2 i-download——落盘箭头；A8 文献搜索与下载引擎占位） */
const ICON_DL = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M12 3v12M7 10l5 5 5-5M4 17v4h16v-4" />
  </svg>
)

/** 短名=显示名前 4 字符（CSS ellipsis 兜底——workspace.css .nm 截断）。
 *  码点安全截断（门一 d1-W5 回炉）：Array.from 按 Unicode 码点切——emoji/
 *  星面字符课题名不产出孤立代理对（UTF-16 slice 会截出半个）。已知局限：
 *  字素簇级（ZWJ 序列/区域指示符对/肤色修饰）仍可能在码点界切开——中文
 *  语境罕见，登记不处理（d1-N-e） */
function shortNameOf(name: string): string {
  return Array.from(name).slice(0, 4).join('')
}

export function Rail(props: { view: ViewId; onView: (v: ViewId) => void }): JSX.Element {
  const items = useWorkspaceStore((s) => s.items)
  const currentId = useWorkspaceStore((s) => s.currentId)
  // [F-WS-02] 引导态推导（INV-87 三条件——store 纯函数单源）
  const guide = isGuideState({ items, currentId })
  // 显示名：引导态=待选择（D2）；否则当前实名；无当前课题空串→兜底「课题」
  const displayName = selectDisplayWsName({ items, currentId })
  const shortName = displayName !== '' ? shortNameOf(displayName) : '课题'

  return (
    <nav className="rail" aria-label="主导航">
      {/* 轨顶品牌 logo（[v2 第二期] A15「无 logo」裁决随 v2 定案翻转——
          v2 稿 .brand 29px 三节点图形，非交互纯标识） */}
      <div className="rail-brand" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <circle cx="6" cy="6" r="2.2" />
          <circle cx="18" cy="6" r="2.2" />
          <circle cx="12" cy="18" r="2.2" />
          <path d="M7.8 7.2 10.6 16M16.2 7.2 13.4 16M8.2 6h7.6" />
        </svg>
      </div>
      {/* 课题项（[F-WS-02] 视图路由钮——管理页入口；引导态=唯一可用钮） */}
      <button
        type="button"
        className={`rail-item rail-ws${props.view === 'workspaces' ? ' active' : ''}`}
        aria-label="课题"
        aria-current={props.view === 'workspaces' ? 'page' : undefined}
        onClick={() => props.onView('workspaces')}
      >
        {ICON_WS}
        <span className="lb">{shortName}</span>
      </button>
      <button
        type="button"
        className="rail-item"
        aria-label="下载"
        title="下载文献 PDF 到相应文件夹（规划中）"
        disabled={guide}
        onClick={() => showToast(DL_TOAST_TEXT, 'info')}
      >
        {ICON_DL}
        <span className="lb">下载</span>
      </button>
      {VIEWS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`rail-item${props.view === item.id ? ' active' : ''}`}
          aria-label={item.label}
          aria-current={props.view === item.id ? 'page' : undefined}
          disabled={guide}
          onClick={() => props.onView(item.id)}
        >
          {item.icon}
          <span className="lb">{item.label}</span>
        </button>
      ))}
      <button
        type="button"
        className={`rail-item rail-foot${props.view === 'settings' ? ' active' : ''}`}
        aria-label="设置"
        aria-current={props.view === 'settings' ? 'page' : undefined}
        disabled={guide}
        onClick={() => props.onView('settings')}
      >
        {ICON_SETTINGS}
        <span className="lb">设置</span>
      </button>
    </nav>
  )
}
