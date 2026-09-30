/**
 * [T3-P5] lineage 写面守卫辅助 —— month/slot 归一+lineTypes 静态校验纯函数
 * （自 lineage.service 拆出——文件 500 行上限拆件，简报二段预裁：「排序/
 * 守卫辅助可拆 services/lineage/ 下新件」；排序契约不在此——唯一纯函数
 * lineageOrder 居 shared/models/lineage.ts，D-I-5）。
 *
 * - normalizeMonthSlot：D-I-1 三分支归一（slot 透写/新建组 max+1/同组更新
 *   保留/跨组落组末）+month 缺省=null（全量语义）。
 *   [F-FOLDER-01 W3 终裁·R2 勘正]组域扩为 (folderId, year, month)——新建/组变
 *   的 max+1 在**目标图**同 (year,month) 组内求值（同图内唯一；跨图 slot 独立
 *   无全局唯一义务）；year/month 不变且**同图**时 slot 保留；文献节点跨图移
 *   入不走本函数（papers.move-folder 移入分支按回炉码 6 显式走 nextSlotInGroup
 *   落组末——旧句「图归属单独变更不重排 slot」已废止，见 INV-75 R2 勘正）。
 *   [F-LGCLN-01 2026-09-30] 上段三面组域随显式跨图路径退役简化回 (year,
 *   month) 两面（service 主题分支禁搬图——existing 在场恒现图；folderId 相对
 *   existing 的变化唯一合法路径=moveFolder 在场分支恒显式传 slot，主权值
 *   透传即正确——历史 W3/R2 语义句保留备溯，现行态以函数注为准）。
 * - checkLineTypeGroups：upsertLineTypes 前两段静态校验（恒四组各一+subs.id
 *   全图唯一）；第三段（被现存边引用的 sub 不得消失）依赖运行时图状态，
 *   留守卫宿主 lineage.service（INV-27 修订守卫宿主=service 写面）。
 */
import {
  LINE_TYPE_BASE_ORDER,
  LINE_TYPE_GROUPS_REQUIRED_REASON,
  MAIN_GRAPH_ID,
  type LineTypeGroup,
  type LineageNode,
  type LineageNodeUpsert
} from '../../../shared/models/lineage'

/**
 * [F-FOLDER-01] 目标图组现行 slot 序（W3 单源）：组=(folderId,year,month) 内
 * max(slot)+1。消费：normalizeMonthSlot 组变分支+library.service moveFolder
 * 移入分支（回炉码 6：不透写原 slot——保 INV-75 同图内唯一）+import.service
 * 挂接建节点。禁各消费点自写 max 循环（Rule of Three 单源化）。
 */
export function nextSlotInGroup(
  nodes: readonly LineageNode[],
  folderId: string,
  year: number | null,
  month: number | null
): number {
  let max = 0
  for (const n of nodes) {
    if (n.folderId !== folderId || n.year !== year || n.month !== month) continue
    if (n.slot !== null && n.slot > max) max = n.slot
  }
  return max + 1
}

/**
 * [T3-P5] month/slot 归一（主控预裁 D-I-1；[F-FOLDER-01] 图域感知修订；
 * [F-FOLDER-02 F5] 组键三面化——W3 终裁对齐；[F-LGCLN-01 2026-09-30]
 * 显式跨图路径退役后简化回两面）：
 * - month=input.month ?? null（全量语义同 tags/x/y 反向清空惯例——缺省=清月）
 * - 组键=(year,month) 两面（F5 三面化的 folderId 面随 [F-LGCLN-01] 删除——
 *   upsertNode 主题分支禁搬图后，service 内 folderId 相对 existing 的变化
 *   唯一合法路径=papers.moveFolder 在场分支，该路径**恒显式传 slot**（调用
 *   方主权值 nextSlotInGroup 已算）→sameGroup 命中→slot=input.slot 透传
 *   正确；不传 slot 的 folderId 变化不存在——安全性由「禁搬+恒显式 slot」
 *   两前提合取保证）。同组=显式 slot 调用方主权透写（含 null 清面）/缺省
 *   保留原值；跨组（year/month 任一变）=归一目标组 max(slot)+1（W3 终裁
 *   语义——同组撞值防护）；新建（无既有行）显式 slot=主权透写、缺省=组末
 *   max+1（「落组末」语义——D-P5-10 跨月移动组键全面化）。
 *   papers.move-folder 移入分支按回炉码 6 显式走 nextSlotInGroup，不经本函数。
 */
export function normalizeMonthSlot(
  input: LineageNodeUpsert,
  nodes: readonly LineageNode[]
): { month: number | null; slot: number | null } {
  const month = input.month ?? null
  const existing = input.id !== undefined ? nodes.find((n) => n.id === input.id) : undefined
  const folder = input.folderId ?? existing?.folderId ?? MAIN_GRAPH_ID
  if (existing === undefined) {
    return {
      month,
      slot:
        input.slot !== undefined
          ? input.slot
          : nextSlotInGroup(nodes, folder, input.year, month)
    }
  }
  // [F-LGCLN-01] sameGroup 判定去 folderId 面（组键两面化）：跨图分支消失，
  // 组变归一仅剩 year/month 面+moveFolder 路径（该路径 folderId 虽变但恒显式
  // 传 slot——主权值透传，归一面由调用方 nextSlotInGroup 先行承担）
  const sameGroup = existing.year === input.year && existing.month === month
  if (sameGroup) {
    return { month, slot: input.slot !== undefined ? input.slot : existing.slot }
  }
  return { month, slot: nextSlotInGroup(nodes, folder, input.year, month) }
}

/** 静态校验结果：非空 reason=拒绝（中文，整批拒绝语义） */
export function checkLineTypeGroups(
  groups: readonly LineTypeGroup[]
): { ok: true } | { ok: false; reason: string } {
  const bases = groups.map((g) => g.base)
  if (
    groups.length !== LINE_TYPE_BASE_ORDER.length ||
    !LINE_TYPE_BASE_ORDER.every((b) => bases.includes(b))
  ) {
    return {
      ok: false,
      reason: LINE_TYPE_GROUPS_REQUIRED_REASON
    }
  }
  const seenCount = new Map<string, number>()
  for (const g of groups) {
    for (const s of g.subs) seenCount.set(s.id, (seenCount.get(s.id) ?? 0) + 1)
  }
  const dupIds = [...seenCount.entries()].filter(([, n]) => n > 1).map(([id]) => id)
  if (dupIds.length > 0) {
    return { ok: false, reason: `子线型 id 重复（全图唯一）：${dupIds.join('、')}` }
  }
  return { ok: true }
}
