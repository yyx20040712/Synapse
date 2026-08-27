/**
 * [LG-01] lineage 数据基座+草稿导入器（锁定合约）。
 * 覆盖面：repo 六方法真库夹具（upsert 往返/级联链/UNIQUE 拒/清面/空图合法）/
 * 导入三段校验（zod 行级中文 reason/幽灵 paperId/树三拒——多父/环/自环——
 * 外加悬空边/重复节点/重复边拒绝）/全有或全无（失败库不动/成功替换重灌）/
 * 空 draft=空图合法/validateDraft 纯函数性质/upsertEdge 运行时守卫三拒绝
 * （W1 宿主用例）+重复边中文收口/importFromFile 损坏 JSON 上抛。
 * repo 交互=真库夹具（AI-01 测试同型）；always-active（ADR-0017 裁决 3）。
 */
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, expect, it } from 'vitest'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createTestDb } from '../../utils/fixtures'
import {
  createLineageService,
  validateDraft
} from '../../../src/main/services/lineage/lineage.service'

/** draft 合法形状（snake_case 文件面，ADR-0014 §裁决） */
function draft(patches: {
  nodes?: Array<Record<string, unknown>>
  edges?: Array<Record<string, unknown>>
}): unknown {
  return {
    nodes: patches.nodes ?? [
      { paper_id: 'p-1', title: '起源文献', year: 2018, core_idea: '源头思想' },
      { paper_id: 'p-2', title: '继承文献', year: 2021, core_idea: '延伸' }
    ],
    edges: patches.edges ?? [{ from_paper_id: 'p-1', to_paper_id: 'p-2', label: '主要继承' }]
  }
}

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let svc: ReturnType<typeof createLineageService>
let tmpRoot: string
const paperExists = (id: string): boolean => id === 'p-1' || id === 'p-2' || id === 'p-3'

beforeEach(() => {
  db = createTestDb()
  for (const id of ['p-1', 'p-2', 'p-3']) {
    db.prepare(
      'INSERT INTO papers (id, file_ref, sha256, added_at, updated_at) VALUES (?,?,?,?,?)'
    ).run(id, 'a.pdf', `s-${id}`, 't', 't')
  }
  repo = createLineageRepo(db)
  tmpRoot = '' // 按需在 importFromFile 用例中创建
  svc = createLineageService({
    repo,
    paperExists,
    withTransaction: (fn) => db.transaction(fn)()
  })
})

afterEach(async () => {
  if (tmpRoot !== '') await rm(tmpRoot, { recursive: true, force: true })
})

// ── repo 六方法（真库夹具）──────────────────────────────────────

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

it('clearGraph：清面重灌原语（先清边后清节点，两表全空）', () => {
  const a = repo.upsertNode({ paperId: 'p-1', title: 'a', coreIdea: '', year: null, x: null, y: null })
  const b = repo.upsertNode({ paperId: 'p-2', title: 'b', coreIdea: '', year: null, x: null, y: null })
  repo.upsertEdge({ fromNode: a.id, toNode: b.id, label: '' })
  repo.clearGraph()
  expect(repo.listGraph()).toEqual({ nodes: [], edges: [] })
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

// ── service：导入三段校验+全有或全无 ───────────────────────────

it('合法 draft 全过：{ok:true,nodeCount,edgeCount}，graph 反映内容（x/y=自动布局 null）', () => {
  const r = svc.importDraft(draft({}))
  expect(r).toEqual({ ok: true, nodeCount: 2, edgeCount: 1 })
  const g = svc.graph()
  expect(g.nodes.map((n) => n.paperId).sort()).toEqual(['p-1', 'p-2'])
  expect(g.nodes.every((n) => n.x === null && n.y === null)).toBe(true)
  expect(g.edges).toHaveLength(1)
  expect(g.edges[0]).toMatchObject({ label: '主要继承' })
})

it('替换重灌：二导新 draft 后旧图清空（整批替换语义）', () => {
  svc.importDraft(draft({}))
  svc.importDraft(
    draft({
      nodes: [{ paper_id: 'p-3', title: '新起点', year: 2024, core_idea: '新' }],
      edges: []
    })
  )
  const g = svc.graph()
  expect(g.nodes.map((n) => n.paperId)).toEqual(['p-3'])
  expect(g.edges).toEqual([])
})

it('幽灵 paperId 拦截：行级 errors+库不动（全有或全无）', () => {
  svc.importDraft(draft({})) // 先有旧图
  const r = svc.importDraft(
    draft({
      nodes: [{ paper_id: 'ghost-9', title: '幽灵', year: 2020, core_idea: '' }],
      edges: []
    })
  )
  expect(r.ok).toBe(false)
  if (!r.ok) {
    expect(r.errors[0]!.path).toBe('nodes.0.paper_id')
    expect(r.errors[0]!.reason).toContain('ghost-9')
  }
  expect(svc.graph().nodes).toHaveLength(2) // 旧图保持
})

it('多父边拒绝：同一 to 两条入边 → errors 含多父 reason', () => {
  const r = svc.importDraft(
    draft({
      nodes: [
        { paper_id: 'p-1', title: 'a', year: 2018, core_idea: '' },
        { paper_id: 'p-2', title: 'b', year: 2019, core_idea: '' },
        { paper_id: 'p-3', title: 'c', year: 2020, core_idea: '' }
      ],
      edges: [
        { from_paper_id: 'p-1', to_paper_id: 'p-3', label: '' },
        { from_paper_id: 'p-2', to_paper_id: 'p-3', label: '' }
      ]
    })
  )
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.errors.some((e) => e.reason.includes('多父'))).toBe(true)
  expect(svc.graph().nodes).toEqual([])
})

it('成环拒绝：A→B→C→A 第三边触发环 errors；库不动', () => {
  const r = svc.importDraft(
    draft({
      nodes: [
        { paper_id: 'p-1', title: 'a', year: 2018, core_idea: '' },
        { paper_id: 'p-2', title: 'b', year: 2019, core_idea: '' },
        { paper_id: 'p-3', title: 'c', year: 2020, core_idea: '' }
      ],
      edges: [
        { from_paper_id: 'p-1', to_paper_id: 'p-2', label: '' },
        { from_paper_id: 'p-2', to_paper_id: 'p-3', label: '' },
        { from_paper_id: 'p-3', to_paper_id: 'p-1', label: '回边' }
      ]
    })
  )
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.errors.some((e) => e.reason.includes('环'))).toBe(true)
  expect(svc.graph().edges).toEqual([])
})

it('自环拒绝：from==to 边 → errors 含自环 reason', () => {
  const r = svc.importDraft(
    draft({
      nodes: [{ paper_id: 'p-1', title: 'a', year: 2018, core_idea: '' }],
      edges: [{ from_paper_id: 'p-1', to_paper_id: 'p-1', label: '' }]
    })
  )
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.errors.some((e) => e.reason.includes('自环'))).toBe(true)
})

it('zod 行级中文 reason：title 缺失 → nodes.0.title 路径+中文；nodes 缺失 → 顶层路径', () => {
  const r = svc.importDraft({
    nodes: [{ paper_id: 'p-1', year: 2018, core_idea: '' }],
    edges: []
  })
  expect(r.ok).toBe(false)
  if (!r.ok) {
    const hit = r.errors.find((e) => e.path === 'nodes.0.title')
    expect(hit).toBeDefined()
    expect(hit!.reason).toMatch(/title/)
  }
  const r2 = svc.importDraft({ edges: [] })
  expect(r2.ok).toBe(false)
  if (!r2.ok) expect(r2.errors.some((e) => e.path === 'nodes')).toBe(true)
})

it('空 draft=空图合法：{ok:true,nodeCount:0,edgeCount:0}（清面重灌语义）', () => {
  svc.importDraft(draft({}))
  const r = svc.importDraft({ nodes: [], edges: [] })
  expect(r).toEqual({ ok: true, nodeCount: 0, edgeCount: 0 })
  expect(svc.graph()).toEqual({ nodes: [], edges: [] })
})

it('悬空边拒绝：边引用不在节点清单的文献 → errors', () => {
  const r = svc.importDraft(
    draft({
      nodes: [{ paper_id: 'p-1', title: 'a', year: 2018, core_idea: '' }],
      edges: [{ from_paper_id: 'p-2', to_paper_id: 'p-1', label: '' }]
    })
  )
  expect(r.ok).toBe(false)
  if (!r.ok) expect(r.errors.some((e) => e.path === 'edges.0.from_paper_id')).toBe(true)
})

it('重复节点拒绝：同 paper_id 出现两次 → errors；重复边拒绝：同 from→to 两次', () => {
  const dupNode = svc.importDraft({
    nodes: [
      { paper_id: 'p-1', title: 'a', year: 2018, core_idea: '' },
      { paper_id: 'p-1', title: 'a2', year: 2019, core_idea: '' }
    ],
    edges: []
  })
  expect(dupNode.ok).toBe(false)
  if (!dupNode.ok) expect(dupNode.errors.some((e) => e.reason.includes('重复节点'))).toBe(true)
  const dupEdge = svc.importDraft(
    draft({
      nodes: [
        { paper_id: 'p-1', title: 'a', year: 2018, core_idea: '' },
        { paper_id: 'p-2', title: 'b', year: 2019, core_idea: '' }
      ],
      edges: [
        { from_paper_id: 'p-1', to_paper_id: 'p-2', label: 'x' },
        { from_paper_id: 'p-1', to_paper_id: 'p-2', label: 'y' }
      ]
    })
  )
  expect(dupEdge.ok).toBe(false)
  if (!dupEdge.ok) expect(dupEdge.errors.some((e) => e.reason.includes('重复边'))).toBe(true)
})

it('validateDraft 纯函数性质：同输入同输出（两次调用 deepEqual）', () => {
  const input = draft({})
  expect(validateDraft(input, paperExists)).toEqual([])
  const bad = {
    nodes: [{ paper_id: 'ghost-1', title: 'g', year: null, core_idea: '' }],
    edges: [{ from_paper_id: 'ghost-1', to_paper_id: 'ghost-1', label: '' }]
  }
  expect(validateDraft(bad, paperExists)).toEqual(validateDraft(bad, paperExists))
  expect(validateDraft(bad, paperExists).length).toBeGreaterThan(0)
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

it('upsertEdge 运行时守卫②多父拒绝：to 已有父再挂 → 中文 reason+库不变', () => {
  const { a, b, c } = seedChain()
  svc.upsertEdge({ fromNode: a, toNode: b, label: '' })
  expect(() => svc.upsertEdge({ fromNode: c, toNode: b, label: '' })).toThrow('多父')
  expect(svc.graph().edges).toHaveLength(1)
})

it('upsertEdge 运行时守卫③成环拒绝：C→A 回边 → 中文 reason+库不变', () => {
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

// ── service：importFromFile（IO 面） ────────────────────────────

it('importFromFile：损坏 JSON 动作型上抛（中文含路径）；合法文件导入成功', async () => {
  tmpRoot = await mkdtemp(join(tmpdir(), 'lineage-import-'))
  const badPath = join(tmpRoot, 'bad.json')
  await writeFile(badPath, '{not-json', 'utf8')
  await expect(svc.importFromFile(badPath)).rejects.toThrow('损坏')
  const goodPath = join(tmpRoot, 'good.json')
  await writeFile(goodPath, JSON.stringify(draft({})), 'utf8')
  const r = await svc.importFromFile(goodPath)
  expect(r).toEqual({ ok: true, nodeCount: 2, edgeCount: 1 })
})
