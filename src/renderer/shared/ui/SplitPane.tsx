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
 * - collapsible：双击手柄折叠/恢复 pane（折叠=display 隐藏宽度记忆；折叠态拖拽/
 *   键盘不启动、aria-valuenow 归零——隐藏栏无谓调宽）
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
  children: { pane: ReactNode; main: ReactNode | null }
}): JSX.Element {
  const { paneId, side, defaultWidth, min, max, collapsible = false, children } = props
  const [width, setWidth] = useState(() => loadWidth(paneId, defaultWidth, min, max))
  const [collapsed, setCollapsed] = useState(false)
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

  const paneStyle = collapsed ? { width: `${width}px`, display: 'none' } : { width: `${width}px` }

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
      aria-valuenow={collapsed ? 0 : Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      title={collapsible ? '拖拽调宽；双击折叠/展开' : '拖拽调宽'}
      className="h-full w-1 shrink-0 cursor-col-resize"
      // R3-TH1：分隔线金化——侧栏右缘金渐隐线同款语法（端点保留 .15 可见度，
      // 全透明端点会削弱拖拽目标发现性）
      style={{ background: 'linear-gradient(180deg, rgba(201,168,106,.15), rgba(201,168,106,.5), rgba(201,168,106,.15))' }}
      onPointerDown={onHandleDown}
      onKeyDown={onHandleKey}
      onDoubleClick={() => {
        if (collapsible) {
          setCollapsed((c) => !c)
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
