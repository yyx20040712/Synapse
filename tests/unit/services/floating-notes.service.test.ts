/**
 * [F-VISFB-61] floating-notes.service —— 悬浮笔记写/读用例锁定测试（B6-61；
 * 任务书 §5-B6 61 号）。真库 repo 直连（service 守卫面+图域读面）。
 *
 * 覆盖：幽灵 folder 拒（CONFLICT——upsertEdge 节点存在性守卫同族）/x/y 有限数
 * 拒（INVALID_REQUEST——k1-N5 畸形防线同族）/upsert 往返/notesForGraph 域读
 * （folderId 过滤+undefined 全量并集——graph 通道装配源）/lineage.service
 * graph() floatingNotes 装配（可选依赖缺省 []——既有单测装配兼容锚）。
 * always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）。
 */
import { describe, expect, it } from 'vitest'
import { createFloatingNotesRepo } from '../../../src/main/db/repos/floating-notes.repo'
import { createRepos } from '../../../src/main/db/repos'
import { createFloatingNotesService } from '../../../src/main/services/lineage/floating-notes.service'
import { createLineageService } from '../../../src/main/services/lineage/lineage.service'
import { createTestDb } from '../../utils/fixtures'
import type { SqliteDb } from '../../../src/main/db/connection'

describe('F-VISFB-61 floating-notes.service —— 悬浮笔记用例面（真库）', () => {
  let db: SqliteDb
  let repos: ReturnType<typeof createRepos>
  let svc: ReturnType<typeof createFloatingNotesService>

  function seedFolder(id: string, name: string): void {
    db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name)
  }

  it('幽灵 folder 拒：upsert 落不存在的夹 → CONFLICT 中文（域归属存在性守卫）', () => {
    db = createTestDb()
    repos = createRepos(db)
    svc = createFloatingNotesService({
      repo: repos.floatingNotes,
      folderExists: (id) => repos.folders.findById(id) !== null
    })
    expect(() => svc.upsertNote({ folderId: 'f-ghost', x: 1, y: 1, content: '内容' })).toThrowError(
      /目标文件夹不存在/
    )
    db.close()
  })

  it('x/y 有限数拒：Infinity/NaN → INVALID_REQUEST（k1-N5 畸形防线同族——z.number 放行 Infinity 的服务层兜底）', () => {
    db = createTestDb()
    repos = createRepos(db)
    seedFolder('f-a', '夹甲')
    svc = createFloatingNotesService({
      repo: repos.floatingNotes,
      folderExists: (id) => repos.folders.findById(id) !== null
    })
    expect(() => svc.upsertNote({ folderId: 'f-a', x: Number.POSITIVE_INFINITY, y: 1, content: '' })).toThrowError(
      /有限数/
    )
    expect(() => svc.upsertNote({ folderId: 'f-a', x: 1, y: Number.NaN, content: '' })).toThrowError(/有限数/)
    expect((db.prepare('SELECT COUNT(*) c FROM floating_notes').get() as { c: number }).c).toBe(0)
    db.close()
  })

  it('upsert 往返+notesForGraph 域读：folderId 过滤/undefined 全量并集（graph 通道装配源）', () => {
    db = createTestDb()
    repos = createRepos(db)
    seedFolder('f-a', '夹甲')
    seedFolder('f-b', '夹乙')
    svc = createFloatingNotesService({
      repo: repos.floatingNotes,
      folderExists: (id) => repos.folders.findById(id) !== null
    })
    svc.upsertNote({ id: 'fn-a', folderId: 'f-a', x: 10, y: 20, content: '甲笔记' })
    const edited = svc.upsertNote({ id: 'fn-a', folderId: 'f-a', x: 30, y: 40, content: '改后' })
    expect(edited.content).toBe('改后')
    svc.upsertNote({ id: 'fn-b', folderId: 'f-b', x: 50, y: 60, content: '乙笔记' })
    expect(svc.notesForGraph('f-a').map((n) => n.id)).toEqual(['fn-a'])
    expect(svc.notesForGraph('f-b').map((n) => n.id)).toEqual(['fn-b'])
    expect(svc.notesForGraph(undefined).map((n) => n.id).sort()).toEqual(['fn-a', 'fn-b'])
    expect(svc.removeNote('fn-a')).toBe(1)
    expect(svc.notesForGraph('f-a')).toEqual([])
    db.close()
  })

  it('lineage.service graph() 装配 floatingNotes：注入源随 folderId 域过滤入载荷；依赖缺省=[]（既有单测装配兼容锚）', () => {
    db = createTestDb()
    repos = createRepos(db)
    seedFolder('f-a', '夹甲')
    const notesRepo = createFloatingNotesRepo(db)
    notesRepo.upsert({ id: 'fn-a', folderId: 'f-a', x: 1, y: 1, content: '图内笔记' })
    const lineageSvc = createLineageService({
      repo: repos.lineage,
      floatingNotes: (folderId) =>
        folderId === undefined ? notesRepo.listAll() : notesRepo.listByFolder(folderId)
    })
    expect(lineageSvc.graph('f-a').floatingNotes.map((n) => n.id)).toEqual(['fn-a'])
    expect(lineageSvc.graph('f-b').floatingNotes).toEqual([])
    // 可选依赖缺省：既有单测装配（无 floatingNotes 键）不炸——空面合法
    const bare = createLineageService({ repo: repos.lineage })
    expect(bare.graph('f-a').floatingNotes).toEqual([])
    db.close()
  })
})
