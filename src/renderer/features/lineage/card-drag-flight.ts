// b3: T3-P8
// b3: B3 commit B 子波 1（2026-11-22，设计稿 §5）：settle 飞行 translate 化——SETTLE_TRANSITION=translate .32s；飞行七步序
//（①清 inline 含 translate →②flow 量取 target（量取前恢复 marginLeft0）→③重挂 absolute+锚 left/top=target+translate=(from−target) 且
// transition:none →④强制回流（起点落定为 before-change style）→⑤赋 SETTLE_TRANSITION →⑥双 rAF 写 translate='0px 0px' →⑦
// transitionend(propertyName==='translate')/transitioncancel/600ms 兜底任一先至幂等清场（清场含 translate/will-change——style 回归空））。
// 避坑依据：translate 属性 none→'440px 0px' 可插值——起点与过渡同周期赋值会从恒等元起一条过渡（双 rAF 写 0 重定向触发
// transitioncancel→提前清场），故③④⑤序强制（起点期禁断过渡=正确性前提，非优化）。锚语义（Option A）：left/top=target 锚+translate 差值，
// 渲染位恒等式=锚+translate（INV-96 族）。onEnd 过滤由 left|top 改 propertyName==='translate'（left/top 过渡面退役，不留死容错）。
// b3: B3 commit B 子波 2（2026-11-22，设计稿 §2 布局屏障子态/§3.5）：布局终局屏障随批接线（routeEpoch bump 从 flight finish
// 移到布局终局——数据写时点不变）；审查回炉批（2026-11-22）：屏障工厂迁驻 drag-layout-barrier.ts（本件 ≤220 顶格解除——
// §4 表补行申报），实例由 useCardDrag ref 持有、session 侧接线四点（begin/noteExtend/noteFlightDone/isLayoutActive）。
/**
 * [F-LGRAPH-01①U2] card-drag-flight —— settle FLIP 飞行机制（自 useCardDrag 拆出；直测=tests/unit/renderer/lineage-card-flight.test.ts）。
 *
 * ── 机制（三分支）──
 * - card=null（卡已卸载/视图切换）→立即 finish；
 * - 零位移（target 与起点差 <0.5px 纯几何判定）→①②已清激活期 inline（含 translate）+恢复错位 marginLeft，就地清 transition 与
 *   will-change 后立即 finish（不过渡）；
 * - 位移飞行：七步序（见文件头注）——③重挂 absolute 写 width=target.width/marginLeft=0/zIndex=99/boxShadow=var(--shadow-drag)
 *   （现行四键保留），will-change 持续在场；⑦清场依次清 position/left/top/width/translate→恢复 marginLeft0→强制回流→清
 *   zIndex/boxShadow/transition/will-change（恢复与清 transition 间回流分隔=[回炉轮 2]：否则两变更同落一个样式重算周期，
 *   after-change transition=类值照启过渡=清场瞬跳滑回）。
 *
 * [回炉 R1] 瀑布错位 inline marginLeft 三点式：flow 态测量前**恢复**、absolute 期压 0（left=margin edge 双计防线）、清场恢复——
 * React style diff 不重写未变值，须自恢复非赖重渲染。
 * [双 rAF 依据] React 迁组重建卡节点的场景（新父→unmount/mount——改月迁组路径已退役，防御面保留）：新插元素首个样式周期无
 * before-change style，同步改值不启过渡（transitionend 永不触发）；双 rAF 保证起点先入样式变更事件后再赋目标。
 */
import { effectiveScale } from './timeline-zoom'

/** settle 飞行过渡（.32s cubic-bezier(.22,.9,.26,1)——mockup L993 逐值；[B3 §5] 承载键=translate 独立属性） */
export const SETTLE_TRANSITION = 'translate .32s cubic-bezier(.22,.9,.26,1)'

/** 飞行任务（拖拽松手径——finish=settle 落定收口）。
 *  [②U7→F-VISFB-31] 坐标域=**own 域**（拖影——transform 祖先会劫持 fixed 定位，缩放正交：全部 left/top/宽经 own 域承载，
 *  与 card-drag-session 会话域一致）。[C3 甲案] hostOffset=包含块原点补偿（卡 offsetParent=.month-frame 的 frameOrigin own 域坐标）：
 *  inline 写入=own 域−hostOffset（渲染定位域=frame padding box）。缺省 {0,0}=内容层直挂场景（单测视口恒等同形） */
export interface FlightJob {
  nodeId: string
  fromX: number
  fromY: number
  hostOffset?: { x: number; y: number }
  /** 拖前 React inline marginLeft（瀑布错位）——三点式恢复基准 */
  marginLeft0: string
  finish: () => void
}

/** [F-VISFB-31] 视口 rect→own 域（÷s_eff——contentEl=内容层[变换祖先后代基准]） */
function toContentBase(contentEl: HTMLElement | null, r: { left: number; top: number; width: number }): { left: number; top: number; width: number } {
  if (contentEl === null) return { left: r.left, top: r.top, width: r.width }
  const base = contentEl.getBoundingClientRect()
  const sEff = effectiveScale()
  return { left: (r.left - base.left) / sEff, top: (r.top - base.top) / sEff, width: r.width / sEff }
}

export function startFlight(card: HTMLElement | null, job: FlightJob, contentEl: HTMLElement | null = null): void {
  if (card === null) {
    job.finish()
    return
  }
  // [C3 甲案] 包含块补偿（缺省零——单测视口恒等同形）
  const ho = job.hostOffset ?? { x: 0, y: 0 }
  // ① 清 inline（激活键集：position/left/top/width+translate；will-change 飞行期持续在场——[B3 §5] 伴随键集）
  card.style.position = ''
  card.style.left = ''
  card.style.top = ''
  card.style.width = ''
  card.style.translate = ''
  // ② flow 态量取 target：错位 marginLeft 拖起时已压 0——测量前恢复（零位移分支因此天然干净：已清再判，无残留）
  card.style.marginLeft = job.marginLeft0
  void card.offsetWidth
  const target = toContentBase(contentEl, card.getBoundingClientRect())
  if (Math.hypot(target.left - job.fromX, target.top - job.fromY) < 0.5) {
    // 零位移径不过 flight 分支——激活期禁断的 inline transition 就地清空回类值+will-change 清（[B3 §5] 激活键集同步清、
    // 不进③ zIndex/boxShadow 写入；不残留则错位变化重排动画永冻+零位移残留断言红）
    card.style.transition = ''
    card.style.willChange = ''
    job.finish() // 零位移（纯几何判定）——不过渡直接落定
    return
  }
  // ③ 重挂 absolute+left/top=target 锚+translate=(from−target)——此时 transition:none（起点期禁断）
  card.style.position = 'absolute'
  card.style.left = `${target.left - ho.x}px`
  card.style.top = `${target.top - ho.y}px`
  card.style.width = `${target.width}px`
  // absolute 期压 0（left=margin edge——双计防线同拖起面）
  card.style.marginLeft = '0'
  card.style.translate = `${job.fromX - target.left}px ${job.fromY - target.top}px`
  card.style.zIndex = '99'
  card.style.boxShadow = 'var(--shadow-drag)'
  card.style.transition = 'none'
  // ④ 强制回流：起点落定为 before-change style（既有元素/新插元素通吃——恒等元起跳滑移防线 B1）
  void card.offsetWidth
  // ⑤ 赋 SETTLE_TRANSITION（translate .32s）——⑥ 双 rAF 后写目标值（见头注）
  card.style.transition = SETTLE_TRANSITION
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      card.style.translate = '0px 0px'
    })
  })
  // ⑦ 双入口幂等收口：transitionend(propertyName==='translate')/transitioncancel/兜底定时器任一先至即 finishOnce
  // （定时器=飞行 .32s≈2 倍——事件被外因吞没[settle 期切视图/unmount]时写不丢、phase 不永锁）
  let finished = false
  const cleanupFlight = (): void => {
    clearTimeout(timer)
    card.removeEventListener('transitionend', onEnd)
    card.removeEventListener('transitioncancel', onEnd)
    card.style.position = ''
    card.style.left = ''
    card.style.top = ''
    card.style.width = ''
    card.style.translate = ''
    // 清场恢复错位基线+强制回流分隔（头注[回炉轮 2]——恢复须落在 transition 仅含 translate 的样式周期内提交）
    card.style.marginLeft = job.marginLeft0
    void card.offsetWidth
    card.style.zIndex = ''
    card.style.boxShadow = ''
    card.style.transition = ''
    card.style.willChange = ''
  }
  const finishOnce = (): void => {
    if (finished) return
    finished = true
    cleanupFlight()
    job.finish()
  }
  const onEnd = (e: Event): void => {
    // [B3 §5] 只认 translate 轴到位（left/top 过渡面退役；transitioncancel 无 propertyName 同径清场——外因取消防御面）
    if (e.type === 'transitionend') {
      const p = (e as TransitionEvent).propertyName
      if (p !== 'translate') return
    }
    finishOnce()
  }
  const timer: ReturnType<typeof setTimeout> = setTimeout(finishOnce, 600)
  card.addEventListener('transitionend', onEnd)
  card.addEventListener('transitioncancel', onEnd)
}
