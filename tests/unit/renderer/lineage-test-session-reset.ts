/**
 * [回炉 W-B1·R-B4] 测试专用：清空全部脉络会话（夹具跨用例复位）。
 *
 * - 生产不可调：本件在 tests/ 下，src/** 无任何 import 路径可达（原「清空全部会话」隐含在
 *   registry.patchActive 携 folderId 的植入里——生产写闸不再承担该职责，改键只作用于
 *   当前会话；跨用例不复用旧会话的隔离由各测试文件显式调用本函数）。
 * - 未落定写先 flush 不丢弃：任一会话 Q/F 非空→该会话 lane.flushFirst()（写链任务落定到原
 *   entry 的物理账本）后再移出注册表；直接移出会连同未派发的队列一起丢弃。
 * - 调用后注册表为空；活动键保留原值，下一次 store 访问按该键新建会话（夹具随后的
 *   useLineageStore.setState 植入落在新建会话上）。
 */
import { lineageRegistry } from '../../../src/renderer/features/lineage/lineage-session-registry'

export function resetLineageSessionsForTests(): void {
  for (const entry of lineageRegistry.sessions()) {
    if (entry.data.queue.length > 0 || entry.data.inflight !== null) entry.lane.flushFirst() // 未落定写先 flush 不丢弃
    lineageRegistry.remove(entry.key)
  }
}
