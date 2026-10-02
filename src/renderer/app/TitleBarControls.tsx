/**
 * [R2-SH3] TitleBarControls —— frameless 自绘 caption 三键（bilibili 式）
 *
 * ── 行为层 ──
 * - 三键：最小化 / 最大化↔向下还原（maximized=true 时 aria-label 与图标均切
 *   「向下还原」——主控预裁）/ 关闭
 * - maximize 态状态机：
 *   | 态 | 含义 | 迁移 |
 *   | unknown(null) | 挂载初值未拉到 | get-state 应答 → true/false |
 *   | true | 窗口最大化（F-G9：fullscreen 进入亦发 true——图标反映占满屏） | unmaximize 沿 / toggle 应答 / leave-full-screen 沿且非常最大化 → false |
 *   | false | 常态 | maximize 沿（含双击 drag 区等系统行为）/ enter-full-screen 沿 → true |
 * - 点击 → api.system.windowControl({action})；应答回读 maximized 同步图标态
 *   （事件沿与应答双通道收敛到同一 setState；点击应答与事件沿必然同值，
 *   后到者胜=终态一致——get-state 初值应答例外：仅 unknown 态生效，防
 *   跨通道乱序旧快照覆盖，见 effect 内注释）
 *
 * ── 接口层 ──
 * - export function TitleBarControls(): JSX.Element（App.tsx header 右区挂载，
 *   版本号之后——版本号 margin-left:auto 吸收空隙，三键组排最右）
 *
 * ── 架构层 ──
 * - renderer → window.api.system.windowControl（既有机制零新面）；action 类型
 *   经 shared/ipc/schemas 单源复用（纯 type import，禁手写第二份）
 * - 皮肤住 theme-shell.css 类（B1 教训：禁内联 style 承载交互态——F-CSS-01
 *   自 theme.css 拆出）
 *
 * ── 生命周期层 ──
 * - effect：get-state 拉初值（时序自包含，不依赖 did-finish-load 推送——
 *   主控预裁②）+ onWindowState 订阅；卸载退订+丢弃迟到应答（alive 门）
 *
 * ── 文化层 ──
 * - 测试：tests/unit/windows/window-control.test.ts（皮肤锁）+
 *   tests/e2e/smoke.spec.ts（三键可见+toggle 真行为+drag/no-drag computed）
 */
import { useEffect, useState } from 'react'
import type { WindowControlAction } from '../../shared/ipc/schemas'

/** 内联 SVG 图标（stroke=currentColor——禁新依赖红线；10px 视觉尺寸） */
const ICON_MINIMIZE = (
  <svg aria-hidden="true" viewBox="0 0 10 10">
    <path d="M0.5 5h9" />
  </svg>
)
const ICON_MAXIMIZE = (
  <svg aria-hidden="true" viewBox="0 0 10 10">
    <rect x="0.75" y="0.75" width="8.5" height="8.5" />
  </svg>
)
const ICON_RESTORE = (
  <svg aria-hidden="true" viewBox="0 0 10 10">
    <path d="M2.75 0.75h5.25a1.25 1.25 0 0 1 1.25 1.25v5.25" />
    <rect x="0.75" y="2.75" width="6.5" height="6.5" />
  </svg>
)
const ICON_CLOSE = (
  <svg aria-hidden="true" viewBox="0 0 10 10">
    <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" />
  </svg>
)

export function TitleBarControls(): JSX.Element {
  // null=unknown 态（挂载初值未拉到——头注行为层状态机）
  const [maximized, setMaximized] = useState<boolean | null>(null)

  useEffect(() => {
    let alive = true
    // 初值拉取（主控预裁②：不依赖 load 事件推送；失败容忍——图标保守显示
    // 「最大化」，事件沿随时可校正）
    void window.api.system
      .windowControl({ action: 'get-state' })
      .then((r) => {
        // 门一 C1：应答回包与 window-state 事件走不同通道可乱序——迟到应答
        // 仅在 unknown 态生效，防旧快照覆盖事件已推送的新值（点击应答与事件
        // 沿必然同值，无此冲突，见 send()）
        if (alive && r.ok) setMaximized((prev) => (prev === null ? r.data.maximized : prev))
      })
      .catch(() => undefined)
    const off = window.apiEvents.onWindowState((e) => setMaximized(e.maximized))
    return () => {
      alive = false
      off()
    }
  }, [])

  function send(action: WindowControlAction): void {
    void window.api.system
      .windowControl({ action })
      .then((r) => {
        if (r.ok) setMaximized(r.data.maximized)
      })
      .catch(() => undefined)
  }

  const isMax = maximized === true
  // [F-UIRES-02 批 B R11] 三键补 title（唯一缺 title 的已图标化件）——与
  // aria-label 同源单变量（图标 10×10 既有规格沿承不迁）
  const maxLabel = isMax ? '向下还原' : '最大化'
  return (
    <div className="titlebar-controls">
      <button type="button" aria-label="最小化" title="最小化" className="titlebar-btn" onClick={() => send('minimize')}>
        {ICON_MINIMIZE}
      </button>
      <button
        type="button"
        aria-label={maxLabel}
        title={maxLabel}
        className="titlebar-btn"
        onClick={() => send('maximize-toggle')}
      >
        {isMax ? ICON_RESTORE : ICON_MAXIMIZE}
      </button>
      <button
        type="button"
        aria-label="关闭"
        title="关闭"
        className="titlebar-btn titlebar-btn-close"
        onClick={() => send('close')}
      >
        {ICON_CLOSE}
      </button>
    </div>
  )
}
