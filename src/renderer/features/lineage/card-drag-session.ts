// b3: T3-P8
// lnfix2: extend 判定改冻结基准（grab 帧同步取值+激活后 rAF 校准——断点 A/B
// 同源消除）；registerFrame/framesRef 注册链退役（跨月联动死码）
/**
 * [F-LGRAPH-01①U2] card-drag-session —— pointer 拖拽会话域（自 useCardDrag
 * 拆出；几何判定=card-drag-geometry，飞行机制=card-drag-flight）。
 * [F-SLOTGRID-01 U3] 落点=算术网格（insertIndexFromGrid——INV-111 消费面，
 * 含源语义/推挤滞回消除/padding-box 换算语义=card-drag-grid.ts 头注；旧
 * rect 逐帧实测插入位判定随本批退役）。
 * [F-UIRES-03 C3] 改月弹层互斥闸随改月链退役删除
 * （INV-107）；源框物理域判定（overSourceFrame/PULL_BAND_PX）收窄语义=
 * 纯回弹护栏+同框下拉带（stretch 保留面）——非改月判定面（呈报主控处置）。
 * [F-VISFB-31] 会话坐标族整体 own 域（00A 三域律 client=origin+C×s_eff）：
 * 抓取偏移/拖影/包含块补偿/framePointer/pullPx/下拉带全部 ÷s_eff 或 ×s_eff
 * 换算（旧 ÷z B 域×offsetLeft/px 常量 C 域混算=u≠1 档错位——接缝①+同族
 * 自查面：下拉带/跟随量）。[R1·W-2 主控裁定] 激活阈（DRAG_THRESHOLD）=
 * 屏幕反馈量恒 client 域比较不换算（INV-144 补句）。
 *
 * ── 态空间（宪法状态纪律）──
 * drag ∈ {idle, pending(按下未过 5px), dragging, settle(飞行过渡期——
 * settle 落定编排归 useCardDrag)}：
 * - 拖拽无 Esc 取消（松手恒落当前槽）；settle 期再 pointerdown=忽略；
 *   阈值未过 pointerup=单击选中既有链（click 事件自然派发）
 * - [R5] pointercancel 同松手径：系统取消=落当前候选槽
 * - [R6] 未消费 click 抑制随新会话清零（残留会吞下次真单击）
 *
 * ── 写路径（无乐观写——P7B R5 同族）──
 * settle transitionend 清场后才回调 onSettleFinalize（编排层排队
 * onReorderMonthSlots）；写失败沿 store 既有。
 */
import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { frameKeyOf } from './lineage-timeline'
import type { FlightJob } from './card-drag-flight'
import { srcGroupIdsOf } from './card-drag-geometry'
import { insertIndexFromGrid } from './card-drag-grid'
import { clientToOwnPt, effectiveScale } from './timeline-zoom'

export type DragPhase = 'idle' | 'pending' | 'dragging' | 'settle'

/** 槽位预览（TimelineYears 渲染源：active=拖起[占位槽在场+拖卡离流]；
 *  active=false=settle 落位[卡回文档流@insertIdx+FLIP 飞行]） */
export interface DragSlotPreview {
  nodeId: string
  srcKey: string
  insertIdx: number
  active: boolean
  /** 指针在源月框内（框外槽淡化 .35） */
  overFrame: boolean
  /** [②U6] 框底缘下拉态（拖过底缘 x 带内=框高动画下拉腾新行+插位组末）
   *  [F-VISFB-22 C6] 触发=越未拉伸底缘即真（去旧 +82 上限——超上限再拖
   *  stretch 保持、框底单调不回落） */
  extend?: boolean
  /** [F-VISFB-22 C6] 连续跟随量（px——x 带内指针越未拉伸底缘 frameBottom0
   *  量，PULL_BAND_PX 封顶；0=未越缘/带外。消费面=TimelineYears 写入框
   *  inline --lg-pull → CSS calc(12px+var) 逐 move 跟随） */
  pullPx?: number
}

/** 激活阈值（px——mockup L944 同值） */
const DRAG_THRESHOLD = 5

/** [②U6] 源框底缘下拉带高（px——mockup §3.5）：overSourceFrame 实时判定与
 *  [lnfix2] 冻结基准判定两处共用单源。
 *  [F-VISFB-22 C6] 双角色：①触发带语义沿承（INV-98 实时域——overSourceFrame
 *  带上限不动）；②连续跟随封顶（pullPx 钳制上限+CSS 增量单源——TimelineYears
 *  消费写入 --lg-pull，theme-lineage.css 只知基准 12px+变量，INV-100 的
 *  94=12+82 值耦合由此解除） */
export const PULL_BAND_PX = 82

interface DragSession {
  nodeId: string
  srcKey: string
  frameEl: HTMLDivElement | null
  srcIds: string[]
  sx: number
  sy: number
  /** [②U7→F-VISFB-31] 抓取偏移=**own 域**（÷s_eff——拖影 absolute 视口偏移） */
  ox: number
  oy: number
  moved: boolean
  /** [②U7→F-VISFB-31] 拖影位置=own 域（flight job 同域传递） */
  ghost: { x: number; y: number }
  /** [C3 甲案] 包含块原点补偿：卡 offsetParent=.month-frame（frame padding
   *  box 原点）的**own 域坐标**——inline left/top 写入=ghost−frameOrigin（ghost
   *  数学保持 own 域，渲染定位域=frame；激活帧由「own 域 ghost − 流内
   *  offsetLeft/Top」两已知量导出，不读 frame 过渡期 rect——根除 frame 原点
   *  双计，INV-96 族；[F-VISFB-31] 旧实现 ghost=÷z（B 域）×offsetLeft（C 域）
   *  混算=u≠1 档抓取错位（00A 接缝①），两侧统一 own 域修复） */
  frameOrigin: { x: number; y: number }
  insertIdx: number
  /** [②U6] 原始槽位（回弹基准——源框外松手飞行落点） */
  srcIdx: number
  overFrame: boolean
  /** [②U6] 框底缘下拉态（冻结基准下拉带内——见 frameBottom0）
   *  [F-VISFB-22 C6] 触发沿连续语义（y>frameBottom0 即真，无上限） */
  extend: boolean
  /** [F-VISFB-22 C6] 连续跟随量（冻结基准底缘起越过量，PULL_BAND_PX 封顶） */
  pullPx: number
  /** [lnfix2] 冻结基准（pointerdown 抓取帧同步取值+激活后 rAF 校准一次）
   *  ——extend 判定源。实时 rect 会被占位槽腾行（+92）与 stretch padding
   *  （+94）推高（k1 断点 A/B——下拉带几何不可达+挂置即振荡），读实时则
   *  stretch 永不稳态；grab 时布局=拖前稳态（占位槽 128×72 与卡同构换位，
   *  高卡离流缩框的边界形由 rAF 校准兜住） */
  frameBottom0: number
  frameLeft0: number
  frameRight0: number
  /** [回炉 R1] 拖前 React inline marginLeft（瀑布错位）——拖起期压 0 防双计，
   *  清场恢复（React style diff 不重写未变值——须自恢复非赖重渲染） */
  marginLeft0: string
}

/** [②U6] 源框物理域命中=框内 ∪ 底缘 82px 下拉带（x 带内——腾新行面）。
 *  实时 rect 单源供两处：onMove 槽相位（淡化/插位）与 onUp 落位判定
 *  （松手时框已撑高，指针在撑高框内=落位组末，语义自洽）；extend 判定
 *  本身改读冻结基准（onMove 内联——见 frameBottom0 注）。
 *  [F-VISFB-31] 带高换算：PULL_BAND_PX=own px 常量，client 判定域须 ×s_eff
 *  （旧直加 client 坐标=带在 u≠1 档缩窄 1/u 倍——B/C 混算同族自查面） */
const overSourceFrame = (frameEl: HTMLDivElement | null, x: number, y: number): boolean => {
  if (frameEl === null) return false
  const fr = frameEl.getBoundingClientRect()
  if (x >= fr.left && x <= fr.right && y >= fr.top && y <= fr.bottom) return true
  return x >= fr.left && x <= fr.right && y > fr.bottom && y <= fr.bottom + PULL_BAND_PX * effectiveScale()
}

/** [②U7→F-VISFB-31] 视口点→own 域（÷s_eff；base=内容层 rect——判定时点取值；
 *  会话坐标族全部 own 域——与 offsetLeft/px 常量/CSS 写入同域，混算接缝①修复） */
const toOwn = (content: HTMLElement, clientX: number, clientY: number): { x: number; y: number } =>
  clientToOwnPt(content.getBoundingClientRect(), clientX, clientY)

/**
 * [F-SLOTGRID-01 U3] 指针→月框 padding-box 坐标（INV-111 命中系——预裁决 D2）：
 * frame gBCR 相对差÷s_eff（[F-VISFB-31] own 域——capacity 常量族/CARD_W 同系）
 * 后减 computed border 布局宽（border 内缘起算=padding-box 原点；computed
 * border=own px 与÷s_eff 结果同域直减）。
 * 框原点拖拽全程不动（框只向下生长）——逐 move 实读无缓存需求；jsdom
 * computed border 缺省空串→parseFloat NaN→0（零边框约定与单测桩同系）。
 */
const framePointer = (frameEl: HTMLDivElement, clientX: number, clientY: number): { x: number; y: number } => {
  const fr = frameEl.getBoundingClientRect()
  const sEff = effectiveScale()
  const cs = getComputedStyle(frameEl)
  const bl = Number.parseFloat(cs.borderLeftWidth) || 0
  const bt = Number.parseFloat(cs.borderTopWidth) || 0
  return { x: (clientX - fr.left) / sEff - bl, y: (clientY - fr.top) / sEff - bt }
}

export function useDragSession(args: {
  nodes: LineageNode[]
  /** [F-LGRAPH-01①U5] 拖拽闸：拖卡=edit 专属（browse/focus pointerdown 即拒） */
  dragEnabled: boolean
  /** 互斥闸：拾取中/线型弹层开（任一禁拖） */
  isPicking: boolean
  popOpen: boolean
  contentRef: RefObject<HTMLDivElement | null>
  /** 松手构造飞行任务落此（编排层 settle effect 消费） */
  onFlightReady(job: FlightJob): void
  /** settle 清场后路由重算信号（routeEpoch bump 既有链） */
  onRouteRecalc(): void
  /** settle 落定后月组全序写路径（无乐观写——飞行窗禁写） */
  onReorderMonthSlots?: (nodeIds: string[]) => void
}): {
  phase: DragPhase
  setPhase(p: DragPhase): void
  slot: DragSlotPreview | null
  setSlot(v: DragSlotPreview | null): void
  flightRef: React.MutableRefObject<FlightJob | null>
  handleCardPointerDown(nodeId: string, ev: ReactPointerEvent<HTMLElement>): void
  consumeClickSuppress(): boolean
} {
  const { nodes, contentRef } = args
  const [phase, setPhase] = useState<DragPhase>('idle')
  const [slot, setSlot] = useState<DragSlotPreview | null>(null)

  const sessionRef = useRef<DragSession | null>(null)
  const flightRef = useRef<FlightJob | null>(null)
  const suppressClickRef = useRef(false)

  const findCard = (nodeId: string): HTMLElement | null =>
    contentRef.current?.querySelector(`.tl-card[data-node-id="${nodeId}"]`) ?? null

  // ── pointer 会话（pending/dragging 期 document 级监听）──────────────
  useEffect(() => {
    if (phase !== 'pending' && phase !== 'dragging') return
    const onMove = (e: PointerEvent): void => {
      const s = sessionRef.current
      if (s === null) return
      const content = contentRef.current
      if (!s.moved) {
        // [R1·W-2 主控裁定回退] 激活阈=client 域屏幕反馈量（点击/拖拽判别阈=
        // 手部屏幕反馈——两侧同域比较不换算；原式沿承）
        if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < DRAG_THRESHOLD) return
        s.moved = true
        const card = findCard(s.nodeId)
        if (card !== null && content !== null) {
          const r = card.getBoundingClientRect()
          // [②U7→F-VISFB-31] 拖影=absolute+own 域（transform 祖先劫持 fixed）：
          // 起点/偏移经 ÷s_eff（s_eff=1 时与旧视口系同值）；偏移锚=pointerdown
          // 坐标 s.sx/s.sy（激活帧 e=首个 move 事件——非按点位）
          s.ox = (s.sx - r.left) / effectiveScale()
          s.oy = (s.sy - r.top) / effectiveScale()
          const ghostOwn = toOwn(content, r.left, r.top)
          s.ghost = ghostOwn
          // [C3 甲案] 包含块补偿：offsetLeft/Top=流内位（相对 frame padding
          // box——inline left:0 同基准）；frameOrigin=两已知量差（own 域同系——
          // 激活帧卡 inline=gFrame → 渲染位=原位零跳；move 帧 left=ghost−frameOrigin）
          const gFrame = { x: card.offsetLeft, y: card.offsetTop }
          s.frameOrigin = { x: ghostOwn.x - gFrame.x, y: ghostOwn.y - gFrame.y }
          s.marginLeft0 = card.style.marginLeft
          card.style.position = 'absolute'
          card.style.left = `${gFrame.x}px`
          card.style.top = `${gFrame.y}px`
          card.style.width = `${r.width / effectiveScale()}px`
          // [回炉 R1/B-1] absolute 盒 left 定位 margin edge——压 0 后 left=视觉
          // 位（无双计）；[回炉 R8/d1-B1] 同步禁断过渡（基类 margin-left
          // .25s 在场——不禁断则 82→0 启动 0.25s 过渡=拖起 +82px 滑移）
          card.style.marginLeft = '0'
          card.style.transition = 'none'
          // [INV-140] 四键+left/top 存续前提=节点保育（TimelineYears foster row 同父调和——跨父 remount 即灭）
        }
        setSlot({ nodeId: s.nodeId, srcKey: s.srcKey, insertIdx: s.insertIdx, active: true, overFrame: true, extend: false, pullPx: 0 })
        setPhase('dragging')
        // [lnfix2] 稳态校准（激活后 rAF 一帧——主控裁决 b 面）：占位槽首帧
        // 渲染后复取源框底缘/x 带（grab 基准=拖前布局，高卡离流缩框的边界
        // 形由此对齐）。已入带/会话已换代/框已卸载则跳过——防撑高框毒化
        // 基准（振荡回潮）与废快照
        requestAnimationFrame(() => {
          const el = s.frameEl
          if (sessionRef.current !== s || el === null || !el.isConnected || s.extend) return
          const fr = el.getBoundingClientRect()
          s.frameBottom0 = fr.bottom
          s.frameLeft0 = fr.left
          s.frameRight0 = fr.right
        })
      }
      // [②U7→F-VISFB-31] 指针→own 域−own 域抓取偏移（s_eff 判定时点取值——
      // 缩放正交）；[C3 甲案] inline 写入=ghost−frameOrigin（渲染定位域=frame
      // padding box——写入值=own px 与 CSS 写入系一致）
      const p = content !== null ? toOwn(content, e.clientX, e.clientY) : { x: e.clientX, y: e.clientY }
      s.ghost = { x: p.x - s.ox, y: p.y - s.oy }
      const card = findCard(s.nodeId)
      if (card !== null) {
        card.style.left = `${s.ghost.x - s.frameOrigin.x}px`
        card.style.top = `${s.ghost.y - s.frameOrigin.y}px`
      }
      // [lnfix2] extend 判定读冻结基准（grab 帧+校准值）：实时 rect 被占位槽
      //  腾行/stretch padding 推高（k1 断点 A/B——下拉带几何不可达+挂载即
      //  振荡），冻结后带可达且挂载不反噬判定；over（槽淡化/插位）沿实时单源。
      //  [F-VISFB-22 C6] 连续跟随：pullPx=x 带内指针越未拉伸底缘（frameBottom0）
      //  量、PULL_BAND_PX 封顶（框底逐 move 跟随一小段后恒驻 82）；extend 触发
      //  =越缘即真（去旧 +82 上限——超上限再拖两段 stretch 保持+框底单调，
      //  视检 C6「框底跟随一小段」）；x 带语义与 overSourceFrame 实时域
      //  （INV-98 触发带——回弹/落位判定）沿承零改。
      //  [F-VISFB-31] 越缘量÷s_eff=own px（--lg-pull 消费域=内容 own 域 CSS——
      //  旧 client 量直写=u≠1 档视觉跟随量失真 u 倍+封顶提前）
      const inPullBand =
        e.clientX >= s.frameLeft0 && e.clientX <= s.frameRight0 && e.clientY > s.frameBottom0
      const pullPx = inPullBand
        ? Math.min((e.clientY - s.frameBottom0) / effectiveScale(), PULL_BAND_PX)
        : 0
      const extend = inPullBand
      const over = overSourceFrame(s.frameEl, e.clientX, e.clientY)
      let nextIdx = s.insertIdx
      // [F-VISFB-22 C6] extend 分派门=over||extend：越缘跨入 move 单帧内实时
      // rect 尚未撑高（over 陈旧）不该压回插位——组末语义随触发即立（冻结
      // 基准权威）；overSourceFrame 本体（INV-98 回弹/落位/淡化域）零改，
      // overFrame 仍沿实时（次帧自校正）
      if ((over || extend) && s.frameEl !== null) {
        // [F-SLOTGRID-01 U3] 落点=含源网格算术（INV-111 消费面——设计 §5.5/
        //  预裁决 D1/D3）：rowCounts 含源卡（srcIds 全长），判定面不随占位槽
        //  腾位漂移（推挤滞回结构性消除——旧 rect 逐帧实测法随本批退役）；
        //  W=frame computed width 实时读（use-capacity-layout 同一 CSS 单源），
        //  读取失败（NaN/unmeasured）经 capacities 状态机降级单行语义。
        if (extend) nextIdx = s.srcIds.length - 1 // 新行空位=组末
        else {
          const p = framePointer(s.frameEl, e.clientX, e.clientY)
          const w = Number.parseFloat(getComputedStyle(s.frameEl).width)
          nextIdx = insertIndexFromGrid(p.x, p.y, w, s.srcIds.length, s.srcIdx)
        }
      }
      if (over !== s.overFrame || nextIdx !== s.insertIdx || extend !== s.extend || pullPx !== s.pullPx) {
        s.overFrame = over
        s.insertIdx = nextIdx
        s.extend = extend
        s.pullPx = pullPx
        setSlot((prev) =>
          prev === null ? prev : { ...prev, overFrame: over, insertIdx: nextIdx, extend, pullPx }
        )
      }
    }
    const onUp = (e: PointerEvent): void => {
      const s = sessionRef.current
      sessionRef.current = null
      if (s === null) return
      if (!s.moved) {
        setPhase('idle') // 阈值未过=click 链保活（选中由随后的 click 承载）
        return
      }
      suppressClickRef.current = true // 拖后 click 抑制（一次性——click 同步随后到达）
      // [F-LGRAPH-01②U6/退役行 7] 限本月=物理域：源月框外松手=回弹原位
      //（飞行落点=原始槽位 idx）——不写不弹 toast（INV-83 跨月拒绝子句退役，
      // 代码面零残留）；框内∪下拉带松手沿承候选槽落位（overSourceFrame 单源）
      const inSrcFrame = overSourceFrame(s.frameEl, e.clientX, e.clientY)
      const settleIdx = inSrcFrame ? s.insertIdx : s.srcIdx
      const others = s.srcIds.filter((id) => id !== s.nodeId)
      const finalIds = [...others.slice(0, settleIdx), s.nodeId, ...others.slice(settleIdx)]
      const changed = finalIds.join(' ') !== s.srcIds.join(' ')
      args.onFlightReady({
        nodeId: s.nodeId,
        fromX: s.ghost.x,
        fromY: s.ghost.y,
        // [C3 甲案] 飞行起点/目标写入同补偿域（flight 内 left/top=值−hostOffset）
        hostOffset: s.frameOrigin,
        marginLeft0: s.marginLeft0,
        finish: () => {
          setPhase('idle')
          setSlot(null)
          args.onRouteRecalc()
          if (changed) args.onReorderMonthSlots?.(finalIds)
        }
      })
      setSlot({ nodeId: s.nodeId, srcKey: s.srcKey, insertIdx: settleIdx, active: false, overFrame: true })
      setPhase('settle')
    }
    // [R5] pointercancel 同 onUp 径：系统取消（触控手势/设备抢占）=落当前
    // 候选槽（与松手同式清场——不回滚不写错位；mockup 无 cancel 样本取值申报）
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
    // args 回调经 ref 闭包稳定（finish 期读回调需最新——依赖注入点整组随会话
    // 读取，phase 之外零重挂）
  }, [phase, nodes])

  const handleCardPointerDown = (nodeId: string, ev: ReactPointerEvent<HTMLElement>): void => {
    // [R6] 未消费抑制随新会话清零（拖后 click 落在祖先时旗标残留会吞下次
    // 真单击一次——清零=抑制只作用于紧随本次拖拽的 click）
    suppressClickRef.current = false
    if (phase !== 'idle') return // settle/dragging/pending 期忽略
    if (!args.dragEnabled) return // [U5] 模式闸：拖卡=edit 专属（pointerdown 即拒）
    if (ev.button !== 0) return
    if (args.isPicking || args.popOpen) return // 拾取/弹层互斥
    const cardEl = ev.currentTarget
    const n = nodes.find((x) => x.id === nodeId)
    const frameEl = cardEl.closest('.month-frame') as HTMLDivElement | null
    if (n === undefined || frameEl === null) return
    const r = cardEl.getBoundingClientRect()
    // [lnfix2] 冻结基准 grab 帧同步取值（拖前稳态布局——卡未离流/占位槽未
    // 入驻；后续占位槽腾行与 stretch padding 推高均不再反噬判定）
    const fr0 = frameEl.getBoundingClientRect()
    const srcKey = frameKeyOf(n.year, n.month)
    const srcIds = srcGroupIdsOf(nodes, srcKey)
    sessionRef.current = {
      nodeId,
      srcKey,
      frameEl,
      srcIds,
      sx: ev.clientX,
      sy: ev.clientY,
      ox: ev.clientX - r.left,
      oy: ev.clientY - r.top,
      moved: false,
      ghost: { x: r.left, y: r.top },
      frameOrigin: { x: 0, y: 0 },
      insertIdx: srcIds.indexOf(nodeId),
      srcIdx: srcIds.indexOf(nodeId),
      overFrame: true,
      extend: false,
      pullPx: 0,
      frameBottom0: fr0.bottom,
      frameLeft0: fr0.left,
      frameRight0: fr0.right,
      marginLeft0: ''
    }
    try {
      cardEl.setPointerCapture(ev.pointerId)
    } catch {
      // 合成事件 pointerId 缺席（jsdom）——document 级监听已覆盖移动/松手
    }
    setPhase('pending')
  }

  const consumeClickSuppress = (): boolean => {
    const v = suppressClickRef.current
    suppressClickRef.current = false
    return v
  }

  return {
    phase,
    setPhase,
    slot,
    setSlot,
    flightRef,
    handleCardPointerDown,
    consumeClickSuppress
  }
}
