/**
 * [F-SLOTGRID-01 U1] useCapacityLayout —— 月框内容宽 W 量测+布局变更信号
 * （useWaterfallOffsets/timeline-waterfall.ts 退役接替件；设计书
 * docs/design/2026-10-07_f-slotgrid01-design.md v1.4 §5.2-1/§5.3）。
 *
 * - W 状态机：unmeasured（frameW=0——RO 缺席〔jsdom〕/空图无月框/读取非有限）
 *   →消费方降级=全部卡入首行单行渲染（capacity.ts capacities(0)=∞，DOM 序
 *   不变）；measured（W>0）→网格分行。**无迭代环**——瀑布不动点收敛环
 *   （MAX_ITER 守卫族）整体随本件退役=U1 核心简化。
 * - W 源=首个月框 getComputedStyle().width 读数**归一化为内容盒宽**
 *   （[F-VISFB-67 R3 裁定] W_content=computed width−padL−padR−borderL−
 *   borderR，五值全 computed 浮点读——禁 clientWidth 整数舍入）：capacity.ts
 *   头注契约=「坐标系=月框内容坐标（px）」，而 computed width=边框盒读数
 *   （border-box）恒大横 pad 24+横 border——该存量契约错位在每条容量入段带
 *   （W∈[200N−72,200N−44.8)）产生容量过估（改前=卡压缩承接 F-GEOMASSUME
 *   族根源之一，地板化+flex-shrink:0 后=末卡右缘裁切），归一化即根治（地板
 *   577→549.8 仍 n=3/m=2 参考形不变）。〔W4 口径区分〕border 差量=声明值
 *   27.2px（1.6×2）/Linux DPR1 真机 used 1px/侧实减 26——归一化取 computed
 *   used 值（值驱动非常数），两口径差 1.2px 不跨容量段（528 段界安全距>2px）。
 *   〔轮 3 B1〕归一化读取单源=下方 readFrameContentWidth 导出件——
 *   card-drag-session 拖拽容量输入同源消费（此前两处直读 raw computed
 *   width=两源分叉真缺陷：布局 [3,1]/拖拽 [4] 网格错插）。
 *   transform scale 不影响 computed width〔zoom 正交的机制载体〕；同步 gBCR
 *   读数受 zoom 影响禁用作 W 源。量测链=ResizeObserver（守卫先例
 *   `typeof ResizeObserver === 'undefined'` 跳过——timeline-zoom-hook.ts/
 *   EdgeOverlay.tsx 同款）→rAF 合并→布局后同步单次读；挂载帧同步首读
 *   （useLayoutEffect 已 commit——防首帧单行闪跳）。recomputeKey（渲染组
 *   引用）变化重挂观测对象（月框增删随组变——空图→非空转 measured 路径）。
 *   〔轮 3 N1〕空图（无月框）早退=复位 unmeasured（wRef/frameW 归 0）——
 *   头注「空图=unmeasured 保持」语义兑现（此前残留末次 measured 值）。
 * - routeEpoch 三源 bump（设计 §5.3 v1.4——U1 换轨语义等价）：W 变（resize）
 *   +拖拽 settle（宿主 bumpRoute——card-drag-session 既有调用链沿承）；
 *   数据变（groups）由 EdgeOverlay effect deps 承载不经 epoch。
 */
import { useLayoutEffect, useRef, useState, type RefObject } from 'react'

/**
 * [F-VISFB-67 R3·轮 3 B1] 月框内容盒宽归一化读取单源（导出件）：
 * computed width−padL−padR−borderL−borderR（五值 computed 浮点直读——
 * 禁 clientWidth 整数舍入/禁常数硬编码——平台 used border 值随 DPR 落定）。
 * 消费方=useCapacityLayout 量测链+card-drag-session 拖拽容量输入（两源
 * 合流单源——容量口径漂移即布局/拖拽分叉）。无效读数（NaN/≤0）→0
 * （unmeasured 语义——capacities(0)=∞ 降级单行）。
 */
export function readFrameContentWidth(frame: HTMLElement): number {
  const cs = getComputedStyle(frame)
  const w =
    parseFloat(cs.width) -
    parseFloat(cs.paddingLeft) -
    parseFloat(cs.paddingRight) -
    parseFloat(cs.borderLeftWidth) -
    parseFloat(cs.borderRightWidth)
  return Number.isFinite(w) && w > 0 ? w : 0
}

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
      if (!(frame instanceof HTMLElement)) {
        // [轮 3 N1] 空图复位 unmeasured（残留 measured 值退役——W 变=bump 源一语义）
        if (wRef.current !== 0) {
          wRef.current = 0
          setFrameW(0)
          setRouteEpoch((v) => v + 1)
        }
        return
      }
      const next = readFrameContentWidth(frame)
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
