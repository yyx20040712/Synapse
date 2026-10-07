/**
 * [F-SLOTGRID-01 U1] useCapacityLayout —— 月框内容宽 W 量测+布局变更信号
 * （useWaterfallOffsets/timeline-waterfall.ts 退役接替件；设计书
 * docs/design/2026-10-07_f-slotgrid01-design.md v1.4 §5.2-1/§5.3）。
 *
 * - W 状态机：unmeasured（frameW=0——RO 缺席〔jsdom〕/空图无月框/读取非有限）
 *   →消费方降级=全部卡入首行单行渲染（capacity.ts capacities(0)=∞，DOM 序
 *   不变）；measured（W>0）→网格分行。**无迭代环**——瀑布不动点收敛环
 *   （MAX_ITER 守卫族）整体随本件退役=U1 核心简化。
 * - W 源=首个月框 getComputedStyle().width（布局盒读数——transform scale
 *   不影响 computed width〔zoom 正交的机制载体〕；同步 gBCR 读数受 zoom
 *   影响禁用作 W 源）。量测链=ResizeObserver（守卫先例
 *   `typeof ResizeObserver === 'undefined'` 跳过——timeline-zoom-hook.ts/
 *   EdgeOverlay.tsx 同款）→rAF 合并→布局后同步单次读；挂载帧同步首读
 *   （useLayoutEffect 已 commit——防首帧单行闪跳）。recomputeKey（渲染组
 *   引用）变化重挂观测对象（月框增删随组变——空图→非空转 measured 路径）。
 * - routeEpoch 三源 bump（设计 §5.3 v1.4——U1 换轨语义等价）：W 变（resize）
 *   +拖拽 settle（宿主 bumpRoute——card-drag-session 既有调用链沿承）；
 *   数据变（groups）由 EdgeOverlay effect deps 承载不经 epoch。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

export function useCapacityLayout(args: {
  contentRef: RefObject<HTMLDivElement | null>
  /** 渲染组引用（月框增删重挂 RO+重读 W） */
  recomputeKey: unknown
}): {
  /** 首月框内容宽（0=unmeasured——降级单行） */
  frameW: number
  /** 布局变更信号（W 变+拖拽 settle 两源 bump——EdgeOverlay 消费） */
  routeEpoch: number
  /** 拖拽 settle bump（宿主 ref 前置接线沿承） */
  bumpRoute(): void
} {
  const [frameW, setFrameW] = useState(0)
  const [routeEpoch, setRouteEpoch] = useState(0)
  const wRef = useRef(0)

  useLayoutEffect(() => {
    const content = args.contentRef.current
    if (content === null) return
    let raf = 0
    const read = (): void => {
      raf = 0
      const frame = content.querySelector('.month-frame')
      if (!(frame instanceof HTMLElement)) return // 空图无月框——unmeasured 保持
      const w = parseFloat(getComputedStyle(frame).width)
      const next = Number.isFinite(w) && w > 0 ? w : 0
      if (next !== wRef.current) {
        wRef.current = next
        setFrameW(next) // W 变=routeEpoch bump 源一（resize）
        setRouteEpoch((v) => v + 1)
      }
    }
    read() // 挂载帧同步首读（布局后单次——见头注）
    if (typeof ResizeObserver === 'undefined') return // jsdom/RO 缺席=unmeasured 降级
    const schedule = (): void => {
      if (raf !== 0) cancelAnimationFrame(raf)
      raf = requestAnimationFrame(read)
    }
    const ro = new ResizeObserver(schedule)
    const frame = content.querySelector('.month-frame')
    if (frame instanceof HTMLElement) ro.observe(frame)
    return () => {
      if (raf !== 0) cancelAnimationFrame(raf)
      ro.disconnect()
    }
    // deps 采 recomputeKey（宿主传入渲染组；contentRef 稳定 useRef）
  }, [args.contentRef, args.recomputeKey])

  return { frameW, routeEpoch, bumpRoute: () => setRouteEpoch((v) => v + 1) }
}
