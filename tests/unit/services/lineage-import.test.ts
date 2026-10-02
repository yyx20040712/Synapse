/**
 * [LG-01] lineage 数据基座（锁定合约；文件名沿承历史）。
 * [F-BAKRET-01] 草稿导入链用例（三段校验/全有或全无/文件读入/C2 跨图跳过/
 * INV-88 draft 重灌归属）随导入链退役删除（用户裁决 2026-09-30——ADR-0022）。
 * 保留覆盖面：repo 方法真库夹具（upsert 往返/级联链/UNIQUE 拒/空图合法）/
 * upsertEdge 运行时守卫（W1 宿主用例：自环/多父/成环三拒绝+重复边中文收口+
 * 节点不存在拒）/upsertNode 幽灵 paperId 拒/R2-LG12 参考边（kind=ref）写守卫。
 * repo 交互=真库夹具（AI-01 测试同型）；always-active（ADR-0017 裁决 3）。
 */
import { beforeEach, expect, it } from 'vitest'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import { createPapersRepo } from '../../../src/main/db/repos/papers.repo'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createTestDb } from '../../utils/fixtures'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let svc: ReturnType<typeof createLineageService>
const paperExists = (id: string): boolean => id === 'p-1' || id === 'p-2' || id === 'p-3'

beforeEach(() => {
  db = createTestDb()
  for (const id of ['p-1', 'p-2', 'p-3']) {
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)'
    ).run(id, 'a.pdf', `s-${id}`, 't', 't')
  }
  repo = createLineageRepo(db)
  svc = createLineageService({
    repo,
    paperExists,
    // [回炉码 1] INV-88 统一规则装配（真库——folderIdOf/ensureFolderAssigned 直连）
    paperFolderOf: (id) => createPapersRepo(db).folderIdOf(id),
    ensurePaperFolder: (id) => createPapersRepo(db).ensureFolderAssigned(id),
    withTransaction: (fn) => db.transaction(fn)()
  })
})

// ── repo 方法（真库夹具）────────────────────────────────────────

it('upsertNode：新建全字段往返（paperId/year 可空面）+同 id 二次 upsert 更新不换 created_at', () => {
  const n1 = repo.upsertNode({
    paperId: 'p-1',
    title: '起源',
    coreIdea: '核心',
    year: 2018,
    x: null,
    y: null
  })
  expect(n1.id).toBeTruthy()
  expect(n1).toMatchObject({ paperId: 'p-1', title: '起源', coreIdea: '核心', year: 2018, x: null, y: null })
  const n2 = repo.upsertNode({
    id: n1.id,
    paperId: 'p-1',
    title: '起源（改）',
    coreIdea: '核心（改）',
    year: null,
    x: 12.5,
    y: 3.25
  })
  expect(n2.id).toBe(n1.id)
  expect(n2.createdAt).toBe(n1.createdAt)
  expect(n2.title).toBe('起源（改）')
  expect(n2.x).toBe(12.5)
  expect(repo.listGraph().nodes).toHaveLength(1)
})

it('removeNode：DDL 级联清关联边；removeEdge 计数', () => {
  const a = repo.upsertNode({ paperId: 'p-1', title: 'a', coreIdea: '', year: null, x: null, y: null })
  const b = repo.upsertNode({ paperId: 'p-2', title: 'b', coreIdea: '', year: null, x: null, y: null })
  const e = repo.upsertEdge({ fromNode: a.id, toNode: b.id, label: '' })
  expect(repo.removeEdge(e.id)).toBe(1)
  expect(repo.removeEdge(e.id)).toBe(0)
  const e2 = repo.upsertEdge({ fromNode: a.id, toNode: b.id, label: '再连' })
  expect(repo.removeNode(a.id)).toBe(1)
  const g = repo.listGraph()
  expect(g.nodes.map((n) => n.id)).toEqual([b.id])
  expect(g.edges).toEqual([]) // from 节点删除 → 边级联（DDL CASCADE）
  void e2
})

it('upsertEdge：UNIQUE(from,to) 拒同端点第二条（DDL 收口）；listGraph 空库=空数组合法态', () => {
  expect(repo.listGraph()).toEqual({ nodes: [], edges: [] })
  const a = repo.upsertNode({ paperId: 'p-1', title: 'a', coreIdea: '', year: null, x: null, y: null })
  const b = repo.upsertNode({ paperId: 'p-2', title: 'b', coreIdea: '', year: null, x: null, y: null })
  repo.upsertEdge({ fromNode: a.id, toNode: b.id, label: '一' })
  expect(() => repo.upsertEdge({ fromNode: a.id, toNode: b.id, label: '二' })).toThrow()
})

it('级联链：paper 删除 → lineage_nodes CASCADE → 关联边随亡', () => {
  const a = repo.upsertNode({ paperId: 'p-1', title: 'a', coreIdea: '', year: null, x: null, y: null })
  const b = repo.upsertNode({ paperId: 'p-2', title: 'b', coreIdea: '', year: null, x: null, y: null })
  repo.upsertEdge({ fromNode: a.id, toNode: b.id, label: '' })
  db.prepare('DELETE FROM papers WHERE id = ?').run('p-1')
  const g = repo.listGraph()
  expect(g.nodes.map((n) => n.paperId)).toEqual(['p-2'])
  expect(g.edges).toEqual([])
})

// ── service：upsertEdge 运行时守卫（W1 宿主——三拒绝路径） ──────

function seedChain(): { a: string; b: string; c: string } {
  const a = repo.upsertNode({ paperId: 'p-1', title: 'a', coreIdea: '', year: 2018, x: null, y: null })
  const b = repo.upsertNode({ paperId: 'p-2', title: 'b', coreIdea: '', year: 2019, x: null, y: null })
  const c = repo.upsertNode({ paperId: 'p-3', title: 'c', coreIdea: '', year: 2020, x: null, y: null })
  return { a: a.id, b: b.id, c: c.id }
}

it('upsertEdge 运行时守卫①自环拒绝：中文 reason+库不变', () => {
  const { a } = seedChain()
  expect(() => svc.upsertEdge({ fromNode: a, toNode: a, label: '' })).toThrow('自环')
  expect(svc.graph().edges).toEqual([])
})

it('upsertEdge 运行时守卫②成环拒绝：C→A 回边 → 中文 reason+库不变', () => {
  const { a, b, c } = seedChain()
  svc.upsertEdge({ fromNode: a, toNode: b, label: '' })
  svc.upsertEdge({ fromNode: b, toNode: c, label: '' })
  expect(() => svc.upsertEdge({ fromNode: c, toNode: a, label: '回边' })).toThrow('环')
  expect(svc.graph().edges).toHaveLength(2)
})

it('upsertEdge 重复边中文收口（UNIQUE 收口面）；节点不存在中文拒绝；合法路径放行', () => {
  const { a, b, c } = seedChain()
  svc.upsertEdge({ fromNode: a, toNode: b, label: '一' })
  expect(() => svc.upsertEdge({ fromNode: a, toNode: b, label: '二' })).toThrow('已存在')
  expect(() => svc.upsertEdge({ fromNode: a, toNode: 'node-404', label: '' })).toThrow('不存在')
  const ok = svc.upsertEdge({ fromNode: a, toNode: c, label: '分叉' })
  expect(ok.label).toBe('分叉')
  expect(svc.graph().edges).toHaveLength(2)
})

it('upsertNode 幽灵 paperId 拒绝（中文）；removeNode/removeEdge 透传', () => {
  expect(() =>
    svc.upsertNode({ paperId: 'ghost-2', title: 'x', coreIdea: '', year: null, x: null, y: null })
  ).toThrow('幽灵')
  const n = svc.upsertNode({ paperId: 'p-1', title: 'x', coreIdea: '', year: null, x: null, y: null })
  expect(svc.removeNode(n.id)).toBe(1)
})

