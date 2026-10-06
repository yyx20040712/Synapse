// b3: F-UIRES-03
/**
 * [F-UIRES-03 B4③] useSidebarPane —— 脉络右侧详情栏（LineagePage aside）
 * 调宽/收起状态 hook（逻辑层抽件：LineagePage 行数预算紧——拖拽会话+持久化
 * 整体驻本件，Page 只消费）。
 *
 * - 拖拽会话（INV-14 同族：监听与 body 样式副作用同源清理）：手柄在 aside
 *   右缘→右移变宽（width=clamp(起点宽+clientX 位移)），clamp 200–480
 *   （move 期即钳——SplitPane 先例；NavPane 落定钳的另一先例不取，拖拽中
 *   越界视觉更差）；仅主键（button 0）启动；up/cancel/卸载同源收尾；
 *   启动即 setPointerCapture（[RR1 d1-W1] 出窗 up 收尾防御，失败静默）。
 * - 持久化：宽='synapse:sidebar:width'（数字串）/收起='synapse:sidebar:
 *   collapsed'（'1'/'0'）——键名沿 SplitPane 'synapse:splitpane:<paneId>'
 *   冒号前缀命名先例（设计稿点号写法与仓惯例冲突，以仓惯例为准）；载入时
 *   越界值/非数回退默认宽 252。localStorage 不可用静默回退=设计行为
 *   （SplitPane.tsx 头注同源），setState updater 保持纯净（持久化收口在
 *   useEffect 单点）。
 * - 收起态=48px 窄条（渲染归 LineagePage；本 hook 只持态）：收起时拖拽不
 *   启动（窄条上调宽无意义——SplitPane collapsed 先例语义）。
 * - [F-UIRES-03 B5② v1.15 第五轮③] 键盘调宽（APG separator 模式）：手柄
 *   role=separator+tabIndex=0（可达性接线归 LineagePage）；onResizeKey 承载
 *   四键——ArrowLeft −16/ArrowRight +16 步进（clampSidebarWidth 同源钳）、
 *   Home/End 直达边界（SIDEBAR_MIN/MAX_WIDTH 常量直用）；其余键零操作；
 *   承载键 preventDefault（防 Home/End/箭头滚动页面）；收起态零操作（沿
 *   拖拽先例语义）。[F-ESC-01 R3] ArrowLeft/Right
 *   步进=函数式更新备查加固——闭包读值经 React 18 discrete flush 推演无
 *   丢步进，防御同帧连击。
 */
import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent as ReactKeyboardEvent, PointerEvent as ReactPointerEvent } from 'react'

/** 宽度值域（B4③ 票面：clamp 200–480；默认 252=CSS .lg-inspector 无 JS 回退同值） */
const SIDEBAR_DEFAULT_WIDTH = 252
export const SIDEBAR_MIN_WIDTH = 200
export const SIDEBAR_MAX_WIDTH = 480
/** 收起窄条宽（px） */
export const SIDEBAR_RAIL_WIDTH = 48
/** [B5②] 键盘步进量（v1.15 第五轮③用户裁决：±16px） */
const KEY_STEP_PX = 16

const WIDTH_KEY = 'synapse:sidebar:width'
const COLLAPSED_KEY = 'synapse:sidebar:collapsed'

/** 调宽钳（move 期即钳；[RR1 k1-N6/d1-N7] 收敛为模块内私有——单测经渲染文本
 *  钉 200/480 字面量，无直接消费面，原「导出供边界断言面消费」声明与事实不符） */
function clampSidebarWidth(v: number): number {
  return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, v))
}

/** localStorage 单点写（不可用回退=设计行为，见头注） */
function persist(key: string, v: string): void {
  try {
    window.localStorage.setItem(key, v)
  } catch {
    /* 存储不可用：下次载入回退默认 */
  }
}

/** 载入持久化宽度：缺失/非数/越界一律回退默认宽（SplitPane loadWidth 先例语义） */
function loadWidth(): number {
  try {
    const raw = window.localStorage.getItem(WIDTH_KEY)
    if (raw === null) return SIDEBAR_DEFAULT_WIDTH
    const v = Number(raw)
    return Number.isFinite(v) && v >= SIDEBAR_MIN_WIDTH && v <= SIDEBAR_MAX_WIDTH
      ? v
      : SIDEBAR_DEFAULT_WIDTH
  } catch {
    return SIDEBAR_DEFAULT_WIDTH
  }
}

/** 载入收起态：缺失/不可用=false（展开为缺省） */
function loadCollapsed(): boolean {
  try {
    return window.localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

export interface SidebarPane {
  width: number
  collapsed: boolean
  /** 手柄 pointerdown（右缘手柄：主键+未收起才开） */
  onResizeStart(ev: ReactPointerEvent): void
  /** [B5②] 手柄 keydown（APG separator 键盘调宽：ArrowLeft/Right ±16 步进+
   *  Home/End 直达边界；其余键零操作；收起态零操作） */
  onResizeKey(ev: ReactKeyboardEvent): void
  collapse(): void
  expand(): void
}

export function useSidebarPane(): SidebarPane {
  const [width, setWidth] = useState(loadWidth)
  const [collapsed, setCollapsed] = useState(loadCollapsed)
  // dragging=[RR1 k1-N6] 仅内部态（门控拖拽会话 effect）——外部零消费，不再随返回对象暴露
  const [dragging, setDragging] = useState(false)
  /** 拖拽起点（屏幕 x+起始宽）——dragging 期间非空 */
  const startRef = useRef<{ px: number; w: number } | null>(null)

  // 持久化单点（width/collapsed 每次提交即写——updater 纯净，副作用不进 updater）
  useEffect(() => {
    persist(WIDTH_KEY, String(width))
  }, [width])
  useEffect(() => {
    persist(COLLAPSED_KEY, collapsed ? '1' : '0')
  }, [collapsed])

  // 拖拽会话：down 开启（body 副作用+document 级监听），up/cancel/卸载同源清理
  useEffect(() => {
    if (!dragging) return
    const prevSelect = document.body.style.userSelect
    const prevCursor = document.body.style.cursor
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
    const onMove = (ev: PointerEvent): void => {
      const s = startRef.current
      if (s === null) return
      setWidth(clampSidebarWidth(s.w + (ev.clientX - s.px)))
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
  }, [dragging])

  const onResizeStart = (ev: ReactPointerEvent): void => {
    if (ev.button !== 0 || collapsed) return
    ev.preventDefault()
    // [RR1 d1-W1] 显式捕获指针：出窗释放的 up/cancel 仍递送至手柄（冒泡达
    // document 级监听收尾）——规范层 mouse pointer 无隐式捕获，防御性收口；
    // 不支持环境（jsdom 等 setPointerCapture 缺失/抛错）静默跳过，document
    // 级监听仍兜底。SplitPane 先例未捕获（Chromium 鼠标隐式捕获兜底成立），
    // 本件加固取规范安全侧，不动 SplitPane（票面范围外）。
    try {
      ev.currentTarget.setPointerCapture(ev.pointerId)
    } catch {
      /* 捕获不可用：document 级 up/cancel 监听仍收尾 */
    }
    startRef.current = { px: ev.clientX, w: width }
    setDragging(true)
  }

  // [B5②] 键盘调宽（APG separator）：四键承载+clamp/边界常量单源；收起态零操作
  const onResizeKey = (ev: ReactKeyboardEvent): void => {
    if (collapsed) return
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault()
      setWidth((w) => clampSidebarWidth(w - KEY_STEP_PX))
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault()
      setWidth((w) => clampSidebarWidth(w + KEY_STEP_PX))
    } else if (ev.key === 'Home') {
      ev.preventDefault()
      setWidth(SIDEBAR_MIN_WIDTH)
    } else if (ev.key === 'End') {
      ev.preventDefault()
      setWidth(SIDEBAR_MAX_WIDTH)
    }
  }

  return {
    width,
    collapsed,
    onResizeStart,
    onResizeKey,
    collapse: () => setCollapsed(true),
    expand: () => setCollapsed(false)
  }
}
