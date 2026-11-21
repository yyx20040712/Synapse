/**
 * [F-RECOV-04] recovery-restore-preflight —— 恢复前冲突预检（纯数据冲突清单；
 * 设计稿 §3.5 七 kind 逐类判据）。零 IPC、零 store 依赖：输入=恢复载荷+库态读面
 * 结果（宿主装配 graph/folders 读取后传入），输出=冲突项数组——「哪些动作不能
 * 原样恢复」。呈现与确认流宿主承载（RecoveryBarHost）；预检读取失败与冲突清单
 * 不同态（主控终裁 ②——阻断可重试，不混入冲突态）。
 *
 * ── 判据基准面 ──
 * 对照面=库态读面（lineage/graph 的 nodes/edges/floatingNotes + folders 清单），
 * 非 payload 自带图快照：恢复只回放 queue 动作到 DB，不整图落库——动作能否成立
 * 由库态权威决定（重放 CONFLICT 丢弃语义=flush 既有链）。
 * 边界：payload.folderId 整图级校验=既有 folderAlive/deadFolder 面，不入动作级
 * 清单；draft.noteId 引用=既有水化计划容错（不在图→asNewNote），不入清单。
 */
import { MAIN_GRAPH_ID } from '@shared/models/lineage'
import type { LineageRecoveryPayload, WriteAction } from '@shared/recovery/schemas'

/** 库态读面窄形（宿主由 lineage/graph Res+folders 清单装配） */
export interface PreflightView {
  nodeIds: ReadonlySet<string>
  edgeIds: ReadonlySet<string>
  noteIds: ReadonlySet<string>
  /** 活文件夹 id 集（MAIN_GRAPH_ID 恒活——由判据内短路，不要求在场） */
  folderIds: ReadonlySet<string>
}

export interface PreflightConflict {
  /** 动作在恢复载荷 queue 中的序号 */
  index: number
  kind: WriteAction['kind']
  /** lost=动作意图无法达成（重放将 CONFLICT 丢弃）；gone=目标已亡（重放按既有丢弃语义收口） */
  level: 'lost' | 'gone'
  /** 用户可读中文描述（呈现面直用） */
  reason: string
}

/** 读面结果→判定视图（id 集合化——O(1) 成员判定） */
export function buildPreflightView(
  graph: {
    nodes: ReadonlyArray<{ id: string }>
    edges: ReadonlyArray<{ id: string }>
    floatingNotes: ReadonlyArray<{ id: string }>
  },
  folderIds: ReadonlyArray<string>
): PreflightView {
  return {
    nodeIds: new Set(graph.nodes.map((n) => n.id)),
    edgeIds: new Set(graph.edges.map((e) => e.id)),
    noteIds: new Set(graph.floatingNotes.map((n) => n.id)),
    folderIds: new Set(folderIds)
  }
}

/** 逐动作预检：返回冲突清单（空=全部动作可原样恢复） */
export function preflightRestorePayload(
  payload: LineageRecoveryPayload,
  view: PreflightView
): PreflightConflict[] {
  const conflicts: PreflightConflict[] = []
  payload.queue.forEach((action: WriteAction, index: number) => {
    const reason = checkAction(action, index, view)
    if (reason !== null) conflicts.push(reason)
  })
  return conflicts
}

function checkAction(
  action: WriteAction,
  index: number,
  view: PreflightView
): PreflightConflict | null {
  if (action.kind === 'patch-node') {
    if (!view.nodeIds.has(action.id)) {
      return { index, kind: action.kind, level: 'lost', reason: `第 ${index + 1} 项：节点调整的目标节点已不存在，无法原样恢复` }
    }
    return null
  }
  if (action.kind === 'remove-node') {
    if (!view.nodeIds.has(action.id)) {
      return { index, kind: action.kind, level: 'gone', reason: `第 ${index + 1} 项：待删除的节点已不存在（该项将按既有丢弃语义跳过）` }
    }
    return null
  }
  if (action.kind === 'upsert-edge') {
    const from = action.input.fromNode
    const to = action.input.toNode
    if (!view.nodeIds.has(from) || !view.nodeIds.has(to)) {
      return { index, kind: action.kind, level: 'lost', reason: `第 ${index + 1} 项：连线的端点节点已不存在，无法重建该连线` }
    }
    return null
  }
  if (action.kind === 'remove-edge') {
    if (!view.edgeIds.has(action.id)) {
      return { index, kind: action.kind, level: 'gone', reason: `第 ${index + 1} 项：待删除的连线已不存在（该项将按既有丢弃语义跳过）` }
    }
    return null
  }
  if (action.kind === 'upsert-line-type-names') {
    return null // 整批替换 6 行色名——无实体引用，恒无冲突
  }
  if (action.kind === 'upsert-floating-note') {
    const folderId = action.input.folderId
    if (folderId !== MAIN_GRAPH_ID && !view.folderIds.has(folderId)) {
      return { index, kind: action.kind, level: 'lost', reason: `第 ${index + 1} 项：笔记的保存目标文件夹已删除，无法原样恢复` }
    }
    return null
  }
  // remove-floating-note
  if (!view.noteIds.has(action.id)) {
    return { index, kind: action.kind, level: 'gone', reason: `第 ${index + 1} 项：待删除的笔记已不存在（该项将按既有丢弃语义跳过）` }
  }
  return null
}
