/**
 * [F-DBCAMP-01 DB-1 U1] folderId 非空契约消费面锁定测试（shared schema 收紧+
 * repo 签名随迁 016 列级 NOT NULL DEFAULT '__main__'）。
 *
 * 真相源=v122 裁决②「未归档域取消——所有文献必须在文件夹里」+2026-10-08 U1
 * 简报裁决⑤（folderId .nullable() 删除/消费面类型收紧）。迁移侧行为面=
 * tests/unit/db/migrate-papers-folder-not-null.test.ts。always-active。
 */
import { describe, expect, it } from 'vitest'
import { openDatabase } from '../../../../src/main/db/connection'
import { migrate } from '../../../../src/main/db/migrate'
import { createPapersRepo } from '../../../../src/main/db/repos/papers.repo'
import { paperSummarySchema } from '../../../../src/shared/models/paper'

const baseSummary = {
  id: 'p1',
  title: '论文',
  authors: ['张三'],
  year: 2026,
  venue: 'Nature Water',
  doi: '10.1/x',
  tagNames: [],
  impactFactor: null,
  // [F-DBCAMP-01 DB-1 U2 / F-STAR-01] 星标必携（paperSummarySchema 随链）
  isStarred: false,
  annotationCount: 0,
  noteCount: 0,
  lastReadPage: 0,
  addedAt: '2026-01-01T00:00:00.000Z'
}

describe('db/repos —— folderId 非空契约（016 消费面）', () => {
  it('shared schema：folderId 缺失/null 双拒（strict 收紧——016 前 null 合法态退役）', () => {
    expect(paperSummarySchema.parse({ ...baseSummary, folderId: '__main__' }).folderId).toBe(
      '__main__'
    )
    expect(() => paperSummarySchema.parse({ ...baseSummary, folderId: null })).toThrow()
    // 缺列面（schema strict 校验——运行时拒；parse 入参 unknown 故无类型面）
    expect(() => paperSummarySchema.parse(baseSummary)).toThrow()
  })

  it('repo：裸插入（缺 folder_id）→ DEFAULT __main__；setFolderId 写/回读非空；幽灵 id 读=null（未命中语义）', () => {
    const db = openDatabase(':memory:')
    migrate(db)
    const papers = createPapersRepo(db)
    db.prepare("INSERT INTO collections (id, name, position) VALUES ('c-move', '目标图', 1)").run()
    db.prepare(
      `INSERT INTO papers (id, file_ref, sha256, title, added_at, updated_at)
       VALUES ('p-1', 'f/1.pdf', 'sha-1', 't', 't', 't')`
    ).run()
    expect(papers.folderIdOf('p-1')).toBe('__main__')
    papers.setFolderId('p-1', 'c-move')
    expect(papers.folderIdOf('p-1')).toBe('c-move')
    expect(papers.folderIdOf('ghost')).toBeNull()
    db.close()
  })
})
