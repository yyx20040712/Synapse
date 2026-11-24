/**
 * [B4 L2 / 设计稿 §2.3 interaction 行、§9.3、§11.2] lineage-session-drag —— 拖拽两态桥接态
 * （[回炉 W-B2] 自 lineage-session-registry 外移：r-tests/note.md 表四切面第一刀——registry
 * 件行数超预算，桥接逻辑连同注释随迁；registry 留委托面，公共方法名不变）。
 *
 * ── 行为层（自 registry 头注与实现迁入）──
 * - 桥接态 DragBridge 驻 entry 旁侧（不进响应式快照）：dragging=态一（已激活未松手，
 *   无 FlightJob）；settleFlight=态二句柄（FlightJob 已建后的可等待句柄）。
 * - awaitDragSettle（§9.3 有界收口）：态二 await 句柄（600ms 兜底自 startFlight 起驻
 *   card-drag-flight）；态一请求有界 settle（useCardDrag 注册=pointercancel 同型）后等
 *   句柄出现，注册表侧 600ms 安全界（FlightJob 未建期无 flight 兜底——防 quit 永挂）。
 *   全部调用携 generation+drag id——过期组件（切图后卸载的旧 Timeline）不得清新拖拽的态。
 * - dragEnd 命中时清两态、唤醒等待者，并记录「本 entry 上已收尾的拖拽」{dragId, generation}
 *   （激活时捕获的代际；下一次 dragStart 覆盖）。
 * - 落位写准入 admitLanding（[回炉 W-B2·实验①] §9.3「useCardDrag 的回调必须捕获
 *   folderId+sessionGeneration+drag id……兜底写仍只到原会话」）：会话在册 ∧ 未删 ∧（代际
 *   相等 ∨ 上述记录与 {dragId, generation} 全等）。后者覆盖「存活主图会话就地换代」
 *   （lineage-session-remap：同一个 entry 换 sessionGeneration，数据/队列/历史连续）——
 *   拖拽激活时捕获的代际已不是会话现值，但拖拽确在本 entry 上收尾，落位不丢；原判据
 *   （只比代际）会把它当作会话已替换而丢弃并提示。恢复替换/改键/课题切换=新 entry
 *   （桥接态空、无记录）仍被拒——不写新图。桥接态保存的是激活时捕获值，不随会话代际
 *   变化，故 dragFlight/dragLayout/dragEnd 的既有寻址不受就地换代影响。
 *
 * ── 接口层 ── export interface DragBridge·SessionDrag；export function createSessionDrag(core)
 *
 * ── 架构层 ── 经 RegistryCore 读写注册表内部面（会话表/建会话/通知）；不 import registry
 * 运行时（类型单向依赖，零环）。
 */
import type { LineageDragTarget } from './lineage-session-model'
import type { SessionEntry } from './lineage-session-registry'
import { emptyDrag, type RegistryCore } from './lineage-session-core'

/** [§9.3] 拖拽桥接态（句柄与等待者——不进响应式快照） */
export interface DragBridge {
  dragId: string | null
  generation: number | null
  /** 态一有界 settle 请求（useCardDrag 注册：pointercancel 同型） */
  requestSettle: (() => void) | null
  settleFlight: Promise<void> | null
  waiters: Array<() => void>
  /** [回炉 W-B2·实验①] 本 entry 上已收尾的拖拽（激活时捕获的代际；下一次 dragStart 覆盖）——落位准入的重锚记录 */
  settled?: { dragId: string; generation: number } | null
}

export interface SessionDrag {
  /** 该会话两态在场（态一 dragging ∨ 态二 settleFlight）——editUnit/命令闸面 */
  busy(entry: SessionEntry): boolean
  pending(folderId: string): boolean
  start(folderId: string, generation: number, dragId: string): void
  settler(folderId: string, generation: number, dragId: string, requestSettle: () => void): void
  flight(folderId: string, generation: number, dragId: string, flight: Promise<void>): void
  layout(folderId: string, generation: number, dragId: string, active: boolean): void
  end(folderId: string, generation: number, dragId: string): void
  /** [§9.3] 有界收口：态二 await 句柄；态一请求有界 settle 后转态二 */
  awaitSettle(folderId: string): Promise<void>
  /** [回炉 W-B2·实验①] 落位写准入（见头注） */
  admitLanding(target: LineageDragTarget): boolean
}

/** 态一→态二过渡的注册表侧安全界（ms——FlightJob 未建期无 flight 兜底 timer） */
const DRAG_SETTLE_BOUND_MS = 600

export function createSessionDrag(core: RegistryCore): SessionDrag {
  const busy = (e: SessionEntry): boolean => e.interaction.dragging || e.interaction.settleFlight !== null
  const sameDrag = (e: SessionEntry, generation: number, dragId: string): boolean =>
    e.drag.generation === generation && e.drag.dragId === dragId
  const dragEntry = (folderId: string, generation: number, dragId: string): SessionEntry | undefined => {
    const e = core.sessions.get(folderId)
    return e !== undefined && sameDrag(e, generation, dragId) ? e : undefined
  }
  const wake = (e: SessionEntry): void => {
    for (const w of e.drag.waiters.splice(0)) w()
  }
  const end = (folderId: string, generation: number, dragId: string): void => {
    const e = dragEntry(folderId, generation, dragId)
    if (e === undefined) return
    e.interaction = { dragging: false, settleFlight: null, layoutActive: e.interaction.layoutActive }
    e.drag = { ...emptyDrag(), settled: { dragId, generation } } // 收尾记录：落位准入按 dragId 重锚（就地换代的存活会话）
    wake(e)
    core.notify()
  }
  const awaitSettle = async (folderId: string): Promise<void> => {
    let e = core.sessions.get(folderId)
    if (e === undefined || !busy(e)) return
    if (e.interaction.settleFlight === null) {
      // 态一：请求有界 settle→等 FlightJob 句柄登记或会话终结（有界安全界）
      const current = e // 闭包捕获（e 其后可被重新取值）
      await new Promise<void>((resolve) => {
        current.drag.waiters.push(resolve)
        current.drag.requestSettle?.()
        setTimeout(() => {
          const i = current.drag.waiters.indexOf(resolve)
          if (i >= 0) current.drag.waiters.splice(i, 1)
          resolve()
        }, DRAG_SETTLE_BOUND_MS)
      })
      e = core.sessions.get(folderId)
      if (e === undefined) return
    }
    const flight = e.interaction.settleFlight
    if (flight !== null) await flight // 态二：await 句柄（≤600ms flight 兜底）
  }

  return {
    busy,
    pending: (folderId) => {
      const e = core.sessions.get(folderId)
      return e !== undefined && busy(e)
    },
    start(folderId, generation, dragId) {
      const e = core.ensure(folderId)
      e.drag = { dragId, generation, requestSettle: null, settleFlight: null, waiters: [] }
      e.interaction.dragging = true
      core.notify()
    },
    settler(folderId, generation, dragId, requestSettle) {
      const e = dragEntry(folderId, generation, dragId)
      if (e !== undefined) e.drag.requestSettle = requestSettle
    },
    flight(folderId, generation, dragId, flight) {
      const e = dragEntry(folderId, generation, dragId)
      if (e === undefined) return
      e.interaction.dragging = false // 态一→态二：FlightJob 已建
      e.interaction.settleFlight = flight
      e.drag.settleFlight = flight
      wake(e)
      core.notify()
    },
    layout(folderId, generation, dragId, active) {
      const e = dragEntry(folderId, generation, dragId)
      if (e !== undefined) e.interaction.layoutActive = active
    },
    end,
    awaitSettle,
    admitLanding(target) {
      const e = core.sessions.get(target.folderId)
      if (e === undefined || e.data.deleted) return false
      if (e.data.sessionGeneration === target.generation) return true
      const settled = e.drag.settled
      return settled !== undefined && settled !== null && settled.dragId === target.dragId && settled.generation === target.generation
    }
  }
}
