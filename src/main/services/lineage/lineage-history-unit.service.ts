/**
 * [B4 L1 / 设计稿 §5.3/§7.3/§7.5] lineage-history-unit.service —— 一次 undo/redo
 * 的反向实体变化集在 main 的一个 repo 事务内执行（主控终裁 2）。
 *
 * ── 行为层（§7.3 执行序；service 内无 async 步骤）──
 * 1. IPC 薄分发到本件；2. withTransaction 内一次性读当前图与 folder/paper 存在性；
 * 3. 按 direction 对每个 change 核对当前实体与预期端态的语义指纹（undo 核对
 *    after、redo 核对 before；指纹排除 updatedAt 与派生 isStarred——shared
 *    lineageEntityFingerprint 两进程同源）——任一不符抛 CONFLICT/HISTORY_STALE，
 *    写前失败；
 * 4. 归属图校验（§7.2）——请求内 node/edge/note 的 folder 归属必须与 req.folderId
 *    一致：节点/悬浮笔记取 before/after 非空侧的 folderId；边无 folderId，由端点
 *    节点派生（当前侧端点取库内现状节点、目标侧端点取最终 touched 图节点）；
 *    恢复节点的 folderId 还须等于其文献当前归属图（INV-88——papers.folder_id，
 *    文献被移到别的文件夹后其节点不得在原图恢复）；
 *    再在内存模拟最终 touched 图并过纯图守卫（lineage-history-guards）：folder/
 *    paper 存在、一文献一节点、悬空/重复/成环/跨图/via/锚；
 * 5. undo 按反序、redo 按顺序调用 lineage-history.repo 固定 prepared 语句
 *    （删除相关边先于节点；恢复节点先于相关边）；
 * 6. 目标态在场而行缺席=恢复插入：updated_at 由恢复点守卫计算（恢复事务
 *    时间；同事务 readMaxDeletedAt，不大于则进 1ms）；更新既有行经 putExact
 *    UPDATE 分支的同一写点单调公式；不删除或更新 append-only 日志；
 * 7. 提交后返回 touched 行（只含本次受影响实体的服务器版本+当前 folder
 *    色行名）。任一步抛错由 better-sqlite3 回滚——全有或全无。
 *
 * 拒绝面（均 CONFLICT，零写）：reason=HISTORY_FOLDER_MISSING/HISTORY_PAPER_MISSING
 * /HISTORY_STALE/HISTORY_GRAPH_INVALID（AppError.reason 受控串——app-error.ts 登记；
 * HISTORY_GRAPH_INVALID=最终图结构守卫拒绝、实体归属图≠req.folderId，或恢复节点的
 * folderId≠其文献当前归属图——文献已不在该文件夹，INV-88）。
 *
 * ── 接口层 ──
 * - export function createLineageHistoryUnitService(deps): LineageHistoryUnitService
 *
 * ── 架构层 ──
 * - service 持 repo（注入保可测），禁直写 SQL；本件不接收路径/不出网/不改 CSP。
 * - 测试=tests/unit/services/lineage-history-unit.service.test.ts（真库）。
 */
import {
  lineageEntityFingerprint,
  type LineageEntityDelta,
  type LineageHistoryConflictReason,
  type LineageHistoryUnitReq,
  type LineageHistoryUnitRes
} from '../../../shared/ipc/lineage-history.schemas'
import type { FloatingNote, LineageEdge, LineageNode } from '../../../shared/models/lineage'
import type { LineageHistoryEntity, LineageHistoryRepo } from '../../db/repos/lineage-history.repo'
import { DomainError } from '../shared/domain-error'
import { finalGraphGuardIssue } from './lineage-history-guards'

export interface LineageHistoryUnitServiceDeps {
  historyRepo: LineageHistoryRepo
  /** 色行名 meta 读写（lineage.repo 同键面——history 的 line-type-names delta 经此写） */
  meta: {
    getLineTypeNames(folderId: string): string[]
    setLineTypeNames(folderId: string, names: string[]): void
  }
  listGraph(): { nodes: LineageNode[]; edges: LineageEdge[] }
  folderExists(folderId: string): boolean
  paperExists(paperId: string): boolean
  /** [INV-88] 文献当前归属图（papers.folder_id 单源读口=papers.repo folderIdOf；主图与
   *  节点 folderId 同为 '__main__'，无映射层）。行未命中=null——paperExists 在前，
   *  校验点不可达 */
  paperFolderIdOf(paperId: string): string | null
  withTransaction<T>(fn: () => T): T
  /** 事务时间源（缺省=系统时钟；测试注入确定性） */
  now?: () => string
}

export interface LineageHistoryUnitService {
  unit(req: LineageHistoryUnitReq): LineageHistoryUnitRes
}

class LineageHistoryDomainError extends DomainError {}

/** [用户裁决 R12 / 回炉 W-D2c] 拒因值按 shared 单源 HISTORY_UNIT_CONFLICT_REASONS 类型约束——
 *  字面量不属于集合即 typecheck 红（值域单源=src/shared/ipc/lineage-history.schemas） */
const REASON: Record<'folderMissing' | 'graphInvalid' | 'paperMissing' | 'stale', LineageHistoryConflictReason> = {
  folderMissing: 'HISTORY_FOLDER_MISSING',
  graphInvalid: 'HISTORY_GRAPH_INVALID',
  paperMissing: 'HISTORY_PAPER_MISSING',
  stale: 'HISTORY_STALE'
}

const LABEL_OF = { node: '节点', edge: '连线', 'floating-note': '悬浮笔记' } as const

/** ISO 串 +1ms（与迁移 028 触发器 strftime('+0.001 seconds') 同算术——JS Date 毫秒精确进位） */
function plusOneMs(isoText: string): string {
  return new Date(Date.parse(isoText) + 1).toISOString()
}

const sameNames = (a: readonly string[], b: readonly string[]): boolean => JSON.stringify(a) === JSON.stringify(b)

export function createLineageHistoryUnitService(deps: LineageHistoryUnitServiceDeps): LineageHistoryUnitService {
  const repo = deps.historyRepo
  const now = deps.now ?? ((): string => new Date().toISOString())

  /** 恢复点守卫（§7.5）：恢复行 updated_at=恢复事务时间；不大于该 id MAX(deleted_at) 则进 1ms */
  const restoreTimestamp = (entity: LineageHistoryEntity, id: string, txNow: string): string => {
    const maxDeleted = repo.readMaxDeletedAt(entity, id)
    return maxDeleted !== null && txNow <= maxDeleted ? plusOneMs(maxDeleted) : txNow
  }

  const applyUnit = (req: LineageHistoryUnitReq, txNow: string): LineageHistoryUnitRes => {
    if (!deps.folderExists(req.folderId)) {
      throw new LineageHistoryDomainError('CONFLICT', `文件夹不存在：${req.folderId}`, REASON.folderMissing)
    }
    const undo = req.direction === 'undo'
    const folderMissing = (folderId: string): LineageHistoryDomainError =>
      new LineageHistoryDomainError('CONFLICT', `文件夹不存在：${folderId}`, REASON.folderMissing)
    const stale = (what: string, id: string): LineageHistoryDomainError =>
      new LineageHistoryDomainError('CONFLICT', `${what}已被其他操作改变（${id}），撤销/重做未执行`, REASON.stale)
    // 归属图不符（§7.2）：detail=哪个实体/端点不属于请求文件夹
    const notOwned = (detail: string): LineageHistoryDomainError =>
      new LineageHistoryDomainError('CONFLICT', `实体的归属图与请求文件夹不一致（${detail}，请求 ${req.folderId}），撤销/重做未执行`, REASON.graphInvalid)
    const readCurrent = (d: LineageEntityDelta): LineageNode | LineageEdge | FloatingNote | null =>
      d.kind === 'node' ? repo.getNode(d.id) : d.kind === 'edge' ? repo.getEdge(d.id) : d.kind === 'floating-note' ? repo.getFloatingNote(d.id) : null

    // 步骤 3：写前核对语义指纹（当前实体 ≡ 预期端态：undo 核对 after，redo 核对 before）
    for (const d of req.changes) {
      if (d.kind === 'line-type-names') {
        if (!sameNames(deps.meta.getLineTypeNames(req.folderId), undo ? d.after : d.before)) throw stale('色行名', req.folderId)
        continue
      }
      const expected = undo ? d.after : d.before
      if (lineageEntityFingerprint(d.kind, readCurrent(d)) !== lineageEntityFingerprint(d.kind, expected)) {
        throw stale(LABEL_OF[d.kind], d.id)
      }
    }

    // 写序：undo 反序、redo 顺序；目标态=undo 取 before、redo 取 after
    const ordered = undo ? [...req.changes].reverse() : req.changes

    // 归属图校验（§7.2「所有 node/edge/note 的 folder 归属必须与 req.folderId 一致」）+ 事务前
    // 检查 folder 与 paper 仍存在（§5.3 第 4 条——目标态实体的归属域）。节点/悬浮笔记自带
    // folderId：before/after 非空侧均须等于 req.folderId（shared schema 同拒——本件独立校验，
    // 不经 schema 的调用方同样生效）；边无 folderId，归属图由端点节点派生，在步骤 4 读图后
    // 校验；色行名归属=req.folderId（入口已检）；恢复节点的 folderId 还须等于其文献当前
    // 归属图（INV-88——文献被移到别的文件夹后，其节点不得在原图恢复）
    for (const d of req.changes) {
      if (d.kind === 'node' || d.kind === 'floating-note') {
        for (const side of [d.before, d.after]) {
          if (side !== null && side.folderId !== req.folderId) throw notOwned(`${LABEL_OF[d.kind]} ${d.id} 属 ${side.folderId}`)
        }
      }
      if (d.kind === 'node') {
        const target = undo ? d.before : d.after
        if (target === null) continue
        if (!deps.folderExists(target.folderId)) throw folderMissing(target.folderId)
        if (target.paperId !== null && !deps.paperExists(target.paperId)) {
          throw new LineageHistoryDomainError('CONFLICT', `文献已删除，无法恢复其节点：${target.paperId}`, REASON.paperMissing)
        }
        // INV-88（节点归属图＝其文献归属图）：文献被移到别的文件夹后，其节点不得在原图恢复。
        // 目标态 folderId 在此已等于 req.folderId（上方归属图校验），比较对象取目标态自身；
        // 无文献节点（paperId=null）不涉；存在性检查在前——文献已删仍报 HISTORY_PAPER_MISSING
        if (target.paperId !== null) {
          const paperFolder = deps.paperFolderIdOf(target.paperId)
          if (paperFolder !== target.folderId) {
            throw new LineageHistoryDomainError(
              'CONFLICT',
              `文献已不在该文件夹，无法在该图恢复其节点：${target.paperId}（文献现属 ${paperFolder ?? '缺席'}）`,
              REASON.graphInvalid
            )
          }
        }
      } else if (d.kind === 'floating-note') {
        const target = undo ? d.before : d.after
        if (target !== null && !deps.folderExists(target.folderId)) throw folderMissing(target.folderId)
      }
    }

    // 步骤 4：内存模拟最终 touched 图（目标态 null=移除；非 null=写入目标态）
    const graph = deps.listGraph()
    const nodeTarget = new Map<string, LineageNode | null>()
    const edgeTarget = new Map<string, LineageEdge | null>()
    for (const d of ordered) {
      if (d.kind === 'node') nodeTarget.set(d.id, undo ? d.before : d.after)
      else if (d.kind === 'edge') edgeTarget.set(d.id, undo ? d.before : d.after)
    }
    const overlay = <T extends { id: string }>(list: T[], target: Map<string, T | null>): T[] => [
      ...list.filter((x) => !target.has(x.id)),
      ...[...target.values()].filter((t): t is T => t !== null)
    ]
    const finalNodes = overlay(graph.nodes, nodeTarget)
    const issue = finalGraphGuardIssue({
      nodes: finalNodes,
      edges: overlay(graph.edges, edgeTarget),
      touchedNodes: [...nodeTarget.values()].filter((n): n is LineageNode => n !== null),
      touchedEdges: [...edgeTarget.values()].filter((e): e is LineageEdge => e !== null)
    })
    if (issue !== null) throw new LineageHistoryDomainError('CONFLICT', issue.message, REASON.graphInvalid)

    // 边归属图校验（§7.2）：边无 folderId，归属图=两端节点的 folderId，均须等于 req.folderId。
    // 当前侧=库内现有边（删除态只有这一侧），端点取库内现状节点；目标侧=非 null 的
    // before/after（恢复态只有这一侧），端点取最终 touched 图的节点——含本 unit 内恢复的
    // 节点目标态（undo removeNode 先恢复节点再恢复相关边）。单边守卫的跨图拒只拦
    // 「两端异图」，不拦「两端同属另一图」——后者由本校验拦。零写：全部校验先于写循环
    const folderOf = (nodes: LineageNode[]): Map<string, string> => new Map(nodes.map((n) => [n.id, n.folderId]))
    const currentFolder = folderOf(graph.nodes)
    const targetFolder = folderOf(finalNodes)
    for (const d of req.changes) {
      if (d.kind !== 'edge') continue
      const sides = [
        ['当前侧', repo.getEdge(d.id), currentFolder],
        ['目标侧', undo ? d.before : d.after, targetFolder]
      ] as const
      for (const [side, edge, folders] of sides) {
        if (edge === null) continue
        const foreign = [edge.fromNode, edge.toNode].find((id) => folders.get(id) !== req.folderId)
        if (foreign !== undefined) throw notOwned(`连线 ${d.id} 的${side}端点 ${foreign} 属 ${folders.get(foreign) ?? '节点缺席'}`)
      }
    }

    // 步骤 5/6：按序写（行缺席=恢复插入→恢复点守卫；在场=反向更新→事务时间，putExact UPDATE 分支单调）
    const stamp = (entity: LineageHistoryEntity, id: string, absent: boolean): string =>
      absent ? restoreTimestamp(entity, id, txNow) : txNow
    const res: LineageHistoryUnitRes = { folderId: req.folderId, unitId: req.unitId, nodes: [], edges: [], floatingNotes: [], lineTypeNames: [] }
    for (const d of ordered) {
      if (d.kind === 'line-type-names') {
        deps.meta.setLineTypeNames(req.folderId, undo ? d.before : d.after)
      } else if (d.kind === 'node') {
        const target = undo ? d.before : d.after
        if (target === null) repo.removeNode(d.id)
        else res.nodes.push(repo.putNodeExact({ ...target, updatedAt: stamp('lineage_nodes', d.id, repo.getNode(d.id) === null) }))
      } else if (d.kind === 'edge') {
        const target = undo ? d.before : d.after
        if (target === null) repo.removeEdge(d.id)
        else res.edges.push(repo.putEdgeExact({ ...target, updatedAt: stamp('lineage_edges', d.id, repo.getEdge(d.id) === null) }))
      } else {
        const target = undo ? d.before : d.after
        if (target === null) repo.removeFloatingNote(d.id)
        else res.floatingNotes.push(repo.putFloatingNoteExact({ ...target, updatedAt: stamp('floating_notes', d.id, repo.getFloatingNote(d.id) === null) }))
      }
    }
    res.lineTypeNames = deps.meta.getLineTypeNames(req.folderId) // 步骤 7：touched 行+当前 folder 色行名
    return res
  }

  return {
    unit(req: LineageHistoryUnitReq): LineageHistoryUnitRes {
      return deps.withTransaction(() => applyUnit(req, now()))
    }
  }
}
