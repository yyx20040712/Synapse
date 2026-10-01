// b3: T3-P8
/**
 * [T3-P8] useCardDrag —— 槽位拖拽重排+改月飞行动画状态机 hook（mockup
 * L893-1010/L1101-1128 语义；编排本体驻此——LineageTimeline 增量红线）。
 *
 * ── 态空间（宪法状态纪律：三轴枚举）──
 * drag ∈ {idle, pending(按下未过 5px), dragging, settle(飞行过渡期)} ×
 * mode ∈ {view,edit} × composer ∈ {picker, popover, monthPop}：
 * - **view/edit 双态无 mode 门槛**（mockup pointerdown 无 mode 闸）
 * - picker≠idle 禁拖（拾取优先——mockup linkMode 闸 L936 同源）
 * - popover/monthPop 开禁拖
 * - 拖拽无 Esc 取消（松手恒落当前槽）
 * - settle 期再 pointerdown=忽略（dragging pointer-events:none 同义）
 * - 阈值未过 pointerup=单击选中既有链（click 事件自然派发）
 * - 跨格序列：拾取中拖禁/弹层开拖禁/拖中弹层不可触发（pointer 在飞）/
 *   settle 接新拖忽略/reorderMonthSlots 与同道写错峰=store 队列 FIFO 既有
 *
 * ── 写路径（无乐观写——P7B R5 同族）──
 * settle transitionend 清场后才排队：拖拽→onReorderMonthSlots(月组全序)；
 * 改月→onMoveNodeMonth（slot 键缺省=服务端组变 max+1 尾部）。写失败=error
 * 保存态+toast+重试沿 store 既有，UI 位置不回滚（改月预演驻留至数据落定）。
 *
 * ── 已知限制（mockup 原样）──
 * 飞行中连线不帧随动：拖起 .tl-edges dimmed+settle transitionend 单次
 * routeEpoch bump 重算（rAF 帧随动=S 级候选不强制）。
 */
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent, RefObject } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { showToast } from '../../shared/ui/toast-store'
import { applyMovePreview, frameKeyOf } from './lineage-timeline'
import type { TimelineYearGroup } from './lineage-timeline'

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
}

/** 改月飞行预演（写落定前渲染序接管——store 回填重排后自然对齐清除） */
export interface MonthMovePreview {
  nodeId: string
  year: number | null
  month: number | null
}

/** MonthPop 月份行（groups 派生单源） */
export interface MonthOption {
  year: number | null
  month: number | null
  count: number
}

/** 激活阈值（px——mockup L944 同值） */
const DRAG_THRESHOLD = 5
/** settle 飞行过渡（.32s cubic-bezier(.22,.9,.26,1)——mockup L993 逐值） */
const SETTLE_TRANSITION = 'left .32s cubic-bezier(.22,.9,.26,1), top .32s cubic-bezier(.22,.9,.26,1)'

/** 卡几何最小面（insertIndexFromRects 输入——纯函数可直测） */
export interface CardRect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * 槽位插入位计算（mockup L960-967 逐式）：同行（指针 y 在卡高 ±0.8h 带内）
 * 判卡左半（px<left+w/2）；跨行判上半（py<top+h/2）；无前置=末位。
 * 纯几何确定性（无 Date/无随机）。
 */
export function insertIndexFromRects(rects: readonly CardRect[], px: number, py: number): number {
  let idx = rects.length
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i]!
    const sameRow = py > r.top - r.height * 0.8 && py < r.top + r.height + r.height * 0.8
    const before = sameRow ? px < r.left + r.width / 2 : py < r.top + r.height / 2
    if (before) {
      idx = i
      break
    }
  }
  return idx
}

/** 改月 toast 标签（mockup L1125：「N 年 M 月」/未定月；null 年无 mockup
 *  样本——退「M 月」/未定月，取值申报） */
export function moveTargetLabel(year: number | null, month: number | null): string {
  if (month === null) return '未定月'
  if (year === null) return `${month} 月`
  return `${year} 年 ${month} 月`
}

interface DragSession {
  nodeId: string
  srcKey: string
  frameEl: HTMLDivElement | null
  srcIds: string[]
  sx: number
  sy: number
  ox: number
  oy: number
  moved: boolean
  ghost: { x: number; y: number }
  insertIdx: number
  overFrame: boolean
  /** [回炉 R1] 拖前 React inline marginLeft（瀑布错位）——fixed 期压 0 防双计，
   *  清场恢复（React style diff 不重写未变值——须自恢复非赖重渲染） */
  marginLeft0: string
}

interface FlightJob {
  nodeId: string
  fromX: number
  fromY: number
  /** [回炉 R1] flow 态测量前恢复/fixed 期压 0/清场恢复（三点同值） */
  marginLeft0: string
  finish: () => void
}

export function useCardDrag(args: {
  nodes: LineageNode[]
  groups: TimelineYearGroup[]
  isEditing: boolean
  isPicking: boolean
  popOpen: boolean
  contentRef: RefObject<HTMLDivElement | null>
  onReorderMonthSlots?: (nodeIds: string[]) => void
  onMoveNodeMonth?: (nodeId: string, year: number | null, month: number | null) => void
  /** settle 清场后路由重算信号（routeEpoch bump 既有链） */
  onRouteRecalc(): void
}): {
  phase: DragPhase
  slot: DragSlotPreview | null
  movePreview: MonthMovePreview | null
  flashKey: string | null
  monthPop: { nodeId: string; cx: number; cy: number; year: number | null; month: number | null } | null
  monthPopMonths: MonthOption[]
  renderGroups: TimelineYearGroup[]
  handleCardPointerDown(nodeId: string, ev: ReactPointerEvent<HTMLElement>): void
  handleYmClick(nodeId: string, ev: ReactMouseEvent<HTMLElement>): void
  pickMonth(year: number | null, month: number | null): void
  registerFrame(key: string, el: HTMLDivElement | null): void
  consumeClickSuppress(): boolean
} {
  const { nodes, groups, contentRef } = args
  const [phase, setPhase] = useState<DragPhase>('idle')
  const [slot, setSlot] = useState<DragSlotPreview | null>(null)
  const [movePreview, setMovePreview] = useState<MonthMovePreview | null>(null)
  const [flashKey, setFlashKey] = useState<string | null>(null)
  const [monthPop, setMonthPop] = useState<{
    nodeId: string
    cx: number
    cy: number
    year: number | null
    month: number | null
  } | null>(null)

  const sessionRef = useRef<DragSession | null>(null)
  const flightRef = useRef<FlightJob | null>(null)
  const framesRef = useRef(new Map<string, HTMLDivElement>())
  const suppressClickRef = useRef(false)

  const findCard = (nodeId: string): HTMLElement | null =>
    contentRef.current?.querySelector(`.tl-card[data-node-id="${nodeId}"]`) ?? null

  /** 指针命中的月组框（注册面遍历——纯几何，无 elementFromPoint） */
  const frameAt = (px: number, py: number): HTMLDivElement | null => {
    for (const el of framesRef.current.values()) {
      const r = el.getBoundingClientRect()
      if (px >= r.left && px <= r.right && py >= r.top && py <= r.bottom) return el
    }
    return null
  }

  /** 源月组全序 id（groups 派生——渲染序单源；组缺省防御=nodes 过滤序） */
  const srcGroupIds = (srcKey: string): string[] => {
    const [ys, ms] = srcKey.split('|')
    const g = groups.find(
      (gr) => String(gr.year) === ys && gr.months.some((m) => String(m.month) === ms)
    )
    const monthGroup = g?.months.find((m) => String(m.month) === ms)
    if (monthGroup !== undefined) return monthGroup.nodes.map((n) => n.id)
    const year = ys === 'null' ? null : Number(ys)
    const month = ms === 'null' ? null : Number(ms)
    return nodes.filter((n) => n.year === year && n.month === month).map((n) => n.id)
  }

  // ── pointer 会话（pending/dragging 期 document 级监听）──────────────
  useEffect(() => {
    if (phase !== 'pending' && phase !== 'dragging') return
    const onMove = (e: PointerEvent): void => {
      const s = sessionRef.current
      if (s === null) return
      if (!s.moved) {
        if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < DRAG_THRESHOLD) return
        s.moved = true
        const card = findCard(s.nodeId)
        if (card !== null) {
          const r = card.getBoundingClientRect()
          s.ghost = { x: r.left, y: r.top }
          s.marginLeft0 = card.style.marginLeft
          card.style.position = 'fixed'
          card.style.left = `${r.left}px`
          card.style.top = `${r.top}px`
          card.style.width = `${r.width}px`
          // [回炉 R1/B-1] fixed 盒 left 定位 margin edge——React inline 错位
          // 仍在则 border box 再偏 +offset（拖起瞬跳/拖动恒偏）；压 0 后
          // left=视觉 rect.left（无双计）
          card.style.marginLeft = '0'
          // [回炉 R8/d1-B1] 同步禁断过渡：基类 margin-left .25s 在场且压 0
          // 发生于 .dragging 类挂载前（setPhase 异步）——不禁断则 82→0 启动
          // 0.25s 过渡=拖起 +82px 滑移；此后 settle 段 SETTLE_TRANSITION
          //（只含 left/top）接管，清场 transition='' 回类值
          card.style.transition = 'none'
        }
        setSlot({ nodeId: s.nodeId, srcKey: s.srcKey, insertIdx: s.insertIdx, active: true, overFrame: true })
        setPhase('dragging')
      }
      s.ghost = { x: e.clientX - s.ox, y: e.clientY - s.oy }
      const card = findCard(s.nodeId)
      if (card !== null) {
        card.style.left = `${s.ghost.x}px`
        card.style.top = `${s.ghost.y}px`
      }
      const over = s.frameEl !== null && frameContains(s.frameEl, e.clientX, e.clientY)
      let nextIdx = s.insertIdx
      if (over && s.frameEl !== null) {
        const rects = Array.from(s.frameEl.querySelectorAll<HTMLElement>('.tl-card[data-node-id]'))
          .filter((c) => c.dataset.nodeId !== s.nodeId)
          .map((c) => c.getBoundingClientRect())
        nextIdx = insertIndexFromRects(rects, e.clientX, e.clientY)
      }
      if (over !== s.overFrame || nextIdx !== s.insertIdx) {
        s.overFrame = over
        s.insertIdx = nextIdx
        setSlot((prev) =>
          prev === null ? prev : { ...prev, overFrame: over, insertIdx: nextIdx }
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
      const overEl = frameAt(e.clientX, e.clientY)
      if (overEl !== null && overEl !== s.frameEl) {
        showToast('不能跨月拖动——请进入编辑模式，点卡片月标修改月份', 'error')
      }
      const others = s.srcIds.filter((id) => id !== s.nodeId)
      const finalIds = [...others.slice(0, s.insertIdx), s.nodeId, ...others.slice(s.insertIdx)]
      const changed = finalIds.join(' ') !== s.srcIds.join(' ')
      flightRef.current = {
        nodeId: s.nodeId,
        fromX: s.ghost.x,
        fromY: s.ghost.y,
        marginLeft0: s.marginLeft0,
        finish: () => {
          setPhase('idle')
          setSlot(null)
          args.onRouteRecalc()
          if (changed) args.onReorderMonthSlots?.(finalIds)
        }
      }
      setSlot({ nodeId: s.nodeId, srcKey: s.srcKey, insertIdx: s.insertIdx, active: false, overFrame: true })
      setPhase('settle')
    }
    // [R5] pointercancel 同 onUp 径：系统取消（触控手势/设备抢占）=落当前
    // 候选槽（与松手同式清场——不回滚不写错位；取值申报：mockup 无 cancel
    // 样本，「落当前槽」与松手语义一致且实现单径）
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onUp)
    }
    // args 回调经 ref 闭包稳定（finish 期读 args.onReorderMonthSlots 需最新——
    // 依赖注入点整组随会话读取，phase 之外零重挂）
  }, [phase, nodes, groups])

  // ── settle FLIP（commit 后同帧执行——transitionend/兜底定时器双入口清场）──
  useLayoutEffect(() => {
    if (phase !== 'settle') return
    const job = flightRef.current
    flightRef.current = null
    if (job === null) return
    const card = findCard(job.nodeId)
    if (card === null) {
      job.finish()
      return
    }
    // [R1/回炉 R1] target 必须在 flow 态测量：dragging 期残留的 inline fixed
    // （position/left/top/width）先清+强制回流再量；[回炉 R1] 瀑布错位 inline
    // marginLeft 拖起时已压 0——flow 态测量前**恢复**（终态布局含错位，飞行
    // 目标=错位位）；零位移分支因此天然干净（已清再判，无残留）
    card.style.position = ''
    card.style.left = ''
    card.style.top = ''
    card.style.width = ''
    card.style.marginLeft = job.marginLeft0
    void card.offsetWidth
    const target = card.getBoundingClientRect()
    if (Math.hypot(target.left - job.fromX, target.top - job.fromY) < 0.5) {
      // [回炉 R8] 零位移径不过 flight 分支——激活期禁断的 inline transition
      // 就地清空回类值（不残留则错位变化重排动画永冻+零位移残留断言红）
      card.style.transition = ''
      job.finish() // 零位移（纯几何判定）——不过渡直接落定
      return
    }
    card.style.position = 'fixed'
    card.style.left = `${job.fromX}px`
    card.style.top = `${job.fromY}px`
    card.style.width = `${target.width}px`
    // [回炉 R1] fixed 期压 0（left=margin edge——双计防线同拖起面）
    card.style.marginLeft = '0'
    card.style.zIndex = '99'
    card.style.boxShadow = 'var(--shadow-drag)'
    card.style.transition = SETTLE_TRANSITION
    void card.offsetWidth // 强制回流：既有元素起点生效
    // 双 rAF 后置目标值：改月路径 React 迁组**重建**卡节点（新父→unmount/
    // mount，非 mockup 的同节点搬家）——新插元素首个样式周期无 before-change
    // style，同步改值不启过渡（e2e 探针实证 transitionend 永不触发）；双
    // rAF 保证起点先行进入样式变更事件后再赋目标（新/旧节点两径通用）
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        card.style.left = `${target.left}px`
        card.style.top = `${target.top}px`
      })
    })
    // [R4] 双入口幂等收口：transitionend/兜底定时器任一先至即 finishOnce
    // （定时器 ~600ms=飞行 .32s≈2 倍——事件被外因吞没[settle 期切视图/
    // unmount]时写不丢、phase 不永锁）
    let finished = false
    const cleanupFlight = (): void => {
      clearTimeout(timer)
      card.removeEventListener('transitionend', onEnd)
      card.removeEventListener('transitioncancel', onEnd)
      card.style.position = ''
      card.style.left = ''
      card.style.top = ''
      card.style.width = ''
      // [回炉 R1] 清场扩五键：marginLeft 恢复错位基线（React style diff 不
      // 重写未变值——自恢复非赖重渲染；跨行落位的新错位由不动点迭代后
      // setOffsets 重渲染接管）。[回炉轮 2 主控亲执] 恢复与清 transition 间
      // 强制回流分隔（零位移径同范式）：否则两变更同落一个样式重算周期，
      // after-change transition=类值（.tl-card margin-left .25s 在场）→0→82
      // 计算值变化照启过渡=清场 −offset 瞬跳滑回；回流时 inline transition
      // 仍=SETTLE_TRANSITION（不含 margin-left）→恢复在禁断语境下固化。
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
      // ——e2e 探针实证改月纯纵向迁移仅 top 过渡，仅认 left 会吞唯一事件）
      if (e.type === 'transitionend') {
        const p = (e as TransitionEvent).propertyName
        if (p !== 'left' && p !== 'top') return
      }
      finishOnce()
    }
    const timer: ReturnType<typeof setTimeout> = setTimeout(finishOnce, 600)
    card.addEventListener('transitionend', onEnd)
    card.addEventListener('transitioncancel', onEnd) // 外因取消同径清场（防御面）
  }, [phase])

  // ── 改月预演清除（写落定对齐——UI 位置不回滚的补账时点）────────────
  useEffect(() => {
    const mp = movePreview
    if (mp === null) return
    const n = nodes.find((x) => x.id === mp.nodeId)
    if (n !== undefined && n.year === mp.year && n.month === mp.month) {
      setMovePreview(null)
      setFlashKey(null)
    }
  }, [nodes, movePreview])

  // ── MonthPop Esc/外点关闭（mockup L770/L1097——排除弹层自身与月标）──
  useEffect(() => {
    if (monthPop === null) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') setMonthPop(null)
    }
    const onDoc = (e: MouseEvent): void => {
      const t = e.target
      if (
        t instanceof Element &&
        (t.closest('[data-testid="month-pop"]') !== null || t.closest('.c-ym') !== null)
      ) {
        return
      }
      setMonthPop(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('click', onDoc)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('click', onDoc)
    }
  }, [monthPop])

  const monthPopMonths = useMemo<MonthOption[]>(
    () => groups.flatMap((g) => g.months.map((m) => ({ year: g.year, month: m.month, count: m.nodes.length }))),
    [groups]
  )

  const renderGroups = useMemo(
    () =>
      movePreview === null
        ? groups
        : applyMovePreview(groups, movePreview.nodeId, movePreview.year, movePreview.month),
    [groups, movePreview]
  )

  const handleCardPointerDown = (nodeId: string, ev: ReactPointerEvent<HTMLElement>): void => {
    // [R6] 未消费抑制随新会话清零（拖后 click 落在祖先时旗标残留会吞下次
    // 真单击一次——清零=抑制只作用于紧随本次拖拽的 click）
    suppressClickRef.current = false
    if (phase !== 'idle') return // settle/dragging/pending 期忽略
    if (ev.button !== 0) return
    if ((ev.target as Element).closest('.c-ym') !== null) return // 月标点击面
    if (args.isPicking || args.popOpen || monthPop !== null) return // 拾取/弹层互斥
    const cardEl = ev.currentTarget
    const n = nodes.find((x) => x.id === nodeId)
    const frameEl = cardEl.closest('.month-frame') as HTMLDivElement | null
    if (n === undefined || frameEl === null) return
    const r = cardEl.getBoundingClientRect()
    const srcKey = frameKeyOf(n.year, n.month)
    const srcIds = srcGroupIds(srcKey)
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
      insertIdx: srcIds.indexOf(nodeId),
      overFrame: true,
      marginLeft0: ''
    }
    try {
      cardEl.setPointerCapture(ev.pointerId)
    } catch {
      // 合成事件 pointerId 缺席（jsdom）——document 级监听已覆盖移动/松手
    }
    setPhase('pending')
  }

  const handleYmClick = (nodeId: string, ev: ReactMouseEvent<HTMLElement>): void => {
    if (!args.isEditing) return // edit 态闸（CSS 显隐+handler 双闸）
    if (phase !== 'idle') return
    // [R7] 拾取/线型弹层互斥（与拖拽闸同源——composer 占用时月标不开层）
    if (args.isPicking || args.popOpen) return
    const n = nodes.find((x) => x.id === nodeId)
    if (n === undefined) return
    setMonthPop({ nodeId, cx: ev.clientX, cy: ev.clientY, year: n.year, month: n.month })
  }

  const pickMonth = (year: number | null, month: number | null): void => {
    const pop = monthPop
    if (pop === null) return
    setMonthPop(null)
    const n = nodes.find((x) => x.id === pop.nodeId)
    if (n === undefined) return
    if (n.year === year && n.month === month) return // 同月=no-op 零写（申报）
    const fromCard = findCard(n.id)
    const from = fromCard?.getBoundingClientRect()
    // [回炉 R8③] 改月飞行同式禁断（settle re-fix 压 0 面的类过渡防线——
    /// settle effect 内 SETTLE_TRANSITION 接管+清场回类值）
    if (fromCard !== null && fromCard !== undefined) fromCard.style.transition = 'none'
    showToast(`已移至 ${moveTargetLabel(year, month)}`, 'success')
    setMovePreview({ nodeId: n.id, year, month })
    setFlashKey(frameKeyOf(year, month))
    flightRef.current = {
      nodeId: n.id,
      fromX: from?.left ?? 0,
      fromY: from?.top ?? 0,
      marginLeft0: findCard(n.id)?.style.marginLeft ?? '',
      finish: () => {
        setPhase('idle')
        setSlot(null)
        args.onRouteRecalc()
        args.onMoveNodeMonth?.(n.id, year, month)
      }
    }
    setPhase('settle')
  }

  const registerFrame = (key: string, el: HTMLDivElement | null): void => {
    if (el === null) framesRef.current.delete(key)
    else framesRef.current.set(key, el)
  }

  const consumeClickSuppress = (): boolean => {
    const v = suppressClickRef.current
    suppressClickRef.current = false
    return v
  }

  return {
    phase,
    slot,
    movePreview,
    flashKey,
    monthPop,
    monthPopMonths,
    renderGroups,
    handleCardPointerDown,
    handleYmClick,
    pickMonth,
    registerFrame,
    consumeClickSuppress
  }
}

/** 框包含判定（rect 几何——elementFromPoint 的确定性替身） */
function frameContains(el: HTMLDivElement, px: number, py: number): boolean {
  const r = el.getBoundingClientRect()
  return px >= r.left && px <= r.right && py >= r.top && py <= r.bottom
}
