/**
 * [F-VISFB-61] floating-notes.repo —— 悬浮笔记数据面锁定测试（B6-61 数据与
 * 会话面；任务书 §5-B6 61 号/§7 防线行）。
 *
 * 覆盖：迁移 024 DDL 负锚（列集恰七列**无 paper_id**——§0-5 裁决「纯画布
 * 节点不关联文献」的 DDL 锚）+shared 类型负锚（floatingNoteSchema strict
 * 拒 paperId 键）+upsert 往返（created_at 首插保留/updated_at 刷新）+
 * folder 隔离（listByFolder 域内读）+域删级联（FK CASCADE 删夹全域删+
 * deletion_events 落账——021 族第十表触发器）+remove 落账。
 * always-active（不经 guardedDescribe——K3 威胁在三屋结构性缺位）。
 */
import { describe, expect, it } from 'vitest'
import { createFloatingNotesRepo } from '../../../../src/main/db/repos/floating-notes.repo'
import { readUserVersion } from '../../../../src/main/db/migrate'
import { floatingNoteSchema } from '../../../../src/shared/models/lineage'
import { createTestDb } from '../../../utils/fixtures'
import type { SqliteDb } from '../../../../src/main/db/connection'

type Db = SqliteDb

function seedFolder(db: Db, id: string, name: string): void {
  db.prepare('INSERT INTO collections (id, name, position) VALUES (?, ?, 0)').run(id, name)
}

function noteCount(db: Db, where = '', ...params: unknown[]): number {
  return (db.prepare(`SELECT COUNT(*) c FROM floating_notes${where}`).get(...params) as { c: number }).c
}

describe('F-VISFB-61 floating-notes.repo —— 悬浮笔记数据面（迁移 024）', () => {
  it('DDL 负锚：PRAGMA table_info 列集恰七列且无 paper_id（§0-5 裁决——纯画布节点不关联文献）；迁移链尾 user_version=24', () => {
    const db = createTestDb()
    const info = db.prepare('PRAGMA table_info(floating_notes)').all() as Array<{ name: string }>
    expect(info.map((c) => c.name).sort()).toEqual([
      'content',
      'created_at',
      'folder_id',
      'id',
      'updated_at',
      'x',
      'y'
    ])
    expect(info.some((c) => c.name === 'paper_id')).toBe(false)
    expect(readUserVersion(db)).toBe(24)
    db.close()
  })

  it('类型负锚：floatingNoteSchema strict——携带 paperId 键必拒（无 paper_id 契约的 shared 单源锚）', () => {
    const base = {
      id: 'fn1',
      folderId: '__main__',
      x: 120,
      y: 80,
      content: '笔记',
      createdAt: 't',
      updatedAt: 't'
    }
    expect(floatingNoteSchema.safeParse(base).success).toBe(true)
    expect(floatingNoteSchema.safeParse({ ...base, paperId: 'p1' }).success).toBe(false)
  })

  it('upsert 往返：新建（id 缺省 uuid）camelCase 行回读；更新 created_at 首插保留+载荷列刷新', () => {
    const db = createTestDb()
    seedFolder(db, 'f-a', '夹甲')
    const repo = createFloatingNotesRepo(db)
    const created = repo.upsert({ folderId: 'f-a', x: 100.5, y: 200, content: '首版' })
    expect(created.id).toMatch(/^[0-9a-f-]{36}$/)
    expect(created.folderId).toBe('f-a')
    expect(created.x).toBe(100.5)
    expect(created.y).toBe(200)
    expect(created.content).toBe('首版')
    // 时间轴分离：手工把 created_at 拨旧——更新后必须保留
    db.prepare(`UPDATE floating_notes SET created_at = '2000-01-01T00:00:00.000Z' WHERE id = ?`).run(
      created.id
    )
    const updated = repo.upsert({ id: created.id, folderId: 'f-a', x: 300, y: 400, content: '次版' })
    expect(updated.id).toBe(created.id)
    expect(updated.createdAt).toBe('2000-01-01T00:00:00.000Z')
    expect(updated.x).toBe(300)
    expect(updated.content).toBe('次版')
    expect(noteCount(db)).toBe(1)
    db.close()
  })

  it('folder 隔离：listByFolder 域内读——两夹各持笔记互不渗漏', () => {
    const db = createTestDb()
    seedFolder(db, 'f-a', '夹甲')
    seedFolder(db, 'f-b', '夹乙')
    const repo = createFloatingNotesRepo(db)
    repo.upsert({ id: 'fn-a1', folderId: 'f-a', x: 1, y: 1, content: '甲一' })
    repo.upsert({ id: 'fn-a2', folderId: 'f-a', x: 2, y: 2, content: '甲二' })
    repo.upsert({ id: 'fn-b1', folderId: 'f-b', x: 3, y: 3, content: '乙一' })
    expect(repo.listByFolder('f-a').map((n) => n.id).sort()).toEqual(['fn-a1', 'fn-a2'])
    expect(repo.listByFolder('f-b').map((n) => n.id)).toEqual(['fn-b1'])
    expect(repo.listAll().map((n) => n.id).sort()).toEqual(['fn-a1', 'fn-a2', 'fn-b1'])
    db.close()
  })

  it('域删级联：DELETE collections→该夹 floating_notes 全域删+他夹幸存+deletion_events 落账（021 族第十表触发器）', () => {
    const db = createTestDb()
    seedFolder(db, 'f-a', '夹甲')
    seedFolder(db, 'f-b', '夹乙')
    const repo = createFloatingNotesRepo(db)
    repo.upsert({ id: 'fn-a1', folderId: 'f-a', x: 1, y: 1, content: '甲一' })
    repo.upsert({ id: 'fn-a2', folderId: 'f-a', x: 2, y: 2, content: '甲二' })
    repo.upsert({ id: 'fn-b1', folderId: 'f-b', x: 3, y: 3, content: '乙一' })
    db.prepare('DELETE FROM collections WHERE id = ?').run('f-a')
    expect(noteCount(db)).toBe(1)
    expect(repo.listByFolder('f-b').map((n) => n.id)).toEqual(['fn-b1'])
    // 删事件落账（防复活数据源——INV-132 兑现面）：两行 floating_notes 实体在场
    const events = db
      .prepare(`SELECT id FROM deletion_events WHERE entity = 'floating_notes'`)
      .all() as Array<{ id: string }>
    expect(events.map((e) => e.id).sort()).toEqual(['fn-a1', 'fn-a2'])
    db.close()
  })

  it('remove：删除+deletion_events 落账（guard=0 用户路径）；未命中 0 changes 幂等', () => {
    const db = createTestDb()
    seedFolder(db, 'f-a', '夹甲')
    const repo = createFloatingNotesRepo(db)
    repo.upsert({ id: 'fn-x', folderId: 'f-a', x: 1, y: 1, content: '目标' })
    expect(repo.remove('fn-x')).toBe(1)
    expect(noteCount(db)).toBe(0)
    const logged = db
      .prepare(`SELECT COUNT(*) c FROM deletion_events WHERE entity = 'floating_notes' AND id = ?`)
      .get('fn-x') as { c: number }
    expect(logged.c).toBe(1)
    expect(repo.remove('fn-x')).toBe(0)
    db.close()
  })
})
