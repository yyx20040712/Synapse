/**
 * [B5 设计稿 §5 C3 图态写点收口剪枝、§2.1 成员有效性不变量、§5.2 落点；B5-D03=甲]
 * lineage-focus-membership —— 聚焦集成员剪枝纯件。
 *
 * 背景（B4 遗留缺陷 C3）：toggleFocus/clearFocus/setMode 与 graph·history 的图态回写都不按图
 * 成员剪枝——聚焦已恢复的卡后重做删除，会把已不存在的 node id 留在集合中，计数与 .focused
 * 投影失真。
 *
 * ── 行为层 ──
 * - 不变量：focusSet(folder) ⊆ ids(session(folder).nodes)——集合只含该图当前 nodes 中的 id。
 * - 选型=写点收口，不采用投影过滤：投影过滤只让计数与视觉暂时好看，registry/view.store 仍留
 *   死 id；undo 恢复同 id 时会意外复活旧成员关系；per-folder 后台回写也无法只靠 UI 过滤处理。
 * - pruneFocusMembers(focusSet, nodes)：按 nodes 剪枝。无死 id 返回**原引用**（合法集合同值
 *   同引用——不产生无意义重渲染）；有死 id 返回新数组：幸存 id 保持相对加入序，不重排，不自动
 *   加入 patch 新恢复/新增的节点（undo 恢复卡不复活删除前的聚焦关系——§2.2 #21）。
 * - normalizeFocusInPatch(current, patch)：会话 patch 归一化助手——patch 写 nodes 时以 **patch
 *   后的 nodes** 为准剪枝 focusSet；集合读源=patch 显式携带的 focusSet，否则取该会话现集合
 *   current（活动会话=lineage-view.store 现集合；挂起会话=entry.data.focusSet）。patch 不写
 *   nodes=原样返回（无图态写点不剪）。所有 entry 写（lineage-session-projection 的 apply 与
 *   replace 入口）经本助手——普通删卡、graph load、权威和解、history 回写只是触发源，剪枝
 *   不散加到这些表面调用点。
 * - 剪枝只在图态写点发生，不在每次 render 扫描 nodes（§4.3）。
 *
 * ── 接口层 ── export function pruneFocusMembers/normalizeFocusInPatch
 *
 * ── 架构层 ── 纯函数件：零运行时依赖（会话类型 type-only import——registry/projection/
 * loader/lane/history-unit 与组件测试均可依赖，不成环）。
 */
import type { LineageSession } from './lineage-session-registry'

/** 按 nodes 剪枝：无死 id 返回原引用；有死 id 返回新数组（幸存 id 保相对加入序、不重排、不自动加入新节点） */
export function pruneFocusMembers(focusSet: readonly string[], nodes: readonly { id: string }[]): string[] {
  const alive = new Set(nodes.map((n) => n.id))
  if (!focusSet.some((id) => !alive.has(id))) return focusSet as string[]
  return focusSet.filter((id) => alive.has(id))
}

/** 会话 patch 归一化：patch 携 nodes=按 patch 后 nodes 剪枝（读源=patch 显式 focusSet ?? 会话现集合 current）；不携 nodes=原样返回 */
export function normalizeFocusInPatch(current: readonly string[], patch: Partial<LineageSession>): Partial<LineageSession> {
  if (patch.nodes === undefined) return patch
  return { ...patch, focusSet: pruneFocusMembers(patch.focusSet ?? current, patch.nodes) }
}
