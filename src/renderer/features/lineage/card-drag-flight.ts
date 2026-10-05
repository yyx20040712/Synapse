// b3: T3-P8
/**
 * [F-LGRAPH-01①U2] card-drag-flight —— settle FLIP 飞行机制（自 useCardDrag
 * 拆出，行为零变；直测=tests/unit/renderer/lineage-card-flight.test.ts）。
 *
 * ── 机制（三分支）──
 * - card=null（卡已卸载/视图切换）→立即 finish；
 * - 零位移（target 与起点差 <0.5px 纯几何判定）→清激活期禁断的 inline
 *   transition 后立即 finish（不过渡）；
 * - 位移飞行：flow 态测量（先清 dragging 期残留 inline fixed+恢复错位
 *   marginLeft 再量——终态布局含错位，飞行目标=错位位）→re-fixed 起点+
 *   SETTLE_TRANSITION（只含 left/top）→双 rAF 后置目标值→transitionend/
 *   transitioncancel/兜底定时器（~600ms≈飞行 .32s 两倍）任一先至即幂等清场。
 *
 * [回炉 R1] 瀑布错位 inline marginLeft 三点式：flow 态测量前**恢复**、fixed
 * 期压 0（left=margin edge 双计防线）、清场恢复——React style diff 不重写
 * 未变值，须自恢复非赖重渲染。[回炉轮 2] 恢复与清 transition 间强制回流
 * 分隔（否则两变更同落一个样式重算周期，after-change transition=类值照启
 * 过渡=清场瞬跳滑回）。
 *
 * [双 rAF 依据] React 迁组重建卡节点的场景（新父→unmount/mount——[F-UIRES-03
 * C3] 改月迁组路径已退役，防御面保留：新插元素首个样式周期无 before-change
 * style，同步改值不启过渡（transitionend 永不触发，e2e 探针实证）；双 rAF
 * 保证起点先入样式变更事件后再赋目标。
 */
import { contentScale } from './timeline-zoom'

/** settle 飞行过渡（.32s cubic-bezier(.22,.9,.26,1)——mockup L993 逐值） */
export const SETTLE_TRANSITION =
  'left .32s cubic-bezier(.22,.9,.26,1), top .32s cubic-bezier(.22,.9,.26,1)'

/** 飞行任务（拖拽松手径——finish=settle 落定收口）。
 *  [②U7] 坐标域=**内容坐标**（拖影——transform 祖先会劫持 fixed 定位，缩放
 *  正交：全部 left/top/宽经内容域承载）。
 *  [C3 甲案] hostOffset=包含块原点补偿（卡 offsetParent=.month-frame 的
 *  frameOrigin 内容坐标）：inline 写入=内容坐标−hostOffset（渲染定位域=
 *  frame padding box）。缺省 {0,0}=内容层直挂场景（单测视口恒等同形） */
export interface FlightJob {
  nodeId: string
  fromX: number
  fromY: number
  hostOffset?: { x: number; y: number }
  /** 拖前 React inline marginLeft（瀑布错位）——三点式恢复基准 */
  marginLeft0: string
  finish: () => void
}

/** 视口 rect→内容坐标（z 逆变换——contentEl=内容层[变换祖先后代基准]） */
function toContentBase(contentEl: HTMLElement | null, r: { left: number; top: number; width: number }): { left: number; top: number; width: number } {
  if (contentEl === null) return { left: r.left, top: r.top, width: r.width }
  const base = contentEl.getBoundingClientRect()
  const z = contentScale()
  return { left: (r.left - base.left) / z, top: (r.top - base.top) / z, width: r.width / z }
}

export function startFlight(card: HTMLElement | null, job: FlightJob, contentEl: HTMLElement | null = null): void {
  if (card === null) {
    job.finish()
    return
  }
  // [C3 甲案] 包含块补偿（缺省零——单测视口恒等同形）
  const ho = job.hostOffset ?? { x: 0, y: 0 }
  // flow 态测量：dragging 期残留的 inline 定位（position/left/top/width）先清
  // +强制回流再量；错位 marginLeft 拖起时已压 0——测量前恢复（零位移分支
  // 因此天然干净：已清再判，无残留）
  card.style.position = ''
  card.style.left = ''
  card.style.top = ''
  card.style.width = ''
  card.style.marginLeft = job.marginLeft0
  void card.offsetWidth
  const target = toContentBase(contentEl, card.getBoundingClientRect())
  if (Math.hypot(target.left - job.fromX, target.top - job.fromY) < 0.5) {
    // 零位移径不过 flight 分支——激活期禁断的 inline transition 就地清空回
    // 类值（不残留则错位变化重排动画永冻+零位移残留断言红）
    card.style.transition = ''
    job.finish() // 零位移（纯几何判定）——不过渡直接落定
    return
  }
  // [②U7] absolute（fixed 在 transform 祖先下错位；内容域坐标天然随缩放）
  // [C3 甲案] left/top 写入=内容坐标−hostOffset（渲染定位域=frame padding box）
  card.style.position = 'absolute'
  card.style.left = `${job.fromX - ho.x}px`
  card.style.top = `${job.fromY - ho.y}px`
  card.style.width = `${target.width}px`
  // absolute 期压 0（left=margin edge——双计防线同拖起面）
  card.style.marginLeft = '0'
  card.style.zIndex = '99'
  card.style.boxShadow = 'var(--shadow-drag)'
  card.style.transition = SETTLE_TRANSITION
  void card.offsetWidth // 强制回流：既有元素起点生效
  // 双 rAF 后置目标值（见头注）
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.style.left = `${target.left - ho.x}px`
      card.style.top = `${target.top - ho.y}px`
    })
  })
  // 双入口幂等收口：transitionend/cancel/兜底定时器任一先至即 finishOnce
  // （定时器=飞行 .32s≈2 倍——事件被外因吞没[settle 期切视图/unmount]时
  // 写不丢、phase 不永锁）
  let finished = false
  const cleanupFlight = (): void => {
    clearTimeout(timer)
    card.removeEventListener('transitionend', onEnd)
    card.removeEventListener('transitioncancel', onEnd)
    card.style.position = ''
    card.style.left = ''
    card.style.top = ''
    card.style.width = ''
    // 清场恢复错位基线+强制回流分隔（头注[回炉轮 2]）
    card.style.marginLeft = job.marginLeft0
    void card.offsetWidth
    card.style.zIndex = ''
    card.style.boxShadow = ''
    card.style.transition = ''
  }
  const finishOnce = (): void => {
    if (finished) return
    finished = true
    cleanupFlight()
    job.finish()
  }
  const onEnd = (e: Event): void => {
    // left|top 任一轴到位即落定（单轴位移面：另一轴无变化不启过渡不发声
    // ——e2e 探针实证纯纵向迁移仅 top 过渡，仅认 left 会吞唯一事件）
    if (e.type === 'transitionend') {
      const p = (e as TransitionEvent).propertyName
      if (p !== 'left' && p !== 'top') return
    }
    finishOnce()
  }
  const timer: ReturnType<typeof setTimeout> = setTimeout(finishOnce, 600)
  card.addEventListener('transitionend', onEnd)
  card.addEventListener('transitioncancel', onEnd) // 外因取消同径清场（防御面）
}
