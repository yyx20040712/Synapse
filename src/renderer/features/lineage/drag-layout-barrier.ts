// b3: 回炉批（2026-11-22 B3 独立审查处置——自 card-drag-flight.ts 迁驻：flight
// ≤220 行顶格，屏障迁出解除；代码与锚注释同迁，行为零变。迁出申报见设计稿 §4
// 文件表补行）。
// b3: 审查回炉 W1（同批）：noteExtend 真变假分支加「.stretch 已提交」判据——
// 终局批同任务「激活入带→settle 出带」（React 未提交中间 .stretch）不得启动
// padding 跟踪与 600ms 兜底，布局终局=flight finish（详注=createLayoutBarrier）。
/**
 * [B3 §2 布局屏障子态/§3.5] drag-layout-barrier —— 布局终局屏障工厂（子波 2 自
 * card-drag-flight 迁驻；flightDone 触发点、padding 监听与 layoutFinishOnce 天然
 * 同驻）——实例由 useCardDrag ref 持有，session 侧接线四点
 * （begin/noteExtend/noteFlightDone/isLayoutActive）；routeEpoch bump 从 flight
 * finish 移到布局终局（数据写时点不变）。
 */

export interface LayoutBarrier {
  begin(): void
  noteExtend(prev: boolean, next: boolean, frameEl: HTMLElement | null): void
  noteFlightDone(): void
  isLayoutActive(): boolean
  isSuspended(): boolean
  onLayoutFinish(cb: () => void): void
  dispose(): void
}

/**
 * [B3 §2/§3.5] createLayoutBarrier —— 每次拖拽会话的布局终局屏障状态机：
 * begin()=激活帧（迁移 4b）开屏障+连续挂起窗（isSuspended=true——dragging 激活起→布局终局止，phase 回 idle 不中断）；
 * noteExtend=extend 真变化——false→true 置 extendSeen；true→false（.stretch 摘除——拖中出带与 settle 提交共用
 * 「真变假」入口，不等 up）启动 padding 在途跟踪（监听源月框 padding-bottom transitionend/cancel+600ms 布局兜底；
 * end/cancel 任一先至=paddingFinishOnce 幂等——¬paddingInFlight+清监听/兜底）。
 * [审查 W1] 真变假分支只对「.stretch 已提交需回落」启动跟踪：调用时点读 frame 的
 * 已提交类面（classList.contains('stretch')——类挂载/摘除仍由 slot.extend 真变化
 * React 提交承载，§3.4 不变；帧批 true→false 时点上一提交的 .stretch 必已在场）。
 * 终局批同任务「激活入带→settle 出带」时 React 未提交中间 .stretch（无 padding 过渡
 * 可监听）→不启动跟踪与 600ms 兜底，布局终局=flight finish（paddingDone=
 * ¬extendSeen∨¬paddingInFlight 公式不变——paddingInFlight 未置位即真；既有
 * L1-L5/G11 形态不受影响）。
 * noteFlightDone()=flight finish（迁移 12）置 flightDone 并 tryLayoutFinish——清场/数据写时点不变；tryLayoutFinish=
 * flightDone ∧ paddingDone(¬extendSeen∨¬paddingInFlight) ∧ ¬finished → layoutFinishOnce 恰一次（先置 finished=释放挂起
 * 再回调 onLayoutFinish——宿主 bump routeEpoch+layoutEpoch，§3.5.5；事件交错/重复/兜底合流恰一次，L2/L3；
 * paddingFinished ≡ 跟踪启动后的 ¬paddingInFlight）；isLayoutActive()=迁移 13/方案 A pointerdown 锁源
 * （begun ∧ ¬finished——flight finish 后 padding 终局前仍拒新会话 G11；无 stretch=flight finish 零额外窗）；dispose()=卸载清理。
 */
export function createLayoutBarrier(): LayoutBarrier {
  let begun = false, finished = false, flightDone = false, extendSeen = false, paddingInFlight = false
  let frameEl: HTMLElement | null = null
  let timer: ReturnType<typeof setTimeout> | null = null
  let finishCb: (() => void) | null = null
  const detachPadListeners = (el: HTMLElement): void => {
    el.removeEventListener('transitionend', onPadEnd)
    el.removeEventListener('transitioncancel', onPadEnd)
  }
  const clearPaddingWatch = (): void => {
    if (timer !== null) { clearTimeout(timer); timer = null }
    if (frameEl !== null) { detachPadListeners(frameEl); frameEl = null }
  }
  const tryLayoutFinish = (): void => {
    if (!flightDone || finished || (extendSeen && paddingInFlight)) return // [B3 §2] paddingDone=¬extendSeen∨¬paddingInFlight
    finished = true // [B3 §3.5.5] 先置终局位=释放挂起，再 bump 两 epoch
    clearPaddingWatch()
    finishCb?.()
  }
  const paddingFinish = (): void => {
    if (!paddingInFlight) return
    paddingInFlight = false
    clearPaddingWatch()
    tryLayoutFinish()
  }
  // [B3 §3.5.1] 只认 padding-bottom 轴（卡飞行 translate 等同名轴事件过滤）
  const onPadEnd = (e: Event): void => {
    if ((e as TransitionEvent).propertyName !== 'padding-bottom') return
    paddingFinish()
  }
  const startPaddingTracking = (el: HTMLElement | null): void => {
    paddingInFlight = true
    if (timer !== null) clearTimeout(timer)
    // [B3 §3.5.1] 600ms 布局兜底仅对「回落已启动未收 end/cancel」（paddingFinish 幂等收口）
    timer = setTimeout(() => { timer = null; paddingFinish() }, 600)
    if (frameEl !== null && frameEl !== el) detachPadListeners(frameEl)
    frameEl = el
    el?.addEventListener('transitionend', onPadEnd)
    el?.addEventListener('transitioncancel', onPadEnd)
  }
  return {
    begin(): void {
      // [B3 迁移 4b] 激活重置（新会话——迁移 13 锁保证旧屏障已终局方可进入）
      begun = true; finished = false; flightDone = false; extendSeen = false; paddingInFlight = false
      clearPaddingWatch()
    },
    noteExtend(prev: boolean, next: boolean, el: HTMLElement | null): void {
      if (prev === next) return
      if (next) extendSeen = true // [B3 §2] extend 假变真且 .stretch 挂载
      else if (extendSeen) {
        // [审查 W1] 只对「.stretch 已提交需回落」启动 padding 跟踪与 600ms 兜底：
        // 终局批同任务「激活入带→settle 出带」时 React 未提交中间 .stretch（无
        // padding 过渡可监听）——此时不跟踪，布局终局=flight finish。判据=调用
        // 时点 frame 的已提交类面（.stretch 由 slot.extend 真变化 React 提交挂载/
        // 摘除；帧批 true→false 时点上一提交的 .stretch 必已在场——详见工厂 JSDoc）
        if (el === null || !el.classList.contains('stretch')) return
        startPaddingTracking(el)
      }
    },
    noteFlightDone(): void { flightDone = true; tryLayoutFinish() },
    isLayoutActive(): boolean { return begun && !finished },
    isSuspended(): boolean { return begun && !finished },
    onLayoutFinish(cb: () => void): void { finishCb = cb },
    dispose(): void { clearPaddingWatch(); finishCb = null }
  }
}
