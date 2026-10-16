/**
 * [F-VISFB-53] selection-events —— SelectionLayer 事件接线域件（闸①拆件前置：
 * SelectionLayer 249/250 行临界，事件接线段整体迁出零行为变更——拆件 diff 与
 * 本票功能 diff 分段呈报；搬移源=SelectionLayer useEffect 体 101-196 行，
 * 行为面经 selection-layer/selection-layer-f52/selection-layer-fa12 三套既有
 * 接线测试锁——零改动红即拆件回归）。
 *
 * ── 行为层 ──
 * - 接线四事件（document 级）+三域件组装，全部语义自 SelectionLayer 原样迁出：
 *   · selectionchange：[F-VISFB-52] dragCtl 门（自写回声抑制不转发）→
 *     scheduler.handler（视觉路 rAF 合帧去重+settle 防抖 200ms 双路）；
 *   · mousedown：记录落点（F-12 位移门）+S5 短路窗硬清（F-RDR-01 B 释放②）
 *     +dragCtl.onMouseDown（授权判定/会话启动）；
 *   · mouseup：工具条自身早退→dragCtl.enforce（终局钳制前置——shift+click
 *     面覆盖）→scheduler.cancel→F-12 位移门（<3px=误触早退）→[F-A12]
 *     releaseAffinity 浅探重定向（dragged 门内）→enforce 二核（幂等）→
 *     markAffinityShortcutFlushed（S4 帧）→evaluate.full(true)→endSession；
 *   · keydown：Escape 只清 pending（INV-37——自绘层随选区真清除而消失）。
 * - 常量 SELECTION_DEBOUNCE_MS（200）/DRAG_SELECT_THRESHOLD_PX（3）随域迁入。
 *
 * ── 接口层 ──
 * - export function wireSelectionEvents(opts)：opts={pageRoot, paperId,
 *   setPaint, setPending, toolbarRef}（组件状态写口+挂载盒+文献 id——与
 *   createEvaluate ctx 同构面）；返回 SelectionEventsHandle { dispose }。
 *
 * ── 架构层 ──
 * - 依赖单向：本件→selection-evaluate/selection-geometry/selection-drag-
 *   controller/release-affinity（interact 域内零环）；React 仅类型面
 *   （import type RefObject——零运行时依赖，域件可单测）。
 *
 * ── 生命周期层 ──
 * - 挂载=SelectionLayer useEffect（pageRoot/paperId 依赖——锚定根动态）；
 *   dispose=卸载清理（四监听摘除+scheduler.cancel+dragCtl.dispose+双状态清
 *   ——INV-14 同型）。
 *
 * ── 文化层 ──
 * - 拆件零行为变更=不新增测试（既有三套接线测试即拆件守卫）；本票功能面
 *   测试=tests/unit/renderer/selection-flicker.test.tsx（F-VISFB-53）。
 */
import type { RefObject } from 'react'
import {
  clearAffinityShortcut,
  createEvaluate,
  markAffinityShortcutFlushed,
  type PaintSelection,
  type PendingSelection
} from './selection-evaluate'
import { createVisualScheduler, closestPageRoot } from './selection-geometry'
import { createSelectionDragController } from './selection-drag-controller'
import { releaseAffinity } from './release-affinity'

/** selectionchange settle 窗口（毫秒）：工具条防抖（F-A6-c 起视觉路已 rAF 对齐
 *  60Hz——200ms 窗仅剩 settle 语义：拖选中停顿出条+程序化选选的 pending 落地） */
const SELECTION_DEBOUNCE_MS = 200

/** F-12 工具条误触发阈值（px）：位移小于此值=单击/双击（含选词）不出条
 * （用户令「一点就出选项条」；无 mousedown 记录的程序化/键盘选区不设限） */
const DRAG_SELECT_THRESHOLD_PX = 3

/** 接线句柄（SelectionLayer useEffect 消费——dispose=卸载清理；invalidate=
 * [F-VISFB-53] evaluate 签名缓存失效，SelectionLayer.save 清选区时刻消费） */
export interface SelectionEventsHandle {
  dispose(): void
  invalidate(): void
}

export function wireSelectionEvents(opts: {
  pageRoot: HTMLElement
  paperId: string
  setPaint(p: PaintSelection | null): void
  setPending(p: PendingSelection | null): void
  toolbarRef: RefObject<HTMLDivElement | null>
}): SelectionEventsHandle {
  const { pageRoot, paperId, setPaint, setPending, toolbarRef } = opts

  // [F-A6-b2] evaluate 域件（selection-evaluate.ts——四守卫+产链双路+G2 门）
  const evaluate = createEvaluate({ pageRoot, paperId, setPaint, setPending })

  // [B1 回炉→F-A6-c rAF 对齐] selectionchange 双路调度：视觉路=首事件即排
  // rAF+帧内合帧去重（60Hz 上限——D2a 5Hz 步进根治）；工具条评估=防抖
  // 200ms（弹出语义零变）；cancel 清双句柄（INV-14）
  const scheduler = createVisualScheduler({
    onVisual: () => evaluate.visual(),
    onSettled: () => evaluate.full(false),
    windowMs: SELECTION_DEBOUNCE_MS
  })
  // [F-VISFB-52] 指针授权拖选控制器（selection-drag-controller.ts——门=true
  // 自写回声抑制不转发，防自身写回环）
  const dragCtl = createSelectionDragController({ pageRoot })
  const onSelectionChange = (): void => {
    if (!dragCtl.onSelectionChange()) scheduler.handler()
  }
  // F-12：记录最近一次 mousedown 落点（NaN=无记录——程序化事件/未捕获）
  let downX = Number.NaN
  let downY = Number.NaN
  const onMouseDown = (e: MouseEvent): void => {
    ;[downX, downY] = [e.clientX, e.clientY]
    // [F-RDR-01 B] 新拖选会话硬释放 S5 短路窗（释放条件②——TTL 到期为①兜底）
    clearAffinityShortcut()
    // [F-VISFB-53] 新拖选会话=新签名域（evaluate 同签名缓存清零——52 回炉
    // B-1 纪隔离同精神；保存后/上会话旧签名零残留）
    evaluate.invalidate()
    dragCtl.onMouseDown(e)
  }

  const onMouseUp = (e: MouseEvent): void => {
    // 工具条自身的 mouseup 不评估（按钮 mousedown 已阻止选区坍缩，交由 click 处理）
    if (e.target instanceof Node && toolbarRef.current?.contains(e.target) === true) return
    // [F-VISFB-52] 终局钳制核查（F-12 早退路径前置——shift+click 面覆盖）
    dragCtl.enforce()
    scheduler.cancel()
    // F-12：位移过小=单击/双击误触不出条（自绘层留待防抖路径随选区坍缩清除）
    let dragged = false
    if (Number.isFinite(downX)) {
      const moved = Math.hypot(e.clientX - downX, e.clientY - downY)
      downX = downY = Number.NaN
      if (moved < DRAG_SELECT_THRESHOLD_PX) {
        setPending(null)
        dragCtl.endSession()
        return
      }
      dragged = true
    }
    // [F-A12] 浅探 affinity：真划选且释放点在 focus 行上方间隙、更近上一视觉行
    // → focus 重定向上一行行尾（锚定侧原样）；full 同帧消费已重定向选区（时间
    // 线=release-affinity.ts 头注——排队 selectionchange 由 visual 幂等吸收）
    if (dragged) {
      const sel = window.getSelection()
      if (sel !== null && sel.rangeCount > 0 && !sel.isCollapsed) {
        const anchorRoot = closestPageRoot(sel.anchorNode)
        if (anchorRoot !== null && closestPageRoot(sel.focusNode) === anchorRoot) {
          const textLayer = anchorRoot.querySelector('.textLayer') as HTMLElement | null
          if (textLayer !== null) {
            const target = releaseAffinity(textLayer, sel, e.clientX, e.clientY)
            if (target !== null) {
              // 前置 rangeCount>0 且非坍缩守卫蕴含 anchorNode 必在
              sel.setBaseAndExtent(sel.anchorNode!, sel.anchorOffset, target.node, target.offset)
            }
          }
        }
      }
    }
    // [F-VISFB-52] affinity 写后再核一把（幂等——防重定向目标落对侧栏）
    dragCtl.enforce()
    // [F-RDR-01 B] S4 正确帧标记：full(true) 同帧渲染正确选区视觉后，其后异步
    // 排队的 selectionchange→visual 在 TTL 窗内直接丢弃（S5 弹错源消除）
    markAffinityShortcutFlushed()
    evaluate.full(true)
    dragCtl.endSession()
  }
  const onKeyDown = (e: KeyboardEvent): void => {
    // INV-37（F-A4 修订）：Escape 只清组件态；自绘层随**选区**真清除而消失
    if (e.key === 'Escape') setPending(null)
  }

  document.addEventListener('selectionchange', onSelectionChange)
  document.addEventListener('mousedown', onMouseDown)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('keydown', onKeyDown)
  return {
    dispose(): void {
      document.removeEventListener('selectionchange', onSelectionChange)
      document.removeEventListener('mousedown', onMouseDown)
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('keydown', onKeyDown)
      scheduler.cancel()
      dragCtl.dispose()
      setPending(null)
      setPaint(null)
    },
    invalidate(): void {
      evaluate.invalidate()
    }
  }
}
