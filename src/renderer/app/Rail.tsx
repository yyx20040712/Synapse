/**
 * [T3-P2] Rail —— B站式 72px 窄轨侧栏（无 logo，自「课题」始；A15/A10/A8）。
 *
 * ── 行为层 ──
 * - 七项：课题（点击弹课题弹层——A10 联动入口）→下载（占位 toast——A8 规划中）
 *   →rail-gap 12px 分隔→文献库/阅读器/脉络（视图切换，active 态）
 *   →rail-foot（margin-top:auto 贴底）→设置
 * - 视图四项接 App view 态：active 类+aria-current="page"（当前视图单选）
 * - 课题项=色点 span.rail-ws-dot（当前课题在 items 内的索引→6 色 token 轮转
 *   调色板）+短名 label（name 前 4 字符，无当前课题兜底「课题」）；弹层开合
 *   态本件自持（WsRailPopover），dirty 聚合值经 props 注入（App 编排先例）
 * - 切课题联动语义=ADR-0018 reload：switchTo 成功即整页 reload，色点/短名/
 *   状态条课题名 reload 后自新（跨格序列锁=app-shell.test 弹层 describe）
 *
 * ── 接口层 ──
 * - export function Rail(props: { view: ViewId; onView(v: ViewId): void; dirty: boolean })
 *
 * ── 架构层 ──
 * - app/ 组合根件（App 同级）：可引 features 域 store（workspace.store），
 *   禁引 reader/lineage 域（dirty 由 App 注入）；皮肤住 theme-shell.css
 *
 * ── 生命周期层 ──
 * - 不做：下载引擎本体（A8 占位）；课题新建/管理（设置页 WorkspaceSection）
 *
 * ── 文化层 ──
 * - SVG path 逐值誊自 mockup 2026-09-26_v2_theme-light.html L351-364（禁新依赖）
 * - 测试：tests/unit/renderer/app-shell.test.tsx（窄轨结构锁）+
 *   tests/e2e/shell-rail.spec.ts（真 Chromium 渲染）
 */
import { useState } from 'react'
import { showToast } from '../shared/ui/Toast'
import { useWorkspaceStore } from '../features/workspaces/workspace.store'
import { WsRailPopover } from './WsRailPopover'
import { DL_TOAST_TEXT, WS_DOT_PALETTE } from './rail-shared'

export type ViewId = 'library' | 'reader' | 'lineage' | 'settings'

/** 视图四项（顺序=mockup rail：文献库→阅读器→脉络；设置贴底独立渲染） */
const VIEWS: Array<{ id: ViewId; label: string; icon: JSX.Element }> = [
  {
    id: 'library',
    label: '文献库',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
      </svg>
    )
  },
  {
    id: 'reader',
    label: '阅读器',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M4 5c0-1 1-2 2-2h12c1 0 2 1 2 2v13l-3-2H6c-1 0-2-1-2-2z" />
        <path d="M8 8h8M8 11h6" />
      </svg>
    )
  },
  {
    id: 'lineage',
    label: '脉络',
    icon: (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <circle cx="6" cy="6" r="2.4" />
        <circle cx="18" cy="6" r="2.4" />
        <circle cx="12" cy="18" r="2.4" />
        <path d="M8 7.4l3 8M16 7.4l-3 8M8.4 6h7.2" />
      </svg>
    )
  }
]

/** 设置图标（rail-foot 贴底） */
const ICON_SETTINGS = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
  </svg>
)

/** 课题图标（mockup L353 文件夹形——描边风格与视图图标一致） */
const ICON_WS = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <path d="M4 6c0-1 1-2 2-2h4l2 2h6c1 0 2 1 2 2v9c0 1-1 2-2 2H6c-1 0-2-1-2-2z" />
    <path d="M4 11h16" />
  </svg>
)

/** 下载图标（mockup L357 取——A8 文献搜索与下载引擎占位） */
const ICON_DL = (
  <svg aria-hidden="true" viewBox="0 0 24 24">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M15.5 15.5L21 21M11 8.5v5M8.5 11h5" />
  </svg>
)

/** 短名=name 前 4 字符（CSS ellipsis 兜底——workspace.css .nm 截断）。
 *  码点安全截断（门一 d1-W5 回炉）：Array.from 按 Unicode 码点切——emoji/
 *  星面字符课题名不产出孤立代理对（UTF-16 slice 会截出半个）。已知局限：
 *  字素簇级（ZWJ 序列/区域指示符对/肤色修饰）仍可能在码点界切开——中文
 *  语境罕见，登记不处理（d1-N-e） */
function shortNameOf(name: string): string {
  return Array.from(name).slice(0, 4).join('')
}

export function Rail(props: { view: ViewId; onView: (v: ViewId) => void; dirty: boolean }): JSX.Element {
  const items = useWorkspaceStore((s) => s.items)
  const currentId = useWorkspaceStore((s) => s.currentId)
  const [open, setOpen] = useState(false)

  const currentIdx = items.findIndex((w) => w.id === currentId)
  const dotColor = currentIdx >= 0 ? (WS_DOT_PALETTE[currentIdx % WS_DOT_PALETTE.length] as string) : 'var(--faint)'
  const shortName = currentIdx >= 0 ? shortNameOf(items[currentIdx]?.name ?? '') : '课题'

  return (
    <>
      <nav className="rail" aria-label="主导航">
        {/* 课题项（A10 弹层入口）：rail-ws 类=外点关闭判定的触发钮锚 */}
        <button
          type="button"
          className="rail-item rail-ws"
          aria-label="课题"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="rail-ws-dot" style={{ background: dotColor }} aria-hidden="true" />
          {ICON_WS}
          <span className="lb">{shortName}</span>
        </button>
        <button
          type="button"
          className="rail-item"
          aria-label="下载"
          title="文献搜索与下载引擎（规划中）"
          onClick={() => showToast(DL_TOAST_TEXT, 'info')}
        >
          {ICON_DL}
          <span className="lb">下载</span>
        </button>
        <div className="rail-gap" aria-hidden="true" />
        {VIEWS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`rail-item${props.view === item.id ? ' active' : ''}`}
            aria-label={item.label}
            aria-current={props.view === item.id ? 'page' : undefined}
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
          onClick={() => props.onView('settings')}
        >
          {ICON_SETTINGS}
          <span className="lb">设置</span>
        </button>
      </nav>
      {open && <WsRailPopover dirty={props.dirty} onClose={() => setOpen(false)} />}
    </>
  )
}
