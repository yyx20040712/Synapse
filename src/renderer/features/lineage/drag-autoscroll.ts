/**
 * [F-VISFB-66 裁定 4] drag-autoscroll —— 拖拽自动滚动共享机制（设计书 v1.2
 * §G 终态+回炉轮 1 R1/R2/R12/R27 修正）。
 *
 * ── 接口契约（§G.2+R1）──
 * - AutoScrollSession={container, getCursorClient, onScrollFrame}——
 *   getCursorClient 返回 **null=尚无有效指针采样**（R1 hasClient 闸：首个
 *   有效采样前 tick 不施滚不调 onScrollFrame）；onScrollFrame=帧协议③④
 *   （幂等；托管泵/tick/scroll 监听三路同调）；
 * - startAutoScroll(s, {managed, horizontal})：managed=true（缺省）=模块 rAF 泵
 *   驱动（画线/笔记柄/调线）；false=纯 tick（card-drag——会话自有 rAF 顶部调
 *   tick(dtMs)，返回 {scrolled, containerRect}）；horizontal（缺省 false=纯 Y
 *   现状零变）=step 双轴施滚——[F-LINEUI-01①] card-drag 唯一启用点（拖卡至
 *   视口左右缘画布横滚），managed 三消费方不传=竖向语义零变；
 * - 帧协议：⓪suspend 检查→①读光标（null 闸）→②算深度施
 *   scrollTop/scrollLeft（X 轴仅 horizontal——Y 恒算）→③④onScrollFrame
 *   （施加后值）。scrolled=**scrollTop/scrollLeft 施加前后真差值任一轴真**
 *   （R12 语义横轴同承——到界/零位移/未采样恒 false）。
 *
 * ── 机制（W-06r2/W-07r2+R2）──
 * - ensure() 单例引用计数：blur/focus（window）+ 容器 frame 事件监听
 *   **按会话登记确切函数**（R2——release 精确 removeEventListener）；容器
 *   独立引用计数（同容器多会话共享一条 frame 监听，末会话释放时摘除）；
 * - suspend=布尔阀（blur→true/focus→false——无嵌套）；
 * - 容器 scroll 事件（window capture）→幂等派发 frame 事件→onScrollFrame。
 *
 * ── 速度曲线（§G.3+R27）──
 * - zone=容器 clientHeight/clientWidth×20%（≤0→该轴零步进守卫——容器口径
 *   非视口）；Vmax=1200 屏幕 px/s；v=Vmax×(depthPx/zonePx)；dt 钳 ≤50ms。
 *   横轴镜像=autoscrollStepX（F-LINEUI-01）。
 */
export interface AutoScrollSession {
  /** .timeline 根（滚动容器） */
  container: HTMLElement
  /** null=尚无有效指针采样（R1 hasClient 闸——首采样前不滚不算） */
  getCursorClient(): { clientX: number; clientY: number } | null
  /** 帧协议③④（幂等；托管泵/tick/scroll 监听三路同调） */
  onScrollFrame(): void
}

export interface AutoScrollHandle {
  stop(): void
  /** 纯步进（managed:false 形态——card-drag 自有 rAF 顶部调） */
  tick(dtMs: number): { scrolled: boolean; containerRect: DOMRect }
}

/** 速度上限（屏幕 px/s——§G.3 手算：700px 容器 zone=140px，60fps 最深 20px/帧） */
export const AUTOSCROLL_VMAX = 1200
/** 触发区比例（容器 clientHeight/clientWidth 的上下/左右各 20%——裁定 4 逐字；
 *  横轴同参镜像 F-LINEUI-01①） */
export const AUTOSCROLL_ZONE_RATIO = 0.2
/** dt 钳（ms——长帧防跳变） */
const AUTOSCROLL_DT_CAP_MS = 50
/** 容器帧事件名（scroll 事件→幂等派发——内部协议） */
const FRAME_EVENT = 'synapse-autoscroll-frame'

/** 模块级监听面（ensure 单例引用计数持有） */
interface ContainerEntry {
  /** [回炉 S1] 会话回调集扇出：帧事件向**全部活动会话**派发（sessionId 键——
   *  release 精确删除本会话回调；旧单 listener 形只绑首会话=实锤缺陷） */
  callbacks: Map<number, () => void>
  /** [定点修 B1] 容器 frame 监听句柄——末会话释放时精确 removeEventListener
   *  （旧形句柄丢失=监听随拖拽次数无界累积，k1/d1 r3 同族实锤） */
  listener: () => void
  /** 会话 id 发号器（容器级递增——避免键碰撞） */
  nextId: number
}
interface AutoscrollGlobal {
  refCount: number
  /** 真实 window 监听在籍数（blur/focus/scroll-capture=3——泄漏观测面） */
  windowListeners: number
  suspended: boolean
  onBlur: () => void
  onFocus: () => void
  onWindowScroll: () => void
  containers: Map<HTMLElement, ContainerEntry>
}
const g: AutoscrollGlobal = {
  refCount: 0,
  windowListeners: 0,
  suspended: false,
  onBlur: () => undefined,
  onFocus: () => undefined,
  onWindowScroll: () => undefined,
  containers: new Map()
}

/** 深度→速度→位移（纯函数——曲线/dt 钳/零高守卫单测面；横轴镜像=autoscrollStepX） */
export function autoscrollStep(
  container: { clientHeight: number },
  cursorClientY: number,
  containerRectTop: number,
  containerRectBottom: number,
  dtMs: number
): { scrollPx: number; zonePx: number; depthPx: number } {
  // R27：clientHeight≤0（未布局/隐藏）→零步进（zonePx 除零守卫）
  if (container.clientHeight <= 0) return { scrollPx: 0, zonePx: 0, depthPx: 0 }
  const zonePx = container.clientHeight * AUTOSCROLL_ZONE_RATIO
  const topZoneY = containerRectTop + zonePx
  const bottomZoneY = containerRectBottom - zonePx
  let depthPx = 0
  if (cursorClientY < topZoneY) depthPx = topZoneY - cursorClientY
  else if (cursorClientY > bottomZoneY) depthPx = cursorClientY - bottomZoneY
  else return { scrollPx: 0, zonePx, depthPx: 0 }
  const clampedDepth = Math.min(depthPx, zonePx)
  const v = AUTOSCROLL_VMAX * (clampedDepth / zonePx)
  const dt = Math.min(dtMs, AUTOSCROLL_DT_CAP_MS)
  // 向上滚=负位移（scrollTop 减）
  const sign = cursorClientY < topZoneY ? -1 : 1
  return { scrollPx: sign * v * (dt / 1000), zonePx, depthPx }
}

/** [F-LINEUI-01①] 深度→速度→位移横轴（纯函数——autoscrollStep 的横轴镜像：
 * scrollLeft/clientWidth/rectLeft/rectRight 坐标域完全对称；Rule of Three
 * 第 2 次重复——保持两函数镜像不抽公共核，曲线参数（Vmax/zone 比/dt 钳）
 * 与容器口径单源共享；左带=负位移（scrollLeft 减）。rectLeft/rectRight 取
 * border edge（含竖滚动条宽~15px）——与纵向 rectTop/Bottom 含横滚动条的
 * 既有形态同构沿承，zone 20% 粗粒度下不构成行为偏差不补偿。 */
export function autoscrollStepX(
  container: { clientWidth: number },
  cursorClientX: number,
  containerRectLeft: number,
  containerRectRight: number,
  dtMs: number
): { scrollPx: number; zonePx: number; depthPx: number } {
  // 零宽守卫（未布局/隐藏）→零步进（zonePx 除零防线——带内光标位变异判别）
  if (container.clientWidth <= 0) return { scrollPx: 0, zonePx: 0, depthPx: 0 }
  const zonePx = container.clientWidth * AUTOSCROLL_ZONE_RATIO
  const leftZoneX = containerRectLeft + zonePx
  const rightZoneX = containerRectRight - zonePx
  let depthPx = 0
  if (cursorClientX < leftZoneX) depthPx = leftZoneX - cursorClientX
  else if (cursorClientX > rightZoneX) depthPx = cursorClientX - rightZoneX
  else return { scrollPx: 0, zonePx, depthPx: 0 }
  const clampedDepth = Math.min(depthPx, zonePx)
  const v = AUTOSCROLL_VMAX * (clampedDepth / zonePx)
  const dt = Math.min(dtMs, AUTOSCROLL_DT_CAP_MS)
  // 向左滚=负位移（scrollLeft 减）
  const sign = cursorClientX < leftZoneX ? -1 : 1
  return { scrollPx: sign * v * (dt / 1000), zonePx, depthPx }
}

/** ensure() 单例引用计数（W-07r2+R2+S1）：window 三监听一次装+容器按会话登记
 * （返回 sessionId——release 精确摘除本会话回调） */
function ensure(s: AutoScrollSession): number {
  if (g.refCount === 0) {
    g.onBlur = (): void => {
      g.suspended = true
    }
    g.onFocus = (): void => {
      g.suspended = false
    }
    window.addEventListener('blur', g.onBlur)
    window.addEventListener('focus', g.onFocus)
    g.onWindowScroll = (): void => {
      // 容器 scroll 事件→幂等帧协议③④（W-06r2：滚轮/外部滚动同路）
      for (const [c, e] of g.containers) {
        void e
        c.dispatchEvent(new CustomEvent(FRAME_EVENT, { bubbles: false }))
      }
    }
    window.addEventListener('scroll', g.onWindowScroll, { capture: true, passive: true })
    g.windowListeners = 3
  }
  let entry = g.containers.get(s.container)
  if (entry === undefined) {
    // [回炉 S1+定点修 B1] 每容器一条 frame 监听（**句柄入条目**）——回调体
    // 向全部活动会话扇出；句柄不存=release 无法摘除=监听累积（r3 B 正身）
    const entry2: ContainerEntry = { callbacks: new Map(), nextId: 1, listener: () => undefined }
    entry2.listener = (): void => {
      for (const cb of entry2.callbacks.values()) cb()
    }
    s.container.addEventListener(FRAME_EVENT, entry2.listener)
    g.containers.set(s.container, entry2)
    entry = entry2
  }
  const sessionId = entry.nextId
  entry.nextId += 1
  entry.callbacks.set(sessionId, () => s.onScrollFrame())
  g.refCount += 1
  return sessionId
}

function release(s: AutoScrollSession, sessionId: number): void {
  const entry = g.containers.get(s.container)
  if (entry !== undefined) {
    // [回炉 S1+定点修 B1] 精确删除本会话回调；末会话=**摘除容器 frame 监听**
    // （removeEventListener）+删条目——旧形只删 Map 不摘 DOM 监听=泄漏
    entry.callbacks.delete(sessionId)
    if (entry.callbacks.size === 0) {
      s.container.removeEventListener(FRAME_EVENT, entry.listener)
      g.containers.delete(s.container)
    }
  }
  g.refCount = Math.max(0, g.refCount - 1)
  if (g.refCount === 0) {
    window.removeEventListener('blur', g.onBlur)
    window.removeEventListener('focus', g.onFocus)
    window.removeEventListener('scroll', g.onWindowScroll, { capture: true } as EventListenerOptions)
    g.windowListeners = 0
    // [定点修 B1] 防御面：残条目监听一并摘除（正常路径 release 已逐条摘）
    for (const [c, e] of g.containers) c.removeEventListener(FRAME_EVENT, e.listener)
    g.containers.clear()
    g.suspended = false
  }
}

export function startAutoScroll(
  s: AutoScrollSession,
  opts?: { managed?: boolean; horizontal?: boolean }
): AutoScrollHandle {
  const managed = opts?.managed !== false
  // [F-LINEUI-01①] horizontal 缺省 false=纯 Y 现状零变（managed 三消费方零改）
  const horizontal = opts?.horizontal === true
  const sessionId = ensure(s)
  let raf = 0
  let last = performance.now()
  let stopped = false
  const step = (dtMs: number): { scrolled: boolean; containerRect: DOMRect } => {
    // 帧协议⓪~④：suspend→hasClient 闸（R1）→算深度施双轴→真差值（R12 任一轴真）
    const rect = s.container.getBoundingClientRect()
    if (g.suspended) return { scrolled: false, containerRect: rect }
    const cur = s.getCursorClient()
    if (cur === null) return { scrolled: false, containerRect: rect } // R1 未采样闸
    // [F-LINEUI-01①·N-5] 外层 clientHeight 守卫按轴拆（旧形零高短路横轴）：
    // Y 分支守卫 clientHeight（恒算——现状）、X 分支守卫 clientWidth
    let moved = false
    if (s.container.clientHeight > 0) {
      const beforeTop = s.container.scrollTop
      const { scrollPx } = autoscrollStep(s.container, cur.clientY, rect.top, rect.bottom, dtMs)
      if (scrollPx !== 0) s.container.scrollTop += scrollPx
      if (Math.abs(s.container.scrollTop - beforeTop) > 0) moved = true
    }
    if (horizontal && s.container.clientWidth > 0) {
      const beforeLeft = s.container.scrollLeft
      const { scrollPx } = autoscrollStepX(s.container, cur.clientX, rect.left, rect.right, dtMs)
      if (scrollPx !== 0) s.container.scrollLeft += scrollPx
      if (Math.abs(s.container.scrollLeft - beforeLeft) > 0) moved = true
    }
    // R12：scrolled=施加前后真差值（到界 clamp/零位移=不减不调）
    if (moved) s.onScrollFrame() // ③④：施加后重算（幂等——scrollTop/scrollLeft=施加后值）
    return { scrolled: moved, containerRect: s.container.getBoundingClientRect() }
  }
  const pump = (): void => {
    const now = performance.now()
    step(now - last)
    last = now
    raf = requestAnimationFrame(pump)
  }
  if (managed) raf = requestAnimationFrame(pump)
  return {
    stop(): void {
      // R2：句柄级幂等位（双 stop 不负计数不拆他会话）
      if (stopped) return
      stopped = true
      if (raf !== 0) cancelAnimationFrame(raf)
      release(s, sessionId)
    },
    tick(dtMs: number): { scrolled: boolean; containerRect: DOMRect } {
      if (stopped) return { scrolled: false, containerRect: s.container.getBoundingClientRect() } // [S17] stopped 守卫
      return step(dtMs)
    }
  }
}

/** 自检口（仅测试消费——N-07r2+R2 容器计数面） */
export const __testAutoscrollState: {
  listenerCount(): number
  containerListenerCount(): number
  suspended: boolean
  activeSessions: number
} = {
  listenerCount(): number {
    // 真实在籍 window 监听计数（blur+focus+scroll-capture=3——漏移除即红）
    return g.windowListeners
  },
  containerListenerCount(): number {
    // [定点修 B1] 在籍容器 frame 监听数——条目与监听 1:1（末会话释放时
    // removeEventListener+删条目，此处=真实 DOM 监听在籍数）
    return g.containers.size
  },
  get suspended(): boolean {
    return g.suspended
  },
  get activeSessions(): number {
    return g.refCount
  }
}
