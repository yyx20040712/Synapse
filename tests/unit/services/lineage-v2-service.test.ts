/**
 * [T3-P5] lineage service v2 守卫+slot 归一（新锁定合约面；真库夹具）。
 *
 * [F-LGRAPH-01②U8] kind 四值体系退役重整：sub 三守卫/upsertLineTypes 恒四组/
 * inferred 单父守卫/ref 综述限定等用例随体系退役删除（替代断言面=
 * lineage-u8-linetype.test.ts——manual 单基型+色行名恰 6+环/重边/悬空保留）。
 * [F-ALIGN-01 2026-10-04] upsertNode 新建/主题分支随 lineage/upsert-node 通道
 * 退役删除（原 :87-123 主题更新/跨月/禁搬图族+新建归一族同批删——update 语义
 * 承接面=patchNode describe；新建分支归一仍在役〔import 挂接/moveFolder repo
 * 直调消费 normalizeMonthSlot〕，经纯函数 describe 直测锚定）。
 * 保留面=slot 归一三分支（patchNode+纯函数）+normalizeMonthSlot 组键两面+
 * graph lineageOrder 序。真相源=docs/design/2026-09-27_t3p5-lineage-data-layer-
 * design-final.md §3/§4+2026-10-01_f-lgraph01-editor-design-final.md §1（U8
 * 重整）+2026-10-04_f-align01-design.md §1 D1。always-active（不经
 * guardedDescribe）。
 */
import { beforeEach, describe, expect, it } from 'vitest'
import type { SqliteDb } from '../../../src/main/db/connection'
import { createLineageRepo } from '../../../src/main/db/repos/lineage.repo'
import {
  createLineageService
} from '../../../src/main/services/lineage/lineage.service'
import { DomainError } from '../../../src/main/services/shared/domain-error'
import { normalizeMonthSlot } from '../../../src/main/services/lineage/lineage.write-guards'
import { createTestDb } from '../../utils/fixtures'

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
  // [F-ALIGN-01] deps 收窄=repo+可选伴生 map（paperExists/paperFolderOf/
  // ensurePaperFolder/folderExists/withTransaction 注入面随新建分支退役删）
  svc = createLineageService({ repo })
})

// ── [F-ALIGN-01] patchNode（lineage/patch-node 通道——D1 通道拆分） ──

describe('F-ALIGN-01 patchNode —— 既有节点编辑 patch 单一写面（新建/主题分支随 upsert-node 退役）', () => {
  it('幽灵 id 拒：DomainError CONFLICT+中文 reason+零库副作用', () => {
    seedNode({ id: 'pn-real', paperId: 'p-1', year: 2020, month: 3, slot: 1 })
    let caught: unknown = null
    try {
      svc.patchNode('pn-ghost', { x: 1 })
    } catch (e) {
      caught = e
    }
    expect(caught, '幽灵 id 必须抛（update 形态幽灵拒沿承）').not.toBeNull()
    expect(caught instanceof DomainError, '错误类型=DomainError（code 经 toAppError 透传）').toBe(true)
    expect((caught as DomainError).code, '错误码=CONFLICT（write-queue 丢弃型）').toBe('CONFLICT')
    expect((caught as DomainError).message).toContain('节点不存在')
    const cnt = db.prepare('SELECT COUNT(*) c FROM lineage_nodes').get() as { c: number }
    expect(cnt.c).toBe(1) // 拒路径零库副作用
  })

  it('patch 合并落笔：x/y/title 覆盖+未携带字段保留（合并语义非整行替换——防半更新清字段）+同组 slot 保留', () => {
    const n = seedNode({ id: 'pn-1', paperId: 'p-1', year: 2020, month: 3, slot: 2 })
    const u = svc.patchNode(n.id, { x: 5, y: 6, title: '改题' })
    expect(u.x).toBe(5)
    expect(u.y).toBe(6)
    expect(u.title).toBe('改题')
    expect(u.month).toBe(3) // 未携带字段保留
    expect(u.slot).toBe(2) // 同组（year/month 面未变）slot 保留
    expect(u.paperId).toBe('p-1') // 身份字段不可 patch（沿用 existing）
    expect(u.folderId).toBe(n.folderId) // 图归属不可 patch（移动归 moveFolder）
  })

  it('month 变更触发归一：组变=目标组 max+1 落组末（D-I-1 跨组分支——显式 slot 亦归一，W3 撞值防护）；同组显式 slot 主权透写', () => {
    const m = seedNode({ id: 'pn-m', paperId: 'p-1', year: 2020, month: 3, slot: 1 })
    seedNode({ id: 'pn-t', paperId: 'p-2', year: 2021, month: 3, slot: 9 })
    const u = svc.patchNode(m.id, { year: 2021, month: 3 })
    expect(u.month).toBe(3)
    expect(u.slot).toBe(10) // 目标组 max=9 → +1（归一归服务端）
    // 跨组显式 slot=归一覆盖（W3 终裁——同组撞值防护；组 (2021,5) 空 → 1）
    const u2 = svc.patchNode(m.id, { month: 5, slot: 42 })
    expect(u2.month).toBe(5)
    expect(u2.slot).toBe(1)
    // 同组显式 slot=主权透写（reorderMonthSlots 路径——year/month 面不变）
    const u3 = svc.patchNode(m.id, { slot: 42 })
    expect(u3.slot).toBe(42)
    // month null=清除语义：移入未定月框（组变归一落组末）
    const u4 = svc.patchNode(m.id, { month: null })
    expect(u4.month).toBeNull()
    // [RR1/d1-N4③] slot=组末断言承接（原「month 缺省=null=跨组落组末」用例
    // 同格断言未承接——组 (2021,null) 空 → max+1=1）
    expect(u4.slot).toBe(1)
  })
})

// ── [F-LGCLN-01] normalizeMonthSlot 组键两面化（纯函数直测） ────

describe('[F-LGCLN-01] normalizeMonthSlot 组键=(year,month) 两面（folderId 面随显式跨图退役删除）', () => {
  const upsertBase = {
    paperId: 'p-1',
    title: '组键',
    coreIdea: '',
    x: null,
    y: null
  } as const

  it('新建（无既有行）slot 缺省=目标组 max+1（import 挂接/moveFolder repo 直调在役分支）；month 缺省=null', () => {
    // [F-ALIGN-01] 新建归一分支仍在役（normalizeMonthSlot 单源消费=import/
    // moveFolder repo 直调）——原 service 新建用例随通道退役改纯函数直测锚定
    seedNode({ id: 'c1', paperId: 'p-1', year: 2020, month: 3, slot: 1 })
    seedNode({ id: 'c2', paperId: 'p-2', year: 2020, month: 3, slot: 4 })
    seedNode({ id: 'c3', paperId: 'p-3', year: 2020, month: 5, slot: 2 })
    const nodes = repo.listGraph().nodes
    const r = normalizeMonthSlot({ ...upsertBase, year: 2020, month: 3 }, nodes)
    expect(r).toEqual({ month: 3, slot: 5 }) // 组内 max=4 → +1
    const r2 = normalizeMonthSlot({ ...upsertBase, year: 2020 }, nodes)
    expect(r2).toEqual({ month: null, slot: 1 }) // (2020,null) 组空 → 1
  })

  it('[RR1/d1-N4②] 新建+显式 slot=主权透写（原「slot 显式透写」service 用例删除后该格失锚——新建分支在役面补纯函数直测）', () => {
    seedNode({ id: 'e1', paperId: 'p-1', year: 2020, month: 6, slot: 3 })
    const r = normalizeMonthSlot(
      { ...upsertBase, year: 2020, month: 6, slot: 42 },
      repo.listGraph().nodes
    )
    expect(r).toEqual({ month: 6, slot: 42 }) // 新建显式值原样落库（不归组末）
    // slot null 显式=透写清面（null 落库——防御兜底位）
    const r2 = normalizeMonthSlot(
      { ...upsertBase, year: 2020, month: 6, slot: null },
      repo.listGraph().nodes
    )
    expect(r2).toEqual({ month: 6, slot: null })
  })

  it('folderId 变+year/month 不变+显式 slot→透传（sameGroup 命中——moveFolder 主权值路径）', () => {
    // 纯函数直测：existing 行对象内存改 folderId（不走 DB UPDATE——外键零涉及）
    const existing = { ...seedNode({ id: 'kg-x', paperId: 'p-1', year: 2020, month: 3, slot: 1 }), folderId: 'f-a' }
    const r = normalizeMonthSlot(
      { ...upsertBase, id: existing.id, year: 2020, month: 3, slot: 9, folderId: 'f-b' },
      [existing]
    )
    expect(r).toEqual({ month: 3, slot: 9 }) // 显式主权值透写（不归一覆盖）
  })

  it('folderId 变+缺省 slot→throw（k1-N3 防御机锚——编程错误面，原静默保留行为废止）', () => {
    // 门一回炉 k1-N3：sameGroup 去 folderId 面后，「改图不传 slot」不再静默
    // 保留原 slot（跨图保留会撞 INV-75 组内唯一）——未来新调用方违契约即红
    const existing = { ...seedNode({ id: 'kg-k', paperId: 'p-1', year: 2020, month: 3, slot: 2 }), folderId: 'f-a' }
    expect(() =>
      normalizeMonthSlot(
        { ...upsertBase, id: existing.id, year: 2020, month: 3, folderId: 'f-b' },
        [existing]
      )
    ).toThrow(/folderId 变化必须显式 slot/)
  })

  it('year 变（folderId 同图）→组变归一目标组 max+1', () => {
    const existing = seedNode({ id: 'kg-y', paperId: 'p-1', year: 2020, month: 3, slot: 1 })
    seedNode({ id: 'kg-occ', paperId: 'p-2', year: 2021, month: 3, slot: 4 })
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
