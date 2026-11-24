/**
 * [B4 L1 §7.5 普通写点守卫 / §12.2 lineage-write-guard 行] 三 repo upsert 写点
 * 单调守卫真库序列：恢复值行→upsert→updated_at 前进且内容更新；同毫秒连写
 * 逐步 +1ms 不撞平；轻微回拨取旧行+1ms；INSERT 分支新行原样写 now。
 *
 * 不变量（§7.5）：可恢复实体（lineage_nodes/lineage_edges/floating_notes）每行
 * updated_at 在一切写点严格单调不减且新写值>旧值。落位=三 repo upsert 语句
 * UPDATE 分支内 SQL 标量 max（预编译+参数绑定不变）。
 * always-active（裸 describe）。
 */
import { describe, expect, it } from 'vitest'
import {
  addMs,
  iso,
  makeLineageDb,
  ms,
  rowOf,
  seedPaper,
  setUpdatedAt,
  tombstonesOf,
  type Db,
  type GuardedTable,
  type Repos
} from '../../../utils/lineage-history-db'

/** 远未来基值：普通写裸 now 必然早于它（守卫恒取「旧行+1ms」项——确定性触发） */
const FUTURE = '2999-06-01T12:00:00.000Z'

interface Fixture {
  db: Db
  repos: Repos
  nodeA: string
  nodeB: string
  edge: string
  note: string
}

function makeFixture(): Fixture {
  const { db, repos } = makeLineageDb()
  seedPaper(db, 'p-a')
  seedPaper(db, 'p-b')
  const nodeA = repos.lineage.upsertNode({ paperId: 'p-a', title: '甲', year: 2020, x: 0, y: 0, month: 1, slot: 0 }).id
  const nodeB = repos.lineage.upsertNode({ paperId: 'p-b', title: '乙', year: 2020, x: 0, y: 0, month: 1, slot: 1 }).id
  const edge = repos.lineage.upsertEdge({ fromNode: nodeA, toNode: nodeB, label: '线' }).id
  const note = repos.floatingNotes.upsert({ folderId: '__main__', x: 10, y: 20, content: '笔记' }).id
  return { db, repos, nodeA, nodeB, edge, note }
}

/** 三表写点：id=被测行；write=一次普通写（经 repo 公开 upsert 面可达）；
 *  content=该行内容列读数；written=普通写后的内容列期望值 */
interface WritePoint {
  table: GuardedTable
  id: (f: Fixture) => string
  write: (f: Fixture) => unknown
  content: (f: Fixture) => unknown
  written: unknown
}

const WRITE_POINTS: WritePoint[] = [
  {
    table: 'lineage_nodes',
    id: (f) => f.nodeA,
    write: (f) =>
      f.repos.lineage.upsertNode({ id: f.nodeA, paperId: 'p-a', title: '甲', year: 2020, x: 7, y: 8, month: 1, slot: 0 }),
    content: (f) => f.db.prepare('SELECT x, y FROM lineage_nodes WHERE id = ?').get(f.nodeA),
    written: { x: 7, y: 8 }
  },
  {
    table: 'lineage_edges',
    id: (f) => f.edge,
    write: (f) => f.repos.lineage.upsertEdge({ id: f.edge, fromNode: f.nodeA, toNode: f.nodeB, label: '改名' }),
    content: (f) => f.db.prepare('SELECT label FROM lineage_edges WHERE id = ?').get(f.edge),
    written: { label: '改名' }
  },
  {
    table: 'floating_notes',
    id: (f) => f.note,
    write: (f) => f.repos.floatingNotes.upsert({ id: f.note, folderId: '__main__', x: 11, y: 22, content: '改文' }),
    content: (f) => f.db.prepare('SELECT x, y, content FROM floating_notes WHERE id = ?').get(f.note),
    written: { x: 11, y: 22, content: '改文' }
  }
]

describe.each(WRITE_POINTS)('写点守卫：$table（§7.5 普通写点——B1 三轮）', (wp) => {
  it('INSERT 分支：新行原样写调用方 now（无旧值可比——落库值∈调用窗）', () => {
    const before = Date.now()
    const f = makeFixture()
    const after = Date.now()
    const at = ms(rowOf(f.db, wp.table, wp.id(f))!.updated_at)
    expect(at).toBeGreaterThanOrEqual(before)
    expect(at).toBeLessThanOrEqual(after)
    f.db.close()
  })

  it('恢复值行→普通 upsert：updated_at 前移（旧行+1ms）且内容=普通写值（不回退到裸 now）', () => {
    const f = makeFixture()
    const id = wp.id(f)
    setUpdatedAt(f.db, wp.table, id, FUTURE)
    wp.write(f)
    expect(rowOf(f.db, wp.table, id)!.updated_at).toBe(addMs(FUTURE, 1))
    expect(wp.content(f)).toEqual(wp.written)
    f.db.close()
  })

  it('轻微回拨（行 updated_at 略晚于 now）→取旧行+1ms', () => {
    const f = makeFixture()
    const id = wp.id(f)
    const slightlyAhead = iso(Date.now() + 50)
    setUpdatedAt(f.db, wp.table, id, slightlyAhead)
    wp.write(f)
    expect(rowOf(f.db, wp.table, id)!.updated_at).toBe(addMs(slightlyAhead, 1))
    f.db.close()
  })

  it('同毫秒域连写：每步严格 +1ms 不撞平（updated_at 逐写前进、created_at 不改写）', () => {
    const f = makeFixture()
    const id = wp.id(f)
    setUpdatedAt(f.db, wp.table, id, FUTURE)
    const createdAt = rowOf(f.db, wp.table, id)!.created_at
    for (let i = 1; i <= 4; i++) {
      wp.write(f)
      expect(rowOf(f.db, wp.table, id)!.updated_at).toBe(addMs(FUTURE, i))
    }
    expect(rowOf(f.db, wp.table, id)!.created_at).toBe(createdAt)
    f.db.close()
  })

  it('now 晚于旧行（正常时钟）：取 now（守卫不强行 +1ms）', () => {
    const f = makeFixture()
    const id = wp.id(f)
    setUpdatedAt(f.db, wp.table, id, '2000-01-01T00:00:00.000Z')
    const before = Date.now()
    wp.write(f)
    const after = Date.now()
    const at = ms(rowOf(f.db, wp.table, id)!.updated_at)
    expect(at).toBeGreaterThanOrEqual(before)
    expect(at).toBeLessThanOrEqual(after)
    f.db.close()
  })
})

describe('写点守卫 NULL 安全：非 ISO updated_at 行的普通写不产生 NULL（退化为调用方 now）', () => {
  it('三表：畸形 updated_at 行→upsert 成功，updated_at∈调用窗（非 NULL、不撞 NOT NULL）', () => {
    for (const wp of WRITE_POINTS) {
      const f = makeFixture()
      const id = wp.id(f)
      f.db.prepare(`UPDATE ${wp.table} SET updated_at = 'not-a-timestamp' WHERE id = ?`).run(id)
      const before = Date.now()
      wp.write(f)
      const at = ms(rowOf(f.db, wp.table, id)!.updated_at)
      expect(Number.isNaN(at), wp.table).toBe(false)
      expect(at).toBeGreaterThanOrEqual(before)
      expect(wp.content(f)).toEqual(wp.written)
      f.db.close()
    }
  })
})

describe('写点守卫闭环：恢复→普通写→再删除（§7.5 序列 5 本地段——删事件不被 UNIQUE 吞）', () => {
  it('恢复值行→普通写（不倒退）→真库 DELETE：新 tombstone 存在且 deleted_at 严格大于被删行删除前 updated_at', () => {
    const f = makeFixture()
    setUpdatedAt(f.db, 'lineage_nodes', f.nodeB, FUTURE) // 恢复值行
    f.repos.lineage.upsertNode({ id: f.nodeB, paperId: 'p-b', title: '乙', year: 2020, x: 3, y: 4, month: 1, slot: 1 })
    const preDelete = rowOf(f.db, 'lineage_nodes', f.nodeB)!.updated_at
    expect(preDelete).toBe(addMs(FUTURE, 1)) // 普通写不倒退
    f.repos.lineage.removeNode(f.nodeB) // 相关边由 FK CASCADE 删除
    const tombs = tombstonesOf(f.db, 'lineage_nodes', f.nodeB)
    expect(tombs).toHaveLength(1)
    expect(ms(tombs[0]!)).toBeGreaterThan(ms(preDelete))
    expect(tombstonesOf(f.db, 'lineage_edges', f.edge)).toHaveLength(1) // cascade 子行同样落账
    f.db.close()
  })
})
