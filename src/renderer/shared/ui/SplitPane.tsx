// b3: P7-A
/**
 * [SR2-UIK-01] SplitPane —— 可拖拽分隔条容器（工单：done / strong）
 *
 * ── 行为层 ──
 * - 两栏布局容器：pane 侧宽度受控拖拽（px，min/max 夹取），分隔条手柄
 *   role="separator"（aria-valuenow/min/max + aria-label，键盘 ArrowLeft/Right
 *   ±8px 与鼠标拖拽等价）；仅主键（button 0）启动拖拽会话；渲染序随 side——
 *   left 为 pane→手柄→main，right 为 main→手柄→pane（方向契约与视觉侧一致）
 * - main 槽可空（null）：仅渲染 pane+手柄且不占满宽——消费方可将主内容外置为
 *   父级稳定子节点（避免折叠切换时主子树重挂，ReaderPage 接线模式）
 * - 持久化：宽度写 localStorage 键 'synapse:splitpane:<paneId>'（前缀对齐
 *   src/renderer/shared/open-paper-bus.ts:12 的 'synapse:open-paper' 命名先例）；
 *   载入时越界值或越界 defaultWidth 一律夹取/回退
 * - collapsible：双击手柄折叠/恢复 pane，折叠三态（F-UI-03 扩展）：
 *   | 态 | pane 宽 | display | aria-valuenow |
 *   | --- | --- | --- | --- |
 *   | 展开态（collapsed=false） | width（拖拽/键盘可调） | 可见 | round(width) |
 *   | 窄条折叠（true 且 collapsedWidth 传入） | collapsedWidth | 保留（窄条） | collapsedWidth |
 *   | 隐藏折叠（true 且未传——旧行为） | width（记忆） | none | 0 |
 *   两类折叠态拖拽/键盘均不启动；受控折叠面（F-UI-03）：collapsed 传入=外部
 *   state 驱动（双击只上报 onCollapsedChange 不自改）；不传=内部 useState 缺省（零漂移红线）；
 *   未定义组合「非受控+传回调」=上报+自改并行（回调作无害通知——门一 N5 声明）
 * - 拖拽会话（INV-14 同族：监听与 body 样式副作用同源清理）：
 *   | 态 | 事件 | 迁移 |
 *   | --- | --- | --- |
 *   | idle | pointerdown(手柄, 主键) | dragging（body userSelect:none + cursor:col-resize + document 级 move/up/cancel 监听） |
 *   | dragging | pointermove | dragging（宽度=夹取(startW+Δ)；left 侧随右移变宽，right 侧相反） |
 *   | dragging | pointerup/cancel | idle（副作用还原+宽度持久化） |
 *   跨格序列守卫：dragging 中卸载组件→副作用必须还原（不得泄漏 body 样式/监听）
 *
 * ── 接口层 ──
 * - export function SplitPane(props: { paneId: string; side: 'left' | 'right';
 *     defaultWidth: number; min: number; max: number; collapsible?: boolean;
 *     collapsedWidth?: number; collapsed?: boolean;
 *     onCollapsedChange?: (collapsed: boolean) => void;
 *     children: { pane: ReactNode; main: ReactNode | null } }): JSX.Element
 *
 * ── 架构层 ──
 * - shared/ui 通用件：不 import store/features；localStorage 直用（renderer 本地
 *   UI 偏好，非跨进程数据——不经 settings DB，规约记录依据）
 * - 接缝：ReaderPage.tsx（Phase 3 阅读器组合根）左侧栏换用本组件（main 槽传 null，
 *   主内容外置稳定子位；折叠语义沿用 outlineOpen 条件渲染）
 *
 * ── 生命周期层 ──
 * - 预留：三栏嵌套（P7-C 笔记栏并列时复用）；不做：垂直分隔（本次仅水平）
 *
 * ── 文化层 ──
 * - localStorage 不可用（配额/禁用）按回退默认宽处理——静默回退为设计行为，
 *   规约记录依据，非吞错；setState updater 保持纯净（持久化收口在 width 的
 *   useEffect 单点执行，拖拽连续写入的频率为本地存储可接受代价）
 * - 禁止 any；组件 ≤250 行
 */
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent, ReactNode } from 'react'

/** localStorage 键前缀（对齐 open-paper-bus 'synapse:' 命名先例） */
const STORAGE_PREFIX = 'synapse:splitpane:'

/** 宽度持久化（不可用回退=设计行为，见文化层） */
function persistWidth(paneId: string, w: number): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + paneId, String(w))
  } catch {
    /* 存储不可用：下次载入回退默认宽 */
  }
}

/** 载入持久化宽度：缺失/不可用回退（夹取后的）默认宽，存值越界亦回退 */
function loadWidth(paneId: string, defaultWidth: number, min: number, max: number): number {
  const fallback = Math.min(max, Math.max(min, defaultWidth))
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + paneId)
    if (raw === null) {
      return fallback
    }
    const v = Number(raw)
    return Number.isFinite(v) && v >= min && v <= max ? v : fallback
  } catch {
    return fallback
  }
}

export function SplitPane(props: {
  paneId: string
  side: 'left' | 'right'
  defaultWidth: number
  min: number
  max: number
  collapsible?: boolean
  /** F-UI-03：折叠目标宽（px）——传入时折叠=可见窄条而非 display:none */
  collapsedWidth?: number
  /** F-UI-03：受控折叠真值（不传=非受控内部 useState——向后兼容红线） */
  collapsed?: boolean
  /** F-UI-03：折叠请求上报（受控模式双击手柄的唯一外沿） */
  onCollapsedChange?: (collapsed: boolean) => void
  children: { pane: ReactNode; main: ReactNode | null }
}): JSX.Element {
  const {
    paneId,
    side,
    defaultWidth,
    min,
    max,
    collapsible = false,
    collapsedWidth, collapsed: collapsedProp, onCollapsedChange,
    children
  } = props
  const [width, setWidth] = useState(() => loadWidth(paneId, defaultWidth, min, max))
  // 非受控折叠态（collapsedProp 传入时不驱动渲染——受控真值在外部 state）
  const [internalCollapsed, setInternalCollapsed] = useState(false)
  const collapsed = collapsedProp ?? internalCollapsed
  const [dragging, setDragging] = useState(false)
  /** 拖拽起点（屏幕 x + 起始宽）——dragging 期间非空 */
  const startRef = useRef<{ px: number; w: number } | null>(null)

  const clamp = (v: number): number => Math.min(max, Math.max(min, v))

  // 持久化单点：width 每次提交即写（拖拽连续移动/键盘步进/会话收尾统一覆盖，
  // setState updater 保持纯净——副作用不进 updater）
  useEffect(() => {
    persistWidth(paneId, width)
  }, [paneId, width])

  // 拖拽会话：down 开启（body 副作用 + document 级监听），up/cancel/卸载同源清理
  useEffect(() => {
    if (!dragging) {
      return
    }
    const prevSelect = document.body.style.userSelect
    const prevCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    const onMove = (ev: PointerEvent): void => {
      const s = startRef.current
      if (s === null) {
        return
      }
      const delta = side === 'left' ? ev.clientX - s.px : s.px - ev.clientX
      setWidth(clamp(s.w + delta))
    }
    const finish = (): void => {
      startRef.current = null
      setDragging(false)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', finish)
    document.addEventListener('pointercancel', finish)
    return () => {
      document.body.style.userSelect = prevSelect
      document.body.style.cursor = prevCursor
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', finish)
      document.removeEventListener('pointercancel', finish)
    }
  }, [dragging, min, max, side, paneId])

  const onHandleDown = (ev: ReactPointerEvent): void => {
    if (ev.button !== 0 || collapsed) {
      return
    }
    ev.preventDefault()
    startRef.current = { px: ev.clientX, w: width }
    setDragging(true)
  }

  const onHandleKey = (ev: ReactKeyboardEvent): void => {
    if (collapsed) {
      return
    }
    // 左栏右移变宽、右栏相反；±8px 与拖拽等价的键盘路径
    const dir = side === 'left' ? 1 : -1
    const step = ev.key === 'ArrowRight' ? 8 * dir : ev.key === 'ArrowLeft' ? -8 * dir : 0
    if (step === 0) {
      return
    }
    ev.preventDefault()
    setWidth((w) => clamp(w + step))
  }

  // 折叠三态（头注行为层表）：窄条折叠=collapsedWidth 可见宽；隐藏折叠=display:none 宽度记忆（旧行为）
  const paneStyle = collapsed
    ? collapsedWidth !== undefined
      ? { width: `${collapsedWidth}px` }
      : { width: `${width}px`, display: 'none' }
    : { width: `${width}px` }

  const paneNode = (
    <div data-testid="split-pane-pane" className="h-full min-h-0 shrink-0 overflow-hidden" style={paneStyle}>
      {children.pane}
    </div>
  )
  const handleNode = (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="侧栏宽度"
      aria-valuenow={collapsed ? (collapsedWidth ?? 0) : Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={collapsible ? '拖拽调宽；双击折叠/展开' : '拖拽调宽'}
      className="h-full w-1 shrink-0 cursor-col-resize"
      // R3-TH1：分隔线金化——侧栏右缘金渐隐线同款语法（端点保留 .15 可见度，
      // 全透明端点会削弱拖拽目标发现性）
      style={{ background: 'linear-gradient(180deg, var(--border-gold-a15), var(--border-gold-a50), var(--border-gold-a15))' }}
      onPointerDown={onHandleDown}
      onKeyDown={onHandleKey}
      onDoubleClick={() => {
        if (collapsible) {
          // F-UI-03 受控面：上报请求；非受控（collapsed prop 未传）才内部自改
          const next = !collapsed
          if (onCollapsedChange !== undefined) {
            onCollapsedChange(next)
          }
          if (collapsedProp === undefined) {
            setInternalCollapsed(next)
          }
        }
      }}
    />
  )
  const mainNode =
    children.main !== null ? (
      <div className="h-full min-h-0 min-w-0 flex-1">{children.main}</div>
    ) : null

  return (
    <div
      data-testid="split-pane-root"
      className={children.main === null ? 'flex h-full min-h-0 shrink-0' : 'flex h-full min-h-0 w-full'}
    >
      {side === 'left' ? (
        <>
          {paneNode}
          {handleNode}
          {mainNode}
        </>
      ) : (
        <>
          {mainNode}
          {handleNode}
          {paneNode}
        </>
      )}
    </div>
  )
}
