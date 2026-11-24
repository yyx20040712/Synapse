/**
 * [B4 L1 / 设计稿 §5.3/§7.3/§7.4/§7.5] lineage-history-unit.service —— history-unit
 * main 事务真库测试（主控终裁 2：独立 IPC/service，repo 层 withTransaction）。
 *
 * 覆盖：删节点原 id/createdAt/相关边按序恢复；undo/redo 更新既有行 updated_at
 * 单调不倒退（putExact UPDATE 分支——B1 三轮）；HISTORY_STALE 写前失败零写；
 * paper/folder 缺失 CONFLICT；第二语句失败全回滚；恢复点守卫（远未来
 * tombstone）；图守卫（悬空/重复/成环/一文献一节点）；line-type-names delta；
 * 响应只含 touched 行；归属图校验（§7.2）：请求内 node/edge/note 的归属图≠
 * req.folderId 一律 CONFLICT/HISTORY_GRAPH_INVALID 整 unit 零写，同图 undo
 * removeNode（相关边端点=同 unit 内恢复的节点）照常成功；INV-88（M-B02 回炉）：
 * 恢复节点的 folderId≠其文献当前归属图同样 CONFLICT/HISTORY_GRAPH_INVALID
 * 整 unit 零写，文献仍在同图（含主图）与无文献节点照常恢复。
 * always-active（裸 describe）。
 */
import { describe, expect, it } from 'vitest'
import {
  createLineageHistoryUnitService,
  type LineageHistoryUnitService
} from '../../../src/main/services/lineage/lineage-history-unit.service'
import type { LineageHistoryRepo } from '../../../src/main/db/repos/lineage-history.repo'
import { defaultLineTypeNames, type FloatingNote, type LineageEdge, type LineageNode } from '../../../src/shared/models/lineage'
import {
  lineageHistoryUnitReqSchema,
  type LineageEntityDelta,
  type LineageHistoryUnitReq
} from '../../../src/shared/ipc/lineage-history.schemas'
import {
  addMs,
  makeLineageDb,
  ms,
  presetTombstone,
  rowOf,
  seedFolder,
  seedPaper,
  setUpdatedAt,
  tombstonesOf
} from '../../utils/lineage-history-db'

type Db = ReturnType<typeof makeLineageDb>['db']
type Repos = ReturnType<typeof makeLineageDb>['repos']

const FOLDER = '__main__'
const FUTURE = '2999-06-01T12:00:00.000Z'
const TX_NOW = '2026-06-01T00:00:00.000Z'

interface Rig {
  db: Db
  repos: Repos
  svc: LineageHistoryUnitService
  nodeA: LineageNode
  nodeB: LineageNode
  nodeC: LineageNode
  edgeAB: LineageEdge
  edgeCA: LineageEdge
}

const WRITE_METHODS = ['putNodeExact', 'putEdgeExact', 'putFloatingNoteExact', 'removeNode', 'removeEdge', 'removeFloatingNote']

/** 包装 history repo：记录写方法调用序，并可在指定方法第 nth 次调用注入失败 */
function instrument(repo: LineageHistoryRepo, fail?: { method: string; nth: number }): { repo: LineageHistoryRepo; calls: string[] } {
  const calls: string[] = []
  const counts = new Map<string, number>()
  const wrapped = new Proxy(repo, {
    get(target, prop) {
      const value = target[prop as keyof LineageHistoryRepo]
      const name = String(prop)
      if (typeof value !== 'function' || !WRITE_METHODS.includes(name)) return value
      return (...args: unknown[]) => {
        const first = args[0] as string | { id: string }
        calls.push(`${name}:${typeof first === 'string' ? first : first.id}`)
        if (fail !== undefined && fail.method === name) {
          counts.set(name, (counts.get(name) ?? 0) + 1)
          if (counts.get(name) === fail.nth) throw new Error('注入：事务中段语句失败')
        }
        return (value as (...a: unknown[]) => unknown).apply(target, args)
      }
    }
  })
  return { repo: wrapped, calls }
}

function makeRig(opts: { fail?: { method: string; nth: number } } = {}): Rig & { calls: string[] } {
  const { db, repos } = makeLineageDb()
  const { repo, calls } = instrument(repos.lineageHistory, opts.fail)
  const svc = createLineageHistoryUnitService({
    historyRepo: repo,
    meta: repos.lineage,
    listGraph: () => repos.lineage.listGraph(),
    folderExists: (id) => repos.folders.findById(id) !== null,
    paperExists: (id) => repos.papers.findById(id) !== null,
    // [INV-88] 文献当前归属图（papers.folder_id 单源读口——与生产装配同一 repo 方法）
    paperFolderIdOf: (id) => repos.papers.folderIdOf(id),
    withTransaction: repos.withTransaction,
    now: () => TX_NOW
  })
  for (const id of ['p-a', 'p-b', 'p-c']) {
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at) VALUES (?, ?, ?, ?, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')`
    ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`)
  }
  const nodeA = repos.lineage.upsertNode({ paperId: 'p-a', title: '甲', year: 2020, x: 10, y: 20, month: 3, slot: 0 })
  const nodeB = repos.lineage.upsertNode({ paperId: 'p-b', title: '乙', year: 2020, x: 30, y: 40, month: 3, slot: 1 })
  const nodeC = repos.lineage.upsertNode({ paperId: 'p-c', title: '丙', year: 2021, x: null, y: null, month: null, slot: 2 })
  const edgeAB = repos.lineage.upsertEdge({ fromNode: nodeA.id, toNode: nodeB.id, label: '甲乙', dashed: true })
  const edgeCA = repos.lineage.upsertEdge({
    fromNode: nodeC.id,
    toNode: nodeA.id,
    label: '丙甲',
    via: [{ x: 100, y: 100 }, { x: 200, y: 100 }],
    fromAnchor: { side: 'bottom', slot: 1 }
  })
  return { db, repos, svc, nodeA, nodeB, nodeC, edgeAB, edgeCA, calls }
}

/** 增补种子：确保 papers 行与节点 id 在场（makeRig 已含三文献+三节点+两边） */
function seededRig(): Rig & { calls: string[] } {
  return makeRig()
}

const nodeDelta = (before: LineageNode | null, after: LineageNode | null): LineageEntityDelta => ({
  kind: 'node', id: (before ?? after)!.id, before, after
})
const edgeDelta = (before: LineageEdge | null, after: LineageEdge | null): LineageEntityDelta => ({
  kind: 'edge', id: (before ?? after)!.id, before, after
})
const noteDelta = (before: FloatingNote | null, after: FloatingNote | null): LineageEntityDelta => ({
  kind: 'floating-note', id: (before ?? after)!.id, before, after
})
const namesDelta = (before: string[], after: string[]): LineageEntityDelta => ({ kind: 'line-type-names', before, after })

const deletionCount = (db: Db): number => (db.prepare('SELECT COUNT(*) AS c FROM deletion_events').get() as { c: number }).c

const req = (changes: LineageEntityDelta[], direction: 'undo' | 'redo' = 'undo', folderId = FOLDER) => ({
  folderId, unitId: 'unit-1', direction, changes
})

interface Thrown { code: string; reason?: string; message: string }
function conflictOf(fn: () => unknown): Thrown {
  try {
    fn()
  } catch (e) {
    const err = e as Thrown
    return { code: err.code ?? '', reason: err.reason, message: err.message }
  }
  return { code: '', message: '' }
}

describe('lineage-history-unit.service —— 删节点内部 restore（§5.3）', () => {
  it('undo 恢复原 id/createdAt/全部字段；相关边按历史数组序恢复（逆序写：节点先于相关边）；恢复行 updated_at 严格大于既有 tombstone；响应只含 touched 行', () => {
    const rig = seededRig()
    rig.calls.length = 0
    rig.repos.lineage.removeNode(rig.nodeA.id) // 级联删两边→三枚 tombstone
    expect(rowOf(rig.db, 'lineage_nodes', rig.nodeA.id)).toBeNull()
    const tombs = tombstonesOf(rig.db, 'lineage_nodes', rig.nodeA.id)
    expect(tombs).toHaveLength(1)
    rig.calls.length = 0
    // 历史数组序（redo 顺序）：先相关边 E→null，最后 N→null
    const res = rig.svc.unit(req([edgeDelta(rig.edgeAB, null), edgeDelta(rig.edgeCA, null), nodeDelta(rig.nodeA, null)], 'undo'))
    expect(rig.calls).toEqual([`putNodeExact:${rig.nodeA.id}`, `putEdgeExact:${rig.edgeCA.id}`, `putEdgeExact:${rig.edgeAB.id}`])
    const nodeRow = rig.repos.lineageHistory.getNode(rig.nodeA.id)!
    expect(nodeRow).toMatchObject({ id: rig.nodeA.id, paperId: 'p-a', title: '甲', year: 2020, x: 10, y: 20, month: 3, slot: 0, folderId: FOLDER, createdAt: rig.nodeA.createdAt })
    expect(ms(nodeRow.updatedAt)).toBeGreaterThan(ms(tombs[0]!)) // 恢复点守卫
    const edgeCA = rig.repos.lineageHistory.getEdge(rig.edgeCA.id)!
    expect(edgeCA).toMatchObject({ id: rig.edgeCA.id, fromNode: rig.nodeC.id, toNode: rig.nodeA.id, label: '丙甲', dashed: false, createdAt: rig.edgeCA.createdAt })
    expect(edgeCA.via).toEqual([{ x: 100, y: 100 }, { x: 200, y: 100 }])
    expect(edgeCA.fromAnchor).toEqual({ side: 'bottom', slot: 1 })
    expect(rig.repos.lineageHistory.getEdge(rig.edgeAB.id)!.dashed).toBe(true)
    expect(res.folderId).toBe(FOLDER)
    expect(res.unitId).toBe('unit-1')
    expect(res.nodes.map((n) => n.id)).toEqual([rig.nodeA.id])
    expect(res.edges.map((e) => e.id).sort()).toEqual([rig.edgeAB.id, rig.edgeCA.id].sort())
    expect(res.floatingNotes).toEqual([])
    expect(res.lineTypeNames).toEqual(defaultLineTypeNames())
    rig.db.close()
  })

  it('redo 再删除：相关边先于节点（顺序写），两边+节点各落一枚 tombstone', () => {
    const rig = seededRig()
    rig.calls.length = 0
    rig.svc.unit(req([edgeDelta(rig.edgeAB, null), edgeDelta(rig.edgeCA, null), nodeDelta(rig.nodeA, null)], 'redo'))
    expect(rig.calls).toEqual([`removeEdge:${rig.edgeAB.id}`, `removeEdge:${rig.edgeCA.id}`, `removeNode:${rig.nodeA.id}`])
    expect(rowOf(rig.db, 'lineage_nodes', rig.nodeA.id)).toBeNull()
    expect(tombstonesOf(rig.db, 'lineage_edges', rig.edgeAB.id)).toHaveLength(1)
    expect(tombstonesOf(rig.db, 'lineage_edges', rig.edgeCA.id)).toHaveLength(1)
    expect(tombstonesOf(rig.db, 'lineage_nodes', rig.nodeA.id)).toHaveLength(1)
    rig.db.close()
  })
})

describe('lineage-history-unit.service —— 写前核对与单调 updated_at（§7.3 步骤 3/6）', () => {
  it('undo 更新既有行：写前核对 after 指纹→写 before；createdAt 不改写；updatedAt=事务时间（putExact UPDATE 分支）', () => {
    const rig = seededRig()
    setUpdatedAt(rig.db, 'lineage_nodes', rig.nodeA.id, '2026-01-01T00:00:00.000Z')
    rig.db.prepare('UPDATE lineage_nodes SET x = ?, y = ? WHERE id = ?').run(99, 88, rig.nodeA.id)
    const moved = { ...rig.nodeA, x: 99, y: 88 }
    const res = rig.svc.unit(req([nodeDelta(rig.nodeA, moved)], 'undo'))
    const row = rig.repos.lineageHistory.getNode(rig.nodeA.id)!
    expect(row).toMatchObject({ x: 10, y: 20, createdAt: rig.nodeA.createdAt })
    expect(row.updatedAt).toBe(TX_NOW)
    expect(res.nodes[0]!.x).toBe(10)
    rig.db.close()
  })

  it('undo/redo 更新既有行 updated_at 单调不倒退（B1 三轮）：恢复值行+事务时间回拨→取旧行+1ms', () => {
    const rig = seededRig()
    rig.db.prepare('UPDATE lineage_edges SET label = ? WHERE id = ?').run('改名后', rig.edgeAB.id)
    setUpdatedAt(rig.db, 'lineage_edges', rig.edgeAB.id, FUTURE) // 恢复值行
    const relabeled = { ...rig.edgeAB, label: '改名后' }
    rig.svc.unit(req([edgeDelta(rig.edgeAB, relabeled)], 'undo'))
    expect(rowOf(rig.db, 'lineage_edges', rig.edgeAB.id)!.updated_at).toBe(addMs(FUTURE, 1))
    expect(rowOf(rig.db, 'lineage_edges', rig.edgeAB.id)!.created_at).toBe(rig.edgeAB.createdAt)
    const before = rowOf(rig.db, 'lineage_edges', rig.edgeAB.id)!.updated_at
    rig.svc.unit(req([edgeDelta(rig.edgeAB, relabeled)], 'redo'))
    expect(ms(rowOf(rig.db, 'lineage_edges', rig.edgeAB.id)!.updated_at)).toBeGreaterThan(ms(before))
    rig.db.close()
  })

  it('HISTORY_STALE：当前实体与预期端态语义指纹不符→CONFLICT/HISTORY_STALE，写前失败零写；updatedAt/isStarred 不入指纹', () => {
    const rig = seededRig()
    rig.calls.length = 0
    const moved = { ...rig.nodeA, x: 99, y: 88 } // DB 仍 x=10
    const err = conflictOf(() => rig.svc.unit(req([nodeDelta(rig.nodeA, moved)], 'undo')))
    expect(err.code).toBe('CONFLICT')
    expect(err.reason).toBe('HISTORY_STALE')
    expect(err.message).toContain('节点')
    expect(rig.calls).toEqual([]) // 写前失败零写
    expect(rig.repos.lineageHistory.getNode(rig.nodeA.id)!.x).toBe(10)
    expect(tombstonesOf(rig.db, 'lineage_nodes', rig.nodeA.id)).toEqual([])
    // 仅时戳/星标差异不判 stale
    const after = { ...rig.nodeA, x: 7, updatedAt: '2000-01-01T00:00:00.000Z', isStarred: true }
    rig.db.prepare('UPDATE lineage_nodes SET x = ? WHERE id = ?').run(7, rig.nodeA.id)
    const res = rig.svc.unit(req([nodeDelta(rig.nodeA, after)], 'undo'))
    expect(res.nodes[0]!.x).toBe(10)
    rig.db.close()
  })

  it('删除态指纹：undo E→null 要求当前缺席；当前仍在场=STALE 零写', () => {
    const rig = seededRig()
    const err = conflictOf(() => rig.svc.unit(req([edgeDelta(rig.edgeAB, null)], 'undo')))
    expect(err.code).toBe('CONFLICT')
    expect(err.reason).toBe('HISTORY_STALE')
    expect(rig.repos.lineageHistory.getEdge(rig.edgeAB.id)).not.toBeNull()
    rig.db.close()
  })

  it('第二语句失败全回滚：节点恢复后相关边写失败→节点/边/tombstone 全部回到事务前', () => {
    const failing = makeRig({ fail: { method: 'putEdgeExact', nth: 1 } })
    failing.repos.lineage.removeNode(failing.nodeA.id)
    const tombsBefore = (failing.db.prepare('SELECT COUNT(*) AS c FROM deletion_events').get() as { c: number }).c
    failing.calls.length = 0
    const err = conflictOf(() =>
      failing.svc.unit(req([edgeDelta(failing.edgeAB, null), edgeDelta(failing.edgeCA, null), nodeDelta(failing.nodeA, null)], 'undo'))
    )
    expect(err.message).toContain('注入')
    expect(rowOf(failing.db, 'lineage_nodes', failing.nodeA.id)).toBeNull() // 节点恢复已回滚
    expect(failing.repos.lineageHistory.getEdge(failing.edgeAB.id)).toBeNull()
    expect(failing.repos.lineageHistory.getEdge(failing.edgeCA.id)).toBeNull()
    expect((failing.db.prepare('SELECT COUNT(*) AS c FROM deletion_events').get() as { c: number }).c).toBe(tombsBefore)
    failing.db.close()
  })

  it('恢复点守卫：预置远未来 tombstone T→恢复行 updated_at 严格大于 T（进 1ms 由守卫完成）', () => {
    const rig = seededRig()
    const T = '2999-01-01T00:00:00.000Z'
    presetTombstone(rig.db, 'floating_notes', 'fn-restore', T)
    const note = { id: 'fn-restore', folderId: FOLDER, x: 1, y: 2, content: '恢复', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: T }
    const res = rig.svc.unit(req([{ kind: 'floating-note', id: note.id, before: note, after: null }], 'undo'))
    expect(ms(res.floatingNotes[0]!.updatedAt)).toBeGreaterThan(ms(T))
    expect(rowOf(rig.db, 'floating_notes', 'fn-restore')!.updated_at).toBe(addMs(T, 1))
    rig.db.close()
  })

  it('line-type-names delta：undo 写回 before（同键同源）；响应回显当前 folder 色行名', () => {
    const rig = seededRig()
    const named = ['主线', '副线', '对比', '支撑', '衍生', '否证']
    rig.repos.lineage.setLineTypeNames(FOLDER, named)
    const res = rig.svc.unit(req([namesDelta(defaultLineTypeNames(), named)], 'undo'))
    expect(res.lineTypeNames).toEqual(defaultLineTypeNames())
    expect(rig.repos.lineage.getLineTypeNames(FOLDER)).toEqual(defaultLineTypeNames())
    const redo = rig.svc.unit(req([namesDelta(defaultLineTypeNames(), named)], 'redo'))
    expect(redo.lineTypeNames).toEqual(named)
    rig.db.close()
  })
})

describe('lineage-history-unit.service —— folder/paper 存在性与图守卫（§5.3 第 4 条/§7.3 步骤 4）', () => {
  it('paper 已删→CONFLICT（恢复节点零写）；folder 已删→CONFLICT（色行名 unit 同拒）', () => {
    const rig = seededRig()
    rig.repos.lineage.removeNode(rig.nodeA.id)
    rig.db.prepare(`DELETE FROM papers WHERE id = 'p-a'`).run()
    const err = conflictOf(() => rig.svc.unit(req([nodeDelta(rig.nodeA, null)], 'undo')))
    expect(err.code).toBe('CONFLICT')
    expect(err.reason).toBe('HISTORY_PAPER_MISSING')
    expect(rowOf(rig.db, 'lineage_nodes', rig.nodeA.id)).toBeNull()
    const errFolder = conflictOf(() =>
      rig.svc.unit(req([namesDelta(defaultLineTypeNames(), ['甲', '乙', '丙', '丁', '戊', '己'])], 'undo', 'f-missing'))
    )
    expect(errFolder.code).toBe('CONFLICT')
    expect(errFolder.reason).toBe('HISTORY_FOLDER_MISSING')
    rig.db.close()
  })

  it('一文献一节点：同 paperId 已有新节点→恢复原节点 CONFLICT（idx_lineage_paper 唯一）', () => {
    const rig = seededRig()
    rig.repos.lineage.removeNode(rig.nodeA.id)
    rig.repos.lineage.upsertNode({ paperId: 'p-a', title: '甲新', year: 2020, x: 1, y: 1, month: 3, slot: 5 })
    const err = conflictOf(() => rig.svc.unit(req([nodeDelta(rig.nodeA, null)], 'undo')))
    expect(err.code).toBe('CONFLICT')
    expect(err.reason).toBe('HISTORY_GRAPH_INVALID')
    expect(rig.repos.lineage.listGraph().nodes.filter((n) => n.paperId === 'p-a')).toHaveLength(1)
    rig.db.close()
  })

  it('悬空边：删节点未携相关边→CONFLICT（FK CASCADE 不得替 unit 多写）', () => {
    const rig = seededRig()
    const err = conflictOf(() => rig.svc.unit(req([nodeDelta(rig.nodeA, null)], 'redo')))
    expect(err.code).toBe('CONFLICT')
    expect(err.reason).toBe('HISTORY_GRAPH_INVALID')
    expect(err.message).toContain('悬空')
    expect(rowOf(rig.db, 'lineage_nodes', rig.nodeA.id)).not.toBeNull()
    rig.db.close()
  })

  it('重复边/成环：最终图守卫拒绝（CONFLICT 零写）', () => {
    const rig = seededRig()
    // 重复：当前 e2=a→c，改为 a→b（与 e1 同向同对）
    rig.repos.lineage.removeEdge(rig.edgeCA.id)
    rig.repos.lineage.upsertEdge({ id: rig.edgeCA.id, fromNode: rig.nodeA.id, toNode: rig.nodeC.id, label: '丙甲' })
    const current = rig.repos.lineageHistory.getEdge(rig.edgeCA.id)!
    const errDup = conflictOf(() => rig.svc.unit(req([edgeDelta(current, { ...current, toNode: rig.nodeB.id })], 'redo')))
    expect(errDup.code).toBe('CONFLICT')
    expect(errDup.reason).toBe('HISTORY_GRAPH_INVALID')
    expect(errDup.message).toContain('重复边')
    // 成环：现有 a→c、a→b；新插 c→a（异向——UNIQUE(from,to) 不拦；应用层成环守卫拦）
    const cycleEdge = { ...rig.edgeAB, id: 'e-cycle', fromNode: rig.nodeC.id, toNode: rig.nodeA.id, label: '环' }
    const errCycle = conflictOf(() => rig.svc.unit(req([edgeDelta(null, cycleEdge)], 'redo')))
    expect(errCycle.code).toBe('CONFLICT')
    expect(errCycle.reason).toBe('HISTORY_GRAPH_INVALID')
    expect(errCycle.message).toContain('成环')
    expect(rig.repos.lineageHistory.getEdge('e-cycle')).toBeNull()
    rig.db.close()
  })

  it('悬浮笔记：原 id/完整字段恢复；夹已删（直调 service 绕过 schema）→CONFLICT 零写', () => {
    const rig = seededRig()
    const note = rig.repos.floatingNotes.upsert({ folderId: FOLDER, x: 5, y: 6, content: '悬浮' })
    rig.repos.floatingNotes.remove(note.id)
    const res = rig.svc.unit(req([{ kind: 'floating-note', id: note.id, before: note, after: null }], 'undo'))
    expect(rig.repos.lineageHistory.getFloatingNote(note.id)).toMatchObject({ id: note.id, folderId: FOLDER, x: 5, y: 6, content: '悬浮', createdAt: note.createdAt })
    expect(res.floatingNotes.map((n) => n.id)).toEqual([note.id])
    seedFolder(rig.db, 'f-ghost', '幽灵夹')
    const ghost = { ...note, id: 'fn-ghost', folderId: 'f-ghost' }
    rig.repos.folders.remove('f-ghost')
    const err = conflictOf(() => rig.svc.unit(req([{ kind: 'floating-note', id: ghost.id, before: ghost, after: null }], 'undo', 'f-ghost')))
    expect(err.code).toBe('CONFLICT')
    expect(err.reason).toBe('HISTORY_FOLDER_MISSING')
    expect(rig.repos.lineageHistory.getFloatingNote(ghost.id)).toBeNull()
    rig.db.close()
  })
})

// ── 归属图校验（§7.2「所有 node/edge/note 的 folder 归属必须与 req.folderId 一致」；
// M-B01 回炉）────────────────────────────────────────────────────────────────────
// 请求图=主图（FOLDER，即 folder A）；crossFolderRig 另建 'f-b' 图（folder B）。
// 边 delta 无 folderId，shared schema 放行异图边——边三例经 schema 过检（=IPC 入口
// 真实路径）；节点/悬浮笔记的 folderId 不一致在 schema 层已拒，其用例直调 service
// （绕过 schema）——service 是不经 schema 的调用方唯一的位置校验。

/** 'f-b' 图（folder B）：三文献三节点两边一悬浮笔记——node1 有两条相关边（12、31） */
interface ForeignGraph {
  node1: LineageNode
  node2: LineageNode
  node3: LineageNode
  edge12: LineageEdge
  edge31: LineageEdge
  note: FloatingNote
}

const FOREIGN = 'f-b'

function crossFolderRig(): Rig & { calls: string[]; foreign: ForeignGraph } {
  const rig = makeRig()
  seedFolder(rig.db, FOREIGN, '乙夹')
  for (const id of ['p-b1', 'p-b2', 'p-b3']) seedPaper(rig.db, id, FOREIGN)
  const node = (paperId: string, title: string, slot: number): LineageNode =>
    rig.repos.lineage.upsertNode({ paperId, folderId: FOREIGN, title, year: 2020, x: 50, y: 60, month: 3, slot })
  const node1 = node('p-b1', '乙一', 0)
  const node2 = node('p-b2', '乙二', 1)
  const node3 = node('p-b3', '乙三', 2)
  const edge12 = rig.repos.lineage.upsertEdge({ fromNode: node1.id, toNode: node2.id, label: '乙一二' })
  const edge31 = rig.repos.lineage.upsertEdge({ fromNode: node3.id, toNode: node1.id, label: '乙三一' })
  const note = rig.repos.floatingNotes.upsert({ folderId: FOREIGN, x: 9, y: 9, content: '乙笔记' })
  rig.calls.length = 0
  return { ...rig, foreign: { node1, node2, node3, edge12, edge31, note } }
}

/** 经 shared schema 过检的请求（IPC 入口真实路径——schema 对异图边放行） */
const schemaReq = (changes: LineageEntityDelta[], direction: 'undo' | 'redo', folderId = FOLDER): LineageHistoryUnitReq =>
  lineageHistoryUnitReqSchema.parse({ folderId, unitId: 'unit-cross', direction, changes })

/**
 * 异图拒绝的统一断言：CONFLICT/HISTORY_GRAPH_INVALID、消息出自归属图校验（区别于其他
 * 图守卫拒绝——reason 相同）、history repo 零写方法调用、deletion_events 行数不变
 * （整 unit 零写）。目标实体原样由各用例自行断言。
 */
function expectCrossFolderRejected(rig: Rig & { calls: string[] }, run: () => unknown, tombsBefore: number): void {
  const err = conflictOf(run)
  expect(err.code).toBe('CONFLICT')
  expect(err.reason).toBe('HISTORY_GRAPH_INVALID')
  expect(err.message).toContain('归属图与请求文件夹不一致')
  expect(rig.calls).toEqual([])
  expect(deletionCount(rig.db)).toBe(tombsBefore)
}

describe('lineage-history-unit.service —— 归属图校验（§7.2；M-B01 回炉）', () => {
  it('① redo 删除异图边：folder A 的请求删 folder B 的边→CONFLICT/HISTORY_GRAPH_INVALID，边原样零 tombstone；混合 unit（A 的合法项+B 的异图项）整 unit 零写', () => {
    const rig = crossFolderRig()
    const { edge12 } = rig.foreign
    const edgeBefore = rig.repos.lineageHistory.getEdge(edge12.id)!
    const rowBefore = rowOf(rig.db, 'lineage_edges', edge12.id)!
    const tombsBefore = deletionCount(rig.db)
    rig.calls.length = 0
    expectCrossFolderRejected(rig, () => rig.svc.unit(schemaReq([edgeDelta(edge12, null)], 'redo')), tombsBefore)
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toEqual(edgeBefore) // 目标边原样
    expect(rowOf(rig.db, 'lineage_edges', edge12.id)).toEqual(rowBefore)
    // 混合 unit：A 图合法的节点位移+B 图的异图边删除——整 unit 零写（A 的合法项也不落库）
    const moved = { ...rig.nodeA, x: 123, y: 456 }
    expectCrossFolderRejected(rig, () => rig.svc.unit(schemaReq([nodeDelta(rig.nodeA, moved), edgeDelta(edge12, null)], 'redo')), tombsBefore)
    expect(rig.repos.lineageHistory.getNode(rig.nodeA.id)).toMatchObject({ x: 10, y: 20 })
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toEqual(edgeBefore)
    // 对照：同一 delta 以边所在图发起→照常删除（被拒原因=归属图不符，不是 delta 本身）
    rig.svc.unit(schemaReq([edgeDelta(edge12, null)], 'redo', FOREIGN))
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toBeNull()
    rig.db.close()
  })

  it('② undo 恢复异图边：folder A 的请求恢复 folder B 已删的边（当前侧缺席，只有目标侧）→CONFLICT/HISTORY_GRAPH_INVALID，边保持缺席', () => {
    const rig = crossFolderRig()
    const { edge12 } = rig.foreign
    rig.repos.lineage.removeEdge(edge12.id) // 边已删、tombstone 在场——恢复态
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toBeNull()
    expect(tombstonesOf(rig.db, 'lineage_edges', edge12.id)).toHaveLength(1)
    const tombsBefore = deletionCount(rig.db)
    rig.calls.length = 0
    expectCrossFolderRejected(rig, () => rig.svc.unit(schemaReq([edgeDelta(edge12, null)], 'undo')), tombsBefore)
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toBeNull() // 目标边原样（仍缺席）
    // 对照：以 'f-b' 发起→照常恢复原 id
    rig.svc.unit(schemaReq([edgeDelta(edge12, null)], 'undo', FOREIGN))
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toMatchObject({ id: edge12.id, label: '乙一二', createdAt: edge12.createdAt })
    rig.db.close()
  })

  it('③ 更新异图边：folder A 的请求改 folder B 边的 label（redo）/ via（undo）→CONFLICT/HISTORY_GRAPH_INVALID，边原样', () => {
    const rig = crossFolderRig()
    const { edge12 } = rig.foreign
    const edgeBefore = rig.repos.lineageHistory.getEdge(edge12.id)!
    const rowBefore = rowOf(rig.db, 'lineage_edges', edge12.id)!
    const tombsBefore = deletionCount(rig.db)
    rig.calls.length = 0
    expectCrossFolderRejected(rig, () => rig.svc.unit(schemaReq([edgeDelta(edge12, { ...edge12, label: '越图改名' })], 'redo')), tombsBefore)
    expectCrossFolderRejected(rig, () => rig.svc.unit(schemaReq([edgeDelta({ ...edge12, via: [{ x: 500, y: 500 }] }, edge12)], 'undo')), tombsBefore)
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toEqual(edgeBefore) // 目标边原样
    expect(rowOf(rig.db, 'lineage_edges', edge12.id)).toEqual(rowBefore)
    // 对照：以 'f-b' 发起→照常更新
    rig.svc.unit(schemaReq([edgeDelta(edge12, { ...edge12, label: '乙一二改名' })], 'redo', FOREIGN))
    expect(rig.repos.lineageHistory.getEdge(edge12.id)!.label).toBe('乙一二改名')
    rig.db.close()
  })

  it('④ 节点 delta 属异图：folder A 的请求携 folder B 的节点（redo 删节点及其相关边 / undo 恢复）→CONFLICT/HISTORY_GRAPH_INVALID，B 图原样', () => {
    const rig = crossFolderRig()
    const { node1, edge12, edge31 } = rig.foreign
    const removeUnit = [edgeDelta(edge12, null), edgeDelta(edge31, null), nodeDelta(node1, null)]
    const tombsBefore = deletionCount(rig.db)
    rig.calls.length = 0
    expectCrossFolderRejected(rig, () => rig.svc.unit(req(removeUnit, 'redo')), tombsBefore)
    expect(rig.repos.lineageHistory.getNode(node1.id)!.title).toBe('乙一') // B 的节点原样
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).not.toBeNull() // 相关边未被级联删除
    expect(rig.repos.lineageHistory.getEdge(edge31.id)).not.toBeNull()
    // undo 恢复：B 的节点及其相关边已删（恢复态）
    rig.repos.lineage.removeNode(node1.id)
    expect(deletionCount(rig.db)).toBe(tombsBefore + 3) // 节点+两边三枚 tombstone
    const tombsDeleted = deletionCount(rig.db)
    rig.calls.length = 0
    expectCrossFolderRejected(rig, () => rig.svc.unit(req(removeUnit, 'undo')), tombsDeleted)
    expect(rig.repos.lineageHistory.getNode(node1.id)).toBeNull() // 保持缺席
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toBeNull()
    expect(rig.repos.lineageHistory.getEdge(edge31.id)).toBeNull()
    // 对照：以 'f-b' 发起→照常恢复
    rig.svc.unit(req(removeUnit, 'undo', FOREIGN))
    expect(rig.repos.lineageHistory.getNode(node1.id)!.title).toBe('乙一')
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).not.toBeNull()
    expect(rig.repos.lineageHistory.getEdge(edge31.id)).not.toBeNull()
    rig.db.close()
  })

  it('④′ 节点 delta 两侧都非空：任一侧属异图即拒——redo 把 A 图节点改入 B 图（目标侧异图）/ undo（目标侧异图）/ redo·undo 把 B 图节点改入 A 图（非目标侧异图）→节点归属不变', () => {
    const rig = crossFolderRig()
    const { node2 } = rig.foreign
    const tombsBefore = deletionCount(rig.db)
    rig.calls.length = 0
    // redo：目标侧 after 属 B 图
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([nodeDelta(rig.nodeA, { ...rig.nodeA, folderId: FOREIGN })], 'redo')), tombsBefore)
    expect(rig.repos.lineageHistory.getNode(rig.nodeA.id)!.folderId).toBe(FOLDER)
    // undo：目标侧 before 属 B 图（当前行≡after）
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([nodeDelta({ ...rig.nodeA, folderId: FOREIGN }, rig.nodeA)], 'undo')), tombsBefore)
    expect(rig.repos.lineageHistory.getNode(rig.nodeA.id)!.folderId).toBe(FOLDER)
    // redo：非目标侧 before 属 B 图（目标侧 after 属 A 图）——把 B 图节点改入 A 图
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([nodeDelta(node2, { ...node2, folderId: FOLDER })], 'redo')), tombsBefore)
    expect(rig.repos.lineageHistory.getNode(node2.id)!.folderId).toBe(FOREIGN)
    // undo：非目标侧 after 属 B 图（目标侧 before 属 A 图）——把 B 图节点改入 A 图
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([nodeDelta({ ...node2, folderId: FOLDER }, node2)], 'undo')), tombsBefore)
    expect(rig.repos.lineageHistory.getNode(node2.id)!.folderId).toBe(FOREIGN)
    rig.db.close()
  })

  it('⑤ 悬浮笔记 delta 属异图：folder A 的请求携 folder B 的笔记（redo 删除 / undo 恢复 / 两侧都非空时任一侧异图）→CONFLICT/HISTORY_GRAPH_INVALID，笔记原样', () => {
    const rig = crossFolderRig()
    const noteB = rig.foreign.note
    const noteA = rig.repos.floatingNotes.upsert({ folderId: FOLDER, x: 1, y: 1, content: '甲笔记' })
    const tombsBefore = deletionCount(rig.db)
    rig.calls.length = 0
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([noteDelta(noteB, null)], 'redo')), tombsBefore)
    expect(rig.repos.lineageHistory.getFloatingNote(noteB.id)).toEqual(noteB) // B 的笔记原样
    // 两侧都非空：目标侧属 B 图（redo）——把 A 图笔记改入 B 图
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([noteDelta(noteA, { ...noteA, folderId: FOREIGN })], 'redo')), tombsBefore)
    // 两侧都非空：目标侧属 B 图（undo）——把 A 图笔记改入 B 图
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([noteDelta({ ...noteA, folderId: FOREIGN }, noteA)], 'undo')), tombsBefore)
    expect(rig.repos.lineageHistory.getFloatingNote(noteA.id)).toEqual(noteA) // A 的笔记原样
    // 两侧都非空：非目标侧属 B 图（redo）——把 B 图笔记改入 A 图
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([noteDelta(noteB, { ...noteB, folderId: FOLDER })], 'redo')), tombsBefore)
    // 两侧都非空：目标侧属 A 图、非目标侧属 B 图（undo）——把 B 图笔记改入 A 图
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([noteDelta({ ...noteB, folderId: FOLDER }, noteB)], 'undo')), tombsBefore)
    expect(rig.repos.lineageHistory.getFloatingNote(noteB.id)).toEqual(noteB)
    // undo 恢复：B 的笔记已删（恢复态）
    rig.repos.floatingNotes.remove(noteB.id)
    const tombsDeleted = deletionCount(rig.db)
    rig.calls.length = 0
    expectCrossFolderRejected(rig, () => rig.svc.unit(req([noteDelta(noteB, null)], 'undo')), tombsDeleted)
    expect(rig.repos.lineageHistory.getFloatingNote(noteB.id)).toBeNull() // 保持缺席
    // 对照：以 'f-b' 发起→照常恢复原 id（updatedAt 由恢复点守卫重算——§5.3，不入比较）
    rig.svc.unit(req([noteDelta(noteB, null)], 'undo', FOREIGN))
    expect(rig.repos.lineageHistory.getFloatingNote(noteB.id)).toMatchObject({ id: noteB.id, folderId: FOREIGN, content: '乙笔记', createdAt: noteB.createdAt })
    rig.db.close()
  })

  it('合法路径不被误伤：以节点所在图发起的 undo removeNode 恢复节点及其相关边（相关边端点=同 unit 内恢复的节点+库内既有节点）照常成功；redo 再删同图照常成功', () => {
    const rig = crossFolderRig()
    const { node1, node2, node3, edge12, edge31 } = rig.foreign
    const removeUnit = [edgeDelta(edge12, null), edgeDelta(edge31, null), nodeDelta(node1, null)]
    rig.repos.lineage.removeNode(node1.id) // 级联删两边→三枚 tombstone
    const tombsBefore = deletionCount(rig.db)
    rig.calls.length = 0
    const res = rig.svc.unit(req(removeUnit, 'undo', FOREIGN))
    expect(rig.calls).toEqual([`putNodeExact:${node1.id}`, `putEdgeExact:${edge31.id}`, `putEdgeExact:${edge12.id}`]) // 逆序写：节点先于相关边
    expect(rig.repos.lineageHistory.getNode(node1.id)).toMatchObject({ id: node1.id, folderId: FOREIGN, title: '乙一', createdAt: node1.createdAt })
    expect(rig.repos.lineageHistory.getEdge(edge12.id)).toMatchObject({ fromNode: node1.id, toNode: node2.id, label: '乙一二', createdAt: edge12.createdAt })
    expect(rig.repos.lineageHistory.getEdge(edge31.id)).toMatchObject({ fromNode: node3.id, toNode: node1.id, label: '乙三一', createdAt: edge31.createdAt })
    expect(res.folderId).toBe(FOREIGN)
    expect(res.nodes.map((n) => n.id)).toEqual([node1.id])
    expect(res.edges.map((e) => e.id).sort()).toEqual([edge12.id, edge31.id].sort())
    expect(deletionCount(rig.db)).toBe(tombsBefore) // 恢复是插入，不产生新 tombstone
    // redo 再删（当前侧端点=库内现有节点）：同图照常成功
    rig.calls.length = 0
    rig.svc.unit(req(removeUnit, 'redo', FOREIGN))
    expect(rig.calls).toEqual([`removeEdge:${edge12.id}`, `removeEdge:${edge31.id}`, `removeNode:${node1.id}`])
    expect(rig.repos.lineageHistory.getNode(node1.id)).toBeNull()
    expect(deletionCount(rig.db)).toBe(tombsBefore + 3)
    rig.db.close()
  })
})

// ── INV-88（节点归属图＝其文献归属图；M-B02 回炉）────────────────────────────
// history-unit 恢复节点是 INV-88 的写路径之一：节点 delta 的非空目标态（undo 取
// before、redo 取 after），其 folderId 必须等于该文献当前归属图（papers.folder_id——
// 与节点 folderId 同一表示，主图同为 '__main__'）。不符=CONFLICT/
// HISTORY_GRAPH_INVALID，整 unit 零写。
// 可达路径：在图 A 删除节点 → 文献库把该文献移到图 B（library.service moveFolder：
// 改写 papers.folder_id；节点缺席时在目标图自动入图）→ 回到 A 撤销删除。目标图内
// 该文献节点在场时，最终图守卫「一文献一节点」已拒绝，但不说明原因；不在场时
// （如在 B 再删一次）改前实现无任何守卫拦截——恢复出「节点在 A、文献在 B」的图。

/** INV-88 违例行（全库扫描：节点归属图≠其文献归属图） */
interface Inv88Violation {
  node_id: string
  node_folder: string
  paper_id: string
  paper_folder: string
}

const inv88Violations = (db: Db): Inv88Violation[] =>
  db
    .prepare(
      `SELECT n.id AS node_id, n.folder_id AS node_folder, n.paper_id, p.folder_id AS paper_folder
       FROM lineage_nodes n JOIN papers p ON p.id = n.paper_id
       WHERE n.folder_id <> p.folder_id ORDER BY n.id`
    )
    .all() as Inv88Violation[]

/** 三张受守卫表与删事件日志的全量行（逐行比对——整 unit 零写） */
const guardedState = (db: Db): Record<string, unknown[]> => ({
  nodes: db.prepare('SELECT * FROM lineage_nodes ORDER BY id').all(),
  edges: db.prepare('SELECT * FROM lineage_edges ORDER BY id').all(),
  floatingNotes: db.prepare('SELECT * FROM floating_notes ORDER BY id').all(),
  deletionEvents: db.prepare('SELECT * FROM deletion_events ORDER BY seq').all()
})

/**
 * 「文献已不在该文件夹」拒绝的统一断言。断言序先库态后拒因：未修复实现的红证须直接
 * 显示恢复出的违例行（节点在 A、文献在 B），而不只是「没抛错」。整 unit 零写=
 * history repo 零写方法调用 + 三张受守卫表与删事件日志全量行不变。
 */
function expectPaperLeftFolderRejected(
  rig: Rig & { calls: string[] },
  stateBefore: Record<string, unknown[]>,
  run: () => unknown
): void {
  const err = conflictOf(run)
  expect(inv88Violations(rig.db)).toEqual([])
  expect(err.code).toBe('CONFLICT')
  expect(err.reason).toBe('HISTORY_GRAPH_INVALID')
  expect(err.message).toContain('文献已不在该文件夹，无法在该图恢复其节点')
  expect(rig.calls).toEqual([])
  expect(guardedState(rig.db)).toEqual(stateBefore)
}

/**
 * 可达路径的前置三步（均走 repo 公开面，对应生产写路径）：在主图删除节点甲（级联
 * 两边）→ 文献库把 p-a 移到 'f-b'（=moveFolder：改写 papers.folder_id，节点缺席时在
 * 目标图自动入图）→ keepNodeInB=false 时在 'f-b' 再删该节点。返回主图 undo
 * removeNode 的历史 unit（相关边在前、节点在后——历史数组序）。
 */
function removeThenMovePaper(rig: Rig & { calls: string[] }, keepNodeInB: boolean): LineageEntityDelta[] {
  rig.repos.lineage.removeNode(rig.nodeA.id)
  rig.repos.papers.setFolderId('p-a', FOREIGN)
  const nodeInB = rig.repos.lineage.upsertNode({ paperId: 'p-a', folderId: FOREIGN, title: '甲', year: 2020, x: null, y: null, month: null, slot: 3 })
  if (!keepNodeInB) rig.repos.lineage.removeNode(nodeInB.id)
  return [edgeDelta(rig.edgeAB, null), edgeDelta(rig.edgeCA, null), nodeDelta(rig.nodeA, null)]
}

describe('lineage-history-unit.service —— INV-88：节点归属图＝其文献归属图（M-B02 回炉）', () => {
  it('① undo：文献已移到别的文件夹→CONFLICT/HISTORY_GRAPH_INVALID（文献已不在该文件夹），该节点行与整 unit 全部 touched 行零写；文献移回后同一请求照常恢复', () => {
    const rig = crossFolderRig()
    const unit = removeThenMovePaper(rig, false)
    expect(rig.repos.papers.folderIdOf('p-a')).toBe(FOREIGN)
    expect(rig.repos.lineage.nodeByPaperId('p-a')).toBeNull() // 两图内均无该文献节点——最终图守卫不拦的形态
    // 同 unit 另携一项主图合法变更（节点乙位移的 undo——当前行≡after）：被拒时它也不落库
    const movedB = { ...rig.nodeB, x: 123, y: 456 }
    rig.db.prepare('UPDATE lineage_nodes SET x = ?, y = ? WHERE id = ?').run(123, 456, rig.nodeB.id)
    unit.push(nodeDelta(rig.nodeB, movedB))
    const stateBefore = guardedState(rig.db)
    rig.calls.length = 0
    expectPaperLeftFolderRejected(rig, stateBefore, () => rig.svc.unit(schemaReq(unit, 'undo')))
    expect(rowOf(rig.db, 'lineage_nodes', rig.nodeA.id)).toBeNull() // 该节点行零写（仍缺席）
    expect(rig.repos.lineageHistory.getNode(rig.nodeB.id)).toMatchObject({ x: 123, y: 456 }) // 同 unit 的合法项零写
    // 对照：文献移回主图后同一请求照常恢复（被拒原因=文献归属，不是 delta 本身）
    rig.repos.papers.setFolderId('p-a', FOLDER)
    rig.calls.length = 0
    const res = rig.svc.unit(schemaReq(unit, 'undo'))
    expect(rig.calls).toEqual([
      `putNodeExact:${rig.nodeB.id}`,
      `putNodeExact:${rig.nodeA.id}`,
      `putEdgeExact:${rig.edgeCA.id}`,
      `putEdgeExact:${rig.edgeAB.id}`
    ])
    expect(res.nodes.map((n) => n.id)).toEqual([rig.nodeB.id, rig.nodeA.id])
    expect(rig.repos.lineageHistory.getNode(rig.nodeA.id)).toMatchObject({ id: rig.nodeA.id, folderId: FOLDER, paperId: 'p-a' })
    expect(rig.repos.lineageHistory.getNode(rig.nodeB.id)!.x).toBe(30)
    expect(inv88Violations(rig.db)).toEqual([])
    rig.db.close()
  })

  it('①′ 可达路径原样（文献移入时自动入图的节点仍在目标图）：仍以「文献已不在该文件夹」拒绝——不以「该文献已有节点」，目标图节点原样', () => {
    const rig = crossFolderRig()
    const unit = removeThenMovePaper(rig, true)
    const nodeInB = rig.repos.lineage.nodeByPaperId('p-a')!
    expect(nodeInB).toMatchObject({ folderId: FOREIGN, paperId: 'p-a' })
    const stateBefore = guardedState(rig.db)
    rig.calls.length = 0
    expectPaperLeftFolderRejected(rig, stateBefore, () => rig.svc.unit(schemaReq(unit, 'undo')))
    expect(rig.repos.lineageHistory.getNode(nodeInB.id)).toEqual(nodeInB)
    rig.db.close()
  })

  it('② 对照：文献仍在同一图（非主图）→照常恢复节点及其相关边', () => {
    const rig = crossFolderRig()
    const { node1, edge12, edge31 } = rig.foreign
    rig.repos.lineage.removeNode(node1.id)
    expect(rig.repos.papers.folderIdOf('p-b1')).toBe(FOREIGN)
    const res = rig.svc.unit(req([edgeDelta(edge12, null), edgeDelta(edge31, null), nodeDelta(node1, null)], 'undo', FOREIGN))
    expect(res.nodes[0]).toMatchObject({ id: node1.id, folderId: FOREIGN, paperId: 'p-b1', createdAt: node1.createdAt })
    expect(res.edges.map((e) => e.id).sort()).toEqual([edge12.id, edge31.id].sort())
    expect(inv88Violations(rig.db)).toEqual([])
    rig.db.close()
  })

  it("③ 对照：主图文献（folder_id='__main__'）在主图恢复→照常（节点 folderId 与文献归属同一表示）", () => {
    const rig = seededRig()
    expect(rig.repos.papers.folderIdOf('p-a')).toBe('__main__')
    rig.repos.lineage.removeNode(rig.nodeA.id)
    const res = rig.svc.unit(req([edgeDelta(rig.edgeAB, null), edgeDelta(rig.edgeCA, null), nodeDelta(rig.nodeA, null)], 'undo'))
    expect(res.nodes[0]).toMatchObject({ id: rig.nodeA.id, folderId: FOLDER, paperId: 'p-a' })
    expect(inv88Violations(rig.db)).toEqual([])
    rig.db.close()
  })

  it('④ redo 方向（after 侧）：重做「新建节点」而文献已属别的文件夹→同样拒绝，节点保持缺席', () => {
    const rig = seededRig()
    rig.repos.lineage.removeNode(rig.nodeA.id)
    seedFolder(rig.db, FOREIGN, '乙夹')
    rig.repos.papers.setFolderId('p-a', FOREIGN) // 节点缺席、目标图内未入图
    expect(rig.repos.lineage.nodeByPaperId('p-a')).toBeNull()
    const stateBefore = guardedState(rig.db)
    rig.calls.length = 0
    expectPaperLeftFolderRejected(rig, stateBefore, () => rig.svc.unit(schemaReq([nodeDelta(null, rig.nodeA)], 'redo')))
    expect(rowOf(rig.db, 'lineage_nodes', rig.nodeA.id)).toBeNull()
    rig.db.close()
  })

  it('⑤ 对照：无文献节点（paperId=null）不涉本校验→照常恢复', () => {
    const rig = seededRig()
    const topic = rig.repos.lineage.upsertNode({ paperId: null, title: '主题', year: 2020, x: 5, y: 6, month: null, slot: 7 })
    rig.repos.lineage.removeNode(topic.id)
    const res = rig.svc.unit(req([nodeDelta(topic, null)], 'undo'))
    expect(res.nodes[0]).toMatchObject({ id: topic.id, folderId: FOLDER, paperId: null, title: '主题' })
    expect(inv88Violations(rig.db)).toEqual([])
    rig.db.close()
  })
})
