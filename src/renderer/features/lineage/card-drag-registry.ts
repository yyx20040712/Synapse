// b3: T3-P8
/**
 * card-drag-registry —— 拖拽两态桥接 registry 的非 React 部分（[B4 L2 / 设计稿 §2.3 interaction
 * 行、§9.3、§11.2]；[回炉 W-D2a·T-B05] 自 useCardDrag 外移成件：useCardDrag 件行数超设计稿预算，
 * 按 r-tests/note.md 表四切面拆件——拖拽身份捕获、registry.dragStart/Flight/End 与 settle 桥
 * 驻本件，hook 只留 React／pointer 编排；桥接调用与注释逐字迁入，行为零改）。
 *
 * ── [B4 L2 §9.3] 拖拽两态桥接 registry ──
 * - 写归属身份（folderId+generation+drag id）在拖拽激活时捕获：组件因页面/folder
 *   切换卸载后，兜底写仍只到原会话；会话已因课题切换/恢复替换失效=丢弃并提示
 *   （reorderMonthSlots 承载）。
 * - 态一 pending/dragging（无 FlightJob）：注册有界 settle 请求=pointercancel 同型
 *   （复用 endSession 的 judgeByLastClient 判定链——零写 cancel 不提供）；quit/
 *   folder 切换/页面切换经 registry.awaitDragSettle 请求并等待。
 * - 态二 settle-flight（FlightJob 已建）：包装 finish——resolve settleFlight 句柄
 *   （600ms 兜底自 startFlight 起驻 flight 件）后携身份写；挂起等待者由句柄承载。
 * - 两态均阻塞同会话保存/历史命令起步（editUnit 闸读 registry.dragPending）；
 *   layoutActive=B3 屏障激活起→布局终局止（registry 镜像）。
 * - 卸载清场：未起飞的 FlightJob 直接 finish（数据写携身份落原会话）+清两态。
 *
 * ── 接口层 ── export function captureDragTarget/bridgeDragFlight/mirrorDragPhase/
 * clearDragOnUnmount
 *
 * ── 架构层 ── 纯桥接件：只依赖 lineage-session-registry（模块单例）与域内类型；不 import
 * React——ref／effect 等生命周期编排留在 useCardDrag。
 */
import type { FlightJob } from './card-drag-flight'
import type { DragPhase } from './drag-session-model'
import { lineageRegistry } from './lineage-session-registry'
import type { LineageDragTarget } from './lineage-session-model'

/** [B4 L2 §9.3] 拖拽身份（激活时捕获——含态清理判定）：pointerdown 时点由 hook 捕获 */
export function captureDragTarget(folderId: string, generation: number): LineageDragTarget {
  return { folderId, generation, dragId: crypto.randomUUID() }
}

/** 态二：包装 finish——先清两态+resolve settleFlight 句柄，再携身份写 */
export function bridgeDragFlight(target: LineageDragTarget, job: FlightJob): void {
  let resolveFlight!: () => void
  const settle = new Promise<void>((resolve) => {
    resolveFlight = resolve
  })
  const original = job.finish
  job.finish = () => {
    lineageRegistry.dragEnd(target.folderId, target.generation, target.dragId)
    resolveFlight()
    original()
  }
  lineageRegistry.dragFlight(target.folderId, target.generation, target.dragId, settle)
}

/** 态一有界 settle 请求（注册给 registry.dragSettler——quit/folder 切换/页面切换的 awaitDragSettle 触发） */
function requestPointercancelSettle(): void {
  // §9.3 态一出口=现行 pointercancel 同型有界 settle（endSession judgeByLastClient
  // 判定链复用——card-drag-session 行为零改；jsdom 无 PointerEvent 时降级 Event）
  const cancel =
    typeof PointerEvent === 'function'
      ? new PointerEvent('pointercancel', { pointerId: 1, clientX: 0, clientY: 0, bubbles: true })
      : new Event('pointercancel')
  document.dispatchEvent(cancel)
}

/**
 * [B4 L2 §9.3] 两态生命周期镜像：激活沿（pending→dragging）注册态一（dragging 置位
 *  +有界 settle 请求——会话闸拒绝的 pointerdown 不注册：态一只属已激活会话）；回
 *  idle（未过阈/收口）=清两态（等待者唤醒）。pending（未过阈）无写风险：quit 等
 *  出口对未注册态即零等待零写，无数据丢失面。
 * 返回调用方应持有的拖拽身份：回 idle=null（清）；其余相位=传入的身份原样。
 */
export function mirrorDragPhase(phase: DragPhase, target: LineageDragTarget | null): LineageDragTarget | null {
  if (phase === 'idle') {
    if (target !== null) lineageRegistry.dragEnd(target.folderId, target.generation, target.dragId)
    return null
  }
  if (target === null) return null
  if (phase === 'dragging') {
    lineageRegistry.dragStart(target.folderId, target.generation, target.dragId)
    lineageRegistry.dragSettler(target.folderId, target.generation, target.dragId, requestPointercancelSettle)
  }
  if (phase === 'dragging' || phase === 'settle') {
    lineageRegistry.dragLayout(target.folderId, target.generation, target.dragId, true) // layoutActive：激活起→终局止
  }
  return target
}

/** 卸载清场：未起飞的 FlightJob 直接 finish（数据写携身份落原会话）+清两态 */
export function clearDragOnUnmount(job: FlightJob | null, target: LineageDragTarget | null): void {
  job?.finish()
  if (target !== null) lineageRegistry.dragEnd(target.folderId, target.generation, target.dragId)
}
