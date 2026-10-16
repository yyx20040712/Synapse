// b3: F-VISFB-41
/**
 * [F-VISFB-41] useLibPaneWidths —— 库页双侧栏（FolderNav 左栏/详情抽屉）拖宽
 * hook（use-sidebar-pane/SplitPane 先例同族；差异=双栏单会话源+主控裁决①
 * 拖拽期禁 setState-per-move——session ref+页根 CSS 变量直写，up/cancel 单次
 * 提交）。
 *
 * ── 行为层 ──
 * - 双栏界：fnav 默认 224/界 160–340；drawer 默认 316/界 240–460（默认=原
 *   CSS 固定值视觉零变；上下限自裁申报）。
 * - 中列保底（INV-73 塌列面在库页的动态闸）：MIDDLE_FLOOR=462 CSS 像素=
 *   固定四列 46+30+74+52+题名保底 120+间隙 5×14+行 padding 40+6+列表
 *   padding 12×2。拖宽上界=静态上界与「起点宽+max(0, 中列实测−保底)」取小
 *   ——中列已欠只禁再宽不强制缩（防首移跳变）；实测 0（无布局环境）跳过
 *   动态钳，静态界兜底。中列实测=.lib-main-col gBCR 宽÷uiScale（屏幕域
 *   折回 CSS 域）。
 * - delta 折算 uiScale（单向公式）：拖拽 delta 来自屏幕域（pointer clientX），
 *   写入 CSS 宽须 cssDelta = visualDelta ÷ uiScale——zoom 语义下 W CSS 像素
 *   渲染为 W×uiScale 屏幕像素，三档缩放下 1 屏幕像素 ≠ 1 CSS 像素。因子单点
 *   读 documentElement 内联 --ui-scale（App effect 单点写；theme-shell.css
 *   只读合同消费位——本票零改 zoom 载体）；缺失/非法回退 1。
 * - 拖拽会话（INV-14 同族：监听与 body 样式副作用同源清理）：
 *   | 态 | 事件 | 迁移 |
 *   | idle | pointerdown(手柄, 主键) | dragging（capture 指针+body userSelect/cursor+document 级 move/up/cancel 监听） |
 *   | dragging | pointermove | dragging（live=clamp(起点±visual÷uiScale, min, maxLive)；页根变量直写——零 setState） |
 *   | dragging | pointerup/cancel | idle（副作用还原+setWidth(live) 单次提交——cancel 亦提交防 DOM/态失配） |
 *   跨格序列守卫：dragging 中卸载→副作用还原（不得泄漏 body 样式/监听）。
 * - 键盘（APG separator）：ArrowLeft/Right ±16（use-sidebar-pane B5② 用户裁决
 *   步进值同源）；方向=「箭头推手柄」（fnav 右移变宽/drawer 左移变宽——与
 *   拖拽同向）；承载键吞默认，其余键零操作。
 * - 双击复位：onReset(side)=回默认宽（票面语义——非 SplitPane 折叠）。
 * - 持久化：localStorage 'synapse:libpane:fnav'/'synapse:libpane:drawer'
 *   （'synapse:' 前缀先例=SplitPane/use-sidebar-pane——本地 UI 偏好不经
 *   settings DB，票面禁新后端表合规）；载入越界/非数回退默认；不可用静默
 *   回退=设计行为。挂载后按「页容器实测宽−保底−对侧宽−双分隔条」对持久
 *   值再钳（跨窗口尺寸会话防复活超限——顺序=fnav 先让/抽屉后保〔详情面
 *   优先，自裁申报〕；极窄窗保底不可满足时止于各自 min=尽力语义；
 *   useLayoutEffect 单趟，实测 0 跳过）。
 * - React 状态更新面=拖拽落定/键盘步进/双击复位/挂载再钳（拖拽中期零
 *   setState；React 重渲染因 style 值未变不回写直写变量——单向不冲突）。
 *
 * ── 接口层 ──
 * - export function useLibPaneWidths(): LibPaneWidths（fnavWidth/drawerWidth/
 *   pageRef/pageStyle/onResizeStart/onResizeKey/onReset）
 *
 * ── 架构层 ──
 * - features/library 域内件：只 import react；DOM 读写限 .lib-page 子树
 *   （.lib-main-col 测量目标）与 documentElement 内联变量读；组合根接线=
 *   LibraryPage 消费（分隔条渲染归页面件）。
 *
 * ── 生命周期层 ── / ── 文化层 ──
 * - 预留：窗口 resize 期重钳（现=挂载单趟+交互期实测；resize 中 starving 沿
 *   承既有行为，自裁申报）；不做：折叠语义（SplitPane collapsed 不引入）。
 * - [回炉 W3 口径注记] 三档可满足区算术：默认共存（462+224+316+14=1016 CSS
 *   像素）可满足 ⇔ 页容器 CSS 宽≥1016——含 72px rail（.app-content-row zoom
 *   内）的屏幕阈=1088×uiScale（1/1.1/1.25 档→1088/1197/1360；默认窗 1280 在
 *   1.25 档<1360=默认态物理不可满足→挂载再钳兜底止于各 min 尽力语义；探针
 *   无 rail 口径阈=1016×uiScale〔=1088×t−72t〕）。现行档位单源 UI_SCALE
 *   三档 1/1.1/1.25 无 1.5；若扩档，阈值=1088×新档。
 * - 禁止 any；setState updater 纯净（持久化收口 useEffect 单点）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type {
  CSSProperties,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
  RefObject
} from 'react'

export type LibPaneSide = 'fnav' | 'drawer'

export const LIB_FNAV_DEFAULT_WIDTH = 224
export const LIB_FNAV_MIN_WIDTH = 160
export const LIB_FNAV_MAX_WIDTH = 340
export const LIB_DRAWER_DEFAULT_WIDTH = 316
export const LIB_DRAWER_MIN_WIDTH = 240
export const LIB_DRAWER_MAX_WIDTH = 460
/** 中列保底（手算：46+30+120+74+52+0+70+46+24=462——INV-73 题名 120 保底面） */
export const LIB_MIDDLE_FLOOR_PX = 462
/** 双分隔条合计流宽（.lib-sep 7px×2——挂载再钳的常量面） */
const SEP_TOTAL_PX = 14
/** 键盘步进（use-sidebar-pane B5② ±16 用户裁决同源） */
const KEY_STEP_PX = 16

const FNAV_KEY = 'synapse:libpane:fnav'
const DRAWER_KEY = 'synapse:libpane:drawer'

interface PaneBound {
  def: number
  min: number
  max: number
  key: string
}

const BOUNDS: Record<LibPaneSide, PaneBound> = {
  fnav: { def: LIB_FNAV_DEFAULT_WIDTH, min: LIB_FNAV_MIN_WIDTH, max: LIB_FNAV_MAX_WIDTH, key: FNAV_KEY },
  drawer: { def: LIB_DRAWER_DEFAULT_WIDTH, min: LIB_DRAWER_MIN_WIDTH, max: LIB_DRAWER_MAX_WIDTH, key: DRAWER_KEY }
}

/** localStorage 单点写（不可用回退=设计行为——SplitPane 先例） */
function persist(key: string, v: number): void {
  try {
    window.localStorage.setItem(key, String(v))
  } catch {
    /* 存储不可用：下次载入回退默认 */
  }
}

/** 载入持久化宽度：缺失/非数/越界一律回退默认宽（SplitPane loadWidth 先例语义） */
function loadWidth(side: LibPaneSide): number {
  const b = BOUNDS[side]
  try {
    const raw = window.localStorage.getItem(b.key)
    if (raw === null) return b.def
    const v = Number(raw)
    return Number.isFinite(v) && v >= b.min && v <= b.max ? v : b.def
  } catch {
    return b.def
  }
}

/** 动态上界：静态上界与「起点宽+中列可让出量」取小；中列已欠只禁再宽；
 *  实测 0（无布局环境，jsdom）跳过动态钳 */
export function budgetCap(startWidth: number, middleCssWidth: number, staticMax: number): number {
  if (middleCssWidth <= 0) return staticMax
  const give = Math.max(0, middleCssWidth - LIB_MIDDLE_FLOOR_PX)
  return Math.min(staticMax, startWidth + give)
}

/** uiScale 因子单点读（App effect 写 documentElement 内联 --ui-scale；缺失/非法回退 1） */
function readUiScale(): number {
  const v = Number.parseFloat(document.documentElement.style.getPropertyValue('--ui-scale'))
  return Number.isFinite(v) && v > 0 ? v : 1
}

/** 页根 CSS 变量直写（拖拽期主控裁决①：不经 state——React style 值未变不回写） */
function writeVar(pg: HTMLElement, side: LibPaneSide, w: number): void {
  pg.style.setProperty(side === 'fnav' ? '--lib-fnav-w' : '--lib-drawer-w', `${w}px`)
}

/** 拖拽会话快照（dragging 期间非空；live=当帧直写宽；pointerId=会话指针身份
 *  ——[回炉2] onMove/up/cancel 三处前置过滤，跨指事件不改写/不误结会话；
 *  jsdom 裸 MouseEvent 派发 pointerId=undefined，undefined===undefined 通过=
 *  存量用例零改） */
interface DragSession {
  side: LibPaneSide
  pointerId: number | undefined
  px: number
  start: number
  maxLive: number
  uiScale: number
  live: number
}

/** [回炉2 注·同式单源] 可容宽折算（挂载再钳与复位钳两处同式抽共享）：
 *  min(目标, 页容器−保底−对侧宽−双分隔条)，下限 min 兜底（尽力语义） */
function allowableWidth(target: number, pageCss: number, otherWidth: number, min: number): number {
  return Math.max(min, Math.min(target, pageCss - LIB_MIDDLE_FLOOR_PX - otherWidth - SEP_TOTAL_PX))
}

export interface LibPaneWidths {
  fnavWidth: number
  drawerWidth: number
  pageRef: RefObject<HTMLDivElement>
  pageStyle: CSSProperties
  onResizeStart(side: LibPaneSide, ev: ReactPointerEvent<HTMLDivElement>): void
  onResizeKey(side: LibPaneSide, ev: ReactKeyboardEvent<HTMLDivElement>): void
  onReset(side: LibPaneSide): void
}

export function useLibPaneWidths(): LibPaneWidths {
  const [fnavWidth, setFnavWidth] = useState(() => loadWidth('fnav'))
  const [drawerWidth, setDrawerWidth] = useState(() => loadWidth('drawer'))
  const [dragging, setDragging] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<DragSession | null>(null)

  // 持久化单点（width 每次提交即写；updater 纯净，副作用不进 updater）
  useEffect(() => {
    persist(FNAV_KEY, fnavWidth)
  }, [fnavWidth])
  useEffect(() => {
    persist(DRAWER_KEY, drawerWidth)
  }, [drawerWidth])

  /** 中列实测 CSS 宽（gBCR 屏幕域÷uiScale；无布局/目标不在场=0） */
  const measureMiddle = (): number => {
    const mid = pageRef.current?.querySelector('.lib-main-col')
    if (!(mid instanceof HTMLElement)) return 0
    return mid.getBoundingClientRect().width / readUiScale()
  }

  // 挂载后对持久值再钳（跨窗口尺寸会话防复活超限）：可容宽=页容器实测宽
  // （gBCR÷uiScale 折回 CSS 域）−中列保底−对侧宽−双分隔条；顺序=fnav 先让
  // /抽屉后保；极窄窗不可满足保底时止于各自 min（尽力语义）。单趟——读源
  // =localStorage 持久值（非首渲染 state），依赖故空
  useLayoutEffect(() => {
    const pg = pageRef.current
    if (pg === null) return
    const pageCss = pg.getBoundingClientRect().width / readUiScale()
    if (pageCss <= 0) return
    const fnavLoaded = loadWidth('fnav')
    const drawerLoaded = loadWidth('drawer')
    const fnavAllowed = allowableWidth(fnavLoaded, pageCss, drawerLoaded, BOUNDS.fnav.min)
    const drawerAllowed = allowableWidth(drawerLoaded, pageCss, fnavAllowed, BOUNDS.drawer.min)
    if (fnavAllowed !== fnavLoaded) setFnavWidth(fnavAllowed)
    if (drawerAllowed !== drawerLoaded) setDrawerWidth(drawerAllowed)
  }, [])

  // 拖拽会话：down 开启（body 副作用+document 级监听），up/cancel/卸载同源清理
  useEffect(() => {
    if (!dragging) return
    const prevSelect = document.body.style.userSelect
    const prevCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    const onMove = (ev: PointerEvent): void => {
      const s = sessionRef.current
      if (s === null || ev.pointerId !== s.pointerId) return
      // delta 折算：屏幕域位移→CSS 域（cssDelta=visual÷uiScale）；方向=fnav
      // 右移变宽/drawer 左移变宽（SplitPane side 先例同型）
      const visual = s.side === 'fnav' ? ev.clientX - s.px : s.px - ev.clientX
      const next = Math.min(s.maxLive, Math.max(BOUNDS[s.side].min, s.start + visual / s.uiScale))
      s.live = next
      const pg = pageRef.current
      if (pg !== null) writeVar(pg, s.side, next)
    }
    const finish = (ev: PointerEvent): void => {
      const s = sessionRef.current
      if (s === null || ev.pointerId !== s.pointerId) return
      sessionRef.current = null
      setDragging(false)
      // 单次提交（主控裁决①：React 状态只在拖拽落定更新；cancel 同提交防
      // DOM 变量与 state/持久化失配）
      if (s.side === 'fnav') setFnavWidth(s.live)
      else setDrawerWidth(s.live)
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
  }, [dragging])

  const onResizeStart = (side: LibPaneSide, ev: ReactPointerEvent<HTMLDivElement>): void => {
    // [回炉 W1] 多指并发守卫：会话在场时忽略新 pointerdown——防第二指覆写唯一
    // 会话槽（首指后续 move 驱动错误侧+垃圾宽落盘+遗弃栏变量失配残留）
    if (ev.button !== 0 || sessionRef.current !== null) return
    ev.preventDefault()
    // 显式捕获指针：出窗 up/cancel 仍递送（use-sidebar-pane 先例；不支持
    // 环境静默跳过，document 级监听兜底）
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId)
    } catch {
      /* 捕获不可用：document 级 up/cancel 监听仍收尾 */
    }
    const start = side === 'fnav' ? fnavWidth : drawerWidth
    sessionRef.current = {
      side,
      pointerId: ev.pointerId,
      px: ev.clientX,
      start,
      maxLive: budgetCap(start, measureMiddle(), BOUNDS[side].max),
      uiScale: readUiScale(),
      live: start
    }
    setDragging(true)
  }

  const onResizeKey = (side: LibPaneSide, ev: ReactKeyboardEvent<HTMLDivElement>): void => {
    // 方向=「箭头推手柄」：fnav 右移变宽/drawer 左移变宽（与拖拽同向）
    const widenKey = side === 'fnav' ? 'ArrowRight' : 'ArrowLeft'
    const narrowKey = side === 'fnav' ? 'ArrowLeft' : 'ArrowRight'
    const b = BOUNDS[side]
    const cur = side === 'fnav' ? fnavWidth : drawerWidth
    let next: number | null = null
    if (ev.key === widenKey) {
      next = Math.min(budgetCap(cur, measureMiddle(), b.max), cur + KEY_STEP_PX)
    } else if (ev.key === narrowKey) {
      next = Math.max(b.min, cur - KEY_STEP_PX)
    }
    if (next === null) return
    ev.preventDefault()
    if (side === 'fnav') setFnavWidth(next)
    else setDrawerWidth(next)
  }

  // [回炉 B1] 双击复位经中列保底钳（四条宽度写入路径〔拖拽 maxLive/键盘
  // budgetCap/挂载顺序钳/复位〕同闸）：复位值=min(默认, 页容器实测宽−保底−
  // 对侧实际宽−双分隔条)；极窄窗止于 min=尽力语义（挂载钳同式同源）
  const onReset = (side: LibPaneSide): void => {
    const b = BOUNDS[side]
    const pg = pageRef.current
    let target = b.def
    if (pg !== null) {
      const pageCss = pg.getBoundingClientRect().width / readUiScale()
      if (pageCss > 0) {
        const other = side === 'fnav' ? drawerWidth : fnavWidth
        target = allowableWidth(b.def, pageCss, other, b.min)
      }
    }
    if (side === 'fnav') setFnavWidth(target)
    else setDrawerWidth(target)
  }

  const pageStyle = {
    '--lib-fnav-w': `${fnavWidth}px`,
    '--lib-drawer-w': `${drawerWidth}px`
  } as CSSProperties

  return { fnavWidth, drawerWidth, pageRef, pageStyle, onResizeStart, onResizeKey, onReset }
}
