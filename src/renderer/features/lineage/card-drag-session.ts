// b3: T3-P8；lnfix2: extend 判定改冻结基准；registerFrame/framesRef 注册链退役；B3 commit A 纯拆件（2026-11-22）：读取/换算迁 drag-session-geometry.ts，rAF 调度接口=drag-frame-scheduler.ts。
// b3: B3 commit B 子波 1 帧协议核心（2026-11-22，设计稿 docs/design/2026-11-22_b3-drag-frame-g-g2-design.md §2/§3/§5）：move 逐事件同步读写改「事件记点+rAF 帧批」——pointermove 只记 lastClient+纯算术 exceeded latch+schedule（迁移 3/4/7，零读零写零提交）；
//  rAF flush=段 0 泵 tick+滚动子批（FRAME_EVENT/onScrollFrame 只标 scrollDirty 合批——W2）+段 1 指针批（①读→②纯计算→③统一写→④React 提交仅真变化）；激活帧批在帧内（迁移 4b）；up/cancel 入口终局批（未 flush 指针按 lastClient 同步——迁移 11/W3）；拖影=inline translate（Option A）+pullPx 帧批直写 --lg-pull（§3.2③/§3.4）+will-change 激活写/清场清（§5）。
// b3: 子波 2（§2 布局屏障子态/§3.5/§8）：布局终局屏障+连续挂起窗接线（barrier 工厂=drag-layout-barrier.ts createLayoutBarrier——begin/noteExtend/noteFlightDone/isLayoutActive 四点）+handleCardPointerDown 稳定化（argsRef/phaseRef——memo 配套）。
// b3: 审查回炉批（2026-11-22，独立审查 FAIL 处置单）：R1 激活帧坐标域+R2 pending scrollDirty+W2 卸载残帧代次+W1 屏障 committed-.stretch 判据（屏障本体=drag-layout-barrier.ts）+观测三处陈旧注释；会话域模型迁 drag-session-model.ts（行数预算申报）。
/**
 * [F-LGRAPH-01①U2] card-drag-session —— pointer 拖拽会话域（几何判定=card-drag-geometry，读取/换算=drag-session-geometry，飞行机制=card-drag-flight，
 * rAF 调度=drag-frame-scheduler）。[F-SLOTGRID-01 U3] 落点=算术网格（insertIndexFromGrid——INV-111 消费面；padding-box 换算语义=card-drag-grid.ts 头注）。
 * [F-UIRES-03 C3] 改月弹层互斥闸随改月链退役删除（INV-107）；源框物理域判定收窄语义=纯回弹护栏+同框下拉带（非改月判定面）。
 * [F-VISFB-31] 会话坐标族整体 own 域（00A 三域律）——换算族本体与自查面注=drag-session-geometry.ts 头注。
 * [R1·W-2 主控裁定] 激活阈（DRAG_THRESHOLD）=屏幕反馈量恒 client 域比较不换算（INV-144 补句）。
 *
 * ── 态空间（宪法状态纪律）── drag ∈ {idle, pending(按下未过 5px), dragging, settle(飞行过渡期——settle 落定编排归 useCardDrag)}：
 * - 拖拽无 Esc 取消（松手恒落当前槽）；settle 期再 pointerdown=忽略；阈值未过 pointerup=单击选中既有链（click 事件自然派发）
 * - [R5] pointercancel 同松手径=落当前候选槽（判定输入=session.lastClient——B3 迁移 11）；[R6] 未消费 click 抑制随新会话清零
 * - [B3 §2/§3] 帧协议：pointermove=记点+schedule；rAF flush=段 0（泵 tick+scrollDirty 滚动子批）→段 1（指针批：读→算→写→仅真变化提交）；调度器 inFrame/pendingInput 合流+激活帧起自续泵（无指针帧=泵空转零拖拽几何读写——AS-02）
 * ── 写路径（无乐观写——P7B R5 同族）── settle flight finish 清场后写 onReorderMonthSlots→store.applyObstacleReroute 复合单元〔[F-LANEGRID-01 B3] 槽位透写+变化帧 via 清除〕；routeEpoch bump=布局终局（barrier——子波 2）；写失败沿 store 既有。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, RefObject } from 'react'
import type { LineageNode } from '@shared/models/lineage'
import { frameKeyOf } from './lineage-timeline'
import type { FlightJob } from './card-drag-flight'
import type { LayoutBarrier } from './drag-layout-barrier'
import { srcGroupIdsOf } from './card-drag-geometry'
import { createFrameScheduler } from './drag-frame-scheduler'
import type { DragPhase, DragSession, DragSlotPreview } from './drag-session-model'
import { ghostOwnAt, planSettle, readActivationFrame, readFrozenFrameBaseline, sampleFrameHit, samplePullBand, toOwn } from './drag-session-geometry'
import { effectiveScale } from './timeline-zoom'
import { startAutoScroll, type AutoScrollHandle } from './drag-autoscroll'

// 会话域模型单源迁 drag-session-model.ts（审查回炉批——本件行数预算回落）；
// 既有导出面沿 useCardDrag re-export 链保持，消费方零改动。
export type { DragPhase, DragSlotPreview } from './drag-session-model'

/** 激活阈值（px——mockup L944 同值） */
const DRAG_THRESHOLD = 5

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
  /** [B3 §2/§3.5] 布局终局屏障（实例=useCardDrag ref 持有——激活/extend 真变化/flight finish/pointerdown 锁四接线点） */
  barrier: LayoutBarrier
  /** settle 落定后月组全序写路径（无乐观写——飞行窗禁写） */
  onReorderMonthSlots?: (nodeIds: string[]) => void
}): {
  phase: DragPhase
  slot: DragSlotPreview | null
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
  /** [B3 迁移 15/W1] effect 代次（激活提交触发重挂后，旧调度器残帧凭代次过期=no-op——stub caf 环境下残帧不可真摘） */
  const frameGenRef = useRef(0)
  // [B3 §8] handleCardPointerDown 稳定化：args/phase 经 ref-latest（引用跨渲染恒定=渲染间 props diff 恒 false——memo 配套回调链源头）
  const argsRef = useRef(args); argsRef.current = args
  const phaseRef = useRef(phase); phaseRef.current = phase

  const findCard = (nodeId: string): HTMLElement | null => contentRef.current?.querySelector(`.tl-card[data-node-id="${nodeId}"]`) ?? null

  // ── pointer 会话（pending/dragging 期 document 级监听；帧批=scheduler 驱动）──
  useEffect(() => {
    if (phase !== 'pending' && phase !== 'dragging') return
    const gen = ++frameGenRef.current
    let scrollDirty = false, lastT = performance.now()
    // [F-VISFB-66 裁定 4+回炉 R7/B3 §3.2 W2] 自动滚动 managed:false 纯 tick（帧批段 0 顶部调）；onScrollFrame 只标脏+schedule——读算写归帧批（滚动帧与待处理指针合并一次）
    let auto: AutoScrollHandle | null = null
    const contentEl = contentRef.current
    const container = contentEl?.closest('.timeline') instanceof HTMLElement ? (contentEl.closest('.timeline') as HTMLElement) : null
    if (container !== null) {
      auto = startAutoScroll(
        {
          container,
          getCursorClient: () => {
            const sc = sessionRef.current
            return sc === null ? null : { clientX: sc.lastClient.x, clientY: sc.lastClient.y }
          },
          onScrollFrame: () => {
            scrollDirty = true
            scheduler.schedule()
          }
        },
        // [F-LINEUI-01①] horizontal:true——卡拖会话=横滚唯一启用点（拖卡至视口左右缘画布横滚；画线/笔记柄/调线三 managed 消费方竖向语义零变）
        { managed: false, horizontal: true }
      )
    }
    // ── 帧批段 1（B3 §3.2）：①读（全部先于写）→②纯计算→③统一写→④React 提交仅真变化。激活帧（!activated）追加激活读取集/写集
    //（迁移 4b 读取/写集+translate=ghost−ghost0 Option A）；--lg-pull 按③ extend 条件写（true→写值；true→false removeProperty；非 extend 零写——F6/G12）。
    // 返回值=是否实际执行（content/card 缺席早退=false——R2 据此判 pointerDirty 可清）──
    const runPointerBatch = (s: DragSession): boolean => {
      const content = contentRef.current
      const card = findCard(s.nodeId)
      if (content === null || card === null) return false
      const act = s.activated ? null : readActivationFrame(card, content, s.sx, s.sy)
      const baseline = act !== null && s.frameEl !== null && s.frameEl.isConnected ? readFrozenFrameBaseline(s.frameEl) : null
      // [审查 R1] 激活帧 ghost=grab 冻结基准 own 域位移：pointerdown 时点卡位
      // toOwn+client 域指针差 ÷s_eff（整数差单次除法=精确 own 差值——审查探针
      // 16px 8px 口径）。grab 偏移冻结语义=INV-100 族（偏移关系冻结于 pointerdown，
      // 激活帧不因 rect 重排漂移——lineage-card-drag R1 零位移例锁）；旧式 ghost 用
      // pointerdown 初始化的 client 域偏移直减（未 ÷s_eff）=u/z≠1 档首 flush 差 u 倍。
      // 渲染基线 ghost0=act.ghost（激活时点卡位——锚+translate 恒等式 INV-96 族要求
      // 基线=当前锚帧位；写段覆写不变）
      let ghost: { x: number; y: number }
      if (act !== null) {
        const base0 = toOwn(content, s.ghost0.x, s.ghost0.y)
        ghost = {
          x: base0.x + (s.lastClient.x - s.sx) / effectiveScale(),
          y: base0.y + (s.lastClient.y - s.sy) / effectiveScale()
        }
      } else {
        ghost = ghostOwnAt(content, s.lastClient.x, s.lastClient.y, s.ox, s.oy)
      }
      const pull = samplePullBand(s.lastClient.x, s.lastClient.y, { bottom: s.frameBottom0, left: s.frameLeft0, right: s.frameRight0 })
      const hit = sampleFrameHit(s, s.lastClient.x, s.lastClient.y, pull.inPullBand)
      // ② 纯计算（零 DOM 访问）：锚=offsetLeft/Top（gFrame）；渲染位恒等式=锚+translate=ghost−frameOrigin（INV-96 族）
      const anchor = act !== null ? act.gFrame : null
      const baseGhost = act !== null ? act.ghost : s.ghost0
      const prevExtend = s.extend // [B3 §2/§3.5.1] extend 真变化屏障接线基准（批前值）
      // ③ 写（统一批——激活键序=原语句位保形；冻结基准校准读并入①读段——激活帧 rect=施滚后/提交前稳态，grab 值复核语义不变）
      if (act !== null) {
        ;({ ox: s.ox, oy: s.oy, ghost: s.ghost0, frameOrigin: s.frameOrigin, marginLeft0: s.marginLeft0 } = act)
        if (baseline !== null) {
          s.frameBottom0 = baseline.bottom
          s.frameLeft0 = baseline.left
          s.frameRight0 = baseline.right
        }
        card.style.position = 'absolute'
        card.style.left = `${anchor!.x}px`
        card.style.top = `${anchor!.y}px`
        card.style.width = `${act.rawWidth / effectiveScale()}px`
        // [回炉 R1/B-1] absolute 盒 left 定位 margin edge——压 0 后 left=视觉位（无双计）；[回炉 R8/d1-B1] 同步禁断过渡（基类 margin-left .25s 在场）
        card.style.marginLeft = '0'
        card.style.transition = 'none'
        // [B3 §5] 拖拽会话期合成提示（激活帧写、清场清——仅拖卡，不全局撒 CSS）；[INV-140] 键存续前提=节点保育（foster row 同父调和——跨父 remount 即灭）
        card.style.willChange = 'translate'
      }
      s.ghost = ghost
      card.style.translate = `${ghost.x - baseGhost.x}px ${ghost.y - baseGhost.y}px`
      if (s.frameEl !== null) {
        // [B3 §3.2③/§3.4] pullPx 直写：仅 extend=true 帧写值；prevExtend=true∧extend=false 同批 removeProperty；其余零写
        if (pull.inPullBand) s.frameEl.style.setProperty('--lg-pull', `${pull.pullPx}px`)
        else if (s.extend) s.frameEl.style.removeProperty('--lg-pull')
      }
      // ④ React 提交（仅真变化；pullPx 不在提交面——§3.3）
      if (act !== null) {
        s.activated = true
        s.overFrame = hit.over
        s.insertIdx = hit.nextIdx
        s.extend = pull.inPullBand
        setSlot({ nodeId: s.nodeId, srcKey: s.srcKey, insertIdx: hit.nextIdx, active: true, overFrame: hit.over, extend: pull.inPullBand })
        setPhase('dragging')
        args.barrier.begin() // [B3 迁移 4b/§3.5] 激活帧开屏障+连续挂起窗（dragging 激活起→布局终局止）
      } else if (hit.over !== s.overFrame || hit.nextIdx !== s.insertIdx || pull.inPullBand !== s.extend) {
        s.overFrame = hit.over
        s.insertIdx = hit.nextIdx
        s.extend = pull.inPullBand
        setSlot((prev) => (prev === null ? prev : { ...prev, overFrame: hit.over, insertIdx: hit.nextIdx, extend: pull.inPullBand }))
      }
      // [B3 §2/§3.5.1] extend 真变化屏障接线：false→true 置 extendSeen；true→false（.stretch 摘除）启动 padding 在途跟踪——不等 up
      args.barrier.noteExtend(prevExtend, s.extend, s.frameEl)
      return true
    }
    // ── rAF flush（每帧至多一次 onFrame——§3.2）：段 0 泵 tick+滚动子批 → 段 1 指针批；帧末自续泵（W12）──
    const scheduler = createFrameScheduler({
      onFrame: (now: number): void => {
        const s = sessionRef.current
        // [W1/迁移 15/审查 W2] 残帧守卫：会话终结（null——endSession/卸载清场）或代次过期（effect 重挂/卸载递增后旧调度器残帧）=no-op（泵自灭）
        if (s === null || gen !== frameGenRef.current) return
        const dt = Math.max(0, now - lastT)
        lastT = now
        if (auto !== null && s.activated) {
          // [回炉 R7/AS-02] 段 0：施滚（未激活帧空转不 tick——现行语义沿承）；scrolled 真差值入 scrollDirty
          if (auto.tick(dt).scrolled) scrollDirty = true
        }
        if (scrollDirty) {
          // [审查 R2] 滚动后子批条件=activated∨pointerDirty——pending 期滚动不得吞
          // 首个激活输入（未激活且有待处理指针=同帧执行激活批，读施滚后 rect）；
          // pointerDirty 仅在指针批实际执行后清（runPointerBatch 返回执行与否）
          if (s.activated || s.pointerDirty) {
            if (runPointerBatch(s)) s.pointerDirty = false
          }
          scrollDirty = false
        }
        if (s.pointerDirty && runPointerBatch(s)) s.pointerDirty = false
        if (s.activated) scheduler.schedule() // 会话期自续泵（激活帧起——静止光标 autoscroll 不中断）
      }
    })
    const onMove = (e: PointerEvent): void => {
      const s = sessionRef.current
      if (s === null) return
      // [B3 迁移 3/4/7] 事件时点零读/零写/零提交：记录 lastClient；pending 未过阈=仅记录（latch 不置位）
      s.lastClient = { x: e.clientX, y: e.clientY }
      if (!s.activated && !s.exceeded) {
        // [R1·W-2] 激活阈=client 域屏幕反馈量（点击/拖拽判别阈=手部屏幕反馈——两侧同域比较不换算）
        if (Math.hypot(e.clientX - s.sx, e.clientY - s.sy) < DRAG_THRESHOLD) return
        s.exceeded = true // [B3 迁移 4] 纯算术 exceeded latch 先置位（激活在帧批 4b）
      }
      s.pointerDirty = true
      scheduler.schedule()
    }
    // [B3 §2 迁移 5/6/9/10/11] up/cancel 出口：未过阈 latch=回 idle（迁移 5 click 链保活/迁移 6 拖拽未发生——W1 二轮收窄）；已过阈=终局批前置段
    //（未 flush 指针或 pending latch 未激活——按 lastClient 同步一次完整读→算→提交，G8/G10/F7/F8 锁）+settle 落位判定；cancel 判定输入=session.lastClient（W3——F7/F8 锁）；up 沿事件坐标。
    const endSession = (e: PointerEvent, judgeByLastClient: boolean): void => {
      const s = sessionRef.current
      sessionRef.current = null
      if (s === null) return
      if (!s.exceeded) {
        setPhase('idle')
        return
      }
      if (!s.activated || s.pointerDirty) runPointerBatch(s)
      s.pointerDirty = false
      // [B3 §2 迁移 9-11/§3.5] settle 提交摘 .stretch（slot.active=false）=extend 真变假——先走同一跟踪入口，再由 flight finish 求 paddingDone
      args.barrier.noteExtend(s.extend, false, s.frameEl)
      suppressClickRef.current = true // 拖后 click 抑制（一次性——click 同步随后到达）
      // [F-LGRAPH-01②U6] 限本月=物理域落位换算（planSettle——INV-98 实时域单源；INV-83 跨月拒绝子句已退役，代码面零残留）
      const cx = judgeByLastClient ? s.lastClient.x : e.clientX
      const cy = judgeByLastClient ? s.lastClient.y : e.clientY
      const { settleIdx, finalIds, changed } = planSettle(s, cx, cy)
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
          args.barrier.noteFlightDone() // [B3 §2 迁移 12/§3.5.4] 置 flightDone 并 tryLayoutFinish——routeEpoch bump 移至布局终局（数据写时点不变）
          if (changed) args.onReorderMonthSlots?.(finalIds)
        }
      })
      setSlot({ nodeId: s.nodeId, srcKey: s.srcKey, insertIdx: settleIdx, active: false, overFrame: true })
      setPhase('settle')
    }
    const onUp = (e: PointerEvent): void => endSession(e, false)
    const onCancel = (e: PointerEvent): void => endSession(e, true)
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    document.addEventListener('pointercancel', onCancel)
    // [B3 迁移 4b/8] pending→dragging 换 effect（激活提交触发重挂）不拆泵语义：会话已激活即重启自续泵
    if (sessionRef.current?.activated === true) scheduler.schedule()
    return () => {
      scheduler.cancel() // [B3 迁移 15] 清理序=先 scheduler.cancel 再 auto.stop；残存已入队 rAF 凭 session null 守卫=no-op
      auto?.stop()
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      document.removeEventListener('pointercancel', onCancel)
    }
    // args 回调经 ref 闭包稳定（finish 期读回调需最新——phase 之外零重挂）
  }, [phase, nodes])

  // [审查 W2] 卸载清场（mount-once——cleanup 仅卸载运行）：同步递增帧代次+清会话
  // 引用——残帧凭 gen 过期/s null 双守卫 no-op（stub caf 环境 caf 无效，不等下一
  // 次 effect 建立）；换代场景（pending→dragging effect 重挂）旧帧由主 effect
  // setup 的 ++frameGenRef 过期，会话存活不受影响
  useEffect(() => {
    return () => {
      frameGenRef.current++
      sessionRef.current = null
    }
  }, [])

  // [B3 §8] 稳定引用（useCallback([])+argsRef/phaseRef——引用跨渲染恒定；布局屏障锁读 ref-latest）
  const handleCardPointerDown = useCallback((nodeId: string, ev: ReactPointerEvent<HTMLElement>): void => {
    // [R6] 未消费抑制随新会话清零（拖后 click 落在祖先时旗标残留会吞下次真单击一次——清零=抑制只作用于紧随本次拖拽的 click）
    suppressClickRef.current = false
    if (phaseRef.current !== 'idle') return // settle/dragging/pending 期忽略
    if (argsRef.current.barrier.isLayoutActive()) return // [B3 迁移 13/方案 A] 布局屏障未终局期拒绝（flight finish 后 padding 终局前——G11；旧屏障不被新会话清除）
    if (!argsRef.current.dragEnabled) return // [U5] 模式闸：拖卡=edit 专属（pointerdown 即拒）
    if (ev.button !== 0) return
    if (argsRef.current.isPicking || argsRef.current.popOpen) return // 拾取/弹层互斥
    const cardEl = ev.currentTarget
    const n = argsRef.current.nodes.find((x) => x.id === nodeId)
    const frameEl = cardEl.closest('.month-frame') as HTMLDivElement | null
    if (n === undefined || frameEl === null) return
    const r = cardEl.getBoundingClientRect()
    // [lnfix2] 冻结基准 grab 帧同步取值（拖前稳态布局——卡未离流/占位槽未入驻；后续占位槽腾行与 stretch padding 推高均不再反噬判定）
    const fr0 = readFrozenFrameBaseline(frameEl)
    const srcKey = frameKeyOf(n.year, n.month)
    const srcIds = srcGroupIdsOf(argsRef.current.nodes, srcKey)
    sessionRef.current = {
      nodeId,
      srcKey,
      frameEl,
      srcIds,
      sx: ev.clientX,
      sy: ev.clientY,
      ox: ev.clientX - r.left,
      oy: ev.clientY - r.top,
      exceeded: false,
      activated: false,
      pointerDirty: false,
      ghost: { x: r.left, y: r.top },
      ghost0: { x: r.left, y: r.top },
      frameOrigin: { x: 0, y: 0 },
      insertIdx: srcIds.indexOf(nodeId),
      srcIdx: srcIds.indexOf(nodeId),
      overFrame: true,
      extend: false,
      frameBottom0: fr0.bottom,
      frameLeft0: fr0.left,
      frameRight0: fr0.right,
      marginLeft0: '',
      lastClient: { x: ev.clientX, y: ev.clientY }
    }
    try {
      cardEl.setPointerCapture(ev.pointerId)
    } catch { /* 合成事件 pointerId 缺席（jsdom）——document 级监听已覆盖移动/松手 */ }
    setPhase('pending')
  }, [])

  const consumeClickSuppress = useCallback((): boolean => {
    const v = suppressClickRef.current
    suppressClickRef.current = false
    return v
  }, [])

  return { phase, slot, flightRef, handleCardPointerDown, consumeClickSuppress }
}
