/**
 * 测试基建：lineage/history-unit 桩（B4 L1——undo/redo 改 async history-unit 后
 * 渲染层测试的公共回显桩）。
 *
 * 语义：模拟 main 事务提交后的服务器版本——按 direction 回显本次 touched 行的
 * 目标态（undo=before、redo=after；目标态 null=已删除不出现在响应），色行名
 * delta 回显目标名。响应形状=LineageHistoryUnitRes（ipc/lineage-history.schemas）。
 * 需要失败/冲突/迟到语义的用例在各自测试内 mockResolvedValueOnce 覆盖。
 */
import { vi, type Mock } from 'vitest'
import { defaultLineTypeNames } from '../../src/shared/models/lineage'
import type {
  LineageEntityDelta,
  LineageHistoryUnitReq,
  LineageHistoryUnitRes
} from '../../src/shared/ipc/lineage-history.schemas'

export type HistoryUnitStub = Mock<typeof echoHistoryUnit>

/** 回显实现（普通函数——测试 beforeEach 的 mockReset 循环后用 mockImplementation 重挂） */
export async function echoHistoryUnit(req: LineageHistoryUnitReq): Promise<{ ok: true; data: LineageHistoryUnitRes }> {
  {
    const res: LineageHistoryUnitRes = {
      folderId: req.folderId,
      unitId: req.unitId,
      nodes: [],
      edges: [],
      floatingNotes: [],
      lineTypeNames: defaultLineTypeNames()
    }
    const target = (d: LineageEntityDelta): unknown => (d.kind === 'line-type-names' ? null : req.direction === 'undo' ? d.before : d.after)
    for (const d of req.changes) {
      if (d.kind === 'line-type-names') {
        res.lineTypeNames = [...(req.direction === 'undo' ? d.before : d.after)]
        continue
      }
      const t = target(d)
      if (t === null) continue
      if (d.kind === 'node') res.nodes.push(t as LineageHistoryUnitRes['nodes'][number])
      else if (d.kind === 'edge') res.edges.push(t as LineageHistoryUnitRes['edges'][number])
      else res.floatingNotes.push(t as LineageHistoryUnitRes['floatingNotes'][number])
    }
    return { ok: true, data: res }
  }
}

/** 回显桩（vi.fn(echoHistoryUnit)——可被 mockResolvedValueOnce/mockImplementation 覆盖） */
export function makeHistoryUnitStub(): HistoryUnitStub {
  return vi.fn(echoHistoryUnit)
}
