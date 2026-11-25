/**
 * [B4 L2 / 设计稿 §2.3 sessionGeneration·loadSeq·inflightGraph 行、§2.5 #19/#35/#36、
 * §2.6 #43、§11.2] lineage-session-rekey —— 活动投影写闸的落地裁决（registry.patchActive
 * 的改键/植入段；[回炉 W-B1·R-B4] 自 registry 外移成件：改键=换新身份的全部逻辑驻本件）。
 *
 * ── 行为层 ──
 * - 植入（patch 不携 folderId，或 folderId=当前活动键）：就地合并到活动会话——身份不变。
 *   宿主/夹具经 useLineageStore.setState 植入状态面的既有语义。携 folderId 的植入是
 *   宿主对活动会话的声明（会话世界复位）：旧世界在途读句柄与拖拽桥接态弃置（读句柄
 *   不可被新世界单飞复用——loader.activate 见 status=loading∧无句柄即重载）。
 * - 改键（patch 携 folderId≠当前活动键）：当前会话换新身份——新 entry（新 sessionGeneration、
 *   loadSeq 归零、新 lane、无在途读句柄）。注册表键与 data.folderId 由此恒等（每个文件夹
 *   恰一个会话；改键不是「把旧 entry 改个键」）。旧 entry 成孤儿：其在途读/写在途响应按
 *   身份键丢弃（loader applyKeyed、history-unit 的身份判据），迟到写只落孤儿的物理账本。
 * - 迁入新身份的内容=图四面+派生三面+读面状态+历史两栈+U+focusSet（内容随会话走）；
 *   IO 轴不迁（queue/inflight/相位回 clean）：旧身份的未落定写属于旧身份——由旧 lane
 *   flush-first 落到旧 entry 的物理账本，不丢弃、不冒充新身份（旧 identity 的动作目标
 *   是旧 folder 的实体）。[B5 §6.1] 写失败的 message 与 source 同属 IO 轴——同样不迁
 *   （成对留在原会话；新身份=无消息无来源，不落到别的 folder）。patch 显式携带的 IO 字段
 *   照常覆盖（夹具声明）。
 * - focusSet 的迁移集合（[B5 设计稿 §5.2 rekey 特殊顺序①]）：在 depart **前**从 view.store
 *   捕获当时活动集合（activeFocusSet——由调用方在离场前取定传入），不得读可能尚未挂起
 *   同步的旧 entry.data.focusSet（活动会话的集合存储=view.store，entry 副本只在图态写点
 *   与挂起时刷新）。
 * - 改键的投影时序（rekey 特殊顺序②③）：fresh 仍非活动时 core.apply(fresh, {...carried, ...next})——
 *   apply 入口以该迁移集合×patch 后 nodes 先剪 fresh.data.focusSet；切活动键后必须经
 *   core.projectActiveSession(fresh)：由同一入口同步剪后的 view.store.focusSet 并投影其余
 *   LineageStore 字段。原「只投 LineageStore」的收尾会让 registry 已剪而 view.store 仍留死
 *   id（§5.3-6）。remap 不复制本时序——它经 core.activate 进入目标会话，已含统一切键与投影口。
 * - 按新身份续拉：仅当旧身份有在途读被弃置（其迟到响应按身份键丢弃后须由新身份重读，
 *   #35）且新会话 status=loading、无在途读→loader.load；旧身份无在途读=不续拉，取数
 *   交调用方裁决（loader.activate 见 loading∧无句柄即重载——夹具的「声明加载中」植入
 *   不得自带一次读，否则与页面挂载取数成双取）。
 * - 只作用于当前会话：其他会话及其未落定写不动（原实现「清空其他全部会话」退役——夹具的
 *   跨用例复位改走测试专用 resetLineageSessionsForTests）。目标键下已有会话时该会话被
 *   新身份顶替（同一文件夹不能有两个会话）：其未落定写同样先 flush-first 再离场。
 *
 * ── 接口层 ── export function implantActive(core, next, activeFocusSet)
 *
 * ── 架构层 ── 纯编排件：经 RegistryCore 读写注册表内部面；不 import registry 运行时。
 */
import type { LineageStore } from './lineage-session-model'
import type { LineageSession, SessionEntry } from './lineage-session-registry'
import { emptyDrag, type RegistryCore } from './lineage-session-core'

/** 随内容迁入新身份的会话面（IO 轴与身份字段不在其中——见头注） */
const CARRIED = [
  'nodes', 'edges', 'lineTypeNames', 'floatingNotes', 'paperMetrics', 'pubNos', 'tagNames',
  'status', 'error', 'needsReload', 'invalidationEpoch', 'undoStack', 'redoStack',
  'unfinalized', 'editRevision', 'focusSet'
] as const satisfies readonly (keyof LineageSession)[]

const hasUnsettledWrite = (entry: SessionEntry): boolean => entry.data.queue.length > 0 || entry.data.inflight !== null

export function implantActive(core: RegistryCore, next: Partial<LineageStore>, activeFocusSet: readonly string[]): void {
  const current = core.activeFolder()
  const entry = core.ensure(current)
  const target = next.folderId
  if (target === undefined || target === current) {
    if (target !== undefined) {
      entry.inflightGraph = null // 旧世界在途读句柄弃置（不可被新世界单飞复用）
      entry.interaction = { dragging: false, settleFlight: null, layoutActive: false }
      entry.drag = emptyDrag()
    }
    core.apply(entry, next) // 同键=就地植入（身份不变）
    return
  }
  /** 会话离场：旧身份成孤儿（在途链任务落定到它自己的物理账本）；未落定写先 flush 不丢弃 */
  const depart = (leaving: SessionEntry): void => {
    if (hasUnsettledWrite(leaving)) leaving.lane.flushFirst()
    leaving.data.deleted = true
    leaving.lane.dispose()
    if (core.sessions.get(leaving.key) === leaving) core.sessions.delete(leaving.key)
  }
  const discardedRead = entry.inflightGraph !== null // 旧身份的在途读随旧 entry 弃置
  depart(entry)
  const displaced = core.sessions.get(target)
  if (displaced !== undefined) depart(displaced) // 目标键下既有会话被新身份顶替
  const fresh = core.makeEntry(target)
  core.sessions.set(target, fresh)
  // [B5 §5.2 ①] 迁移集合=depart 前捕获的活动集合（view.store 现值）——不读旧 entry.data.focusSet（可能尚未挂起同步）
  const carried = Object.fromEntries(CARRIED.map((k) => [k, k === 'focusSet' ? activeFocusSet : entry.data[k]])) as unknown as Partial<LineageSession>
  // ② fresh 仍非活动：apply 入口以该迁移集合×patch 后 nodes 先剪 fresh.data.focusSet
  core.apply(fresh, { ...carried, ...next })
  core.setActiveFolder(target)
  // ③ 切活动键后经统一活动整幅投影口：同步剪后的 view.store.focusSet 并投影其余 LineageStore 字段
  core.projectActiveSession(fresh)
  core.notify()
  if (discardedRead && fresh.data.status === 'loading' && fresh.inflightGraph === null) void core.loader.load(fresh) // 按新身份续拉
}
