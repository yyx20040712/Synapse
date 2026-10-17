// b3: F-VISFB-41+F-VISFB-44
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
 *   | dragging | pointerup/cancel | idle（副作用还原+单次提交——有位移才提交：live≠start；零位移 up/cancel=不提交〔R1 回炉轮1——零位移≠用户显式拖拽，防基值/存值被覆写；有位移 cancel 亦提交防 DOM/态失配〕） |
 *   跨格序列守卫：dragging 中卸载→副作用还原（不得泄漏 body 样式/监听）。
 * - 键盘（APG separator）：ArrowLeft/Right ±16（use-sidebar-pane B5② 用户裁决
 *   步进值同源）；方向=「箭头推手柄」（fnav 右移变宽/drawer 左移变宽——与
 *   拖拽同向）；承载键吞默认，其余键零操作。
 * - 双击复位：onReset(side)=回默认宽（票面语义——非 SplitPane 折叠）。
 * - 持久化：localStorage 'synapse:libpane:fnav'/'synapse:libpane:drawer'
 *   （'synapse:' 前缀先例=SplitPane/use-sidebar-pane——本地 UI 偏好不经
 *   settings DB，票面禁新后端表合规）；载入越界/非数回退默认；不可用静默
 *   回退=设计行为。[F-VISFB-44 用户裁决②] 双轨制：基值=唯一持久化面，
 *   仅用户显式动作（拖拽落定/键盘步进/双击复位）更新；生效值=min(基值,
 *   环境可容)——对外接口即生效值（接口零扩）。挂载/RO 再钳按「页容器
 *   实测宽−保底−对侧基值−双分隔条」从基值重导生效值（跨窗口尺寸会话
 *   防塌列——顺序=fnav 先让/抽屉后保〔详情面优先，41 自裁沿承〕；极窄
 *   窗保底不可满足时止于各自 min=尽力语义；实测 0 跳过），钳零落盘；
 *   环境回宽 RO 触发生效值自动复原基值（用户显式拖宽值不再被一次开窗
 *   动作不可逆覆写）。
 * - React 状态更新面=拖拽落定/键盘步进/双击复位（写双轨）/挂载·RO 再钳
 *   （只写生效轨）（拖拽中期零 setState；React 重渲染因 style 值未变不
 *   回写直写变量——单向不冲突）。
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
 * - [裁决 P1-1 后] 尺寸变化再钳=ResizeObserver 页容器触发（挂载趟/启动档位
 *   跨格/窗口 resize 三态同源单函数 reclampNow——原「resize 期不重钳」申报
 *   缺口随之闭合；[F-VISFB-44] 读源改基值 ref 重导（非增量钳）→环境回宽
 *   活体复原生效值）；不做：折叠语义（SplitPane collapsed 不引入）。
 * - [回炉 W3 口径注记] 三档可满足区算术：默认共存（462+224+316+14=1016 CSS
 *   像素）可满足 ⇔ 页容器 CSS 宽≥1016——含 72px rail（.app-content-row zoom
 *   内）的屏幕阈=1088×uiScale（1/1.1/1.25 档→1088/1197/1360；默认窗 1280 在
 *   1.25 档<1360=默认态物理不可满足→挂载再钳兜底止于各 min 尽力语义；探针
 *   无 rail 口径阈=1016×uiScale〔=1088×t−72t〕）。现行档位单源 UI_SCALE
 *   三档 1/1.1/1.25 无 1.5；若扩档，阈值=1088×新档。
 * - 禁止 any；setState updater 纯净（持久化收口 useEffect 单点）。
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SEPARATOR_KEY_STEP_PX } from '@shared/constants'
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
/** 键盘步进（use-sidebar-pane B5② ±16 用户裁决同源——[F-VISFB-41 B3 起]
 * 收敛 @shared/constants SEPARATOR_KEY_STEP_PX 单源，dup-constants C-4d） */
const KEY_STEP_PX = SEPARATOR_KEY_STEP_PX

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
  // [F-VISFB-44] 双轨制：基值=唯一持久化面（初值=loadWidth 载入语义零改，
  // 仅用户显式动作更新）；生效值=渲染/消费面（初值=基值，挂载/RO 再钳重导）
  const [fnavBase, setFnavBase] = useState(() => loadWidth('fnav'))
  const [drawerBase, setDrawerBase] = useState(() => loadWidth('drawer'))
  const [fnavWidth, setFnavWidth] = useState(fnavBase)
  const [drawerWidth, setDrawerWidth] = useState(drawerBase)
  const [dragging, setDragging] = useState(false)
  const pageRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef<DragSession | null>(null)
  /** 基值镜像（渲染帧同步写——再钳在渲染流外触发〔RO 回调〕经 ref 取当帧
   *  基值作重导源；挂载趟值=state 初值=loadWidth 持久值） */
  const baseRef = useRef({ fnav: fnavBase, drawer: drawerBase })
  baseRef.current = { fnav: fnavBase, drawer: drawerBase }
  /** 生效值镜像（再钳冗余 setState 守卫用——同帧读取当帧生效值） */
  const effRef = useRef({ fnav: fnavWidth, drawer: drawerWidth })
  effRef.current = { fnav: fnavWidth, drawer: drawerWidth }

  // 持久化单点（[F-VISFB-44] 只挂基值变更——挂载/RO 自动钳零落盘；挂载趟
  // 首跑写回=载入值原样（缺省写默认幂等无害）；updater 纯净，副作用不进
  // updater）
  useEffect(() => {
    persist(FNAV_KEY, fnavBase)
  }, [fnavBase])
  useEffect(() => {
    persist(DRAWER_KEY, drawerBase)
  }, [drawerBase])

  /** [F-VISFB-44] 用户显式动作提交：写双轨（基值=live 落盘+生效值=live
   *  同值——键盘/复位的环境钳后值照常落盘=用户可感知语义，与 41 现状同） */
  const commitUser = (side: LibPaneSide, v: number): void => {
    if (side === 'fnav') {
      setFnavBase(v)
      setFnavWidth(v)
    } else {
      setDrawerBase(v)
      setDrawerWidth(v)
    }
  }

  /** 中列实测 CSS 宽（gBCR 屏幕域÷uiScale；无布局/目标不在场=0） */
  const measureMiddle = (): number => {
    const mid = pageRef.current?.querySelector('.lib-main-col')
    if (!(mid instanceof HTMLElement)) return 0
    return mid.getBoundingClientRect().width / readUiScale()
  }

  /** 再钳（[裁决 P1-1] 挂载趟与尺寸变化触发同源单函数；[F-VISFB-44] 从基值
   *  重导生效值（不读现生效值——环境回宽自动复原基值；只写生效轨，钳零
   *  落盘）：量测页容器 CSS 宽（gBCR÷uiScale）→顺序重导两栏（fnav 先让/
   *  抽屉后保；极窄止于各 min 尽力语义）；实测 0（无布局环境）跳过 */
  const reclampNow = (): void => {
    const pg = pageRef.current
    if (pg === null) return
    const pageCss = pg.getBoundingClientRect().width / readUiScale()
    if (pageCss <= 0) return
    const base = baseRef.current
    const eff = effRef.current
    const fnavNext = allowableWidth(base.fnav, pageCss, base.drawer, BOUNDS.fnav.min)
    const drawerNext = allowableWidth(base.drawer, pageCss, fnavNext, BOUNDS.drawer.min)
    if (fnavNext !== eff.fnav) setFnavWidth(fnavNext)
    if (drawerNext !== eff.drawer) setDrawerWidth(drawerNext)
  }

  // 挂载趟再钳（跨窗口尺寸会话防塌列——从基值重导生效值，零落盘）
  useLayoutEffect(() => {
    reclampNow()
  }, [])

  // [裁决 P1-1] 页容器尺寸变化再钳：ResizeObserver 触发（App 首渲染 small
  // 兜底→设置异步返回 large 只改 --ui-scale、LibraryPage 不重挂——deps[] 挂载
  // 趟不随档位重跑的跨格缺位由 RO 封堵；窗口 resize 同覆盖）。RO 仅作触发器，
  // 量测仍走 gBCR÷uiScale 单源；RO 缺位环境（jsdom）静默跳过（挂载趟仍在）；
  // 卸载 disconnect 同源清理（INV-14 族）
  useEffect(() => {
    const pg = pageRef.current
    if (pg === null || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(() => reclampNow())
    ro.observe(pg)
    return () => ro.disconnect()
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
      // DOM 变量与 state/持久化失配；[F-VISFB-44] 用户显式动作写双轨；
      // [R1 回炉轮1] 零位移 up/cancel≠用户显式拖拽——live===start（从未
      // move 过，var/state 零触碰）跳过提交防基值/存值被覆写）
      if (s.live !== s.start) commitUser(s.side, s.live)
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
    // [F-VISFB-44] 用户显式动作写双轨
    commitUser(side, next)
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
    // [F-VISFB-44] 用户显式动作写双轨
    commitUser(side, target)
  }

  const pageStyle = {
    '--lib-fnav-w': `${fnavWidth}px`,
    '--lib-drawer-w': `${drawerWidth}px`
  } as CSSProperties

  return { fnavWidth, drawerWidth, pageRef, pageStyle, onResizeStart, onResizeKey, onReset }
}
