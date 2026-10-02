/**
 * [T3-P5] lineage service v2 守卫+slot 归一（新锁定合约面；真库夹具）。
 *
 * [F-LGRAPH-01②U8] kind 四值体系退役重整：sub 三守卫/upsertLineTypes 恒四组/
 * inferred 单父守卫/ref 综述限定等用例随体系退役删除（替代断言面=
 * lineage-u8-linetype.test.ts——manual 单基型+色行名恰 6+环/重边/悬空保留）。
 * 保留面=slot 归一三分支+normalizeMonthSlot 组键两面+graph lineageOrder 序。
 * 真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-design-final.md §3/§4
 * +2026-10-01_f-lgraph01-editor-design-final.md §1（U8 重整）。
 * always-active（不经 guardedDescribe）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import {
  createLineageService
} from '../../../src/main/services/lineage/lineage.service'
import { normalizeMonthSlot } from '../../../src/main/services/lineage/lineage.write-guards'
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

  it('[F-LGCLN-01] 主题节点更新禁搬图：显式 folderId≠现图被忽略（仍在原图）+slot 保留/显式透传——显式跨图路径退役（用户裁决 2026-09-30）', () => {
    // 主题节点（paperId null）带 id 显式 folderId≠现图=旧 F5 跨图可达路径——
    // LGCLN 后被忽略（选图时对论文卡片已失焦，交互上不可构成=冗余逻辑删除；
    // 文献节点 folderId≠归属恒 INV-88 拒，moveFolder 跨图面由 folders-move-paper 件锁定）
    db.prepare("INSERT INTO collections (id, name, position) VALUES ('f-a','图甲',1)").run()
    db.prepare("INSERT INTO collections (id, name, position) VALUES ('f-b','图乙',2)").run()
    seedNode({ id: 'f5-occ', year: 2020, month: 3, slot: 5 })
    db.prepare("UPDATE lineage_nodes SET folder_id='f-b' WHERE id='f5-occ'").run()
    // 显式 slot 路：folderId 被忽略+同组（year/month 面）slot 主权透写
    const moved = seedNode({ id: 'f5-n', year: 2020, month: 3, slot: 1 })
    db.prepare("UPDATE lineage_nodes SET folder_id='f-a' WHERE id='f5-n'").run()
    const u = svc.upsertNode({ id: moved.id, paperId: null, title: '禁搬', coreIdea: '', year: 2020, x: null, y: null, month: 3, slot: 9, folderId: 'f-b' })
    expect(u.folderId).toBe('f-a') // 仍在原图（显式 f-b 被忽略——不搬不拒）
    expect(u.slot).toBe(9) // year/month 同组→显式 slot 主权透写（组键去 folderId 面）
    // 缺省 slot 路：folderId 被忽略+slot 保留原值（组键两面下命中同组保留分支）
    const moved2 = seedNode({ id: 'f5-n2', year: 2020, month: 3, slot: 2 })
    db.prepare("UPDATE lineage_nodes SET folder_id='f-a' WHERE id='f5-n2'").run()
    const u2 = svc.upsertNode({ id: moved2.id, paperId: null, title: '禁搬二', coreIdea: '', year: 2020, x: null, y: null, month: 3, folderId: 'f-b' })
    expect(u2.folderId).toBe('f-a')
    expect(u2.slot).toBe(2) // 保留原值（f-b 侧占用 5 不参与——忽略面零组变副作用）
  })
})

// ── [F-LGCLN-01] normalizeMonthSlot 组键两面化（纯函数直测） ────

describe('[F-LGCLN-01] normalizeMonthSlot 组键=(year,month) 两面（folderId 面随显式跨图退役删除）', () => {
  const upsertBase = {
    paperId: null,
    title: '组键',
    coreIdea: '',
    x: null,
    y: null
  } as const

  it('folderId 变+year/month 不变+显式 slot→透传（sameGroup 命中——moveFolder 主权值路径）', () => {
    // 纯函数直测：existing 行对象内存改 folderId（不走 DB UPDATE——外键零涉及）
    const existing = { ...seedNode({ id: 'kg-x', year: 2020, month: 3, slot: 1 }), folderId: 'f-a' }
    const r = normalizeMonthSlot(
      { ...upsertBase, id: existing.id, year: 2020, month: 3, slot: 9, folderId: 'f-b' },
      [existing]
    )
    expect(r).toEqual({ month: 3, slot: 9 }) // 显式主权值透写（不归一覆盖）
  })

  it('folderId 变+缺省 slot→throw（k1-N3 防御机锚——编程错误面，原静默保留行为废止）', () => {
    // 门一回炉 k1-N3：sameGroup 去 folderId 面后，「改图不传 slot」不再静默
    // 保留原 slot（跨图保留会撞 INV-75 组内唯一）——未来新调用方违契约即红
    const existing = { ...seedNode({ id: 'kg-k', year: 2020, month: 3, slot: 2 }), folderId: 'f-a' }
    expect(() =>
      normalizeMonthSlot(
        { ...upsertBase, id: existing.id, year: 2020, month: 3, folderId: 'f-b' },
        [existing]
      )
    ).toThrow(/folderId 变化必须显式 slot/)
  })

  it('year 变（folderId 同图）→组变归一目标组 max+1', () => {
    const existing = seedNode({ id: 'kg-y', year: 2020, month: 3, slot: 1 })
    seedNode({ id: 'kg-occ', year: 2021, month: 3, slot: 4 })
    const r = normalizeMonthSlot(
      { ...upsertBase, id: existing.id, year: 2021, month: 3, slot: 9, folderId: existing.folderId },
      repo.listGraph().nodes
    )
    expect(r).toEqual({ month: 3, slot: 5 }) // 目标组 max=4 → +1（显式 9 被归一覆盖）
  })
})

// ── graph 读面：lineageOrder 序+lineTypeNames 恰 6 ──────────────

describe('T3-P5 graph 读面（INV-75：nodes=lineageOrder 序——读面唯一保证）', () => {
  it('nodes 按 lineageOrder 序返回（乱序插入归位）+lineTypeNames 恰 6（U8 色行名）', () => {
    svc.upsertLineTypeNames(['主线', '', '对比', '支撑', '', '否证'])
    seedNode({ id: 'late', year: 2021, month: 1, slot: 1 })
    seedNode({ id: 'early', year: 2020, month: 5, slot: 2 })
    seedNode({ id: 'mid', year: 2020, month: 5, slot: 1 })
    seedNode({ id: 'nullmo', year: 2020, month: null, slot: 1 })
    const g = svc.graph()
    expect(g.nodes.map((n) => n.id)).toEqual(['mid', 'early', 'nullmo', 'late'])
    expect(g.lineTypeNames).toEqual(['主线', '待命名', '对比', '支撑', '待命名', '否证'])
  })
})
