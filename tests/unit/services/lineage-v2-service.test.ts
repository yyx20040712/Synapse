/**
 * [T3-P5] lineage service v2 守卫+slot 归一+lineTypes 读写（新锁定合约面；
 * 真库夹具——repo getLineTypes/setLineTypes 同测）。
 *
 * 覆盖：sub 三守卫（不存在拒/跨基型拒/删被引用 sub 整批拒列冲突 id）+
 * 被引用 sub 不得变更基型组（跨组移动整批拒——回炉 1 门一 W-3/门二 P2-2）/
 * upsertLineTypes 恒四组校验+subs.id 全图唯一+校验后回显（恒四组序）/
 * slot 归一三分支（新建组 max+1/同组更新保留原 slot/跨组更新落组末）+
 * slot 显式透写+month 缺省=null/inferred 同 tree 单父守卫（双向）+拒环/
 * graph lineTypes 恒四组（meta 空配置=空组）+nodes=lineageOrder 序。
 * [F-BAKRET-01] 草稿导入用例（draft 恒 tree/importDraft v1.2）随导入链退役
 * 删除（用户裁决 2026-09-30——ADR-0022）。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §3/§4。
 * always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import {
  createLineageService
} from '../../../src/main/services/lineage/lineage.service'
import { LINE_TYPE_BASE_ORDER, type LineTypeGroup } from '../../../src/shared/models/lineage'
import { createTestDb } from '../../utils/fixtures'

const paperExists = (id: string): boolean => id === 'p-1' || id === 'p-2' || id === 'p-3'

let db: SqliteDb
let repo: ReturnType<typeof createLineageRepo>
let svc: ReturnType<typeof createLineageService>

function seedNode(patch: {
  id?: string
  paperId?: string | null
  year?: number | null
  month?: number | null
  slot?: number | null
  createdAt?: string
}): ReturnType<typeof repo.upsertNode> {
  // 直插可控 created_at（slot 归一断言需要稳定行序）——绕开 repo 时间戳生成
  const id = patch.id ?? `n-${Math.random().toString(36).slice(2, 8)}`
  db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, slot, tags, created_at, updated_at)
     VALUES (?, ?, ?, '', ?, NULL, NULL, ?, ?, NULL, ?, ?)`
  ).run(
    id,
    patch.paperId ?? null,
    `节点${id}`,
    patch.year ?? null,
    patch.month ?? null,
    patch.slot ?? null,
    patch.createdAt ?? '2026-01-01T00:00:00.000Z',
    patch.createdAt ?? '2026-01-01T00:00:00.000Z'
  )
  return repo.listGraph().nodes.find((n) => n.id === id)!
}

/** 四组线型配置（base 枚举序；tree 组带一个子线型） */
function fourGroups(subs: LineTypeGroup['subs'] = []): LineTypeGroup[] {
  return [
    { base: 'tree', subs },
    { base: 'inferred', subs: [] },
    { base: 'ref', subs: [] },
    { base: 'manual', subs: [] }
  ]
}

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
    paperFolderOf: () => null, // [回炉码 1] 统一规则桩（未归档语义——文件夹域用例在 move-paper 件）
    ensurePaperFolder: () => '__main__',
    withTransaction: (fn) => db.transaction(fn)()
  })
})

// ── repo：getLineTypes/setLineTypes ────────────────────────────

describe('T3-P5 repo lineTypes 读写（lineage_graph_meta KV）', () => {
  it('空配置（seed 空数组串）：getLineTypes=恒四组空组按 base 枚举序', () => {
    expect(repo.getLineTypes()).toEqual(
      LINE_TYPE_BASE_ORDER.map((b) => ({ base: b, subs: [] }))
    )
  })

  it('setLineTypes 整体替换+读回；updated_at 应用层刷新（随写变动）', () => {
    const before = db
      .prepare('SELECT updated_at FROM lineage_graph_meta WHERE key = ?')
      .get('lineTypes') as { updated_at: string }
    const groups = fourGroups([{ id: 'lt-a', name: '强继承', color: '#F2773A', dash: '', w: 2 }])
    repo.setLineTypes(groups)
    const after = db
      .prepare('SELECT value, updated_at FROM lineage_graph_meta WHERE key = ?')
      .get('lineTypes') as { value: string; updated_at: string }
    expect(JSON.parse(after.value)).toEqual(groups)
    expect(after.updated_at).not.toBe(before.updated_at)
    expect(repo.getLineTypes()).toEqual(groups)
  })
})

// ── upsertLineTypes：整批校验 ──────────────────────────────────

describe('T3-P5 upsertLineTypes（图级整体替换——单通道原子写）', () => {
  it('恒四组校验：缺组/重复组拒绝（中文 reason）；合法批回显恒四组（枚举序）', () => {
    expect(() => svc.upsertLineTypes(fourGroups().slice(0, 3) as LineTypeGroup[])).toThrow('四组')
    expect(() =>
      svc.upsertLineTypes([...fourGroups(), { base: 'tree', subs: [] }])
    ).toThrow('四组')
    const back = svc.upsertLineTypes([
      { base: 'manual', subs: [] },
      { base: 'ref', subs: [] },
      { base: 'inferred', subs: [] },
      { base: 'tree', subs: [{ id: 'lt-a', name: '强继承', color: '#F2773A', dash: '', w: 2 }] }
    ])
    expect(back.map((g) => g.base)).toEqual([...LINE_TYPE_BASE_ORDER])
    expect(repo.getLineTypes()[0]!.subs).toHaveLength(1)
  })

  it('subs.id 全图唯一：跨组重复拒绝并列重复 id；组内重复同拒', () => {
    const s = { id: 'lt-dup', name: '甲', color: '#000000', dash: '', w: 1 }
    expect(() =>
      svc.upsertLineTypes(fourGroups([s, { ...s, name: '乙' }]))
    ).toThrow('lt-dup')
    expect(() =>
      svc.upsertLineTypes([
        { base: 'tree', subs: [s] },
        { base: 'inferred', subs: [{ ...s, name: '乙' }] },
        { base: 'ref', subs: [] },
        { base: 'manual', subs: [] }
      ])
    ).toThrow('lt-dup')
  })

  it('被现存边引用的 sub 不得消失：整批拒绝并列冲突 id（弃级联置 null）', () => {
    svc.upsertLineTypes(fourGroups([{ id: 'lt-keep', name: '保留', color: '#000000', dash: '', w: 1 }]))
    const a = seedNode({ id: 'a', year: 2020 })
    const b = seedNode({ id: 'b', year: 2021 })
    svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '', sub: 'lt-keep' })
    // 新批不含 lt-keep → 整批拒（列冲突 id）；含则过
    expect(() => svc.upsertLineTypes(fourGroups())).toThrow('lt-keep')
    const ok = svc.upsertLineTypes(
      fourGroups([{ id: 'lt-keep', name: '改名', color: '#111111', dash: '4 2', w: 1.5 }])
    )
    expect(ok[0]!.subs[0]!.name).toBe('改名')
    // 引用边仍指向存在的 sub（改名不破坏引用）
    expect(svc.graph().edges[0]!.sub).toBe('lt-keep')
  })

  it('被现存边引用的 sub 不得变更基型组：跨组移动整批拒（门一 W-3/门二 P2-2——击穿 base==kind 不变量）；同组改样式过', () => {
    svc.upsertLineTypes(fourGroups([{ id: 'lt-mv', name: '原', color: '#000000', dash: '', w: 1 }]))
    const a = seedNode({ id: 'a', year: 2020 })
    const b = seedNode({ id: 'b', year: 2021 })
    svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '', sub: 'lt-mv' }) // tree 边
    // id 保留但移到 manual 组 → 整批拒（列冲突 id）
    expect(() =>
      svc.upsertLineTypes([
        { base: 'tree', subs: [] },
        { base: 'inferred', subs: [] },
        { base: 'ref', subs: [] },
        { base: 'manual', subs: [{ id: 'lt-mv', name: '移组', color: '#222222', dash: '', w: 2 }] }
      ])
    ).toThrow('lt-mv')
    // 留 tree 组改样式（id/base 不变）→ 过
    const ok = svc.upsertLineTypes(
      fourGroups([{ id: 'lt-mv', name: '原', color: '#333333', dash: '2 2', w: 1.5 }])
    )
    expect(ok[0]!.subs[0]!.w).toBe(1.5)
  })
})

// ── upsertEdge sub 守卫 ────────────────────────────────────────

describe('T3-P5 upsertEdge sub 引用完整性（样式层写面守卫）', () => {
  it('sub 存在且 group.base==edge.kind 过（落库 sub）；sub 不存在拒（中文）', () => {
    svc.upsertLineTypes(fourGroups([{ id: 'lt-a', name: '强继承', color: '#F2773A', dash: '', w: 2 }]))
    const a = seedNode({ id: 'a', year: 2020 })
    const b = seedNode({ id: 'b', year: 2021 })
    const c = seedNode({ id: 'c', year: 2022 })
    const e = svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '', sub: 'lt-a' })
    expect(e.sub).toBe('lt-a')
    expect(() =>
      svc.upsertEdge({ fromNode: a.id, toNode: c.id, label: '', sub: 'lt-404' })
    ).toThrow('lt-404')
  })

  it('跨基型拒绝：sub 属 tree 组但 kind=manual → CONFLICT（中文）', () => {
    svc.upsertLineTypes(fourGroups([{ id: 'lt-tree-1', name: '树子型', color: '#000000', dash: '', w: 1 }]))
    const a = seedNode({ id: 'a', year: 2020 })
    const b = seedNode({ id: 'b', year: 2021 })
    const c = seedNode({ id: 'c', year: 2022 })
    expect(() =>
      svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '', kind: 'manual', sub: 'lt-tree-1' })
    ).toThrow('跨')
    // sub=null（基础型默认样式）与缺省 sub 均合法（不同端点对避互斥守卫）
    expect(svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '', sub: null }).sub).toBeNull()
    expect(svc.upsertEdge({ fromNode: a.id, toNode: c.id, label: '', kind: 'manual' }).sub).toBeNull()
  })

  it('更新语义：sub 随 upsertEdge 改回 null（清样式）合法（sub 存在性不涉 null）', () => {
    svc.upsertLineTypes(fourGroups([{ id: 'lt-a', name: '甲', color: '#000000', dash: '', w: 1 }]))
    const a = seedNode({ id: 'a', year: 2020 })
    const b = seedNode({ id: 'b', year: 2021 })
    const e = svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '', sub: 'lt-a' })
    const e2 = svc.upsertEdge({ id: e.id, fromNode: a.id, toNode: b.id, label: '', sub: null })
    expect(e2.sub).toBeNull()
  })
})

// ── inferred 守卫（同 tree——防退化，P5 无产生入口） ─────────────

describe('T3-P5 inferred 边守卫（同 tree：单父+拒环）', () => {
  it('to 已有 tree 父再挂 inferred 拒；to 已有 inferred 父再挂 tree 拒（双向单父）', () => {
    const a = seedNode({ id: 'a', year: 2020 })
    const b = seedNode({ id: 'b', year: 2021 })
    const c = seedNode({ id: 'c', year: 2022 })
    svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '' })
    expect(() =>
      svc.upsertEdge({ fromNode: c.id, toNode: b.id, label: '', kind: 'inferred' })
    ).toThrow('多父')
    // [F-BAKRET-01] 清面原语退役——第二半改用新节点对（a2/b2/c2 与 a/b/c 不冲突）
    const a2 = seedNode({ id: 'a2', year: 2020 })
    const b2 = seedNode({ id: 'b2', year: 2021 })
    const c2 = seedNode({ id: 'c2', year: 2022 })
    svc.upsertEdge({ fromNode: a2.id, toNode: b2.id, label: '', kind: 'inferred' })
    expect(() => svc.upsertEdge({ fromNode: c2.id, toNode: b2.id, label: '' })).toThrow('多父')
  })

  it('inferred 仍拒环（tree+inferred 混合环）；自环拒', () => {
    const a = seedNode({ id: 'a', year: 2020 })
    const b = seedNode({ id: 'b', year: 2021 })
    svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '' })
    expect(() =>
      svc.upsertEdge({ fromNode: b.id, toNode: a.id, label: '', kind: 'inferred' })
    ).toThrow('环')
    expect(() =>
      svc.upsertEdge({ fromNode: a.id, toNode: a.id, label: '', kind: 'inferred' })
    ).toThrow('自环')
  })

  it('ref/manual 回归保面：ref 综述限定+manual 不限条数不受 inferred 入枚举影响', () => {
    const s = seedNode({ id: 's', paperId: 'p-1', year: 2020 })
    db.prepare('UPDATE lineage_nodes SET title = ? WHERE id = ?').run('领域综述', s.id)
    const a = seedNode({ id: 'a', paperId: 'p-2', year: 2021 })
    const b = seedNode({ id: 'b', paperId: 'p-3', year: 2022 })
    const r = svc.upsertEdge({ fromNode: s.id, toNode: a.id, label: '', kind: 'ref' })
    expect(r.kind).toBe('ref')
    const m1 = svc.upsertEdge({ fromNode: a.id, toNode: b.id, label: '', kind: 'manual' })
    expect(m1.kind).toBe('manual')
  })
})

// ── upsertNode slot 归一（D-I-1 三分支） ────────────────────────

describe('T3-P5 upsertNode month/slot 归一（主控预裁 D-I-1）', () => {
  it('新建：slot 缺省=目标 (year,month) 组 max+1；month 缺省=null', () => {
    seedNode({ id: 'x1', year: 2020, month: 3, slot: 1 })
    seedNode({ id: 'x2', year: 2020, month: 3, slot: 4 })
    seedNode({ id: 'y1', year: 2020, month: 5, slot: 2 })
    const n = svc.upsertNode({ paperId: 'p-1', title: '新节点', coreIdea: '', year: 2020, x: null, y: null, month: 3 })
    expect(n.slot).toBe(5) // 组内 max=4 → +1
    expect(n.month).toBe(3)
    const n2 = svc.upsertNode({ paperId: 'p-2', title: '无月', coreIdea: '', year: 2020, x: null, y: null })
    expect(n2.month).toBeNull()
    expect(n2.slot).toBe(1) // (2020,null) 组空 → 1
  })

  it('更新且组不变：保留原 slot（缺省不重排）；month 缺省=null=跨组（全量语义）落组末', () => {
    const kept = seedNode({ id: 'k', year: 2020, month: 3, slot: 2 })
    const u = svc.upsertNode({ id: kept.id, paperId: null, title: '改', coreIdea: '', year: 2020, x: null, y: null, month: 3 })
    expect(u.slot).toBe(2)
    // month 省略 → null（同 tags/x/y 反向清空惯例）→ 组变 (2020,null) → 落组末
    seedNode({ id: 'z', year: 2020, month: null, slot: 7 })
    const u2 = svc.upsertNode({ id: kept.id, paperId: null, title: '改', coreIdea: '', year: 2020, x: null, y: null })
    expect(u2.month).toBeNull()
    expect(u2.slot).toBe(8)
  })

  it('更新且 month 变更=新组 max+1（原组余位不挤占）；year 变更同组语义', () => {
    const m = seedNode({ id: 'm', year: 2020, month: 3, slot: 1 })
    seedNode({ id: 't', year: 2021, month: 3, slot: 9 })
    const u = svc.upsertNode({ id: m.id, paperId: null, title: '跨月', coreIdea: '', year: 2021, x: null, y: null, month: 3 })
    expect(u.slot).toBe(10)
    const u2 = svc.upsertNode({ id: m.id, paperId: null, title: '跨年', coreIdea: '', year: 2022, x: null, y: null, month: 3 })
    expect(u2.slot).toBe(1)
  })

  it('slot 显式透写：提供值原样落库（含 null 清面）', () => {
    const n = svc.upsertNode({ paperId: 'p-1', title: '显式', coreIdea: '', year: 2020, x: null, y: null, month: 6, slot: 42 })
    expect(n.slot).toBe(42)
    const u = svc.upsertNode({ id: n.id, paperId: 'p-1', title: '显式', coreIdea: '', year: 2020, x: null, y: null, month: 6, slot: null })
    expect(u.slot).toBeNull()
  })

  it('[F-FOLDER-02 F5] 跨图改图（folderId 变、year/month 不变）slot 归一目标组 max+1——W3 终裁（显式/缺省两路均不透写不保留）', () => {
    // 主题节点（paperId null）显式跨图改图=F5 可达路径（文献节点 folderId≠归属被 INV-88 拒）
    db.prepare("INSERT INTO collections (id, name, position) VALUES ('f-a','图甲',1)").run()
    db.prepare("INSERT INTO collections (id, name, position) VALUES ('f-b','图乙',2)").run()
    const moved = seedNode({ id: 'f5-n', year: 2020, month: 3, slot: 1 })
    db.prepare("UPDATE lineage_nodes SET folder_id='f-a' WHERE id='f5-n'").run()
    seedNode({ id: 'f5-occ', year: 2020, month: 3, slot: 5 })
    db.prepare("UPDATE lineage_nodes SET folder_id='f-b' WHERE id='f5-occ'").run()
    // 显式 slot 路（renderer 编辑面恒携 slot）：原实现透写 9——目标组撞值面（INV-75 同图唯一击穿）
    const u = svc.upsertNode({ id: moved.id, paperId: null, title: '跨图', coreIdea: '', year: 2020, x: null, y: null, month: 3, slot: 9, folderId: 'f-b' })
    expect(u.folderId).toBe('f-b')
    expect(u.slot).toBe(6) // 目标组 (f-b,2020,3) max=5 → +1（显式 9 被归一覆盖）
    // 缺省 slot 路（第二节点仍留 f-a 组——u1 已把 moved 落入 f-b，其再 upsert 属同组保留，
    // 不足证缺省跨图面）：原实现保留 existing.slot——同撞值面
    const moved2 = seedNode({ id: 'f5-n2', year: 2020, month: 3, slot: 2 })
    db.prepare("UPDATE lineage_nodes SET folder_id='f-a' WHERE id='f5-n2'").run()
    const u2 = svc.upsertNode({ id: moved2.id, paperId: null, title: '跨图二', coreIdea: '', year: 2020, x: null, y: null, month: 3, folderId: 'f-b' })
    expect(u2.slot).toBe(7) // f-b 组现行 max=6（u1 归一结果）→ +1（缺省原值 2 被归一覆盖）
  })
})

// ── graph 读面：lineTypes 恒四组+lineageOrder 序 ────────────────

describe('T3-P5 graph 读面（INV-75：nodes=lineageOrder 序——读面唯一保证）', () => {
  it('nodes 按 lineageOrder 序返回（乱序插入归位）+lineTypes 恒四组', () => {
    svc.upsertLineTypes(
      fourGroups([{ id: 'lt-a', name: '甲', color: '#000000', dash: '', w: 1 }])
    )
    seedNode({ id: 'late', year: 2021, month: 1, slot: 1 })
    seedNode({ id: 'early', year: 2020, month: 5, slot: 2 })
    seedNode({ id: 'mid', year: 2020, month: 5, slot: 1 })
    seedNode({ id: 'nullmo', year: 2020, month: null, slot: 1 })
    const g = svc.graph()
    expect(g.nodes.map((n) => n.id)).toEqual(['mid', 'early', 'nullmo', 'late'])
    expect(g.lineTypes.map((x) => x.base)).toEqual([...LINE_TYPE_BASE_ORDER])
    expect(g.lineTypes[0]!.subs).toHaveLength(1)
  })
})
