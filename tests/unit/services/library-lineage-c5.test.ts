/**
 * [T3-P5] C5 service join → [F-FOLDER-01] pubNo 库级派生+folderScope 过滤锁定测试。
 *
 * [F-FOLDER-01] 语义迁移：原 catalogNo（lineageCatalogNos 图序编号，INV-76）已随
 * pubNo 库级全序派生（INV-92——ROW_NUMBER OVER ORDER BY year/month/added_at 挂进
 * LIST_SQL）退役；list() 的 service 层 join 装配同步退役（LEFT JOIN 单源直选）。
 * 本文件改锚：pubNo 库级派生+过滤不改编号（B3 终裁）+lineage{year,month} join+
 * 未入脉络整键省略+detail 真值透传（catalogNo 断言面移交 summary.pubNo）。
 * 真相源=docs/design/2026-09-30_ffolder01-design-final.md §2.2/W5/B3。
 * always-active（不经 guardedDescribe）。
 */
import { describe, expect, it, vi } from 'vitest'
import { createLibraryService } from '../../../src/main/services/library.service'
import { createPapersRepo } from '../../../src/main/db/repos/papers.repo'
import { createFoldersRepo } from '../../../src/main/db/repos/folders.repo'
import type { LineageNode } from '../../../src/shared/models/lineage'
import type { PaperDetail } from '../../../src/shared/models/paper'
import type { Repos } from '../../../src/main/db/repos'
import { createTestDb } from '../../utils/fixtures'

/** 真库+真 repos（pubNo=LIST_SQL 窗口面——SQL 锚必须真库） */
function makeDb(): { papers: ReturnType<typeof createPapersRepo>; folders: ReturnType<typeof createFoldersRepo>; db: ReturnType<typeof createTestDb> } {
  const db = createTestDb()
  return { papers: createPapersRepo(db), folders: createFoldersRepo(db), db }
}

/** 种一篇文献（added_at 显式——pubNo 排序键可控） */
function seedPaper(
  db: ReturnType<typeof createTestDb>,
  id: string,
  year: number | null,
  addedAt: string
): void {
  db.prepare(
    'INSERT INTO papers (id, file_ref, sha256, title, year, added_at, updated_at) VALUES (?,?,?,?,?,?,?)'
  ).run(id, `f/${id}.pdf`, `sha-${id}`, `文献${id}`, year, addedAt, addedAt)
}

/** 种一个文献节点（year/month 排序键） */
function seedNode(
  db: ReturnType<typeof createTestDb>,
  paperId: string,
  year: number | null,
  month: number | null
): void {
  db.prepare(
    `INSERT INTO lineage_nodes (id, paper_id, title, core_idea, year, x, y, month, slot, folder_id, created_at, updated_at)
     VALUES (?, ?, ?, '', ?, NULL, NULL, ?, 1, '__main__', 't', 't')`
  ).run(`n-${paperId}`, paperId, `节点${paperId}`, year, month)
}

describe('F-FOLDER-01 pubNo 库级派生（INV-92——LIST_SQL 窗口；catalogNo 退役接替）', () => {
  it('year ASC/month ASC NULLS LAST/added_at ASC 全序；无 year 尾部；lineage{year,month} join 入脉络行挂键、未入脉络整键省略', () => {
    const { papers, db } = makeDb()
    seedPaper(db, 'p-2021m3', 2021, '2026-01-01T00:00:00Z')
    seedNode(db, 'p-2021m3', 2021, 3)
    seedPaper(db, 'p-2019', 2019, '2026-01-02T00:00:00Z')
    seedNode(db, 'p-2019', 2019, null)
    seedPaper(db, 'p-2021null', 2021, '2026-01-03T00:00:00Z') // 有节点无月 → 月 null 组内 added_at 序
    seedNode(db, 'p-2021null', 2021, null)
    seedPaper(db, 'p-nograph', 2020, '2026-01-04T00:00:00Z') // 无节点
    seedPaper(db, 'p-noyear', null, '2026-01-05T00:00:00Z') // 无年 → 尾部（survey 项 5）
    const r = papers.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50 })
    // items 序=查询 sort（added_desc）；pubNo=独立库级全序（year ASC 派生——B3：
    // 过滤/排序不改编号）——按 id 断言编号值
    const pubNoById = new Map(r.items.map((p) => [p.id, p.pubNo]))
    expect(r.items).toHaveLength(5)
    expect(pubNoById.get('p-2019')).toBe(1)
    expect(pubNoById.get('p-nograph')).toBe(2) // 2020 年（无节点不影响库级编号）
    expect(pubNoById.get('p-2021m3')).toBe(3)
    expect(pubNoById.get('p-2021null')).toBe(4) // 同年 null 月组末（NULLS LAST）
    expect(pubNoById.get('p-noyear')).toBe(5) // 无年=尾部（survey 项 5）
    const byId = new Map(r.items.map((p) => [p.id, p]))
    expect(byId.get('p-2021m3')!.lineage).toEqual({ year: 2021, month: 3 })
    expect(byId.get('p-2019')!.lineage).toEqual({ year: 2019, month: null })
    expect('lineage' in byId.get('p-nograph')!).toBe(false)
    expect(byId.get('p-nograph')!.folderId).toBeNull()
    expect(byId.get('p-nograph')!.impactFactor).toBeNull()
  })

  it('B3 终裁：folderScope 过滤在窗口之后——全部/unfiled/folder 三态下同一文献 pubNo 恒同', () => {
    const { papers, folders, db } = makeDb()
    const f1 = folders.create('图一')
    seedPaper(db, 'p-a', 2020, '2026-01-01T00:00:00Z')
    seedPaper(db, 'p-b', 2021, '2026-01-02T00:00:00Z')
    papers.setFolderId('p-a', f1.id)
    const all = papers.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'all' } })
    const unfiled = papers.searchSummaries({ sort: 'added_desc', offset: 0, limit: 50, folderScope: { kind: 'unfiled' } })
    const inF1 = papers.searchSummaries({
      sort: 'added_desc',
      offset: 0,
      limit: 50,
      folderScope: { kind: 'folder', folderId: f1.id }
    })
    expect(all.items.map((p) => p.id)).toEqual(['p-b', 'p-a']) // items 序=sort（added_desc）
    expect(unfiled.items.map((p) => p.id)).toEqual(['p-b'])
    expect(inF1.items.map((p) => p.id)).toEqual(['p-a'])
    const pubNoOf = (rows: typeof all.items, id: string) => rows.find((p) => p.id === id)!.pubNo
    // 库级恒定：三态下 pubNo 同值（过滤不改编号——B3 字面）
    expect(pubNoOf(all.items, 'p-a')).toBe(pubNoOf(inF1.items, 'p-a'))
    expect(pubNoOf(all.items, 'p-b')).toBe(pubNoOf(unfiled.items, 'p-b'))
    expect(pubNoOf(all.items, 'p-a')).toBe(1)
    expect(pubNoOf(all.items, 'p-b')).toBe(2)
  })

  it('folderScope 三态判别联合 schema 面：kind 未知值拒、folder 态缺 folderId 拒（W5 禁裸 nullable 二义）', async () => {
    const { libraryQuerySchema } = await import('../../../src/shared/models/paper')
    expect(libraryQuerySchema.safeParse({ folderScope: { kind: 'all' } }).success).toBe(true)
    expect(libraryQuerySchema.safeParse({ folderScope: { kind: 'unfiled' } }).success).toBe(true)
    expect(
      libraryQuerySchema.safeParse({ folderScope: { kind: 'folder', folderId: 'f-1' } }).success
    ).toBe(true)
    expect(libraryQuerySchema.safeParse({ folderScope: { kind: 'weird' } }).success).toBe(false)
    expect(libraryQuerySchema.safeParse({ folderScope: { kind: 'folder' } }).success).toBe(false)
  })

  it('list() 透传 searchSummaries（service join 退役——folderScope 收口在 buildFilters）', async () => {
    const searchSummaries = vi.fn(() => ({ items: [], total: 0 }))
    const repos = {
      papers: { searchSummaries, detailById: () => null, updateMeta: () => null },
      collections: { list: () => [] },
      lineage: { nodeByPaperId: () => null, edgeCountByNode: () => 0, listGraph: () => ({ nodes: [], edges: [] }) }
    } as unknown as Repos
    const svc = createLibraryService({ repos })
    const req = { sort: 'added_desc' as const, offset: 0, limit: 50, folderScope: { kind: 'unfiled' } as const }
    await svc.list(req)
    expect(searchSummaries).toHaveBeenCalledWith(req)
  })
})

describe('T3-P5 detail() 真值透传（month 真值——摘恒 null 注释；[F-FOLDER-01] catalogNo 移交 pubNo）', () => {
  function makeDetail(): PaperDetail {
    return {
      id: 'p-1', title: 't', authors: [], year: 2024, venue: '', doi: null,
      tagNames: [], folderId: null, impactFactor: null, annotationCount: 0, noteCount: 0,
      lastReadPage: 0, addedAt: 't', abstract: '', arxivId: null, source: 'local' as const,
      enrichStatus: 'pending' as const, fileUrl: 'app-file://p-1', fileName: 'a.pdf',
      updatedAt: 't', tags: []
    }
  }

  it('node.month/year 真值透传；lineage 形={year,month,edgeCount}（编号=summary.pubNo 非 lineage 键）', async () => {
    const node: LineageNode = {
      id: 'n-1', paperId: 'p-1', title: '节点', coreIdea: '', year: 2021, x: null, y: null,
      tags: null, month: 3, slot: 1, folderId: '__main__', createdAt: 't', updatedAt: 't'
    }
    const detail = { ...makeDetail(), pubNo: 2 }
    const repos = {
      papers: {
        searchSummaries: () => ({ items: [], total: 0 }),
        detailById: () => detail,
        updateMeta: () => detail
      },
      collections: { list: () => [] },
      lineage: {
        listGraph: () => ({ nodes: [], edges: [] }),
        nodeByPaperId: () => node,
        edgeCountByNode: () => 4
      }
    } as unknown as Repos
    const svc = createLibraryService({ repos })
    const d = await svc.detail({ paperId: 'p-1' })
    expect(d.lineage).toEqual({ year: 2021, month: 3, edgeCount: 4 })
    expect(d.pubNo).toBe(2)
  })

  it('未命中整键省略（既有语义零动）', async () => {
    const detail = makeDetail()
    const repos = {
      papers: {
        searchSummaries: () => ({ items: [], total: 0 }),
        detailById: () => detail,
        updateMeta: () => detail
      },
      collections: { list: () => [] },
      lineage: {
        listGraph: () => ({ nodes: [], edges: [] }),
        nodeByPaperId: () => null,
        edgeCountByNode: () => 0
      }
    } as unknown as Repos
    const svc = createLibraryService({ repos })
    const d = await svc.detail({ paperId: 'p-1' })
    expect('lineage' in d).toBe(false)
  })
})
